import { Link, useLocation } from "wouter";
import { ShoppingCart, User, Zap, Menu, X } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "@/lib/store/cartStore";
import { useAuthStore } from "@/lib/store/authstore";

export default function Navbar() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const itemCount = useCartStore((s) => s.getItemCount());
  const { isAuthenticated, user } = useAuthStore();

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/products", label: "Products" },
  ];

  return (
    <nav
      style={{
        background: "rgba(8, 11, 18, 0.95)",
        borderBottom: "1px solid hsl(220, 15%, 16%)",
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "64px",
          gap: "1rem",
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Zap size={22} style={{ color: "hsl(258, 90%, 66%)" }} />
          <span
            className="font-orbitron"
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              background: "linear-gradient(135deg, hsl(258,90%,70%), hsl(196,100%,50%))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            NEXCOIN
          </span>
        </Link>

        {/* Desktop links */}
        <div style={{ display: "flex", gap: "0.25rem", flex: 1, paddingLeft: "2rem" }} className="hidden-mobile">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: "0.4rem 0.9rem",
                borderRadius: "0.4rem",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: location === link.href ? "hsl(258, 90%, 75%)" : "hsl(220, 10%, 65%)",
                background: location === link.href ? "hsla(258, 90%, 66%, 0.12)" : "transparent",
                transition: "color 0.15s, background 0.15s",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Cart */}
          <Link
            href="/cart"
            data-testid="link-cart"
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "38px",
              height: "38px",
              borderRadius: "0.5rem",
              color: location === "/cart" ? "hsl(258, 90%, 75%)" : "hsl(220, 10%, 65%)",
              background: location === "/cart" ? "hsla(258, 90%, 66%, 0.12)" : "transparent",
              border: "1px solid hsl(220, 15%, 20%)",
              textDecoration: "none",
              transition: "color 0.15s, border-color 0.15s",
            }}
          >
            <ShoppingCart size={18} />
            {itemCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "-6px",
                  right: "-6px",
                  background: "hsl(258, 90%, 60%)",
                  color: "white",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  borderRadius: "9999px",
                  minWidth: "18px",
                  height: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 4px",
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
                gap: "0.5rem",
                padding: "0.4rem 0.9rem",
                borderRadius: "0.5rem",
                background: "hsla(258, 90%, 66%, 0.1)",
                border: "1px solid hsla(258, 90%, 66%, 0.3)",
                color: "hsl(258, 90%, 75%)",
                fontSize: "0.8rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              <User size={14} />
              {user?.username}
            </Link>
          ) : (
            <Link href="/login" data-testid="link-login" className="btn-primary" style={{ padding: "0.45rem 1.1rem", fontSize: "0.8rem" }}>
              Sign In
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            data-testid="button-mobile-menu"
            style={{
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              width: "38px",
              height: "38px",
              borderRadius: "0.5rem",
              background: "transparent",
              border: "1px solid hsl(220, 15%, 20%)",
              color: "hsl(220, 10%, 65%)",
              cursor: "pointer",
            }}
            className="show-mobile"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div
          style={{
            borderTop: "1px solid hsl(220, 15%, 16%)",
            padding: "0.75rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.25rem",
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: "0.6rem 0.9rem",
                borderRadius: "0.4rem",
                textDecoration: "none",
                fontSize: "0.9rem",
                fontWeight: 500,
                color: location === link.href ? "hsl(258, 90%, 75%)" : "hsl(220, 10%, 70%)",
                background: location === link.href ? "hsla(258, 90%, 66%, 0.12)" : "transparent",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
