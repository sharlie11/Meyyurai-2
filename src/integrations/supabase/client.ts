// src/integrations/supabase/client.ts
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  (typeof process !== "undefined" ? process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL : "") ||
  "https://fynfbbuxafzdqmitetfq.supabase.co";
const supabaseAnonKey =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  (typeof process !== "undefined" ? process.env?.VITE_SUPABASE_PUBLISHABLE_KEY || process.env?.SUPABASE_PUBLISHABLE_KEY : "") ||
  "sb_publishable_k0zGHSGxlVZw6v09hOZUeA_wKSfySTS";

if (!supabaseUrl || !supabaseAnonKey) {
  // Silent fallback to avoid unhandled exceptions when DB offline
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
