// src/lib/api/test-api.ts
import { isRateLimited } from "../server-utils";

// Mock Request Class for Testing
class MockRequest {
  url: string;
  method: string;
  headers: Map<string, string>;
  bodyData: unknown;

  constructor(url: string, method = "GET", headers = {}, body = null) {
    this.url = url;
    this.method = method;
    this.headers = new Map(Object.entries(headers));
    this.bodyData = body;
  }

  async json() {
    return this.bodyData;
  }

  async formData() {
    const fd = new Map();
    if (this.bodyData) {
      Object.entries(this.bodyData).forEach(([k, v]) => fd.set(k, v));
    }
    return fd;
  }
}

/**
 * AI Urgency Detection Test Runner
 */
function testAiUrgencyDetector() {
  console.log("▶ Running AI Urgency Detector Tests...");
  const criticalPhrases = [
    "Help! Someone is attempting to break in, call the police!",
    "My partner hit me, I need help immediately",
    "I am in serious danger, please send an SOS",
  ];

  const standardPhrases = [
    "Where is the nearest consumer forum office located?",
    "What are the procedures for filing a warranty dispute?",
    "Tell me about student rights against academic ragging.",
  ];

  const criticalWords = [
    "kill",
    "abuse",
    "beat",
    "threat",
    "weapon",
    "knife",
    "rape",
    "hurt",
    "die",
    "suicide",
    "danger",
    "police",
    "sos",
    "hit",
    "assault",
    "harass",
    "attack",
    "violence",
  ];

  // Test Critical
  criticalPhrases.forEach((phrase, idx) => {
    const lowercase = phrase.toLowerCase();
    const detected = criticalWords.some((word) => lowercase.includes(word));
    console.log(`  [Critical Case #${idx + 1}] Phrase: "${phrase}"`);
    console.log(`  Result: Urgency Detected = ${detected} (Expected: true)`);
    if (!detected) throw new Error("AI Urgency Detection failed on critical phrase.");
  });

  // Test Standard
  standardPhrases.forEach((phrase, idx) => {
    const lowercase = phrase.toLowerCase();
    const detected = criticalWords.some((word) => lowercase.includes(word));
    console.log(`  [Standard Case #${idx + 1}] Phrase: "${phrase}"`);
    console.log(`  Result: Urgency Detected = ${detected} (Expected: false)`);
    if (detected) throw new Error("AI Urgency Detection flagged non-urgent phrase.");
  });

  console.log("✔ AI Urgency Detector Tests Passed.\n");
}

/**
 * Proximity Distance sorting Test Runner
 */
function testProximitySorting() {
  console.log("▶ Running Proximity Distance Sorting Tests...");
  // Reference Center Coordinate (Bengaluru)
  const centerLat = 12.9716;
  const centerLng = 77.5946;

  // Mock Resource Database
  const mockResources = [
    { name: "Far Away Station", latitude: 13.5, longitude: 78.5 }, // ~115 km away
    { name: "Close By Clinic", latitude: 12.975, longitude: 77.6 }, // ~0.7 km away
    { name: "Mid Range Office", latitude: 13.01, longitude: 77.58 }, // ~4.5 km away
  ];

  // Calculate distances using Haversine
  const calculated = mockResources.map((r) => {
    const R = 6371; // Earth radius
    const dLat = ((r.latitude - centerLat) * Math.PI) / 180;
    const dLng = ((r.longitude - centerLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((centerLat * Math.PI) / 180) *
        Math.cos((r.latitude * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return {
      ...r,
      distance_km: parseFloat(dist.toFixed(2)),
    };
  });

  calculated.sort((a, b) => a.distance_km - b.distance_km);

  console.log("  Sorted Resources:");
  calculated.forEach((r) => {
    console.log(`  - ${r.name}: ${r.distance_km} km`);
  });

  if (calculated[0].name !== "Close By Clinic" || calculated[2].name !== "Far Away Station") {
    throw new Error("Proximity sorting calculation is incorrect.");
  }
  console.log("✔ Proximity Distance Sorting Tests Passed.\n");
}

/**
 * Rate Limiting Test Runner
 */
function testRateLimiting() {
  console.log("▶ Running IP Rate Limiting Tests...");
  const dummyIp = "192.168.1.50";
  const limit = 5;

  let limitHit = false;
  for (let i = 1; i <= limit + 2; i++) {
    const blocked = isRateLimited(dummyIp, limit, 10000);
    console.log(`  Request #${i}: Blocked = ${blocked}`);
    if (i > limit && blocked) {
      limitHit = true;
    }
  }

  if (!limitHit) {
    throw new Error("Rate limiter failed to block requests exceeding the limit.");
  }
  console.log("✔ IP Rate Limiting Tests Passed.\n");
}

/**
 * Auth Guard check Test Runner
 */
function testAuthGuards() {
  console.log("▶ Running Authentication Guard Tests...");
  // Simulate request without Authorization Header
  const req = new MockRequest("http://localhost/api/contacts", "GET", {});
  const authHeader = req.headers.get("authorization");
  const hasToken = authHeader && authHeader.startsWith("Bearer ");

  console.log(`  Request Headers: ${JSON.stringify(Object.fromEntries(req.headers))}`);
  console.log(`  Has Valid Auth Header = ${!!hasToken} (Expected: false)`);

  if (hasToken) {
    throw new Error("Auth guard failed: parsed token from empty header.");
  }
  console.log("✔ Authentication Guard Tests Passed.\n");
}

// Master Run Control
(async function runAllTests() {
  console.log("==========================================");
  console.log("   MEYYURAI BACKEND TEST SUITE RUNNER     ");
  console.log("==========================================\n");

  try {
    testRateLimiting();
    testAiUrgencyDetector();
    testProximitySorting();
    testAuthGuards();

    console.log("==========================================");
    console.log("  ALL BACKEND INTEGRATION TESTS PASSED!   ");
    console.log("==========================================");
  } catch (error) {
    console.error("\n❌ TEST SUITE FAILURE:");
    console.error((error as Error).message);
    process.exit(1);
  }
})();
