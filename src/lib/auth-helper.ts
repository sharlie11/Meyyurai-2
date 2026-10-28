import { supabase } from "@/integrations/supabase/client";

export type ActiveUser = {
  id: string;
  email: string;
  phone?: string;
  user_metadata?: { full_name?: string; phone?: string; avatar_url?: string };
};

export type SavedLocalUser = ActiveUser & {
  password?: string;
  phone?: string;
  createdAt: string;
};

export interface OtpRecord {
  phone: string;
  code: string;
  expiresAt: number;
}

export interface PasswordStrength {
  score: number; // 0 to 4
  label: "Too Weak" | "Weak" | "Fair" | "Good" | "Strong";
  color: string;
  checks: {
    minLength: boolean;
    hasUpper: boolean;
    hasLower: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

/**
 * Generates an RFC4122 v4 UUID compliant with PostgreSQL UUID schema
 */
export function generateSecureUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Calculates password strength based on entropy, length, and character diversity
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  const minLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  const checks = { minLength, hasUpper, hasLower, hasNumber, hasSpecial };
  const passedCount = Object.values(checks).filter(Boolean).length;

  if (password.length === 0) {
    return { score: 0, label: "Too Weak", color: "bg-muted", checks };
  }
  if (password.length < 6 || passedCount <= 1) {
    return { score: 1, label: "Weak", color: "bg-destructive", checks };
  }
  if (password.length < 8 || passedCount <= 2) {
    return { score: 2, label: "Fair", color: "bg-amber-500", checks };
  }
  if (passedCount <= 4) {
    return { score: 3, label: "Good", color: "bg-blue-500", checks };
  }
  return { score: 4, label: "Strong", color: "bg-emerald-500", checks };
}

export async function getCurrentUser(): Promise<ActiveUser | null> {
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user) {
      return {
        id: data.user.id,
        email: data.user.email || "",
        phone: (data.user.user_metadata?.phone as string) || (data.user.phone as string) || undefined,
        user_metadata: {
          full_name: data.user.user_metadata?.full_name,
          phone: (data.user.user_metadata?.phone as string) || undefined,
        },
      };
    }
  } catch (e) {
    // Ignore Supabase connection error and use local session fallback
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

export async function signOutUser(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    // Silent catch
  }
  setActiveUser(null);
}

export function getLocalUsers(): SavedLocalUser[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const stored = localStorage.getItem("meyyurai_local_users");
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

export function saveLocalUser(user: ActiveUser, password?: string): SavedLocalUser {
  const users = getLocalUsers();
  const cleanEmail = (user.email || "").trim().toLowerCase();
  const cleanPhone = (user.phone || user.user_metadata?.phone || "").replace(/[^0-9]/g, "");

  const existingIdx = users.findIndex((u) => {
    const uEmail = (u.email || "").trim().toLowerCase();
    const uPhone = (u.phone || u.user_metadata?.phone || "").replace(/[^0-9]/g, "");
    if (cleanEmail && uEmail === cleanEmail) return true;
    if (cleanPhone && uPhone && cleanPhone.length >= 10 && uPhone.length >= 10) {
      return uPhone.endsWith(cleanPhone) || cleanPhone.endsWith(uPhone);
    }
    return false;
  });

  const newUser: SavedLocalUser = {
    ...user,
    id: user.id || generateSecureUuid(),
    phone: cleanPhone || user.phone,
    password: password || "",
    createdAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    users[existingIdx] = {
      ...users[existingIdx],
      ...newUser,
      password: password || users[existingIdx].password || "",
    };
  } else {
    users.push(newUser);
  }

  if (typeof localStorage !== "undefined") {
    localStorage.setItem("meyyurai_local_users", JSON.stringify(users));
  }
  return newUser;
}

export function findLocalUser(identifier: string, password?: string): SavedLocalUser | null {
  const users = getLocalUsers();
  const clean = identifier.trim().toLowerCase();
  const cleanDigits = identifier.replace(/[^0-9]/g, "");

  const found = users.find((u) => {
    const uEmail = (u.email || "").toLowerCase().trim();
    const uPhone = (u.phone || u.user_metadata?.phone || "").replace(/[^0-9]/g, "");
    if (clean && uEmail === clean) return true;
    if (cleanDigits.length >= 10 && uPhone.length >= 10) {
      if (uPhone.endsWith(cleanDigits) || cleanDigits.endsWith(uPhone)) {
        return true;
      }
    }
    return false;
  });

  if (!found) return null;
  if (password && found.password && found.password !== password.trim()) {
    return null;
  }
  return found;
}

export function checkUserExists(identifier: string): boolean {
  const users = getLocalUsers();
  const clean = identifier.trim().toLowerCase();
  const cleanDigits = identifier.replace(/[^0-9]/g, "");

  return users.some((u) => {
    const uEmail = (u.email || "").toLowerCase().trim();
    const uPhone = (u.phone || u.user_metadata?.phone || "").replace(/[^0-9]/g, "");
    if (clean && uEmail === clean) return true;
    if (cleanDigits.length >= 10 && uPhone.length >= 10) {
      if (uPhone.endsWith(cleanDigits) || cleanDigits.endsWith(uPhone)) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Ensures user profile exists in Supabase DB
 */
export async function syncUserProfile(user: ActiveUser): Promise<void> {
  if (!user.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id)) {
    return;
  }
  try {
    const fullName = user.user_metadata?.full_name || (user.email ? user.email.split("@")[0] : "Citizen User");
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from("profiles").insert({
        id: user.id,
        full_name: fullName,
        preferred_language: "English",
        onboarded: true,
      });
    }
  } catch (err) {
    // Non-blocking sync
  }
}

/**
 * Generates and stores a 6-digit OTP code for a given mobile number (valid 10 mins).
 */
export function generateAndSaveOtp(phone: string): string {
  const clean = phone.replace(/[^0-9]/g, "");
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  if (typeof localStorage !== "undefined") {
    const record: OtpRecord = { phone: clean, code, expiresAt };
    localStorage.setItem(`meyyurai_otp_${clean}`, JSON.stringify(record));
  }
  return code;
}

/**
 * Returns currently active OTP if still valid.
 */
export function getPendingOtp(phone: string): string | null {
  const clean = phone.replace(/[^0-9]/g, "");
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(`meyyurai_otp_${clean}`);
  if (!raw) return null;
  try {
    const record: OtpRecord = JSON.parse(raw);
    if (Date.now() > record.expiresAt) return null;
    return record.code;
  } catch {
    return null;
  }
}

/**
 * Verifies the OTP entered by user against stored session.
 */
export function verifyOtp(phone: string, inputCode: string): { valid: boolean; reason?: string } {
  const clean = phone.replace(/[^0-9]/g, "");
  if (typeof localStorage === "undefined") {
    return { valid: false, reason: "Storage not available" };
  }

  const raw = localStorage.getItem(`meyyurai_otp_${clean}`);
  if (!raw) {
    return { valid: false, reason: "No verification code was requested for this phone number." };
  }

  try {
    const record: OtpRecord = JSON.parse(raw);
    if (Date.now() > record.expiresAt) {
      return { valid: false, reason: "Verification code has expired. Please request a new code." };
    }
    if (record.code !== inputCode.trim()) {
      return { valid: false, reason: "Invalid verification code. Please check and try again." };
    }
    // Success: consume OTP
    localStorage.removeItem(`meyyurai_otp_${clean}`);
    return { valid: true };
  } catch {
    return { valid: false, reason: "Error parsing verification record." };
  }
}
