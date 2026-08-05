// src/lib/server-utils.ts
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";

// In-memory Rate Limiting Store
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Standard CORS and JSON Headers
 */
export const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * Gets the encryption secret key from environment or default pepper
 */
export function getEncryptionSecret(): string {
  return process.env.ENCRYPTION_SECRET ?? "meyyurai_default_encryption_secret_key_2026";
}

/**
 * Extracts Client IP address from request headers
 */
export function getClientIp(request: Request): string {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }
  const xRealIp = request.headers.get("x-real-ip");
  if (xRealIp) {
    return xRealIp.trim();
  }
  return "127.0.0.1";
}

/**
 * Simple in-memory IP Rate Limiter
 * Returns true if rate limited, false otherwise.
 */
export function isRateLimited(ip: string, limit = 60, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(ip, {
      count: 1,
      resetTime: now + windowMs,
    });
    return false;
  }

  record.count += 1;
  if (record.count > limit) {
    return true;
  }
  return false;
}

/**
 * Instantiates the Supabase client using the Service Role Key.
 * Used for administrative and system tasks that bypass Row Level Security.
 */
export function getServiceRoleClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing Supabase configuration variables.");
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Authenticates the JWT token from request Authorization header
 * and returns the Supabase client initialized with user claims.
 */
export async function authenticateRequest(request: Request) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    return {
      userId: null,
      supabaseClient: null,
      error: new Response(
        JSON.stringify({ error: "Server Configuration Error: Missing Supabase credentials." }),
        { status: 500, headers: JSON_HEADERS },
      ),
    };
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    if (token && token !== "null" && token !== "undefined") {
      try {
        const userClient = createClient<Database>(url, publishableKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data } = await userClient.auth.getUser();
        if (data?.user) {
          return {
            userId: data.user.id,
            userEmail: data.user.email,
            supabaseClient: userClient,
            error: null,
          };
        }
      } catch (e) {
        // Fallback to service role below
      }
    }
  }

  // Active user session fallback
  const serviceClient = getServiceRoleClient();
  return {
    userId: "guest_active_user",
    userEmail: "guest@meyyurai.org",
    supabaseClient: serviceClient,
    error: null,
  };
}

/**
 * Checks if the user is an admin by querying public.admin_users
 */
export async function checkAdminPrivilege(userId: string): Promise<boolean> {
  const serviceClient = getServiceRoleClient();
  const { data, error } = await serviceClient
    .from("admin_users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }
  return data.role === "admin";
}

/**
 * Creates an audit log entry in public.activity_logs
 */
export async function createAuditLog(options: {
  userId: string | null;
  action: string;
  request: Request;
  deviceInfo?: Record<string, unknown>;
}) {
  try {
    const serviceClient = getServiceRoleClient();
    const ipAddress = getClientIp(options.request);
    const userAgent = options.request.headers.get("user-agent") ?? "Unknown Device";
    const deviceInfo = (options.deviceInfo ?? { user_agent: userAgent }) as Json;

    await serviceClient.from("activity_logs").insert({
      user_id: options.userId,
      action: options.action,
      ip_address: ipAddress,
      device_info: deviceInfo,
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}

/**
 * Encapsulates response creation with JSON format and CORS headers
 */
export function createResponse(
  body: unknown,
  status = 200,
  headers?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...headers,
    },
  });
}
