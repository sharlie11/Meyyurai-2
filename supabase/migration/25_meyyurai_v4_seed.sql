-- 25_meyyurai_v4_seed.sql
-- Mega-Migration Seed Data

-- ==========================================
-- 1. JURISDICTIONS (Valid Hex UUIDs)
-- ==========================================
INSERT INTO public.jurisdictions (id, name, level) VALUES 
  ('11111111-0000-0000-0000-000000000001', 'Union of India', 'central'),
  ('11111111-0000-0000-0000-000000000002', 'Tamil Nadu', 'state'),
  ('11111111-0000-0000-0000-000000000003', 'Maharashtra', 'state')
ON CONFLICT (name) DO NOTHING;

-- ==========================================
-- 2. CATEGORIES
-- ==========================================
INSERT INTO public.categories (id, jurisdiction_id, name) VALUES 
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Criminal Law'),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'Women''s Rights'),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'Information Technology'),
  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 'Consumer Protection')
ON CONFLICT (jurisdiction_id, name) DO NOTHING;

-- ==========================================
-- 3. ACTS
-- ==========================================
INSERT INTO public.acts (id, category_id, act_name, act_number, year, official_source, ministry) VALUES 
  (
    '33333333-0000-0000-0000-000000000001', 
    '22222222-0000-0000-0000-000000000001', 
    'Bharatiya Nyaya Sanhita', 
    '45', 
    2023, 
    'India Code', 
    'Ministry of Home Affairs'
  ),
  (
    '33333333-0000-0000-0000-000000000002', 
    '22222222-0000-0000-0000-000000000003', 
    'Information Technology Act', 
    '21', 
    2000, 
    'India Code', 
    'Ministry of Electronics and Information Technology'
  ),
  (
    '33333333-0000-0000-0000-000000000003', 
    '22222222-0000-0000-0000-000000000002', 
    'Protection of Women from Domestic Violence Act', 
    '43', 
    2005, 
    'India Code', 
    'Ministry of Women and Child Development'
  )
ON CONFLICT (act_number, year, official_source) DO NOTHING;

-- ==========================================
-- 4. CHAPTERS
-- ==========================================
INSERT INTO public.chapters (id, act_id, chapter_number, title) VALUES 
  ('44444444-0000-0000-0000-000000000001', '33333333-0000-0000-0000-000000000001', 'VI', 'Of Offences Affecting the Human Body'),
  ('44444444-0000-0000-0000-000000000002', '33333333-0000-0000-0000-000000000002', 'XI', 'Offences')
ON CONFLICT (act_id, chapter_number) DO NOTHING;

-- ==========================================
-- 5. SECTIONS
-- ==========================================
INSERT INTO public.sections (id, chapter_id, act_id, section_number, heading, content) VALUES 
  (
    '55555555-0000-0000-0000-000000000001', 
    '44444444-0000-0000-0000-000000000001', 
    '33333333-0000-0000-0000-000000000001', 
    '103', 
    'Punishment for Murder', 
    'Whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine.'
  ),
  (
    '55555555-0000-0000-0000-000000000002', 
    '44444444-0000-0000-0000-000000000002', 
    '33333333-0000-0000-0000-000000000002', 
    '66', 
    'Computer Related Offences', 
    'If any person, dishonestly or fraudulently, does any act referred to in section 43, he shall be punishable with imprisonment for a term which may extend to three years or with fine which may extend to five lakh rupees or with both.'
  ),
  (
    '55555555-0000-0000-0000-000000000003', 
    NULL,
    '33333333-0000-0000-0000-000000000003', 
    '3', 
    'Definition of domestic violence', 
    'Any act, omission or commission or conduct of the respondent shall constitute domestic violence in case it harms or injures or endangers the health, safety, life, limb or well-being, whether mental or physical, of the aggrieved person.'
  )
ON CONFLICT (act_id, section_number) DO NOTHING;

-- ==========================================
-- 6. SUBSECTIONS
-- ==========================================
INSERT INTO public.subsections (section_id, subsection_number, content) VALUES 
  ('55555555-0000-0000-0000-000000000001', '(1)', 'Whoever commits murder shall be punished with death or imprisonment for life...'),
  ('55555555-0000-0000-0000-000000000001', '(2)', 'When a group of five or more persons acting in concert commits murder...')
ON CONFLICT (section_id, subsection_number) DO NOTHING;
