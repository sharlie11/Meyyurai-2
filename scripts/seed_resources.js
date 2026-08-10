const { createClient } = require('@supabase/supabase-js');

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://fynfbbuxafzdqmitetfq.supabase.co";
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_k0zGHSGxlVZw6v09hOZUeA_wKSfySTS";

const supabase = createClient(url, key);

const openSourceResources = [
  {
    name: "National Emergency Response Support System (ERSS 112)",
    category: "police",
    address: "Police Control Room / Command Center, Nationwide Dispatch | Officer: State Police Nodal Officer (MHA ERSS Division)",
    contact_number: "112",
    website: "https://erss.in",
    operating_hours: "24x7 / 365 Days",
  },
  {
    name: "National Legal Services Authority (NALSA 15100)",
    category: "legal",
    address: "District Legal Services Authority (DLSA), District Court Complex | Officer: Secretary & Senior Civil Judge",
    contact_number: "15100",
    website: "https://nalsa.gov.in",
    operating_hours: "24x7 Free Legal Helpline",
  },
  {
    name: "National Women Helpline (NCW 1091)",
    category: "women",
    address: "National Commission for Women, Plot 21 Jasola Institutional Area, New Delhi | Officer: District Social Welfare Officer (DSWO)",
    contact_number: "1091",
    website: "https://ncw.nic.in",
    operating_hours: "24x7 Emergency Assistance",
  },
  {
    name: "Childline India Foundation (1098)",
    category: "child",
    address: "Childline India Command & Control Center | Officer: District Child Protection Officer (DCPO)",
    contact_number: "1098",
    website: "https://childlineindia.org",
    operating_hours: "24x7 Toll-Free Emergency Hotline",
  },
  {
    name: "National Cyber Crime Reporting Helpline (1930)",
    category: "gov",
    address: "Indian Cyber Crime Coordination Centre (I4C), MHA | Officer: Nodal Cyber Crime Inspector",
    contact_number: "1930",
    website: "https://cybercrime.gov.in",
    operating_hours: "24x7 Golden Hour Financial Fraud Helpline",
  },
  {
    name: "Elderline National Helpline for Senior Citizens (14567)",
    category: "mental",
    address: "Ministry of Social Justice & Empowerment | Officer: Revenue Divisional Officer (RDO) / Maintenance Tribunal",
    contact_number: "14567",
    website: "https://socialjustice.gov.in",
    operating_hours: "8:00 AM - 8:00 PM Daily",
  },
  {
    name: "Sneha Suicide Prevention Helpline",
    category: "mental",
    address: "11 Park View, K.M.T. Street, R.A. Puram, Chennai - 600028 | Officer: Counseling Director",
    contact_number: "+91 44 24640050",
    website: "https://snehaindia.org",
    operating_hours: "24x7 Crisis Support",
  },
  {
    name: "Vimochana Forum for Women's Rights NGO",
    category: "ngo",
    address: "139 Infantry Road, Bengaluru, Karnataka - 560001 | Officer: Legal Aid Coordinator",
    contact_number: "+91 80 25492900",
    website: "https://vimochana.org",
    operating_hours: "9:30 AM - 6:00 PM (Mon-Sat)",
  },
  {
    name: "Prajwala Anti-Trafficking NGO",
    category: "ngo",
    address: "12-11-1498/1, Warasiguda, Secunderabad, Telangana - 500061 | Officer: Chief Nodal Officer",
    contact_number: "+91 40 24043000",
    website: "https://prajwalaindia.org",
    operating_hours: "24x7 Rescue & Rehabilitation Response",
  },
  {
    name: "iCALL Mental Health Counseling (TISS)",
    category: "mental",
    address: "Tata Institute of Social Sciences (TISS), V.N. Purav Marg, Deonar, Mumbai | Officer: Senior Counseling Supervisor",
    contact_number: "+91 9152987821",
    website: "https://icallhelpline.org",
    operating_hours: "Mon-Sat: 10:00 AM - 8:00 PM",
  },
  {
    name: "National Consumer Helpline (1915)",
    category: "gov",
    address: "Department of Consumer Affairs, Krishi Bhawan, New Delhi | Officer: Consumer Forum Registrar",
    contact_number: "1915",
    website: "https://consumerhelpline.gov.in",
    operating_hours: "8:00 AM - 8:00 PM Daily",
  },
  {
    name: "Tamil Nadu Chief Minister Helpline (1100)",
    category: "gov",
    address: "TNeGA CM Special Cell, Secretariat, Chennai - 600009 | Officer: Special Officer CM Grievance Cell",
    contact_number: "1100",
    website: "https://cmhelpline.tnega.org",
    operating_hours: "24x7 State Public Grievance Redressal",
  },
];

async function seedData() {
  console.log("Seeding data into resources_directory...");
  for (const item of openSourceResources) {
    const { data: existing } = await supabase
      .from("resources_directory")
      .select("id")
      .eq("name", item.name)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("resources_directory")
        .update(item)
        .eq("id", existing.id);
      if (error) console.log(`Update ${item.name} status:`, error.message);
      else console.log(`✅ Updated ${item.name}`);
    } else {
      const { error } = await supabase
        .from("resources_directory")
        .insert(item);
      if (error) console.log(`Insert ${item.name} status:`, error.message);
      else console.log(`✅ Inserted ${item.name}`);
    }
  }
}

seedData().catch(console.error);
