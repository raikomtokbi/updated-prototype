import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) return "mobile";
  return "desktop";
}

function getOrCreateSessionId(): string {
  let sid = sessionStorage.getItem("_nsid");
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("_nsid", sid);
  }
  return sid;
}

function genId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function usePageTracking() {
  const [location] = useLocation();
  const viewIdRef = useRef<string | null>(null);
  const startRef = useRef<number>(Date.now());
  const isFirstViewRef = useRef<boolean>(true);

  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    const isFirstInSession = isFirstViewRef.current;

    async function sendDuration(id: string, startMs: number, isFirst: boolean) {
      const dur = Date.now() - startMs;
      try {
        await fetch("/api/analytics/duration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, durationMs: dur, isBounce: isFirst }),
        });
      } catch (_) {}
    }

    const prevId = viewIdRef.current;
    const prevStart = startRef.current;
    const wasFirst = isFirstViewRef.current;

    if (prevId) {
      sendDuration(prevId, prevStart, wasFirst);
    }

    const newId = genId();
    viewIdRef.current = newId;
    startRef.current = Date.now();
    isFirstViewRef.current = false;

    const skipPaths = ["/api", "/uploads", "/__", "/admin"];
    if (skipPaths.some(p => location.startsWith(p))) return;

    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: newId,
        sessionId,
        path: location,
        referrer: isFirstInSession ? (document.referrer || undefined) : undefined,
        deviceType: getDeviceType(),
      }),
    }).catch(() => {});

    return () => {
      if (viewIdRef.current === newId) {
        sendDuration(newId, startRef.current, false);
        viewIdRef.current = null;
      }
    };
  }, [location]);
}
