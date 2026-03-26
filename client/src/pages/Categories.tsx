import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Zap, CreditCard, Tag, Crown, Gamepad2 } from "lucide-react";
import type { Product } from "@shared/schema";

const CATEGORIES = [
  {
    value: "game_currency",
    label: "Game Currency",
    description: "Top up in-game coins, gems, diamonds, and credits for your favourite titles.",
    icon: Gamepad2,
    color: "258,90%",
  },
  {
    value: "gift_card",
    label: "Gift Cards",
    description: "Digital gift cards redeemable on major gaming and entertainment platforms.",
    icon: CreditCard,
    color: "195,80%",
  },
  {
    value: "voucher",
    label: "Vouchers",
    description: "Discount vouchers and promo codes for games, apps, and digital services.",
    icon: Tag,
    color: "142,60%",
  },
  {
    value: "subscription",
    label: "Subscriptions",
    description: "Premium memberships and subscription plans for gaming platforms.",
    icon: Crown,
    color: "45,80%",
  },
];

export default function Categories() {
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const countByCategory = (cat: string) =>
    products.filter((p) => p.category === cat).length;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1
          className="font-orbitron"
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            color: "hsl(210,40%,95%)",
            marginBottom: "0.5rem",
          }}
        >
          Categories
        </h1>
        <p style={{ fontSize: "0.875rem", color: "hsl(220,10%,55%)" }}>
          Browse our digital products by category and find exactly what you need.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const count = isLoading ? null : countByCategory(cat.value);
          return (
            <Link key={cat.value} href={`/products?category=${cat.value}`}>
              <div
                className="game-card"
                style={{ cursor: "pointer", padding: "1.75rem", transition: "transform 0.15s" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.transform = "translateY(-2px)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.transform = "translateY(0)")
                }
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "0.75rem",
                    background: `hsla(${cat.color}%,66%,0.12)`,
                    border: `1px solid hsla(${cat.color}%,66%,0.25)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1rem",
                  }}
                >
                  <Icon size={22} style={{ color: `hsl(${cat.color}%,70%)` }} />
                </div>
                <h2
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "hsl(210,40%,92%)",
                    marginBottom: "0.4rem",
                  }}
                >
                  {cat.label}
                </h2>
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "hsl(220,10%,50%)",
                    lineHeight: 1.55,
                    marginBottom: "1rem",
                  }}
                >
                  {cat.description}
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: `hsl(${cat.color}%,72%)`,
                      fontWeight: 600,
                    }}
                  >
                    {count === null ? "Loading..." : `${count} product${count !== 1 ? "s" : ""}`}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "hsl(220,10%,45%)" }}>Browse →</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div
        style={{
          marginTop: "3rem",
          padding: "2rem",
          background: "hsl(220,20%,9%)",
          border: "1px solid hsl(220,15%,16%)",
          borderRadius: "1rem",
          textAlign: "center",
        }}
      >
        <Zap size={32} style={{ color: "hsl(258,90%,66%)", marginBottom: "0.75rem" }} />
        <h3
          style={{ fontSize: "1rem", fontWeight: 700, color: "hsl(210,40%,90%)", marginBottom: "0.4rem" }}
        >
          Can't find what you're looking for?
        </h3>
        <p style={{ fontSize: "0.85rem", color: "hsl(220,10%,50%)", marginBottom: "1rem" }}>
          Contact our support team and we'll help you find the right product.
        </p>
        <Link href="/support">
          <button className="btn-primary" style={{ fontSize: "0.85rem" }}>
            Contact Support
          </button>
        </Link>
      </div>
    </div>
  );
}
