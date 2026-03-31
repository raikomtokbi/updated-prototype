import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Zap, KeyRound, ArrowLeft, Send } from "lucide-react";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!identifier.trim()) {
      setError("Please enter your email, username, or user ID.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setError(data.message);
        return;
      }
      setSuccess(data.message ?? "If an account was found, an OTP has been sent.");
      if (data.token_id) {
        setTimeout(() => navigate(`/auth/verify-reset-otp?tid=${data.token_id}`), 1800);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.5rem",
        position: "relative",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 50% 50% at 50% 50%, hsla(258,90%,66%,0.08) 0%, transparent 70%)",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "hsl(220,20%,9%)",
          border: "1px solid hsl(220,15%,18%)",
          borderRadius: "1rem",
          padding: "2.5rem",
          position: "relative",
        }}
      >
        <Link
          href="/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            fontSize: "0.8rem",
            color: "hsl(220,10%,50%)",
            textDecoration: "none",
            marginBottom: "1.75rem",
          }}
          data-testid="link-back-to-login"
        >
          <ArrowLeft size={14} />
          Back to login
        </Link>

        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
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
              margin: "0 auto 1rem",
            }}
          >
            <KeyRound size={24} style={{ color: "hsl(258,90%,70%)" }} />
          </div>
          <h1
            className="font-orbitron"
            style={{
              fontSize: "1.4rem",
              fontWeight: 800,
              color: "hsl(210,40%,95%)",
              marginBottom: "0.4rem",
            }}
          >
            Forgot Password
          </h1>
          <p style={{ fontSize: "0.85rem", color: "hsl(220,10%,50%)" }}>
            Enter your email, username, or user ID to receive a reset OTP.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div>
            <label
              htmlFor="identifier"
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "hsl(220,10%,65%)",
                marginBottom: "0.4rem",
              }}
            >
              Email / Username / User ID
            </label>
            <input
              id="identifier"
              className="input-field"
              type="text"
              placeholder="Enter your email, username, or ID"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoComplete="username"
              data-testid="input-identifier"
            />
          </div>

          {error && (
            <div
              data-testid="text-forgot-error"
              style={{
                padding: "0.7rem 1rem",
                background: "hsla(0,72%,51%,0.1)",
                border: "1px solid hsla(0,72%,51%,0.3)",
                borderRadius: "0.5rem",
                color: "hsl(0,72%,65%)",
                fontSize: "0.8rem",
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              data-testid="text-forgot-success"
              style={{
                padding: "0.7rem 1rem",
                background: "hsla(142,72%,45%,0.1)",
                border: "1px solid hsla(142,72%,45%,0.3)",
                borderRadius: "0.5rem",
                color: "hsl(142,72%,60%)",
                fontSize: "0.8rem",
              }}
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: "100%", marginTop: "0.25rem" }}
            disabled={loading || !!success}
            data-testid="button-send-otp"
          >
            {loading ? (
              "Sending OTP..."
            ) : (
              <>
                <Send size={15} />
                Send OTP
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.8rem", color: "hsl(220,10%,45%)" }}>
            Remember your password?{" "}
            <Link
              href="/login"
              style={{
                color: "hsl(258,90%,70%)",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
