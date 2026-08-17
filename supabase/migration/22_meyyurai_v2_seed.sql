aqq  'The primary criminal code of India, replacing the Indian Penal Code (IPC).',
    'India Code',
    'https://www.indiacode.nic.in/handle/123456789/1362',
    'Ministry of Home Affairs',
    'en',
    'active'
  ),
  (
    'l2000000-0000-0000-0000-000000000002',
    'c2000000-0000-0000-0000-000000000002',
    'Protection of Women from Domestic Violence Act, 2005',
    'PWDVA',
    '43',
    2005,
    'An Act to provide for more effective protection of the rights of women guaranteed under the Constitution who are victims of violence of any kind occurring within the family.',
    'India Code',
    'https://www.indiacode.nic.in/handle/123456789/1362',
    'Ministry of Women and Child Development',
    'en',
    'active'
  ),
  (
    'l3000000-0000-0000-0000-000000000003',
    'c4000000-0000-0000-0000-000000000004',
    'Information Technology Act, 2000',
    'IT Act',
    '21',
    2000,
    'The primary law in India dealing with cybercrime and electronic commerce.',
    'India Code',
    'https://www.indiacode.nic.in/handle/123456789/1362',
    'Ministry of Electronics and Information Technology',
    'en',
    'active'
  )
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Law Sections
INSERT INTO public.law_sections (law_id, section_number, heading, content) VALUES
  (
    'l1000000-0000-0000-0000-000000000001',
    '103',
    'Punishment for Murder',
    'Whoever commits murder shall be punished with death or imprisonment for life, and shall also be liable to fine.'
  ),
  (
    'l1000000-0000-0000-0000-000000000001',
    '64',
    'Punishment for Rape',
    'Whoever, except in the cases provided for by sub-section (2), commits rape shall be punished with rigorous imprisonment of either description for a term which shall not be less than ten years, but which may extend to imprisonment for life, and shall also be liable to fine.'
  ),
  (
    'l2000000-0000-0000-0000-000000000002',
    '3',
    'Definition of domestic violence',
    'Any act, omission or commission or conduct of the respondent shall constitute domestic violence in case it harms or injures or endangers the health, safety, life, limb or well-being, whether mental or physical, of the aggrieved person.'
  ),
  (
    'l3000000-0000-0000-0000-000000000003',
    '66',
    'Computer Related Offences',
    'If any person, dishonestly or fraudulently, does any act referred to in section 43, he shall be punishable with imprisonment for a term which may extend to three years or with fine which may extend to five lakh rupees or with both.'
  );

-- 4. Insert Emergency Contacts
INSERT INTO public.emergency_contacts_v2 (state, district, police, women_helpline, ambulance, cybercrime, legal_services) VALUES
  ('Tamil Nadu', 'Chennai', '100', '1091', '108', '1930', '044-25342441'),
  ('Tamil Nadu', 'Coimbatore', '100', '1091', '108', '1930', '0422-2244455'),
  ('Maharashtra', 'Mumbai', '100', '103', '108', '1930', '022-22691395'),
  ('Delhi', 'Central Delhi', '112', '181', '102', '1930', '1516')
ON CONFLICT (state, district) DO NOTHING;
