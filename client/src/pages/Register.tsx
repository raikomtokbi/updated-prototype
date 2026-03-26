import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Zap, Eye, EyeOff, UserPlus } from "lucide-react";
import { useAuthStore } from "@/lib/store/authstore";

export default function Register() {
  const [, navigate] = useLocation();
  const { isAuthenticated, setUser } = useAuthStore();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (isAuthenticated) {
    navigate("/account");
    return null;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");
      if (data.user) {
        setUser(data.user, data.token);
        navigate("/account");
      } else {
        setSuccess("Account created! You can now sign in.");
      }
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
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "hsl(210,40%,95%)",
              marginBottom: "0.4rem",
            }}
          >
            Create Account
          </h1>
          <p style={{ fontSize: "0.85rem", color: "hsl(220,10%,50%)" }}>
            Join Nexcoin and start topping up instantly
          </p>
        </div>

        <form
          onSubmit={handleRegister}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div>
            <label
              htmlFor="reg-username"
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "hsl(220,10%,65%)",
                marginBottom: "0.4rem",
              }}
            >
              Username
            </label>
            <input
              id="reg-username"
              className="input-field"
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div>
            <label
              htmlFor="reg-email"
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "hsl(220,10%,65%)",
                marginBottom: "0.4rem",
              }}
            >
              Email
            </label>
            <input
              id="reg-email"
              className="input-field"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label
              htmlFor="reg-password"
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "hsl(220,10%,65%)",
                marginBottom: "0.4rem",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="reg-password"
                className="input-field"
                type={showPw ? "text" : "password"}
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingRight: "2.5rem" }}
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
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="reg-confirm"
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
            <input
              id="reg-confirm"
              className="input-field"
              type={showPw ? "text" : "password"}
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div
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
              style={{
                padding: "0.7rem 1rem",
                background: "hsla(142,76%,36%,0.1)",
                border: "1px solid hsla(142,76%,36%,0.3)",
                borderRadius: "0.5rem",
                color: "hsl(142,76%,55%)",
                fontSize: "0.8rem",
              }}
            >
              {success}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: "100%", marginTop: "0.5rem" }}
            disabled={loading}
          >
            {loading ? (
              "Creating account..."
            ) : (
              <>
                <UserPlus size={16} />
                Create Account
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.8rem", color: "hsl(220,10%,45%)" }}>
            Already have an account?{" "}
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
