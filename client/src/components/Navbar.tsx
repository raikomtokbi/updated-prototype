import { Link, useLocation } from "wouter";
import { ShoppingCart, User, Zap, Menu, X, Search, LogOut, Gamepad2, Gift, Ticket, RefreshCcw, Download } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCartStore } from "@/lib/store/cartStore";
import { useAuthStore } from "@/lib/store/authstore";
import { useIsLight } from "@/hooks/useIsLight";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Games" },
  { href: "/offers", label: "Offers" },
  { href: "/support", label: "Support" },
  { href: "/about", label: "About" },
];

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  game_currency: <Gamepad2 size={13} />,
  gift_card: <Gift size={13} />,
  voucher: <Ticket size={13} />,
  subscription: <RefreshCcw size={13} />,
};

const CATEGORY_LABEL: Record<string, string> = {
  game_currency: "Games",
  gift_card: "Gift Card",
  voucher: "Voucher",
  subscription: "Subscription",
};

interface SearchItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  imageUrl?: string;
  type: "game" | "product";
}

function useSearchDropdown(searchVal: string, onClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return containerRef;
}

function SearchDropdown({
  results,
  query,
  onSelect,
}: {
  results: SearchItem[];
  query: string;
  onSelect: (slug: string) => void;
}) {
  if (!query.trim() || results.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        left: 0,
        right: 0,
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--primary) / 0.3)",
        borderRadius: "10px",
        boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
        zIndex: 2000,
        overflow: "hidden",
        maxHeight: "360px",
        overflowY: "auto",
      }}
    >
      {results.slice(0, 8).map((item) => (
        <a
          key={item.id}
          href={`/products/${item.slug}`}
          onMouseDown={(e) => { e.preventDefault(); onSelect(item.slug); }}
          onClick={(e) => e.preventDefault()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "9px 12px",
            textDecoration: "none",
            borderBottom: "1px solid hsl(var(--primary) / 0.08)",
            transition: "background 0.12s",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "hsl(var(--primary) / 0.1)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
        >
          {/* Thumbnail */}
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              flexShrink: 0,
              overflow: "hidden",
              background: "hsl(var(--primary) / 0.12)",
              border: "1px solid hsl(var(--primary) / 0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "hsl(var(--primary) / 0.7)",
            }}
          >
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              CATEGORY_ICON[item.category] ?? <Gamepad2 size={13} />
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "0.68rem",
                fontWeight: 600,
                color: "hsl(var(--foreground))",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item.name}
            </div>
            <div style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))", marginTop: "1px" }}>
              {CATEGORY_LABEL[item.category] ?? item.category}
            </div>
          </div>

          {/* Arrow hint */}
          <div style={{ color: "hsl(var(--primary) / 0.4)", fontSize: "0.68rem", flexShrink: 0 }}>→</div>
        </a>
      ))}

      {results.length === 0 && query.trim() && (
        <div style={{ padding: "1rem", textAlign: "center", fontSize: "0.68rem", color: "hsl(var(--muted-foreground))" }}>
          No results for "{query}"
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const [location, navigate] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const itemCount = useCartStore((s) => s.getItemCount());
  const { isAuthenticated, user, logout } = useAuthStore();
  const isLight = useIsLight();
  const { canInstall, install } = useInstallPrompt();

  const { data: siteSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
    staleTime: 0,
  });
  const siteName = siteSettings?.site_name?.toUpperCase() || "NEXCOIN";
  const siteLogo = siteSettings?.site_logo || "";

  const { data: games = [] } = useQuery<any[]>({
    queryKey: ["/api/games"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/products"],
    staleTime: 5 * 60 * 1000,
  });

  const searchItems: SearchItem[] = useMemo(() => {
    const g: SearchItem[] = games
      .filter((g: any) => g.status === "active")
      .map((g: any) => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
        category: g.category ?? "game_currency",
        imageUrl: g.logoUrl || "",
        type: "game",
      }));
    const p: SearchItem[] = products
      .filter((p: any) => p.isActive)
      .map((p: any) => ({
        id: p.id,
        name: p.title,
        slug: p.slug,
        category: p.category,
        imageUrl: p.imageUrl || "",
        type: "product",
      }));
    return [...g, ...p];
  }, [games, products]);

  const filteredResults = useMemo(() => {
    if (!searchVal.trim()) return [];
    const q = searchVal.trim().toLowerCase();
    return searchItems.filter((item) => item.name.toLowerCase().includes(q));
  }, [searchItems, searchVal]);

  const showDropdown = dropdownOpen && searchVal.trim().length > 0;

  function handleSelect(slug?: string) {
    setSearchVal("");
    setDropdownOpen(false);
    setSearchOpen(false);
    if (slug) navigate(`/products/${slug}`);
  }

  const desktopRef = useSearchDropdown(searchVal, () => setDropdownOpen(false));

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
            background: "linear-gradient(90deg, hsl(var(--primary)) 0%, hsl(258,80%,22%) 100%)",
            borderBottom: "1px solid hsl(var(--primary) / 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.68rem",
            fontWeight: 500,
            color: "hsl(var(--foreground))",
            letterSpacing: "0.01em",
            padding: "0 1rem",
          }}
        >
          {announcementText}
        </div>
      )}
      <nav
        style={{
          background: isLight ? "rgba(255,255,255,0.93)" : "rgba(0, 0, 0, 0.88)",
          borderBottom: isLight ? "1px solid hsl(var(--border))" : "1px solid hsl(var(--primary) / 0.18)",
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
                  background: "linear-gradient(135deg, hsl(var(--primary)), #9333ea)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 10px hsl(var(--primary) / 0.5)",
                  flexShrink: 0,
                }}
              >
                <Zap size={15} color="white" />
              </div>
            )}
            <span
              className="font-orbitron"
              style={{
                fontSize: "0.9rem",
                fontWeight: 800,
                letterSpacing: "0.05em",
                ...(isLight
                  ? { color: "hsl(var(--foreground))" }
                  : {
                      background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }),
              }}
            >
              {siteName}
            </span>
          </Link>

          {/* Desktop: search bar with dropdown */}
          <div
            ref={desktopRef}
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
                color: isLight ? "hsl(var(--muted-foreground))" : "hsl(var(--muted-foreground))",
                pointerEvents: "none",
                zIndex: 1,
              }}
            />
            <input
              type="text"
              placeholder="Search games, gift cards..."
              value={searchVal}
              onChange={(e) => { setSearchVal(e.target.value); setDropdownOpen(true); }}
              onFocus={() => setDropdownOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setDropdownOpen(false); setSearchVal(""); }
              }}
              data-testid="input-navbar-search"
              style={{
                width: "100%",
                padding: "0.42rem 1rem 0.42rem 2.1rem",
                background: isLight ? "hsl(var(--input))" : "rgba(255,255,255,0.05)",
                border: `1px solid ${isLight ? "hsl(var(--border))" : "hsl(var(--primary) / 0.2)"}`,
                borderRadius: "8px",
                color: isLight ? "hsl(var(--foreground))" : "hsl(var(--foreground))",
                fontSize: "0.68rem",
                outline: "none",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "hsl(var(--primary) / 0.55)"; }}
              onMouseLeave={(e) => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = "hsl(var(--primary) / 0.2)"; }}
              onBlurCapture={(e) => { e.currentTarget.style.borderColor = "hsl(var(--primary) / 0.2)"; }}
            />
            {showDropdown && (
              <SearchDropdown
                results={filteredResults}
                query={searchVal}
                onSelect={handleSelect}
              />
            )}
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
                  fontSize: "0.68rem",
                  fontWeight: 500,
                  color: location === link.href ? "hsl(var(--primary))" : (isLight ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"),
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "hsl(var(--primary))"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = location === link.href ? "hsl(var(--primary))" : (isLight ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))"); }}
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
              onClick={() => { setSearchOpen(!searchOpen); setDropdownOpen(true); }}
              className="mobile-only"
              aria-label="Search"
              style={{
                alignItems: "center",
                justifyContent: "center",
                width: "34px",
                height: "34px",
                borderRadius: "8px",
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <Search size={15} />
            </button>

            {/* Install PWA */}
            {canInstall && (
              <button
                data-testid="button-install-pwa"
                onClick={install}
                aria-label="Install app"
                title="Add to home screen"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0 0.75rem",
                  height: "34px",
                  borderRadius: "8px",
                  background: "hsl(var(--primary) / 0.1)",
                  border: "1px solid hsl(var(--primary) / 0.35)",
                  color: "hsl(var(--primary))",
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "hsl(var(--primary) / 0.18)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "hsl(var(--primary) / 0.1)"; }}
              >
                <Download size={13} />
                <span className="desktop-only" style={{ display: "inline" }}>Install App</span>
              </button>
            )}

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
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
                color: "hsl(var(--foreground))",
                textDecoration: "none",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary))";
                (e.currentTarget as HTMLElement).style.color = "hsl(var(--primary))";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--border))";
                (e.currentTarget as HTMLElement).style.color = "hsl(var(--foreground))";
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
                    background: "hsl(var(--primary))",
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
                  background: "hsl(var(--primary) / 0.12)",
                  border: "1px solid hsl(var(--primary) / 0.35)",
                  color: "hsl(var(--primary))",
                  fontSize: "0.68rem",
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
                    padding: "0.5rem 0.9rem",
                    borderRadius: "8px",
                    background: "transparent",
                    border: "1px solid hsl(var(--primary))",
                    color: "hsl(var(--primary))",
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "hsl(var(--primary) / 0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
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
                    padding: "0.5rem 0.9rem",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.75))",
                    color: "white",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    boxShadow: "0 0 12px hsl(var(--primary) / 0.3)",
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
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <Menu size={17} />
            </button>
          </div>
        </div>

        {/* Mobile: expandable search bar with dropdown */}
        {searchOpen && (
          <div
            className="mobile-only"
            style={{
              padding: "0.6rem 1rem",
              borderTop: "1px solid hsl(var(--primary) / 0.12)",
              position: "relative",
            }}
          >
            <Search
              size={13}
              style={{
                position: "absolute",
                left: "1.75rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: isLight ? "hsl(var(--muted-foreground))" : "hsl(var(--muted-foreground))",
                pointerEvents: "none",
              }}
            />
            <input
              type="text"
              placeholder="Search games, gift cards..."
              value={searchVal}
              onChange={(e) => { setSearchVal(e.target.value); setDropdownOpen(true); }}
              onKeyDown={(e) => {
                if (e.key === "Escape") { setDropdownOpen(false); setSearchVal(""); setSearchOpen(false); }
              }}
              autoFocus
              style={{
                width: "100%",
                padding: "0.55rem 1rem 0.55rem 2.1rem",
                background: isLight ? "hsl(var(--input))" : "rgba(255,255,255,0.05)",
                border: `1px solid ${isLight ? "hsl(var(--border))" : "hsl(var(--primary) / 0.3)"}`,
                borderRadius: "8px",
                color: isLight ? "hsl(var(--foreground))" : "hsl(var(--foreground))",
                fontSize: "0.68rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {/* Mobile dropdown */}
            {showDropdown && filteredResults.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: "1rem",
                  right: "1rem",
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--primary) / 0.3)",
                  borderRadius: "10px",
                  boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
                  zIndex: 2000,
                  overflow: "hidden",
                  maxHeight: "280px",
                  overflowY: "auto",
                }}
              >
                {filteredResults.slice(0, 6).map((item) => (
                  <a
                    key={item.id}
                    href={`/products/${item.slug}`}
                    onMouseDown={(e) => { e.preventDefault(); navigate(`/products/${item.slug}`); handleSelect(); }}
                    onTouchStart={() => { navigate(`/products/${item.slug}`); handleSelect(); }}
                    onClick={(e) => e.preventDefault()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "9px 12px",
                      textDecoration: "none",
                      borderBottom: "1px solid hsl(var(--primary) / 0.08)",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "hsl(var(--primary) / 0.1)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    <div
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "6px",
                        flexShrink: 0,
                        overflow: "hidden",
                        background: "hsl(var(--primary) / 0.12)",
                        border: "1px solid hsl(var(--primary) / 0.18)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "hsl(var(--primary) / 0.7)",
                      }}
                    >
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        CATEGORY_ICON[item.category] ?? <Gamepad2 size={12} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "hsl(var(--foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))" }}>
                        {CATEGORY_LABEL[item.category] ?? item.category}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
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
          background: "hsl(var(--background))",
          borderLeft: "1px solid hsl(var(--primary) / 0.2)",
          zIndex: 1200,
          display: "flex",
          flexDirection: "column",
          transform: drawerOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: drawerOpen ? "-8px 0 32px rgba(0,0,0,0.4)" : "none",
        }}
      >
        {/* Drawer header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.25rem",
            borderBottom: "1px solid hsl(var(--primary) / 0.15)",
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
                  background: "linear-gradient(135deg, hsl(var(--primary)), #9333ea)",
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
                ...(isLight
                  ? { color: "hsl(var(--foreground))" }
                  : {
                      background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }),
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
              background: "hsl(var(--primary) / 0.1)",
              border: "1px solid hsl(var(--primary) / 0.2)",
              color: "hsl(var(--primary))",
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
                color: location === link.href ? "hsl(var(--primary))" : "hsl(var(--foreground))",
                background: location === link.href ? "hsl(var(--primary) / 0.1)" : "transparent",
                marginBottom: "2px",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "hsl(var(--primary) / 0.08)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = location === link.href ? "hsl(var(--primary) / 0.1)" : "transparent"; }}
            >
              {link.label}
            </Link>
          ))}

          {/* Auth links in drawer */}
          <div
            style={{
              marginTop: "1rem",
              paddingTop: "1rem",
              borderTop: "1px solid hsl(var(--primary) / 0.12)",
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
                    color: "hsl(var(--primary))",
                    background: "hsl(var(--primary) / 0.1)",
                    border: "1px solid hsl(var(--primary) / 0.25)",
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
                    color: "hsl(var(--primary))",
                    border: "1px solid hsl(var(--primary) / 0.4)",
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
                    background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.75))",
                    textAlign: "center",
                  }}
                >
                  Login
                </Link>
              </div>
            )}
          </div>
        </nav>

        {/* Drawer footer */}
        <div
          style={{
            padding: "1rem 1.25rem",
            borderTop: "1px solid hsl(var(--primary) / 0.12)",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {canInstall && (
            <button
              data-testid="drawer-button-install-pwa"
              onClick={() => { setDrawerOpen(false); install(); }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                width: "100%",
                padding: "0.65rem",
                borderRadius: "8px",
                background: "hsl(var(--primary) / 0.1)",
                border: "1px solid hsl(var(--primary) / 0.35)",
                color: "hsl(var(--primary))",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Download size={14} />
              Add to Home Screen
            </button>
          )}
          <div style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))" }}>
            {siteSettings?.site_name || "Nexcoin"} &copy; {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </>
  );
}
