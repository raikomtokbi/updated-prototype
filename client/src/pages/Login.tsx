import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Zap, Eye, EyeOff, LogIn, KeyRound } from "lucide-react";
import { useAuthStore } from "@/lib/store/authstore";

export default function Login() {
  const [, navigate] = useLocation();
  const { setUser, isAuthenticated } = useAuthStore();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (isAuthenticated) {
    navigate("/account");
    return null;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");
      setUser(data.user);
      navigate("/account");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
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
      {/* Bg glow */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background: "radial-gradient(ellipse 50% 50% at 50% 50%, hsla(258,90%,66%,0.08) 0%, transparent 70%)",
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
        {/* Logo */}
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
            <Zap size={24} style={{ color: "hsl(258,90%,70%)" }} />
          </div>
          <h1
            className="font-orbitron"
            style={{ fontSize: "1.5rem", fontWeight: 800, color: "hsl(210,40%,95%)", marginBottom: "0.4rem" }}
          >
            Welcome Back
          </h1>
          <p style={{ fontSize: "0.85rem", color: "hsl(220,10%,50%)" }}>Sign in to your Nexcoin account</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label
              htmlFor="username"
              style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220,10%,65%)", marginBottom: "0.4rem" }}
            >
              Username / Email / User ID
            </label>
            <input
              id="username"
              className="input-field"
              type="text"
              placeholder="Enter username, email, or user ID"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              data-testid="input-username"
            />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.4rem" }}>
              <label
                htmlFor="password"
                style={{ fontSize: "0.8rem", fontWeight: 600, color: "hsl(220,10%,65%)" }}
              >
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                style={{
                  fontSize: "0.75rem",
                  color: "hsl(258,90%,70%)",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.25rem",
                }}
                data-testid="link-forgot-password"
              >
                <KeyRound size={12} />
                Forgot Password?
              </Link>
            </div>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                className="input-field"
                type={showPw ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: "2.5rem" }}
                data-testid="input-password"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
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
                data-testid="button-toggle-password"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              data-testid="text-login-error"
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
            style={{ width: "100%", marginTop: "0.5rem" }}
            disabled={loading}
            data-testid="button-login"
          >
            {loading ? (
              "Signing in..."
            ) : (
              <>
                <LogIn size={16} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.8rem", color: "hsl(220,10%,45%)" }}>
            Don't have an account?{" "}
            <Link
              href="/register"
              style={{ color: "hsl(258,90%,70%)", textDecoration: "none", fontWeight: 600 }}
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
