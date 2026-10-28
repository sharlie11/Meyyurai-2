import {
  saveLocalUser,
  findLocalUser,
  getLocalUsers,
  evaluatePasswordStrength,
  generateSecureUuid,
  type ActiveUser,
} from "../src/lib/auth-helper";

// Mock localStorage in Node environment if needed
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, val: string) => store.set(key, val),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] || null,
    length: store.size,
  } as Storage;
}

console.log("=== 1. TESTING PASSWORD STRENGTH EVALUATOR ===");
const weak = evaluatePasswordStrength("123");
const strong = evaluatePasswordStrength("Meyyurai@2026_Secure!");
console.log(`Weak: score=${weak.score}, label="${weak.label}"`);
console.log(`Strong: score=${strong.score}, label="${strong.label}"`);
if (weak.score < strong.score) {
  console.log("✓ Password strength evaluation passed.");
} else {
  throw new Error("Password strength assertion failed.");
}

console.log("\n=== 2. TESTING LOCAL REGISTRATION PERSISTENCE ===");
const testUser: ActiveUser = {
  id: generateSecureUuid(),
  email: "college.student@example.com",
  phone: "9876543210",
  user_metadata: {
    full_name: "Priya Sharma",
    phone: "9876543210",
  },
};

const saved = saveLocalUser(testUser, "CollegeStudent@2026");
console.log(`Saved user ID: ${saved.id}`);
console.log(`Saved user Name: ${saved.user_metadata?.full_name}`);
console.log(`Saved user Email: ${saved.email}`);

const foundByEmail = findLocalUser("college.student@example.com", "CollegeStudent@2026");
console.log(`Lookup by Email: ${foundByEmail ? "SUCCESS" : "FAILED"}`);

const foundByPhone = findLocalUser("9876543210", "CollegeStudent@2026");
console.log(`Lookup by Phone: ${foundByPhone ? "SUCCESS" : "FAILED"}`);

const allUsers = getLocalUsers();
console.log(`Total local persisted users: ${allUsers.length}`);

if (foundByEmail && foundByPhone && allUsers.length >= 1) {
  console.log("✓ All registration persistence checks PASSED.");
} else {
  throw new Error("Registration persistence assertions failed.");
}
