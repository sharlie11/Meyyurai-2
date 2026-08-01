// src/integrations/supabase/client.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL or Publishable Key is missing from client environment variables.");
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
