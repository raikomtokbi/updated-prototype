import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Zap, Eye, EyeOff, LogIn, KeyRound } from "lucide-react";
import { SiFacebook, SiDiscord } from "react-icons/si";
import GoogleIcon from "@/components/icons/GoogleIcon";
import { useAuthStore } from "@/lib/store/authstore";

interface SocialProviders {
  enabled: boolean;
  google: boolean;
  facebook: boolean;
  discord: boolean;
}

export default function Login() {
  const [, navigate] = useLocation();
  const { setUser, isAuthenticated } = useAuthStore();
  const { data: siteSettings } = useQuery<Record<string, string>>({ queryKey: ["/api/site-settings"], staleTime: 60000 });
  const siteLogo = siteSettings?.site_logo || "";
  const siteName = siteSettings?.site_name || "Nexcoin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [socialProviders, setSocialProviders] = useState<SocialProviders>({ enabled: false, google: false, facebook: false, discord: false });

  useEffect(() => {
    // Check URL error from OAuth redirect
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get("error");
    if (urlError) setError(urlError);

    fetch("/api/auth/social-providers")
      .then((r) => r.json())
      .then((data) => setSocialProviders(data))
      .catch(() => {});
  }, []);

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

  const hasSocial = socialProviders.enabled && (socialProviders.google || socialProviders.facebook || socialProviders.discord);

  const socialBtnStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.6rem",
    width: "100%",
    padding: "0.6rem 1rem",
    borderRadius: "0.5rem",
    background: "hsl(var(--border))",
    border: "1px solid hsl(var(--border))",
    color: "hsl(var(--foreground))",
    fontSize: "0.68rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.15s",
  };

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
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "1rem",
          padding: "2.5rem",
          position: "relative",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          {siteLogo ? (
            <img
              src={siteLogo}
              alt={siteName}
              style={{ width: "56px", height: "56px", objectFit: "contain", borderRadius: "0.75rem", margin: "0 auto 1rem", display: "block" }}
            />
          ) : (
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "0.75rem",
                background: "hsl(var(--primary) / 0.12)",
                border: "1px solid hsl(var(--primary) / 0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 1rem",
              }}
            >
              <Zap size={24} style={{ color: "hsl(var(--primary))" }} />
            </div>
          )}
          <h1
            className="font-orbitron"
            style={{ fontSize: "1.5rem", fontWeight: 800, color: "hsl(var(--foreground))", marginBottom: "0.4rem" }}
          >
            Welcome Back
          </h1>
          <p style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))" }}>Sign in to your {siteName} account</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label
              htmlFor="username"
              style={{ display: "block", fontSize: "0.68rem", fontWeight: 600, color: "hsl(var(--muted-foreground))", marginBottom: "0.4rem" }}
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
                style={{ fontSize: "0.68rem", fontWeight: 600, color: "hsl(var(--muted-foreground))" }}
              >
                Password
              </label>
              <Link
                href="/auth/forgot-password"
                style={{
                  fontSize: "0.68rem",
                  color: "hsl(var(--primary))",
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
                  color: "hsl(var(--muted-foreground))",
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
                fontSize: "0.68rem",
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

        {hasSocial && (
          <div style={{ marginTop: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ flex: 1, height: "1px", background: "hsl(var(--border))" }} />
              <span style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap" }}>or continue with</span>
              <div style={{ flex: 1, height: "1px", background: "hsl(var(--border))" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {socialProviders.google && (
                <a
                  href="/api/auth/oauth/google"
                  style={{ textDecoration: "none" }}
                  data-testid="button-social-google"
                >
                  <div style={socialBtnStyle}>
                    <GoogleIcon size={18} />
                    Continue with Google
                  </div>
                </a>
              )}
              {socialProviders.facebook && (
                <a
                  href="/api/auth/oauth/facebook"
                  style={{ textDecoration: "none" }}
                  data-testid="button-social-facebook"
                >
                  <div style={socialBtnStyle}>
                    <SiFacebook size={16} style={{ color: "#1877F2" }} />
                    Continue with Facebook
                  </div>
                </a>
              )}
              {socialProviders.discord && (
                <a
                  href="/api/auth/oauth/discord"
                  style={{ textDecoration: "none" }}
                  data-testid="button-social-discord"
                >
                  <div style={socialBtnStyle}>
                    <SiDiscord size={16} style={{ color: "#5865F2" }} />
                    Continue with Discord
                  </div>
                </a>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))" }}>
            Don't have an account?{" "}
            <Link
              href="/register"
              style={{ color: "hsl(var(--primary))", textDecoration: "none", fontWeight: 600 }}
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
