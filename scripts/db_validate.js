import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runValidation() {
  console.log("=== Database Validation Script ===");
  const issues = [];

  const tables = [
    "profiles",
    "rights",
    "legal_documents",
    "legal_chunks",
    "government_services",
    "conversations",
    "messages",
    "legal_domain_mappings",
  ];

  for (const table of tables) {
    try {
      console.log(`Checking table: ${table}...`);
      const { data, error } = await supabase.from(table).select("*").limit(1);

      if (error) {
        if (error.code === "42P01") {
          issues.push(`Table missing: ${table}`);
        } else if (error.code === "42501") {
          // RLS error is somewhat expected for anon querying protected tables
          console.log(`[!] RLS blocked read on ${table} - expected if no public access.`);
        } else {
          issues.push(`Query error on ${table}: ${error.message} (Code: ${error.code})`);
        }
      } else {
        if (!data || data.length === 0) {
          console.log(`[!] Table ${table} is empty (No seed data or RLS blocking).`);
        } else {
          console.log(`[+] Table ${table} is accessible and has data.`);
        }
      }
    } catch (err) {
      issues.push(`Critical error on ${table}: ${err.message}`);
    }
  }

  if (issues.length > 0) {
    console.error("\n=== Issues Found ===");
    issues.forEach((i) => console.error(i));
  } else {
    console.log("\n=== No schema/query errors found. ===");
  }
}

runValidation().catch(console.error);
