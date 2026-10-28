import { searchLocalIngestedChunks } from "../src/lib/ingestion/indiacode-fetcher";

const testQueries = [
  "employer withholding salary unpaid wages",
  "husband domestic violence harassment dowry",
  "cyber bank fraud otp stolen money",
  "ancestral property partition brother dispute",
  "defective laptop warranty refund consumer court",
];

console.log("=== TESTING RAG LOCAL INGESTED CHUNKS + RIGHTS DATA ===");

for (const q of testQueries) {
  console.log(`\nQuery: "${q}"`);
  const results = searchLocalIngestedChunks(q, new Array(768).fill(0), 2);
  console.log(`Retrieved ${results.length} chunks:`);
  results.forEach((r, idx) => {
    console.log(`  [${idx + 1}] Act: ${r.act_name}`);
    console.log(`      Section: ${r.section_number}`);
    console.log(`      Official URL: ${r.official_url}`);
    console.log(`      Similarity: ${r.similarity.toFixed(3)}`);
  });
}
