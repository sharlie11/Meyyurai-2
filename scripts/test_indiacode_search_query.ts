import { resolveActTitleToHandle, extractLegalSearchTerms } from "../src/lib/ingestion/indiacode-fetcher";

async function run() {
  const noisyQuery = "I am stucked in an employment bound with 50k cash advance";
  console.log(`Input Query: "${noisyQuery}"`);
  console.log(`Extracted Candidates: ${JSON.stringify(extractLegalSearchTerms(noisyQuery))}`);

  console.log("\nResolving handle...");
  const handle = await resolveActTitleToHandle(noisyQuery);
  console.log(`\nFinal Resolved Handle: ${handle}`);
}

run();
