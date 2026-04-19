import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { Zap, ShoppingCart, ArrowLeft, Gamepad2, Gift, RefreshCcw, Plus, Minus, BoltIcon, CheckCircle2, AlertCircle, Loader2, AlertTriangle } from "lucide-react";
import { useCartStore } from "@/lib/store/cartStore";
import { useAuthStore } from "@/lib/store/authstore";
import { getCurrencySymbol } from "@/lib/currency";
import type { Game, Product, Service, ProductPackage } from "@shared/schema";

const CATEGORY_LABELS: Record<string, string> = {
  game_currency: "Games",
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
  currencySymbol,
  discount,
  selected,
  outOfStock,
  onSelect,
}: {
  id: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  currencySymbol: string;
  discount?: string | number | null;
  selected: boolean;
  outOfStock?: boolean;
  onSelect: (id: string) => void;
}) {
  const hasDiscount = !outOfStock && discount && parseFloat(String(discount)) > 0 && originalPrice && originalPrice > price;

  return (
    <button
      onClick={() => !outOfStock && onSelect(id)}
      data-testid={`button-package-${id}`}
      disabled={outOfStock}
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
          : "hsl(var(--card))",
        border: `2px solid ${selected && !outOfStock ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
        cursor: outOfStock ? "not-allowed" : "pointer",
        color: selected ? "hsl(var(--foreground))" : "hsl(var(--foreground))",
        transition: "all 0.15s ease",
        minHeight: "72px",
        width: "100%",
        textAlign: "center",
        overflow: "hidden",
        opacity: outOfStock ? 0.35 : 1,
      }}
    >
      {!outOfStock && selected && (
        <span style={{
          position: "absolute", top: "5px", right: "5px",
          color: "hsl(var(--primary))", display: "flex",
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
          <span style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))", textDecoration: "line-through" }}>
            {currencySymbol} {originalPrice.toFixed(2)}
          </span>
        )}
        <span style={{
          fontSize: "13px", fontWeight: 700,
          color: outOfStock ? "hsl(var(--muted-foreground))" : selected ? "hsl(var(--primary))" : "hsl(var(--primary))",
        }}>
          {currencySymbol} {price.toFixed(2)}
        </span>
      </div>
    </button>
  );
}

// ─── Quantity selector ────────────────────────────────────────────────────────
function QuantitySelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0", border: "1px solid hsl(var(--border))", borderRadius: "8px", overflow: "hidden", width: "fit-content" }}>
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        data-testid="button-qty-minus"
        style={{
          width: "38px", height: "38px", background: "hsl(var(--card))",
          border: "none", cursor: "pointer", color: "hsl(var(--foreground))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "13px", transition: "background 0.15s",
        }}
      >
        <Minus size={14} />
      </button>
      <span data-testid="text-qty" style={{
        minWidth: "44px", height: "38px", background: "hsl(var(--card))",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "hsl(var(--foreground))", fontSize: "13px", fontWeight: 700,
        borderLeft: "1px solid hsl(var(--border))", borderRight: "1px solid hsl(var(--border))",
      }}>
        {value}
      </span>
      <button
        onClick={() => onChange(value + 1)}
        data-testid="button-qty-plus"
        style={{
          width: "38px", height: "38px", background: "hsl(var(--card))",
          border: "none", cursor: "pointer", color: "hsl(var(--foreground))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "13px", transition: "background 0.15s",
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
      background: "hsl(var(--card))",
      border: "1px solid hsl(var(--border))",
      borderRadius: "10px",
      padding: "12px 14px",
      display: "flex", flexDirection: "column", gap: "8px",
    }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
          <span style={{ color: "hsl(var(--primary))", marginTop: "1px", flexShrink: 0 }}>
            <BoltIcon size={12} />
          </span>
          <span style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", lineHeight: 1.5 }}>
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
  const [email, setEmail] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [loginId, setLoginId] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validateStatus, setValidateStatus] = useState<"idle" | "loading" | "success" | "error" | "unavailable">("idle");
  const [validatedName, setValidatedName] = useState<string | null>(null);
  const [validateError, setValidateError] = useState<string | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<"buy" | "cart" | null>(null);
  const { user } = useAuthStore();

  const { data: siteSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
  });
  const currencySymbol = getCurrencySymbol(siteSettings?.default_currency ?? "USD");

  async function handleValidate() {
    if (!userId.trim()) {
      setErrors((p) => ({ ...p, userId: "Enter a User ID first" }));
      return;
    }
    setValidateStatus("loading");
    setValidatedName(null);
    setValidateError(null);
    try {
      const params = new URLSearchParams({ userId: userId.trim() });
      if (zoneId.trim()) params.append("zoneId", zoneId.trim());
      // Pass the selected service/package ID so the backend can find the correct Busan productId
      if (selectedSvc) params.append("serviceId", selectedSvc);
      const res = await fetch(`/api/games/${game.slug}/validate?${params}`);
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "NO_VALIDATOR") {
          setValidateStatus("unavailable");
          return;
        }
        throw new Error(data.message ?? "Validation failed");
      }
      setValidatedName(data.playerName);
      setValidateStatus("success");
    } catch (err: any) {
      setValidateError(err.message ?? "Could not validate");
      setValidateStatus("error");
    }
  }

  // Parse which fields are required for this game
  const requiredFields = (game.requiredFields ?? "userId").split(",").filter(Boolean);
  const needsUserId = requiredFields.includes("userId");
  const needsZoneId = requiredFields.includes("zoneId");
  const needsEmail = requiredFields.includes("email");
  const needsPlayerId = requiredFields.includes("playerId");
  const needsLoginId = requiredFields.includes("loginId");
  const needsCharacterName = requiredFields.includes("characterName");

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
    if (needsUserId && !userId.trim()) errs.userId = "User ID is required";
    if (needsZoneId && !zoneId.trim()) errs.zoneId = "Zone / Server ID is required";
    if (needsEmail && !email.trim()) errs.email = "Email is required";
    if (needsPlayerId && !playerId.trim()) errs.playerId = "Player ID is required";
    if (needsLoginId && !loginId.trim()) errs.loginId = "Login ID is required";
    if (needsCharacterName && !characterName.trim()) errs.characterName = "Character name is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function buildCartPayload() {
    return {
      productId: game.id,
      productTitle: game.name,
      productImage: game.logoUrl ?? "",
      packageId: selectedService!.id,
      packageName: selectedService!.name,
      price: parseFloat(String(selectedService!.finalPrice)),
      productCategory: game.category ?? "game_currency",
      userId: needsUserId ? userId.trim() : (needsEmail ? email.trim() : "-"),
      zoneId: needsZoneId ? zoneId.trim() : undefined,
      email: needsEmail ? email.trim() : undefined,
      playerId: needsPlayerId ? playerId.trim() : undefined,
      loginId: needsLoginId ? loginId.trim() : undefined,
      characterName: needsCharacterName ? characterName.trim() : undefined,
      quantity,
    };
  }

  function handleAddToCart() {
    if (!user) {
      setPendingAction("cart");
      setShowRegisterModal(true);
      return;
    }
    if (!validate() || !selectedService) return;
    addItem(buildCartPayload());
    setAdded(true);
    setTimeout(() => setAdded(false), 2500);
  }

  function handleBuyNow() {
    if (!user) {
      setPendingAction("buy");
      setShowRegisterModal(true);
      return;
    }
    if (!validate() || !selectedService) return;
    addItem(buildCartPayload());
    navigate(`/checkout?from=product&fromName=${encodeURIComponent(game?.name ?? "Product")}`);
  }

  function proceedAfterRegister() {
    setShowRegisterModal(false);
    navigate("/register");
  }

  const infoItems = [
    { text: "Enter your exact account details — incorrect information may result in failed delivery." },
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
        style={{ marginBottom: "1.25rem", marginTop: "0.5rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
        data-testid="button-back"
      >
        <ArrowLeft size={15} /> Back
      </button>

      {/* ── Responsive two-column layout ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* LEFT — banner + description */}
        <div className="w-full lg:w-2/5 flex flex-col gap-4">
          {/* Banner */}
          {game.bannerUrl || game.logoUrl ? (
            <img
              src={game.bannerUrl ?? game.logoUrl ?? ""}
              alt={game.name}
              style={{ width: "100%", height: "auto", display: "block", borderRadius: "14px", border: "1px solid hsl(var(--border))" }}
            />
          ) : (
            <div style={{
              width: "100%", aspectRatio: "16/9", borderRadius: "14px",
              border: "1px solid hsl(var(--border))",
              background: "linear-gradient(135deg, hsl(var(--muted)), hsl(var(--card)))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Gamepad2 size={72} style={{ color: "hsla(258,90%,66%,0.3)" }} />
            </div>
          )}

          {/* Title + badge (mobile shows here too, desktop shows inside right panel) */}
          <div className="lg:hidden">
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
              <h1 className="font-orbitron" style={{ fontSize: "1.45rem", fontWeight: 800, color: "hsl(var(--foreground))", margin: 0 }}>
                {game.name}
              </h1>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {game.instantDelivery && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  background: "rgba(74,222,128,0.1)", color: "hsl(142,71%,52%)",
                  border: "1px solid rgba(74,222,128,0.25)", borderRadius: "20px",
                  fontSize: "11px", fontWeight: 600, padding: "3px 9px",
                }}>
                  <Zap size={10} /> Instant Delivery
                </span>
              )}
              <span className="badge badge-purple">Game Top-Up</span>
            </div>
          </div>

          {/* Description (desktop only) */}
          {game.description && (
            <div className="hidden lg:block" style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(220,15%,15%)",
              borderRadius: "10px",
              padding: "14px 16px",
            }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "hsl(var(--muted-foreground))", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                About
              </p>
              <p style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", lineHeight: 1.7, margin: 0 }}>
                {game.description}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT — purchase panel */}
        <div className="w-full lg:w-3/5 flex flex-col gap-4">

          {/* Title + badge (desktop only) */}
          <div className="hidden lg:flex flex-col gap-2">
            <h1 className="font-orbitron" style={{ fontSize: "1.6rem", fontWeight: 800, color: "hsl(var(--foreground))", margin: 0 }}>
              {game.name}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              {game.instantDelivery && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  background: "rgba(74,222,128,0.1)", color: "hsl(142,71%,52%)",
                  border: "1px solid rgba(74,222,128,0.25)", borderRadius: "20px",
                  fontSize: "11px", fontWeight: 600, padding: "3px 9px",
                }}>
                  <Zap size={10} /> Instant Delivery
                </span>
              )}
              <span className="badge badge-purple">Game Top-Up</span>
            </div>
          </div>

          {/* Info section */}
          <InfoSection items={infoItems} />

          {/* Package selection */}
          <div>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--muted-foreground))", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Select Package
            </p>
            {svcsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {[...Array(8)].map((_, i) => (
                  <div key={i} style={{ height: "72px", borderRadius: "10px", background: "hsl(var(--card))", animation: "pulse 1.5s infinite" }} />
                ))}
              </div>
            ) : services.length === 0 ? (
              <div style={{ padding: "1.5rem", textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: "13px", border: "1px dashed hsl(var(--border))", borderRadius: "10px" }}>
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
                    currencySymbol={currencySymbol}
                    discount={svc.discountPercent}
                    selected={selectedSvc === svc.id}
                    outOfStock={(svc as any).stock === 0}
                    onSelect={setSelectedSvc}
                  />
                ))}
              </div>
            )}
            {errors.pkg && <FieldError message={errors.pkg} />}
          </div>

          {/* User ID — only shown if required */}
          {needsUserId && (
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--muted-foreground))", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                User ID <span style={{ color: "hsl(0,72%,60%)" }}>*</span>
              </label>
              <input
                className="input-field"
                placeholder="Enter User ID"
                value={userId}
                onChange={(e) => { setUserId(e.target.value); setErrors((p) => ({ ...p, userId: "" })); if (validateStatus !== "unavailable") { setValidateStatus("idle"); setValidatedName(null); setValidateError(null); } }}
                data-testid="input-player-id"
                autoComplete="off"
              />
              {errors.userId && <FieldError message={errors.userId} />}
            </div>
          )}

          {/* Zone / Server ID — only shown if required */}
          {needsZoneId && (
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--muted-foreground))", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Zone / Server ID <span style={{ color: "hsl(0,72%,60%)" }}>*</span>
              </label>
              <input
                className="input-field"
                placeholder="Enter Zone ID or Server ID"
                value={zoneId}
                onChange={(e) => { setZoneId(e.target.value); setErrors((p) => ({ ...p, zoneId: "" })); setValidateStatus("idle"); setValidatedName(null); setValidateError(null); }}
                data-testid="input-zone-id"
                autoComplete="off"
              />
              {errors.zoneId && <FieldError message={errors.zoneId} />}
            </div>
          )}

          {/* Validate Player — name left, button right */}
          {needsUserId && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", minHeight: "32px" }}>
              {/* Left: result message */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {validateStatus === "success" && validatedName && (
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 10px", borderRadius: "6px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                    <CheckCircle2 size={12} style={{ color: "hsl(142,71%,52%)", flexShrink: 0 }} />
                    <span style={{ fontSize: "12px", color: "hsl(142,71%,52%)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {validatedName}
                    </span>
                  </div>
                )}
                {validateStatus === "error" && validateError && (
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 10px", borderRadius: "6px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <AlertCircle size={12} style={{ color: "hsl(0,72%,60%)", flexShrink: 0 }} />
                    <span style={{ fontSize: "12px", color: "hsl(0,72%,60%)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{validateError}</span>
                  </div>
                )}
                {validateStatus === "unavailable" && (
                  <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontStyle: "italic" }}>
                    Validation not set up for this game
                  </span>
                )}
              </div>
              {/* Right: validate button */}
              <button
                type="button"
                onClick={validateStatus === "unavailable" ? undefined : handleValidate}
                disabled={validateStatus === "loading" || validateStatus === "unavailable"}
                data-testid="button-validate-player"
                style={{
                  flexShrink: 0,
                  display: "inline-flex", alignItems: "center", gap: "6px",
                  padding: "6px 14px", borderRadius: "7px", fontSize: "12px", fontWeight: 600,
                  cursor: validateStatus === "loading" || validateStatus === "unavailable" ? "not-allowed" : "pointer",
                  border: validateStatus === "success"
                    ? "1px solid rgba(34,197,94,0.4)"
                    : validateStatus === "unavailable"
                      ? "1px solid rgba(100,100,120,0.3)"
                      : "1px solid hsl(var(--primary) / 0.4)",
                  background: validateStatus === "success"
                    ? "rgba(34,197,94,0.1)"
                    : validateStatus === "unavailable"
                      ? "rgba(100,100,120,0.06)"
                      : "hsl(var(--primary) / 0.1)",
                  color: validateStatus === "success"
                    ? "hsl(142,71%,52%)"
                    : validateStatus === "unavailable"
                      ? "hsl(var(--muted-foreground))"
                      : "hsl(var(--primary))",
                  opacity: validateStatus === "loading" ? 0.7 : 1,
                  transition: "all 0.2s",
                }}
              >
                {validateStatus === "loading"
                  ? <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
                  : <CheckCircle2 size={11} />}
                {validateStatus === "loading" ? "Validating…" : "Validate ID"}
              </button>
            </div>
          )}

          {/* Email — only shown if required */}
          {needsEmail && (
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--muted-foreground))", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Email <span style={{ color: "hsl(0,72%,60%)" }}>*</span>
              </label>
              <input
                className="input-field"
                type="email"
                placeholder="Enter account email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: "" })); }}
                data-testid="input-email"
                autoComplete="off"
              />
              {errors.email && <FieldError message={errors.email} />}
            </div>
          )}

          {/* Player ID — only shown if required */}
          {needsPlayerId && (
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--muted-foreground))", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Player ID <span style={{ color: "hsl(0,72%,60%)" }}>*</span>
              </label>
              <input
                className="input-field"
                placeholder="Enter Player ID"
                value={playerId}
                onChange={(e) => { setPlayerId(e.target.value); setErrors((p) => ({ ...p, playerId: "" })); }}
                autoComplete="off"
              />
              {errors.playerId && <FieldError message={errors.playerId} />}
            </div>
          )}

          {/* Login ID — only shown if required */}
          {needsLoginId && (
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--muted-foreground))", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Login ID <span style={{ color: "hsl(0,72%,60%)" }}>*</span>
              </label>
              <input
                className="input-field"
                placeholder="Enter Login ID or username"
                value={loginId}
                onChange={(e) => { setLoginId(e.target.value); setErrors((p) => ({ ...p, loginId: "" })); }}
                autoComplete="off"
              />
              {errors.loginId && <FieldError message={errors.loginId} />}
            </div>
          )}

          {/* Character Name — only shown if required */}
          {needsCharacterName && (
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--muted-foreground))", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Character Name <span style={{ color: "hsl(0,72%,60%)" }}>*</span>
              </label>
              <input
                className="input-field"
                placeholder="Enter in-game character name"
                value={characterName}
                onChange={(e) => { setCharacterName(e.target.value); setErrors((p) => ({ ...p, characterName: "" })); }}
                autoComplete="off"
              />
              {errors.characterName && <FieldError message={errors.characterName} />}
            </div>
          )}

          {/* Quantity + price summary */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--muted-foreground))", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Quantity
              </p>
              <QuantitySelector value={quantity} onChange={setQuantity} />
            </div>
            {totalPrice && (
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginBottom: "2px" }}>Total</p>
                <p style={{ fontSize: "1.15rem", fontWeight: 800, color: "hsl(var(--primary))", margin: 0 }}>
                  {currencySymbol}{totalPrice}
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
              background: "hsl(var(--card))",
              border: "1px solid hsl(220,15%,15%)",
              borderRadius: "10px",
              padding: "14px 16px",
              marginTop: "4px",
            }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--muted-foreground))", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                About
              </p>
              <p style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", lineHeight: 1.7, margin: 0 }}>
                {game.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Registration Modal */}
      {showRegisterModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 50,
        }}>
          <div style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "12px",
            padding: "2rem",
            maxWidth: "400px",
            width: "90%",
            boxShadow: "0 10px 40px rgba(0,0,0,0.7)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "1rem" }}>
              <AlertTriangle size={24} style={{ color: "hsl(38,92%,50%)", flexShrink: 0 }} />
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "hsl(var(--foreground))", margin: 0 }}>
                Registration Required
              </h2>
            </div>
            <p style={{ color: "hsl(var(--muted-foreground))", marginBottom: "1rem", lineHeight: 1.6 }}>
              To purchase products, you must create an account first.
            </p>
            <div style={{
              background: "hsl(38,92%,50%)",
              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "1.5rem",
              color: "hsl(220,13%,10%)",
              fontSize: "13px",
              lineHeight: 1.6,
            }}>
              <strong>Important Disclaimer:</strong> Any issue related to your order won't be solved if you don't register and verify your account.
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowRegisterModal(false)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "8px",
                  background: "transparent",
                  border: "1px solid hsl(220,15%,25%)",
                  color: "hsl(var(--foreground))",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>
              <button
                onClick={proceedAfterRegister}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.75))",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
                data-testid="button-register-now"
              >
                Register Now
              </button>
            </div>
          </div>
        </div>
      )}
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

  const { data: siteSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
  });
  const currencySymbol = getCurrencySymbol(siteSettings?.default_currency ?? "USD");

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
      productCategory: product.category,
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
      productCategory: product.category,
      userId: userId.trim(),
      quantity,
    });
    navigate(`/checkout?from=product&fromName=${encodeURIComponent(product?.title ?? "Product")}`);
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
        style={{ marginBottom: "1.25rem", marginTop: "0.5rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
        data-testid="button-back"
      >
        <ArrowLeft size={15} /> Back
      </button>

      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/* LEFT — image + description */}
        <div className="w-full lg:w-2/5 flex flex-col gap-4">
          {/* Image */}
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              style={{ width: "100%", height: "auto", display: "block", borderRadius: "14px", border: "1px solid hsl(var(--border))" }}
            />
          ) : (
            <div style={{
              width: "100%", aspectRatio: "16/9", borderRadius: "14px",
              border: "1px solid hsl(var(--border))",
              background: "linear-gradient(135deg, hsl(var(--muted)), hsl(var(--card)))",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon size={72} style={{ color: "hsla(258,90%,66%,0.3)" }} />
            </div>
          )}

          {/* Title + badge mobile */}
          <div className="lg:hidden">
            <h1 className="font-orbitron" style={{ fontSize: "1.45rem", fontWeight: 800, color: "hsl(var(--foreground))", marginBottom: "8px" }}>
              {product.title}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              {product.instantDelivery && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  background: "rgba(74,222,128,0.1)", color: "hsl(142,71%,52%)",
                  border: "1px solid rgba(74,222,128,0.25)", borderRadius: "20px",
                  fontSize: "11px", fontWeight: 600, padding: "3px 9px",
                }}>
                  <Zap size={10} /> Instant Delivery
                </span>
              )}
              <span className="badge badge-purple">{categoryLabel}</span>
            </div>
          </div>

          {/* Description desktop */}
          {product.description && (
            <div className="hidden lg:block" style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(220,15%,15%)",
              borderRadius: "10px",
              padding: "14px 16px",
            }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--muted-foreground))", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                About
              </p>
              <p style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", lineHeight: 1.7, margin: 0 }}>
                {product.description}
              </p>
            </div>
          )}
        </div>

        {/* RIGHT — purchase panel */}
        <div className="w-full lg:w-3/5 flex flex-col gap-4">

          {/* Title + badge desktop */}
          <div className="hidden lg:flex flex-col gap-2">
            <h1 className="font-orbitron" style={{ fontSize: "1.6rem", fontWeight: 800, color: "hsl(var(--foreground))", margin: 0 }}>
              {product.title}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              {product.instantDelivery && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  background: "rgba(74,222,128,0.1)", color: "hsl(142,71%,52%)",
                  border: "1px solid rgba(74,222,128,0.25)", borderRadius: "20px",
                  fontSize: "11px", fontWeight: 600, padding: "3px 9px",
                }}>
                  <Zap size={10} /> Instant Delivery
                </span>
              )}
              <span className="badge badge-purple">{categoryLabel}</span>
            </div>
          </div>

          {/* Info */}
          <InfoSection items={infoItems} />

          {/* Packages */}
          <div>
            <p style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--muted-foreground))", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Select Package
            </p>
            {pkgsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} style={{ height: "72px", borderRadius: "10px", background: "hsl(var(--card))", animation: "pulse 1.5s infinite" }} />
                ))}
              </div>
            ) : activePackages.length === 0 ? (
              <div style={{ padding: "1.5rem", textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: "13px", border: "1px dashed hsl(var(--border))", borderRadius: "10px" }}>
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
                      currencySymbol={currencySymbol}
                      selected={selectedPkg === pkg.id}
                      outOfStock={(pkg as any).stock === 0}
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
            <label style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--muted-foreground))", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
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
              <p style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--muted-foreground))", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Quantity
              </p>
              <QuantitySelector value={quantity} onChange={setQuantity} />
            </div>
            {totalPrice && (
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginBottom: "2px" }}>Total</p>
                <p style={{ fontSize: "1.15rem", fontWeight: 800, color: "hsl(var(--primary))", margin: 0 }}>
                  {currencySymbol}{totalPrice}
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
              background: "hsl(var(--card))",
              border: "1px solid hsl(220,15%,15%)",
              borderRadius: "10px",
              padding: "14px 16px",
              marginTop: "4px",
            }}>
              <p style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--muted-foreground))", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                About
              </p>
              <p style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", lineHeight: 1.7, margin: 0 }}>
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

  // Vouchers, gift cards & subscriptions are linked by UUID (product.id);
  // games are linked by their slug. Detect which endpoint to call so we
  // don't fire a guaranteed-404 request and pollute the console.
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  const { data: game, isLoading: gameLoading, isError: gameError } = useQuery<Game>({
    queryKey: [`/api/games/by-slug/${slug}`],
    queryFn: async () => {
      const res = await fetch(`/api/games/by-slug/${slug}`);
      if (!res.ok) throw new Error("Not a game");
      return res.json();
    },
    retry: false,
    enabled: !!slug && !isUuid,
  });

  const { data: product, isLoading: productLoading, isError: productError } = useQuery<Product>({
    queryKey: [`/api/products/${slug}`],
    queryFn: async () => {
      const res = await fetch(`/api/products/${slug}`);
      if (!res.ok) throw new Error("Not a product");
      return res.json();
    },
    retry: false,
    enabled: !!slug && (isUuid || gameError),
  });

  const isLoading = isUuid
    ? productLoading
    : gameLoading || (gameError && productLoading);
  const notFound = isUuid ? productError : gameError && productError;

  if (isLoading) {
    return (
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "1.5rem 1rem" }}>
        <div style={{ height: "48px", width: "100px", background: "hsl(var(--card))", borderRadius: "8px", marginBottom: "1.25rem", animation: "pulse 1.5s infinite" }} />
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-2/5">
            <div style={{ width: "100%", aspectRatio: "16/9", background: "hsl(var(--card))", borderRadius: "14px", animation: "pulse 1.5s infinite" }} />
          </div>
          <div className="w-full lg:w-3/5 flex flex-col gap-3">
            <div style={{ height: "36px", width: "60%", background: "hsl(var(--card))", borderRadius: "6px", animation: "pulse 1.5s infinite" }} />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ height: "72px", borderRadius: "10px", background: "hsl(var(--card))", animation: "pulse 1.5s infinite" }} />
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
        <Zap size={48} style={{ color: "hsl(var(--primary))", opacity: 0.3, marginBottom: "1rem" }} />
        <h2 style={{ color: "hsl(var(--foreground))", marginBottom: "0.5rem" }}>Product not found</h2>
        <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "13px", marginBottom: "1.5rem" }}>
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
