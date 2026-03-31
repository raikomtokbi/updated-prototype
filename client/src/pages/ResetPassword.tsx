import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { Lock, Eye, EyeOff, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const resetToken = params.get("rt") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!resetToken) {
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
          <Link href="/auth/forgot-password" style={{ color: "hsl(258,90%,70%)" }}>
            Request a new OTP
          </Link>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset_token: resetToken, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "Reset failed");
        return;
      }
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2500);
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
        {!success && (
          <Link
            href="/auth/verify-reset-otp"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.8rem",
              color: "hsl(220,10%,50%)",
              textDecoration: "none",
              marginBottom: "1.75rem",
            }}
            data-testid="link-back-to-otp"
          >
            <ArrowLeft size={14} />
            Back
          </Link>
        )}

        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "0.75rem",
              background: success ? "hsla(142,72%,45%,0.12)" : "hsla(258,90%,66%,0.12)",
              border: `1px solid ${success ? "hsla(142,72%,45%,0.3)" : "hsla(258,90%,66%,0.25)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
            }}
          >
            {success ? (
              <CheckCircle2 size={24} style={{ color: "hsl(142,72%,60%)" }} />
            ) : (
              <Lock size={24} style={{ color: "hsl(258,90%,70%)" }} />
            )}
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
            {success ? "Password Updated" : "Set New Password"}
          </h1>
          <p style={{ fontSize: "0.85rem", color: "hsl(220,10%,50%)" }}>
            {success
              ? "Your password has been changed. Redirecting to login..."
              : "Choose a strong password of at least 8 characters."}
          </p>
        </div>

        {success && (
          <div
            style={{
              padding: "0.9rem 1rem",
              background: "hsla(142,72%,45%,0.1)",
              border: "1px solid hsla(142,72%,45%,0.3)",
              borderRadius: "0.5rem",
              color: "hsl(142,72%,60%)",
              fontSize: "0.85rem",
              textAlign: "center",
            }}
          >
            Password reset successful! Redirecting...
          </div>
        )}

        {!success && (
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div>
              <label
                htmlFor="new-password"
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "hsl(220,10%,65%)",
                  marginBottom: "0.4rem",
                }}
              >
                New Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="new-password"
                  className="input-field"
                  type={showNew ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  style={{ paddingRight: "2.5rem" }}
                  data-testid="input-new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  style={{
                    position: "absolute",
                    right: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "hsl(220,10%,45%)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                  data-testid="button-toggle-new-password"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "hsl(220,10%,65%)",
                  marginBottom: "0.4rem",
                }}
              >
                Confirm Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="confirm-password"
                  className="input-field"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  style={{ paddingRight: "2.5rem" }}
                  data-testid="input-confirm-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{
                    position: "absolute",
                    right: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "hsl(220,10%,45%)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                  }}
                  data-testid="button-toggle-confirm-password"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {newPassword.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                {[
                  { label: "At least 8 characters", ok: newPassword.length >= 8 },
                  {
                    label: "Passwords match",
                    ok: newPassword === confirmPassword && confirmPassword.length > 0,
                  },
                ].map(({ label, ok }) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      fontSize: "0.75rem",
                      color: ok ? "hsl(142,72%,60%)" : "hsl(220,10%,45%)",
                    }}
                  >
                    <div
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: ok ? "hsl(142,72%,60%)" : "hsl(220,15%,30%)",
                        flexShrink: 0,
                      }}
                    />
                    {label}
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div
                data-testid="text-reset-error"
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

            <button
              type="submit"
              className="btn-primary"
              style={{ width: "100%", marginTop: "0.25rem" }}
              disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
              data-testid="button-reset-password"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
