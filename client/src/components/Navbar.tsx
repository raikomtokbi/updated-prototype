import { Link, useLocation } from "wouter";
import { ShoppingCart, User, Zap, Menu, X, Search, Gamepad2 } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "@/lib/store/cartStore";
import { useAuthStore } from "@/lib/store/authstore";

const NAV_LINKS = [
  { href: "/products", label: "Games" },
  { href: "/products", label: "Gift Cards" },
  { href: "/", label: "Support" },
];

export default function Navbar() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const itemCount = useCartStore((s) => s.getItemCount());
  const { isAuthenticated, user } = useAuthStore();

  return (
    <>
      <nav
        style={{
          background: "rgba(7, 11, 20, 0.92)",
          borderBottom: "1px solid rgba(124, 58, 237, 0.18)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        }}
      >
        <div
          style={{
            maxWidth: "1320px",
            margin: "0 auto",
            padding: "0 1.5rem",
            display: "flex",
            alignItems: "center",
            height: "64px",
            gap: "1.25rem",
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}
            data-testid="link-home"
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #7c3aed, #9333ea)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 12px rgba(124, 58, 237, 0.5)",
              }}
            >
              <Zap size={16} color="white" />
            </div>
            <span
              className="font-orbitron"
              style={{
                fontSize: "1.1rem",
                fontWeight: 800,
                letterSpacing: "0.05em",
                background: "linear-gradient(135deg, #a78bfa, #22d3ee)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              NEXCOIN
            </span>
          </Link>

          {/* Search bar */}
          <div
            style={{
              flex: 1,
              maxWidth: "360px",
              position: "relative",
            }}
            className="search-bar-desktop"
          >
            <Search
              size={14}
              style={{
                position: "absolute",
                left: "0.85rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "rgba(148, 163, 184, 0.6)",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder="Search games, gift cards..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              data-testid="input-navbar-search"
              style={{
                width: "100%",
                padding: "0.45rem 1rem 0.45rem 2.25rem",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(124, 58, 237, 0.2)",
                borderRadius: "8px",
                color: "#e5e7eb",
                fontSize: "0.8rem",
                outline: "none",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124, 58, 237, 0.6)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(124, 58, 237, 0.2)"; }}
            />
          </div>

          {/* Nav links */}
          <div
            style={{ display: "flex", alignItems: "center", gap: "0.125rem" }}
            className="nav-links-desktop"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                style={{
                  padding: "0.4rem 0.85rem",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  color: "rgba(148, 163, 184, 0.9)",
                  transition: "color 0.15s",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#a78bfa"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(148, 163, 184, 0.9)"; }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right section */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginLeft: "auto" }}>
            {/* Cart */}
            <Link
              href="/cart"
              data-testid="link-cart"
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                border: "1px solid rgba(124, 58, 237, 0.25)",
                background: "rgba(124, 58, 237, 0.08)",
                color: "rgba(148, 163, 184, 0.85)",
                textDecoration: "none",
                transition: "border-color 0.2s, color 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(124, 58, 237, 0.6)";
                (e.currentTarget as HTMLElement).style.color = "#a78bfa";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(124, 58, 237, 0.25)";
                (e.currentTarget as HTMLElement).style.color = "rgba(148, 163, 184, 0.85)";
              }}
            >
              <ShoppingCart size={16} />
              {itemCount > 0 && (
                <span
                  data-testid="badge-cart-count"
                  style={{
                    position: "absolute",
                    top: "-5px",
                    right: "-5px",
                    background: "#7c3aed",
                    color: "white",
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    borderRadius: "9999px",
                    minWidth: "16px",
                    height: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 3px",
                    boxShadow: "0 0 8px rgba(124, 58, 237, 0.6)",
                  }}
                >
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Auth */}
            {isAuthenticated ? (
              <Link
                href="/account"
                data-testid="link-account"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.4rem 0.85rem",
                  borderRadius: "8px",
                  background: "rgba(124, 58, 237, 0.12)",
                  border: "1px solid rgba(124, 58, 237, 0.35)",
                  color: "#a78bfa",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                <User size={13} />
                {user?.username}
              </Link>
            ) : (
              <Link
                href="/login"
                data-testid="link-login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.45rem 1rem",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                  color: "white",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  boxShadow: "0 0 14px rgba(124, 58, 237, 0.35)",
                  whiteSpace: "nowrap",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.88"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                <User size={13} />
                Login
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              data-testid="button-mobile-menu"
              className="mobile-menu-btn"
              style={{
                display: "none",
                alignItems: "center",
                justifyContent: "center",
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                background: "rgba(124,58,237,0.1)",
                border: "1px solid rgba(124,58,237,0.25)",
                color: "#a78bfa",
                cursor: "pointer",
              }}
            >
              {menuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            style={{
              borderTop: "1px solid rgba(124, 58, 237, 0.15)",
              padding: "1rem 1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <input
              type="text"
              placeholder="Search games..."
              style={{
                width: "100%",
                padding: "0.6rem 1rem",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(124, 58, 237, 0.25)",
                borderRadius: "8px",
                color: "#e5e7eb",
                fontSize: "0.85rem",
                outline: "none",
                marginBottom: "0.25rem",
              }}
            />
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                style={{
                  padding: "0.65rem 0.9rem",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  color: "rgba(148, 163, 184, 0.9)",
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Spacer for fixed navbar */}
      <div style={{ height: "64px" }} />
    </>
  );
}
