// Test Resources Directory Verification
import fs from "fs";
import path from "path";

async function testResourcesDirectory() {
  console.log("=== TESTING LEGAL RESOURCES SEARCHABLE DIRECTORY ===");

  const resourcesFilePath = path.join(process.cwd(), "src", "routes", "_authenticated", "resources.tsx");
  const content = fs.readFileSync(resourcesFilePath, "utf8");

  // Verify Categories
  const expectedCategories = [
    "portal",      // Official Complaint Portals
    "authority",   // Statutory Authorities
    "scheme",      // Government Schemes
    "legal",       // Legal Aid & DLSA
    "lawyer",      // Lawyers & Advocates
    "police",      // Police & Emergency
    "women",       // Women Support
    "child",       // Child Protection
    "hospital",    // Healthcare & Hospitals
    "mental",      // Mental Health
    "shelter",     // Shelters & Rehab
    "ngo"          // NGOs
  ];

  for (const cat of expectedCategories) {
    if (content.includes(`id: "${cat}"`)) {
      console.log(`  ✓ Category "${cat}" registered.`);
    } else {
      throw new Error(`Missing expected category: ${cat}`);
    }
  }

  // Verify Key Official Portals and Authorities
  const officialPortals = [
    { name: "National Consumer Helpline (NCH / INGRAM Grievance Portal)", url: "consumerhelpline.gov.in", helpline: "1915" },
    { name: "e-Daakhil Consumer Disputes Redressal Portal", url: "edaakhil.nic.in" },
    { name: "National Cyber Crime Reporting Portal (I4C)", url: "cybercrime.gov.in", helpline: "1930" },
    { name: "CPGRAMS", url: "pgportal.gov.in", helpline: "1800-11-0031" },
    { name: "SHe-Box", url: "shebox.wcd.gov.in" },
    { name: "SAMADHAN Industrial & Labour Dispute Resolution Portal", url: "samadhan.labour.gov.in", helpline: "14489" },
    { name: "National Legal Services Authority (NALSA)", url: "nalsa.gov.in", helpline: "15100" },
    { name: "National Commission for Women (NCW)", url: "ncw.nic.in", helpline: "7827170170" },
    { name: "National Human Rights Commission (NHRC)", url: "nhrc.nic.in", helpline: "14433" },
    { name: "National Commission for Protection of Child Rights (NCPCR / E-BaalNidan)", url: "ebaalnidan.nic.in" },
    { name: "Central Information Commission (CIC)", url: "cic.gov.in" },
    { name: "One Stop Centre (Sakhi Scheme)", url: "wcd.nic.in", helpline: "181" },
    { name: "Tele-Law (Dept of Justice)", url: "tele-law.in", helpline: "15100" },
    { name: "Legal Aid Defense Counsel System (LADCS)", url: "nalsa.gov.in" },
    { name: "Pradhan Mantri Matru Vandana Yojana (PMMVY)", url: "pmmvy.wcd.gov.in" },
    { name: "Ayushman Bharat - PM-JAY", url: "pmjay.gov.in", helpline: "14555" },
    { name: "District Legal Services Authority (DLSA Chennai)", url: "hcmadras.tn.gov.in/slsa" },
    { name: "Tamil Nadu State Legal Services Authority (TNSLSA)", url: "slsa.tn.gov.in" }
  ];

  console.log("\n--- Checking Official URLs and Helplines ---");
  for (const portal of officialPortals) {
    if (!content.includes(portal.url)) {
      throw new Error(`Missing official URL ${portal.url} for ${portal.name}`);
    }
    if (portal.helpline && !content.includes(portal.helpline)) {
      throw new Error(`Missing verified helpline ${portal.helpline} for ${portal.name}`);
    }
    console.log(`  ✓ Verified official portal: ${portal.name} -> ${portal.url} (Helpline: ${portal.helpline || 'N/A'})`);
  }

  console.log("\n=================================================");
  console.log("✓ ALL LEGAL RESOURCES DIRECTORY TESTS PASSED.");
  console.log("=================================================");
}

testResourcesDirectory().catch(console.error);
