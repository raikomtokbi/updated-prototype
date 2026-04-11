import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Zap, ShieldCheck, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function VerifyResetOtp() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const tokenId = params.get("tid") ?? "";

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!tokenId) {
    return (
      <div
        style={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "hsl(0,72%,65%)", marginBottom: "1rem" }}>
            Invalid or missing reset session.
          </p>
          <Link href="/auth/forgot-password" style={{ color: "hsl(var(--primary))" }}>
            Request a new OTP
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!otp.trim()) {
      setError("Please enter the OTP.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token_id: tokenId, otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Verification failed");
        return;
      }
      navigate(`/auth/reset-password?rt=${encodeURIComponent(data.reset_token)}`);
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
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "1rem",
          padding: "2.5rem",
          position: "relative",
        }}
      >
        <Link
          href="/auth/forgot-password"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            fontSize: "0.68rem",
            color: "hsl(var(--muted-foreground))",
            textDecoration: "none",
            marginBottom: "1.75rem",
          }}
          data-testid="link-back-to-forgot"
        >
          <ArrowLeft size={14} />
          Back
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
            <ShieldCheck size={24} style={{ color: "hsl(var(--primary))" }} />
          </div>
          <h1
            className="font-orbitron"
            style={{
              fontSize: "1.4rem",
              fontWeight: 800,
              color: "hsl(var(--foreground))",
              marginBottom: "0.4rem",
            }}
          >
            Enter OTP
          </h1>
          <p style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))" }}>
            Enter the 6-digit code sent to your registered email. It expires in 10 minutes.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div>
            <label
              htmlFor="otp"
              style={{
                display: "block",
                fontSize: "0.68rem",
                fontWeight: 600,
                color: "hsl(220,10%,65%)",
                marginBottom: "0.4rem",
              }}
            >
              OTP Code
            </label>
            <input
              id="otp"
              className="input-field"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              autoComplete="one-time-code"
              style={{ textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.4em" }}
              data-testid="input-otp"
            />
          </div>

          {error && (
            <div
              data-testid="text-otp-error"
              style={{
                padding: "0.7rem 1rem",
                background: "hsla(0,72%,51%,0.1)",
                border: "1px solid hsla(0,72%,51%,0.3)",
                borderRadius: "0.5rem",
                color: "hsl(0,72%,65%)",
                fontSize: "0.68rem",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: "100%", marginTop: "0.25rem" }}
            disabled={loading || otp.length < 6}
            data-testid="button-verify-otp"
          >
            {loading ? (
              "Verifying..."
            ) : (
              <>
                <CheckCircle2 size={15} />
                Verify OTP
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))" }}>
            Didn't receive it?{" "}
            <Link
              href="/auth/forgot-password"
              style={{
                color: "hsl(var(--primary))",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              Request a new OTP
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
