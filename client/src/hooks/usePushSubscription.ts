import { useEffect } from "react";
import { useLocation } from "wouter";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function usePushSubscription() {
  const [location] = useLocation();

  useEffect(() => {
    if (location.startsWith("/admin")) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") return;

    const SESSION_KEY = "_push_subscribed";

    (async () => {
      try {
        const res = await fetch("/api/push/vapid-key");
        if (!res.ok) return;
        const { publicKey } = await res.json();

        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;

        const existing = await reg.pushManager.getSubscription();

        if (existing) {
          // Always re-sync with server once per session — handles fresh DB deployments
          if (!sessionStorage.getItem(SESSION_KEY)) {
            await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(existing),
            });
            sessionStorage.setItem(SESSION_KEY, "1");
          }
          return;
        }

        // No subscription yet — request permission once per session
        if (sessionStorage.getItem(SESSION_KEY)) return;

        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
        });
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch (err) {
        console.error("[Push] Subscription error:", err);
      }
    })();
  }, [location]);
}
