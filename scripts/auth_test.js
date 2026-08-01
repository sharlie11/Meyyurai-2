import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runAuthTests() {
  console.log("=== Auth Validation Script ===");
  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = "Password123!";

  try {
    console.log(`[1] Testing Sign Up for ${testEmail}...`);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: { data: { full_name: "Test User" } },
    });

    if (signUpError) {
      console.error(`Sign Up Failed: ${signUpError.message}`);
    } else {
      console.log(`Sign Up Succeeded. User ID: ${signUpData.user?.id}`);
    }

    console.log(`[2] Testing Sign In...`);
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (signInError) {
      console.error(`Sign In Failed: ${signInError.message}`);
    } else {
      console.log(
        `Sign In Succeeded. Access Token: ${signInData.session?.access_token.substring(0, 10)}...`,
      );

      console.log(`[3] Validating Auth Session...`);
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) console.error(`Session Error: ${sessionError.message}`);
      else console.log(`Session Active: ${!!sessionData.session}`);

      console.log(`[4] Validating Profile Creation...`);
      // check if profile was auto-created via trigger
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", signInData.user.id)
        .single();

      if (profileError) {
        console.error(`Profile fetch failed: ${profileError.message} (Code: ${profileError.code})`);
      } else if (!profile) {
        console.error(`Profile was not auto-created for user ${signInData.user.id}`);
      } else {
        console.log(`Profile created successfully: ${JSON.stringify(profile)}`);
      }

      console.log(`[5] Testing Sign Out...`);
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) console.error(`Sign Out Failed: ${signOutError.message}`);
      else console.log(`Sign Out Succeeded.`);
    }
  } catch (err) {
    console.error(`Critical Auth Error: ${err.message}`);
  }
}

runAuthTests().catch(console.error);
