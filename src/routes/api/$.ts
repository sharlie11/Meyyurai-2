// src/routes/api/$.ts
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
import { fetchAndIngestIndiaCodeAct, resolveActTitleToHandle } from "@/lib/ingestion/indiacode-fetcher";
import { sendEmergencySmsMsg91 } from "@/lib/sms";
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
        .eq("id", userId)
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
        .eq("id", userId)
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
        .eq("id", userId)
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

/**
 * 6. Location Tracking Router
 */
async function handleTrackingRoutes(
  request: Request,
  action: string,
  method: string,
): Promise<Response> {
  const { userId, supabaseClient, error } = await authenticateRequest(request);
  if (error) return error;

  const serviceClient = supabaseClient!;

  if (method === "POST") {
    const body = await request.json().catch(() => ({}));
    const { session_id, latitude, longitude, accuracy } = body;

    if (action === "start") {
      const sessionId = session_id || crypto.randomUUID();
      await createAuditLog({
        userId,
        action: "LOCATION_TRACKING_START",
        request,
        deviceInfo: { session_id: sessionId },
      });
      return createResponse({ session_id: sessionId, message: "Live tracking session active" });
    }

    if (action === "stop") {
      if (!session_id) return createResponse({ error: "session_id is required" }, 400);
      await createAuditLog({
        userId,
        action: "LOCATION_TRACKING_STOP",
        request,
        deviceInfo: { session_id },
      });
      return createResponse({ message: "Live tracking session terminated" });
    }

    if (action === "log") {
      if (!session_id || !latitude || !longitude) {
        return createResponse({ error: "session_id, latitude, and longitude are required" }, 400);
      }

      const { error: dbError } = await serviceClient.from("location_tracking").insert({
        session_id,
        user_id: userId!,
        latitude,
        longitude,
        accuracy: accuracy || null,
        timestamp: new Date().toISOString(),
      });

      if (dbError) return createResponse({ error: dbError.message }, 400);
      return createResponse({ success: true });
    }
  }

  if (action === "history" && method === "GET") {
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
  const { userId, supabaseClient, error } = await authenticateRequest(request);
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
      // 1. Ensure AI session exists or create it
      const { data: sessionData, error: sessionError } = await serviceClient
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

      const chatHistory = (historyData || []).map((h) => ({
        role: (h.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
        content: h.content,
      }));

      // 2. AI Provider setup
      const aiProvider = await getAIProvider();

      // Stage 1, 2 & 3: Investigate & Build Case Summary
      const investigation = await aiProvider.investigate(question, chatHistory);

      if (investigation.needs_clarification) {
        // Return follow-up question without retrieval
        const fallbackAiResponse = {
          needs_clarification: true,
          is_fallback: true,
          retrieval_count: 0,
          follow_up_questions: investigation.follow_up_questions || [
            "Could you please provide more details?",
          ],
        };

        await serviceClient.from("ai_messages").insert({
          session_id: sessionId,
          role: "assistant",
          content: JSON.stringify(fallbackAiResponse),
        });

        return createResponse({
          conversation_id: sessionId,
          answer: fallbackAiResponse,
        });
      }

      // If we reach here, we have a case summary and search query
      if (investigation.internal_case_summary) {
        await serviceClient
          .from("ai_sessions")
          .update({
            internal_case_summary:
              typeof investigation.internal_case_summary === "string"
                ? investigation.internal_case_summary
                : JSON.stringify(investigation.internal_case_summary),
          })
          .eq("id", sessionId);
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

      if (!rpcError && rpcData) {
        retrievedDocs = rpcData as unknown as RetrievalDocument[];
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
          if (retryRpc) {
            retrievedDocs = retryRpc as unknown as RetrievalDocument[];
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

      const providerSuccess = isOllama ? true : hasApiKey;
      const isFallback = !providerSuccess || verifiedDocs.length === 0;
      const latencyMs = Date.now() - startTime;
      const detectedCategory = investigation.domain_tags?.[0] || "general";

      console.log(`\n=================== [MEYYURAI AI LOG] ===================`);
      console.log(`1. Received Query     : "${question}"`);
      console.log(`2. Detected Category  : ${detectedCategory}`);
      console.log(`3. Provider Active    : ${isOllama ? `OLLAMA (${ollamaModel})` : "GEMINI (gemini-2.5-pro)"}`);
      console.log(`4. Embedding Generated: ${embeddingSuccess ? `YES (${queryEmbedding.length}-dim)` : "NO (Zero-Vector Fallback)"}`);
      console.log(`5. Chunks Retrieved   : ${verifiedDocs.length}`);
      console.log(`6. AI Call Executed   : YES (${isOllama ? "Ollama Native REST /api/chat" : "Gemini API"})`);
      console.log(`7. Response Time      : ${latencyMs} ms`);
      console.log(`8. Fallback Used      : ${isFallback ? "TRUE (Warning: Fallback Mode)" : `FALSE (Verified ${isOllama ? "Ollama" : "Gemini"}+RAG)`}`);
      console.log(`=========================================================\n`);


      // Combine final AI response
      const aiResponse = {
        needs_clarification: false,
        is_fallback: isFallback,
        retrieval_count: verifiedDocs.length,
        internal_case_summary: investigation.internal_case_summary,
        explanation,
        guidance,
        action_plan: actionPlan,
      };

      // Stage 9: Continue Conversation (Save state)
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

  // 15-second AbortController timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

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
                  inline_data: {
                    mime_type: validMime,
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
      body: fileBuffer,
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
                  inline_data: {
                    mime_type: validMime,
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
    const { data, error } = await serviceClient
      .from("rights_categories")
      .select("*")
      .order("priority_order", { ascending: true });

    if (error) return createResponse({ error: error.message }, 400);
    return createResponse({ categories: data });
  }

  if (action === "articles" && method === "GET") {
    const categorySlug = url.searchParams.get("category");
    let query = serviceClient.from("rights_articles").select("*, rights_categories!inner(slug)");

    if (categorySlug) {
      query = query.eq("rights_categories.slug", categorySlug);
    }

    const { data, error } = await query;
    if (error) return createResponse({ error: error.message }, 400);
    return createResponse({ articles: data });
  }

  return createResponse({ error: "Method or route invalid" }, 400);
}

/**
 * Resources Directory Router
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

    let query = serviceClient.from("resources_directory").select("*");

    if (category) {
      query = query.ilike("category", `%${category}%`);
    }

    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;
    if (error) return createResponse({ error: error.message }, 400);

    let resources = data || [];

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

    return createResponse({ resources: data });
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
