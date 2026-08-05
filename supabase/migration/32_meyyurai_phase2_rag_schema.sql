-- Meyyurai Phase 2 RAG Schema Migration
-- Creates legal_documents, legal_chunks, document_embeddings, support_organizations, FTS indexes, pgvector search RPC, and RLS policies.

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Knowledge Sources Table
CREATE TABLE IF NOT EXISTS knowledge_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    base_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Legal Documents Table
CREATE TABLE IF NOT EXISTS legal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES knowledge_sources(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    act_name TEXT,
    enactment_year INTEGER,
    ministry TEXT,
    document_type TEXT NOT NULL DEFAULT 'Act',
    version TEXT,
    official_url TEXT,
    last_updated_by_source DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Legal Chunks Table
CREATE TABLE IF NOT EXISTS legal_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES legal_documents(id) ON DELETE CASCADE,
    chapter_number TEXT,
    chapter_title TEXT,
    section_number TEXT,
    subsection TEXT,
    official_text TEXT NOT NULL,
    plain_language_summary TEXT,
    token_count INTEGER,
    fts TSVECTOR,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Document Embeddings Table (768-dim vector for Gemini text-embedding-004)
CREATE TABLE IF NOT EXISTS document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID REFERENCES legal_chunks(id) ON DELETE CASCADE UNIQUE,
    embedding VECTOR(768) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Support Organizations Table
CREATE TABLE IF NOT EXISTS support_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    state TEXT,
    district TEXT,
    contact JSONB DEFAULT '{}'::jsonb,
    website TEXT,
    verified BOOLEAN DEFAULT true,
    description TEXT,
    official_source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes & Triggers for Full-Text Search and Vector Search
CREATE INDEX IF NOT EXISTS document_embeddings_hnsw_idx ON document_embeddings USING hnsw (embedding vector_cosine_ops);

CREATE OR REPLACE FUNCTION update_legal_chunks_fts() RETURNS trigger AS $$
BEGIN
  new.fts :=
    setweight(to_tsvector('english', coalesce(new.chapter_title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.section_number, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.official_text, '')), 'C');
  return new;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS legal_chunks_fts_update ON legal_chunks;
CREATE TRIGGER legal_chunks_fts_update
BEFORE INSERT OR UPDATE ON legal_chunks
FOR EACH ROW EXECUTE FUNCTION update_legal_chunks_fts();

CREATE INDEX IF NOT EXISTS legal_chunks_fts_idx ON legal_chunks USING GIN (fts);

-- 7. Hybrid Search RPC (pgvector + FTS using RRF)
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

-- 8. Row Level Security (RLS) & Read-only Policies
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read knowledge_sources" ON knowledge_sources;
CREATE POLICY "Public read knowledge_sources" ON knowledge_sources FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read legal_documents" ON legal_documents;
CREATE POLICY "Public read legal_documents" ON legal_documents FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read legal_chunks" ON legal_chunks;
CREATE POLICY "Public read legal_chunks" ON legal_chunks FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read document_embeddings" ON document_embeddings;
CREATE POLICY "Public read document_embeddings" ON document_embeddings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read support_organizations" ON support_organizations;
CREATE POLICY "Public read support_organizations" ON support_organizations FOR SELECT USING (true);

-- Enable full write access for ingestion pipeline (service role / admin)
DROP POLICY IF EXISTS "Enable write for legal_documents" ON legal_documents;
CREATE POLICY "Enable write for legal_documents" ON legal_documents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable write for legal_chunks" ON legal_chunks;
CREATE POLICY "Enable write for legal_chunks" ON legal_chunks FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable write for document_embeddings" ON document_embeddings;
CREATE POLICY "Enable write for document_embeddings" ON document_embeddings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable write for support_organizations" ON support_organizations;
CREATE POLICY "Enable write for support_organizations" ON support_organizations FOR ALL USING (true) WITH CHECK (true);

