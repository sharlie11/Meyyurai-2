-- 34_meyyurai_complaints_evidence_bookmarks.sql
-- Migration: Complaints, Evidence, Bookmarks, and AI Logs Tables with RLS

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Complaints Table
CREATE TABLE IF NOT EXISTS public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  category text DEFAULT 'General Legal' NOT NULL,
  complainant_name text,
  incident_date timestamptz DEFAULT now(),
  location text,
  respondent text,
  incident_description text NOT NULL,
  requested_action text,
  contact_details text,
  complaint_text text NOT NULL,
  status text DEFAULT 'draft' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Evidence Table
CREATE TABLE IF NOT EXISTS public.evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  complaint_id uuid REFERENCES public.complaints(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_url text NOT NULL,
  file_size integer DEFAULT 0 NOT NULL,
  description text,
  extracted_text text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 3. Bookmarks Table
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  law_id text,
  section_id text,
  title text NOT NULL,
  category text DEFAULT 'General Law' NOT NULL,
  source_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, title)
);

-- 4. AI Logs Table
CREATE TABLE IF NOT EXISTS public.ai_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid,
  query text NOT NULL,
  provider text DEFAULT 'gemini' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 5. Row Level Security (RLS)
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

-- Complaints Policies
DROP POLICY IF EXISTS "Users can manage own complaints" ON public.complaints;
CREATE POLICY "Users can manage own complaints" ON public.complaints
  FOR ALL USING (auth.uid() = user_id);

-- Evidence Policies
DROP POLICY IF EXISTS "Users can manage own evidence" ON public.evidence;
CREATE POLICY "Users can manage own evidence" ON public.evidence
  FOR ALL USING (auth.uid() = user_id);

-- Bookmarks Policies
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can manage own bookmarks" ON public.bookmarks
  FOR ALL USING (auth.uid() = user_id);

-- AI Logs Policies
DROP POLICY IF EXISTS "Users can manage own ai logs" ON public.ai_logs;
CREATE POLICY "Users can manage own ai logs" ON public.ai_logs
  FOR ALL USING (auth.uid() = user_id);

-- 6. Seed Demonstration Data for Verified Emergency Contacts & Laws
INSERT INTO public.resources_directory (name, category, address, contact_number, website, operating_hours)
VALUES
  ('National Emergency Response System', 'Emergency', 'Pan-India', '112', 'https://112.gov.in', '24/7'),
  ('National Women Helpline', 'Women Safety', 'Ministry of Women and Child Development', '1091', 'https://wcd.nic.in', '24/7'),
  ('Childline India', 'Child Protection', 'Ministry of Women & Child Development', '1098', 'https://www.childlineindia.org', '24/7'),
  ('National Cyber Crime Reporting Portal', 'Cyber Crime', 'Ministry of Home Affairs', '1930', 'https://cybercrime.gov.in', '24/7'),
  ('Ambulance & Medical Emergency', 'Medical', 'Pan-India', '108', 'https://nhm.gov.in', '24/7'),
  ('National Human Rights Commission (NHRC)', 'Legal Aid', 'Manav Adhikar Bhawan, New Delhi', '011-24651330', 'https://nhrc.nic.in', '9:30 AM - 6:00 PM')
ON CONFLICT DO NOTHING;
