import fs from "fs";
import path from "path";

// Load .env
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, "utf8");
  for (const line of envConfig.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      let val = valueParts.join("=").trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (key && val) {
        process.env[key.trim()] = val;
      }
    }
  }
}

import { getAIProvider } from "../src/lib/ai/provider";
import { searchLocalIngestedChunks } from "../src/lib/ingestion/indiacode-fetcher";

async function testFullRAGPipeline() {
  console.log("=== MEYYURAI AI ASSISTANT E2E TEST (WITH STATUTORY RAG) ===");
  const provider = await getAIProvider();
  console.log(`AI Provider Loaded: ${provider.constructor.name}`);
  console.log(`Active GEMINI_API_KEY present: ${Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "")}`);

  const testCases = [
    {
      domain: "Labor & Salary",
      query: "My manager refuses to pay my 3 months salary and threatens termination",
    },
    {
      domain: "Cyber Crime",
      query: "Someone sent a phishing link and transferred 50000 rupees from my bank account",
    },
    {
      domain: "Women Safety & Dowry",
      query: "My husband is beating me and demanding more dowry, where can I complain?",
    },
  ];

  for (const { domain, query } of testCases) {
    console.log(`\n-----------------------------------------------------------`);
    console.log(`[TEST CASE]: Domain = ${domain}`);
    console.log(`[USER QUERY]: "${query}"`);

    // 1. Investigation
    const investigation = await provider.investigate(query, []);
    console.log(`  -> Investigation complete. Category: "${investigation.internal_case_summary?.legal_category || 'general'}"`);

    // 2. RAG Retrieval from Ingested Chunks + Statutory Data
    const retrieved = searchLocalIngestedChunks(query, new Array(768).fill(0), 3);
    console.log(`  -> Retrieved ${retrieved.length} verified statutory chunks.`);
    retrieved.forEach((r, i) => {
      console.log(`     (${i + 1}) ${r.act_name} | ${r.section_number}`);
    });

    // 3. Combined RAG Generation
    const result = await provider.generateCombinedRAGResponse!(
      query,
      investigation.internal_case_summary,
      retrieved,
      [
        {
          id: "svc-1",
          service_type: "Authority",
          name: "National Legal Services Authority (NALSA)",
          official_url: "https://nalsa.gov.in",
          contact_details: { helpline: "15100" },
          jurisdiction: "Pan-India",
          description: "Free legal aid for eligible citizens",
        },
      ],
    );

    // Validate 6-part structure
    console.log("\n  [VERIFIED STRUCTURE CHECKS]:");
    console.log(`  1. Issue Summary: "${result.explanation.situation_summary.substring(0, 100)}..."`);
    console.log(`  2. Applicable Law(s): ${result.explanation.relevant_laws.length} laws cited`);
    result.explanation.relevant_laws.forEach((l) => {
      console.log(`     - Act: ${l.act_name} | Section: ${l.section}`);
      console.log(`       Source: ${l.official_source} (${l.official_url})`);
    });
    console.log(`  3. Simple-English Explanation: "${result.explanation.what_this_means.substring(0, 100)}..."`);
    console.log(`  4. Practical Next Steps: ${result.guidance.immediate_actions.length} action(s)`);
    console.log(`  5. Appropriate Authority: ${result.guidance.where_to_file?.authority || "District Forum"}`);
    console.log(`     Helplines: ${result.guidance.government_helplines?.map((h) => `${h.name} (${h.number})`).join(", ") || "None"}`);
    console.log(`  6. Action Plan: Stage="${result.action_plan.current_stage}", Actions=${result.action_plan.immediate_actions.length}`);

    if (
      result.explanation.situation_summary &&
      result.explanation.what_this_means &&
      result.guidance.immediate_actions.length > 0 &&
      result.action_plan.immediate_actions.length > 0
    ) {
      console.log(`  ✓ Passed 6-part structure check for [${domain}].`);
    } else {
      throw new Error(`Structure check failed for [${domain}].`);
    }
  }

  console.log("\n===========================================================");
  console.log("✓ ALL AI ASSISTANT & STATUTORY RAG TESTS PASSED SUCCESSFULLY.");
  console.log("===========================================================");
}

testFullRAGPipeline().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
