-- Meyyurai v3 Production-Grade Database Schema Migration
-- A fully normalized, robust, and scalable architecture with AI RAG preparations.

-- ==========================================
-- 1. EXTENSIONS & ENUMS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector"; -- Requires pgvector extension in Supabase

DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE public.sender_type AS ENUM ('user', 'assistant', 'system');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ==========================================
-- 2. CORE FUNCTIONS
-- ==========================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Admin check function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- 3. AUTHENTICATION & USER PROFILES
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone_number text,
  emergency_contact text,
  guardian_contact text,
  country text DEFAULT 'India' NOT NULL,
  profile_photo text,
  role public.user_role DEFAULT 'user' NOT NULL,
  language text DEFAULT 'en' NOT NULL,
  onboarded boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz -- Soft delete support
);

CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_v3()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone_number, role, language, onboarded)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.phone,
    'user',
    'en',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auth.users
DO $$ BEGIN
    CREATE TRIGGER on_auth_user_created_v3
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_v3();
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ==========================================
-- 4. NOTIFICATIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_alerts boolean DEFAULT true NOT NULL,
  push_alerts boolean DEFAULT true NOT NULL,
  legal_updates boolean DEFAULT true NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL, -- e.g., 'system', 'alert', 'legal', 'ai'
  title text NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);


-- ==========================================
-- 5. CHAT ARCHITECTURE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);
CREATE TRIGGER set_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender public.sender_type DEFAULT 'user' NOT NULL,
  content text NOT NULL,
  parent_message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE, -- For regenerations/edits tree
  is_edited boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);
CREATE TRIGGER set_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.message_attachments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  file_url text NOT NULL,
  file_type text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Note: message_citations depends on law_sections, created after laws.

CREATE TABLE IF NOT EXISTS public.message_feedback (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_positive boolean NOT NULL,
  feedback_text text,
  created_at timestamptz DEFAULT now() NOT NULL
);


-- ==========================================
-- 6. GOVERNMENT LAW DATABASE HIERARCHY
-- ==========================================
CREATE TABLE IF NOT EXISTS public.jurisdictions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  level text NOT NULL -- 'central' or 'state'
);

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  jurisdiction_id uuid REFERENCES public.jurisdictions(id) ON DELETE RESTRICT NOT NULL,
  name text NOT NULL,
  UNIQUE(jurisdiction_id, name)
);

CREATE TABLE IF NOT EXISTS public.acts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id uuid REFERENCES public.categories(id) ON DELETE RESTRICT NOT NULL,
  act_name text NOT NULL,
  act_number text,
  year integer,
  official_source text,
  ministry text,
  status text DEFAULT 'active' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(act_number, year, official_source)
);
CREATE TRIGGER set_acts_updated_at BEFORE UPDATE ON public.acts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.chapters (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  act_id uuid REFERENCES public.acts(id) ON DELETE CASCADE NOT NULL,
  chapter_number text,
  title text NOT NULL,
  UNIQUE(act_id, chapter_number)
);

CREATE TABLE IF NOT EXISTS public.sections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE, -- Optional if acts don't have chapters
  act_id uuid REFERENCES public.acts(id) ON DELETE CASCADE NOT NULL,
  section_number text NOT NULL,
  heading text,
  content text NOT NULL,
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(heading, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) STORED,
  UNIQUE(act_id, section_number)
);

CREATE TABLE IF NOT EXISTS public.subsections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id uuid REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
  subsection_number text NOT NULL,
  content text NOT NULL,
  UNIQUE(section_id, subsection_number)
);

CREATE TABLE IF NOT EXISTS public.amendments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  act_id uuid REFERENCES public.acts(id) ON DELETE CASCADE NOT NULL,
  amendment_date date,
  description text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.official_pdfs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  act_id uuid REFERENCES public.acts(id) ON DELETE CASCADE NOT NULL,
  file_url text NOT NULL,
  document_type text -- 'gazette', 'original', 'amendment_doc'
);


-- Citations now that sections exist
CREATE TABLE IF NOT EXISTS public.message_citations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE NOT NULL,
  section_id uuid REFERENCES public.sections(id) ON DELETE CASCADE NOT NULL,
  snippet text
);


-- ==========================================
-- 7. USER FEATURES & HISTORY
-- ==========================================
CREATE TABLE IF NOT EXISTS public.bookmarked_laws (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  act_id uuid REFERENCES public.acts(id) ON DELETE CASCADE NOT NULL,
  section_id uuid REFERENCES public.sections(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, act_id, section_id)
);

CREATE TABLE IF NOT EXISTS public.saved_conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, conversation_id)
);

CREATE TABLE IF NOT EXISTS public.recently_viewed_laws (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  act_id uuid REFERENCES public.acts(id) ON DELETE CASCADE NOT NULL,
  viewed_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, act_id)
);

CREATE TABLE IF NOT EXISTS public.search_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  search_query text NOT NULL,
  searched_at timestamptz DEFAULT now() NOT NULL
);


-- ==========================================
-- 8. AI KNOWLEDGE LAYER (RAG)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.knowledge_sources (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_name text UNIQUE NOT NULL,
  source_url text,
  last_synced timestamptz DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id uuid REFERENCES public.knowledge_sources(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.embeddings_metadata (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id uuid REFERENCES public.knowledge_documents(id) ON DELETE CASCADE NOT NULL,
  chunk_text text NOT NULL,
  embedding vector(1536) -- Standard OpenAI embedding size
);
-- HNSW Index for fast vector similarity search
CREATE INDEX ON public.embeddings_metadata USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS public.ai_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  prompt_tokens integer,
  completion_tokens integer,
  created_at timestamptz DEFAULT now() NOT NULL
);


-- ==========================================
-- 9. INDEXES
-- ==========================================
-- Foreign Keys
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_parent_message_id ON public.messages(parent_message_id);
CREATE INDEX idx_message_attachments_message_id ON public.message_attachments(message_id);
CREATE INDEX idx_categories_jurisdiction_id ON public.categories(jurisdiction_id);
CREATE INDEX idx_acts_category_id ON public.acts(category_id);
CREATE INDEX idx_chapters_act_id ON public.chapters(act_id);
CREATE INDEX idx_sections_chapter_id ON public.sections(chapter_id);
CREATE INDEX idx_sections_act_id ON public.sections(act_id);
CREATE INDEX idx_subsections_section_id ON public.subsections(section_id);
CREATE INDEX idx_amendments_act_id ON public.amendments(act_id);
CREATE INDEX idx_official_pdfs_act_id ON public.official_pdfs(act_id);
CREATE INDEX idx_message_citations_message_id ON public.message_citations(message_id);
CREATE INDEX idx_message_citations_section_id ON public.message_citations(section_id);
CREATE INDEX idx_bookmarked_laws_user_id ON public.bookmarked_laws(user_id);
CREATE INDEX idx_bookmarked_laws_act_id ON public.bookmarked_laws(act_id);
CREATE INDEX idx_saved_conversations_user_id ON public.saved_conversations(user_id);
CREATE INDEX idx_recently_viewed_laws_user_id ON public.recently_viewed_laws(user_id);
CREATE INDEX idx_search_history_user_id ON public.search_history(user_id);
CREATE INDEX idx_knowledge_documents_source_id ON public.knowledge_documents(source_id);
CREATE INDEX idx_embeddings_metadata_document_id ON public.embeddings_metadata(document_id);
CREATE INDEX idx_ai_logs_user_id ON public.ai_logs(user_id);

-- GIN Indexes for Full Text Search
CREATE INDEX idx_acts_name_trgm ON public.acts USING GIN (act_name gin_trgm_ops);
CREATE INDEX idx_sections_search_vector ON public.sections USING GIN (search_vector);


-- ==========================================
-- 10. ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subsections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.official_pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarked_laws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recently_viewed_laws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.embeddings_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

-- 10.1 Policies for Private User Data (Only owner or Admin)
-- Profiles
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Notifications
CREATE POLICY "Users can manage own notification prefs" ON public.notification_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Chat System
CREATE POLICY "Users manage own conversations" ON public.conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own messages" ON public.messages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND c.user_id = auth.uid())
);
CREATE POLICY "Users manage own message attachments" ON public.message_attachments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.messages m JOIN public.conversations c ON m.conversation_id = c.id WHERE m.id = message_attachments.message_id AND c.user_id = auth.uid())
);
CREATE POLICY "Users manage own message citations" ON public.message_citations FOR ALL USING (
  EXISTS (SELECT 1 FROM public.messages m JOIN public.conversations c ON m.conversation_id = c.id WHERE m.id = message_citations.message_id AND c.user_id = auth.uid())
);
CREATE POLICY "Users manage own message feedback" ON public.message_feedback FOR ALL USING (
  EXISTS (SELECT 1 FROM public.messages m JOIN public.conversations c ON m.conversation_id = c.id WHERE m.id = message_feedback.message_id AND c.user_id = auth.uid())
);

-- Features & History
CREATE POLICY "Users manage own bookmarks" ON public.bookmarked_laws FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own saved conversations" ON public.saved_conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own recently viewed" ON public.recently_viewed_laws FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own search history" ON public.search_history FOR ALL USING (auth.uid() = user_id);

-- AI Logs
CREATE POLICY "Admins read all AI logs" ON public.ai_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "System can insert AI logs" ON public.ai_logs FOR INSERT WITH CHECK (true);


-- 10.2 Policies for Public Data (Public read, Admin write)
CREATE POLICY "Public read jurisdictions" ON public.jurisdictions FOR SELECT USING (true);
CREATE POLICY "Admin write jurisdictions" ON public.jurisdictions FOR ALL USING (public.is_admin());

CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admin write categories" ON public.categories FOR ALL USING (public.is_admin());

CREATE POLICY "Public read acts" ON public.acts FOR SELECT USING (true);
CREATE POLICY "Admin write acts" ON public.acts FOR ALL USING (public.is_admin());

CREATE POLICY "Public read chapters" ON public.chapters FOR SELECT USING (true);
CREATE POLICY "Admin write chapters" ON public.chapters FOR ALL USING (public.is_admin());

CREATE POLICY "Public read sections" ON public.sections FOR SELECT USING (true);
CREATE POLICY "Admin write sections" ON public.sections FOR ALL USING (public.is_admin());

CREATE POLICY "Public read subsections" ON public.subsections FOR SELECT USING (true);
CREATE POLICY "Admin write subsections" ON public.subsections FOR ALL USING (public.is_admin());

CREATE POLICY "Public read amendments" ON public.amendments FOR SELECT USING (true);
CREATE POLICY "Admin write amendments" ON public.amendments FOR ALL USING (public.is_admin());

CREATE POLICY "Public read official_pdfs" ON public.official_pdfs FOR SELECT USING (true);
CREATE POLICY "Admin write official_pdfs" ON public.official_pdfs FOR ALL USING (public.is_admin());

-- RAG Knowledge base (Public read or Service Role read)
CREATE POLICY "Public read knowledge_sources" ON public.knowledge_sources FOR SELECT USING (true);
CREATE POLICY "Admin write knowledge_sources" ON public.knowledge_sources FOR ALL USING (public.is_admin());

CREATE POLICY "Public read knowledge_documents" ON public.knowledge_documents FOR SELECT USING (true);
CREATE POLICY "Admin write knowledge_documents" ON public.knowledge_documents FOR ALL USING (public.is_admin());

CREATE POLICY "Public read embeddings_metadata" ON public.embeddings_metadata FOR SELECT USING (true);
CREATE POLICY "Admin write embeddings_metadata" ON public.embeddings_metadata FOR ALL USING (public.is_admin());


-- ==========================================
-- 11. STORAGE BUCKETS
-- ==========================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES 
  ('avatars', 'avatars', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/webp']),
  ('legal_documents', 'legal_documents', true, 20971520, ARRAY['application/pdf']),
  ('government_pdfs', 'government_pdfs', true, 52428800, ARRAY['application/pdf']),
  ('chat_attachments', 'chat_attachments', false, 10485760, ARRAY['image/png', 'image/jpeg', 'application/pdf', 'text/plain'])
ON CONFLICT (id) DO NOTHING;

-- Avatars
CREATE POLICY "Public view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users manage own avatars" ON storage.objects FOR ALL USING (
  bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Legal Documents & Government PDFs (Public view, Admin upload)
CREATE POLICY "Public view legal_documents" ON storage.objects FOR SELECT USING (bucket_id IN ('legal_documents', 'government_pdfs'));
CREATE POLICY "Admins manage legal_documents" ON storage.objects FOR ALL USING (
  bucket_id IN ('legal_documents', 'government_pdfs') AND public.is_admin()
);

-- Chat Attachments (Private)
CREATE POLICY "Users manage own chat_attachments" ON storage.objects FOR ALL USING (
  bucket_id = 'chat_attachments' AND auth.uid()::text = (storage.foldername(name))[1]
);
