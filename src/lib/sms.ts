/**
 * Meyyurai Emergency SMS Dispatch Module (MSG91 Integration)
 */

export interface SmsDispatchOptions {
  phone: string;
  contactName: string;
  mapLink: string;
  emergencyType?: string;
  emergencyId?: string;
}

export interface SmsDispatchResult {
  contact_name: string;
  phone_notified: string; // Masked phone number
  status: "dispatched" | "failed" | "failed_no_phone";
  error_detail?: string;
}

/**
 * Mask phone number for logging and API responses (+91 98*** **210)
 */
export function maskPhoneNumber(phone: string | null): string {
  if (!phone || phone.length < 7) return "***";
  const clean = phone.trim();
  return clean.slice(0, 5) + "*".repeat(Math.max(3, clean.length - 8)) + clean.slice(-3);
}

/**
 * Sends emergency SMS via MSG91 API with 1-retry backoff and Sandbox Mode fallback.
 */
export async function sendEmergencySmsMsg91(
  options: SmsDispatchOptions,
): Promise<SmsDispatchResult> {
  const { phone, contactName, mapLink, emergencyType = "SOS", emergencyId = "N/A" } = options;
  const maskedPhone = maskPhoneNumber(phone);

  if (!phone || phone.trim() === "") {
    return {
      contact_name: contactName,
      phone_notified: maskedPhone,
      status: "failed_no_phone",
      error_detail: "No phone number available for contact",
    };
  }

  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  const isExplicitSandbox = process.env.MSG91_SANDBOX_MODE === "true";

  // Case 1: Explicit Sandbox Mode for local dev/testing
  if (isExplicitSandbox) {
    console.log(`\n📲 [MSG91 SANDBOX DISPATCH SIMULATION]`);
    console.log(`• Target Contact : ${contactName} (${maskedPhone})`);
    console.log(`• Emergency Type : ${emergencyType}`);
    console.log(`• Event ID       : ${emergencyId}`);
    console.log(`• GPS Map Link   : ${mapLink}`);
    console.log(`• Status         : DISPATCHED (Explicit Sandbox Simulated)\n`);

    return {
      contact_name: contactName,
      phone_notified: maskedPhone,
      status: "dispatched",
    };
  }

  // Case 2: Missing Auth Key in non-sandbox environment -> Return failed to trigger fallback
  if (!authKey || authKey.trim() === "") {
    console.warn(`❌ [MSG91 DISPATCH ERROR]: MSG91_AUTH_KEY is not configured in environment for contact ${maskedPhone}. Marking dispatch as failed.`);
    return {
      contact_name: contactName,
      phone_notified: maskedPhone,
      status: "failed",
      error_detail: "MSG91_AUTH_KEY is missing in non-sandbox environment",
    };
  }

  const cleanPhone = phone.replace(/[^0-9]/g, "");

  // Attempt 1 with retry on failure
  let success = await executeMsg91ApiCall(cleanPhone, mapLink, emergencyType, authKey, templateId);

  if (!success) {
    console.warn(`⚠️ [MSG91 SMS Attempt 1 Failed for ${maskedPhone}]. Retrying in 500ms...`);
    await new Promise((res) => setTimeout(res, 500));
    success = await executeMsg91ApiCall(cleanPhone, mapLink, emergencyType, authKey, templateId);
  }

  return {
    contact_name: contactName,
    phone_notified: maskedPhone,
    status: success ? "dispatched" : "failed",
    error_detail: success ? undefined : "MSG91 Gateway returned non-200 status",
  };
}

async function executeMsg91ApiCall(
  phone: string,
  mapLink: string,
  emergencyType: string,
  authKey: string,
  templateId?: string,
): Promise<boolean> {
  try {
    const payload = templateId
      ? {
          template_id: templateId,
          recipients: [{ mobiles: phone, location: mapLink, type: emergencyType }],
        }
      : {
          sender: process.env.MSG91_SENDER_ID || "MEYYUR",
          route: "4", // Transactional route
          country: "91",
          sms: [
            {
              message: `EMERGENCY ALERT: Meyyurai user activated ${emergencyType}. Location: ${mapLink}`,
              to: [phone],
            },
          ],
        };

    const endpoint = templateId
      ? "https://control.msg91.com/api/v5/flow/"
      : "https://api.msg91.com/api/v2/sendsms";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        authkey: authKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[MSG91 Error ${res.status}]: ${errText}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[MSG91 Network Exception]:", err);
    return false;
  }
}
