import { Link, useLocation } from "wouter";
import { ShoppingCart, User, Zap, Menu, X, Search, LogOut } from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCartStore } from "@/lib/store/cartStore";
import { useAuthStore } from "@/lib/store/authstore";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Games" },
  { href: "/offers", label: "Offers" },
  { href: "/support", label: "Support" },
  { href: "/about", label: "About" },
];

export default function Navbar() {
  const [location, navigate] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const itemCount = useCartStore((s) => s.getItemCount());
  const { isAuthenticated, user, logout } = useAuthStore();

  const { data: siteSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
    staleTime: 0,
  });
  const siteName = siteSettings?.site_name?.toUpperCase() || "NEXCOIN";
  const siteLogo = siteSettings?.site_logo || "";

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [location]);
  // Lock scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const announcementEnabled = siteSettings?.announcement_enabled === "true";
  const announcementText = siteSettings?.announcement_text || "";
  const showAnnouncement = announcementEnabled && !!announcementText;
  const announcementBarHeight = 36;

  return (
    <>
      {showAnnouncement && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1001,
            height: `${announcementBarHeight}px`,
            background: "linear-gradient(90deg, hsl(258,90%,30%) 0%, hsl(258,80%,22%) 100%)",
            borderBottom: "1px solid rgba(124,58,237,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.78rem",
            fontWeight: 500,
            color: "hsl(210,40%,92%)",
            letterSpacing: "0.01em",
            padding: "0 1rem",
          }}
        >
          {announcementText}
        </div>
      )}
      <nav
        style={{
          background: "rgba(7, 11, 20, 0.95)",
          borderBottom: "1px solid rgba(124, 58, 237, 0.18)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          position: "fixed",
          top: showAnnouncement ? `${announcementBarHeight}px` : 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        }}
      >
        <div
          style={{
            maxWidth: "1320px",
            margin: "0 auto",
            padding: "0 1rem",
            display: "flex",
            alignItems: "center",
            height: "60px",
            gap: "0.75rem",
          }}
        >
          {/* Logo */}
          <Link
            href="/"
            style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.45rem", flexShrink: 0 }}
            data-testid="link-home"
          >
            {siteLogo ? (
              <img
                src={siteLogo}
                alt={siteName}
                style={{ width: "30px", height: "30px", borderRadius: "7px", objectFit: "contain", flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: "30px",
                  height: "30px",
                  borderRadius: "7px",
                  background: "linear-gradient(135deg, #7c3aed, #9333ea)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 10px rgba(124, 58, 237, 0.5)",
                  flexShrink: 0,
                }}
              >
                <Zap size={15} color="white" />
              </div>
            )}
            <span
              className="font-orbitron"
              style={{
                fontSize: "1rem",
                fontWeight: 800,
                letterSpacing: "0.05em",
                background: "linear-gradient(135deg, #a78bfa, #22d3ee)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {siteName}
            </span>
          </Link>

          {/* Desktop: search bar */}
          <div
            className="search-bar-desktop"
            style={{ flex: 1, maxWidth: "360px", position: "relative" }}
          >
            <Search
              size={13}
              style={{
                position: "absolute",
                left: "0.8rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "rgba(148, 163, 184, 0.5)",
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
                padding: "0.42rem 1rem 0.42rem 2.1rem",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(124, 58, 237, 0.2)",
                borderRadius: "8px",
                color: "#e5e7eb",
                fontSize: "0.78rem",
                outline: "none",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(124, 58, 237, 0.55)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(124, 58, 237, 0.2)"; }}
            />
          </div>

          {/* Desktop: nav links */}
          <div className="nav-links-desktop" style={{ display: "flex", alignItems: "center", gap: "0.1rem" }}>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                style={{
                  padding: "0.38rem 0.8rem",
                  borderRadius: "6px",
                  textDecoration: "none",
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  color: location === link.href ? "#a78bfa" : "rgba(148, 163, 184, 0.85)",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#a78bfa"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = location === link.href ? "#a78bfa" : "rgba(148, 163, 184, 0.85)"; }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} className="nav-links-desktop" />

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginLeft: "auto" }}>

            {/* Mobile: search icon toggle */}
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="mobile-only"
              aria-label="Search"
              style={{
                display: "none",
                alignItems: "center",
                justifyContent: "center",
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: "rgba(124,58,237,0.08)",
                border: "1px solid rgba(124,58,237,0.22)",
                color: "#a78bfa",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <Search size={15} />
            </button>

            {/* Cart */}
            <Link
              href="/cart"
              data-testid="link-cart"
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                border: "1px solid rgba(124, 58, 237, 0.25)",
                background: "rgba(124, 58, 237, 0.08)",
                color: "rgba(148, 163, 184, 0.85)",
                textDecoration: "none",
                flexShrink: 0,
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
              <ShoppingCart size={15} />
              {itemCount > 0 && (
                <span
                  data-testid="badge-cart-count"
                  style={{
                    position: "absolute",
                    top: "-5px",
                    right: "-5px",
                    background: "#7c3aed",
                    color: "white",
                    fontSize: "0.58rem",
                    fontWeight: 700,
                    borderRadius: "9999px",
                    minWidth: "15px",
                    height: "15px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 2px",
                  }}
                >
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Desktop: auth buttons */}
            {isAuthenticated ? (
              <Link
                href="/account"
                data-testid="link-account"
                className="desktop-only"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.38rem 0.85rem",
                  borderRadius: "8px",
                  background: "rgba(124, 58, 237, 0.12)",
                  border: "1px solid rgba(124, 58, 237, 0.35)",
                  color: "#a78bfa",
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                <User size={12} />
                {user?.username}
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  data-testid="link-register"
                  className="desktop-only"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0.38rem 0.9rem",
                    borderRadius: "8px",
                    background: "transparent",
                    border: "1px solid rgba(124, 58, 237, 0.42)",
                    color: "#a78bfa",
                    fontSize: "0.76rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.8)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(124,58,237,0.42)"; }}
                >
                  Register
                </Link>
                <Link
                  href="/login"
                  data-testid="link-login"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    padding: "0.38rem 0.9rem",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                    color: "white",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    boxShadow: "0 0 12px rgba(124, 58, 237, 0.3)",
                    flexShrink: 0,
                  }}
                >
                  <User size={12} />
                  Login
                </Link>
              </>
            )}

            {/* Hamburger — mobile only */}
            <button
              onClick={() => setDrawerOpen(true)}
              data-testid="button-mobile-menu"
              className="mobile-menu-btn"
              aria-label="Open menu"
              style={{
                display: "none",
                alignItems: "center",
                justifyContent: "center",
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: "rgba(124,58,237,0.1)",
                border: "1px solid rgba(124,58,237,0.25)",
                color: "#a78bfa",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <Menu size={17} />
            </button>
          </div>
        </div>

        {/* Mobile: expandable search bar */}
        {searchOpen && (
          <div
            className="mobile-only"
            style={{
              padding: "0.6rem 1rem",
              borderTop: "1px solid rgba(124,58,237,0.12)",
            }}
          >
            <input
              type="text"
              placeholder="Search games, gift cards..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              autoFocus
              style={{
                width: "100%",
                padding: "0.55rem 1rem",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(124, 58, 237, 0.3)",
                borderRadius: "8px",
                color: "#e5e7eb",
                fontSize: "0.85rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        )}
      </nav>

      {/* Spacer */}
      <div style={{ height: "60px" }} />

      {/* Drawer backdrop */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 1100,
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* Slide-from-right drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(320px, 88vw)",
          background: "hsl(220, 22%, 8%)",
          borderLeft: "1px solid rgba(124,58,237,0.2)",
          zIndex: 1200,
          display: "flex",
          flexDirection: "column",
          transform: drawerOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* Drawer header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.25rem",
            borderBottom: "1px solid rgba(124,58,237,0.15)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            {siteLogo ? (
              <img
                src={siteLogo}
                alt={siteName}
                style={{ width: "26px", height: "26px", borderRadius: "6px", objectFit: "contain" }}
              />
            ) : (
              <div
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "6px",
                  background: "linear-gradient(135deg, #7c3aed, #9333ea)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Zap size={13} color="white" />
              </div>
            )}
            <span
              className="font-orbitron"
              style={{
                fontSize: "0.9rem",
                fontWeight: 800,
                background: "linear-gradient(135deg, #a78bfa, #22d3ee)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {siteName}
            </span>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "7px",
              background: "rgba(124,58,237,0.1)",
              border: "1px solid rgba(124,58,237,0.2)",
              color: "#a78bfa",
              cursor: "pointer",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Drawer nav links */}
        <nav style={{ padding: "0.75rem 0.75rem 0", flex: 1, overflowY: "auto" }}>
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setDrawerOpen(false)}
              style={{
                display: "block",
                padding: "0.75rem 0.9rem",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "0.92rem",
                fontWeight: 500,
                color: location === link.href ? "#a78bfa" : "rgba(203, 213, 225, 0.85)",
                background: location === link.href ? "rgba(124,58,237,0.1)" : "transparent",
                marginBottom: "2px",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.08)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = location === link.href ? "rgba(124,58,237,0.1)" : "transparent"; }}
            >
              {link.label}
            </Link>
          ))}

          {/* Auth links in drawer */}
          <div
            style={{
              marginTop: "1rem",
              paddingTop: "1rem",
              borderTop: "1px solid rgba(124,58,237,0.12)",
            }}
          >
            {isAuthenticated ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <Link
                  href="/account"
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.75rem 0.9rem",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: "#a78bfa",
                    background: "rgba(124,58,237,0.1)",
                    border: "1px solid rgba(124,58,237,0.25)",
                  }}
                >
                  <User size={15} />
                  {user?.username ?? "My Account"}
                </Link>
                <button
                  data-testid="drawer-button-logout"
                  onClick={() => {
                    logout();
                    setDrawerOpen(false);
                    navigate("/");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    padding: "0.75rem 0.9rem",
                    borderRadius: "8px",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: "#f87171",
                    background: "rgba(248,113,113,0.1)",
                    border: "1px solid rgba(248,113,113,0.3)",
                    cursor: "pointer",
                    width: "100%",
                    textAlign: "center",
                  }}
                >
                  <LogOut size={15} />
                  Logout
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <Link
                  href="/register"
                  data-testid="drawer-link-register"
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    display: "block",
                    padding: "0.7rem 0.9rem",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontSize: "0.88rem",
                    fontWeight: 600,
                    color: "#a78bfa",
                    border: "1px solid rgba(124,58,237,0.4)",
                    textAlign: "center",
                  }}
                >
                  Register
                </Link>
                <Link
                  href="/login"
                  data-testid="drawer-link-login"
                  onClick={() => setDrawerOpen(false)}
                  style={{
                    display: "block",
                    padding: "0.7rem 0.9rem",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontSize: "0.88rem",
                    fontWeight: 700,
                    color: "white",
                    background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                    textAlign: "center",
                    boxShadow: "0 0 12px rgba(124,58,237,0.25)",
                  }}
                >
                  Login
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* CSS for show/hide on mobile vs desktop */}
      <style>{`
        @media (max-width: 768px) {
          .search-bar-desktop { display: none !important; }
          .nav-links-desktop { display: none !important; }
          .desktop-only { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .mobile-only { display: block !important; }
        }
        @media (min-width: 769px) {
          .mobile-menu-btn { display: none !important; }
          .mobile-only { display: none !important; }
          .desktop-only { display: inline-flex !important; }
        }
      `}</style>
    </>
  );
}
