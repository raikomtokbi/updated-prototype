import { Link } from "wouter";
import { Tag, Zap, ArrowRight, Clock, Gift, Gamepad2, RefreshCcw, Loader2, Megaphone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Campaign } from "@shared/schema";

function formatExpiry(c: Campaign) {
  if (!c.endsAt) return "Ongoing";
  const diff = new Date(c.endsAt).getTime() - Date.now();
  if (diff < 0) return "Expired";
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Ends today";
  if (days === 1) return "Ends tomorrow";
  return `Ends in ${days} days`;
}

const TYPE_COLORS: Record<string, string> = {
  banner: "hsl(var(--primary))",
  email: "hsl(200,80%,55%)",
  discount: "hsl(38,92%,50%)",
  referral: "hsl(142,71%,45%)",
  loyalty: "hsl(315,80%,60%)",
};

const TYPE_LABELS: Record<string, string> = {
  banner: "PROMOTION",
  email: "NEWSLETTER",
  discount: "DISCOUNT",
  referral: "REFERRAL",
  loyalty: "LOYALTY",
};

export default function Offers() {
  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns/active"],
  });

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2.5rem", textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.3rem 0.9rem",
            borderRadius: "9999px",
            background: "rgba(124,58,237,0.18)",
            border: "1px solid rgba(124,58,237,0.38)",
            marginBottom: "1rem",
          }}
        >
          <Tag size={13} style={{ color: "hsl(var(--primary))" }} />
          <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "hsl(var(--primary))", letterSpacing: "0.1em" }}>
            EXCLUSIVE DEALS
          </span>
        </div>
        <h1
          className="font-orbitron"
          style={{
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            fontWeight: 900,
            color: "hsl(var(--foreground))",
            marginBottom: "0.75rem",
            lineHeight: 1.1,
          }}
        >
          Current{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #7c3aed, #a855f7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Offers
          </span>
        </h1>
        <p style={{ fontSize: "0.9rem", color: "hsl(var(--muted-foreground))", maxWidth: "520px", margin: "0 auto" }}>
          Limited-time promotions, bonuses, and deals — updated regularly.
        </p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "4rem",
            color: "hsl(var(--muted-foreground))",
          }}
        >
          <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: "13px" }}>Loading offers…</span>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && campaigns.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "5rem 2rem",
            background: "rgba(124,58,237,0.04)",
            border: "1px dashed hsl(var(--primary) / 0.2)",
            borderRadius: "12px",
          }}
        >
          <Megaphone size={40} style={{ color: "hsl(var(--primary))", opacity: 0.4, marginBottom: "1rem" }} />
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(var(--muted-foreground))", marginBottom: "0.5rem" }}>
            No Active Offers Right Now
          </h3>
          <p style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))" }}>
            Check back soon — new deals are added regularly.
          </p>
        </div>
      )}

      {/* Offer cards */}
      {!isLoading && campaigns.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {campaigns.map((campaign) => {
            const color = TYPE_COLORS[campaign.type] ?? "hsl(var(--primary))";
            const badge = TYPE_LABELS[campaign.type] ?? "PROMOTION";
            const expiry = formatExpiry(campaign);
            const expired = expiry === "Expired";

            return (
              <div
                key={campaign.id}
                data-testid={`card-offer-${campaign.id}`}
                style={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "12px",
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  opacity: expired ? 0.55 : 1,
                }}
              >
                {/* Banner image */}
                {campaign.bannerUrl ? (
                  <img
                    src={campaign.bannerUrl}
                    alt={campaign.name}
                    style={{ width: "100%", height: "140px", objectFit: "cover" }}
                  />
                ) : (
                  <div
                    style={{
                      height: "80px",
                      background: `linear-gradient(135deg, ${color}22, ${color}08)`,
                      borderBottom: `1px solid ${color}22`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Megaphone size={28} style={{ color, opacity: 0.5 }} />
                  </div>
                )}

                {/* Content */}
                <div style={{ padding: "1rem 1.25rem", flex: 1, display: "flex", flexDirection: "column" }}>
                  {/* Badge row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: "0.6rem",
                      flexWrap: "wrap",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        padding: "0.2rem 0.5rem",
                        borderRadius: "4px",
                        background: `${color}20`,
                        border: `1px solid ${color}40`,
                        color,
                      }}
                    >
                      {badge}
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        fontSize: "0.68rem",
                        color: expired ? "hsl(0,72%,55%)" : "hsl(var(--muted-foreground))",
                      }}
                    >
                      <Clock size={10} />
                      {expiry}
                    </span>
                  </div>

                  {/* Title */}
                  <h3
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color: "hsl(var(--foreground))",
                      marginBottom: "0.5rem",
                      lineHeight: 1.3,
                    }}
                  >
                    {campaign.name}
                  </h3>

                  {/* Description */}
                  {campaign.description && (
                    <p
                      style={{
                        fontSize: "0.82rem",
                        color: "hsl(var(--muted-foreground))",
                        lineHeight: 1.6,
                        marginBottom: "1rem",
                        flex: 1,
                      }}
                    >
                      {campaign.description}
                    </p>
                  )}

                  {/* CTA */}
                  <Link
                    href="/products"
                    data-testid={`link-offer-cta-${campaign.id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      padding: "0.4rem 0.9rem",
                      borderRadius: "6px",
                      background: color,
                      color: "white",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      textDecoration: "none",
                      alignSelf: "flex-start",
                      marginTop: "auto",
                    }}
                  >
                    Browse Games <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom CTA */}
      <div
        style={{
          marginTop: "3rem",
          padding: "2rem",
          background: "linear-gradient(135deg, hsl(var(--primary) / 0.12), rgba(124,58,237,0.04))",
          border: "1px solid hsl(var(--primary) / 0.25)",
          borderRadius: "1rem",
          textAlign: "center",
        }}
      >
        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: "0.5rem" }}>
          Can't find what you're looking for?
        </h3>
        <p style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))", marginBottom: "1.25rem" }}>
          Browse our full catalog of games, gift cards, and subscriptions.
        </p>
        <Link
          href="/products"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.6rem 1.5rem",
            borderRadius: "8px",
            background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
            color: "white",
            fontSize: "0.68rem",
            fontWeight: 700,
            textDecoration: "none",
            boxShadow: "0 0 16px rgba(124,58,237,0.3)",
          }}
        >
          Browse All Products <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
