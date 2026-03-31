import { useRef, useState, useEffect } from "react";
import { useLocation } from "wouter";

export interface NavGuard {
  leaveDialog: boolean;
  pendingPath: string | null;
  cancelLeave: () => void;
  doLeave: () => void;
}

export function useNavGuard(isDirty: boolean): NavGuard {
  const [, setLocation] = useLocation();
  const isDirtyRef = useRef(isDirty);
  const bypassRef = useRef(false);
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  // Intercept browser tab-close / refresh
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Intercept in-app navigation (wouter pushState)
  useEffect(() => {
    const orig = history.pushState;
    history.pushState = function (...args: Parameters<typeof history.pushState>) {
      if (!bypassRef.current && isDirtyRef.current) {
        const url = args[2];
        const current = window.location.pathname + window.location.search;
        if (url && typeof url === "string" && url !== current) {
          setPendingPath(url);
          setLeaveDialog(true);
          return;
        }
      }
      orig.apply(history, args);
    };
    return () => {
      history.pushState = orig;
    };
  }, []);

  // Intercept browser back/forward button
  useEffect(() => {
    const handler = () => {
      if (!bypassRef.current && isDirtyRef.current) {
        history.pushState(null, "", window.location.pathname);
        setPendingPath("__back__");
        setLeaveDialog(true);
      }
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  function cancelLeave() {
    setPendingPath(null);
    setLeaveDialog(false);
  }

  function doLeave() {
    bypassRef.current = true;
    setLeaveDialog(false);
    if (pendingPath === "__back__") {
      history.back();
    } else if (pendingPath) {
      setLocation(pendingPath);
    }
    setTimeout(() => {
      bypassRef.current = false;
    }, 100);
  }

  return { leaveDialog, pendingPath, cancelLeave, doLeave };
}
