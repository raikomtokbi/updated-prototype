import { useState, useEffect } from "react";

const STORAGE_KEY = "nexcoin_cookie_consent";

export default function CookieBanner({ enabled }: { enabled: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const accepted = localStorage.getItem(STORAGE_KEY);
    if (!accepted) setVisible(true);
  }, [enabled]);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      data-testid="cookie-banner"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9998,
        background: "hsl(var(--card))",
        borderTop: "1px solid hsl(220, 15%, 18%)",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "13px",
          color: "hsl(210, 30%, 75%)",
          flex: 1,
          minWidth: "240px",
          lineHeight: 1.6,
        }}
      >
        We use cookies to enhance your experience. By continuing to browse this site you agree to our use of cookies.{" "}
        <a
          href="/privacy"
          style={{ color: "hsl(var(--primary))", textDecoration: "none" }}
        >
          Learn more
        </a>
      </p>
      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        <button
          data-testid="button-cookie-decline"
          onClick={decline}
          style={{
            padding: "7px 16px",
            borderRadius: "6px",
            border: "1px solid hsl(220, 15%, 22%)",
            background: "transparent",
            color: "hsl(220, 10%, 55%)",
            fontSize: "12px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Decline
        </button>
        <button
          data-testid="button-cookie-accept"
          onClick={accept}
          style={{
            padding: "7px 16px",
            borderRadius: "6px",
            border: "none",
            background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.75))",
            color: "white",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Accept Cookies
        </button>
      </div>
    </div>
  );
}
