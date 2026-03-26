import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { Zap, ShoppingCart, ArrowLeft } from "lucide-react";
import { useCartStore } from "@/lib/store/cartStore";
import { useAuthStore } from "@/lib/store/authstore";
import type { Product, Service } from "@shared/schema";

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

  const [selectedSvc, setSelectedSvc] = useState<string | null>(null);
  const [userId, setUserId] = useState(user?.id ?? "");
  const [zoneId, setZoneId] = useState("");
  const [added, setAdded] = useState(false);

  const { data: product, isLoading, isError } = useQuery<Product>({
    queryKey: [`/api/products/${params.id}`],
    enabled: !!params.id,
  });

  // Load real services for this product (using product id as gameId for now)
  const { data: services = [], isLoading: svcsLoading } = useQuery<Service[]>({
    queryKey: [`/api/services?gameId=${params.id}`],
    queryFn: async () => {
      const res = await fetch(`/api/services?gameId=${params.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!params.id,
  });

  function handleAddToCart() {
    if (!product) return;
    const svc = services.find((s) => s.id === selectedSvc);
    if (!svc || !userId.trim()) return;
    addItem({
      productId: product.id,
      productTitle: product.title,
      productImage: product.imageUrl ?? "",
      packageId: svc.id,
      packageName: svc.name,
      price: parseFloat(String(svc.finalPrice)),
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
        <div style={{ height: "400px", background: "hsl(220,20%,9%)", border: "1px solid hsl(220,15%,14%)", borderRadius: "1rem", animation: "pulse 1.5s infinite" }} />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.5rem", textAlign: "center" }}>
        <Zap size={48} style={{ color: "hsl(258,90%,66%)", opacity: 0.3, marginBottom: "1rem" }} />
        <h2 style={{ color: "hsl(210,40%,80%)", marginBottom: "0.5rem" }}>Product not found</h2>
        <button className="btn-secondary" onClick={() => navigate("/products")}>
          <ArrowLeft size={16} /> Back to Products
        </button>
      </div>
    );
  }

  const needsZone = product.category === "game_currency";
  const hasServices = services.length > 0;

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <button className="btn-secondary" onClick={() => navigate("/products")} style={{ marginBottom: "1.5rem" }}>
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
            <img src={product.imageUrl} alt={product.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
            <h1 className="font-orbitron" style={{ fontSize: "1.5rem", fontWeight: 800, color: "hsl(210,40%,95%)", marginBottom: "0.5rem" }}>
              {product.title}
            </h1>
            {product.description && (
              <p style={{ fontSize: "0.875rem", color: "hsl(220,10%,55%)", lineHeight: 1.6 }}>
                {product.description}
              </p>
            )}
          </div>

          {/* Package / service selection */}
          <div>
            <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "hsl(220,10%,65%)", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Select Package
            </p>

            {svcsLoading ? (
              <div style={{ padding: "1rem", textAlign: "center", color: "hsl(220,10%,45%)", fontSize: "13px" }}>
                Loading packages...
              </div>
            ) : !hasServices ? (
              <div style={{ padding: "1rem", textAlign: "center", color: "hsl(220,10%,40%)", fontSize: "13px", border: "1px dashed hsl(220,15%,18%)", borderRadius: "8px" }}>
                No packages available yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {services.map((svc) => {
                  const price = parseFloat(String(svc.finalPrice));
                  const orig = parseFloat(String(svc.price));
                  const hasDiscount = parseFloat(String(svc.discountPercent)) > 0;
                  return (
                    <button
                      key={svc.id}
                      onClick={() => setSelectedSvc(svc.id)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.55rem 0.85rem",
                        borderRadius: "0.5rem",
                        background: selectedSvc === svc.id ? "hsla(258,90%,66%,0.15)" : "hsl(220,20%,11%)",
                        border: `1px solid ${selectedSvc === svc.id ? "hsla(258,90%,66%,0.5)" : "hsl(220,15%,18%)"}`,
                        cursor: "pointer",
                        color: "hsl(210,40%,90%)",
                        fontSize: "0.82rem",
                        fontWeight: 500,
                        textAlign: "left",
                        width: "100%",
                        transition: "all 0.15s",
                      }}
                    >
                      <span>{svc.name}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        {hasDiscount && (
                          <span style={{ fontSize: "0.72rem", color: "hsl(220,10%,45%)", textDecoration: "line-through" }}>
                            {svc.currency} {orig.toFixed(2)}
                          </span>
                        )}
                        <span style={{ color: "hsl(258,90%,72%)", fontWeight: 700 }}>
                          {svc.currency} {price.toFixed(2)}
                        </span>
                        {hasDiscount && (
                          <span style={{ fontSize: "0.65rem", background: "rgba(74,222,128,0.12)", color: "hsl(142,71%,55%)", padding: "1px 5px", borderRadius: "3px", fontWeight: 600 }}>
                            -{svc.discountPercent}%
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
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
            disabled={!selectedSvc || !userId.trim() || added || !hasServices}
          >
            <ShoppingCart size={16} />
            {added ? "Added to Cart!" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}
