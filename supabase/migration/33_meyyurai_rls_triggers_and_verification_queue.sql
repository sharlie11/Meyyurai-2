-- 33_meyyurai_rls_triggers_and_verification_queue.sql
-- Production-Grade Migration: Admin Infrastructure, Atomic Auth Triggers, Pinned search_path Security Functions, Append-Only Audit Logs, RLS Policies, & Developer Verification Queue

-- 1. Admin Users Table & Verification Helper
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read admin_users" ON public.admin_users;
CREATE POLICY "Public read admin_users" ON public.admin_users FOR SELECT USING (true);

-- Security function with pinned search_path to check admin status
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF user_uuid IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users WHERE id = user_uuid AND role = 'admin'
  );
END;
$$;

-- 2. Atomic Auth Trigger Function with Pinned search_path & Multi-Provider Fallback
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  extracted_name TEXT;
BEGIN
  extracted_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'given_name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.users (id, email, phone_number, created_at, last_active_at)
  VALUES (NEW.id, NEW.email, NEW.phone, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, last_active_at = NOW();

  INSERT INTO public.profiles (id, full_name, email, onboarded, preferred_language, created_at, updated_at)
  VALUES (
    NEW.id,
    extracted_name,
    NEW.email,
    FALSE,
    'English',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Extend resources_directory Table with Officer Contacts & Official Sourcing
ALTER TABLE public.resources_directory
ADD COLUMN IF NOT EXISTS officer_contact JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'verified';

-- 4. Create Data Change Queue for Official Source Change Tracking
CREATE TABLE IF NOT EXISTS public.data_change_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID,
    source_url TEXT NOT NULL,
    detected_changes JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_developer_approval',
    developer_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

-- 5. Row-Level Security (RLS) Enablement & Hardened Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rights_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rights_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_change_queue ENABLE ROW LEVEL SECURITY;

-- Users policies
DROP POLICY IF EXISTS "Users can read own record" ON public.users;
CREATE POLICY "Users can read own record" ON public.users FOR SELECT USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- Profiles policies
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Activity Logs: APPEND-ONLY Policies (Regular users can SELECT and INSERT only)
DROP POLICY IF EXISTS "Users read own logs" ON public.activity_logs;
CREATE POLICY "Users read own logs" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users insert own logs" ON public.activity_logs;
CREATE POLICY "Users insert own logs" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin delete update logs" ON public.activity_logs;
CREATE POLICY "Admin delete update logs" ON public.activity_logs FOR ALL USING (public.is_admin(auth.uid()));

-- Public read / Admin write for resources_directory & rights
DROP POLICY IF EXISTS "Public read resources_directory" ON public.resources_directory;
CREATE POLICY "Public read resources_directory" ON public.resources_directory FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write resources_directory" ON public.resources_directory;
CREATE POLICY "Admin write resources_directory" ON public.resources_directory FOR ALL USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public read rights_categories" ON public.rights_categories;
CREATE POLICY "Public read rights_categories" ON public.rights_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write rights_categories" ON public.rights_categories;
CREATE POLICY "Admin write rights_categories" ON public.rights_categories FOR ALL USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public read rights_articles" ON public.rights_articles;
CREATE POLICY "Public read rights_articles" ON public.rights_articles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write rights_articles" ON public.rights_articles;
CREATE POLICY "Admin write rights_articles" ON public.rights_articles FOR ALL USING (public.is_admin(auth.uid()));

-- Data Change Queue policies
DROP POLICY IF EXISTS "Admin manage data_change_queue" ON public.data_change_queue;
CREATE POLICY "Admin manage data_change_queue" ON public.data_change_queue FOR ALL USING (public.is_admin(auth.uid()));
