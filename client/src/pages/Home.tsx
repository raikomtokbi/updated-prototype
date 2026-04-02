import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Zap, Shield, Tag, Heart, Star, ArrowRight, ChevronLeft, ChevronRight,
  Facebook, Twitter, Instagram, Gamepad2, Gift, HeadphonesIcon,
  Wrench, Mail,
} from "lucide-react";
import { FaDiscord } from "react-icons/fa";

import { useSiteStore } from "@/lib/store/siteStore";


// ─── Features ─────────────────────────────────────────────────────────────────
const DEFAULT_FEATURES = [
  { icon: Zap, title: "Lightning Fast", desc: "Instant delivery to your account within seconds" },
  { icon: Shield, title: "Secure Payments", desc: "256-bit encryption on all transactions" },
  { icon: Tag, title: "Best Deals", desc: "Lowest prices guaranteed on all top-ups" },
];

// ─── Hero Slider ──────────────────────────────────────────────────────────────
function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: apiSliders = [], isSuccess } = useQuery<any[]>({
    queryKey: ["/api/hero-sliders/active"],
    staleTime: 60_000,
  });

  const { data: siteSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
    staleTime: 0,
  });

  const defaultSlide = {
    id: "default",
    bg: "",
    badge: "FEATURED",
    title: [(siteSettings.hero_title || "Welcome to Game Marketplace").split(" ")].flat(),
    highlight: 0,
    sub: siteSettings.hero_subtitle || "Buy game credits, vouchers & subscriptions instantly.",
    cta1: { label: "Browse Games", href: "/products" },
    cta2: { label: "View Offers", href: "/offers" },
  };

  const SLIDES = apiSliders.length > 0 
    ? apiSliders.map((s: any) => ({
        id: s.id,
        bg: s.bannerUrl || "",
        badge: "FEATURED",
        title: [s.title],
        highlight: 0,
        sub: s.subtitle || "",
        cta1: { label: s.buttonText || "Browse Games", href: s.buttonLink || "/products" },
        cta2: { label: "View Offers", href: "/offers" },
      }))
    : [defaultSlide];

  function startTimer() {
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % SLIDES.length);
    }, 5000);
  }

  useEffect(() => {
    if (SLIDES.length === 0) return;
    setCurrent(0);
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [SLIDES.length]);

  function goTo(idx: number) {
    setCurrent(idx);
    if (timerRef.current) clearInterval(timerRef.current);
    startTimer();
  }

  if (!isSuccess) return null;

  const slide = SLIDES[current] ?? SLIDES[0];

  return (
    <section
      style={{
        position: "relative",
        height: "min(100vh, 520px)",
        minHeight: "540px",
        overflow: "hidden",
        background: "#070b14",
      }}
    >
      {/* Slide backgrounds — fade transition */}
      {SLIDES.map((s, i) => (
        <div
          key={s.id}
          style={{
            position: "absolute",
            inset: 0,
            opacity: i === current ? 1 : 0,
            transition: "opacity 0.9s ease",
          }}
        >
          {s.bg && (
            <img
              src={s.bg}
              alt=""
              aria-hidden
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
            />
          )}
          {/* Dark wash gradient over bg */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, rgba(7,11,20,0.90) 0%, rgba(7,11,20,0.55) 55%, rgba(7,11,20,0.15) 100%), linear-gradient(0deg, rgba(7,11,20,0.85) 0%, transparent 40%)",
            }}
          />
        </div>
      ))}

      {/* Glow accent */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: "radial-gradient(ellipse 40% 60% at 20% 50%, rgba(124,58,237,0.18) 0%, transparent 65%)",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: "1320px",
          margin: "0 auto",
          padding: "0 1.5rem",
          height: "100%",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ maxWidth: "580px" }}>
          {/* Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.3rem 0.8rem",
              borderRadius: "9999px",
              background: "rgba(124, 58, 237, 0.2)",
              border: "1px solid rgba(124, 58, 237, 0.4)",
              marginBottom: "1.5rem",
            }}
          >
            <Zap size={12} color="#a78bfa" />
            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#a78bfa", letterSpacing: "0.1em" }}>
              {slide.badge}
            </span>
          </div>

          {/* Headline */}
          <h1
            className="font-orbitron"
            style={{ lineHeight: 1.05, marginBottom: "1.25rem" }}
          >
            {slide.title.map((line, i) => (
              <div
                key={i}
                style={{
                  display: "block",
                  fontSize: "clamp(2.8rem, 6vw, 4.5rem)",
                  fontWeight: 900,
                  letterSpacing: "-0.02em",
                  color: i === slide.highlight
                    ? "transparent"
                    : "#e5e7eb",
                  background: i === slide.highlight
                    ? "linear-gradient(135deg, #7c3aed, #9333ea, #a855f7)"
                    : undefined,
                  WebkitBackgroundClip: i === slide.highlight ? "text" : undefined,
                  WebkitTextFillColor: i === slide.highlight ? "transparent" : undefined,
                  backgroundClip: i === slide.highlight ? "text" : undefined,
                  textShadow: i !== slide.highlight ? "0 0 40px rgba(124,58,237,0.3)" : undefined,
                }}
              >
                {line}
              </div>
            ))}
          </h1>

          {/* Sub */}
          <p
            style={{
              fontSize: "clamp(0.85rem, 1.5vw, 1rem)",
              color: "rgba(229, 231, 235, 0.65)",
              lineHeight: 1.7,
              marginBottom: "2rem",
              maxWidth: "460px",
            }}
          >
            {slide.sub}
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap" }}>
            <Link
              href={slide.cta1.href}
              data-testid="link-browse-games"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.7rem 1.5rem",
                borderRadius: "8px",
                background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                color: "white",
                fontSize: "0.875rem",
                fontWeight: 700,
                textDecoration: "none",
                boxShadow: "0 0 20px rgba(124,58,237,0.45)",
                transition: "opacity 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 30px rgba(124,58,237,0.65)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 20px rgba(124,58,237,0.45)"; }}
            >
              <Gamepad2 size={16} />
              {slide.cta1.label}
            </Link>
            <Link
              href={slide.cta2.href}
              data-testid="link-view-offers"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.7rem 1.5rem",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "rgba(229,231,235,0.9)",
                fontSize: "0.875rem",
                fontWeight: 600,
                textDecoration: "none",
                backdropFilter: "blur(6px)",
                transition: "border-color 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)";
                e.currentTarget.style.background = "rgba(124,58,237,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              }}
            >
              {slide.cta2.label}
            </Link>
          </div>
        </div>
      </div>

      {/* Slider controls */}
      <button
        onClick={() => goTo((current - 1 + SLIDES.length) % SLIDES.length)}
        data-testid="button-slide-prev"
        style={{
          position: "absolute",
          left: "1rem",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: "rgba(124,58,237,0.15)",
          border: "1px solid rgba(124,58,237,0.3)",
          color: "white",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(4px)",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124,58,237,0.4)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(124,58,237,0.15)"; }}
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={() => goTo((current + 1) % SLIDES.length)}
        data-testid="button-slide-next"
        style={{
          position: "absolute",
          right: "1rem",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 10,
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: "rgba(124,58,237,0.15)",
          border: "1px solid rgba(124,58,237,0.3)",
          color: "white",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backdropFilter: "blur(4px)",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124,58,237,0.4)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(124,58,237,0.15)"; }}
      >
        <ChevronRight size={18} />
      </button>

      {/* Dot indicators */}
      <div
        style={{
          position: "absolute",
          bottom: "1.5rem",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          display: "flex",
          gap: "0.5rem",
        }}
      >
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            data-testid={`button-slide-dot-${i}`}
            style={{
              width: i === current ? "24px" : "8px",
              height: "8px",
              borderRadius: "9999px",
              background: i === current ? "#7c3aed" : "rgba(255,255,255,0.25)",
              border: "none",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: i === current ? "0 0 8px rgba(124,58,237,0.6)" : "none",
            }}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Features strip ───────────────────────────────────────────────────────────
function FeaturesStrip() {
  const { data: siteSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
    staleTime: 0,
  });

  const iconMap: Record<string, typeof Zap> = {
    Zap, Shield, Tag, Heart, Star,
  };

  const features = [
    {
      iconName: siteSettings.feature_1_icon || "Zap",
      title: siteSettings.feature_1_title || DEFAULT_FEATURES[0].title,
      desc: siteSettings.feature_1_desc || DEFAULT_FEATURES[0].desc,
    },
    {
      iconName: siteSettings.feature_2_icon || "Shield",
      title: siteSettings.feature_2_title || DEFAULT_FEATURES[1].title,
      desc: siteSettings.feature_2_desc || DEFAULT_FEATURES[1].desc,
    },
    {
      iconName: siteSettings.feature_3_icon || "Tag",
      title: siteSettings.feature_3_title || DEFAULT_FEATURES[2].title,
      desc: siteSettings.feature_3_desc || DEFAULT_FEATURES[2].desc,
    },
  ];

  return (
    <section
      style={{
        background: "#0b1020",
        borderTop: "1px solid rgba(124,58,237,0.12)",
        borderBottom: "1px solid rgba(124,58,237,0.12)",
        padding: "2.5rem 1.5rem",
      }}
    >
      <div
        style={{
          maxWidth: "1320px",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "2rem",
        }}
      >
        {features.map(({ iconName, title, desc }, idx: number) => {
          const Icon = iconMap[iconName] || Zap;
          return (
            <div
              key={idx}
              style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  background: "rgba(124,58,237,0.12)",
                  border: "1px solid rgba(124,58,237,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 0 12px rgba(124,58,237,0.15)",
                }}
              >
                <Icon size={20} color="#a78bfa" />
              </div>
              <div>
                <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#e5e7eb", marginBottom: "0.3rem" }}>
                  {title}
                </h3>
                <p style={{ fontSize: "0.78rem", color: "rgba(148,163,184,0.65)", lineHeight: 1.5 }}>{desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Trending Games ───────────────────────────────────────────────────────────
function TrendingGames() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: trendingGames = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/games/trending"],
    refetchInterval: 30000,
  });

  return (
    <section style={{ padding: "1.25rem 0 3.5rem", maxWidth: "1320px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1.5rem",
          padding: "0 1.5rem",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
            <Zap size={16} color="#a78bfa" />
            <span
              className="font-orbitron"
              style={{ fontSize: "1.1rem", fontWeight: 800, color: "#e5e7eb" }}
            >
              Trending Now
            </span>
          </div>
          <p style={{ fontSize: "0.78rem", color: "rgba(148,163,184,0.6)" }}>
            Top up the most popular games instantly
          </p>
        </div>
        <Link
          href="/products"
          data-testid="link-view-all-games"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.25rem",
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "#a78bfa",
            textDecoration: "none",
          }}
        >
          View All <ArrowRight size={13} />
        </Link>
      </div>

      <div
        ref={scrollRef}
        style={{
          display: "flex",
          gap: "1rem",
          overflowX: "auto",
          padding: "0.5rem 1.5rem 1rem",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {isLoading ? (
          <div style={{ display: "flex", gap: "1rem" }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ flexShrink: 0, width: "155px", height: "168px", borderRadius: "10px", background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.1)" }} />
            ))}
          </div>
        ) : trendingGames.length === 0 ? (
          <div style={{ padding: "2.5rem 0", color: "rgba(148,163,184,0.4)", fontSize: "0.82rem" }}>
            No trending games yet. Enable trending in the admin panel.
          </div>
        ) : (
          trendingGames.map((game, idx) => (
            <Link
              key={game.id}
              href={`/products/${game.slug}`}
              data-testid={`card-game-${idx}`}
              style={{
                flexShrink: 0,
                width: "155px",
                borderRadius: "10px",
                overflow: "hidden",
                textDecoration: "none",
                display: "block",
                position: "relative",
                border: "1px solid rgba(124,58,237,0.15)",
                background: "#0b1020",
                transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.55)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 18px rgba(124,58,237,0.2)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.15)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              }}
            >
              <div style={{ width: "100%", aspectRatio: "1/1", overflow: "visible", position: "relative", background: "hsl(258,35%,14%)" }}>
                {game.logoUrl ? (
                  <img src={game.logoUrl} alt={game.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Gamepad2 size={32} style={{ color: "rgba(167,139,250,0.3)" }} />
                  </div>
                )}
                <span style={{ position: "absolute", top: "0.4rem", left: "0.4rem", padding: "0.15rem 0.4rem", borderRadius: "4px", background: "#7c3aed", color: "white", fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.05em" }}>HOT</span>
                {/* Game name hanging below */}
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "0.35rem" }}>
                  <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "#e5e7eb", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0, paddingLeft: "0.05rem", paddingRight: "0.05rem" }}>
                    {game.name}
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

// ─── Vouchers Section ─────────────────────────────────────────────────────────
function VouchersSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: products = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/products"],
    staleTime: 60_000,
  });

  const vouchers = products.filter(
    (p: any) => p.category === "voucher" || p.category === "gift_card"
  );

  if (!isLoading && vouchers.length === 0) return null;

  return (
    <section style={{ padding: "1.5rem 0", background: "#070b14" }}>
      <div style={{ maxWidth: "1320px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
            padding: "0 1.5rem",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
              <Gift size={16} color="#a78bfa" />
              <span
                className="font-orbitron"
                style={{ fontSize: "1.1rem", fontWeight: 800, color: "#e5e7eb" }}
              >
                Vouchers & Gift Cards
              </span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "rgba(148,163,184,0.6)" }}>
              Top up instantly with vouchers and gift cards
            </p>
          </div>
          <Link
            href="/products?category=voucher"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "#a78bfa",
              textDecoration: "none",
            }}
          >
            View All <ArrowRight size={13} />
          </Link>
        </div>

        <div
          ref={scrollRef}
          style={{
            display: "flex",
            gap: "1rem",
            overflowX: "auto",
            padding: "0.5rem 1.5rem 1rem",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          } as React.CSSProperties}
        >
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ flexShrink: 0, width: "180px", height: "190px", borderRadius: "10px", background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.1)" }} />
              ))}
            </>
          ) : (
            vouchers.map((product: any, idx: number) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                data-testid={`card-voucher-${idx}`}
                style={{
                  flexShrink: 0,
                  width: "180px",
                  borderRadius: "10px",
                  overflow: "hidden",
                  textDecoration: "none",
                  display: "block",
                  border: "1px solid rgba(124,58,237,0.15)",
                  background: "#0b1020",
                  transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.55)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 0 18px rgba(124,58,237,0.2)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.15)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                {/* Image area */}
                <div style={{ width: "100%", aspectRatio: "16/10", overflow: "hidden", position: "relative", background: "hsl(258,35%,12%)" }}>
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Gift size={28} style={{ color: "rgba(167,139,250,0.3)" }} />
                    </div>
                  )}
                  {/* Category badge */}
                  <span style={{
                    position: "absolute", top: "0.4rem", left: "0.4rem",
                    padding: "0.15rem 0.45rem", borderRadius: "4px",
                    background: product.category === "gift_card" ? "#0e7490" : "#7c3aed",
                    color: "white", fontSize: "0.58rem", fontWeight: 800, letterSpacing: "0.05em",
                  }}>
                    {product.category === "gift_card" ? "GIFT" : "VOUCHER"}
                  </span>
                </div>
                {/* Info */}
                <div style={{ padding: "0.65rem 0.75rem" }}>
                  <p style={{
                    fontSize: "0.75rem", fontWeight: 700, color: "#e5e7eb",
                    margin: "0 0 0.25rem",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {product.name}
                  </p>
                  {product.price && (
                    <p style={{ fontSize: "0.68rem", color: "#a78bfa", margin: 0, fontWeight: 600 }}>
                      From {typeof product.price === "number"
                        ? `$${(product.price / 100).toFixed(2)}`
                        : product.price}
                    </p>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Games Grid (3x3) ─────────────────────────────────────────────────────────
function GamesGrid() {
  const { data: games = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/games"],
    staleTime: 60_000,
  });

  const displayGames = games.slice(0, 9);

  if (!isLoading && games.length === 0) return null;

  return (
    <section style={{ padding: "1.5rem 0 1rem", background: "#070b14" }}>
      <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "0 1.5rem" }}>
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
            <Gamepad2 size={16} color="#a78bfa" />
            <span
              className="font-orbitron"
              style={{ fontSize: "1.1rem", fontWeight: 800, color: "#e5e7eb" }}
            >
              Games
            </span>
          </div>
          <p style={{ fontSize: "0.78rem", color: "rgba(148,163,184,0.6)" }}>
            Browse our full game catalog and top up instantly
          </p>
        </div>

        {/* 3×3 Grid */}
        {isLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.875rem" }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <div key={i} style={{ borderRadius: "10px", aspectRatio: "1/1", background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.1)" }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.875rem" }}>
            {displayGames.map((game: any, idx: number) => (
              <Link
                key={game.id}
                href={`/products/${game.slug}`}
                data-testid={`grid-game-${idx}`}
                style={{
                  display: "block",
                  textDecoration: "none",
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: "1px solid rgba(124,58,237,0.15)",
                  background: "#0b1020",
                  transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.55)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 0 18px rgba(124,58,237,0.2)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.15)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                {/* Square image */}
                <div style={{ width: "100%", aspectRatio: "1/1", background: "hsl(258,35%,12%)", position: "relative", overflow: "hidden" }}>
                  {game.logoUrl ? (
                    <img
                      src={game.logoUrl}
                      alt={game.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Gamepad2 size={28} style={{ color: "rgba(167,139,250,0.3)" }} />
                    </div>
                  )}
                </div>
                {/* Name */}
                <div style={{ padding: "0.5rem 0.6rem" }}>
                  <p style={{
                    fontSize: "0.7rem", fontWeight: 700, color: "#e5e7eb",
                    margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {game.name}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* More Games button */}
        {!isLoading && (
          <div style={{ textAlign: "center", marginTop: "1.75rem", paddingBottom: "1rem" }}>
            <Link
              href="/products"
              data-testid="link-more-games"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.7rem 2rem",
                borderRadius: "8px",
                background: "rgba(124,58,237,0.12)",
                border: "1px solid rgba(124,58,237,0.35)",
                color: "#a78bfa",
                fontSize: "0.875rem",
                fontWeight: 700,
                textDecoration: "none",
                transition: "background 0.2s, border-color 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.22)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.6)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px rgba(124,58,237,0.25)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.12)";
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.35)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              All Products <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Weekend Bonus Banner ─────────────────────────────────────────────────────
function BonusBanner() {
  const { data: siteSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
    staleTime: 0,
  });

  const badgeText = siteSettings.bonus_badge_text || "WEEKEND SPECIAL";
  const bonusText = siteSettings.bonus_percent || "20%";
  const mainTitle = siteSettings.bonus_main_title || "GET";
  const mainTitleSuffix = siteSettings.bonus_main_suffix || "CREDITS";
  const description = siteSettings.bonus_description || "Top up using any supported payment method this weekend and receive bonus credits on all top-ups. Offer ends Sunday.";
  const buttonText = siteSettings.bonus_button_text || "Claim Now";

  return (
    <section style={{ padding: "2rem 1.5rem", maxWidth: "1320px", margin: "0 auto" }}>
      <div
        style={{
          borderRadius: "16px",
          overflow: "hidden",
          position: "relative",
          background: "linear-gradient(135deg, #0f0c29, #302b63, #0f0c29)",
          border: "1px solid rgba(124,58,237,0.35)",
          boxShadow: "0 0 40px rgba(124,58,237,0.15)",
          display: "flex",
          alignItems: "center",
          minHeight: "180px",
        }}
      >
        {/* Glow */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse 60% 80% at 30% 50%, rgba(124,58,237,0.25) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 1, padding: "2rem 2.5rem", flex: 1 }}>
          <span
            style={{
              display: "inline-block",
              padding: "0.2rem 0.65rem",
              borderRadius: "9999px",
              background: "rgba(124,58,237,0.25)",
              border: "1px solid rgba(124,58,237,0.45)",
              fontSize: "0.65rem",
              fontWeight: 700,
              color: "#a78bfa",
              letterSpacing: "0.1em",
              marginBottom: "0.75rem",
            }}
          >
            {badgeText}
          </span>
          <h2
            className="font-orbitron"
            style={{
              fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
              fontWeight: 900,
              color: "#e5e7eb",
              lineHeight: 1.1,
              marginBottom: "0.75rem",
            }}
          >
            {mainTitle}{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {bonusText} BONUS
            </span>{" "}
            {mainTitleSuffix}
          </h2>
          <p style={{ fontSize: "0.825rem", color: "rgba(229,231,235,0.6)", lineHeight: 1.6, maxWidth: "440px", marginBottom: "1.25rem" }}>
            {description}
          </p>
          <Link
            href="/offers"
            data-testid="link-claim-bonus"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.6rem 1.25rem",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
              color: "white",
              fontSize: "0.8rem",
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 0 16px rgba(124,58,237,0.4)",
              transition: "box-shadow 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 28px rgba(124,58,237,0.65)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 16px rgba(124,58,237,0.4)"; }}
          >
            {buttonText} <ArrowRight size={14} />
          </Link>
        </div>

      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  const { data: siteSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
    staleTime: 0,
  });
  const siteName = siteSettings?.site_name?.toUpperCase() || "NEXCOIN";

  const MARKETPLACE = [
    { label: "All Products", href: "/products" },
    { label: "Games", href: "/products?category=game_currency" },
    { label: "Vouchers", href: "/products?category=voucher" },
    { label: "Gift Cards", href: "/products?category=gift_card" },
    { label: "Subscriptions", href: "/products?category=subscription" },
  ];
  const LEGAL_LINKS = [
    { label: "About Us", href: "/about" },
    { label: "FAQ", href: "/faq" },
    { label: "Support", href: "/support" },
    { label: "Terms & Services", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Refund Policy", href: "/refund-policy" },
  ];

  return (
    <footer
      style={{
        background: "#070b14",
        borderTop: "1px solid rgba(124,58,237,0.15)",
        padding: "3.5rem 1.5rem 1.5rem",
      }}
    >
      <div style={{ maxWidth: "1320px", margin: "0 auto" }}>
        {/* Top grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr",
            gap: "3rem",
            marginBottom: "3rem",
          }}
          className="footer-grid"
        >
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.6rem" }}>
              {siteSettings?.site_logo ? (
                <img
                  src={siteSettings.site_logo}
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
                    flexShrink: 0,
                  }}
                >
                  <Zap size={14} color="white" />
                </div>
              )}
              <span
                className="font-orbitron"
                style={{
                  fontSize: "1rem",
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
            {siteSettings?.site_tagline && (
              <p style={{ fontSize: "0.72rem", color: "rgba(167,139,250,0.7)", marginBottom: "0.6rem", fontStyle: "italic" }}>
                {siteSettings.site_tagline}
              </p>
            )}
            <p style={{ fontSize: "0.8rem", color: "rgba(148,163,184,0.6)", lineHeight: 1.7, maxWidth: "260px", marginBottom: "1.5rem" }}>
              {siteSettings?.site_description || "The fastest, safest marketplace for game top-ups. Trusted by thousands of players worldwide."}
            </p>
            {/* Support Email */}
            {siteSettings?.footer_support_email && (
              <a
                href={`mailto:${siteSettings.footer_support_email}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  marginBottom: "0.8rem",
                  fontSize: "0.78rem",
                  color: "rgba(148,163,184,0.6)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#a78bfa"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(148,163,184,0.6)"; }}
              >
                <Mail size={12} />
                {siteSettings.footer_support_email}
              </a>
            )}
            {/* Social icons */}
            <div style={{ display: "flex", gap: "0.6rem" }}>
              {[
                { icon: Facebook, label: "Facebook", url: siteSettings?.social_facebook },
                { icon: Twitter, label: "Twitter", url: siteSettings?.social_twitter },
                { icon: Instagram, label: "Instagram", url: siteSettings?.social_instagram },
                { icon: FaDiscord, label: "Discord", url: siteSettings?.social_discord },
              ].map(({ icon: Icon, label, url }) => (
                <a
                  key={label}
                  href={url || "#"}
                  aria-label={label}
                  target={url ? "_blank" : undefined}
                  rel={url ? "noopener noreferrer" : undefined}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "7px",
                    background: "rgba(124,58,237,0.1)",
                    border: "1px solid rgba(124,58,237,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: url ? "rgba(148,163,184,0.8)" : "rgba(148,163,184,0.3)",
                    transition: "border-color 0.2s, color 0.2s",
                    textDecoration: "none",
                    opacity: url ? 1 : 0.5,
                  }}
                  onMouseEnter={(e) => {
                    if (url) {
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(124,58,237,0.5)";
                      (e.currentTarget as HTMLAnchorElement).style.color = "#a78bfa";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(124,58,237,0.2)";
                    (e.currentTarget as HTMLAnchorElement).style.color = url ? "rgba(148,163,184,0.8)" : "rgba(148,163,184,0.3)";
                  }}
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          {/* Marketplace */}
          <div>
            <h4
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#e5e7eb",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "1rem",
              }}
            >
              Marketplace
            </h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.55rem" }}>
              {MARKETPLACE.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    style={{ fontSize: "0.8rem", color: "rgba(148,163,184,0.6)", textDecoration: "none", transition: "color 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#a78bfa"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(148,163,184,0.6)"; }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legals */}
          <div>
            <h4
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#e5e7eb",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "1rem",
              }}
            >
              Legals
            </h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.55rem" }}>
              {LEGAL_LINKS.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    style={{ fontSize: "0.8rem", color: "rgba(148,163,184,0.6)", textDecoration: "none", transition: "color 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#a78bfa"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(148,163,184,0.6)"; }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: "1px solid rgba(124,58,237,0.12)",
            paddingTop: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <p style={{ fontSize: "0.75rem", color: "rgba(148,163,184,0.4)", margin: 0 }}>
            {siteSettings?.footer_copyright || `© ${new Date().getFullYear()} ${siteSettings?.site_name || "Nexcoin"}. All rights reserved.`}
          </p>
          {siteSettings?.footer_button_name && (
            <a
              href={siteSettings.footer_button_link || "#"}
              data-testid="link-footer-button"
              style={{
                display: "inline-block",
                padding: "0.35rem 0.9rem",
                borderRadius: "6px",
                background: "rgba(124,58,237,0.15)",
                border: "1px solid rgba(124,58,237,0.35)",
                color: "#a78bfa",
                fontSize: "0.75rem",
                fontWeight: 600,
                textDecoration: "none",
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(124,58,237,0.28)";
                e.currentTarget.style.borderColor = "rgba(124,58,237,0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(124,58,237,0.15)";
                e.currentTarget.style.borderColor = "rgba(124,58,237,0.35)";
              }}
            >
              {siteSettings.footer_button_name}
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}

// ─── Home page ─────────────────────────────────────────────────────────────────
function MaintenancePage() {
  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#070b14",
        padding: "2rem",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "480px" }}>
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "16px",
            background: "hsla(38, 92%, 50%, 0.1)",
            border: "1px solid hsla(38, 92%, 50%, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
          }}
        >
          <Wrench size={32} style={{ color: "hsl(38, 92%, 55%)" }} />
        </div>
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            color: "hsl(210, 40%, 95%)",
            marginBottom: "0.75rem",
            letterSpacing: "-0.01em",
          }}
        >
          Under Maintenance
        </h1>
        <p style={{ fontSize: "0.95rem", color: "hsl(220, 10%, 52%)", lineHeight: 1.7, marginBottom: "2rem" }}>
          We're currently performing scheduled maintenance to improve your experience.
          We'll be back online shortly. Thank you for your patience.
        </p>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 18px",
            background: "hsla(38, 92%, 50%, 0.08)",
            border: "1px solid hsla(38, 92%, 50%, 0.25)",
            borderRadius: "999px",
            fontSize: "13px",
            color: "hsl(38, 92%, 60%)",
            fontWeight: 500,
          }}
        >
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "hsl(38, 92%, 50%)", boxShadow: "0 0 6px hsl(38,92%,50%)", animation: "pulse 2s infinite", flexShrink: 0 }} />
          Maintenance Mode Active
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { status } = useSiteStore();

  if (status === "maintenance") {
    return (
      <div style={{ minHeight: "100vh", background: "#070b14" }}>
        <MaintenancePage />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#070b14" }}>
      <HeroSlider />
      <TrendingGames />
      <FeaturesStrip />
      <VouchersSection />
      <BonusBanner />
      <GamesGrid />
      <Footer />
    </div>
  );
}
