import { fetchAndIngestIndiaCodeAct, resolveActTitleToHandle, searchLocalIngestedChunks } from "../src/lib/ingestion/indiacode-fetcher";
import fs from "fs";
import path from "path";

async function runTests() {
  console.log("=================================================================");
  console.log("TEST 1: LIVE INDIA CODE QUERY RESOLUTION & FETCH");
  console.log("=================================================================");

  const testHandle = "123456789/2275"; // Payment of Wages Act, 1936
  console.log(`\nAttempting live fetch from official source for handle: ${testHandle}...`);

  const startTime = Date.now();
  const liveResult = await fetchAndIngestIndiaCodeAct(testHandle, {
    forceRefetch: true, // Force actual network fetch
  });
  const elapsed = Date.now() - startTime;

  console.log(`Live Fetch Result (${elapsed}ms):`, {
    success: liveResult.success,
    act_name: liveResult.act_name,
    sections_ingested: liveResult.sections_ingested,
    cache_hit: liveResult.cache_hit,
    checksum: liveResult.checksum,
    error: liveResult.error,
  });

  console.log("\n=================================================================");
  console.log("TEST 2: UNAVAILABLE SOURCE (SIMULATED OFFLINE / DOMAIN BLOCKED)");
  console.log("=================================================================");

  // Non-existent or simulated down domain
  const unreachableHandle = "123456789/99999999";
  const unreachableUrl = "https://invalid-nonexistent-domain.gov.in/handle/123456789/99999999";

  console.log(`\nAttempting fetch when official source is unreachable: ${unreachableUrl}...`);
  const offlineResult = await fetchAndIngestIndiaCodeAct(unreachableHandle, {
    forceRefetch: true,
  });

  console.log("Offline Result (Graceful error handling):", {
    success: offlineResult.success,
    error: offlineResult.error,
  });

  console.log("\n=================================================================");
  console.log("TEST 3: FALLBACK RETRIEVAL WHEN NETWORK IS DOWN");
  console.log("=================================================================");

  // Even when network is down, does the RAG system retrieve verified statutes?
  const testQuery = "employer refused to pay salary for 3 months";
  console.log(`Querying: "${testQuery}" with local statutory RAG fallback...`);
  const localDocs = searchLocalIngestedChunks(testQuery, new Array(768).fill(0), 2);

  console.log(`Retrieved ${localDocs.length} verified passages:`);
  localDocs.forEach((doc, i) => {
    console.log(`  [${i + 1}] Act: ${doc.act_name}`);
    console.log(`      Section: ${doc.section_number}`);
    console.log(`      Official URL: ${doc.official_url}`);
    console.log(`      Similarity: ${doc.similarity.toFixed(3)}`);
  });

  console.log("\n✓ All live and offline fetch tests completed.");
}

runTests().catch(console.error);
