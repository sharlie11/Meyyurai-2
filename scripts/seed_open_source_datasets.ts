import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://fynfbbuxafzdqmitetfq.supabase.co";
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "sb_publishable_k0zGHSGxlVZw6v09hOZUeA_wKSfySTS";

const supabase = createClient(url, key);

export interface SeedResource {
  name: string;
  category: string;
  address: string;
  contact_number: string;
  website: string;
  operating_hours: string;
  source_url: string;
  officer_contact: {
    officer_title: string;
    department: string;
    direct_phone: string;
    email: string;
    office_location: string;
  };
}

export const openSourceResources: SeedResource[] = [
  {
    name: "National Emergency Response Support System (ERSS 112)",
    category: "police",
    address: "Police Control Room / Command Center, Nationwide Dispatch",
    contact_number: "112",
    website: "https://erss.in",
    operating_hours: "24x7 / 365 Days",
    source_url: "https://erss.in",
    officer_contact: {
      officer_title: "State Police Nodal Officer",
      department: "Ministry of Home Affairs ERSS Division",
      direct_phone: "112",
      email: "erss-help@gov.in",
      office_location: "State Police Headquarters",
    },
  },
  {
    name: "National Legal Services Authority (NALSA 15100)",
    category: "legal",
    address: "District Legal Services Authority (DLSA), District Court Complex",
    contact_number: "15100",
    website: "https://nalsa.gov.in",
    operating_hours: "24x7 Free Legal Helpline",
    source_url: "https://nalsa.gov.in",
    officer_contact: {
      officer_title: "Secretary & Senior Civil Judge",
      department: "District Legal Services Authority (DLSA)",
      direct_phone: "15100",
      email: "nalsa-dla@nic.in",
      office_location: "Combined Court Buildings",
    },
  },
  {
    name: "National Women Helpline (NCW 1091)",
    category: "women",
    address: "National Commission for Women, Plot 21 Jasola Institutional Area, New Delhi",
    contact_number: "1091",
    website: "https://ncw.nic.in",
    operating_hours: "24x7 Emergency Assistance",
    source_url: "https://ncw.nic.in",
    officer_contact: {
      officer_title: "District Social Welfare Officer (DSWO)",
      department: "Social Welfare & Women Empowerment Dept",
      direct_phone: "1091",
      email: "ncw@nic.in",
      office_location: "District Collectorate Complex",
    },
  },
  {
    name: "Childline India Foundation (1098)",
    category: "child",
    address: "Childline India Command & Control Center",
    contact_number: "1098",
    website: "https://childlineindia.org",
    operating_hours: "24x7 Toll-Free Emergency Hotline",
    source_url: "https://childlineindia.org",
    officer_contact: {
      officer_title: "District Child Protection Officer (DCPO)",
      department: "District Child Protection Unit (DCPU)",
      direct_phone: "1098",
      email: "dcpu-childrights@gov.in",
      office_location: "Collectorate Annexe",
    },
  },
  {
    name: "National Cyber Crime Reporting Helpline (1930)",
    category: "gov",
    address: "Indian Cyber Crime Coordination Centre (I4C), MHA",
    contact_number: "1930",
    website: "https://cybercrime.gov.in",
    operating_hours: "24x7 Golden Hour Financial Fraud Helpline",
    source_url: "https://cybercrime.gov.in",
    officer_contact: {
      officer_title: "Nodal Cyber Crime Inspector",
      department: "Cyber Crime Police Station",
      direct_phone: "1930",
      email: "cybercrime-report@gov.in",
      office_location: "Commissionerate of Police",
    },
  },
  {
    name: "Elderline National Helpline for Senior Citizens (14567)",
    category: "mental",
    address: "Ministry of Social Justice & Empowerment",
    contact_number: "14567",
    website: "https://socialjustice.gov.in",
    operating_hours: "8:00 AM - 8:00 PM Daily",
    source_url: "https://socialjustice.gov.in",
    officer_contact: {
      officer_title: "Maintenance Tribunal Officer / Revenue Divisional Officer (RDO)",
      department: "Senior Citizens Maintenance & Welfare Tribunal",
      direct_phone: "14567",
      email: "rdo-tribunal@gov.in",
      office_location: "Sub-Divisional Revenue Office",
    },
  },
  {
    name: "Sneha Suicide Prevention Helpline",
    category: "mental",
    address: "11 Park View, K.M.T. Street, R.A. Puram, Chennai - 600028",
    contact_number: "+91 44 24640050",
    website: "https://snehaindia.org",
    operating_hours: "24x7 Crisis Support",
    source_url: "https://snehaindia.org",
    officer_contact: {
      officer_title: "Counseling Director",
      department: "Sneha Crisis Intervention Centre",
      direct_phone: "+91 44 24640050",
      email: "help@snehaindia.org",
      office_location: "Chennai Head Office",
    },
  },
  {
    name: "Vimochana Forum for Women's Rights NGO",
    category: "ngo",
    address: "139 Infantry Road, Bengaluru, Karnataka - 560001",
    contact_number: "+91 80 25492900",
    website: "https://vimochana.org",
    operating_hours: "9:30 AM - 6:00 PM (Mon-Sat)",
    source_url: "https://vimochana.org",
    officer_contact: {
      officer_title: "Legal Aid Cell Coordinator",
      department: "Vimochana Women Crisis Response",
      direct_phone: "+91 80 25492900",
      email: "rights@vimochana.org",
      office_location: "Infantry Road Office, Bengaluru",
    },
  },
  {
    name: "Prajwala Anti-Trafficking NGO",
    category: "ngo",
    address: "12-11-1498/1, Warasiguda, Secunderabad, Telangana - 500061",
    contact_number: "+91 40 24043000",
    website: "https://prajwalaindia.org",
    operating_hours: "24x7 Rescue & Rehabilitation Response",
    source_url: "https://prajwalaindia.org",
    officer_contact: {
      officer_title: "Chief Executive Nodal Officer",
      department: "Prajwala Rescue & Legal Advocacy",
      direct_phone: "+91 40 24043000",
      email: "prajwala@prajwalaindia.org",
      office_location: "Secunderabad Headquarters",
    },
  },
  {
    name: "iCALL Mental Health Counseling (TISS)",
    category: "mental",
    address: "Tata Institute of Social Sciences (TISS), V.N. Purav Marg, Deonar, Mumbai",
    contact_number: "+91 9152987821",
    website: "https://icallhelpline.org",
    operating_hours: "Mon-Sat: 10:00 AM - 8:00 PM",
    source_url: "https://icallhelpline.org",
    officer_contact: {
      officer_title: "Senior Counseling Supervisor",
      department: "TISS Psychosocial Counseling Services",
      direct_phone: "+91 9152987821",
      email: "icall@tiss.edu",
      office_location: "TISS Deonar Campus, Mumbai",
    },
  },
  {
    name: "National Consumer Helpline (1915)",
    category: "gov",
    address: "Department of Consumer Affairs, Krishi Bhawan, New Delhi",
    contact_number: "1915",
    website: "https://consumerhelpline.gov.in",
    operating_hours: "8:00 AM - 8:00 PM Daily",
    source_url: "https://consumerhelpline.gov.in",
    officer_contact: {
      officer_title: "Consumer Forum Registrar",
      department: "District Consumer Disputes Redressal Commission",
      direct_phone: "1915",
      email: "consumer-helpline@nic.in",
      office_location: "District Collectorate / e-Daakhil Portal",
    },
  },
  {
    name: "Tamil Nadu Chief Minister Helpline (1100)",
    category: "gov",
    address: "TNeGA CM Special Cell, Secretariat, Chennai - 600009",
    contact_number: "1100",
    website: "https://cmhelpline.tnega.org",
    operating_hours: "24x7 State Public Grievance Redressal",
    source_url: "https://cmhelpline.tnega.org",
    officer_contact: {
      officer_title: "Special Officer CM Grievance Cell",
      department: "Tamil Nadu e-Governance Agency (TNeGA)",
      direct_phone: "1100",
      email: "cmcell@tn.gov.in",
      office_location: "Fort St. George Secretariat, Chennai",
    },
  },
];

export async function seedOpenSourceData() {
  console.log("Seeding Open-Source Resources & Helplines into Supabase database...");

  for (const item of openSourceResources) {
    // 1. Check existing in resources_directory
    const { data: existingRes } = await supabase
      .from("resources_directory")
      .select("id")
      .eq("name", item.name)
      .maybeSingle();

    const formattedAddress = `${item.address} | Officer: ${item.officer_contact.officer_title} (${item.officer_contact.department})`;

    if (existingRes) {
      await supabase
        .from("resources_directory")
        .update({
          category: item.category,
          address: formattedAddress,
          contact_number: item.contact_number,
          website: item.website,
          operating_hours: item.operating_hours,
        })
        .eq("id", existingRes.id);
      console.log(`✅ Updated resources_directory: ${item.name}`);
    } else {
      const { error: insErr } = await supabase
        .from("resources_directory")
        .insert({
          name: item.name,
          category: item.category,
          address: formattedAddress,
          contact_number: item.contact_number,
          website: item.website,
          operating_hours: item.operating_hours,
        });
      if (insErr) console.error(`❌ Error inserting resources_directory (${item.name}):`, insErr.message);
      else console.log(`✅ Inserted resources_directory: ${item.name}`);
    }

    // 2. Check existing in support_organizations
    const { data: existingSupp } = await supabase
      .from("support_organizations")
      .select("id")
      .eq("name", item.name)
      .maybeSingle();

    const suppPayload = {
      name: item.name,
      category: item.category,
      state: "All India / Tamil Nadu",
      district: "District Headquarters",
      contact: {
        phone: item.contact_number,
        officer_title: item.officer_contact.officer_title,
        department: item.officer_contact.department,
        direct_phone: item.officer_contact.direct_phone,
        email: item.officer_contact.email,
        office_location: item.officer_contact.office_location,
        operating_hours: item.operating_hours,
      },
      website: item.website,
      verified: true,
      description: `Official helpline & crisis response center. ${item.address}`,
      official_source: item.source_url,
    };

    if (existingSupp) {
      await supabase
        .from("support_organizations")
        .update(suppPayload)
        .eq("id", existingSupp.id);
      console.log(`✅ Updated support_organizations: ${item.name}`);
    } else {
      const { error: insSuppErr } = await supabase
        .from("support_organizations")
        .insert(suppPayload);
      if (insSuppErr) console.error(`❌ Error inserting support_organizations (${item.name}):`, insSuppErr.message);
      else console.log(`✅ Inserted support_organizations: ${item.name}`);
    }
  }

  console.log("🎉 Open-source dataset seeding finished successfully!");
}

seedOpenSourceData().catch(console.error);
