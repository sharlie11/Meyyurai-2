import { sendLegalAIQuery } from '../Meyyurai-Mobile/src/lib/ai-provider';

async function testMobileAI() {
  const queries = [
    "I missed my ATM card what can I do now",
    "Company is asking 2 lakhs penalty for bond breach",
    "Manager pressuring me to work 16 hours daily",
    "How do I report an online UPI banking fraud within 2 hours?",
  ];

  console.log("=== Testing Meyyurai Mobile AI Guidance Engine ===");
  for (const q of queries) {
    const res = await sendLegalAIQuery(q, "en");
    console.log(`\nQuery          : "${q}"`);
    console.log(`Text Response  : ${res.text.slice(0, 150)}...`);
    console.log(`Laws Cited     : ${JSON.stringify(res.lawsReferenced)}`);
    console.log(`Actions Steps  : ${res.steps?.length} steps provided`);
    console.log("---------------------------------------------------");
  }
}

testMobileAI().catch(console.error);
