-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Knowledge Sources Table (Tracking domains/publishers)
CREATE TABLE IF NOT EXISTS knowledge_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g., 'Central Government', 'State Government', 'High Court'
    base_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Legal Documents Table (The parent document: Act, Rule, Notification)
CREATE TABLE IF NOT EXISTS legal_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES knowledge_sources(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    act_name TEXT,
    enactment_year INTEGER,
    ministry TEXT,
    document_type TEXT NOT NULL, -- 'Act', 'Rule', 'Notification', 'Judgment'
    version TEXT,
    official_url TEXT,
    last_updated_by_source DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Legal Chunks Table (The hierarchical text segments)
CREATE TABLE IF NOT EXISTS legal_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES legal_documents(id) ON DELETE CASCADE,
    chapter_number TEXT,
    chapter_title TEXT,
    section_number TEXT,
    subsection TEXT,
    official_text TEXT NOT NULL,
    plain_language_summary TEXT, -- Optional pre-computed summary
    token_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Document Embeddings Table (Separating vectors for performance)
-- We use a 768-dimension vector for standard Gemini/OpenAI compatibility. (Gemini text-embedding-004 is 768).
CREATE TABLE IF NOT EXISTS document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID REFERENCES legal_chunks(id) ON DELETE CASCADE UNIQUE,
    embedding VECTOR(768) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create HNSW index for efficient vector search
CREATE INDEX ON document_embeddings USING hnsw (embedding vector_cosine_ops);

-- 5. AI Sessions (Conversation Memory)
CREATE TABLE IF NOT EXISTS ai_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AI Messages
CREATE TABLE IF NOT EXISTS ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES ai_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb, -- Store retrieved citations and structured response parts here
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Retrieval Logs (Auditing)
CREATE TABLE IF NOT EXISTS retrieval_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES ai_sessions(id) ON DELETE SET NULL,
    user_query TEXT NOT NULL,
    search_type TEXT NOT NULL, -- 'vector', 'fts', 'hybrid'
    results_returned INTEGER,
    latency_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. AI Feedback
CREATE TABLE IF NOT EXISTS ai_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES ai_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE retrieval_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;

-- Public read access to legal knowledge
CREATE POLICY "Public read knowledge_sources" ON knowledge_sources FOR SELECT USING (true);
CREATE POLICY "Public read legal_documents" ON legal_documents FOR SELECT USING (true);
CREATE POLICY "Public read legal_chunks" ON legal_chunks FOR SELECT USING (true);
CREATE POLICY "Public read document_embeddings" ON document_embeddings FOR SELECT USING (true);

-- Authenticated access to own AI sessions and messages
CREATE POLICY "Users can manage own ai_sessions" ON ai_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own ai_messages" ON ai_messages FOR ALL USING (
    session_id IN (SELECT id FROM ai_sessions WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert ai_feedback" ON ai_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);
