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

function GameCard({ game }: { game: Game }) {
  return (
    <Link
      href={`/products/${game.slug}`}
      data-testid={`card-game-${game.id}`}
      style={{
        display: "block",
        borderRadius: "0.75rem",
        overflow: "hidden",
        border: "1px solid hsl(var(--primary) / 0.15)",
        background: "hsl(var(--card))",
        textDecoration: "none",
        transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary) / 0.5)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px hsl(var(--primary) / 0.15)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary) / 0.15)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {/* Image — square container, fills fully */}
      <div style={{ aspectRatio: "1/1", position: "relative", overflow: "visible", background: "hsl(258,35%,14%)" }}>
        {game.logoUrl ? (
          <img
            src={game.logoUrl}
            alt={game.name}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Gamepad2 size={40} style={{ color: "hsla(258,90%,66%,0.3)" }} />
          </div>
        )}
        {game.isTrending && (
          <span style={{ position: "absolute", top: "0.4rem", left: "0.4rem", padding: "0.15rem 0.4rem", borderRadius: "4px", background: "hsl(var(--primary))", color: "white", fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.05em" }}>
            HOT
          </span>
        )}
        {/* Game name hanging below */}
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "0.4rem", paddingX: "0" }}>
          <h3 style={{ fontSize: "0.78rem", fontWeight: 700, color: "hsl(var(--foreground))", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingLeft: "0.1rem", paddingRight: "0.1rem" }}>
            {game.name}
          </h3>
        </div>
      </div>
    </Link>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.id}`}
      data-testid={`card-product-${product.id}`}
      style={{
        display: "block",
        borderRadius: "0.75rem",
        overflow: "hidden",
        border: "1px solid hsl(var(--primary) / 0.15)",
        background: "hsl(var(--card))",
        textDecoration: "none",
        transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary) / 0.5)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px hsl(var(--primary) / 0.15)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "hsl(var(--primary) / 0.15)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div
        style={{
          height: "160px",
          background: "linear-gradient(135deg, hsl(258,35%,16%), hsl(220,28%,10%))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Gift size={44} style={{ color: "hsla(258,90%,66%,0.35)" }} />
        )}
      </div>
      <div style={{ padding: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.4rem" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(var(--foreground))", flex: 1 }}>
            {product.title}
          </h3>
          <span className="badge badge-purple" style={{ fontSize: "0.65rem", whiteSpace: "nowrap" }}>
            {categoryLabel(product.category)}
          </span>
        </div>
        {product.description && (
          <p style={{ fontSize: "0.78rem", color: "hsl(var(--muted-foreground))", lineHeight: 1.5 }}>
            {product.description.length > 70 ? product.description.slice(0, 70) + "…" : product.description}
          </p>
        )}
        <div
          style={{
            marginTop: "0.75rem",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "hsl(var(--primary))",
          }}
        >
          View Packages <Zap size={12} />
        </div>
      </div>
    </Link>
  );
}

export default function Products() {
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  // Extract search query parameter from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1] || "");
    const searchParam = params.get("search");
    if (searchParam) {
      setSearch(decodeURIComponent(searchParam));
    }
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
        <p style={{ fontSize: "0.875rem", color: "hsl(var(--muted-foreground))" }}>
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
                  border: `1px solid ${category === cat.value ? "hsla(258,90%,66%,0.5)" : "hsl(var(--border))"}`,
                  background: category === cat.value ? "hsla(258,90%,66%,0.12)" : "transparent",
                  color: category === cat.value ? "hsl(258,90%,74%)" : "hsl(var(--muted-foreground))",
                  fontSize: "0.8rem",
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
        <p style={{ fontSize: "0.78rem", color: "hsl(var(--muted-foreground))", marginBottom: "1.25rem" }}>
          {filtered.length} {filtered.length === 1 ? "item" : "items"} found
        </p>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                aspectRatio: "4/3",
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
          <p style={{ fontSize: "1rem", marginBottom: "0.5rem" }}>No products found.</p>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
