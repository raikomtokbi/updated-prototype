import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Zap, Eye, EyeOff, UserPlus } from "lucide-react";
import { SiFacebook, SiDiscord } from "react-icons/si";
import GoogleIcon from "@/components/icons/GoogleIcon";
import { useAuthStore } from "@/lib/store/authstore";

interface SocialProviders {
  enabled: boolean;
  google: boolean;
  facebook: boolean;
  discord: boolean;
}

export default function Register() {
  const [, navigate] = useLocation();
  const { isAuthenticated, setUser } = useAuthStore();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [socialProviders, setSocialProviders] = useState<SocialProviders>({ enabled: false, google: false, facebook: false, discord: false });

  useEffect(() => {
    fetch("/api/auth/social-providers")
      .then((r) => r.json())
      .then((data) => setSocialProviders(data))
      .catch(() => {});
  }, []);

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
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, username, email, password, fullName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Registration failed");
      if (data.pending) {
        setSuccess(data.message || "Account created! Awaiting admin approval before you can log in.");
      } else if (data.user) {
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
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
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
            <Zap size={24} style={{ color: "hsl(var(--primary))" }} />
          </div>
          <h1
            className="font-orbitron"
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "hsl(var(--foreground))",
              marginBottom: "0.4rem",
            }}
          >
            Create Account
          </h1>
          <p style={{ fontSize: "0.85rem", color: "hsl(var(--muted-foreground))" }}>
            Join Nexcoin and start topping up instantly
          </p>
        </div>

        <form
          onSubmit={handleRegister}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label
                htmlFor="reg-firstname"
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "0.4rem",
                }}
              >
                First Name
              </label>
              <input
                id="reg-firstname"
                className="input-field"
                type="text"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="reg-lastname"
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "0.4rem",
                }}
              >
                Last Name
              </label>
              <input
                id="reg-lastname"
                className="input-field"
                type="text"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="reg-username"
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "hsl(var(--muted-foreground))",
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
                color: "hsl(var(--muted-foreground))",
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
              autoComplete="off"
            />
          </div>

          <div>
            <label
              htmlFor="reg-password"
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "hsl(var(--muted-foreground))",
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
                  color: "hsl(var(--muted-foreground))",
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
                color: "hsl(var(--muted-foreground))",
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

        {socialProviders.enabled && (socialProviders.google || socialProviders.facebook || socialProviders.discord) && (
          <div style={{ marginTop: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ flex: 1, height: "1px", background: "hsl(var(--border))" }} />
              <span style={{ fontSize: "0.75rem", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap" }}>or sign up with</span>
              <div style={{ flex: 1, height: "1px", background: "hsl(var(--border))" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {socialProviders.google && (
                <a href="/api/auth/oauth/google" style={{ textDecoration: "none" }} data-testid="button-social-google">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem", width: "100%", padding: "0.6rem 1rem", borderRadius: "0.5rem", background: "hsl(var(--border))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", fontSize: "0.85rem", fontWeight: 500, cursor: "pointer" }}>
                    <GoogleIcon size={18} />
                    Continue with Google
                  </div>
                </a>
              )}
              {socialProviders.facebook && (
                <a href="/api/auth/oauth/facebook" style={{ textDecoration: "none" }} data-testid="button-social-facebook">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem", width: "100%", padding: "0.6rem 1rem", borderRadius: "0.5rem", background: "hsl(var(--border))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", fontSize: "0.85rem", fontWeight: 500, cursor: "pointer" }}>
                    <SiFacebook size={16} style={{ color: "#1877F2" }} />
                    Continue with Facebook
                  </div>
                </a>
              )}
              {socialProviders.discord && (
                <a href="/api/auth/oauth/discord" style={{ textDecoration: "none" }} data-testid="button-social-discord">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.6rem", width: "100%", padding: "0.6rem 1rem", borderRadius: "0.5rem", background: "hsl(var(--border))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", fontSize: "0.85rem", fontWeight: 500, cursor: "pointer" }}>
                    <SiDiscord size={16} style={{ color: "#5865F2" }} />
                    Continue with Discord
                  </div>
                </a>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-foreground))" }}>
            Already have an account?{" "}
            <Link
              href="/login"
              style={{
                color: "hsl(var(--primary))",
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
