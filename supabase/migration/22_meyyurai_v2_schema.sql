-- Meyyurai v2 Database Schema Migration
-- A clean, normalized, scalable, and production-ready architecture.

-- 1. ENUMS & EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text similarity if needed

DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('user', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.sender_type AS ENUM ('user', 'assistant', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. TRIGGER FUNCTIONS
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. TABLES
-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  profile_photo text,
  role public.user_role DEFAULT 'user' NOT NULL,
  language text DEFAULT 'en' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender public.sender_type DEFAULT 'user' NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- saved_conversations
CREATE TABLE IF NOT EXISTS public.saved_conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, conversation_id)
);

-- user_activity
CREATE TABLE IF NOT EXISTS public.user_activity (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  page text,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- law_categories
CREATE TABLE IF NOT EXISTS public.law_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  description text
);

-- laws
CREATE TABLE IF NOT EXISTS public.laws (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id uuid REFERENCES public.law_categories(id) ON DELETE RESTRICT NOT NULL,
  title text NOT NULL,
  act_name text,
  act_number text,
  year integer,
  description text,
  source text,
  official_url text,
  ministry text,
  language text DEFAULT 'en' NOT NULL,
  status text DEFAULT 'active',
  version text,
  last_updated timestamptz DEFAULT now() NOT NULL,
  fts tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(act_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) STORED
);

-- law_sections
CREATE TABLE IF NOT EXISTS public.law_sections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  law_id uuid REFERENCES public.laws(id) ON DELETE CASCADE NOT NULL,
  section_number text NOT NULL,
  heading text,
  content text NOT NULL,
  fts tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(heading, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(content, '')), 'B')
  ) STORED
);

-- amendments
CREATE TABLE IF NOT EXISTS public.amendments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  law_id uuid REFERENCES public.laws(id) ON DELETE CASCADE NOT NULL,
  amendment_date date,
  description text NOT NULL,
  gazette_reference text
);

-- legal_documents
CREATE TABLE IF NOT EXISTS public.legal_documents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  law_id uuid REFERENCES public.laws(id) ON DELETE CASCADE NOT NULL,
  document_name text NOT NULL,
  file_url text NOT NULL,
  document_type text,
  uploaded_at timestamptz DEFAULT now() NOT NULL
);

-- ai_logs
CREATE TABLE IF NOT EXISTS public.ai_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL,
  prompt text NOT NULL,
  response text NOT NULL,
  model text,
  tokens integer,
  response_time integer, -- in ms
  created_at timestamptz DEFAULT now() NOT NULL
);

-- emergency_contacts
CREATE TABLE IF NOT EXISTS public.emergency_contacts_v2 (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  state text NOT NULL,
  district text NOT NULL,
  police text,
  women_helpline text,
  ambulance text,
  cybercrime text,
  legal_services text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(state, district)
);

-- bookmarked_laws
CREATE TABLE IF NOT EXISTS public.bookmarked_laws (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  law_id uuid REFERENCES public.laws(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, law_id)
);

-- admins
CREATE TABLE IF NOT EXISTS public.admins (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  permission text DEFAULT 'all' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 4. TRIGGERS
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_v2()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.phone,
    'user',
    'en'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create if it doesn't already exist to avoid conflicts with V1
DO $$ BEGIN
    CREATE TRIGGER on_auth_user_created_v2
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_v2();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- 5. INDEXES
-- Foreign Keys
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_saved_conversations_user_id ON public.saved_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_laws_category_id ON public.laws(category_id);
CREATE INDEX IF NOT EXISTS idx_law_sections_law_id ON public.law_sections(law_id);
CREATE INDEX IF NOT EXISTS idx_amendments_law_id ON public.amendments(law_id);
CREATE INDEX IF NOT EXISTS idx_legal_documents_law_id ON public.legal_documents(law_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_user_id ON public.ai_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarked_laws_user_id ON public.bookmarked_laws(user_id);

-- Full Text Search
CREATE INDEX IF NOT EXISTS idx_laws_fts ON public.laws USING GIN (fts);
CREATE INDEX IF NOT EXISTS idx_law_sections_fts ON public.law_sections USING GIN (fts);

-- 6. ROW LEVEL SECURITY (RLS)
-- Admin Verification Function
CREATE OR REPLACE FUNCTION public.is_admin_v2()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admins 
    WHERE profile_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.law_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.laws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.law_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amendments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarked_laws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read/update their own profile, Admins can read all.
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin_v2());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL USING (public.is_admin_v2());

-- Conversations & Messages: Private to user
CREATE POLICY "Users can manage own conversations" ON public.conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own messages" ON public.messages FOR ALL USING (
  EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = messages.conversation_id AND c.user_id = auth.uid())
);

-- Saved Conversations & User Activity
CREATE POLICY "Users can manage own saved conversations" ON public.saved_conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity" ON public.user_activity FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view activity" ON public.user_activity FOR SELECT USING (public.is_admin_v2());

-- Law Data: Public Read, Admin Write
CREATE POLICY "Public read law_categories" ON public.law_categories FOR SELECT USING (true);
CREATE POLICY "Admin write law_categories" ON public.law_categories FOR ALL USING (public.is_admin_v2());

CREATE POLICY "Public read laws" ON public.laws FOR SELECT USING (true);
CREATE POLICY "Admin write laws" ON public.laws FOR ALL USING (public.is_admin_v2());

CREATE POLICY "Public read law_sections" ON public.law_sections FOR SELECT USING (true);
CREATE POLICY "Admin write law_sections" ON public.law_sections FOR ALL USING (public.is_admin_v2());

CREATE POLICY "Public read amendments" ON public.amendments FOR SELECT USING (true);
CREATE POLICY "Admin write amendments" ON public.amendments FOR ALL USING (public.is_admin_v2());

CREATE POLICY "Public read legal_documents" ON public.legal_documents FOR SELECT USING (true);
CREATE POLICY "Admin write legal_documents" ON public.legal_documents FOR ALL USING (public.is_admin_v2());

CREATE POLICY "Public read emergency_contacts" ON public.emergency_contacts_v2 FOR SELECT USING (true);
CREATE POLICY "Admin write emergency_contacts" ON public.emergency_contacts_v2 FOR ALL USING (public.is_admin_v2());

-- AI Logs: System/Admin read, Service Insert (or user insert)
CREATE POLICY "Users can view own AI logs" ON public.ai_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own AI logs" ON public.ai_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all AI logs" ON public.ai_logs FOR SELECT USING (public.is_admin_v2());

-- Bookmarked Laws
CREATE POLICY "Users can manage bookmarked laws" ON public.bookmarked_laws FOR ALL USING (auth.uid() = user_id);

-- Admins
CREATE POLICY "Admins can read admins" ON public.admins FOR SELECT USING (public.is_admin_v2());


-- 7. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('v2_avatars', 'v2_avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('v2_legal_docs', 'v2_legal_docs', true) ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Avatars: Anyone can view, Authenticated users can upload their own.
CREATE POLICY "Public view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'v2_avatars');
CREATE POLICY "Users can upload their own avatars" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'v2_avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can update their own avatars" ON storage.objects FOR UPDATE USING (
  bucket_id = 'v2_avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);
CREATE POLICY "Users can delete their own avatars" ON storage.objects FOR DELETE USING (
  bucket_id = 'v2_avatars' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Legal Docs: Anyone can view, Admin can manage.
CREATE POLICY "Public view legal docs" ON storage.objects FOR SELECT USING (bucket_id = 'v2_legal_docs');
CREATE POLICY "Admins can manage legal docs" ON storage.objects FOR ALL USING (
  bucket_id = 'v2_legal_docs' AND public.is_admin_v2()
);
