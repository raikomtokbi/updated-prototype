import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuthStore } from "@/lib/store/authstore";
import { Zap } from "lucide-react";

export default function AuthCallback() {
  const [, navigate] = useLocation();
  const { setUser } = useAuthStore();
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setError("No token found. Please try signing in again.");
      setTimeout(() => navigate("/login"), 3000);
      return;
    }

    fetch(`/api/auth/social-token?token=${encodeURIComponent(token)}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) throw new Error(data.message || "Authentication failed");
        setUser(data.user);
        navigate("/account");
      })
      .catch((err) => {
        setError(err.message || "Authentication failed. Please try again.");
        setTimeout(() => navigate("/login"), 3000);
      });
  }, []);

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        flexDirection: "column",
        gap: "1.5rem",
        textAlign: "center",
      }}
    >
      {error ? (
        <>
          <div
            style={{
              padding: "1rem 1.5rem",
              background: "hsla(0,72%,51%,0.1)",
              border: "1px solid hsla(0,72%,51%,0.3)",
              borderRadius: "0.75rem",
              color: "hsl(0,72%,65%)",
              fontSize: "0.875rem",
              maxWidth: "380px",
            }}
          >
            {error}
          </div>
          <p style={{ fontSize: "0.8rem", color: "hsl(220,10%,45%)" }}>Redirecting you back to login…</p>
        </>
      ) : (
        <>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "0.75rem",
              background: "hsla(258,90%,66%,0.12)",
              border: "1px solid hsla(258,90%,66%,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap size={24} style={{ color: "hsl(258,90%,70%)" }} />
          </div>
          <div>
            <p style={{ fontSize: "1rem", fontWeight: 600, color: "hsl(210,40%,90%)", marginBottom: "0.4rem" }}>
              Completing sign-in…
            </p>
            <p style={{ fontSize: "0.82rem", color: "hsl(220,10%,50%)" }}>Please wait while we log you in.</p>
          </div>
        </>
      )}
    </div>
  );
}
