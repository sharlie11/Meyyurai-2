-- Migration: Government Services Knowledge Base and Mapping Layer
-- Adds structured government service information, mapping layers for dynamic retrieval, and sync status for the Knowledge Synchronization Engine.

-- 1. Government Services Table
CREATE TABLE IF NOT EXISTS government_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type TEXT NOT NULL CHECK (service_type IN ('Authority', 'Portal', 'Helpline', 'Legal Aid', 'Police')),
    name TEXT NOT NULL,
    official_url TEXT,
    contact_details JSONB DEFAULT '{}'::jsonb, -- e.g., {"phone": "1930", "email": "cyber@gov.in", "address": "..."}
    jurisdiction TEXT NOT NULL, -- e.g., 'Central', 'State: Tamil Nadu'
    description TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_verified_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Domain Mappings Table (Configurable mapping layer)
-- Maps a legal domain (e.g., 'Cybercrime', 'Labour') to a specific government service
CREATE TABLE IF NOT EXISTS legal_domain_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_name TEXT NOT NULL, -- e.g., 'Cybercrime', 'Employment Dispute'
    service_id UUID REFERENCES government_services(id) ON DELETE CASCADE,
    relevance_score INTEGER DEFAULT 100, -- Helps rank which service to show first for a domain
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(domain_name, service_id)
);

-- 3. Service Embeddings (For semantic retrieval alongside rules)
CREATE TABLE IF NOT EXISTS service_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES government_services(id) ON DELETE CASCADE UNIQUE,
    embedding VECTOR(768) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON service_embeddings USING hnsw (embedding vector_cosine_ops);

-- 4. Knowledge Synchronization Logs (For the Sync Engine)
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type TEXT NOT NULL, -- 'Legal Document', 'Government Service'
    source_id UUID NOT NULL, -- ID of the legal_document or government_service
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
    message TEXT,
    sync_started_at TIMESTAMPTZ DEFAULT NOW(),
    sync_completed_at TIMESTAMPTZ
);

-- RLS Policies
ALTER TABLE government_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_domain_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Public can read active services and mappings
CREATE POLICY "Public read active government_services" ON government_services FOR SELECT USING (is_active = true);
CREATE POLICY "Public read legal_domain_mappings" ON legal_domain_mappings FOR SELECT USING (true);
CREATE POLICY "Public read service_embeddings" ON service_embeddings FOR SELECT USING (true);

-- Admins can manage all (assuming a basic admin check, here keeping it open for now or restricted by app logic)
-- In a real app, we'd add an admin role check. For now, service role bypasses RLS anyway.
