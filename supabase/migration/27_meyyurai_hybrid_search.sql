-- Add full-text search capability to legal_chunks
ALTER TABLE legal_chunks ADD COLUMN fts tsvector;

-- Function to automatically update the fts column
CREATE OR REPLACE FUNCTION update_legal_chunks_fts() RETURNS trigger AS $$
BEGIN
  new.fts :=
    setweight(to_tsvector('english', coalesce(new.chapter_title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.section_number, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.official_text, '')), 'C');
  return new;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER legal_chunks_fts_update
BEFORE INSERT OR UPDATE ON legal_chunks
FOR EACH ROW EXECUTE FUNCTION update_legal_chunks_fts();

-- Create GIN index for full-text search
CREATE INDEX ON legal_chunks USING GIN (fts);

-- Hybrid Search RPC (Vector + FTS using Reciprocal Rank Fusion)
CREATE OR REPLACE FUNCTION hybrid_search_legal_chunks(
    query_text TEXT,
    query_embedding VECTOR(768),
    match_count INT DEFAULT 5,
    full_text_weight FLOAT DEFAULT 1.0,
    semantic_weight FLOAT DEFAULT 1.0,
    rrf_k INT DEFAULT 50
)
RETURNS TABLE (
    chunk_id UUID,
    document_id UUID,
    act_name TEXT,
    official_url TEXT,
    chapter_number TEXT,
    chapter_title TEXT,
    section_number TEXT,
    subsection TEXT,
    official_text TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH fts_search AS (
        SELECT
            lc.id,
            RANK() OVER (ORDER BY ts_rank_cd(lc.fts, websearch_to_tsquery('english', query_text)) DESC) as rank_ix
        FROM
            legal_chunks lc
        WHERE
            lc.fts @@ websearch_to_tsquery('english', query_text)
        ORDER BY rank_ix
        LIMIT match_count * 2
    ),
    semantic_search AS (
        SELECT
            de.chunk_id as id,
            RANK() OVER (ORDER BY de.embedding <=> query_embedding) as rank_ix
        FROM
            document_embeddings de
        ORDER BY rank_ix
        LIMIT match_count * 2
    ),
    rrf AS (
        SELECT
            COALESCE(f.id, s.id) AS id,
            (
                COALESCE(full_text_weight / (rrf_k + f.rank_ix), 0.0) +
                COALESCE(semantic_weight / (rrf_k + s.rank_ix), 0.0)
            ) AS score
        FROM
            fts_search f
        FULL OUTER JOIN
            semantic_search s ON f.id = s.id
        ORDER BY
            score DESC
        LIMIT match_count
    )
    SELECT
        lc.id AS chunk_id,
        ld.id AS document_id,
        ld.act_name,
        ld.official_url,
        lc.chapter_number,
        lc.chapter_title,
        lc.section_number,
        lc.subsection,
        lc.official_text,
        rrf.score AS similarity
    FROM
        rrf
    JOIN
        legal_chunks lc ON rrf.id = lc.id
    JOIN
        legal_documents ld ON lc.document_id = ld.id
    ORDER BY
        rrf.score DESC;
END;
$$;
