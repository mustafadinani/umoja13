import { registerWebPushSubscription } from "./callables";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function isWebPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && !!VAPID_PUBLIC_KEY;
}

/** Mirrors the current subscription/permission state without prompting anything — safe to call on render. */
export function webPushPermission(): NotificationPermission | "unsupported" {
  if (!isWebPushSupported()) return "unsupported";
  return Notification.permission;
}

// PushManager.subscribe wants the VAPID public key as a raw Uint8Array, not
// the base64url string it's stored/shipped as.
function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  // Explicit ArrayBuffer (not the wider ArrayBufferLike a bare `new
  // Uint8Array(n)` infers) — PushManager.subscribe's applicationServerKey
  // wants BufferSource, which excludes a SharedArrayBuffer-backed view.
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/**
 * Prompts for notification permission (if not already decided) and, once
 * granted, subscribes this browser and persists the subscription server-
 * side. Returns false without prompting again if the user already denied
 * it previously — browsers give no way back into that prompt short of the
 * user resetting it in their own site settings, so retrying is a no-op that
 * would just look broken.
 */
export async function enableWebPush(): Promise<boolean> {
  if (!isWebPushSupported()) return false;
  if (Notification.permission === "denied") return false;

  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return false;

  const registration = await navigator.serviceWorker.register("/sw-push.js");
  await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!),
  });

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    // Every real browser fills all three in — this only trips on a
    // malformed/mocked subscription, not a normal failure path.
    throw new Error("Browser returned an incomplete push subscription.");
  }

  await registerWebPushSubscription({
    subscription: { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } },
  });
  return true;
}

/** Unsubscribes this browser and clears the server-side record. Safe to call even if never subscribed. */
export async function disableWebPush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration("/sw-push.js");
  const subscription = await registration?.pushManager.getSubscription();
  await subscription?.unsubscribe();
  await registerWebPushSubscription({ subscription: null });
}
