import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Zap, Shield, Clock, ArrowRight, Star, ChevronRight } from "lucide-react";
import type { Product } from "@shared/schema";

const FEATURES = [
  {
    icon: Zap,
    title: "Instant Delivery",
    desc: "Get your game credits delivered within seconds after payment confirmation.",
  },
  {
    icon: Shield,
    title: "Secure Payments",
    desc: "Multiple payment methods with end-to-end encryption for your safety.",
  },
  {
    icon: Clock,
    title: "24/7 Support",
    desc: "Our team is always here to help you with any questions or issues.",
  },
];

const REVIEWS = [
  { name: "Alex K.", rating: 5, text: "Super fast delivery! Got my Mobile Legends diamonds in under a minute.", game: "Mobile Legends" },
  { name: "Sarah M.", rating: 5, text: "Best prices for Genshin Impact crystals. Highly recommend!", game: "Genshin Impact" },
  { name: "James R.", rating: 5, text: "Reliable and trustworthy. Been using Nexcoin for 6 months now.", game: "PUBG Mobile" },
];

export default function Home() {
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });
  const featured = products.slice(0, 4);

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Hero */}
      <section
        style={{
          position: "relative",
          padding: "6rem 1.5rem 5rem",
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        {/* Background glow orbs */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse 60% 40% at 50% 0%, hsla(258,90%,66%,0.15) 0%, transparent 70%), radial-gradient(ellipse 50% 30% at 80% 60%, hsla(196,100%,50%,0.08) 0%, transparent 70%)",
          }}
        />

        <div style={{ position: "relative", maxWidth: "800px", margin: "0 auto" }}>
          <span className="badge badge-purple" style={{ marginBottom: "1.5rem" }}>
            #1 Game Top-Up Platform
          </span>

          <h1
            className="font-orbitron"
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4rem)",
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: "1.5rem",
              color: "hsl(210, 40%, 95%)",
            }}
          >
            Power Up Your{" "}
            <span className="gradient-text">Game Experience</span>
          </h1>

          <p
            style={{
              fontSize: "1.125rem",
              color: "hsl(220, 10%, 60%)",
              maxWidth: "560px",
              margin: "0 auto 2.5rem",
              lineHeight: 1.7,
            }}
          >
            Instant top-ups for your favorite games. Fast, secure, and affordable — over 50+ games supported.
          </p>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/products" className="btn-primary" data-testid="link-shop-now">
              Shop Now <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="btn-secondary" data-testid="link-create-account">
              Create Account
            </Link>
          </div>

          <div
            style={{
              display: "flex",
              gap: "2.5rem",
              justifyContent: "center",
              marginTop: "3rem",
              flexWrap: "wrap",
            }}
          >
            {[
              { value: "50+", label: "Games" },
              { value: "10K+", label: "Customers" },
              { value: "<60s", label: "Delivery" },
            ].map(({ value, label }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div
                  className="font-orbitron"
                  style={{ fontSize: "1.75rem", fontWeight: 700, color: "hsl(258, 90%, 70%)" }}
                >
                  {value}
                </div>
                <div style={{ fontSize: "0.8rem", color: "hsl(220, 10%, 55%)", marginTop: "0.25rem" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featured.length > 0 && (
        <section style={{ padding: "4rem 1.5rem", maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h2
                className="font-orbitron"
                style={{ fontSize: "1.5rem", fontWeight: 700, color: "hsl(210, 40%, 95%)", marginBottom: "0.4rem" }}
              >
                Popular Games
              </h2>
              <p style={{ fontSize: "0.875rem", color: "hsl(220, 10%, 55%)" }}>Top up your favorite games instantly</p>
            </div>
            <Link
              href="/products"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                fontSize: "0.875rem",
                color: "hsl(258, 90%, 70%)",
                textDecoration: "none",
                fontWeight: 600,
              }}
              data-testid="link-view-all-products"
            >
              View All <ChevronRight size={16} />
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "1.25rem",
            }}
          >
            {featured.map((product) => (
              <Link
                key={product.id}
                href="/products"
                className="game-card"
                data-testid={`card-product-${product.id}`}
                style={{ textDecoration: "none", display: "block", overflow: "hidden" }}
              >
                <div
                  style={{
                    height: "140px",
                    background: "linear-gradient(135deg, hsl(258,40%,18%), hsl(220,30%,12%))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <Zap size={40} style={{ color: "hsla(258,90%,66%,0.4)" }} />
                  )}
                </div>
                <div style={{ padding: "1rem" }}>
                  <h3
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "hsl(210, 40%, 92%)",
                      marginBottom: "0.4rem",
                    }}
                  >
                    {product.title}
                  </h3>
                  <span className="badge badge-purple">{product.category.replace("_", " ")}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      <section
        style={{
          padding: "4rem 1.5rem",
          background: "hsl(220, 20%, 7%)",
          borderTop: "1px solid hsl(220, 15%, 14%)",
          borderBottom: "1px solid hsl(220, 15%, 14%)",
        }}
      >
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <h2
            className="font-orbitron"
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              textAlign: "center",
              marginBottom: "2.5rem",
              color: "hsl(210, 40%, 95%)",
            }}
          >
            Why Choose Nexcoin?
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1.5rem",
            }}
          >
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                style={{
                  background: "hsl(220, 20%, 9%)",
                  border: "1px solid hsl(220, 15%, 16%)",
                  borderRadius: "0.75rem",
                  padding: "1.75rem",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "0.75rem",
                    background: "hsla(258, 90%, 66%, 0.12)",
                    border: "1px solid hsla(258, 90%, 66%, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.25rem",
                  }}
                >
                  <Icon size={24} style={{ color: "hsl(258, 90%, 70%)" }} />
                </div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "hsl(210, 40%, 92%)", marginBottom: "0.5rem" }}>{title}</h3>
                <p style={{ fontSize: "0.875rem", color: "hsl(220, 10%, 55%)", lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section style={{ padding: "4rem 1.5rem", maxWidth: "1280px", margin: "0 auto" }}>
        <h2
          className="font-orbitron"
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            textAlign: "center",
            marginBottom: "2.5rem",
            color: "hsl(210, 40%, 95%)",
          }}
        >
          What Players Say
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {REVIEWS.map((review) => (
            <div
              key={review.name}
              style={{
                background: "hsl(220, 20%, 9%)",
                border: "1px solid hsl(220, 15%, 16%)",
                borderRadius: "0.75rem",
                padding: "1.5rem",
              }}
            >
              <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.75rem" }}>
                {Array.from({ length: review.rating }).map((_, i) => (
                  <Star key={i} size={14} fill="hsl(40, 100%, 55%)" style={{ color: "hsl(40, 100%, 55%)" }} />
                ))}
              </div>
              <p style={{ fontSize: "0.875rem", color: "hsl(220, 10%, 70%)", lineHeight: 1.6, marginBottom: "1rem" }}>
                "{review.text}"
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "hsl(210, 40%, 88%)" }}>{review.name}</span>
                <span className="badge badge-cyan">{review.game}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          padding: "4rem 1.5rem",
          textAlign: "center",
          background: "hsl(220, 20%, 7%)",
          borderTop: "1px solid hsl(220, 15%, 14%)",
        }}
      >
        <div style={{ maxWidth: "560px", margin: "0 auto" }}>
          <h2
            className="font-orbitron"
            style={{ fontSize: "1.75rem", fontWeight: 800, color: "hsl(210, 40%, 95%)", marginBottom: "1rem" }}
          >
            Ready to Power Up?
          </h2>
          <p style={{ fontSize: "0.9rem", color: "hsl(220, 10%, 55%)", marginBottom: "2rem", lineHeight: 1.7 }}>
            Join thousands of gamers who trust Nexcoin for fast and secure top-ups.
          </p>
          <Link href="/products" className="btn-primary" data-testid="link-cta-shop">
            Browse All Games <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
