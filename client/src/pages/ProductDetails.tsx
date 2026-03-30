import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { Zap, ShoppingCart, ArrowLeft, Gamepad2, Gift, RefreshCcw, Plus, Minus, BoltIcon, CheckCircle2, AlertCircle } from "lucide-react";
import { useCartStore } from "@/lib/store/cartStore";
import type { Game, Product, Service, ProductPackage } from "@shared/schema";

const CATEGORY_LABELS: Record<string, string> = {
  game_currency: "Game Currency",
  gift_card: "Gift Card",
  voucher: "Voucher",
  subscription: "Subscription",
};

// ─── Package grid card ────────────────────────────────────────────────────────
function PackageCard({
  id,
  name,
  price,
  originalPrice,
  currency,
  discount,
  selected,
  onSelect,
}: {
  id: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  currency?: string;
  discount?: string | number | null;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const hasDiscount = discount && parseFloat(String(discount)) > 0 && originalPrice && originalPrice > price;
  const curr = currency ?? "";

  return (
    <button
      onClick={() => onSelect(id)}
      data-testid={`button-package-${id}`}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "4px",
        padding: "12px 8px",
        borderRadius: "10px",
        background: selected
          ? "linear-gradient(135deg, hsla(258,90%,66%,0.22), hsla(258,90%,50%,0.12))"
          : "hsl(220,20%,11%)",
        border: `2px solid ${selected ? "hsl(258,90%,62%)" : "hsl(220,15%,18%)"}`,
        cursor: "pointer",
        color: selected ? "hsl(210,40%,96%)" : "hsl(210,40%,80%)",
        transition: "all 0.15s ease",
        minHeight: "72px",
        width: "100%",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      {selected && (
        <span style={{
          position: "absolute", top: "5px", right: "5px",
          color: "hsl(258,90%,66%)", display: "flex",
        }}>
          <CheckCircle2 size={13} />
        </span>
      )}
      {hasDiscount && (
        <span style={{
          position: "absolute", top: "5px", left: "5px",
          background: "rgba(74,222,128,0.15)", color: "hsl(142,71%,52%)",
          fontSize: "9px", fontWeight: 700, padding: "1px 4px",
          borderRadius: "3px",
        }}>
          -{discount}%
        </span>
      )}
      <span style={{ fontSize: "12px", fontWeight: 600, lineHeight: 1.3, wordBreak: "break-word" }}>
        {name}
      </span>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" }}>
        {hasDiscount && originalPrice && (
          <span style={{ fontSize: "10px", color: "hsl(220,10%,42%)", textDecoration: "line-through" }}>
            {curr} {originalPrice.toFixed(2)}
          </span>
        )}
        <span style={{
          fontSize: "13px", fontWeight: 700,
          color: selected ? "hsl(258,80%,78%)" : "hsl(258,90%,70%)",
        }}>
          {curr} {price.toFixed(2)}
        </span>
      </div>
    </button>
  );
}

// ─── Quantity selector ────────────────────────────────────────────────────────
function QuantitySelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0", border: "1px solid hsl(220,15%,20%)", borderRadius: "8px", overflow: "hidden", width: "fit-content" }}>
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        data-testid="button-qty-minus"
        style={{
          width: "38px", height: "38px", background: "hsl(220,20%,12%)",
          border: "none", cursor: "pointer", color: "hsl(210,40%,75%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "16px", transition: "background 0.15s",
        }}
      >
        <Minus size={14} />
      </button>
      <span data-testid="text-qty" style={{
        minWidth: "44px", height: "38px", background: "hsl(220,20%,9%)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "hsl(210,40%,92%)", fontSize: "14px", fontWeight: 700,
        borderLeft: "1px solid hsl(220,15%,18%)", borderRight: "1px solid hsl(220,15%,18%)",
      }}>
        {value}
      </span>
      <button
        onClick={() => onChange(value + 1)}
        data-testid="button-qty-plus"
        style={{
          width: "38px", height: "38px", background: "hsl(220,20%,12%)",
          border: "none", cursor: "pointer", color: "hsl(210,40%,75%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "16px", transition: "background 0.15s",
        }}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

// ─── Info block ───────────────────────────────────────────────────────────────
function InfoSection({ items }: { items: { icon?: string; text: string }[] }) {
  if (!items.length) return null;
  return (
    <div style={{
      background: "hsl(220,20%,10%)",
      border: "1px solid hsl(220,15%,16%)",
      borderRadius: "10px",
      padding: "12px 14px",
      display: "flex", flexDirection: "column", gap: "8px",
    }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
          <span style={{ color: "hsl(258,90%,66%)", marginTop: "1px", flexShrink: 0 }}>
            <BoltIcon size={12} />
          </span>
          <span style={{ fontSize: "12px", color: "hsl(220,10%,60%)", lineHeight: 1.5 }}>
            {item.text}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Validation message ───────────────────────────────────────────────────────
function FieldError({ message }: { message: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "4px" }}>
      <AlertCircle size={11} style={{ color: "hsl(0,72%,60%)", flexShrink: 0 }} />
      <span style={{ fontSize: "11px", color: "hsl(0,72%,60%)" }}>{message}</span>
    </div>
  );
}

// ─── GameDetailView ───────────────────────────────────────────────────────────
function GameDetailView({ game }: { game: Game }) {
  const [, navigate] = useLocation();
  const addItem = useCartStore((s) => s.addItem);
  const [selectedSvc, setSelectedSvc] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: services = [], isLoading: svcsLoading } = useQuery<Service[]>({
    queryKey: [`/api/services?gameId=${game.id}`],
    queryFn: async () => {
      const res = await fetch(`/api/services?gameId=${game.id}`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const selectedService = services.find((s) => s.id === selectedSvc) ?? null;

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!selectedSvc) errs.pkg = "Please select a package";
    if (!userId.trim()) errs.userId = "User ID is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleAddToCart() {
    if (!validate() || !selectedService) return;
    addItem({
      productId: game.id,
      productTitle: game.name,
      productImage: game.logoUrl ?? "",
      packageId: selectedService.id,
      packageName: selectedService.name,
      price: parseFloat(String(selectedService.finalPrice)),
      userId: userId.trim(),
      zoneId: zoneId.trim() || undefined,
      quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  function handleBuyNow() {
    if (!validate() || !selectedService) return;
    addItem({
      productId: game.id,
      productTitle: game.name,
      productImage: game.logoUrl ?? "",
      packageId: selectedService.id,
      packageName: selectedService.name,
      price: parseFloat(String(selectedService.finalPrice)),
      userId: userId.trim(),
      zoneId: zoneId.trim() || undefined,
      quantity,
    });
    navigate("/cart");
  }

  const infoItems = [
    { text: "Enter your exact Game ID and Server ID — incorrect details may result in failed delivery." },
    { text: "Top-ups are processed instantly after payment confirmation." },
    { text: "Keep your game account logged out during the top-up process for best results." },
  ];

  const totalPrice = selectedService
    ? (parseFloat(String(selectedService.finalPrice)) * quantity).toFixed(2)
    : null;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1rem" }}>
      {/* Back */}
      <button
        className="btn-secondary"
        onClick={() => navigate("/products")}
        style={{ marginBottom: "1.25rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
        data-testid="button-back"
      >
        <ArrowLeft size={15} /> Back
      </button>

      {/* ── Responsive two-column layout ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* LEFT — banner + description */}
        <div className="w-full lg:w-2/5 flex flex-col gap-4">
          {/* Banner */}
          <div style={{
            width: "100%",
            aspectRatio: "16/9",
            borderRadius: "14px",
            overflow: "hidden",
            border: "1px solid hsl(220,15%,16%)",
            background: "linear-gradient(135deg, hsl(258,35%,14%), hsl(220,28%,9%))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {game.bannerUrl || game.logoUrl ? (
              <img
                src={game.bannerUrl ?? game.logoUrl ?? ""}
                alt={game.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <Gamepad2 size={72} style={{ color: "hsla(258,90%,66%,0.3)" }} />
            )}
          </div>

          {/* Title + badge (mobile shows here too, desktop shows inside right panel) */}
          <div className="lg:hidden">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
              <h1 className="font-orbitron" style={{ fontSize: "1.45rem", fontWeight: 800, color: "hsl(210,40%,96%)", margin: 0 }}>
                {game.name}
              </h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                background: "rgba(74,222,128,0.1)", color: "hsl(142,71%,52%)",
                border: "1px solid rgba(74,222,128,0.25)", borderRadius: "20px",
                fontSize: "11px", fontWeight: 600, padding: "3px 9px",
              }}>
                <Zap size={10} /> Instant Delivery Supported
              </span>
              <span className="badge badge-purple">Game Top-Up</span>
            </div>
          </div>

          {/* Description (desktop only) */}
          {game.description && (
            <div className="hidden lg:block" style={{
              background: "hsl(220,20%,10%)",
              border: "1px solid hsl(220,15%,15%)",
              borderRadius: "10px",
              padding: "14px 16px",
            }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "hsl(220,10%,55%)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                About
              </p>
              <p style={{ fontSize: "13px", color: "hsl(220,10%,60%)", lineHeight: 1.7, margin: 0 }}>
                {game.description}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT — purchase panel */}
        <div className="w-full lg:w-3/5 flex flex-col gap-4">

          {/* Title + badge (desktop only) */}
          <div className="hidden lg:flex flex-col gap-2">
            <h1 className="font-orbitron" style={{ fontSize: "1.6rem", fontWeight: 800, color: "hsl(210,40%,96%)", margin: 0 }}>
              {game.name}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                background: "rgba(74,222,128,0.1)", color: "hsl(142,71%,52%)",
                border: "1px solid rgba(74,222,128,0.25)", borderRadius: "20px",
                fontSize: "11px", fontWeight: 600, padding: "3px 9px",
              }}>
                <Zap size={10} /> Instant Delivery Supported
              </span>
              <span className="badge badge-purple">Game Top-Up</span>
            </div>
          </div>

          {/* Info section */}
          <InfoSection items={infoItems} />

          {/* Package selection */}
          <div>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "hsl(220,10%,55%)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Select Package
            </p>
            {svcsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} style={{ height: "72px", borderRadius: "10px", background: "hsl(220,20%,11%)", animation: "pulse 1.5s infinite" }} />
                ))}
              </div>
            ) : services.length === 0 ? (
              <div style={{ padding: "1.5rem", textAlign: "center", color: "hsl(220,10%,40%)", fontSize: "13px", border: "1px dashed hsl(220,15%,18%)", borderRadius: "10px" }}>
                No packages available yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {services.map((svc) => (
                  <PackageCard
                    key={svc.id}
                    id={svc.id}
                    name={svc.name}
                    price={parseFloat(String(svc.finalPrice))}
                    originalPrice={parseFloat(String(svc.price))}
                    currency={svc.currency}
                    discount={svc.discountPercent}
                    selected={selectedSvc === svc.id}
                    onSelect={setSelectedSvc}
                  />
                ))}
              </div>
            )}
            {errors.pkg && <FieldError message={errors.pkg} />}
          </div>

          {/* User ID */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "hsl(220,10%,55%)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              User ID <span style={{ color: "hsl(0,72%,60%)" }}>*</span>
            </label>
            <input
              className="input-field"
              placeholder="Enter User ID"
              value={userId}
              onChange={(e) => { setUserId(e.target.value); setErrors((p) => ({ ...p, userId: "" })); }}
              data-testid="input-player-id"
              autoComplete="off"
            />
            {errors.userId && <FieldError message={errors.userId} />}
          </div>

          {/* Zone / Server ID */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "hsl(220,10%,55%)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Server ID / Zone ID
            </label>
            <input
              className="input-field"
              placeholder="Enter Server ID or Zone ID"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              data-testid="input-zone-id"
              autoComplete="off"
            />
          </div>

          {/* Quantity + price summary */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "hsl(220,10%,55%)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Quantity
              </p>
              <QuantitySelector value={quantity} onChange={setQuantity} />
            </div>
            {totalPrice && (
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "11px", color: "hsl(220,10%,45%)", marginBottom: "2px" }}>Total</p>
                <p style={{ fontSize: "1.35rem", fontWeight: 800, color: "hsl(258,90%,72%)", margin: 0 }}>
                  {selectedService?.currency} {totalPrice}
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
            <button
              className="btn-primary"
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              onClick={handleBuyNow}
              data-testid="button-buy-now"
            >
              <Zap size={16} />
              Buy Now
            </button>
            <button
              className="btn-secondary"
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              onClick={handleAddToCart}
              disabled={added}
              data-testid="button-add-to-cart"
            >
              <ShoppingCart size={16} />
              {added ? "Added to Cart!" : "Add to Cart"}
            </button>
          </div>

          {/* Description (mobile only) */}
          {game.description && (
            <div className="lg:hidden" style={{
              background: "hsl(220,20%,10%)",
              border: "1px solid hsl(220,15%,15%)",
              borderRadius: "10px",
              padding: "14px 16px",
              marginTop: "4px",
            }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "hsl(220,10%,50%)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                About
              </p>
              <p style={{ fontSize: "13px", color: "hsl(220,10%,60%)", lineHeight: 1.7, margin: 0 }}>
                {game.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ProductDetailView ────────────────────────────────────────────────────────
function ProductDetailView({ product }: { product: Product }) {
  const [, navigate] = useLocation();
  const addItem = useCartStore((s) => s.addItem);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: packages = [], isLoading: pkgsLoading } = useQuery<ProductPackage[]>({
    queryKey: [`/api/products/${product.id}/packages`],
    queryFn: async () => {
      const res = await fetch(`/api/products/${product.id}/packages`);
      if (!res.ok) return [];
      return res.json();
    },
  });

  const activePackages = packages.filter((p) => p.isActive);
  const selectedPackage = activePackages.find((p) => p.id === selectedPkg) ?? null;

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!selectedPkg) errs.pkg = "Please select a package";
    if (!userId.trim()) errs.userId = "Account ID is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleAddToCart() {
    if (!validate() || !selectedPackage) return;
    addItem({
      productId: product.id,
      productTitle: product.title,
      productImage: product.imageUrl ?? "",
      packageId: selectedPackage.id,
      packageName: selectedPackage.label,
      price: parseFloat(String(selectedPackage.price)),
      userId: userId.trim(),
      quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  function handleBuyNow() {
    if (!validate() || !selectedPackage) return;
    addItem({
      productId: product.id,
      productTitle: product.title,
      productImage: product.imageUrl ?? "",
      packageId: selectedPackage.id,
      packageName: selectedPackage.label,
      price: parseFloat(String(selectedPackage.price)),
      userId: userId.trim(),
      quantity,
    });
    navigate("/cart");
  }

  const categoryLabel = CATEGORY_LABELS[product.category] ?? product.category;
  const Icon = product.category === "subscription" ? RefreshCcw : Gift;
  const totalPrice = selectedPackage
    ? (parseFloat(String(selectedPackage.price)) * quantity).toFixed(2)
    : null;

  const infoItems = [
    { text: "Enter your exact account ID to ensure successful delivery." },
    { text: "Delivery is processed instantly after payment confirmation." },
  ];

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1rem" }}>
      {/* Back */}
      <button
        className="btn-secondary"
        onClick={() => navigate("/products")}
        style={{ marginBottom: "1.25rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
        data-testid="button-back"
      >
        <ArrowLeft size={15} /> Back
      </button>

      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* LEFT — image + description */}
        <div className="w-full lg:w-2/5 flex flex-col gap-4">
          {/* Image */}
          <div style={{
            width: "100%",
            aspectRatio: "16/9",
            borderRadius: "14px",
            overflow: "hidden",
            border: "1px solid hsl(220,15%,16%)",
            background: "linear-gradient(135deg, hsl(258,35%,14%), hsl(220,28%,9%))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.title}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <Icon size={72} style={{ color: "hsla(258,90%,66%,0.3)" }} />
            )}
          </div>

          {/* Title + badge mobile */}
          <div className="lg:hidden">
            <h1 className="font-orbitron" style={{ fontSize: "1.45rem", fontWeight: 800, color: "hsl(210,40%,96%)", marginBottom: "8px" }}>
              {product.title}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                background: "rgba(74,222,128,0.1)", color: "hsl(142,71%,52%)",
                border: "1px solid rgba(74,222,128,0.25)", borderRadius: "20px",
                fontSize: "11px", fontWeight: 600, padding: "3px 9px",
              }}>
                <Zap size={10} /> Instant Delivery Supported
              </span>
              <span className="badge badge-purple">{categoryLabel}</span>
            </div>
          </div>

          {/* Description desktop */}
          {product.description && (
            <div className="hidden lg:block" style={{
              background: "hsl(220,20%,10%)",
              border: "1px solid hsl(220,15%,15%)",
              borderRadius: "10px",
              padding: "14px 16px",
            }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "hsl(220,10%,50%)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                About
              </p>
              <p style={{ fontSize: "13px", color: "hsl(220,10%,60%)", lineHeight: 1.7, margin: 0 }}>
                {product.description}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT — purchase panel */}
        <div className="w-full lg:w-3/5 flex flex-col gap-4">

          {/* Title + badge desktop */}
          <div className="hidden lg:flex flex-col gap-2">
            <h1 className="font-orbitron" style={{ fontSize: "1.6rem", fontWeight: 800, color: "hsl(210,40%,96%)", margin: 0 }}>
              {product.title}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                background: "rgba(74,222,128,0.1)", color: "hsl(142,71%,52%)",
                border: "1px solid rgba(74,222,128,0.25)", borderRadius: "20px",
                fontSize: "11px", fontWeight: 600, padding: "3px 9px",
              }}>
                <Zap size={10} /> Instant Delivery Supported
              </span>
              <span className="badge badge-purple">{categoryLabel}</span>
            </div>
          </div>

          {/* Info */}
          <InfoSection items={infoItems} />

          {/* Packages */}
          <div>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "hsl(220,10%,55%)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Select Package
            </p>
            {pkgsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{ height: "72px", borderRadius: "10px", background: "hsl(220,20%,11%)", animation: "pulse 1.5s infinite" }} />
                ))}
              </div>
            ) : activePackages.length === 0 ? (
              <div style={{ padding: "1.5rem", textAlign: "center", color: "hsl(220,10%,40%)", fontSize: "13px", border: "1px dashed hsl(220,15%,18%)", borderRadius: "10px" }}>
                No packages available yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {activePackages.map((pkg) => {
                  const price = parseFloat(String(pkg.price));
                  const orig = pkg.originalPrice ? parseFloat(String(pkg.originalPrice)) : null;
                  return (
                    <PackageCard
                      key={pkg.id}
                      id={pkg.id}
                      name={pkg.label}
                      price={price}
                      originalPrice={orig}
                      selected={selectedPkg === pkg.id}
                      onSelect={setSelectedPkg}
                    />
                  );
                })}
              </div>
            )}
            {errors.pkg && <FieldError message={errors.pkg} />}
          </div>

          {/* Account ID */}
          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "hsl(220,10%,55%)", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              User ID <span style={{ color: "hsl(0,72%,60%)" }}>*</span>
            </label>
            <input
              className="input-field"
              placeholder="Enter your account ID"
              value={userId}
              onChange={(e) => { setUserId(e.target.value); setErrors((p) => ({ ...p, userId: "" })); }}
              data-testid="input-player-id"
              autoComplete="off"
            />
            {errors.userId && <FieldError message={errors.userId} />}
          </div>

          {/* Quantity + price summary */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "hsl(220,10%,55%)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Quantity
              </p>
              <QuantitySelector value={quantity} onChange={setQuantity} />
            </div>
            {totalPrice && (
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "11px", color: "hsl(220,10%,45%)", marginBottom: "2px" }}>Total</p>
                <p style={{ fontSize: "1.35rem", fontWeight: 800, color: "hsl(258,90%,72%)", margin: 0 }}>
                  ${totalPrice}
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
            <button
              className="btn-primary"
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              onClick={handleBuyNow}
              data-testid="button-buy-now"
            >
              <Zap size={16} />
              Buy Now
            </button>
            <button
              className="btn-secondary"
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              onClick={handleAddToCart}
              disabled={added}
              data-testid="button-add-to-cart"
            >
              <ShoppingCart size={16} />
              {added ? "Added to Cart!" : "Add to Cart"}
            </button>
          </div>

          {/* Description mobile */}
          {product.description && (
            <div className="lg:hidden" style={{
              background: "hsl(220,20%,10%)",
              border: "1px solid hsl(220,15%,15%)",
              borderRadius: "10px",
              padding: "14px 16px",
              marginTop: "4px",
            }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "hsl(220,10%,50%)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                About
              </p>
              <p style={{ fontSize: "13px", color: "hsl(220,10%,60%)", lineHeight: 1.7, margin: 0 }}>
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────
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
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1rem" }}>
        <div style={{ height: "48px", width: "100px", background: "hsl(220,20%,11%)", borderRadius: "8px", marginBottom: "1.25rem", animation: "pulse 1.5s infinite" }} />
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-2/5">
            <div style={{ width: "100%", aspectRatio: "16/9", background: "hsl(220,20%,9%)", borderRadius: "14px", animation: "pulse 1.5s infinite" }} />
          </div>
          <div className="w-full lg:w-3/5 flex flex-col gap-3">
            <div style={{ height: "36px", width: "60%", background: "hsl(220,20%,11%)", borderRadius: "6px", animation: "pulse 1.5s infinite" }} />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ height: "72px", borderRadius: "10px", background: "hsl(220,20%,11%)", animation: "pulse 1.5s infinite" }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "4rem 1rem", textAlign: "center" }}>
        <Zap size={48} style={{ color: "hsl(258,90%,66%)", opacity: 0.3, marginBottom: "1rem" }} />
        <h2 style={{ color: "hsl(210,40%,80%)", marginBottom: "0.5rem" }}>Product not found</h2>
        <p style={{ color: "hsl(220,10%,45%)", fontSize: "14px", marginBottom: "1.5rem" }}>
          This product may have been removed or the link is incorrect.
        </p>
        <button className="btn-secondary" onClick={() => navigate("/products")} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <ArrowLeft size={16} /> Back to Products
        </button>
      </div>
    );
  }

  if (game) return <GameDetailView game={game} />;
  if (product) return <ProductDetailView product={product} />;
  return null;
}
