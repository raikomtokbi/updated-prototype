import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "pwa_install_state";
// Values: "installed" | "dismissed" | (not set = never seen)

function getInstallState(): string {
  try { return localStorage.getItem(STORAGE_KEY) ?? ""; } catch { return ""; }
}
function setInstallState(v: string) {
  try { localStorage.setItem(STORAGE_KEY, v); } catch { /* noop */ }
}

function detectIsIOS() {
  const ua = navigator.userAgent || "";
  return /iphone|ipad|ipod/i.test(ua) && !/android/i.test(ua);
}
function detectIsInStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function useInstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<string>(() => {
    // If already running as installed PWA, mark it right away
    if (typeof window !== "undefined" && detectIsInStandalone()) return "installed";
    return getInstallState();
  });
  const isIOS = typeof navigator !== "undefined" ? detectIsIOS() : false;

  useEffect(() => {
    // Already in standalone — record and stop
    if (detectIsInStandalone()) {
      setInstallState("installed");
      setState("installed");
      return;
    }

    const beforeInstall = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const appInstalled = () => {
      setInstallState("installed");
      setState("installed");
      setPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", beforeInstall);
    window.addEventListener("appinstalled", appInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall);
      window.removeEventListener("appinstalled", appInstalled);
    };
  }, []);

  // Trigger native install or let the UI show iOS instructions
  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setInstallState("installed");
      setState("installed");
      setPrompt(null);
    }
  };

  // User clicks X / not now
  const dismiss = () => {
    setInstallState("dismissed");
    setState("dismissed");
  };

  const isInstalled = state === "installed";
  const isDismissed = state === "dismissed";

  return {
    // Show the button whenever not installed or dismissed — even before the
    // native beforeinstallprompt fires so it appears on first visit.
    canInstall: !isInstalled && !isDismissed,
    hasNativePrompt: !!prompt,  // true = we can trigger Chrome/Android native UI
    isIOS,                       // true = show manual "Share → Add" instructions
    isInstalled,
    install,
    dismiss,
  };
}
