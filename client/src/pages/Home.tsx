import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Zap, Shield, Tag, Heart, Star, ArrowRight,
  Facebook, Instagram, Gamepad2, Gift, HeadphonesIcon,
  Wrench, Mail, MessageCircle,
} from "lucide-react";
import { FaDiscord } from "react-icons/fa";

import { useSiteStore } from "@/lib/store/siteStore";
import { useIsLight } from "@/hooks/useIsLight";


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
  const touchStartRef = useRef<number | null>(null);

  const { data: apiSliders = [] } = useQuery<any[]>({
    queryKey: ["/api/hero-sliders/active"],
    staleTime: 60_000,
  });

  const { data: siteSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
    staleTime: 0,
  });

  const defaultSlide = {
    id: "default",
    bg: siteSettings.hero_bg_image || "",
    title: (siteSettings.hero_title || "").trim(),
    sub: (siteSettings.hero_subtitle || "").trim(),
    btnLabel: "",
    btnHref: "/products",
  };

  const apiMapped = apiSliders.map((s: any) => ({
    id: s.id,
    bg: s.bannerUrl || "",
    title: (s.title || "").trim(),
    sub: (s.subtitle || "").trim(),
    btnLabel: (s.buttonText || "").trim(),
    btnHref: s.buttonLink || "/products",
  }));

  // Always keep the default slide in rotation so it shows even after uploading banners
  const SLIDES = apiMapped.length > 0 ? [...apiMapped, defaultSlide] : [defaultSlide];

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

  function nextSlide() {
    goTo((current + 1) % SLIDES.length);
  }

  function prevSlide() {
    goTo((current - 1 + SLIDES.length) % SLIDES.length);
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    touchStartRef.current = e.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current;
    const end = e.changedTouches[0]?.clientX ?? null;
    touchStartRef.current = null;
    if (start == null || end == null) return;
    const delta = start - end;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) nextSlide();
    else prevSlide();
  }

  const slide = SLIDES[current] ?? SLIDES[0];

  return (
    <section
      className="hero-section"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
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
              className="hero-slide-img"
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center center" }}
            />
          )}
        </div>
      ))}

      {/* Glow accent */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: "radial-gradient(ellipse 40% 60% at 20% 50%, hsl(var(--primary) / 0.18) 0%, transparent 65%)",
        }}
      />

      {/* Content — only rendered when there is something to show */}
      {(slide.title || slide.sub || slide.btnLabel) && (
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

            {/* Badge — only when there is a title */}
            {slide.title && (
              <div
                className="hero-badge"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.3rem 0.8rem",
                  borderRadius: "9999px",
                  background: "hsl(var(--primary) / 0.2)",
                  border: "1px solid hsl(var(--primary) / 0.4)",
                  marginBottom: "1rem",
                }}
              >
                <Zap size={12} color="hsl(var(--primary))" />
                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "hsl(var(--primary))", letterSpacing: "0.1em" }}>
                  FEATURED
                </span>
              </div>
            )}

            {/* Headline — only when title has content */}
            {slide.title && (
              <h1 className="font-orbitron hero-headline" style={{ lineHeight: 1.05, marginBottom: "0.85rem" }}>
                <div
                  style={{
                    display: "block",
                    fontSize: "clamp(1.9rem, 6vw, 3.8rem)",
                    fontWeight: 900,
                    letterSpacing: "-0.02em",
                    color: "hsl(var(--primary))",
                  }}
                >
                  {slide.title}
                </div>
              </h1>
            )}

            {/* Subtitle — only when sub has content */}
            {slide.sub && (
              <p
                className="hero-sub"
                style={{
                  fontSize: "clamp(0.75rem, 1.3vw, 1rem)",
                  color: "hsl(var(--muted-foreground))",
                  lineHeight: 1.6,
                  marginBottom: "1.25rem",
                  maxWidth: "460px",
                }}
              >
                {slide.sub}
              </p>
            )}

            {/* CTA button — only when button text has content */}
            {slide.btnLabel && (
              <div className="hero-cta-row" style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
                <Link
                  href={slide.btnHref}
                  data-testid="link-browse-games"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.55rem 1.1rem",
                    borderRadius: "8px",
                    background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.75))",
                    color: "white",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    textDecoration: "none",
                    boxShadow: "0 0 20px hsl(var(--primary) / 0.45)",
                    transition: "box-shadow 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 30px hsl(var(--primary) / 0.65)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 20px hsl(var(--primary) / 0.45)"; }}
                >
                  <Gamepad2 size={14} />
                  {slide.btnLabel}
                </Link>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Dot indicators */}
      <div
        style={{
          position: "absolute", bottom: "0.75rem", left: "50%", transform: "translateX(-50%)",
          zIndex: 10, display: "flex", gap: "0.5rem",
        }}
      >
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            data-testid={`button-slide-dot-${i}`}
            style={{
              width: i === current ? "20px" : "6px", height: "6px", borderRadius: "9999px",
              background: i === current ? "hsl(var(--primary))" : "rgba(255,255,255,0.25)",
              border: "none", cursor: "pointer", transition: "all 0.3s ease",
              boxShadow: i === current ? "0 0 8px hsl(var(--primary) / 0.6)" : "none",
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

  const [activeIdx, setActiveIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIdx(prev => (prev + 1) % features.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [features.length]);

  return (
    <section
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "16px",
        width: "calc(100% - 20px)",
        maxWidth: "1320px",
        margin: "12px auto 0",
        padding: "1rem 1.5rem 0.85rem",
        overflow: "hidden",
      }}
    >
      {/* Sliding track — clipped to one card width */}
      <div style={{ overflow: "hidden" }}>
        <div
          style={{
            display: "flex",
            width: `${features.length * 100}%`,
            transform: `translateX(-${(activeIdx * 100) / features.length}%)`,
            transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {features.map(({ iconName, title, desc }, idx: number) => {
            const Icon = iconMap[iconName] || Zap;
            return (
              <div
                key={idx}
                style={{
                  width: `${100 / features.length}%`,
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "10px",
                    background: "hsl(var(--primary) / 0.12)",
                    border: "1px solid hsl(var(--primary) / 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} color="hsl(var(--primary))" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: "0.68rem", fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: "0.25rem" }}>
                    {title}
                  </h3>
                  <p style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))", lineHeight: 1.5, margin: 0 }}>{desc}</p>
                </div>
              </div>
            );
          })}
        </div>
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
    <section style={{ padding: "1rem 0 1.5rem", maxWidth: "1320px", margin: "0 auto" }}>
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
            <Zap size={16} color="hsl(var(--primary))" />
            <span
              className="font-orbitron"
              style={{ fontSize: "0.9rem", fontWeight: 800, color: "hsl(var(--foreground))" }}
            >
              Trending Now
            </span>
          </div>
          <p style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))" }}>
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
            fontSize: "0.68rem",
            fontWeight: 600,
            color: "hsl(var(--primary))",
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
              <div key={i} style={{ flexShrink: 0, width: "110px", height: "120px", borderRadius: "10px", background: "hsl(var(--primary) / 0.06)", border: "1px solid hsl(var(--primary) / 0.12)" }} />
            ))}
          </div>
        ) : trendingGames.length === 0 ? (
          <div style={{ padding: "2.5rem 0", color: "hsl(var(--muted-foreground))", fontSize: "0.82rem" }}>
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
                width: "110px",
                borderRadius: "10px",
                overflow: "hidden",
                textDecoration: "none",
                display: "block",
                position: "relative",
                border: "1px solid hsl(var(--primary) / 0.15)",
                background: "hsl(var(--card))",
                transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary) / 0.55)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 18px hsl(var(--primary) / 0.2)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary) / 0.15)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              }}
            >
              <div style={{ width: "100%", aspectRatio: "1/1", overflow: "visible", position: "relative", background: "hsl(var(--muted))" }}>
                {game.logoUrl ? (
                  <img src={game.logoUrl} alt={game.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Gamepad2 size={32} style={{ color: "hsl(var(--primary) / 0.3)" }} />
                  </div>
                )}
                <span style={{ position: "absolute", top: "0.4rem", left: "0.4rem", padding: "0.15rem 0.4rem", borderRadius: "4px", background: "hsl(var(--primary))", color: "white", fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.05em" }}>HOT</span>
                {/* Game name hanging below */}
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "0.35rem" }}>
                  <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "hsl(var(--foreground))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0, paddingLeft: "0.05rem", paddingRight: "0.05rem" }}>
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
    <section style={{ padding: "1.5rem 0", background: "hsl(var(--background))" }}>
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
              <Gift size={16} color="hsl(var(--primary))" />
              <span
                className="font-orbitron"
                style={{ fontSize: "0.9rem", fontWeight: 800, color: "hsl(var(--foreground))" }}
              >
                Vouchers & Gift Cards
              </span>
            </div>
            <p style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))" }}>
              Top up instantly with vouchers and gift cards
            </p>
          </div>
          <Link
            href="/products?category=voucher"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              fontSize: "0.68rem",
              fontWeight: 600,
              color: "hsl(var(--primary))",
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
                <div key={i} style={{ flexShrink: 0, width: "140px", height: "150px", borderRadius: "10px", background: "hsl(var(--primary) / 0.06)", border: "1px solid hsl(var(--primary) / 0.12)" }} />
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
                  width: "140px",
                  borderRadius: "10px",
                  overflow: "hidden",
                  textDecoration: "none",
                  display: "block",
                  border: "1px solid hsl(var(--primary) / 0.15)",
                  background: "hsl(var(--card))",
                  transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary) / 0.55)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 0 18px hsl(var(--primary) / 0.2)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary) / 0.15)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                {/* Image area */}
                <div style={{ width: "100%", aspectRatio: "16/10", overflow: "hidden", position: "relative", background: "hsl(var(--muted))" }}>
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Gift size={28} style={{ color: "hsl(var(--primary) / 0.3)" }} />
                    </div>
                  )}
                  {/* Category badge */}
                  <span style={{
                    position: "absolute", top: "0.4rem", left: "0.4rem",
                    padding: "0.15rem 0.45rem", borderRadius: "4px",
                    background: product.category === "gift_card" ? "hsl(186,80%,35%)" : "hsl(var(--primary))",
                    color: "white", fontSize: "0.58rem", fontWeight: 800, letterSpacing: "0.05em",
                  }}>
                    {product.category === "gift_card" ? "GIFT" : "VOUCHER"}
                  </span>
                </div>
                {/* Info */}
                <div style={{ padding: "0.65rem 0.75rem" }}>
                  <p style={{
                    fontSize: "0.68rem", fontWeight: 700, color: "hsl(var(--foreground))",
                    margin: "0 0 0.25rem",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {product.name}
                  </p>
                  {product.price && (
                    <p style={{ fontSize: "0.68rem", color: "hsl(var(--primary))", margin: 0, fontWeight: 600 }}>
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

  const displayGames = games.slice(0, 12);

  if (!isLoading && games.length === 0) return null;

  return (
    <section style={{ padding: "1.5rem 0 1rem", background: "hsl(var(--background))" }}>
      <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "0 1.5rem" }}>
        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
            <Gamepad2 size={16} color="hsl(var(--primary))" />
            <span
              className="font-orbitron"
              style={{ fontSize: "0.9rem", fontWeight: 800, color: "hsl(var(--foreground))" }}
            >
              Games
            </span>
          </div>
          <p style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))" }}>
            Browse our full game catalog and top up instantly
          </p>
        </div>

        {/* Responsive Grid: 3 cols mobile, 6 cols desktop */}
        {isLoading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "0.625rem" }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <div key={i} style={{ borderRadius: "10px", aspectRatio: "1/1", background: "hsl(var(--primary) / 0.06)", border: "1px solid hsl(var(--primary) / 0.12)" }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "0.625rem" }}>
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
                  border: "1px solid hsl(var(--primary) / 0.15)",
                  background: "hsl(var(--card))",
                  transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary) / 0.55)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 0 18px hsl(var(--primary) / 0.2)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary) / 0.15)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                {/* Square image */}
                <div style={{ width: "100%", aspectRatio: "1/1", background: "hsl(var(--muted))", position: "relative", overflow: "hidden" }}>
                  {game.logoUrl ? (
                    <img
                      src={game.logoUrl}
                      alt={game.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Gamepad2 size={28} style={{ color: "hsl(var(--primary) / 0.3)" }} />
                    </div>
                  )}
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
                background: "hsl(var(--primary) / 0.12)",
                border: "1px solid hsl(var(--primary) / 0.35)",
                color: "hsl(var(--primary))",
                fontSize: "0.68rem",
                fontWeight: 700,
                textDecoration: "none",
                transition: "background 0.2s, border-color 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "hsl(var(--primary) / 0.22)";
                (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary) / 0.6)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 20px hsl(var(--primary) / 0.25)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "hsl(var(--primary) / 0.12)";
                (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary) / 0.35)";
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

// ─── Countdown helper ─────────────────────────────────────────────────────────
function useCountdown(target: string) {
  const calc = () => {
    if (!target) return null;
    const diff = new Date(target).getTime() - Date.now();
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, expired: true };
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { d, h, m, s, expired: false };
  };
  const [tick, setTick] = useState(calc);
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setTick(calc()), 1000);
    return () => clearInterval(id);
  }, [target]);
  return tick;
}

// ─── Weekend Bonus Banner ─────────────────────────────────────────────────────
function BonusBanner() {
  const { data: siteSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
    staleTime: 0,
  });

  const badgeText = siteSettings.bonus_badge_text || "WEEKEND SPECIAL";
  const headline = siteSettings.bonus_headline
    || ((siteSettings.bonus_main_title || "GET") + " " + (siteSettings.bonus_percent || "20%") + " BONUS " + (siteSettings.bonus_main_suffix || "CREDITS"));
  const description = siteSettings.bonus_description || "Top up using any supported payment method this weekend and receive bonus credits on all top-ups. Offer ends Sunday.";
  const buttonText = siteSettings.bonus_button_text || "Claim Now";
  const expiresAt = siteSettings.bonus_expires_at || "";
  const countdown = useCountdown(expiresAt);

  if (siteSettings.bonus_enabled !== "true") return null;

  return (
    <section style={{ padding: "0 10px", maxWidth: "1320px", margin: "12px auto 0" }}>
      <div
        style={{
          borderRadius: "16px",
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          padding: "1.5rem 2rem",
          display: "flex",
          alignItems: "center",
          gap: "2rem",
          flexWrap: "wrap",
        }}
      >
        {/* Text */}
        <div style={{ flex: 1, minWidth: "180px" }}>
          <span style={{
            display: "inline-block",
            padding: "0.15rem 0.55rem",
            borderRadius: "9999px",
            background: "hsl(var(--primary) / 0.12)",
            border: "1px solid hsl(var(--primary) / 0.25)",
            fontSize: "0.62rem",
            fontWeight: 700,
            color: "hsl(var(--primary))",
            letterSpacing: "0.1em",
            marginBottom: "0.4rem",
          }}>
            {badgeText}
          </span>
          <h2 className="font-orbitron" style={{ fontSize: "0.95rem", fontWeight: 800, color: "hsl(var(--foreground))", marginBottom: "0.3rem", lineHeight: 1.2 }}>
            {headline}
          </h2>
          <p style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))", lineHeight: 1.5, margin: 0 }}>
            {description}
          </p>
        </div>

        {/* Countdown */}
        {countdown && !countdown.expired && (
          <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
            {[
              { v: countdown.d, label: "D" },
              { v: countdown.h, label: "H" },
              { v: countdown.m, label: "M" },
              { v: countdown.s, label: "S" },
            ].map(({ v, label }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                <div style={{
                  width: "38px", height: "36px",
                  background: "hsl(var(--primary) / 0.1)",
                  border: "1px solid hsl(var(--primary) / 0.22)",
                  borderRadius: "7px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.88rem", fontWeight: 800, fontFamily: "var(--font-orbitron, monospace)",
                  color: "hsl(var(--primary))",
                  letterSpacing: "-0.02em",
                }}>
                  {String(v).padStart(2, "0")}
                </div>
                <span style={{ fontSize: "0.52rem", fontWeight: 600, color: "hsl(var(--muted-foreground))", letterSpacing: "0.08em" }}>{label}</span>
              </div>
            ))}
          </div>
        )}
        {countdown?.expired && (
          <span style={{ fontSize: "0.65rem", fontWeight: 600, color: "hsl(var(--muted-foreground))", flexShrink: 0 }}>Offer ended</span>
        )}

        {/* CTA */}
        <Link
          href="/offers"
          data-testid="link-claim-bonus"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.55rem 1.15rem",
            borderRadius: "8px",
            background: "hsl(var(--primary) / 0.12)",
            border: "1px solid hsl(var(--primary) / 0.25)",
            color: "hsl(var(--primary))",
            fontSize: "0.68rem",
            fontWeight: 700,
            textDecoration: "none",
            flexShrink: 0,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "hsl(var(--primary) / 0.2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "hsl(var(--primary) / 0.12)"; }}
        >
          {buttonText} <ArrowRight size={13} />
        </Link>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  const isLight = useIsLight();
  const { data: siteSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
    staleTime: 0,
  });
  const siteName = siteSettings?.site_name?.toUpperCase() || "NEXCOIN";

  const MARKETPLACE = [
    { label: "All Products", href: "/products" },
    { label: "Games", href: "/products?category=games" },
    { label: "Vouchers", href: "/products?category=voucher" },
    { label: "Gift Cards", href: "/products?category=gift_card" },
    { label: "Subscriptions", href: "/products?category=subscription" },
  ];
  const ABOUT_LINKS = [
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Support", href: "/support" },
    { label: "FAQ", href: "/faq" },
  ];
  const LEGAL_LINKS = [
    { label: "Terms & Services", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Refund Policy", href: "/refund-policy" },
    { label: "Delivery & Cancellation", href: "/delivery-cancellation" },
  ];

  return (
    <footer
      style={{
        background: "hsl(var(--background))",
        borderTop: "1px solid hsl(var(--primary) / 0.15)",
        padding: "3.5rem 1.5rem 1.5rem",
      }}
    >
      <div style={{ maxWidth: "1320px", margin: "0 auto" }}>
        {/* Top grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
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
                    background: "linear-gradient(135deg, hsl(var(--primary)), #9333ea)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 10px hsl(var(--primary) / 0.5)",
                    flexShrink: 0,
                  }}
                >
                  <Zap size={14} color="white" />
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
            </div>
            {siteSettings?.site_tagline && (
              <p style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))", marginBottom: "0.6rem", fontStyle: "italic" }}>
                {siteSettings.site_tagline}
              </p>
            )}
            <p style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))", lineHeight: 1.7, maxWidth: "260px", marginBottom: "1.5rem" }}>
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
                  fontSize: "0.68rem",
                  color: "hsl(var(--muted-foreground))",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "hsl(var(--primary))"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "hsl(var(--muted-foreground))"; }}
              >
                <Mail size={12} />
                {siteSettings.footer_support_email}
              </a>
            )}
            {/* Social icons */}
            <div style={{ display: "flex", gap: "0.6rem" }}>
              {[
                { icon: Facebook, label: "Facebook", url: siteSettings?.social_facebook },
                { icon: MessageCircle, label: "WhatsApp", url: siteSettings?.social_whatsapp || siteSettings?.social_twitter },
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
                    background: "hsl(var(--primary) / 0.1)",
                    border: "1px solid hsl(var(--primary) / 0.2)",
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
                      (e.currentTarget as HTMLAnchorElement).style.borderColor = "hsl(var(--primary) / 0.5)";
                      (e.currentTarget as HTMLAnchorElement).style.color = "hsl(var(--primary))";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.borderColor = "hsl(var(--primary) / 0.2)";
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
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "hsl(var(--foreground))",
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
                    style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))", textDecoration: "none", transition: "color 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "hsl(var(--primary))"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "hsl(var(--muted-foreground))"; }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* About */}
          <div>
            <h4
              style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "hsl(var(--foreground))",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: "1rem",
              }}
            >
              About
            </h4>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.55rem" }}>
              {ABOUT_LINKS.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))", textDecoration: "none", transition: "color 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "hsl(var(--primary))"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "hsl(var(--muted-foreground))"; }}
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
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "hsl(var(--foreground))",
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
                    style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))", textDecoration: "none", transition: "color 0.15s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "hsl(var(--primary))"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "hsl(var(--muted-foreground))"; }}
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
            borderTop: "1px solid hsl(var(--primary) / 0.12)",
            paddingTop: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <p style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))", margin: 0 }}>
            {siteSettings?.footer_copyright || `© ${new Date().getFullYear()} ${siteSettings?.site_name || "Nexcoin"}. All rights reserved.`}
          </p>
          {siteSettings?.footer_button_name && (
            <a
              href={siteSettings.footer_button_link || "#"}
              data-testid="link-footer-button"
              style={{
                fontSize: "0.68rem",
                color: "hsl(var(--muted-foreground))",
                textDecoration: "none",
                transition: "color 0.15s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "hsl(var(--primary))";
                e.currentTarget.style.textDecoration = "underline";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "hsl(var(--muted-foreground))";
                e.currentTarget.style.textDecoration = "none";
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
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "hsl(var(--background))",
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
            color: "hsl(var(--foreground))",
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
      <div style={{ minHeight: "100vh", background: "hsl(var(--background))" }}>
        <MaintenancePage />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "hsl(var(--background))" }}>
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
