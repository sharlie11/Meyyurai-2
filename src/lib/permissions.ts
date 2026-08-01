// Lightweight runtime permission helpers.
// Each helper requests the permission only when first needed and surfaces a
// human-readable result the UI can react to.

import { toast } from "sonner";

export type PermissionResult = "granted" | "denied" | "unsupported";

export async function requestLocation(): Promise<GeolocationPosition | null> {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    toast.error("Location is not supported on this device");
    return null;
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      (err) => {
        toast.error(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied"
            : "Couldn't access location",
        );
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  });
}

export async function requestMicrophone(): Promise<PermissionResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia)
    return "unsupported";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return "granted";
  } catch {
    toast.error("Microphone access denied");
    return "denied";
  }
}

export async function requestCamera(): Promise<PermissionResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia)
    return "unsupported";
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((t) => t.stop());
    return "granted";
  } catch {
    toast.error("Camera access denied");
    return "denied";
  }
}

export async function requestNotifications(): Promise<PermissionResult> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  const result = await Notification.requestPermission();
  return result === "granted" ? "granted" : "denied";
}

export async function requestContacts(): Promise<PermissionResult> {
  // Contact Picker API — Chromium-only on Android.
  // @ts-expect-error contacts is experimental
  if (typeof navigator === "undefined" || !navigator.contacts?.select) return "unsupported";
  return "granted";
}
