import { Zap } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ICON_MAP, DEFAULT_VALUE_CARDS } from "@/lib/iconMap";

interface ValueCard { icon: string; title: string; desc: string }
interface AboutStats { productsCount: number; gamesCount: number; ordersCount: number; usersCount: number }

function fmtStat(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M+`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K+`;
  return n.toString();
}

export default function About() {
  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: stats } = useQuery<AboutStats>({
    queryKey: ["/api/about-stats"],
    staleTime: 60 * 1000,
  });

  const siteName = settings?.site_name || "Nexcoin";
  const headline = settings?.about_headline || `About ${siteName}`;
  const tagline =
    settings?.about_tagline ||
    `${siteName} is your trusted destination for instant digital top-ups — game currency, gift cards, vouchers, and subscriptions, all in one place.`;
  const storyText = settings?.about_story || "";

  const valueCards: ValueCard[] = (() => {
    try {
      const parsed = JSON.parse(settings?.why_nexcoin_cards ?? "[]");
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_VALUE_CARDS;
    } catch {
      return DEFAULT_VALUE_CARDS;
    }
  })();

  const statRows = [
    { label: "Games Available",   value: stats ? fmtStat(stats.gamesCount)    : "—" },
    { label: "Products Available", value: stats ? fmtStat(stats.productsCount) : "—" },
    { label: "Orders Fulfilled",   value: stats ? fmtStat(stats.ordersCount)   : "—" },
    { label: "Registered Users",   value: stats ? fmtStat(stats.usersCount)    : "—" },
  ];

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      {/* Hero */}
      <div
        style={{
          textAlign: "center",
          padding: "3rem 1rem",
          marginBottom: "3rem",
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "1.25rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {settings?.about_banner && (
          <img
            src={settings.about_banner}
            alt=""
            style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover", opacity: 0.35, borderRadius: "1.25rem",
            }}
          />
        )}
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse 60% 60% at 50% 0%, hsla(258,90%,66%,0.07) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            width: "56px", height: "56px", borderRadius: "0.9rem",
            background: "hsla(258,90%,66%,0.12)", border: "1px solid hsla(258,90%,66%,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1.25rem", position: "relative",
          }}
        >
          <Zap size={26} style={{ color: "hsl(258,90%,70%)" }} />
        </div>
        <h1
          className="font-orbitron"
          style={{ fontSize: "2rem", fontWeight: 800, color: "hsl(var(--foreground))", marginBottom: "0.75rem", position: "relative" }}
        >
          {headline}
        </h1>
        <p style={{ fontSize: "1rem", color: "hsl(var(--muted-foreground))", maxWidth: "580px", margin: "0 auto", position: "relative" }}>
          {tagline}
        </p>
      </div>

      {/* Live Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "1rem",
          marginBottom: "3rem",
        }}
      >
        {statRows.map((stat) => (
          <div
            key={stat.label}
            data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}
            style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.75rem",
              padding: "1.5rem 1rem",
              textAlign: "center",
            }}
          >
            <p
              className="font-orbitron"
              style={{ fontSize: "1.6rem", fontWeight: 800, color: "hsl(258,90%,72%)", marginBottom: "0.3rem" }}
            >
              {stat.value}
            </p>
            <p style={{ fontSize: "0.78rem", color: "hsl(var(--muted-foreground))" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Why section */}
      <h2
        style={{
          fontSize: "1rem", fontWeight: 700, color: "hsl(var(--foreground))",
          marginBottom: "1.25rem", textTransform: "uppercase", letterSpacing: "0.05em",
        }}
      >
        Why {siteName}
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1.25rem",
          marginBottom: "3rem",
        }}
      >
        {valueCards.map((v, i) => {
          const Icon = ICON_MAP[v.icon] ?? Zap;
          return (
            <div
              key={i}
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.75rem",
                padding: "1.5rem",
              }}
            >
              <div
                style={{
                  width: "40px", height: "40px", borderRadius: "0.65rem",
                  background: "hsla(258,90%,66%,0.12)", border: "1px solid hsla(258,90%,66%,0.25)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: "0.85rem",
                }}
              >
                <Icon size={18} style={{ color: "hsl(258,90%,70%)" }} />
              </div>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(210,40%,90%)", marginBottom: "0.4rem" }}>
                {v.title}
              </h3>
              <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-foreground))", lineHeight: 1.6 }}>
                {v.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Story */}
      <div
        style={{
          background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
          borderRadius: "1rem", padding: "2rem", marginBottom: "2rem",
        }}
      >
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "hsl(210,40%,90%)", marginBottom: "0.75rem" }}>
          Our Story
        </h2>
        {storyText ? (
          storyText.split("\n").filter(Boolean).map((para, i) => (
            <p key={i} style={{ fontSize: "0.875rem", color: "hsl(var(--muted-foreground))", lineHeight: 1.7, marginBottom: "0.75rem" }}>
              {para}
            </p>
          ))
        ) : (
          <>
            <p style={{ fontSize: "0.875rem", color: "hsl(var(--muted-foreground))", lineHeight: 1.7, marginBottom: "0.75rem" }}>
              {siteName} was founded with a simple mission: make digital top-ups fast, safe, and
              accessible for every gamer. We started with a handful of popular titles and have grown
              into a platform that covers hundreds of games and platforms worldwide.
            </p>
            <p style={{ fontSize: "0.875rem", color: "hsl(var(--muted-foreground))", lineHeight: 1.7 }}>
              We work directly with publishers and authorised resellers to ensure every top-up you
              purchase is 100% legitimate and delivered in real time.
            </p>
          </>
        )}
      </div>

      <div style={{ textAlign: "center" }}>
        <Link href="/products">
          <button className="btn-primary">
            <Zap size={15} /> Browse Products
          </button>
        </Link>
      </div>
    </div>
  );
}
