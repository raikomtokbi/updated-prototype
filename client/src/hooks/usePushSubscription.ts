import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

const SESSION_KEY = "_push_subscribed";

export function isPushSupported(): boolean {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

/**
 * Trigger the browser's notification permission dialog and subscribe.
 * MUST be called from a user gesture (click/tap) to work in all browsers.
 */
export async function subscribeToPush(): Promise<"granted" | "denied" | "unsupported" | "error"> {
  if (!isPushSupported()) return "unsupported";
  try {
    const res = await fetch("/api/push/vapid-key");
    if (!res.ok) return "error";
    const { publicKey } = await res.json();

    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return "denied";
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription),
    });
    sessionStorage.setItem(SESSION_KEY, "1");
    return "granted";
  } catch (err) {
    console.error("[Push] Subscription error:", err);
    return "error";
  }
}

/**
 * Background hook: registers the service worker and re-syncs an existing
 * subscription with the server. Does NOT auto-trigger the permission dialog
 * (that must come from a user click via subscribeToPush).
 */
export function usePushSubscription() {
  const [location] = useLocation();

  useEffect(() => {
    if (location.startsWith("/admin")) return;
    if (!isPushSupported()) return;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing && !sessionStorage.getItem(SESSION_KEY)) {
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(existing),
          });
          sessionStorage.setItem(SESSION_KEY, "1");
        }
      } catch (err) {
        console.error("[Push] Background sync error:", err);
      }
    })();
  }, [location]);
}

/**
 * Reactive hook returning current notification permission state and a
 * subscribe function that triggers the browser dialog on user click.
 */
export function usePushPermission() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission;
  });

  const requestSubscribe = useCallback(async () => {
    const result = await subscribeToPush();
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
    return result;
  }, []);

  return { permission, requestSubscribe, supported: permission !== "unsupported" };
}
