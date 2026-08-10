import fs from "fs";
import path from "path";
import { fetchAndIngestIndiaCodeAct } from "../src/lib/ingestion/indiacode-fetcher";

// Load .env file
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...valParts] = trimmed.split("=");
      const val = valParts.join("=").replace(/^["']|["']$/g, "").trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  let target = "123456789/2275"; // Default Payment of Wages Act handle
  let forceRefetch = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--handle" || args[i] === "--url") {
      target = args[i + 1] || target;
      i++;
    } else if (args[i] === "--force") {
      forceRefetch = true;
    } else if (!args[i].startsWith("--")) {
      target = args[i];
    }
  }

  console.log(`Starting ingestion for India Code target: "${target}" (force: ${forceRefetch})...`);
  const result = await fetchAndIngestIndiaCodeAct(target, { forceRefetch });

  if (result.success) {
    console.log(`✅ Ingestion succeeded for "${result.act_name}" (Doc ID: ${result.document_id})`);
    if (result.skipped_reingest) {
      console.log(`ℹ️ Document was up-to-date. Ingestion skipped.`);
    } else {
      console.log(`📊 Ingested ${result.sections_ingested} sections & ${result.embeddings_created} embeddings.`);
    }
  } else {
    console.error(`❌ Ingestion failed: ${result.error}`);
    process.exit(1);
  }
}

main();
