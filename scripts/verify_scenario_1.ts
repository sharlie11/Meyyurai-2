import { config } from "dotenv";
import path from "path";

// Load .env explicitly
config({ path: path.resolve(process.cwd(), ".env") });

import { GeminiProvider } from "../src/lib/ai/providers/gemini";
import type { RetrievalDocument } from "../src/lib/ai/provider";

async function runScenario1() {
  console.log("=== Starting Scenario 1: Employment Dispute ===");
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("FATAL: GEMINI_API_KEY is missing from environment. Cannot run true AI tests.");
    process.exit(1);
  }

  const provider = new GeminiProvider();

  // Turn 1
  const query = "My employer hasn't paid me for 3 months.";
  console.log(`User: ${query}`);

  const caseSummary = {
    domain: "Employment",
    facts: { unpaid_salary_duration: "3 months" },
    missing: ["employer_name", "employment_contract"],
    confidence: "Low",
    retrieval_ready: false,
  };

  console.log("Running investigate...");
  const investigateResult = await provider.investigate(query, []);
  console.log("Investigate Result:", investigateResult);

  if (investigateResult.needs_clarification) {
    console.log("PASS: Investigation correctly identified missing facts and asked follow-up.");
  } else {
    console.error("FAIL: Investigation did not ask for follow-up on incomplete facts.");
    process.exit(1);
  }
}

runScenario1().catch(console.error);
