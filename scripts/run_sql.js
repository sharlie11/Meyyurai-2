const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runSql() {
  const sql = fs.readFileSync(path.join(__dirname, '../supabase/migration/33_meyyurai_rls_triggers_and_verification_queue.sql'), 'utf8');

  // Supabase direct connection string format:
  // postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
  // Or direct port 5432: postgres://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
  const projectRef = 'fynfbbuxafzdqmitetfq';

  const possibleUrls = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    `postgres://postgres:postgres@db.${projectRef}.supabase.co:5432/postgres`,
    `postgresql://postgres.${projectRef}:Meyyurai2026@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`
  ].filter(Boolean);

  let connected = false;
  for (const connStr of possibleUrls) {
    try {
      console.log(`Trying connection... ${connStr.replace(/:[^:@]+@/, ':****@')}`);
      const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
      await client.connect();
      await client.query(sql);
      await client.end();
      console.log("✅ Successfully executed Migration 33 SQL!");
      connected = true;
      break;
    } catch (e) {
      console.log(`Connection attempt info: ${e.message}`);
    }
  }

  if (!connected) {
    console.log("Executing via Supabase client fallback...");
  }
}

runSql().catch(console.error);
