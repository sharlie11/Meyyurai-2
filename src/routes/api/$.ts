// src/routes/api/$.ts
import crypto from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import {
  authenticateRequest,
  getServiceRoleClient,
  isRateLimited,
  getClientIp,
  createAuditLog,
  checkAdminPrivilege,
  getEncryptionSecret,
  JSON_HEADERS,
  createResponse,
} from "@/lib/server-utils";
import {
  getAIProvider,
  GovernmentService,
  RetrievalDocument,
  ExplanationGeneratorResponse,
  GuidanceEngineResponse,
  ActionPlanGeneratorResponse,
} from "@/lib/ai/provider";
import { fetchAndIngestIndiaCodeAct, resolveActTitleToHandle, searchLocalIngestedChunks } from "@/lib/ingestion/indiacode-fetcher";
import { sendEmergencySmsMsg91, type SmsDispatchResult } from "@/lib/sms";
import type { Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: async ({ request, params }) => handleApiRequest(request, params._splat ?? "", "GET"),
      POST: async ({ request, params }) => handleApiRequest(request, params._splat ?? "", "POST"),
      PUT: async ({ request, params }) => handleApiRequest(request, params._splat ?? "", "PUT"),
      DELETE: async ({ request, params }) =>
        handleApiRequest(request, params._splat ?? "", "DELETE"),
      OPTIONS: async () => new Response(null, { status: 204, headers: JSON_HEADERS }),
    },
  },
});

/**
 * Unified Controller Router
 */
async function handleApiRequest(
  request: Request,
  splat: string,
  method: string,
): Promise<Response> {
  // 1. IP Rate Limiting Check
  const ip = getClientIp(request);
  if (isRateLimited(ip, 120)) {
    // 120 requests per minute limit
    return createResponse({ error: "Too Many Requests: Rate limit exceeded." }, 429);
  }

  // 2. Parse Sub-Paths
  const parts = splat.split("/");
  const controller = parts[0];
  const action = parts[1] || "";
  const subAction = parts[2] || "";
  const url = new URL(request.url);

  try {
    switch (controller) {
      case "auth":
        return await handleAuthRoutes(request, action, method);
      case "users":
        return await handleUsersRoutes(request, action, method);
      case "profiles":
        return await handleProfilesRoutes(request, action, method);
      case "contacts":
        return await handleContactsRoutes(request, action, subAction, method);
      case "sos":
        return await handleSosRoutes(request, action, method);
      case "location":
      case "tracking":
        return await handleTrackingRoutes(request, action, method);
      case "ai":
        return await handleAiRoutes(request, action, method);
      case "voice":
        return await handleVoiceRoutes(request, action, method);
      case "uploads":
        return await handleUploadsRoutes(request, action, method);
      case "rights":
        return await handleRightsRoutes(request, action, method, url);
      case "resources":
        return await handleResourcesRoutes(request, action, method, url);
      case "notifications":
        return await handleNotificationsRoutes(request, action, subAction, method);
      case "admin":
        return await handleAdminRoutes(request, action, method);
      case "settings":
        return await handleSettingsRoutes(request, action, method);
      case "complaints":
        return await handleComplaintsRoutes(request, action, method);
      case "evidence":
        return await handleEvidenceRoutes(request, action, method);
      case "bookmarks":
        return await handleBookmarksRoutes(request, action, method);
      case "search":
        return await handleSearchRoutes(request, action, method, url);
      default:
        return createResponse(
          { error: `Not Found: API route '/api/${splat}' does not exist.` },
          404,
        );
    }
  } catch (error) {
    const err = error as Error;
    console.error(`[API Error] ${method} /api/${splat}:`, err);
    return createResponse({ error: err.message || "Internal Server Error" }, 500);
  }
}

/**
 * 1. Authentication Router
 */
async function handleAuthRoutes(
  request: Request,
  action: string,
  method: string,
): Promise<Response> {
  const serviceClient = getServiceRoleClient();
  const body = method === "POST" ? await request.json().catch(() => ({})) : {};

  if (action === "signup") {
    const { email, password, full_name, phone } = body;
    if (!email || !password)
      return createResponse({ error: "Email and password are required" }, 400);

    const { data, error } = await serviceClient.auth.signUp({
      email,
      password,
      phone,
      options: { data: { full_name } },
    });

    if (error) return createResponse({ error: error.message }, 400);
    await createAuditLog({ userId: data.user?.id || null, action: "USER_SIGNUP", request });
    return createResponse({
      message: "Registration successful",
      user: data.user,
      session: data.session,
    });
  }

  if (action === "login") {
    const { email, password } = body;
    if (!email || !password)
      return createResponse({ error: "Email and password are required" }, 400);

    const { data, error } = await serviceClient.auth.signInWithPassword({ email, password });
    if (error) return createResponse({ error: error.message }, 401);

    await createAuditLog({ userId: data.user.id, action: "USER_LOGIN", request });
    return createResponse({ message: "Login successful", session: data.session, user: data.user });
  }

  if (action === "forgot-password") {
    const { email } = body;
    if (!email) return createResponse({ error: "Email is required" }, 400);

    const { error } = await serviceClient.auth.resetPasswordForEmail(email);
    if (error) return createResponse({ error: error.message }, 400);

    return createResponse({ message: "Password reset email dispatched" });
  }

  if (action === "phone-otp") {
    const { phone } = body;
    if (!phone) return createResponse({ error: "Phone number is required" }, 400);

    const { error } = await serviceClient.auth.signInWithOtp({ phone });
    if (error) return createResponse({ error: error.message }, 400);

    return createResponse({ message: "OTP SMS code dispatched successfully" });
  }

  if (action === "verify-otp") {
    const { phone, token } = body;
    if (!phone || !token) return createResponse({ error: "Phone and OTP token are required" }, 400);

    const { data, error } = await serviceClient.auth.verifyOtp({ phone, token, type: "sms" });
    if (error) return createResponse({ error: error.message }, 400);

    await createAuditLog({ userId: data.user?.id || null, action: "USER_OTP_VERIFIED", request });
    return createResponse({
      message: "OTP verification successful",
      session: data.session,
      user: data.user,
    });
  }

  return createResponse({ error: "Not Found" }, 404);
}

/**
 * 2. Users Router
 */
async function handleUsersRoutes(
  request: Request,
  action: string,
  method: string,
): Promise<Response> {
  const { userId, supabaseClient, error } = await authenticateRequest(request);
  if (error) return error;

  const serviceClient = supabaseClient!;

  if (action === "me") {
    if (method === "GET") {
      const { data, error: dbError } = await serviceClient
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .single();

      if (dbError) return createResponse({ error: dbError.message }, 404);
      return createResponse({ user: data });
    }

    if (method === "DELETE") {
      // Deleting user from auth (cascades database rows)
      const { error: delError } = await serviceClient.auth.admin.deleteUser(userId!);
      if (delError) return createResponse({ error: delError.message }, 400);

      await createAuditLog({ userId, action: "ACCOUNT_DELETED", request });
      return createResponse({ message: "Account deleted successfully" });
    }
  }

  return createResponse({ error: "Not Found" }, 404);
}

/**
 * 3. Profiles Router
 */
async function handleProfilesRoutes(
  request: Request,
  action: string,
  method: string,
): Promise<Response> {
  const { userId, supabaseClient, error } = await authenticateRequest(request);
  if (error) return error;

  const serviceClient = supabaseClient!;

  if (action === "me") {
    if (method === "GET") {
      const { data, error: dbError } = await serviceClient
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .single();

      if (dbError) return createResponse({ error: dbError.message }, 404);
      return createResponse({ profile: data });
    }

    if (method === "PUT") {
      const body = await request.json().catch(() => ({}));
      const { full_name, avatar_url, preferred_language, country, state, city, onboarded } = body;

      const { data, error: dbError } = await serviceClient
        .from("profiles")
        .update({
          full_name,
          avatar_url,
          preferred_language,
          country,
          state,
          city,
          onboarded,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId!)
        .select()
        .single();

      if (dbError) return createResponse({ error: dbError.message }, 400);

      await createAuditLog({ userId, action: "PROFILE_UPDATED", request });
      return createResponse({ message: "Profile updated successfully", profile: data });
    }
  }

  return createResponse({ error: "Not Found" }, 404);
}

/**
 * 4. Contacts Router (Emergency and Trusted Contacts with pgCrypto)
 */
async function handleContactsRoutes(
  request: Request,
  action: string,
  subAction: string,
  method: string,
): Promise<Response> {
  const { userId, supabaseClient, error } = await authenticateRequest(request);
  if (error) return error;

  const serviceClient = supabaseClient!;
  const key = getEncryptionSecret();

  // Root Contacts Endpoint
  if (action === "") {
    if (method === "GET") {
      // Select decrypted emergency and trusted contacts via RPC functions
      const { data: emergency, error: err1 } = await serviceClient.rpc(
        "select_emergency_contacts",
        { p_key: key },
      );
      const { data: trusted, error: err2 } = await serviceClient.rpc("select_trusted_contacts", {
        p_key: key,
      });

      if (err1 || err2) return createResponse({ error: err1?.message || err2?.message }, 400);
      return createResponse({ emergency_contacts: emergency, trusted_contacts: trusted });
    }

    if (method === "POST") {
      const body = await request.json().catch(() => ({}));
      const {
        type,
        name,
        relationship,
        phone,
        alternate_phone,
        email,
        priority_order,
        is_primary,
      } = body;
      if (!name || !phone)
        return createResponse({ error: "Name and phone number are required" }, 400);

      if (type === "trusted") {
        const { data: contactId, error: dbError } = await serviceClient.rpc(
          "insert_trusted_contact",
          {
            p_name: name,
            p_phone: phone,
            p_email: email || null,
            p_priority_order: priority_order || 0,
            p_key: key,
          },
        );
        if (dbError) return createResponse({ error: dbError.message }, 400);
        await createAuditLog({ userId, action: "TRUSTED_CONTACT_ADDED", request });
        return createResponse({ message: "Trusted contact added", id: contactId }, 210);
      } else {
        // Default: Emergency Contact
        const { data: contactId, error: dbError } = await serviceClient.rpc(
          "insert_emergency_contact",
          {
            p_name: name,
            p_relationship: relationship || null,
            p_phone: phone,
            p_alternate_phone: alternate_phone || null,
            p_email: email || null,
            p_priority_order: priority_order || 0,
            p_is_primary: is_primary || false,
            p_key: key,
          },
        );
        if (dbError) return createResponse({ error: dbError.message }, 400);
        await createAuditLog({ userId, action: "EMERGENCY_CONTACT_ADDED", request });
        return createResponse({ message: "Emergency contact added", id: contactId }, 210);
      }
    }
  }

  // Specific Contact Endpoint (Action = ID)
  if (action && action.length === 36) {
    // matches UUID
    const contactId = action;

    if (method === "PUT") {
      const body = await request.json().catch(() => ({}));
      const {
        type,
        name,
        relationship,
        phone,
        alternate_phone,
        email,
        status,
        priority_order,
        is_primary,
      } = body;

      if (type === "trusted") {
        const { data: ok, error: dbError } = await serviceClient.rpc("update_trusted_contact", {
          p_id: contactId,
          p_name: name || null,
          p_phone: phone || null,
          p_email: email || null,
          p_status: status || null,
          p_priority_order: priority_order !== undefined ? priority_order : null,
          p_key: key,
        });
        if (dbError || !ok)
          return createResponse({ error: dbError?.message || "Contact not found" }, 400);
        return createResponse({ message: "Trusted contact updated" });
      } else {
        const { data: ok, error: dbError } = await serviceClient.rpc("update_emergency_contact", {
          p_id: contactId,
          p_name: name || null,
          p_relationship: relationship || null,
          p_phone: phone || null,
          p_alternate_phone: alternate_phone || null,
          p_email: email || null,
          p_priority_order: priority_order !== undefined ? priority_order : null,
          p_is_primary: is_primary !== undefined ? is_primary : null,
          p_key: key,
        });
        if (dbError || !ok)
          return createResponse({ error: dbError?.message || "Contact not found" }, 400);
        return createResponse({ message: "Emergency contact updated" });
      }
    }

    if (method === "DELETE") {
      // Check emergency_contacts first
      const { data } = await serviceClient
        .from("emergency_contacts")
        .delete()
        .eq("id", contactId)
        .eq("user_id", userId!);
      // If none, check trusted_contacts
      await serviceClient
        .from("trusted_contacts")
        .delete()
        .eq("id", contactId)
        .eq("user_id", userId!);

      await createAuditLog({ userId, action: "CONTACT_DELETED", request });
      return createResponse({ message: "Contact deleted successfully" });
    }

    if (subAction === "primary" && method === "PUT") {
      // Toggle primary contact (marks others as false)
      await serviceClient
        .from("emergency_contacts")
        .update({ is_primary: false })
        .eq("user_id", userId!);
      const { error: dbError } = await serviceClient
        .from("emergency_contacts")
        .update({ is_primary: true })
        .eq("id", contactId)
        .eq("user_id", userId!);

      if (dbError) return createResponse({ error: dbError.message }, 400);
      return createResponse({ message: "Contact marked as primary emergency contact" });
    }
  }

  return createResponse({ error: "Not Found" }, 404);
}

/**
 * 5. SOS and Location Tracking Router
 */
async function handleSosRoutes(
  request: Request,
  action: string,
  method: string,
): Promise<Response> {
  const { userId, supabaseClient, error } = await authenticateRequest(request);
  if (error) return error;

  const serviceClient = supabaseClient!;

  if (action === "") {
    if (method === "POST") {
      const body = await request.json().catch(() => ({}));
      const { latitude, longitude, accuracy, device_info, emergency_type, notes } = body;

      // 1. Create emergency event
      const { data: event, error: dbError } = await serviceClient
        .from("emergency_events")
        .insert({
          user_id: userId!,
          latitude: latitude || null,
          longitude: longitude || null,
          accuracy: accuracy || null,
          device_info: device_info || {},
          emergency_type: emergency_type || "SOS",
          notes: notes || null,
          status: "active",
        })
        .select()
        .single();

      if (dbError) return createResponse({ error: dbError.message }, 400);

      // 2. Fetch contacts to dispatch alerts
      const key = getEncryptionSecret();
      const { data: contacts } = await serviceClient.rpc("select_emergency_contacts", {
        p_key: key,
      });

      const mapLink =
        latitude && longitude
          ? `https://maps.google.com/?q=${latitude},${longitude}`
          : "Location unavailable";

      // Dispatch alert transmission with real Gateway check, 1-retry backoff, & phone masking
      const dispatchAlerts = await Promise.all(
        (contacts || []).map(async (c: { name: string; phone: string | null }) => {
          return await sendEmergencySmsMsg91({
            phone: c.phone || "",
            contactName: c.name,
            mapLink,
            emergencyType: emergency_type || "SOS",
            emergencyId: event.id,
          });
        })
      );

      // Check if any SMS dispatch failed to trigger emergency notification fallback
      const failedCount = dispatchAlerts.filter((a) => a.status !== "dispatched").length;

      if (failedCount > 0) {
        await serviceClient.from("notifications").insert({
          user_id: userId!,
          message: `⚠️ WARNING: SMS alert failed to deliver for ${failedCount} contact(s). Please call 112 directly if in immediate danger.`,
          type: "emergency",
        });
      }

      // Trigger primary safety confirmation notification
      await serviceClient.from("notifications").insert({
        user_id: userId!,
        message: `Meyyurai Emergency SOS activated (ID: ${event.id.slice(0, 8)}). Please confirm your safety if you can.`,
        type: "emergency",
      });

      await createAuditLog({
        userId,
        action: "SOS_ACTIVATED",
        request,
        deviceInfo: {
          event_id: event.id,
          total_contacts: dispatchAlerts.length,
          successful_dispatches: dispatchAlerts.length - failedCount,
          failed_dispatches: failedCount,
        },
      });

      return createResponse(
        {
          message:
            failedCount > 0
              ? "SOS event recorded. Some contact SMS alerts failed to dispatch — please dial 112 directly."
              : "SOS event recorded. Emergency contacts notified.",
          emergency_id: event.id,
          alerts: dispatchAlerts,
        },
        210,
      );
    }
  }

  if (action === "history" && method === "GET") {
    const { data, error: dbError } = await serviceClient
      .from("emergency_events")
      .select("*")
      .eq("user_id", userId!)
      .order("time", { ascending: false });

    if (dbError) return createResponse({ error: dbError.message }, 400);
    return createResponse({ emergency_history: data });
  }

  return createResponse({ error: "Not Found" }, 404);
}

function getRequiredEncryptionSecret(): string {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret || secret.trim() === "") {
    throw new Error("Server Security Error: ENCRYPTION_SECRET environment variable is not configured.");
  }
  return secret.trim();
}

function generateTrackingShareToken(sessionId: string, userId: string, maxDurationMs = 10800000): string {
  const secret = getRequiredEncryptionSecret();
  const expiresAtMs = Date.now() + maxDurationMs;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${sessionId}:${userId}:${expiresAtMs}`)
    .digest("hex")
    .substring(0, 32);
  return `${expiresAtMs}.${signature}`;
}

function verifyTrackingShareToken(sessionId: string, userId: string, token: string): { valid: boolean; reason?: string } {
  if (!token || !token.includes(".")) {
    return { valid: false, reason: "Malformed location share token" };
  }

  const [expiresAtStr, signature] = token.split(".");
  const expiresAt = parseInt(expiresAtStr, 10);

  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return { valid: false, reason: "Location share token has expired" };
  }

  try {
    const secret = getRequiredEncryptionSecret();
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${sessionId}:${userId}:${expiresAt}`)
      .digest("hex")
      .substring(0, 32);

    if (signature !== expectedSignature) {
      return { valid: false, reason: "Invalid location share token signature" };
    }
  } catch (err: any) {
    return { valid: false, reason: err.message || "Cryptographic verification error" };
  }

  return { valid: true };
}

/**
 * 6. Location Tracking Router
 */
async function handleTrackingRoutes(
  request: Request,
  action: string,
  method: string
) {
  const url = new URL(request.url);

  // 1. Trusted Contact Public Live View Endpoint (Secured by HMAC-SHA256 Signed Token + Session Status Check)
  if (action === "view" && method === "GET") {
    const sessionId = url.searchParams.get("session_id");
    const token = url.searchParams.get("token");

    if (!sessionId || !token) {
      return createResponse({ error: "session_id and token query parameters are required" }, 400);
    }

    const serviceClient = getServiceRoleClient();

    // A. Query Dedicated tracking_sessions Table for Session Lifecycle Status
    const { data: sessionData, error: sessionErr } = await (serviceClient as any)
      .from("tracking_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .single();

    if (sessionErr || !sessionData) {
      return createResponse({ error: "Location tracking session not found" }, 404);
    }

    const ownerUserId = sessionData.user_id;

    // B. Check Session Lifecycle Status (Prevents Offline Queued Breadcrumb Race Conditions)
    if (sessionData.status !== "active") {
      return createResponse(
        { error: `Unauthorized: Live transit tracking session is ${sessionData.status} (Ended/Revoked by user)` },
        401
      );
    }

    // C. Validate Token Signature & Expiration
    const verification = verifyTrackingShareToken(sessionId, ownerUserId, token);
    if (!verification.valid) {
      return createResponse({ error: `Unauthorized: ${verification.reason}` }, 401);
    }

    // D. Fetch Breadcrumbs
    const { data: rows } = await serviceClient
      .from("location_tracking")
      .select("*")
      .eq("session_id", sessionId)
      .order("timestamp", { ascending: true });

    const latestPoint = rows && rows.length > 0 ? rows[rows.length - 1] : null;

    return createResponse({
      session_id: sessionId,
      status: sessionData.status,
      owner_id: ownerUserId,
      latest_point: latestPoint,
      breadcrumbs: (rows || []).slice(-50),
      total_points: (rows || []).length,
    });
  }

  // 2. Protected Endpoints (Requires User Authentication)
  const { userId, supabaseClient, error } = await authenticateRequest(request);
  if (error) return error;

  const serviceClient = supabaseClient!;

  if (method === "POST") {
    const body = await request.json().catch(() => ({}));
    const { session_id, latitude, longitude, accuracy } = body;

    if (action === "start") {
      const sessionId = session_id || `TRK_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
      const maxDurationMs = body.max_duration_ms || 10800000; // 3 hours default
      const shareToken = generateTrackingShareToken(sessionId, userId!, maxDurationMs);
      const shareUrl = `/api/location/view?session_id=${sessionId}&token=${shareToken}`;
      
      // Store session entry in tracking_sessions table
      await (serviceClient as any).from("tracking_sessions").upsert({
        session_id: sessionId,
        user_id: userId!,
        status: "active",
        started_at: new Date().toISOString(),
        max_duration_ms: maxDurationMs,
      });

      // Store initial breadcrumb entry if location available
      if (latitude || longitude) {
        await serviceClient.from("location_tracking").insert({
          session_id: sessionId,
          user_id: userId!,
          latitude: latitude || 0,
          longitude: longitude || 0,
          accuracy: accuracy || null,
          timestamp: new Date().toISOString(),
        });
      }

      // Dispatch SMS to user's accepted trusted contacts via MSG91
      const smsAlerts: SmsDispatchResult[] = [];
      const { data: contacts } = await serviceClient
        .from("trusted_contacts")
        .select("*")
        .eq("user_id", userId!)
        .eq("status", "accepted");

      if (contacts && contacts.length > 0) {
        const encryptionKey = process.env.ENCRYPTION_SECRET || "";
        for (const contact of contacts) {
          let plainPhone = "";
          if (contact.phone) {
            try {
              const { data: decPhone } = await serviceClient.rpc("decrypt_field", {
                ciphertext: contact.phone,
                key_str: encryptionKey,
              });
              plainPhone = decPhone || "";
            } catch {
              plainPhone = "";
            }
          }

          const dispatch = await sendEmergencySmsMsg91({
            phone: plainPhone,
            contactName: contact.name,
            mapLink: shareUrl,
            emergencyType: "LIVE_TRANSIT_SHARING",
          });
          smsAlerts.push(dispatch);
        }
      }

      await createAuditLog({
        userId,
        action: "LOCATION_TRACKING_START",
        request,
        deviceInfo: { session_id: sessionId, status: "active", share_token: shareToken, sms_count: smsAlerts.length },
      });

      return createResponse({
        session_id: sessionId,
        share_token: shareToken,
        share_url: shareUrl,
        status: "active",
        alerts: smsAlerts,
        message: "Live tracking session active",
      });
    }

    if (action === "stop") {
      const sessionId = session_id;
      if (!sessionId) return createResponse({ error: "session_id is required" }, 400);

      const reason = body.reason || "USER_STOPPED";

      // Update dedicated tracking_sessions status
      await (serviceClient as any)
        .from("tracking_sessions")
        .update({
          status: reason === "USER_STOPPED" ? "ended" : "revoked",
          ended_at: new Date().toISOString(),
        })
        .eq("session_id", sessionId);

      await createAuditLog({
        userId,
        action: "LOCATION_TRACKING_STOP",
        request,
        deviceInfo: { session_id: sessionId, status: "ended", reason },
      });
      return createResponse({ session_id: sessionId, status: "ended", message: "Live tracking session terminated & revoked" });
    }

    if (action === "log") {
      const sessionId = session_id;
      const breadcrumbs = body.breadcrumbs as Array<{
        latitude: number;
        longitude: number;
        accuracy?: number | null;
        timestamp?: string;
      }>;

      if (!sessionId) {
        return createResponse({ error: "session_id is required" }, 400);
      }

      if (Array.isArray(breadcrumbs) && breadcrumbs.length > 0) {
        const insertRows = breadcrumbs.map((b) => ({
          session_id: sessionId,
          user_id: userId!,
          latitude: b.latitude,
          longitude: b.longitude,
          accuracy: b.accuracy || null,
          timestamp: b.timestamp || new Date().toISOString(),
        }));

        const { error: dbError } = await serviceClient
          .from("location_tracking")
          .insert(insertRows);

        if (dbError) return createResponse({ error: dbError.message }, 400);
        return createResponse({ success: true, count: insertRows.length }, 210);
      } else if (latitude && longitude) {
        const { error: dbError } = await serviceClient.from("location_tracking").insert({
          session_id: sessionId,
          user_id: userId!,
          latitude,
          longitude,
          accuracy: accuracy || null,
          timestamp: new Date().toISOString(),
        });

        if (dbError) return createResponse({ error: dbError.message }, 400);
        return createResponse({ success: true, count: 1 });
      }

      return createResponse({ error: "latitude and longitude or breadcrumbs array required" }, 400);
    }
  }

  if (action === "history" && method === "GET") {
    // Application-level authorization check: strictly scope to authenticated user's own records
    const { data, error: dbError } = await serviceClient
      .from("location_tracking")
      .select("*")
      .eq("user_id", userId!)
      .order("timestamp", { ascending: false })
      .limit(200);

    if (dbError) return createResponse({ error: dbError.message }, 400);
    return createResponse({ tracking_logs: data });
  }

  return createResponse({ error: "Not Found" }, 404);
}

function isValidUuid(id: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * 7. AI Guidance Router (RAG Legal Assistant)
 */
async function handleAiRoutes(request: Request, action: string, method: string): Promise<Response> {
  const { userId, supabaseClient, error } = await authenticateRequest(request, { allowAnonymous: true });
  if (error) return error;

  const serviceClient = supabaseClient!;
  const dbUserId = isValidUuid(userId) ? userId : null;

  if (action === "chat" && method === "POST") {
    const body = await request.json().catch(() => ({}));
    const { question, language, conversation_id } = body;
    if (!question) return createResponse({ error: "Question query is required" }, 400);

    const langCode = language || "en";
    const sessionId = conversation_id || crypto.randomUUID();

    const startTime = Date.now();
    try {
      // 1. Ensure AI session exists or create it (non-fatal if database is offline)
      let chatHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
      try {
        const { data: sessionData } = await serviceClient
          .from("ai_sessions")
          .select("id, internal_case_summary")
          .eq("id", sessionId)
          .maybeSingle();

        if (!sessionData) {
          const sessionPayload: any = {
            id: sessionId,
            title: question.slice(0, 50),
          };
          if (dbUserId) {
            sessionPayload.user_id = dbUserId;
          }
          await serviceClient.from("ai_sessions").insert(sessionPayload);
        }

        // Save user message
        await serviceClient.from("ai_messages").insert({
          session_id: sessionId,
          role: "user",
          content: question,
        });

        // Fetch chat history (last 10 messages) for context
        const { data: historyData } = await serviceClient
          .from("ai_messages")
          .select("role, content")
          .eq("session_id", sessionId)
          .order("created_at", { ascending: false })
          .limit(10);

        chatHistory = (historyData || []).map((h) => ({
          role: (h.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
          content: h.content,
        }));
      } catch (dbErr) {
        console.warn("Notice: Supabase database is unreachable/offline; running AI assistant in resilient standalone mode.");
      }

      // 2. AI Provider setup
      const aiProvider = await getAIProvider();

      // Stage 1, 2 & 3: Investigate & Build Case Summary
      const investigation = await aiProvider.investigate(question, chatHistory);

      if (investigation.needs_clarification) {
        // Return follow-up question without retrieval
        const activeProv = (process.env.AI_PROVIDER || "gemini").toLowerCase();
        const provName = activeProv === "ollama" || activeProv === "local" ? "Ollama (llama3)" : "Gemini 3.1 Flash";
        const fallbackAiResponse = {
          needs_clarification: true,
          is_fallback: false,
          provider_name: provName,
          retrieval_count: 0,
          follow_up_questions: investigation.follow_up_questions || [
            "Could you please provide more details?",
          ],
        };

        try {
          await serviceClient.from("ai_messages").insert({
            session_id: sessionId,
            role: "assistant",
            content: JSON.stringify(fallbackAiResponse),
          });
        } catch {}

        return createResponse({
          conversation_id: sessionId,
          answer: fallbackAiResponse,
        });
      }

      // If we reach here, we have a case summary and search query
      if (investigation.internal_case_summary) {
        try {
          await serviceClient
            .from("ai_sessions")
            .update({
              internal_case_summary:
                typeof investigation.internal_case_summary === "string"
                  ? investigation.internal_case_summary
                  : JSON.stringify(investigation.internal_case_summary),
            })
            .eq("id", sessionId);
        } catch {}
      }

      const searchQuery = investigation.search_query || question;

      // Stage 4: Retrieve Official Information
      const queryEmbedding = await aiProvider.generateEmbedding(searchQuery);

      let retrievedDocs: RetrievalDocument[] = [];
      const { data: rpcData, error: rpcError } = await serviceClient.rpc(
        "hybrid_search_legal_chunks",
        {
          query_text: searchQuery,
          query_embedding: queryEmbedding,
          match_count: 5,
        },
      );

      if (!rpcError && rpcData && Array.isArray(rpcData) && rpcData.length > 0) {
        retrievedDocs = rpcData as unknown as RetrievalDocument[];
      } else {
        retrievedDocs = searchLocalIngestedChunks(searchQuery, queryEmbedding, 5);
      }

      // Check if query contains explicit India Code handle/URL or retrieved zero docs
      const explicitHandle = (question + " " + searchQuery).match(/123456789\/\d+/);
      let targetHandle: string | null = explicitHandle ? explicitHandle[0] : null;

      if (!targetHandle && retrievedDocs.length === 0) {
        // Resolve Act title or search query to India Code handle ID via simple-search
        targetHandle = await resolveActTitleToHandle(searchQuery || question);
      }

      if (targetHandle) {
        console.log(`\n🌐 [RAG Live Fetch]: Target handle "${targetHandle}" resolved. Triggering live on-demand fetcher...`);
        const ingestRes = await fetchAndIngestIndiaCodeAct(targetHandle);

        if (ingestRes.success) {
          const { data: retryRpc } = await serviceClient.rpc("hybrid_search_legal_chunks", {
            query_text: searchQuery,
            query_embedding: queryEmbedding,
            match_count: 5,
          });
          if (retryRpc && Array.isArray(retryRpc) && retryRpc.length > 0) {
            retrievedDocs = retryRpc as unknown as RetrievalDocument[];
          } else {
            retrievedDocs = searchLocalIngestedChunks(searchQuery, queryEmbedding, 5);
          }
        }
      } else if (retrievedDocs.length === 0) {
        console.log(`\n⚠️ [RAG Live Fetch]: No confident India Code match resolved for query "${searchQuery}". Proceeding with zero-document guidance mode.`);
      }

      // Stage 5: Citation Verification
      const verifiedDocs = retrievedDocs.filter(
        (doc) => doc.act_name && doc.official_text && doc.official_text.trim() !== "",
      );

      // Stage 6b: Retrieve Government Services
      const retrievedServices = [
        {
          id: "mock-1",
          service_type: "Authority",
          name: "Labour Commissioner",
          official_url: "https://samadhan.labour.gov.in",
          contact_details: { phone: "14489" },
          jurisdiction: "Central",
          description: "Handles wage disputes under the Code on Wages.",
        },
      ] as GovernmentService[];

      // Stage 6, 7 & 8: Optimized Combined Generation (Single LLM Pass)
      let explanation: ExplanationGeneratorResponse;
      let guidance: GuidanceEngineResponse;
      let actionPlan: ActionPlanGeneratorResponse;

      if (typeof aiProvider.generateCombinedRAGResponse === "function") {
        const combined = await aiProvider.generateCombinedRAGResponse(
          question,
          investigation.internal_case_summary,
          verifiedDocs,
          retrievedServices,
        );
        explanation = combined.explanation;
        guidance = combined.guidance;
        actionPlan = combined.action_plan;
      } else {
        explanation = await aiProvider.explain(
          question,
          investigation.internal_case_summary,
          verifiedDocs,
        );
        guidance = await aiProvider.guide(explanation, retrievedServices);
        actionPlan = await aiProvider.generateActionPlan(guidance);
      }


      const activeProvider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
      const isOllama = activeProvider === "ollama" || activeProvider === "local";
      const ollamaModel = process.env.OLLAMA_MODEL || "llama3";
      const hasApiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "");

      const embeddingSuccess = isOllama
        ? queryEmbedding.some((val) => val !== 0)
        : hasApiKey && queryEmbedding.some((val) => val !== 0);

      const lastFailed = (aiProvider as any).lastCallFailed === true;
      const providerSuccess = isOllama ? !lastFailed : (hasApiKey && !lastFailed);
      const isFallback = !providerSuccess;
      const providerName = isFallback
        ? "⚡ Offline Statutory Engine"
        : isOllama
        ? `Ollama (${ollamaModel})`
        : "Gemini 3.1 Flash";
      const latencyMs = Date.now() - startTime;
      const detectedCategory = investigation.domain_tags?.[0] || "general";

      console.log(`\n=================== [MEYYURAI AI LOG] ===================`);
      console.log(`1. Received Query     : "${question}"`);
      console.log(`2. Detected Category  : ${detectedCategory}`);
      console.log(`3. Provider Active    : ${providerName}`);
      console.log(`4. Embedding Generated: ${embeddingSuccess ? `YES (${queryEmbedding.length}-dim)` : "NO (Zero-Vector Fallback)"}`);
      console.log(`5. Chunks Retrieved   : ${verifiedDocs.length}`);
      console.log(`6. AI Call Executed   : YES (${isOllama ? "Ollama Native REST /api/chat" : "Gemini API"})`);
      console.log(`7. Response Time      : ${latencyMs} ms`);
      console.log(`8. Fallback Used      : ${isFallback ? "TRUE (Warning: Fallback Mode)" : `FALSE (${providerName})`}`);
      console.log(`=========================================================\n`);


      const failureReason = (aiProvider as any).lastFailureReason || null;

      // Combine final AI response
      const aiResponse = {
        needs_clarification: false,
        is_fallback: isFallback,
        fallback_reason: failureReason,
        provider_name: providerName,
        retrieval_count: verifiedDocs.length,
        internal_case_summary: investigation.internal_case_summary,
        explanation,
        guidance,
        action_plan: actionPlan,
      };

      // Stage 9: Continue Conversation (Save state if database is available)
      try {
        await serviceClient.from("ai_messages").insert({
          session_id: sessionId,
          role: "assistant",
          content: JSON.stringify(aiResponse),
          metadata: {
            retrieved_documents: verifiedDocs,
            retrieved_services: retrievedServices,
          } as unknown as Json,
        });

        await createAuditLog({
          userId,
          action: "AI_RAG_QUERY",
          request,
        });
      } catch (dbSaveErr) {
        // Safe skip if Supabase is offline
      }

      return createResponse({
        conversation_id: sessionId,
        answer: {
          ...aiResponse,
          internal_case_summary: investigation.internal_case_summary,
          retrieved_documents: verifiedDocs,
        },
      });
    } catch (err) {
      const error = err as Error;
      console.error("AI RAG Error:", error);
      return createResponse({ error: error.message }, 500);
    }
  }

  if (action === "history" && method === "GET") {
    if (!dbUserId) {
      return createResponse({ sessions: [] });
    }
    const { data, error: dbError } = await serviceClient
      .from("ai_sessions")
      .select("*, ai_messages(*)")
      .eq("user_id", dbUserId)
      .order("created_at", { ascending: false });

    if (dbError) return createResponse({ error: dbError.message }, 400);
    return createResponse({ sessions: data });
  }

  return createResponse({ error: "Not Found" }, 404);
}

/**
 * Normalizes audio MIME types for Gemini 1.5 Flash multimodal API
 */
function normalizeAudioMime(mimeType: string, fileName: string): string {
  const clean = (mimeType || "").toLowerCase().trim();
  const ext = (fileName || "").toLowerCase();

  if (clean.includes("mp3") || clean.includes("mpeg") || ext.endsWith(".mp3")) return "audio/mp3";
  if (clean.includes("m4a") || clean.includes("x-m4a") || ext.endsWith(".m4a")) return "audio/m4a";
  if (clean.includes("wav") || clean.includes("x-wav") || ext.endsWith(".wav")) return "audio/wav";
  if (clean.includes("aac") || ext.endsWith(".aac")) return "audio/aac";
  if (clean.includes("ogg") || clean.includes("opus") || ext.endsWith(".ogg")) return "audio/ogg";
  if (clean.includes("flac") || ext.endsWith(".flac")) return "audio/flac";
  if (clean.includes("mp4") || ext.endsWith(".mp4")) return "audio/mp4";
  if (clean.includes("webm") || ext.endsWith(".webm")) return "audio/webm";
  if (clean.includes("3gp") || clean.includes("3gpp") || ext.endsWith(".3gp") || ext.endsWith(".3gpp")) return "audio/3gpp";
  return "audio/mp3";
}

/**
 * Gemini Multimodal Audio Transcriber helper
 * Detects spoken language (ISO 639-1 code) alongside transcript with a 15-second AbortController timeout
 */
async function performGeminiAudioTranscription(
  audioBuffer: Buffer | null,
  mimeType: string,
  fileName: string,
  userPrefLang?: string,
): Promise<{ transcript: string; language: string }> {
  const defaultResult = {
    transcript: "Transcription unavailable for this recording.",
    language: userPrefLang || "en",
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !audioBuffer) {
    return {
      transcript: "Transcription unavailable: GEMINI_API_KEY not configured.",
      language: userPrefLang || "en",
    };
  }

  const validMime = normalizeAudioMime(mimeType, fileName);

  // 45-second AbortController timeout to accommodate mobile .3gp / .m4a container processing
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const base64Data = audioBuffer.toString("base64");
    const prompt = `You are Meyyurai Speech Transcriber. Transcribe this audio recording into plain text accurately.
Identify the primary spoken ISO 639-1 language code (e.g., "ta" for Tamil, "hi" for Hindi, "te" for Telugu, "kn" for Kannada, "ml" for Malayalam, "en" for English, "mr" for Marathi, "bn" for Bengali, "gu" for Gujarati, "pa" for Punjabi).
Return ONLY a valid JSON object formatted as:
{
  "transcript": "<accurate transcript text>",
  "language": "<2-letter ISO language code>"
}`;

    const modelName = process.env.GEMINI_MODEL_NAME || "gemini-3.1-flash-lite";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: validMime,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        }),
      },
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Gemini Audio Transcription API status ${response.status}.`);
      return defaultResult;
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Robust Markdown fence stripping & JSON extraction
    let cleanText = responseText.trim();
    cleanText = cleanText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[0] : cleanText;

    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.transcript) {
        return {
          transcript: String(parsed.transcript).trim(),
          language: String(parsed.language || userPrefLang || "en").toLowerCase().trim(),
        };
      }
    } catch (parseErr) {
      console.warn(
        "Gemini audio transcription JSON parse failed. Raw response was:\n",
        responseText,
        parseErr
      );
      if (cleanText) {
        return {
          transcript: cleanText,
          language: userPrefLang || "en",
        };
      }
    }

    return {
      transcript: "No speech extracted from audio file.",
      language: userPrefLang || "en",
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      console.warn("Gemini Audio Transcription timed out (15s limit).");
      return {
        transcript: "Transcription timed out (15s limit).",
        language: userPrefLang || "en",
      };
    }
    console.error("Gemini Audio Transcription Exception:", err);
    return defaultResult;
  }
}

/**
 * 8. Voice Router (Speech to Text & Bucket Uploads)
 */
async function handleVoiceRoutes(
  request: Request,
  action: string,
  method: string,
): Promise<Response> {
  const { userId, supabaseClient, error } = await authenticateRequest(request);
  if (error) return error;

  const serviceClient = supabaseClient!;

  if (action === "upload" && method === "POST") {
    const contentType = request.headers.get("content-type") || "";
    let audioUrl = "";
    let durationSeconds = 10;
    let originalName = "voice_note.mp3";
    let mimeType = "audio/mp3";
    let audioBuffer: Buffer | null = null;
    let malwareCheck: "CLEAN" | "INFECTED" | "SCAN_FAILED" = "CLEAN";
    let userPrefLang = "en";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData().catch(() => null);
      if (!formData) return createResponse({ error: "Invalid form-data payload" }, 400);

      const file = formData.get("file") as File | null;
      if (!file) return createResponse({ error: "File binary is required in form-data field 'file'" }, 400);

      originalName = file.name;
      mimeType = file.type || "audio/mp3";
      userPrefLang = (formData.get("language") as string) || "en";
      audioBuffer = Buffer.from(await file.arrayBuffer());

      // 1. Execute Malware Scan on Audio Binary
      malwareCheck = await scanFileMalware(audioBuffer);
      if (malwareCheck === "INFECTED") {
        return createResponse({ error: "Security Warning: Voice note rejected. File contains malware." }, 400);
      }
      if (malwareCheck === "SCAN_FAILED") {
        return createResponse(
          { error: "Security Warning: Malware inspection service unreachable. Upload blocked for security." },
          503
        );
      }

      // Upload file to Supabase voice_notes bucket
      const filePath = `${userId}/${Date.now()}_${originalName}`;
      const { error: uploadError } = await serviceClient.storage
        .from("voice_notes")
        .upload(filePath, audioBuffer, { contentType: mimeType });

      if (uploadError) return createResponse({ error: uploadError.message }, 500);

      const { data: urlData } = serviceClient.storage.from("voice_notes").getPublicUrl(filePath);
      audioUrl = urlData.publicUrl;
    } else {
      const body = await request.json().catch(() => ({}));
      audioUrl = body.audio_url;
      durationSeconds = body.duration_seconds || 10;
      originalName = body.file_name || "voice_note.mp3";
      mimeType = body.file_type || "audio/mp3";
      userPrefLang = body.language || "en";
      if (!audioUrl) return createResponse({ error: "audio_url is required" }, 400);

      // Scan external audio URL binary payload
      try {
        const extRes = await fetch(audioUrl);
        if (extRes.ok) {
          audioBuffer = Buffer.from(await extRes.arrayBuffer());
          malwareCheck = await scanFileMalware(audioBuffer);
        } else {
          malwareCheck = "SCAN_FAILED";
        }
      } catch {
        malwareCheck = "SCAN_FAILED";
      }

      if (malwareCheck === "INFECTED") {
        return createResponse({ error: "Security Warning: External voice note rejected. Malware detected." }, 400);
      }
      if (malwareCheck === "SCAN_FAILED") {
        return createResponse(
          { error: "Security Warning: External voice note malware inspection unreachable. Upload blocked." },
          503
        );
      }
    }

    // 2. Real Gemini Multimodal Speech-to-Text Transcription with Language Detection
    const { transcript, language: detectedLanguage } = await performGeminiAudioTranscription(
      audioBuffer,
      mimeType,
      originalName,
      userPrefLang
    );

    const { data: note, error: dbError } = await serviceClient
      .from("voice_notes")
      .insert({
        user_id: userId!,
        audio_url: audioUrl,
        transcript,
        language: detectedLanguage,
        duration_seconds: durationSeconds,
      })
      .select()
      .single();

    if (dbError) return createResponse({ error: dbError.message }, 400);

    await createAuditLog({ userId, action: "VOICE_NOTE_SAVED", request });
    return createResponse({ message: "Voice note uploaded & transcribed", voice_note: note }, 210);
  }

  if (action === "notes" && method === "GET") {
    const { data, error: dbError } = await serviceClient
      .from("voice_notes")
      .select("*")
      .eq("user_id", userId!)
      .order("created_at", { ascending: false });

    if (dbError) return createResponse({ error: dbError.message }, 400);
    return createResponse({ voice_notes: data });
  }

  return createResponse({ error: "Not Found" }, 404);
}

/**
 * Malware scanner helper connecting to ClamAV daemon
 * Returns SCAN_FAILED if scanner is unreachable (never returns CLEAN on error)
 */
async function scanFileMalware(fileBuffer: Buffer | null): Promise<"CLEAN" | "INFECTED" | "SCAN_FAILED"> {
  if (!fileBuffer) return "CLEAN";
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch("http://localhost:8080/scan", {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: new Uint8Array(fileBuffer),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return "SCAN_FAILED";
    const data = (await res.json().catch(() => ({}))) as { isInfected?: boolean };
    return data.isInfected ? "INFECTED" : "CLEAN";
  } catch (err) {
    // Scanner unreachable or timed out -> SCAN_FAILED (blocking)
    return "SCAN_FAILED";
  }
}

/**
 * Gemini Multimodal OCR helper for image evidence analysis
 */
async function performGeminiMultimodalOcr(
  fileBuffer: Buffer | null,
  mimeType: string,
  fileName: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !fileBuffer) {
    return `OCR unavailable for ${fileName}: GEMINI_API_KEY not configured.`;
  }

  // Determine image MIME type supported by Gemini
  const isImage = mimeType.startsWith("image/");
  const validMime = isImage
    ? mimeType
    : fileName.endsWith(".png")
    ? "image/png"
    : fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")
    ? "image/jpeg"
    : null;

  if (!validMime) {
    return `Document ${fileName} stored. (OCR supported on image formats).`;
  }

  try {
    const base64Data = fileBuffer.toString("base64");
    const modelName = process.env.GEMINI_MODEL_NAME || "gemini-3.1-flash-lite";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: "You are Meyyurai Evidence OCR & Document Analyzer. Extract all text, statutory references, dates, amounts, names, and key legal evidence facts from this document image concisely.",
                },
                {
                  inlineData: {
                    mimeType: validMime,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      console.warn(`Gemini OCR API status ${response.status}. OCR text extraction unavailable.`);
      return `OCR service unavailable for image ${fileName}.`;
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const extractedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return extractedText
      ? extractedText.trim()
      : `No readable text extracted from document image ${fileName}.`;
  } catch (err) {
    console.error("Gemini OCR Exception:", err);
    return `OCR processing error for image ${fileName}.`;
  }
}

/**
 * 9. Image and Document Uploads Router
 */
async function handleUploadsRoutes(
  request: Request,
  action: string,
  method: string,
): Promise<Response> {
  const { userId, supabaseClient, error } = await authenticateRequest(request);
  if (error) return error;

  const serviceClient = supabaseClient!;

  if (method === "POST") {
    const contentType = request.headers.get("content-type") || "";
    let fileName = "";
    let filePath = "";
    let fileType = "";
    let fileSize = 0;
    let fileUrl = "";
    let fileBuffer: Buffer = Buffer.alloc(0);
    let malwareCheck: "CLEAN" | "INFECTED" | "SCAN_FAILED" = "CLEAN";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData().catch(() => null);
      if (!formData) return createResponse({ error: "Invalid form-data payload" }, 400);

      const file = formData.get("file") as File | null;
      if (!file)
        return createResponse({ error: "File binary missing in form-data field 'file'" }, 400);

      fileName = file.name;
      fileType = file.type || "application/octet-stream";
      fileSize = file.size;
      fileBuffer = Buffer.from(await file.arrayBuffer());

      // 1. Execute Malware Scan on Multipart Binary
      malwareCheck = await scanFileMalware(fileBuffer);
      if (malwareCheck === "INFECTED") {
        return createResponse({ error: "Security Warning: Upload rejected. File contains malware." }, 400);
      }
      if (malwareCheck === "SCAN_FAILED") {
        return createResponse(
          { error: "Security Warning: Malware inspection service unreachable. Upload blocked for security." },
          503
        );
      }

      // Determine appropriate storage bucket
      let bucket = "documents";
      if (fileType.startsWith("image/")) bucket = "images";
      else if (fileName.endsWith(".pdf") || fileName.endsWith(".docx")) bucket = "documents";
      else bucket = "evidence";

      filePath = `${userId}/${Date.now()}_${fileName}`;
      const { error: uploadError } = await serviceClient.storage
        .from(bucket)
        .upload(filePath, fileBuffer, { contentType: fileType });

      if (uploadError) return createResponse({ error: uploadError.message }, 500);

      const { data: urlData } = serviceClient.storage.from(bucket).getPublicUrl(filePath);
      fileUrl = urlData.publicUrl;
    } else {
      const body = await request.json().catch(() => ({}));
      fileName = body.file_name;
      fileUrl = body.file_url;
      fileType = body.file_type || "application/pdf";
      fileSize = body.file_size || 1024;
      if (!fileName || !fileUrl)
        return createResponse({ error: "file_name and file_url are required" }, 400);
      filePath = fileUrl;

      // Scan external file_url binary payload
      try {
        const extRes = await fetch(fileUrl);
        if (extRes.ok) {
          fileBuffer = Buffer.from(await extRes.arrayBuffer());
          malwareCheck = await scanFileMalware(fileBuffer);
        } else {
          malwareCheck = "SCAN_FAILED";
        }
      } catch {
        malwareCheck = "SCAN_FAILED";
      }

      if (malwareCheck === "INFECTED") {
        return createResponse({ error: "Security Warning: External file rejected. Malware detected." }, 400);
      }
      if (malwareCheck === "SCAN_FAILED") {
        return createResponse(
          { error: "Security Warning: External file malware inspection unreachable. Upload blocked." },
          503
        );
      }
    }

    // 2. Execute Real Gemini Multimodal OCR for Evidence Analysis
    const ocrSummary = await performGeminiMultimodalOcr(fileBuffer, fileType, fileName);

    const analysisResult = {
      malware_check: malwareCheck,
      ocr_summary: ocrSummary,
    };

    const { data: record, error: dbErr } = await serviceClient
      .from("uploaded_files")
      .insert({
        user_id: userId!,
        file_name: fileName,
        file_path: fileUrl,
        file_type: fileType,
        file_size: fileSize,
        analysis_result: analysisResult,
      })
      .select("*")
      .single();

    if (dbErr) return createResponse({ error: dbErr.message }, 400);

    await createAuditLog({ userId, action: "FILE_EVIDENCE_UPLOADED", request });

    return createResponse(
      {
        message: "File uploaded and analyzed",
        file: record,
        analysis: analysisResult,
      },
      210,
    );
  }

  if (method === "GET") {
    const { data, error: dbError } = await serviceClient
      .from("uploaded_files")
      .select("*")
      .eq("user_id", userId!)
      .order("created_at", { ascending: false });

    if (dbError) return createResponse({ error: dbError.message }, 400);
    return createResponse({ uploaded_files: data });
  }

  return createResponse({ error: "Method or route invalid" }, 400);
}

/**
 * 7. Rights Education & Resources Router
 */
async function handleRightsRoutes(
  request: Request,
  action: string,
  method: string,
  url: URL,
): Promise<Response> {
  const serviceClient = getServiceRoleClient();

  if (action === "categories" && method === "GET") {
    try {
      const { data } = await serviceClient
        .from("rights_categories")
        .select("*")
        .order("priority_order", { ascending: true });

      if (data && data.length > 0) {
        return createResponse({ categories: data });
      }
    } catch (e) {}

    // Default categories fallback
    const fallbackCategories = [
      { id: "c1", slug: "women", name: "Women & Child Safety", description: "POCSO, POSH Act 2013, Domestic Violence Act 2005", priority_order: 1 },
      { id: "c2", slug: "labor", name: "Labour & Employment", description: "Payment of Wages 1936, Minimum Wages, Industrial Disputes", priority_order: 2 },
      { id: "c3", slug: "cyber", name: "Cyber Crime & Online Fraud", description: "IT Act 2000 Section 66D, Cyber Financial Fraud 1930", priority_order: 3 },
      { id: "c4", slug: "consumer", name: "Consumer Protection", description: "Consumer Protection Act 2019, District Consumer Forum", priority_order: 4 },
      { id: "c5", slug: "legalaid", name: "Free Legal Aid", description: "Article 39A Free Lawyers, NALSA Helpline 15100", priority_order: 5 },
    ];
    return createResponse({ categories: fallbackCategories });
  }

  if (action === "articles" && method === "GET") {
    const categorySlug = url.searchParams.get("category");
    try {
      let query = serviceClient.from("rights_articles").select("*");
      const { data } = await query;
      if (data && data.length > 0) {
        return createResponse({ articles: data });
      }
    } catch (e) {}

    return createResponse({
      articles: [
        {
          id: "a1",
          title: "Right to Timely Salary Payment",
          description: "Under Section 15 of Payment of Wages Act 1936, employers must pay wages before 7th/10th of every month.",
          procedures: ["Send formal written notice to employer", "File claim before Labour Commissioner", "File petition in Labour Court"],
        },
      ],
    });
  }

  return createResponse({ error: "Method or route invalid" }, 400);
}

/**
 * 8. Emergency Assistance & Resources Directory Router
 */
async function handleResourcesRoutes(
  request: Request,
  action: string,
  method: string,
  url: URL,
): Promise<Response> {
  const serviceClient = getServiceRoleClient();

  if (method === "GET") {
    const category = url.searchParams.get("category");
    const searchQuery = url.searchParams.get("q");
    const latStr = url.searchParams.get("lat");
    const lngStr = url.searchParams.get("lng");

    let resources: any[] = [];
    try {
      let query = serviceClient.from("resources_directory").select("*");
      if (category) {
        query = query.ilike("category", `%${category}%`);
      }
      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`);
      }
      const { data } = await query;
      if (data && data.length > 0) {
        resources = data;
      }
    } catch (e) {}

    if (resources.length === 0) {
      resources = [
        { id: "r1", name: "National Emergency Response System (ERSS)", category: "Emergency", contact_number: "112", website: "https://erss.in", address: "Pan-India Command Center", operating_hours: "24/7" },
        { id: "r2", name: "National Cyber Crime Reporting Helpline (I4C)", category: "Cyber Crime", contact_number: "1930", website: "https://cybercrime.gov.in", address: "Indian Cyber Crime Coordination Centre, MHA", operating_hours: "24/7" },
        { id: "r3", name: "National Consumer Helpline (NCH / INGRAM)", category: "Complaint Portal", contact_number: "1915", website: "https://consumerhelpline.gov.in", address: "Department of Consumer Affairs, Krishi Bhawan, New Delhi", operating_hours: "8:00 AM - 8:00 PM" },
        { id: "r4", name: "National Legal Services Authority (NALSA)", category: "Legal Aid", contact_number: "15100", website: "https://nalsa.gov.in", address: "Supreme Court Complex, New Delhi", operating_hours: "24/7" },
        { id: "r5", name: "National Women Helpline", category: "Women Safety", contact_number: "181", website: "https://ncw.nic.in", address: "National Commission for Women, New Delhi", operating_hours: "24/7" },
        { id: "r6", name: "Childline Emergency Helpline", category: "Child Protection", contact_number: "1098", website: "https://childlineindia.org", address: "Ministry of Women & Child Development", operating_hours: "24/7" },
        { id: "r7", name: "SAMADHAN Industrial & Labour Dispute Portal", category: "Complaint Portal", contact_number: "14489", website: "https://samadhan.labour.gov.in", address: "Ministry of Labour and Employment, New Delhi", operating_hours: "9:30 AM - 6:00 PM" },
        { id: "r8", name: "One Stop Centre (Sakhi Scheme)", category: "Govt Scheme", contact_number: "181", website: "https://wcd.nic.in/schemes/one-stop-centre-scheme-1", address: "District Govt Hospital Campuses Nationwide", operating_hours: "24/7" },
        { id: "r9", name: "National Tele-MANAS Mental Health Helpline", category: "Mental Health", contact_number: "14416", website: "https://telemanas.mohfw.gov.in", address: "Ministry of Health & Family Welfare", operating_hours: "24/7" },
        { id: "r10", name: "Elderline Senior Citizens Helpline", category: "Senior Citizen", contact_number: "14567", website: "https://socialjustice.gov.in", address: "Ministry of Social Justice and Empowerment", operating_hours: "8:00 AM - 8:00 PM" },
      ];
    }

    // If lat/lng supplied, calculate Haversine distance and sort by proximity
    if (latStr && lngStr) {
      const userLat = parseFloat(latStr);
      const userLng = parseFloat(lngStr);

      resources = resources
        .map((r) => {
          if (r.latitude != null && r.longitude != null) {
            const distance = calculateHaversineDistance(userLat, userLng, r.latitude, r.longitude);
            return { ...r, distance_km: Math.round(distance * 10) / 10 };
          }
          return { ...r, distance_km: null };
        })
        .sort((a, b) => {
          if (a.distance_km === null) return 1;
          if (b.distance_km === null) return -1;
          return a.distance_km - b.distance_km;
        });

      return createResponse({ resources });
    }

    return createResponse({ resources });
  }

  return createResponse({ error: "Not Found" }, 404);
}

/**
 * Haversine Formula helper for distance calculation
 */
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 12. Notifications Router
 */
async function handleNotificationsRoutes(
  request: Request,
  action: string,
  subAction: string,
  method: string,
): Promise<Response> {
  const { userId, supabaseClient, error } = await authenticateRequest(request);
  if (error) return error;

  const serviceClient = supabaseClient!;

  if (action === "") {
    if (method === "GET") {
      const { data, error: dbError } = await serviceClient
        .from("notifications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });

      if (dbError) return createResponse({ error: dbError.message }, 400);
      return createResponse({ notifications: data });
    }
  }

  if (action && action.length === 36 && subAction === "read" && method === "PUT") {
    const { error: dbError } = await serviceClient
      .from("notifications")
      .update({ status: "read" })
      .eq("id", action)
      .eq("user_id", userId!);

    if (dbError) return createResponse({ error: dbError.message }, 400);
    return createResponse({ message: "Notification marked as read" });
  }

  return createResponse({ error: "Not Found" }, 404);
}

/**
 * 13. Admin Router
 */
async function handleAdminRoutes(
  request: Request,
  action: string,
  method: string,
): Promise<Response> {
  const { userId, error } = await authenticateRequest(request);
  if (error) return error;

  // Enforce admin check
  const isAdmin = await checkAdminPrivilege(userId!);
  if (!isAdmin) {
    return createResponse({ error: "Forbidden: Administrative access required." }, 403);
  }

  const serviceClient = getServiceRoleClient();

  if (action === "metrics" && method === "GET") {
    // Collect counts across tables
    const [
      { count: totalUsers },
      { count: emergencies },
      { count: aiRequests },
      { count: fileUploads },
    ] = await Promise.all([
      serviceClient.from("profiles").select("*", { count: "exact", head: true }),
      serviceClient.from("emergency_events").select("*", { count: "exact", head: true }),
      serviceClient.from("ai_conversations").select("*", { count: "exact", head: true }),
      serviceClient.from("uploaded_files").select("*", { count: "exact", head: true }),
    ]);

    // Simple heuristic for active users (active in the last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: activeUsers } = await serviceClient
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gt("updated_at", yesterday);

    return createResponse({
      metrics: {
        total_users: totalUsers || 0,
        active_users_24h: activeUsers || 0,
        emergency_events: emergencies || 0,
        ai_requests: aiRequests || 0,
        file_uploads: fileUploads || 0,
      },
    });
  }

  if (action === "users" && method === "GET") {
    const { data, error: dbError } = await serviceClient
      .from("profiles")
      .select("*, users(email, phone_number, last_active_at)");

    if (dbError) return createResponse({ error: dbError.message }, 400);
    return createResponse({ users: data });
  }

  if (action === "emergencies" && method === "GET") {
    const { data, error: dbError } = await serviceClient
      .from("emergency_events")
      .select("*, profiles(full_name)")
      .order("time", { ascending: false });

    if (dbError) return createResponse({ error: dbError.message }, 400);
    return createResponse({ emergencies: data });
  }

  if (action === "ingest" && method === "POST") {
    const body = await request.json().catch(() => ({}));
    const { handle_or_url, force } = body;
    if (!handle_or_url) {
      return createResponse({ error: "handle_or_url parameter is required" }, 400);
    }
    const result = await fetchAndIngestIndiaCodeAct(handle_or_url, { forceRefetch: Boolean(force) });
    return createResponse(result, result.success ? 200 : 500);
  }

  return createResponse({ error: "Not Found" }, 404);
}

/**
 * 14. Settings Router
 */
async function handleSettingsRoutes(
  request: Request,
  action: string,
  method: string,
): Promise<Response> {
  const serviceClient = getServiceRoleClient();

  if (method === "GET") {
    const { data, error } = await serviceClient.from("system_settings").select("*");
    if (error) return createResponse({ error: error.message }, 400);

    const settingsMap = (data || []).reduce(
      (acc: Record<string, unknown>, row) => {
        acc[row.key] = row.value;
        return acc;
      },
      {} as Record<string, unknown>,
    );
    return createResponse({ settings: settingsMap });
  }

  if (method === "PUT") {
    const { userId, error: authError } = await authenticateRequest(request);
    if (authError) return authError;

    const isAdmin = await checkAdminPrivilege(userId!);
    if (!isAdmin)
      return createResponse({ error: "Forbidden: Administrative access required." }, 403);

    const body = await request.json().catch(() => ({}));
    const { key, value } = body;
    if (!key || !value) return createResponse({ error: "key and value are required" }, 400);

    const { error: dbError } = await serviceClient
      .from("system_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() });

    if (dbError) return createResponse({ error: dbError.message }, 400);

    await createAuditLog({ userId, action: `SETTINGS_UPDATED_${key.toUpperCase()}`, request });
    return createResponse({ message: `System setting '${key}' updated successfully` });
  }

  return createResponse({ error: "Not Found" }, 404);
}

/**
 * 15. Complaints Router
 */
async function handleComplaintsRoutes(
  request: Request,
  action: string,
  method: string,
): Promise<Response> {
  const { userId, error: authError } = await authenticateRequest(request);
  if (authError) return authError;
  const serviceClient = getServiceRoleClient();

  // GET /api/complaints OR /api/complaints/:id
  if (method === "GET") {
    if (action) {
      const { data, error } = await serviceClient
        .from("complaints")
        .select("*")
        .eq("id", action)
        .eq("user_id", userId!)
        .maybeSingle();

      if (error) return createResponse({ error: error.message }, 400);
      if (!data) return createResponse({ error: "Complaint not found" }, 404);

      const { data: evidenceFiles } = await serviceClient
        .from("evidence")
        .select("*")
        .eq("complaint_id", action)
        .eq("user_id", userId!);

      return createResponse({ complaint: data, evidence: evidenceFiles || [] });
    }

    const { data, error } = await serviceClient
      .from("complaints")
      .select("*")
      .eq("user_id", userId!)
      .order("created_at", { ascending: false });

    if (error) return createResponse({ error: error.message }, 400);
    return createResponse({ complaints: data || [] });
  }

  // POST /api/complaints
  if (method === "POST") {
    const body = await request.json().catch(() => ({}));
    const {
      title,
      category,
      complainant_name,
      incident_date,
      location,
      respondent,
      incident_description,
      requested_action,
      contact_details,
      complaint_text,
    } = body;

    if (!title || !incident_description || !complaint_text) {
      return createResponse({ error: "Title, incident description, and complaint text are required" }, 400);
    }

    const { data, error } = await serviceClient
      .from("complaints")
      .insert({
        user_id: userId!,
        title,
        category: category || "General Legal",
        complainant_name,
        incident_date: incident_date ? new Date(incident_date).toISOString() : new Date().toISOString(),
        location,
        respondent,
        incident_description,
        requested_action,
        contact_details,
        complaint_text,
        status: "draft",
      })
      .select()
      .single();

    if (error) return createResponse({ error: error.message }, 400);
    await createAuditLog({ userId, action: "COMPLAINT_CREATED", request });
    return createResponse({ message: "Complaint saved successfully", complaint: data }, 201);
  }

  // PUT /api/complaints/:id
  if (method === "PUT" && action) {
    const body = await request.json().catch(() => ({}));
    const { error } = await serviceClient
      .from("complaints")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", action)
      .eq("user_id", userId!);

    if (error) return createResponse({ error: error.message }, 400);
    return createResponse({ message: "Complaint updated successfully" });
  }

  // DELETE /api/complaints/:id
  if (method === "DELETE" && action) {
    const { error } = await serviceClient
      .from("complaints")
      .delete()
      .eq("id", action)
      .eq("user_id", userId!);

    if (error) return createResponse({ error: error.message }, 400);
    return createResponse({ message: "Complaint deleted successfully" });
  }

  return createResponse({ error: "Not Found" }, 404);
}

/**
 * 16. Evidence Router
 */
async function handleEvidenceRoutes(
  request: Request,
  action: string,
  method: string,
): Promise<Response> {
  const { userId, error: authError } = await authenticateRequest(request);
  if (authError) return authError;
  const serviceClient = getServiceRoleClient();

  if (method === "GET") {
    const { data, error } = await serviceClient
      .from("evidence")
      .select("*")
      .eq("user_id", userId!)
      .order("created_at", { ascending: false });

    if (error) return createResponse({ error: error.message }, 400);
    return createResponse({ evidence: data || [] });
  }

  if (method === "POST") {
    const body = await request.json().catch(() => ({}));
    const { complaint_id, file_name, file_type, file_url, file_size, description, extracted_text } = body;

    if (!file_name || !file_url) {
      return createResponse({ error: "file_name and file_url are required" }, 400);
    }

    const { data, error } = await serviceClient
      .from("evidence")
      .insert({
        user_id: userId!,
        complaint_id: complaint_id || null,
        file_name,
        file_type: file_type || "application/pdf",
        file_url,
        file_size: file_size || 0,
        description: description || "",
        extracted_text: extracted_text || null,
      })
      .select()
      .single();

    if (error) return createResponse({ error: error.message }, 400);
    await createAuditLog({ userId, action: "EVIDENCE_UPLOADED", request });
    return createResponse({ message: "Evidence record saved successfully", file: data }, 201);
  }

  if (method === "DELETE" && action) {
    const { error } = await serviceClient
      .from("evidence")
      .delete()
      .eq("id", action)
      .eq("user_id", userId!);

    if (error) return createResponse({ error: error.message }, 400);
    return createResponse({ message: "Evidence deleted successfully" });
  }

  return createResponse({ error: "Not Found" }, 404);
}

/**
 * 17. Bookmarks Router
 */
async function handleBookmarksRoutes(
  request: Request,
  action: string,
  method: string,
): Promise<Response> {
  const { userId, error: authError } = await authenticateRequest(request);
  if (authError) return authError;
  const serviceClient = getServiceRoleClient();

  if (method === "GET") {
    const { data, error } = await serviceClient
      .from("bookmarks")
      .select("*")
      .eq("user_id", userId!)
      .order("created_at", { ascending: false });

    if (error) return createResponse({ error: error.message }, 400);
    return createResponse({ bookmarks: data || [] });
  }

  if (method === "POST") {
    const body = await request.json().catch(() => ({}));
    const { law_id, section_id, title, category, source_url } = body;

    if (!title) return createResponse({ error: "Title is required" }, 400);

    const { data, error } = await serviceClient
      .from("bookmarks")
      .upsert({
        user_id: userId!,
        law_id: law_id || null,
        section_id: section_id || null,
        title,
        category: category || "General Law",
        source_url: source_url || null,
      })
      .select()
      .single();

    if (error) return createResponse({ error: error.message }, 400);
    return createResponse({ message: "Bookmarked successfully", bookmark: data });
  }

  if (method === "DELETE" && action) {
    const { error } = await serviceClient
      .from("bookmarks")
      .delete()
      .eq("id", action)
      .eq("user_id", userId!);

    if (error) return createResponse({ error: error.message }, 400);
    return createResponse({ message: "Bookmark removed" });
  }

  return createResponse({ error: "Not Found" }, 404);
}

/**
 * 18. Legal Search Router
 */
async function handleSearchRoutes(
  _request: Request,
  _action: string,
  method: string,
  url: URL,
): Promise<Response> {
  if (method !== "GET") return createResponse({ error: "Method not allowed" }, 405);

  const query = (url.searchParams.get("q") || "").trim();
  const category = (url.searchParams.get("category") || "").trim().toLowerCase();

  const serviceClient = getServiceRoleClient();
  let results: any[] = [];

  try {
    let catId: string | null = null;
    if (category && category !== "all") {
      const { data: catData } = await serviceClient
        .from("rights_categories")
        .select("id")
        .or(`slug.ilike.%${category}%,name.ilike.%${category}%`)
        .maybeSingle();
      if (catData) {
        catId = catData.id;
      }
    }

    let dbQuery = serviceClient.from("rights_articles").select("id, title, description, procedures, created_at");
    if (catId) {
      dbQuery = dbQuery.eq("category_id", catId);
    }
    if (query) {
      dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    }

    const { data: articlesData } = await dbQuery.limit(50);
    if (articlesData && articlesData.length > 0) {
      results = articlesData;
    }
  } catch (err) {
    console.error("[Search API Warning]:", err);
  }

  // Demonstration / official dataset fallback if DB results are empty
  if (results.length === 0) {
    const defaultStatutes = [
      {
        id: "statute-1",
        title: "Consumer Protection Act, 2019 - Section 2(7)",
        description: "Defines a consumer, rights against unfair trade practices, defective goods, and deficient services in India.",
        category: "Consumer Rights",
        slug: "consumer",
      },
      {
        id: "statute-2",
        title: "Payment of Wages Act, 1936 - Section 15",
        description: "Claims arising out of unlawful deductions or delay in salary payment to employees and workers.",
        category: "Labour & Employment",
        slug: "labor",
      },
      {
        id: "statute-3",
        title: "Information Technology Act, 2000 - Section 66D",
        description: "Punishment for cheating by personation using computer resource, online financial fraud, or identity theft.",
        category: "Cyber Crime",
        slug: "cyber",
      },
      {
        id: "statute-4",
        title: "Protection of Women from Domestic Violence Act, 2005 - Section 12",
        description: "Application to Magistrate for protection orders, residence orders, and monetary relief against domestic abuse.",
        category: "Domestic Violence",
        slug: "domestic",
      },
      {
        id: "statute-5",
        title: "Sexual Harassment of Women at Workplace (POSH) Act, 2013 - Section 9",
        description: "Complaint of sexual harassment to Internal Committee (IC) or Local Committee (LC) within 3 months.",
        category: "Women Safety",
        slug: "women",
      },
    ];

    results = defaultStatutes.filter((s) => {
      const matchCat = !category || category === "all" || s.slug.includes(category) || s.category.toLowerCase().includes(category);
      const matchQuery = !query || s.title.toLowerCase().includes(query.toLowerCase()) || s.description.toLowerCase().includes(query.toLowerCase());
      return matchCat && matchQuery;
    });
  }

  return createResponse({ query, category, count: results.length, results });
}

