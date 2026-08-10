import { GeminiProvider } from "../src/lib/ai/providers/gemini";

async function testCategorization() {
  const provider = new GeminiProvider();

  const testQueries = [
    "I am stucked in an employment bound with 50k cash advance",
    "Company is asking 2 lakhs penalty for bond breach",
    "Manager pressuring me to work 16 hours daily",
    "Landlord refused deposit refund",
    "Defective mobile phone seller won't replace",
  ];

  console.log("=== Testing Categorization Fixes ===");
  for (const q of testQueries) {
    const result = await provider.investigate(q, []);
    console.log(`Query    : "${q}"`);
    console.log(`Category : ${JSON.stringify(result.domain_tags)}`);
    console.log(`Legal    : ${result.internal_case_summary?.legal_category}`);
    console.log("---");
  }
}

testCategorization().catch(console.error);
