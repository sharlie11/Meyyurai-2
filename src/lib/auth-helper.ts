import { supabase } from "@/integrations/supabase/client";

export type ActiveUser = {
  id: string;
  email: string;
  user_metadata?: { full_name?: string };
};

export async function getCurrentUser(): Promise<ActiveUser | null> {
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      return {
        id: data.user.id,
        email: data.user.email || "",
        user_metadata: { full_name: data.user.user_metadata?.full_name },
      };
    }
  } catch (e) {
    // Ignore error, check local session fallback
  }

  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem("meyyurai_active_user");
    if (stored) {
      try {
        return JSON.parse(stored) as ActiveUser;
      } catch (e) {}
    }
  }
  return null;
}

export function setActiveUser(user: ActiveUser | null) {
  if (typeof localStorage === "undefined") return;
  if (user) {
    localStorage.setItem("meyyurai_active_user", JSON.stringify(user));
  } else {
    localStorage.removeItem("meyyurai_active_user");
  }
}
