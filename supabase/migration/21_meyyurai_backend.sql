-- 21_meyyurai_backend.sql
-- Meyyurai Platform complete backend migration script

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Define Helper Functions for Data Encryption
-- Sensitive contact numbers and PII are encrypted using pgcrypto.
-- The key can be passed dynamically from server config, or falls back to a database local secret.
CREATE OR REPLACE FUNCTION public.encrypt_field(plaintext text, key_str text)
RETURNS bytea AS $$
BEGIN
  IF plaintext IS NULL OR plaintext = '' THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_encrypt(plaintext, key_str);
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrypt_field(ciphertext bytea, key_str text)
RETURNS text AS $$
BEGIN
  IF ciphertext IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN pgp_sym_decrypt(ciphertext, key_str);
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- 3. Create Tables

-- Ensure existing table has required columns if it was already created by another process
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE IF EXISTS public.users ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now() NOT NULL;

-- public.users: synchronized with auth.users
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  phone_number text, -- stored plain for authentication queries / quick lookup
  created_at timestamptz DEFAULT now() NOT NULL,
  last_active_at timestamptz DEFAULT now() NOT NULL
);

-- public.profiles: user profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  preferred_language text DEFAULT 'en' NOT NULL,
  country text,
  state text,
  city text,
  onboarded boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- public.emergency_contacts: list of emergency contacts
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  relationship text,
  phone bytea NOT NULL, -- encrypted
  alternate_phone bytea, -- encrypted
  email bytea, -- encrypted
  priority_order integer DEFAULT 0 NOT NULL,
  is_primary boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- public.trusted_contacts: list of trusted contacts
CREATE TABLE IF NOT EXISTS public.trusted_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  phone bytea NOT NULL, -- encrypted
  email bytea, -- encrypted
  status text DEFAULT 'pending' NOT NULL, -- pending, accepted, rejected
  priority_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- public.emergency_events: SOS trigger history
CREATE TABLE IF NOT EXISTS public.emergency_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  time timestamptz DEFAULT now() NOT NULL,
  latitude double precision,
  longitude double precision,
  accuracy double precision,
  device_info jsonb DEFAULT '{}'::jsonb NOT NULL,
  emergency_type text DEFAULT 'SOS' NOT NULL,
  notes text,
  status text DEFAULT 'active' NOT NULL, -- active, resolved, cancelled
  created_at timestamptz DEFAULT now() NOT NULL
);

-- public.location_tracking: live tracking logs during active sessions
CREATE TABLE IF NOT EXISTS public.location_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  timestamp timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- public.ai_conversations: AI Guidance context records
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id uuid NOT NULL,
  user_question text NOT NULL,
  ai_response text NOT NULL,
  language text DEFAULT 'en' NOT NULL,
  urgency_detected boolean DEFAULT false NOT NULL,
  urgency_level text DEFAULT 'LOW' NOT NULL, -- LOW, MEDIUM, HIGH, CRITICAL
  created_at timestamptz DEFAULT now() NOT NULL
);

-- public.voice_notes: registered user voice notes
CREATE TABLE IF NOT EXISTS public.voice_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  audio_url text NOT NULL,
  transcript text,
  language text,
  duration_seconds integer,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- public.uploaded_files: evidence files, PDFs, etc.
CREATE TABLE IF NOT EXISTS public.uploaded_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size integer NOT NULL,
  analysis_result jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- public.rights_categories: Category list
CREATE TABLE IF NOT EXISTS public.rights_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  icon text,
  description text,
  priority_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- public.rights_articles: Detailed rights documentation
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

-- public.resources_directory: nearby assistances
CREATE TABLE IF NOT EXISTS public.resources_directory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL, -- Police, Hospital, NGO, Legal Aid, Shelter, etc.
  address text,
  contact_number text,
  website text,
  latitude double precision,
  longitude double precision,
  operating_hours text DEFAULT '24/7' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- public.notifications: user notifications logs
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' NOT NULL, -- emergency, security, update, follow_up
  status text DEFAULT 'unread' NOT NULL, -- unread, read
  delivery_time timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- public.activity_logs: user audit logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  device_info jsonb DEFAULT '{}'::jsonb NOT NULL,
  ip_address text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- public.admin_users: users with administrative privileges
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  role text DEFAULT 'admin' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- public.system_settings: key-value settings store
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 4. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trusted_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rights_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rights_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- 5. Define RLS Policies

-- Admin checker helper
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.admin_users WHERE id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles & Users Policy
CREATE POLICY "Users can manage own record" ON public.users
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all user records" ON public.users
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view and update own profile" ON public.profiles
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (public.is_admin(auth.uid()));

-- Emergency & Trusted Contacts Policies
CREATE POLICY "Users can manage own emergency contacts" ON public.emergency_contacts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own trusted contacts" ON public.trusted_contacts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SOS & Tracking Policies
CREATE POLICY "Users can manage own emergency events" ON public.emergency_events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all emergency events" ON public.emergency_events
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can manage own location tracking sessions" ON public.location_tracking
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AI, Voice, and File Uploads Policies
CREATE POLICY "Users can manage own AI chat history" ON public.ai_conversations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own voice notes" ON public.voice_notes
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own uploaded files" ON public.uploaded_files
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Notifications & Activity Logs Policies
CREATE POLICY "Users can view and update own notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity logs" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own activity logs" ON public.activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity logs" ON public.activity_logs
  FOR SELECT USING (public.is_admin(auth.uid()));

-- Public Read / Admin Manage Policies (Rights and Resources)
CREATE POLICY "Allow public read rights categories" ON public.rights_categories
  FOR SELECT TO public USING (true);

CREATE POLICY "Allow admin write rights categories" ON public.rights_categories
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Allow public read rights articles" ON public.rights_articles
  FOR SELECT TO public USING (true);

CREATE POLICY "Allow admin write rights articles" ON public.rights_articles
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Allow public read resources directory" ON public.resources_directory
  FOR SELECT TO public USING (true);

CREATE POLICY "Allow admin write resources directory" ON public.resources_directory
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Allow admin manage settings" ON public.system_settings
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Allow read system settings" ON public.system_settings
  FOR SELECT TO public USING (true);

-- 6. Indexes for Performance Optimization
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON public.emergency_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_contacts_user ON public.trusted_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_events_user ON public.emergency_events(user_id);
CREATE INDEX IF NOT EXISTS idx_location_tracking_session ON public.location_tracking(session_id);
CREATE INDEX IF NOT EXISTS idx_location_tracking_user ON public.location_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_user ON public.voice_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_user ON public.uploaded_files(user_id);
CREATE INDEX IF NOT EXISTS idx_rights_articles_category ON public.rights_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_resources_directory_geo ON public.resources_directory(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON public.notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);

-- 7. Define Sync Triggers from auth.users
-- Trigger function to create/update public user records on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- 1. Populate public.users
  INSERT INTO public.users (id, email, phone_number, created_at, last_active_at)
  VALUES (new.id, new.email, new.phone, COALESCE(new.created_at, now()), now())
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email, phone_number = EXCLUDED.phone_number, last_active_at = now();

  -- 2. Populate public.profiles
  INSERT INTO public.profiles (id, full_name, avatar_url, preferred_language, onboarded, created_at, updated_at)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'preferred_language', 'en'),
    false,
    COALESCE(new.created_at, now()),
    now()
  )
  ON CONFLICT (id) DO UPDATE
  SET full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
      avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
      updated_at = now();

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger function to update email/phone on auth updates
CREATE OR REPLACE FUNCTION public.handle_update_user()
RETURNS trigger AS $$
BEGIN
  UPDATE public.users
  SET email = new.email,
      phone_number = new.phone,
      last_active_at = now()
  WHERE id = new.id;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email, phone ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_update_user();

-- 8. Seed Default Data (Categories, Articles, Resources, Settings)

-- Rights Categories
INSERT INTO public.rights_categories (slug, name, icon, description, priority_order) VALUES
  ('women', 'Women Rights', 'HandHeart', 'Protection against domestic violence, workspace harassment, and support procedures.', 1),
  ('child', 'Child Rights', 'Baby', 'Protection against abuse, child labor, and rights to education & shelter.', 2),
  ('employee', 'Employee Rights', 'Briefcase', 'Fair wages, safety norms, leave policies, and workplace harassment laws.', 3),
  ('consumer', 'Consumer Rights', 'ShoppingBag', 'Protection from unfair trade practices, warranty issues, and claims guidelines.', 4),
  ('cyber', 'Cyber Rights', 'Globe', 'Cyberstalking, phishing, identity theft protection, and reporting procedures.', 5),
  ('senior', 'Senior Citizen Rights', 'UserRound', 'Maintenance rights, security systems, and old age support systems.', 6),
  ('student', 'Student Rights', 'GraduationCap', 'Right to education, anti-ragging protections, and academic rights.', 7),
  ('human', 'Human Rights', 'Shield', 'Fundamental human rights, legal safeguards, and freedom from custody abuse.', 8),
  ('disability', 'Disability Rights', 'Wheelchair', 'Equal access opportunities, reservations, and accessibility guidelines.', 9),
  ('legal', 'General Legal Rights', 'Scale', 'Legal aid support, FIR filing rules, arrest procedures, and court guides.', 10)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, priority_order = EXCLUDED.priority_order;

-- Sample Rights Articles
DO $$
DECLARE
  women_id uuid;
  child_id uuid;
  employee_id uuid;
  cyber_id uuid;
BEGIN
  SELECT id INTO women_id FROM public.rights_categories WHERE slug = 'women';
  SELECT id INTO child_id FROM public.rights_categories WHERE slug = 'child';
  SELECT id INTO employee_id FROM public.rights_categories WHERE slug = 'employee';
  SELECT id INTO cyber_id FROM public.rights_categories WHERE slug = 'cyber';

  -- Women Rights Article
  IF women_id IS NOT NULL THEN
    INSERT INTO public.rights_articles (category_id, title, description, procedures, contact_resources, emergency_numbers)
    VALUES (
      women_id,
      'Protection from Domestic Violence Act',
      'This law provides civil remedies and emergency protections for women facing abuse inside their households.',
      '[
        {"step": 1, "title": "Move to Safety", "text": "Reach out to your designated emergency contacts or move to a secure room/shelter."},
        {"step": 2, "title": "Contact Protection Officer", "text": "Report the matter to the district protection officer or file a complaint at the local police station."},
        {"step": 3, "title": "Apply for Relief", "text": "Request shelter residency orders, maintenance payments, and protection orders through free legal aid."}
      ]'::jsonb,
      '[
        {"name": "National Commission for Women", "website": "http://ncw.nic.in", "helpline": "7827170170"},
        {"name": "District Legal Aid Board", "details": "Provides free legal aid services to women regardless of income."}
      ]'::jsonb,
      '[
        {"label": "Women Safety Helpline", "number": "1091"},
        {"label": "Domestic Violence Helpline", "number": "181"}
      ]'::jsonb
    );
  END IF;

  -- Child Protection Article
  IF child_id IS NOT NULL THEN
    INSERT INTO public.rights_articles (category_id, title, description, procedures, contact_resources, emergency_numbers)
    VALUES (
      child_id,
      'POCSO Act & Abuse Prevention Guidelines',
      'The Protection of Children from Sexual Offences Act safeguards children from assault and exploitation, ensuring child-friendly trial protocols.',
      '[
        {"step": 1, "title": "Report Abuse", "text": "Call the national child helpline or report to the Special Juvenile Police Unit (SJPU)."},
        {"step": 2, "title": "Medical & Counseling Support", "text": "Ensure the child is taken to a government hospital. Police will arrange medical screening."},
        {"step": 3, "title": "In camera Trial", "text": "Statements are recorded in child-friendly environments without confronting the accused."}
      ]'::jsonb,
      '[
        {"name": "Childline India Foundation", "website": "https://www.childlineindia.org"},
        {"name": "NCPCR", "details": "National Commission for Protection of Child Rights."}
      ]'::jsonb,
      '[
        {"label": "Childline India", "number": "1098"}
      ]'::jsonb
    );
  END IF;

  -- Cyber Rights Article
  IF cyber_id IS NOT NULL THEN
    INSERT INTO public.rights_articles (category_id, title, description, procedures, contact_resources, emergency_numbers)
    VALUES (
      cyber_id,
      'Reporting Cyber Stalking and Identity Theft',
      'Cyber laws enable direct reporting of harassment, morphing, hacking, and digital financial frauds with active response divisions.',
      '[
        {"step": 1, "title": "Preserve Evidence", "text": "Take clear screenshots of messages, URLs, headers, profiles, and transactional notifications."},
        {"step": 2, "title": "Submit Incident Report", "text": "File a report online at the national cyber crime portal or contact the cyber cell branch."},
        {"step": 3, "title": "Block Accounts", "text": "Contact your banking service provider within 2 hours if fraud is financial, and flag target social accounts."}
      ]'::jsonb,
      '[
        {"name": "National Cyber Crime Portal", "website": "https://cybercrime.gov.in"},
        {"name": "CERT-In Safety Guidelines", "website": "https://www.cert-in.org.in"}
      ]'::jsonb,
      '[
        {"label": "National Cyber Crime Support", "number": "1930"}
      ]'::jsonb
    );
  END IF;
END $$;

-- Resources Directory
INSERT INTO public.resources_directory (name, category, address, contact_number, website, latitude, longitude, operating_hours) VALUES
  ('Central Police Station', 'Police', 'Main Road, Block-A, City Centre', '100', NULL, 12.9716, 77.5946, '24/7'),
  ('City General Hospital', 'Hospital', 'Hospital Road, Sector-4', '108', 'https://cityhospital.example.com', 12.9750, 77.6000, '24/7'),
  ('District Legal Aid Centre', 'Legal Aid', 'Court Complex, Block-B, City Centre', '15100', 'https://nalsa.gov.in', 12.9800, 77.5900, '09:30 AM - 05:30 PM'),
  ('Asha Women Support NGO', 'NGO', '12 Lotus Street, Shanti Vihar', '+91 9876543210', 'https://ashawomen.example.org', 12.9650, 77.6100, '08:00 AM - 08:00 PM'),
  ('Safe Haven Shelter', 'Shelter', 'Greenway Lane, Sector-9', '+91 9123456780', NULL, 12.9550, 77.5850, '24/7')
ON CONFLICT DO NOTHING;

-- System Settings
INSERT INTO public.system_settings (key, value, updated_at) VALUES
  ('general', '{"app_name": "Meyyurai", "support_email": "support@meyyurai.example.org", "enforce_ssl": true}'::jsonb, now()),
  ('sos_config', '{"alert_contacts_via_sms": true, "sms_retry_limit": 3, "gps_tracking_interval_seconds": 30}'::jsonb, now()),
  ('security_config', '{"api_rate_limit_per_minute": 60, "session_timeout_minutes": 1440, "enforce_device_binding": false}'::jsonb, now())
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- 9. Storage Bucket Setup (images, voice_notes, documents, evidence)
INSERT INTO storage.buckets (id, name, public) VALUES
  ('images', 'images', true),
  ('voice_notes', 'voice_notes', true),
  ('documents', 'documents', true),
  ('evidence', 'evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Row Level Security Policies
-- Allow authenticated users to upload objects into their folders
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id IN ('images', 'voice_notes', 'documents', 'evidence') AND
    (owner = auth.uid() OR auth.uid()::text = (storage.foldername(name))[1])
  );

-- Allow public read of public buckets
CREATE POLICY "Allow public read of public assets" ON storage.objects
  FOR SELECT TO public USING (bucket_id IN ('images', 'voice_notes', 'documents'));

-- Allow users to manage (select/delete) their own uploads
CREATE POLICY "Allow users to manage own assets" ON storage.objects
  FOR ALL TO authenticated USING (
    auth.uid()::text = (storage.foldername(name))[1] OR
    owner = auth.uid()
  );

-- 10. Database Encryption RPC Wrapper Functions (pgcrypto)
-- Emergency Contacts RPCs
CREATE OR REPLACE FUNCTION public.insert_emergency_contact(
  p_name text,
  p_relationship text,
  p_phone text,
  p_alternate_phone text,
  p_email text,
  p_priority_order integer,
  p_is_primary boolean,
  p_key text
) RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.emergency_contacts (
    user_id, name, relationship, phone, alternate_phone, email, priority_order, is_primary
  ) VALUES (
    auth.uid(),
    p_name,
    p_relationship,
    public.encrypt_field(p_phone, p_key),
    public.encrypt_field(p_alternate_phone, p_key),
    public.encrypt_field(p_email, p_key),
    COALESCE(p_priority_order, 0),
    COALESCE(p_is_primary, false)
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_emergency_contact(
  p_id uuid,
  p_name text,
  p_relationship text,
  p_phone text,
  p_alternate_phone text,
  p_email text,
  p_priority_order integer,
  p_is_primary boolean,
  p_key text
) RETURNS boolean AS $$
BEGIN
  UPDATE public.emergency_contacts
  SET name = COALESCE(p_name, name),
      relationship = COALESCE(p_relationship, relationship),
      phone = CASE WHEN p_phone IS NOT NULL THEN public.encrypt_field(p_phone, p_key) ELSE phone END,
      alternate_phone = CASE WHEN p_alternate_phone IS NOT NULL THEN public.encrypt_field(p_alternate_phone, p_key) ELSE alternate_phone END,
      email = CASE WHEN p_email IS NOT NULL THEN public.encrypt_field(p_email, p_key) ELSE email END,
      priority_order = COALESCE(p_priority_order, priority_order),
      is_primary = COALESCE(p_is_primary, is_primary)
  WHERE id = p_id AND user_id = auth.uid();
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.select_emergency_contacts(p_key text)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  name text,
  relationship text,
  phone text,
  alternate_phone text,
  email text,
  priority_order integer,
  is_primary boolean,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ec.id,
    ec.user_id,
    ec.name,
    ec.relationship,
    public.decrypt_field(ec.phone, p_key) as phone,
    public.decrypt_field(ec.alternate_phone, p_key) as alternate_phone,
    public.decrypt_field(ec.email, p_key) as email,
    ec.priority_order,
    ec.is_primary,
    ec.created_at
  FROM public.emergency_contacts ec
  WHERE ec.user_id = auth.uid()
  ORDER BY ec.priority_order ASC, ec.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trusted Contacts RPCs
CREATE OR REPLACE FUNCTION public.insert_trusted_contact(
  p_name text,
  p_phone text,
  p_email text,
  p_priority_order integer,
  p_key text
) RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.trusted_contacts (
    user_id, name, phone, email, status, priority_order
  ) VALUES (
    auth.uid(),
    p_name,
    public.encrypt_field(p_phone, p_key),
    public.encrypt_field(p_email, p_key),
    'pending',
    COALESCE(p_priority_order, 0)
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_trusted_contact(
  p_id uuid,
  p_name text,
  p_phone text,
  p_email text,
  p_status text,
  p_priority_order integer,
  p_key text
) RETURNS boolean AS $$
BEGIN
  UPDATE public.trusted_contacts
  SET name = COALESCE(p_name, name),
      phone = CASE WHEN p_phone IS NOT NULL THEN public.encrypt_field(p_phone, p_key) ELSE phone END,
      email = CASE WHEN p_email IS NOT NULL THEN public.encrypt_field(p_email, p_key) ELSE email END,
      status = COALESCE(p_status, status),
      priority_order = COALESCE(p_priority_order, priority_order)
  WHERE id = p_id AND user_id = auth.uid();
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.select_trusted_contacts(p_key text)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  name text,
  phone text,
  email text,
  status text,
  priority_order integer,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id,
    tc.user_id,
    tc.name,
    public.decrypt_field(tc.phone, p_key) as phone,
    public.decrypt_field(tc.email, p_key) as email,
    tc.status,
    tc.priority_order,
    tc.created_at
  FROM public.trusted_contacts tc
  WHERE tc.user_id = auth.uid()
  ORDER BY tc.priority_order ASC, tc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


