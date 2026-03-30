import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { Zap, ShoppingCart, ArrowLeft, Gamepad2, Gift, RefreshCcw } from "lucide-react";
import { useCartStore } from "@/lib/store/cartStore";
import { useAuthStore } from "@/lib/store/authstore";
import type { Game, Product, Service, ProductPackage } from "@shared/schema";

const CATEGORY_LABELS: Record<string, string> = {
  game_currency: "Game Currency",
  gift_card: "Gift Card",
  voucher: "Voucher",
  subscription: "Subscription",
};

function ServicePackages({
  gameId,
  onSelect,
  selected,
}: {
  gameId: string;
  onSelect: (id: string) => void;
  selected: string | null;
}) {
  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: [`/api/services?gameId=${gameId}`],
    queryFn: async () => {
      const res = await fetch(`/api/services?gameId=${gameId}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (isLoading) {
    return <div style={{ padding: "1rem", textAlign: "center", color: "hsl(220,10%,45%)", fontSize: "13px" }}>Loading packages…</div>;
  }
  if (services.length === 0) {
    return (
      <div style={{ padding: "1rem", textAlign: "center", color: "hsl(220,10%,40%)", fontSize: "13px", border: "1px dashed hsl(220,15%,18%)", borderRadius: "8px" }}>
        No packages available yet.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      {services.map((svc) => {
        const price = parseFloat(String(svc.finalPrice));
        const orig = parseFloat(String(svc.price));
        const hasDiscount = parseFloat(String(svc.discountPercent)) > 0;
        return (
          <button
            key={svc.id}
            onClick={() => onSelect(svc.id)}
            data-testid={`button-package-${svc.id}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.55rem 0.85rem",
              borderRadius: "0.5rem",
              background: selected === svc.id ? "hsla(258,90%,66%,0.15)" : "hsl(220,20%,11%)",
              border: `1px solid ${selected === svc.id ? "hsla(258,90%,66%,0.5)" : "hsl(220,15%,18%)"}`,
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
  );
}

function ProductPackages({
  productId,
  onSelect,
  selected,
}: {
  productId: string;
  onSelect: (id: string) => void;
  selected: string | null;
}) {
  const { data: packages = [], isLoading } = useQuery<ProductPackage[]>({
    queryKey: [`/api/products/${productId}/packages`],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}/packages`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (isLoading) {
    return <div style={{ padding: "1rem", textAlign: "center", color: "hsl(220,10%,45%)", fontSize: "13px" }}>Loading packages…</div>;
  }
  if (packages.length === 0) {
    return (
      <div style={{ padding: "1rem", textAlign: "center", color: "hsl(220,10%,40%)", fontSize: "13px", border: "1px dashed hsl(220,15%,18%)", borderRadius: "8px" }}>
        No packages available yet.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
      {packages.filter((p) => p.isActive).map((pkg) => {
        const price = parseFloat(String(pkg.price));
        const orig = pkg.originalPrice ? parseFloat(String(pkg.originalPrice)) : null;
        const hasDiscount = orig !== null && orig > price;
        return (
          <button
            key={pkg.id}
            onClick={() => onSelect(pkg.id)}
            data-testid={`button-package-${pkg.id}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "0.55rem 0.85rem",
              borderRadius: "0.5rem",
              background: selected === pkg.id ? "hsla(258,90%,66%,0.15)" : "hsl(220,20%,11%)",
              border: `1px solid ${selected === pkg.id ? "hsla(258,90%,66%,0.5)" : "hsl(220,15%,18%)"}`,
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
              {hasDiscount && orig && (
                <span style={{ fontSize: "0.72rem", color: "hsl(220,10%,45%)", textDecoration: "line-through" }}>
                  ${orig.toFixed(2)}
                </span>
              )}
              <span style={{ color: "hsl(258,90%,72%)", fontWeight: 700 }}>${price.toFixed(2)}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function GameDetailView({ game }: { game: Game }) {
  const [, navigate] = useLocation();
  const { user } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);
  const [selectedSvc, setSelectedSvc] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [added, setAdded] = useState(false);

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: [`/api/services?gameId=${game.id}`],
    queryFn: async () => {
      const res = await fetch(`/api/services?gameId=${game.id}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  function handleAddToCart() {
    const svc = services.find((s) => s.id === selectedSvc);
    if (!svc || !userId.trim()) return;
    addItem({
      productId: game.id,
      productTitle: game.name,
      productImage: game.logoUrl ?? "",
      packageId: svc.id,
      packageName: svc.name,
      price: parseFloat(String(svc.finalPrice)),
      userId: userId.trim(),
      zoneId: zoneId.trim() || undefined,
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <button className="btn-secondary" onClick={() => navigate("/products")} style={{ marginBottom: "1.5rem" }} data-testid="button-back">
        <ArrowLeft size={16} /> Back to Products
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.2fr)", gap: "2rem", alignItems: "start" }}>
        <div style={{ height: "280px", background: "linear-gradient(135deg, hsl(258,35%,16%), hsl(220,28%,10%))", borderRadius: "1rem", border: "1px solid hsl(220,15%,18%)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {game.logoUrl ? (
            <img src={game.logoUrl} alt={game.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <Gamepad2 size={64} style={{ color: "hsla(258,90%,66%,0.35)" }} />
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.6rem" }}>
              <span className="badge badge-purple">Game Top-Up</span>
            </div>
            <h1 className="font-orbitron" style={{ fontSize: "1.5rem", fontWeight: 800, color: "hsl(210,40%,95%)", marginBottom: "0.5rem" }}>
              {game.name}
            </h1>
            {game.description && (
              <p style={{ fontSize: "0.875rem", color: "hsl(220,10%,55%)", lineHeight: 1.6 }}>{game.description}</p>
            )}
          </div>

          <div>
            <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "hsl(220,10%,65%)", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Select Package
            </p>
            <ServicePackages gameId={game.id} onSelect={setSelectedSvc} selected={selectedSvc} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <input
              className="input-field"
              placeholder="Player ID / Username *"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              data-testid="input-player-id"
            />
            <input
              className="input-field"
              placeholder="Zone ID (if required)"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              data-testid="input-zone-id"
            />
          </div>

          <button
            className="btn-primary"
            style={{ width: "100%" }}
            onClick={handleAddToCart}
            disabled={!selectedSvc || !userId.trim() || added}
            data-testid="button-add-to-cart"
          >
            <ShoppingCart size={16} />
            {added ? "Added to Cart!" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductDetailView({ product }: { product: Product }) {
  const [, navigate] = useLocation();
  const { user } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [added, setAdded] = useState(false);

  const { data: packages = [] } = useQuery<ProductPackage[]>({
    queryKey: [`/api/products/${product.id}/packages`],
    queryFn: async () => {
      const res = await fetch(`/api/products/${product.id}/packages`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  function handleAddToCart() {
    const pkg = packages.find((p) => p.id === selectedPkg);
    if (!pkg || !userId.trim()) return;
    addItem({
      productId: product.id,
      productTitle: product.title,
      productImage: product.imageUrl ?? "",
      packageId: pkg.id,
      packageName: pkg.label,
      price: parseFloat(String(pkg.price)),
      userId: userId.trim(),
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  const Icon = product.category === "subscription" ? RefreshCcw : Gift;

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <button className="btn-secondary" onClick={() => navigate("/products")} style={{ marginBottom: "1.5rem" }} data-testid="button-back">
        <ArrowLeft size={16} /> Back to Products
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.2fr)", gap: "2rem", alignItems: "start" }}>
        <div style={{ height: "280px", background: "linear-gradient(135deg, hsl(258,35%,16%), hsl(220,28%,10%))", borderRadius: "1rem", border: "1px solid hsl(220,15%,18%)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <Icon size={64} style={{ color: "hsla(258,90%,66%,0.35)" }} />
          )}
        </div>

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
              <p style={{ fontSize: "0.875rem", color: "hsl(220,10%,55%)", lineHeight: 1.6 }}>{product.description}</p>
            )}
          </div>

          <div>
            <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "hsl(220,10%,65%)", marginBottom: "0.6rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Select Package
            </p>
            <ProductPackages productId={product.id} onSelect={setSelectedPkg} selected={selectedPkg} />
          </div>

          <div>
            <input
              className="input-field"
              placeholder="Your Username / Account ID *"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              data-testid="input-player-id"
            />
          </div>

          <button
            className="btn-primary"
            style={{ width: "100%" }}
            onClick={handleAddToCart}
            disabled={!selectedPkg || !userId.trim() || added || packages.length === 0}
            data-testid="button-add-to-cart"
          >
            <ShoppingCart size={16} />
            {added ? "Added to Cart!" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetails() {
  const params = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const slug = params.slug ?? "";

  const { data: game, isLoading: gameLoading, isError: gameError } = useQuery<Game>({
    queryKey: [`/api/games/by-slug/${slug}`],
    queryFn: async () => {
      const res = await fetch(`/api/games/by-slug/${slug}`);
      if (!res.ok) throw new Error("Not a game");
      return res.json();
    },
    retry: false,
    enabled: !!slug,
  });

  const { data: product, isLoading: productLoading, isError: productError } = useQuery<Product>({
    queryKey: [`/api/products/${slug}`],
    queryFn: async () => {
      const res = await fetch(`/api/products/${slug}`);
      if (!res.ok) throw new Error("Not a product");
      return res.json();
    },
    retry: false,
    enabled: !!slug && gameError,
  });

  const isLoading = gameLoading || (gameError && productLoading);
  const notFound = gameError && productError;

  if (isLoading) {
    return (
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        <div style={{ height: "400px", background: "hsl(220,20%,9%)", border: "1px solid hsl(220,15%,14%)", borderRadius: "1rem", animation: "pulse 1.5s infinite" }} />
      </div>
    );
  }

  if (notFound) {
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

  if (game) return <GameDetailView game={game} />;
  if (product) return <ProductDetailView product={product} />;
  return null;
}
