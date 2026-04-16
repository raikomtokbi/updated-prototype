import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Search, Zap, Gamepad2, Gift, Ticket, RefreshCcw } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { Game, Product } from "@shared/schema";

const CATEGORIES = [
  { value: "all", label: "All", icon: null },
  { value: "games", label: "Games", icon: Gamepad2 },
  { value: "gift_card", label: "Gift Cards", icon: Gift },
  { value: "voucher", label: "Vouchers", icon: Ticket },
  { value: "subscription", label: "Subscriptions", icon: RefreshCcw },
];

type UnifiedItem =
  | { kind: "game"; data: Game }
  | { kind: "product"; data: Product };

function categoryLabel(cat: string) {
  if (cat === "gift_card") return "Gift Card";
  if (cat === "voucher") return "Voucher";
  if (cat === "subscription") return "Subscription";
  return cat;
}

const cardHoverIn = (e: React.MouseEvent<HTMLAnchorElement>) => {
  const img = e.currentTarget.querySelector<HTMLElement>(".card-img");
  if (img) {
    img.style.borderColor = "hsl(var(--primary) / 0.5)";
    img.style.transform = "translateY(-3px)";
    img.style.boxShadow = "0 8px 24px hsl(var(--primary) / 0.15)";
  }
};
const cardHoverOut = (e: React.MouseEvent<HTMLAnchorElement>) => {
  const img = e.currentTarget.querySelector<HTMLElement>(".card-img");
  if (img) {
    img.style.borderColor = "hsl(var(--primary) / 0.15)";
    img.style.transform = "translateY(0)";
    img.style.boxShadow = "none";
  }
};

const cardImgStyle: React.CSSProperties = {
  aspectRatio: "1/1",
  position: "relative",
  overflow: "hidden",
  borderRadius: "0.75rem",
  border: "1px solid hsl(var(--primary) / 0.15)",
  transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
};

function GameCard({ game }: { game: Game }) {
  return (
    <Link
      href={`/products/${game.slug}`}
      data-testid={`card-game-${game.id}`}
      style={{ display: "flex", flexDirection: "column", textDecoration: "none", cursor: "pointer" }}
      onMouseEnter={cardHoverIn}
      onMouseLeave={cardHoverOut}
    >
      <div className="card-img" style={{ ...cardImgStyle, background: "hsl(var(--card))" }}>
        {game.logoUrl ? (
          <img src={game.logoUrl} alt={game.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Gamepad2 size={28} style={{ color: "hsl(var(--primary) / 0.3)" }} />
          </div>
        )}
        {game.isTrending && (
          <span style={{ position: "absolute", top: "0.3rem", left: "0.3rem", padding: "0.1rem 0.35rem", borderRadius: "3px", background: "hsl(var(--primary))", color: "white", fontSize: "0.55rem", fontWeight: 800, letterSpacing: "0.05em" }}>
            HOT
          </span>
        )}
      </div>
      <h3 style={{ fontSize: "0.62rem", fontWeight: 600, color: "hsl(var(--foreground))", margin: "0.3rem 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {game.name}
      </h3>
    </Link>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.id}`}
      data-testid={`card-product-${product.id}`}
      style={{ display: "flex", flexDirection: "column", textDecoration: "none", cursor: "pointer" }}
      onMouseEnter={cardHoverIn}
      onMouseLeave={cardHoverOut}
    >
      <div className="card-img" style={{ ...cardImgStyle, background: "linear-gradient(135deg, hsl(var(--card)), hsl(var(--muted)))" }}>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Gift size={28} style={{ color: "hsl(var(--primary) / 0.35)" }} />
          </div>
        )}
        <span style={{ position: "absolute", bottom: "0.3rem", right: "0.3rem", padding: "0.1rem 0.35rem", borderRadius: "3px", background: "hsl(var(--primary) / 0.85)", color: "white", fontSize: "0.52rem", fontWeight: 700, letterSpacing: "0.03em" }}>
          {categoryLabel(product.category)}
        </span>
      </div>
      <h3 style={{ fontSize: "0.62rem", fontWeight: 600, color: "hsl(var(--foreground))", margin: "0.3rem 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {product.title}
      </h3>
    </Link>
  );
}

export default function Products() {
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  // Sync search and category from URL query params
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1] || "");
    setSearch(decodeURIComponent(params.get("search") ?? ""));
    setCategory(params.get("category") ?? "all");
  }, [location]);

  const { data: games = [], isLoading: gamesLoading } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const isLoading = gamesLoading || productsLoading;

  const unified: UnifiedItem[] = [
    ...games.map((g): UnifiedItem => ({ kind: "game", data: g })),
    ...products.filter((p) => p.isActive).map((p): UnifiedItem => ({ kind: "product", data: p })),
  ];

  const filtered = unified.filter((item) => {
    const name = item.kind === "game" ? item.data.name : item.data.title;
    const matchSearch = name.toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (category === "all") return true;
    if (category === "games") return item.kind === "game";
    if (item.kind === "product") return item.data.category === category;
    return false;
  });

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1
          className="font-orbitron"
          style={{ fontSize: "1.75rem", fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: "0.5rem" }}
        >
          All Products
        </h1>
        <p style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))" }}>
          Game top-ups, gift cards, vouchers, and subscription plans — all in one place.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1", minWidth: "200px" }}>
          <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "hsl(var(--muted-foreground))", pointerEvents: "none" }} />
          <input
            className="input-field"
            placeholder="Search games, gift cards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "2.25rem" }}
            data-testid="input-search-products"
          />
        </div>

        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                data-testid={`button-filter-${cat.value}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  padding: "0.45rem 0.9rem",
                  borderRadius: "0.5rem",
                  border: `1px solid ${category === cat.value ? "hsl(var(--primary) / 0.5)" : "hsl(var(--border))"}`,
                  background: category === cat.value ? "hsl(var(--primary) / 0.12)" : "transparent",
                  color: category === cat.value ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                  fontSize: "0.68rem",
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {Icon && <Icon size={13} />}
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Count */}
      {!isLoading && (
        <p style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))", marginBottom: "1.25rem" }}>
          {filtered.length} {filtered.length === 1 ? "item" : "items"} found
        </p>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              style={{
                aspectRatio: "1/1",
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.75rem",
                animation: "pulse 1.5s infinite",
              }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "5rem 1rem", color: "hsl(var(--muted-foreground))" }}>
          <Zap size={48} style={{ marginBottom: "1rem", opacity: 0.3 }} />
          <p style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>No products found.</p>
          {search && (
            <button
              className="btn-secondary"
              onClick={() => setSearch("")}
              style={{ marginTop: "1rem" }}
              data-testid="button-clear-search"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {filtered.map((item) =>
            item.kind === "game" ? (
              <GameCard key={`game-${item.data.id}`} game={item.data} />
            ) : (
              <ProductCard key={`product-${item.data.id}`} product={item.data} />
            )
          )}
        </div>
      )}
    </div>
  );
}
