-- 31_meyyurai_pillar_a_b_reconciliation.sql
-- Reconciliation of Pillar A (Safety/SOS) + Pillar B (AI Legal Guidance & RAG)
-- Enables vector extensions, extends rights_articles, ensures polymorphic bookmarks & chat tables exist, and seeds verified legal rights.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Extend rights_articles with RAG metadata columns
ALTER TABLE public.rights_articles 
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS embedding VECTOR(768);

-- Create HNSW index on rights_articles vector embedding if present
CREATE INDEX IF NOT EXISTS idx_rights_articles_embedding ON public.rights_articles USING hnsw (embedding vector_cosine_ops);

-- 2. Create Pillar B specific tables if not already present
CREATE TABLE IF NOT EXISTS public.chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    sources JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('article', 'chat_message', 'search')),
    target_id TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, target_type, target_id)
);

-- 3. RLS Enablement & Policies
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own chat_conversations" ON public.chat_conversations;
CREATE POLICY "Users can manage own chat_conversations" ON public.chat_conversations FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own chat_messages" ON public.chat_messages;
CREATE POLICY "Users can manage own chat_messages" ON public.chat_messages FOR ALL USING (
    conversation_id IN (SELECT id FROM public.chat_conversations WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can manage own bookmarks" ON public.bookmarks FOR ALL USING (auth.uid() = user_id);

-- 4. Seed Verified Rights Articles with Official Government Sources
DO $$
DECLARE
    women_cat_id UUID;
    cyber_cat_id UUID;
    labor_cat_id UUID;
BEGIN
    -- Ensure categories exist
    INSERT INTO public.rights_categories (slug, name, icon, description, priority_order)
    VALUES ('women', 'Women Rights', 'ShieldCheck', 'Protections against harassment, domestic violence, and workplace discrimination.', 1)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO women_cat_id;

    INSERT INTO public.rights_categories (slug, name, icon, description, priority_order)
    VALUES ('cyber', 'Cyber Crime & Privacy', 'Lock', 'Digital safety, online harassment, financial fraud, and IT Act rights.', 2)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO cyber_cat_id;

    INSERT INTO public.rights_categories (slug, name, icon, description, priority_order)
    VALUES ('labor', 'Labor & Employment', 'Briefcase', 'Minimum wages, working conditions, wrongful termination, and maternity benefits.', 3)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO labor_cat_id;

    -- Seed 1: POSH Act Rights
    INSERT INTO public.rights_articles (
        category_id, title, description, procedures, contact_resources, emergency_numbers, source_url, last_verified_at
    ) VALUES (
        women_cat_id,
        'Protection against Sexual Harassment at Workplace (POSH Act 2013)',
        'Mandates Internal Complaints Committees (ICC) in organizations with 10+ employees and strict 90-day inquiry timelines.',
        '[{"step": 1, "action": "Submit a written complaint to the Internal Committee (IC) within 3 months of the incident."}, {"step": 2, "action": "IC initiates inquiry within 7 days and completes report within 90 days."}]'::jsonb,
        '[{"name": "National Commission for Women (NCW)", "url": "https://ncw.nic.in"}]'::jsonb,
        '[{"label": "Women Helpline", "number": "1091"}, {"label": "Emergency Response Support System", "number": "112"}]'::jsonb,
        'https://www.wcd.nic.in/act/posh-act-2013',
        NOW()
    );

    -- Seed 2: Cyber Crime Portal & Financial Fraud Reporting
    INSERT INTO public.rights_articles (
        category_id, title, description, procedures, contact_resources, emergency_numbers, source_url, last_verified_at
    ) VALUES (
        cyber_cat_id,
        'Reporting Financial Fraud and Cyber Harassment (IT Act Section 66E/67)',
        'Legal right to report unauthorized photo sharing, online stalking, and online banking fraud with immediate fund freezing.',
        '[{"step": 1, "action": "Call National Cyber Crime Helpline (1930) immediately to report financial fraud within golden hour."}, {"step": 2, "action": "Lodge an online complaint at cybercrime.gov.in."}]'::jsonb,
        '[{"name": "National Cyber Crime Reporting Portal", "url": "https://cybercrime.gov.in"}]'::jsonb,
        '[{"label": "Cyber Crime Helpline", "number": "1930"}]'::jsonb,
        'https://cybercrime.gov.in',
        NOW()
    );

    -- Seed 3: Code on Wages Right to Fair Compensation
    INSERT INTO public.rights_articles (
        category_id, title, description, procedures, contact_resources, emergency_numbers, source_url, last_verified_at
    ) VALUES (
        labor_cat_id,
        'Right to Timely Payment of Wages (Code on Wages 2019 Section 15 & 17)',
        'Guarantees wages MUST be paid by the 7th of the succeeding month for monthly wage earners and on the same shift for daily workers.',
        '[{"step": 1, "action": "File claim before the Labour Commissioner / Facilitator."}, {"step": 2, "action": "Claim application processed within 30 days under Section 45."}]'::jsonb,
        '[{"name": "Ministry of Labour SAMADHAN Portal", "url": "https://samadhan.labour.gov.in"}]'::jsonb,
        '[{"label": "Shram Suvidha Helpline", "number": "14489"}]'::jsonb,
        'https://www.indiacode.nic.in/handle/123456789/13636',
        NOW()
    );

END $$;
