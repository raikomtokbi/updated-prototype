import { Link } from "wouter";
import { Tag, Zap, ArrowRight, Clock, Gift, Gamepad2, RefreshCcw } from "lucide-react";

const OFFERS = [
  {
    id: 1,
    badge: "LIMITED TIME",
    title: "Weekend 20% Bonus Credits",
    desc: "Top up any supported game this weekend and receive 20% bonus in-game credits. Valid for all payment methods.",
    category: "Game Top-Up",
    discount: "20% BONUS",
    expires: "Ends Sunday",
    icon: Gamepad2,
    color: "hsl(258,90%,66%)",
    link: "/products",
    cta: "Browse Games",
  },
  {
    id: 2,
    badge: "FLASH SALE",
    title: "Gift Cards at 15% Off",
    desc: "Get your favorite gift cards — Netflix, Steam, Google Play — at 15% off the face value. Limited stock.",
    category: "Gift Cards",
    discount: "15% OFF",
    expires: "48 hours only",
    icon: Gift,
    color: "hsl(142,71%,45%)",
    link: "/products?cat=gift_card",
    cta: "Shop Gift Cards",
  },
  {
    id: 3,
    badge: "BUNDLE DEAL",
    title: "Double Diamond Mobile Legends",
    desc: "Purchase any ML diamond package above 500 diamonds and receive 2x the amount credited to your account.",
    category: "Game Top-Up",
    discount: "2× DIAMONDS",
    expires: "This weekend",
    icon: Gamepad2,
    color: "hsl(38,92%,50%)",
    link: "/products/mobile-legends",
    cta: "Top Up Now",
  },
  {
    id: 4,
    badge: "NEW USER",
    title: "First Purchase Bonus",
    desc: "New to Nexcoin? Get 10% off your very first order, no minimum spend required. One-time use per account.",
    category: "All Products",
    discount: "10% OFF",
    expires: "No expiry",
    icon: Zap,
    color: "hsl(200,80%,55%)",
    link: "/register",
    cta: "Create Account",
  },
  {
    id: 5,
    badge: "SUBSCRIPTION",
    title: "3-Month Plan: Save 25%",
    desc: "Subscribe to any plan for 3 months and save 25% compared to monthly billing. Cancel any time.",
    category: "Subscriptions",
    discount: "25% SAVINGS",
    expires: "Ongoing",
    icon: RefreshCcw,
    color: "hsl(315,80%,60%)",
    link: "/products?cat=subscription",
    cta: "View Subscriptions",
  },
  {
    id: 6,
    badge: "VOUCHERS",
    title: "Buy 2 Get 1 Free Vouchers",
    desc: "Purchase any two vouchers of equal value and receive a third one for free — automatically applied at checkout.",
    category: "Vouchers",
    discount: "BUY 2 GET 1",
    expires: "While stocks last",
    icon: Tag,
    color: "hsl(258,60%,65%)",
    link: "/products?cat=voucher",
    cta: "Browse Vouchers",
  },
];

export default function Offers() {
  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2.5rem", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.3rem 0.9rem", borderRadius: "9999px", background: "rgba(124,58,237,0.18)", border: "1px solid rgba(124,58,237,0.38)", marginBottom: "1rem" }}>
          <Tag size={13} style={{ color: "#a78bfa" }} />
          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#a78bfa", letterSpacing: "0.1em" }}>EXCLUSIVE DEALS</span>
        </div>
        <h1
          className="font-orbitron"
          style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 900, color: "hsl(210,40%,95%)", marginBottom: "0.75rem", lineHeight: 1.1 }}
        >
          Current{" "}
          <span style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            Offers
          </span>
        </h1>
        <p style={{ fontSize: "0.9rem", color: "hsl(220,10%,55%)", maxWidth: "520px", margin: "0 auto", lineHeight: 1.6 }}>
          Time-limited deals, bonus credits, and exclusive discounts on top-ups, gift cards, and subscriptions.
        </p>
      </div>

      {/* Offers grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1.5rem" }}>
        {OFFERS.map((offer) => {
          const Icon = offer.icon;
          return (
            <div
              key={offer.id}
              data-testid={`card-offer-${offer.id}`}
              style={{
                background: "hsl(220,20%,9%)",
                border: "1px solid hsl(220,15%,15%)",
                borderRadius: "1rem",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                transition: "border-color 0.2s, transform 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = `${offer.color}40`;
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "hsl(220,15%,15%)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              }}
            >
              {/* Card header strip */}
              <div
                style={{
                  background: `linear-gradient(135deg, ${offer.color}22, ${offer.color}08)`,
                  borderBottom: `1px solid ${offer.color}25`,
                  padding: "1.25rem 1.25rem 1rem",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "8px",
                    background: `${offer.color}18`,
                    border: `1px solid ${offer.color}35`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={18} style={{ color: offer.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.6rem", fontWeight: 800, color: offer.color, letterSpacing: "0.08em", border: `1px solid ${offer.color}50`, padding: "0.1rem 0.45rem", borderRadius: "9999px", background: `${offer.color}12` }}>
                      {offer.badge}
                    </span>
                    <span style={{ fontSize: "0.68rem", color: "hsl(220,10%,45%)" }}>{offer.category}</span>
                  </div>
                  <h2 style={{ fontSize: "0.95rem", fontWeight: 700, color: "hsl(210,40%,93%)", lineHeight: 1.3 }}>
                    {offer.title}
                  </h2>
                </div>
                <div
                  style={{
                    flexShrink: 0,
                    padding: "0.3rem 0.65rem",
                    borderRadius: "6px",
                    background: offer.color,
                    color: "white",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    letterSpacing: "0.02em",
                    whiteSpace: "nowrap",
                  }}
                >
                  {offer.discount}
                </div>
              </div>

              {/* Card body */}
              <div style={{ padding: "1rem 1.25rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <p style={{ fontSize: "0.82rem", color: "hsl(220,10%,52%)", lineHeight: 1.6, flex: 1 }}>
                  {offer.desc}
                </p>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.72rem", color: "hsl(220,10%,40%)" }}>
                    <Clock size={11} />
                    {offer.expires}
                  </div>
                  <Link
                    href={offer.link}
                    data-testid={`link-offer-cta-${offer.id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      padding: "0.4rem 0.9rem",
                      borderRadius: "6px",
                      background: offer.color,
                      color: "white",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      textDecoration: "none",
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                  >
                    {offer.cta} <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div
        style={{
          marginTop: "3rem",
          padding: "2rem",
          background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(124,58,237,0.04))",
          border: "1px solid rgba(124,58,237,0.25)",
          borderRadius: "1rem",
          textAlign: "center",
        }}
      >
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "hsl(210,40%,92%)", marginBottom: "0.5rem" }}>
          Can't find what you're looking for?
        </h3>
        <p style={{ fontSize: "0.85rem", color: "hsl(220,10%,50%)", marginBottom: "1.25rem" }}>
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
            fontSize: "0.85rem",
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
