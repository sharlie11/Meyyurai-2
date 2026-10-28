-- 24_meyyurai_v4_complete_schema.sql
-- Mega-Migration: Unified Production Schema for Meyyurai
-- Combines the V3 Law Hierarchy with all V1 Application Features
-- Eliminates duplicate user tables by standardizing on auth.users -> public.profiles

-- ==========================================
-- 1. EXTENSIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================
-- 2. ENUMS
-- ==========================================
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.sender_type AS ENUM ('user', 'ai', 'system');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ==========================================
-- 3. HELPER FUNCTIONS
-- ==========================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.encrypt_field(plaintext text, key_str text)
RETURNS bytea AS $$
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN RETURN NULL; END IF;
  RETURN pgp_sym_encrypt(plaintext, key_str);
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrypt_field(ciphertext bytea, key_str text)
RETURNS text AS $$
BEGIN
  IF ciphertext IS NULL THEN RETURN NULL; END IF;
  RETURN pgp_sym_decrypt(ciphertext, key_str);
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- Admin checker helper
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.profiles WHERE id = user_uuid AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 4. CORE PROFILES & AUTH SYNC
-- ==========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
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
  deleted_at timestamptz
);
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-sync auth.users to public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user_v4()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone_number, role, language, onboarded)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    NEW.phone,
    'user',
    'en',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_v4();

-- ==========================================
-- 5. APP FEATURES (FROM V1)
-- ==========================================

-- Emergency Contacts
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  relationship text,
  phone bytea NOT NULL,
  alternate_phone bytea,
  email bytea,
  priority_order integer DEFAULT 0 NOT NULL,
  is_primary boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Trusted Contacts
CREATE TABLE IF NOT EXISTS public.trusted_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  phone bytea NOT NULL,
  email bytea,
  status text DEFAULT 'pending' NOT NULL,
  priority_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Emergency Events (SOS)
CREATE TABLE IF NOT EXISTS public.emergency_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  time timestamptz DEFAULT now() NOT NULL,
  latitude double precision,
  longitude double precision,
  accuracy double precision,
  device_info jsonb DEFAULT '{}'::jsonb NOT NULL,
  emergency_type text DEFAULT 'SOS' NOT NULL,
  notes text,
  status text DEFAULT 'active' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Tracking Sessions
CREATE TABLE IF NOT EXISTS public.tracking_sessions (
  session_id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'active' NOT NULL,
  started_at timestamptz DEFAULT now() NOT NULL,
  ended_at timestamptz,
  max_duration_ms bigint DEFAULT 10800000 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Location Tracking Breadcrumbs
CREATE TABLE IF NOT EXISTS public.location_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  timestamp timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- AI Conversations (Legacy format for UI compatibility)
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id uuid NOT NULL,
  user_question text NOT NULL,
  ai_response text NOT NULL,
  language text DEFAULT 'en' NOT NULL,
  urgency_detected boolean DEFAULT false NOT NULL,
  urgency_level text DEFAULT 'LOW' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Voice Notes
CREATE TABLE IF NOT EXISTS public.voice_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  audio_url text NOT NULL,
  transcript text,
  language text,
  duration_seconds integer,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Uploaded Files
CREATE TABLE IF NOT EXISTS public.uploaded_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  analysis_result jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' NOT NULL,
  status text DEFAULT 'unread' NOT NULL,
  delivery_time timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Rights Categories
CREATE TABLE IF NOT EXISTS public.rights_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  icon text,
  description text,
  priority_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Rights Articles
CREATE TABLE IF NOT EXISTS public.rights_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.rights_categories(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  procedures jsonb DEFAULT '[]'::jsonb NOT NULL,
  contact_resources jsonb DEFAULT '[]'::jsonb NOT NULL,
  emergency_numbers jsonb DEFAULT '[]'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Resources Directory
CREATE TABLE IF NOT EXISTS public.resources_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  address text,
  contact_number text,
  website text,
  latitude double precision,
  longitude double precision,
  operating_hours text DEFAULT '24/7' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- System Settings
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Activity Logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  device_info jsonb DEFAULT '{}'::jsonb NOT NULL,
  ip_address text,
  created_at timestamptz DEFAULT now() NOT NULL
);


-- ==========================================
-- 6. GOVERNMENT LAW DATABASE HIERARCHY (FROM V3)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.jurisdictions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  level text NOT NULL
);

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  jurisdiction_id uuid REFERENCES public.jurisdictions(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  UNIQUE(jurisdiction_id, name)
);

CREATE TABLE IF NOT EXISTS public.acts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  act_name text NOT NULL,
  act_number text,
  year integer,
  official_source text,
  ministry text,
  UNIQUE(act_number, year, official_source)
);

CREATE TABLE IF NOT EXISTS public.chapters (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  act_id uuid REFERENCES public.acts(id) ON DELETE CASCADE NOT NULL,
  chapter_number text NOT NULL,
  title text,
  UNIQUE(act_id, chapter_number)
);

CREATE TABLE IF NOT EXISTS public.sections (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE,
  act_id uuid REFERENCES public.acts(id) ON DELETE CASCADE NOT NULL,
  section_number text NOT NULL,
  heading text NOT NULL,
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

-- ==========================================
-- 7. RLS POLICIES & SECURITY
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subsections ENABLE ROW LEVEL SECURITY;

-- Read policies for public laws
DROP POLICY IF EXISTS "Public read jurisdictions" ON public.jurisdictions;
CREATE POLICY "Public read jurisdictions" ON public.jurisdictions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read acts" ON public.acts;
CREATE POLICY "Public read acts" ON public.acts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read chapters" ON public.chapters;
CREATE POLICY "Public read chapters" ON public.chapters FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read sections" ON public.sections;
CREATE POLICY "Public read sections" ON public.sections FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read subsections" ON public.subsections;
CREATE POLICY "Public read subsections" ON public.subsections FOR SELECT USING (true);

-- User Policies (tied to auth.uid())
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
CREATE POLICY "Users can manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can manage own emergency contacts" ON public.emergency_contacts;
CREATE POLICY "Users can manage own emergency contacts" ON public.emergency_contacts FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own trusted contacts" ON public.trusted_contacts;
CREATE POLICY "Users can manage own trusted contacts" ON public.trusted_contacts FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own emergency events" ON public.emergency_events;
CREATE POLICY "Users can manage own emergency events" ON public.emergency_events FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own tracking" ON public.location_tracking;
DROP POLICY IF EXISTS "Accepted trusted contacts can view tracking" ON public.location_tracking;
CREATE POLICY "Users can manage own tracking" ON public.location_tracking FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own ai conversations" ON public.ai_conversations;
CREATE POLICY "Users can manage own ai conversations" ON public.ai_conversations FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own voice notes" ON public.voice_notes;
CREATE POLICY "Users can manage own voice notes" ON public.voice_notes FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own uploaded files" ON public.uploaded_files;
CREATE POLICY "Users can manage own uploaded files" ON public.uploaded_files FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notifications;
CREATE POLICY "Users can manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own activity logs" ON public.activity_logs;
CREATE POLICY "Users can insert own activity logs" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin Policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can view all events" ON public.emergency_events;
CREATE POLICY "Admins can view all events" ON public.emergency_events FOR SELECT USING (public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins can view all activity" ON public.activity_logs;
CREATE POLICY "Admins can view all activity" ON public.activity_logs FOR SELECT USING (public.is_admin(auth.uid()));


-- ==========================================
-- 8. INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_sections_search_vector ON public.sections USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_emergency_events_user ON public.emergency_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id);


-- ==========================================
-- 9. RPC FUNCTIONS FOR ENCRYPTED CONTACTS
-- ==========================================
CREATE OR REPLACE FUNCTION public.insert_emergency_contact(p_name text, p_relationship text, p_phone text, p_alternate_phone text, p_email text, p_priority_order integer, p_is_primary boolean, p_key text) RETURNS uuid AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.emergency_contacts (user_id, name, relationship, phone, alternate_phone, email, priority_order, is_primary)
  VALUES (auth.uid(), p_name, p_relationship, public.encrypt_field(p_phone, p_key), public.encrypt_field(p_alternate_phone, p_key), public.encrypt_field(p_email, p_key), COALESCE(p_priority_order, 0), COALESCE(p_is_primary, false))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_emergency_contact(p_id uuid, p_name text, p_relationship text, p_phone text, p_alternate_phone text, p_email text, p_priority_order integer, p_is_primary boolean, p_key text) RETURNS boolean AS $$
BEGIN
  UPDATE public.emergency_contacts
  SET name = COALESCE(p_name, name), relationship = COALESCE(p_relationship, relationship), phone = CASE WHEN p_phone IS NOT NULL THEN public.encrypt_field(p_phone, p_key) ELSE phone END, alternate_phone = CASE WHEN p_alternate_phone IS NOT NULL THEN public.encrypt_field(p_alternate_phone, p_key) ELSE alternate_phone END, email = CASE WHEN p_email IS NOT NULL THEN public.encrypt_field(p_email, p_key) ELSE email END, priority_order = COALESCE(p_priority_order, priority_order), is_primary = COALESCE(p_is_primary, is_primary)
  WHERE id = p_id AND user_id = auth.uid();
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.select_emergency_contacts(p_key text) RETURNS TABLE (id uuid, user_id uuid, name text, relationship text, phone text, alternate_phone text, email text, priority_order integer, is_primary boolean, created_at timestamptz) AS $$
BEGIN
  RETURN QUERY SELECT ec.id, ec.user_id, ec.name, ec.relationship, public.decrypt_field(ec.phone, p_key) as phone, public.decrypt_field(ec.alternate_phone, p_key) as alternate_phone, public.decrypt_field(ec.email, p_key) as email, ec.priority_order, ec.is_primary, ec.created_at
  FROM public.emergency_contacts ec WHERE ec.user_id = auth.uid() ORDER BY ec.priority_order ASC, ec.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
