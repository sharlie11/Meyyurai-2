import fs from "fs";
import path from "path";
import {
  extractHandleId,
  computeChecksum,
  parseIndiaCodeHtml,
  fetchAndIngestIndiaCodeAct,
  resolveActTitleToHandle,
} from "../src/lib/ingestion/indiacode-fetcher";

async function runTests() {
  console.log("===========================================================");
  console.log("🧪 RUNNING INDIA CODE FETCHER UNIT & INTEGRATION TESTS");
  console.log("===========================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`  ✅ TEST ${total}: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ TEST ${total} FAILED: ${msg}`);
    }
  }

  // Test 1: URL and Handle ID Extraction
  const h1 = extractHandleId("123456789/2275");
  assert(
    h1.handleId === "123456789/2275" &&
      h1.officialUrl === "https://www.indiacode.nic.in/handle/123456789/2275",
    "Extract handle from '123456789/2275'",
  );

  const h2 = extractHandleId("https://www.indiacode.nic.in/handle/123456789/2275");
  assert(
    h2.handleId === "123456789/2275" &&
      h2.officialUrl === "https://www.indiacode.nic.in/handle/123456789/2275",
    "Extract handle from full URL",
  );

  // Test 2: SHA-256 Checksum Consistency
  const hash1 = computeChecksum("Sample Legal Text Content");
  const hash2 = computeChecksum("Sample Legal Text Content");
  const hash3 = computeChecksum("Different Content");
  assert(hash1 === hash2 && hash1 !== hash3 && hash1.length === 64, "SHA-256 checksum consistency");

  // Test 3: Handle Resolution Test
  const resolvedExplicit = await resolveActTitleToHandle("Refer to handle 123456789/2275");
  assert(resolvedExplicit === "123456789/2275", "Explicit handle resolution from query text");

  // Test 4: HTML Parser on Cached HTML
  const cachePath = path.join(process.cwd(), "scripts", "cache", "raw", "123456789_2275.html");
  if (fs.existsSync(cachePath)) {
    const rawHtml = fs.readFileSync(cachePath, "utf8");
    const parsed = parseIndiaCodeHtml(
      rawHtml,
      "123456789/2275",
      "https://www.indiacode.nic.in/handle/123456789/2275",
    );

    assert(Boolean(parsed.act_name), `Parsed Act Title: "${parsed.act_name}"`);
    assert(parsed.enactment_year > 1800, `Parsed Enactment Year: ${parsed.enactment_year}`);
    assert(parsed.sections.length > 0, `Extracted ${parsed.sections.length} sections cleanly`);
    assert(Boolean(parsed.checksum), `Generated content SHA-256: ${parsed.checksum.slice(0, 12)}...`);
  } else {
    console.log("  ℹ️ Cache file not present yet, skipping HTML parser assertion.");
  }

  // Test 4: Rate Limiting & Local Caching Verification
  const cacheDir = path.join(process.cwd(), "scripts", "cache", "raw");
  const metaFile = path.join(cacheDir, "123456789_2275.meta.json");
  if (fs.existsSync(metaFile)) {
    const meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
    const ageHours = (Date.now() - meta.fetched_at) / (1000 * 60 * 60);
    assert(ageHours < 24, `Cache rate limit check: Raw HTML cached ${ageHours.toFixed(2)}h ago (<24h TTL)`);
  }

  console.log("\n===========================================================");
  console.log(`📊 TEST SUMMARY: ${passed}/${total} assertions passed.`);
  console.log("===========================================================\n");
}

runTests().catch(console.error);
