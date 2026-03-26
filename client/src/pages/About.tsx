import { Zap, Shield, Clock, Users } from "lucide-react";
import { Link } from "wouter";

const STATS = [
  { label: "Products Available", value: "100+" },
  { label: "Orders Fulfilled", value: "10K+" },
  { label: "Happy Customers", value: "5K+" },
  { label: "Avg. Delivery Time", value: "<1 min" },
];

const VALUES = [
  {
    icon: Zap,
    title: "Instant Delivery",
    desc: "Top-ups are credited to your account within seconds of payment confirmation.",
  },
  {
    icon: Shield,
    title: "Secure & Trusted",
    desc: "All transactions are encrypted end-to-end and processed by PCI-compliant gateways.",
  },
  {
    icon: Clock,
    title: "24/7 Support",
    desc: "Our support team is available around the clock to resolve any issue you may face.",
  },
  {
    icon: Users,
    title: "Community First",
    desc: "Built by gamers for gamers — we understand what matters to you.",
  },
];

export default function About() {
  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      {/* Hero */}
      <div
        style={{
          textAlign: "center",
          padding: "3rem 1rem",
          marginBottom: "3rem",
          background: "hsl(220,20%,9%)",
          border: "1px solid hsl(220,15%,18%)",
          borderRadius: "1.25rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 60% 60% at 50% 0%, hsla(258,90%,66%,0.07) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "0.9rem",
            background: "hsla(258,90%,66%,0.12)",
            border: "1px solid hsla(258,90%,66%,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem",
          }}
        >
          <Zap size={26} style={{ color: "hsl(258,90%,70%)" }} />
        </div>
        <h1
          className="font-orbitron"
          style={{ fontSize: "2rem", fontWeight: 800, color: "hsl(210,40%,95%)", marginBottom: "0.75rem" }}
        >
          About Nexcoin
        </h1>
        <p style={{ fontSize: "1rem", color: "hsl(220,10%,55%)", maxWidth: "580px", margin: "0 auto" }}>
          Nexcoin is your trusted destination for instant digital top-ups — game currency, gift
          cards, vouchers, and subscriptions, all in one place.
        </p>
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "1rem",
          marginBottom: "3rem",
        }}
      >
        {STATS.map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "hsl(220,20%,9%)",
              border: "1px solid hsl(220,15%,18%)",
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
            <p style={{ fontSize: "0.78rem", color: "hsl(220,10%,50%)" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Values */}
      <h2
        style={{
          fontSize: "1rem",
          fontWeight: 700,
          color: "hsl(210,40%,85%)",
          marginBottom: "1.25rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Why Nexcoin
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: "1.25rem",
          marginBottom: "3rem",
        }}
      >
        {VALUES.map((v) => {
          const Icon = v.icon;
          return (
            <div
              key={v.title}
              style={{
                background: "hsl(220,20%,9%)",
                border: "1px solid hsl(220,15%,18%)",
                borderRadius: "0.75rem",
                padding: "1.5rem",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "0.65rem",
                  background: "hsla(258,90%,66%,0.12)",
                  border: "1px solid hsla(258,90%,66%,0.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "0.85rem",
                }}
              >
                <Icon size={18} style={{ color: "hsl(258,90%,70%)" }} />
              </div>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(210,40%,90%)", marginBottom: "0.4rem" }}>
                {v.title}
              </h3>
              <p style={{ fontSize: "0.8rem", color: "hsl(220,10%,50%)", lineHeight: 1.6 }}>
                {v.desc}
              </p>
            </div>
          );
        })}
      </div>

      {/* Story */}
      <div
        style={{
          background: "hsl(220,20%,9%)",
          border: "1px solid hsl(220,15%,18%)",
          borderRadius: "1rem",
          padding: "2rem",
          marginBottom: "2rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.1rem",
            fontWeight: 700,
            color: "hsl(210,40%,90%)",
            marginBottom: "0.75rem",
          }}
        >
          Our Story
        </h2>
        <p style={{ fontSize: "0.875rem", color: "hsl(220,10%,55%)", lineHeight: 1.7, marginBottom: "0.75rem" }}>
          Nexcoin was founded with a simple mission: make digital top-ups fast, safe, and
          accessible for every gamer. We started with a handful of popular titles and have grown
          into a platform that covers hundreds of games and platforms worldwide.
        </p>
        <p style={{ fontSize: "0.875rem", color: "hsl(220,10%,55%)", lineHeight: 1.7 }}>
          We work directly with publishers and authorised resellers to ensure every top-up you
          purchase is 100% legitimate and delivered in real time.
        </p>
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
