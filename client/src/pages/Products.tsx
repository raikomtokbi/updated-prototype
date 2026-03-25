import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Zap, ShoppingCart, ChevronDown } from "lucide-react";
import { useCartStore } from "@/lib/store/cartStore";
import { useAuthStore } from "@/lib/store/authstore";
import type { Product } from "@shared/schema";

const CATEGORIES = [
  { value: "all", label: "All Games" },
  { value: "game_currency", label: "Game Currency" },
  { value: "gift_card", label: "Gift Cards" },
  { value: "voucher", label: "Vouchers" },
  { value: "subscription", label: "Subscriptions" },
];

const MOCK_PACKAGES: Record<string, { id: string; label: string; price: number; originalPrice?: number }[]> = {};

function ProductCard({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const addItem = useCartStore((s) => s.addItem);
  const { user } = useAuthStore();

  const mockPkgs = [
    { id: "pkg-1", label: "Starter Pack", price: 2.99 },
    { id: "pkg-2", label: "Basic Pack", price: 5.99, originalPrice: 7.99 },
    { id: "pkg-3", label: "Popular Pack", price: 12.99, originalPrice: 15.99 },
    { id: "pkg-4", label: "Premium Pack", price: 24.99, originalPrice: 29.99 },
  ];

  const needsZone = product.category === "game_currency";

  function handleAddToCart() {
    const pkg = mockPkgs.find((p) => p.id === selectedPkg);
    if (!pkg || !userId.trim()) return;
    addItem({
      productId: product.id,
      productTitle: product.title,
      productImage: product.imageUrl ?? "",
      packageId: pkg.id,
      packageName: pkg.label,
      price: pkg.price,
      userId: userId.trim(),
      zoneId: needsZone ? zoneId.trim() : undefined,
      quantity: 1,
    });
    setOpen(false);
    setSelectedPkg(null);
    setUserId(user?.id ?? "");
    setZoneId("");
  }

  return (
    <div className="game-card" data-testid={`card-product-${product.id}`}>
      <div
        style={{
          height: "160px",
          background: "linear-gradient(135deg, hsl(258,35%,16%), hsl(220,28%,10%))",
          borderRadius: "0.75rem 0.75rem 0 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Zap size={44} style={{ color: "hsla(258,90%,66%,0.35)" }} />
        )}
      </div>

      <div style={{ padding: "1.1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(210, 40%, 92%)", flex: 1 }}>
            {product.title}
          </h3>
          <span className="badge badge-purple">{product.category.replace("_", " ")}</span>
        </div>
        {product.description && (
          <p style={{ fontSize: "0.78rem", color: "hsl(220, 10%, 50%)", marginBottom: "0.75rem", lineHeight: 1.5 }}>
            {product.description.length > 80 ? product.description.slice(0, 80) + "…" : product.description}
          </p>
        )}

        <button
          className="btn-primary"
          style={{ width: "100%", fontSize: "0.8rem", padding: "0.5rem" }}
          onClick={() => setOpen(!open)}
          data-testid={`button-select-package-${product.id}`}
        >
          <ShoppingCart size={14} />
          {open ? "Close" : "Select Package"}
          <ChevronDown size={14} style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }} />
        </button>

        {open && (
          <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {/* Package selection */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {mockPkgs.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPkg(pkg.id)}
                  data-testid={`button-package-${pkg.id}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.5rem 0.75rem",
                    borderRadius: "0.4rem",
                    background: selectedPkg === pkg.id ? "hsla(258,90%,66%,0.15)" : "hsl(220,20%,11%)",
                    border: `1px solid ${selectedPkg === pkg.id ? "hsla(258,90%,66%,0.5)" : "hsl(220,15%,18%)"}`,
                    cursor: "pointer",
                    color: "hsl(210,40%,90%)",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    textAlign: "left",
                    width: "100%",
                    transition: "all 0.15s",
                  }}
                >
                  <span>{pkg.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    {pkg.originalPrice && (
                      <span style={{ fontSize: "0.7rem", color: "hsl(220,10%,45%)", textDecoration: "line-through" }}>
                        ${pkg.originalPrice.toFixed(2)}
                      </span>
                    )}
                    <span style={{ color: "hsl(258,90%,72%)", fontWeight: 700 }}>${pkg.price.toFixed(2)}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* User info */}
            <input
              className="input-field"
              placeholder="Player ID / Username"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              data-testid="input-player-id"
              style={{ marginTop: "0.25rem" }}
            />
            {needsZone && (
              <input
                className="input-field"
                placeholder="Zone ID (if required)"
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                data-testid="input-zone-id"
              />
            )}

            <button
              className="btn-primary"
              style={{ width: "100%", fontSize: "0.8rem", padding: "0.5rem", marginTop: "0.25rem" }}
              onClick={handleAddToCart}
              disabled={!selectedPkg || !userId.trim()}
              data-testid="button-add-to-cart"
            >
              <ShoppingCart size={14} />
              Add to Cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Products() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data: products = [], isLoading } = useQuery<Product[]>({ queryKey: ["/api/products"] });

  const filtered = products.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === "all" || p.category === category;
    return matchSearch && matchCat;
  });

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1
          className="font-orbitron"
          style={{ fontSize: "1.75rem", fontWeight: 700, color: "hsl(210, 40%, 95%)", marginBottom: "0.5rem" }}
        >
          All Products
        </h1>
        <p style={{ fontSize: "0.875rem", color: "hsl(220, 10%, 55%)" }}>
          Choose your game and select a package to top up instantly.
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1", minWidth: "200px" }}>
          <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "hsl(220,10%,45%)", pointerEvents: "none" }} />
          <input
            className="input-field"
            placeholder="Search games..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: "2.25rem" }}
            data-testid="input-search-products"
          />
        </div>

        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              data-testid={`button-filter-${cat.value}`}
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: "0.5rem",
                border: `1px solid ${category === cat.value ? "hsla(258,90%,66%,0.5)" : "hsl(220,15%,20%)"}`,
                background: category === cat.value ? "hsla(258,90%,66%,0.12)" : "transparent",
                color: category === cat.value ? "hsl(258,90%,74%)" : "hsl(220,10%,55%)",
                fontSize: "0.8rem",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.25rem" }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                height: "280px",
                background: "hsl(220, 20%, 9%)",
                border: "1px solid hsl(220, 15%, 14%)",
                borderRadius: "0.75rem",
                animation: "pulse 1.5s infinite",
              }}
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "5rem 1rem",
            color: "hsl(220, 10%, 45%)",
          }}
        >
          <Zap size={48} style={{ marginBottom: "1rem", opacity: 0.3 }} />
          <p style={{ fontSize: "1rem" }}>No products found.</p>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1.25rem" }}>
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {!isLoading && products.length === 0 && (
        <div
          style={{
            marginTop: "2rem",
            padding: "2rem",
            background: "hsl(220, 20%, 9%)",
            border: "1px solid hsl(220, 15%, 16%)",
            borderRadius: "0.75rem",
            textAlign: "center",
          }}
        >
          <p style={{ color: "hsl(220, 10%, 55%)", fontSize: "0.9rem" }}>
            No products in the catalog yet. Check back soon or contact an admin to add products.
          </p>
        </div>
      )}
    </div>
  );
}
