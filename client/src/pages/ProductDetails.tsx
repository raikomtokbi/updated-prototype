import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { Zap, ShoppingCart, ArrowLeft } from "lucide-react";
import { useCartStore } from "@/lib/store/cartStore";
import { useAuthStore } from "@/lib/store/authstore";
import type { Product } from "@shared/schema";

const MOCK_PACKAGES = [
  { id: "pkg-1", label: "Starter Pack", price: 2.99, originalPrice: undefined },
  { id: "pkg-2", label: "Basic Pack", price: 5.99, originalPrice: 7.99 },
  { id: "pkg-3", label: "Popular Pack", price: 12.99, originalPrice: 15.99 },
  { id: "pkg-4", label: "Premium Pack", price: 24.99, originalPrice: 29.99 },
  { id: "pkg-5", label: "Ultimate Pack", price: 49.99, originalPrice: 59.99 },
];

const CATEGORY_LABELS: Record<string, string> = {
  game_currency: "Game Currency",
  gift_card: "Gift Card",
  voucher: "Voucher",
  subscription: "Subscription",
};

export default function ProductDetails() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);

  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [userId, setUserId] = useState(user?.id ?? "");
  const [zoneId, setZoneId] = useState("");
  const [added, setAdded] = useState(false);

  const { data: product, isLoading, isError } = useQuery<Product>({
    queryKey: [`/api/products/${params.id}`],
    enabled: !!params.id,
  });

  function handleAddToCart() {
    if (!product) return;
    const pkg = MOCK_PACKAGES.find((p) => p.id === selectedPkg);
    if (!pkg || !userId.trim()) return;
    addItem({
      productId: product.id,
      productTitle: product.title,
      productImage: product.imageUrl ?? "",
      packageId: pkg.id,
      packageName: pkg.label,
      price: pkg.price,
      userId: userId.trim(),
      zoneId: product.category === "game_currency" ? zoneId.trim() : undefined,
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (isLoading) {
    return (
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <div
          style={{
            height: "400px",
            background: "hsl(220,20%,9%)",
            border: "1px solid hsl(220,15%,14%)",
            borderRadius: "1rem",
            animation: "pulse 1.5s infinite",
          }}
        />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          padding: "2.5rem 1.5rem",
          textAlign: "center",
        }}
      >
        <Zap size={48} style={{ color: "hsl(258,90%,66%)", opacity: 0.3, marginBottom: "1rem" }} />
        <h2 style={{ color: "hsl(210,40%,80%)", marginBottom: "0.5rem" }}>Product not found</h2>
        <button className="btn-secondary" onClick={() => navigate("/products")}>
          <ArrowLeft size={16} /> Back to Products
        </button>
      </div>
    );
  }

  const needsZone = product.category === "game_currency";

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <button
        className="btn-secondary"
        onClick={() => navigate("/products")}
        style={{ marginBottom: "1.5rem" }}
      >
        <ArrowLeft size={16} /> Back to Products
      </button>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,1fr) minmax(0,1.2fr)",
          gap: "2rem",
          alignItems: "start",
        }}
      >
        {/* Image */}
        <div
          style={{
            height: "280px",
            background: "linear-gradient(135deg, hsl(258,35%,16%), hsl(220,28%,10%))",
            borderRadius: "1rem",
            border: "1px solid hsl(220,15%,18%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
            <Zap size={64} style={{ color: "hsla(258,90%,66%,0.35)" }} />
          )}
        </div>

        {/* Info + purchase */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.6rem" }}>
              <span className="badge badge-purple">
                {CATEGORY_LABELS[product.category] ?? product.category}
              </span>
            </div>
            <h1
              className="font-orbitron"
              style={{ fontSize: "1.5rem", fontWeight: 800, color: "hsl(210,40%,95%)", marginBottom: "0.5rem" }}
            >
              {product.title}
            </h1>
            {product.description && (
              <p style={{ fontSize: "0.875rem", color: "hsl(220,10%,55%)", lineHeight: 1.6 }}>
                {product.description}
              </p>
            )}
          </div>

          {/* Package selection */}
          <div>
            <p
              style={{
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "hsl(220,10%,65%)",
                marginBottom: "0.6rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Select Package
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {MOCK_PACKAGES.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => setSelectedPkg(pkg.id)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.55rem 0.85rem",
                    borderRadius: "0.5rem",
                    background:
                      selectedPkg === pkg.id ? "hsla(258,90%,66%,0.15)" : "hsl(220,20%,11%)",
                    border: `1px solid ${
                      selectedPkg === pkg.id
                        ? "hsla(258,90%,66%,0.5)"
                        : "hsl(220,15%,18%)"
                    }`,
                    cursor: "pointer",
                    color: "hsl(210,40%,90%)",
                    fontSize: "0.82rem",
                    fontWeight: 500,
                    textAlign: "left",
                    width: "100%",
                    transition: "all 0.15s",
                  }}
                >
                  <span>{pkg.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    {pkg.originalPrice && (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: "hsl(220,10%,45%)",
                          textDecoration: "line-through",
                        }}
                      >
                        ${pkg.originalPrice.toFixed(2)}
                      </span>
                    )}
                    <span style={{ color: "hsl(258,90%,72%)", fontWeight: 700 }}>
                      ${pkg.price.toFixed(2)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Player info */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <input
              className="input-field"
              placeholder="Player ID / Username"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            {needsZone && (
              <input
                className="input-field"
                placeholder="Zone ID (if required)"
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
              />
            )}
          </div>

          <button
            className="btn-primary"
            style={{ width: "100%" }}
            onClick={handleAddToCart}
            disabled={!selectedPkg || !userId.trim() || added}
          >
            <ShoppingCart size={16} />
            {added ? "Added to Cart!" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
