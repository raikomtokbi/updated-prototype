import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronRight, Loader2, TrendingUp, Gamepad2, Link2, Zap, Smile, ArrowLeft, RefreshCw, CheckCircle } from "lucide-react";
import { ProductMappingModal } from "@/components/admin/ProductMappingModal";
import AdminLayout, { useMobile } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import { useAuthStore } from "@/lib/store/authstore";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import type { Game, Service } from "@shared/schema";

const REGIONS_SVC = [
  { value: "global", label: "Global" },
  { value: "ph", label: "Philippines" },
  { value: "sg", label: "Singapore" },
  { value: "my", label: "Malaysia" },
  { value: "id", label: "Indonesia" },
  { value: "th", label: "Thailand" },
  { value: "br", label: "Brazil" },
  { value: "vn", label: "Vietnam" },
  { value: "tw", label: "Taiwan" },
  { value: "hk", label: "Hong Kong" },
  { value: "sa", label: "Saudi Arabia" },
];

// ─── Styles ──────────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  color: "hsl(var(--foreground))",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "hsl(var(--muted-foreground))",
  marginBottom: "4px",
  display: "block",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};
const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "7px 14px",
  borderRadius: "6px",
  background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
  color: "white",
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
  border: "none",
};
const btnDanger: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "5px",
  padding: "0 12px",
  height: "32px",
  borderRadius: "6px",
  background: "rgba(239,68,68,0.1)",
  border: "1px solid rgba(239,68,68,0.25)",
  color: "hsl(0,72%,62%)",
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
};
const btnEdit: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "5px",
  padding: "0 12px",
  height: "32px",
  borderRadius: "6px",
  background: "rgba(124,58,237,0.1)",
  border: "1px solid rgba(124,58,237,0.25)",
  color: "hsl(var(--primary))",
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
};

const statusBadge = (active: boolean): React.CSSProperties => ({
  padding: "2px 8px",
  borderRadius: "4px",
  fontSize: "11px",
  fontWeight: 500,
  background: active ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.12)",
  color: active ? "hsl(142,71%,45%)" : "hsl(0,72%,51%)",
  whiteSpace: "nowrap" as const,
});

const EMPTY_GAME = {
  name: "",
  slug: "",
  description: "",
  logoUrl: "",
  bannerUrl: "",
  category: "game_currency",
  status: "active",
  sortOrder: 0,
  requiredFields: "userId",
  instantDelivery: true,
};
const EMPTY_SERVICE = { id: "", name: "", description: "", imageUrl: "", price: "", discountPercent: "0", finalPrice: "", status: "active", sortOrder: 0, stock: "" };

// ─── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: "520px", maxHeight: "85vh", overflowY: "auto", background: "hsl(var(--background))", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "10px", padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "hsl(var(--foreground))", margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "hsl(var(--muted-foreground))", cursor: "pointer" }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Field Map Picker ─────────────────────────────────────────────────────────
const FIELD_OPTIONS = [
  { key: "userId", label: "User ID", hint: "Game account / player ID" },
  { key: "zoneId", label: "Zone / Server ID", hint: "Required for Mobile Legends etc." },
  { key: "email", label: "Email", hint: "Account email address" },
];

function FieldMapPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const active = value ? value.split(",").filter(Boolean) : [];

  function toggle(key: string) {
    const next = active.includes(key) ? active.filter((k) => k !== key) : [...active, key];
    onChange(next.join(",") || "userId");
  }

  return (
    <div>
      <label style={labelStyle}>Input Fields</label>
      <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginBottom: "8px", marginTop: "2px" }}>
        Toggle which fields buyers must fill in on the top-up page.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {FIELD_OPTIONS.map((opt) => {
          const on = active.includes(opt.key);
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => toggle(opt.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                borderRadius: "7px",
                border: `1px solid ${on ? "hsl(258,90%,60%)" : "hsl(var(--border))"}`,
                background: on ? "hsla(258,90%,66%,0.12)" : "hsl(var(--card))",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                transition: "all 0.15s",
              }}
            >
              <span style={{
                width: "18px", height: "18px", borderRadius: "4px", flexShrink: 0,
                border: `2px solid ${on ? "hsl(258,90%,60%)" : "hsl(var(--border))"}`,
                background: on ? "hsl(258,90%,60%)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {on && <span style={{ color: "white", fontSize: "11px", fontWeight: 700, lineHeight: 1 }}>✓</span>}
              </span>
              <span>
                <span style={{ display: "block", fontSize: "12px", fontWeight: 600, color: on ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>
                  {opt.label}
                </span>
                <span style={{ display: "block", fontSize: "11px", color: "hsl(var(--muted-foreground))", marginTop: "1px" }}>
                  {opt.hint}
                </span>
              </span>
              {on && (
                <span style={{ marginLeft: "auto", fontSize: "10px", fontWeight: 700, color: "hsl(258,90%,70%)", flexShrink: 0 }}>ON</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Game Form ────────────────────────────────────────────────────────────────
function GameForm({ initial, onSubmit, loading }: { initial: typeof EMPTY_GAME; onSubmit: (d: any) => void; loading: boolean }) {
  const isMobile = useMobile(768);
  const [form, setForm] = useState(initial);
  const set = (k: string, v: string | number | boolean) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Name *</label>
          <input style={inputStyle} required value={form.name} onChange={(e) => { set("name", e.target.value); set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} placeholder="Mobile Legends" />
        </div>
        <div>
          <label style={labelStyle}>Slug *</label>
          <input style={inputStyle} required value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="mobile-legends" />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Description</label>
        <textarea style={{ ...inputStyle, resize: "none", minHeight: "250px" }} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Short description..." />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.75rem" }}>
        <ImageUploadField
          label="Logo URL"
          value={form.logoUrl ?? ""}
          onChange={(url) => set("logoUrl", url)}
          inputStyle={inputStyle}
          labelStyle={labelStyle}
        />
        <ImageUploadField
          label="Banner URL"
          value={form.bannerUrl ?? ""}
          onChange={(url) => set("bannerUrl", url)}
          inputStyle={inputStyle}
          labelStyle={labelStyle}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Sort Order</label>
          <input style={inputStyle} type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", parseInt(e.target.value) || 0)} />
        </div>
      </div>

      {/* ─── Field Map ─────────────────────────────────────────────── */}
      <FieldMapPicker
        value={form.requiredFields ?? "userId"}
        onChange={(v) => set("requiredFields", v)}
      />

      {/* ─── Instant Delivery toggle ───────────────────────────────── */}
      <div>
        <label style={labelStyle}>Instant Delivery</label>
        <button
          type="button"
          onClick={() => set("instantDelivery", !form.instantDelivery)}
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            width: "100%", padding: "10px 12px",
            background: form.instantDelivery ? "rgba(74,222,128,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${form.instantDelivery ? "rgba(74,222,128,0.25)" : "rgba(239,68,68,0.25)"}`,
            borderRadius: "7px", cursor: "pointer",
          }}
        >
          <span style={{
            width: "36px", height: "20px", borderRadius: "10px", flexShrink: 0,
            background: form.instantDelivery ? "hsl(142,71%,45%)" : "hsl(var(--muted-foreground))",
            position: "relative", transition: "background 0.2s",
          }}>
            <span style={{
              position: "absolute", top: "3px",
              left: form.instantDelivery ? "19px" : "3px",
              width: "14px", height: "14px", borderRadius: "50%",
              background: "white", transition: "left 0.2s",
            }} />
          </span>
          <span style={{ fontSize: "12px", fontWeight: 600, color: form.instantDelivery ? "hsl(142,71%,52%)" : "hsl(var(--muted-foreground))" }}>
            {form.instantDelivery ? "Instant Delivery Enabled" : "Instant Delivery Disabled"}
          </span>
        </button>
      </div>

      <button type="submit" style={{ ...btnPrimary, marginTop: "0.25rem", justifyContent: "center" }} disabled={loading}>
        {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
        {loading ? "Saving..." : "Save Game"}
      </button>
    </form>
  );
}

// ─── Service Form ─────────────────────────────────────────────────────────────
function ServiceForm({ initial, onSubmit, loading }: { initial: typeof EMPTY_SERVICE; onSubmit: (d: any) => void; loading: boolean }) {
  const isMobile = useMobile(768);
  const { user } = useAuthStore();
  const [form, setForm] = useState(initial);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [rate, setRate] = useState("");
  const [usdInrRate, setUsdInrRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [mappingInfo, setMappingInfo] = useState<{ provider: string; productName: string } | null>(null);
  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  function computeFinal(price: string, disc: string) {
    const p = parseFloat(price) || 0;
    const d = parseFloat(disc) || 0;
    return (p * (1 - d / 100)).toFixed(2);
  }

  useEffect(() => {
    if (!form.id) return;
    async function loadRate() {
      setRateLoading(true);
      try {
        const [busanMappings, smileMappings, lioMappings] = await Promise.all([
          adminApi.get("/busan/mappings"),
          adminApi.get("/smileone/mappings"),
          adminApi.get("/liogames/mappings"),
        ]);

        // Fetch INR rate separately so a failure doesn't block product lookup
        fetch("/api/exchange-rate?from=USD&to=INR")
          .then((r) => r.json())
          .then((data) => {
            const inrRate = data?.rate ?? null;
            setUsdInrRate(typeof inrRate === "number" ? inrRate : null);
          })
          .catch(() => setUsdInrRate(null));

        // Try Busan mapping first
        const bMap = Array.isArray(busanMappings) ? busanMappings.find((m: any) => m.cmsProductId === form.id) : null;
        if (bMap) {
          setMappingInfo({ provider: "Busan", productName: bMap.busanProductName ?? "" });
          const products = await adminApi.get("/busan/products");
          const prod = Array.isArray(products)
            ? products.find((p: any) => String(p.id) === String(bMap.busanProductId))
            : null;
          if (prod?.price) { setRate(String(prod.price)); setRateLoading(false); return; }
        }

        // Try Smile.one mapping
        const sMap = Array.isArray(smileMappings) ? smileMappings.find((m: any) => m.cmsProductId === form.id) : null;
        if (sMap) {
          setMappingInfo({ provider: "Smile.one", productName: sMap.smileProductName ?? "" });
          if (sMap.gameSlug) {
            try {
              const res = await fetch(`/api/smileone/products?game=${encodeURIComponent(sMap.gameSlug)}&region=${sMap.region ?? "global"}`, {
                headers: { "X-Username": user?.username ?? "", "x-admin-role": user?.role ?? "super_admin" },
              });
              const data = await res.json();
              const prods = data.success && Array.isArray(data.products) ? data.products : [];
              const prod = prods.find((p: any) => String(p.product_id) === String(sMap.smileProductId));
              if (prod?.price) { setRate(String(prod.price)); setRateLoading(false); return; }
            } catch { /* ignore */ }
          }
        }

        // Try Liogames mapping
        const lMap = Array.isArray(lioMappings) ? lioMappings.find((m: any) => m.cmsProductId === form.id) : null;
        if (lMap) {
          setMappingInfo({ provider: "Liogames", productName: lMap.lioProductName ?? `Product #${lMap.lioProductId}` });
        }
      } catch (e) { console.error(e); }
      setRateLoading(false);
    }
    loadRate();
  }, [form.id]);

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit({
        ...form,
        finalPrice: form.finalPrice || computeFinal(form.price, form.discountPercent),
        stock: (form.stock as string) !== "" ? parseInt(form.stock as string) : null,
      });
    }} style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
      <div>
        <label style={labelStyle}>Name *</label>
        <input style={inputStyle} required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="100 UC" />
      </div>
      {form.id && (rateLoading || rate || mappingInfo) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Mapping badge */}
          {mappingInfo && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "6px", fontSize: "11px" }}>
              <CheckCircle size={12} color="hsl(142,71%,48%)" />
              <span style={{ color: "hsl(var(--foreground))" }}>
                Mapped to <strong>{mappingInfo.provider}</strong>: {mappingInfo.productName}
              </span>
            </div>
          )}
          {/* Rate boxes */}
          <div>
            <label style={labelStyle}>Provider Rate</label>
            {rateLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "hsl(var(--muted-foreground))", padding: "8px 0" }}>
                <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Fetching provider rate…
              </div>
            ) : rate ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", border: "1px solid hsl(var(--border))", borderRadius: "6px", overflow: "hidden", background: "hsl(var(--muted))" }}>
                  <span style={{ padding: "0 10px", fontSize: "13px", fontWeight: 600, color: "hsl(var(--muted-foreground))", borderRight: "1px solid hsl(var(--border))", alignSelf: "stretch", display: "flex", alignItems: "center", userSelect: "none" }}>$</span>
                  <input style={{ ...inputStyle, border: "none", borderRadius: 0, flex: 1, background: "transparent", cursor: "not-allowed", margin: 0 }} type="number" step="0.01" value={rate} readOnly disabled />
                </div>
                <div style={{ display: "flex", alignItems: "center", border: "1px solid hsl(var(--border))", borderRadius: "6px", overflow: "hidden", background: "hsl(var(--muted))" }}>
                  <span style={{ padding: "0 10px", fontSize: "13px", fontWeight: 600, color: "hsl(var(--muted-foreground))", borderRight: "1px solid hsl(var(--border))", alignSelf: "stretch", display: "flex", alignItems: "center", userSelect: "none" }}>₹</span>
                  <span style={{ flex: 1, padding: "0 10px", fontSize: "13px", color: "hsl(var(--foreground))", display: "flex", alignItems: "center", height: "100%" }}>
                    {usdInrRate ? ((parseFloat(rate) || 0) * usdInrRate).toFixed(2) : "—"}
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: "0.7rem" }}>
        <div>
          <label style={labelStyle}>Price *</label>
          <input style={inputStyle} required type="number" step="0.01" value={form.price} onChange={(e) => {
            set("price", e.target.value);
            set("finalPrice", computeFinal(e.target.value, form.discountPercent));
          }} placeholder="9.99" />
        </div>
        <div>
          <label style={labelStyle}>Discount %</label>
          <input style={inputStyle} type="number" step="0.01" min="0" max="100" value={form.discountPercent} onChange={(e) => {
            set("discountPercent", e.target.value);
            set("finalPrice", computeFinal(form.price, e.target.value));
          }} placeholder="0" />
        </div>
        <div>
          <label style={labelStyle}>Final Price</label>
          <input style={inputStyle} type="number" step="0.01" value={form.finalPrice} onChange={(e) => set("finalPrice", e.target.value)} placeholder="auto" />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: "0.7rem" }}>
        <div>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Sort Order</label>
          <input style={inputStyle} type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", parseInt(e.target.value) || 0)} />
        </div>
        <div>
          <label style={labelStyle}>Stock <span style={{ fontWeight: 400, textTransform: "none", fontSize: "10px" }}>(blank = unlimited)</span></label>
          <input style={inputStyle} type="number" min="0" value={form.stock} onChange={(e) => set("stock", e.target.value)} placeholder="Unlimited" />
        </div>
      </div>
      {form.id ? (
        <button type="button" onClick={() => setMappingOpen(true)} style={{ ...btnEdit, justifyContent: "center", color: "hsl(258,90%,62%)", borderColor: "rgba(124,58,237,0.3)" }}>
          <Link2 size={14} /> Map to Provider
        </button>
      ) : (
        <div style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", textAlign: "center", padding: "6px 0", fontStyle: "italic" }}>
          Save this service first to map it to a provider.
        </div>
      )}
      <button type="submit" style={{ ...btnPrimary, justifyContent: "center" }} disabled={loading}>
        {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
        {loading ? "Saving..." : "Save Service"}
      </button>
      {mappingOpen && form.id && (
        <ProductMappingModal
          cmsProductId={form.id}
          cmsProductName={form.name}
          onClose={() => setMappingOpen(false)}
        />
      )}
    </form>
  );
}

// ─── Add-Service Wizard ───────────────────────────────────────────────────────
function AddServiceWizard({ game, onClose }: { game: Game; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isMobile = useMobile(768);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [provider, setProvider] = useState<"busan" | "smileone" | "liogames" | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const [busanProducts, setBusanProducts] = useState<any[]>([]);
  const [busanLoading, setBusanLoading] = useState(false);
  const [busanError, setBusanError] = useState("");
  const [highlightBusan, setHighlightBusan] = useState<any | null>(null);

  const [gameSlug, setGameSlug] = useState("");
  const [region, setRegion] = useState("global");
  const [smileProducts, setSmileProducts] = useState<any[]>([]);
  const [smileLoading, setSmileLoading] = useState(false);
  const [highlightSmile, setHighlightSmile] = useState<any | null>(null);
  const [usdInrRate, setUsdInrRate] = useState<number | null>(null);

  const [lioProducts, setLioProducts] = useState<{ id: number; name: string; price: string }[]>([]);
  const [lioProductsLoading, setLioProductsLoading] = useState(false);
  const [lioProductsError, setLioProductsError] = useState("");
  const [lioSelectedProduct, setLioSelectedProduct] = useState<{ id: number; name: string } | null>(null);
  const [lioVariationId, setLioVariationId] = useState("");
  const [lioVariations, setLioVariations] = useState<{ variation_id: number; name: string }[]>([]);
  const [lioVarLoading, setLioVarLoading] = useState(false);

  const [form, setForm] = useState({ name: "", description: "", imageUrl: "", price: "", rate: "", discountPercent: "0", finalPrice: "", status: "active", sortOrder: 0, stock: "" });
  const [saving, setSaving] = useState(false);

  function setField(k: string, v: string | number) { setForm((p) => ({ ...p, [k]: v })); }
  function computeFinal(price: string, disc: string) {
    return ((parseFloat(price) || 0) * (1 - (parseFloat(disc) || 0) / 100)).toFixed(2);
  }

  async function fetchBusanProducts() {
    setBusanLoading(true); setBusanError(""); setBusanProducts([]);
    try {
      const data = await adminApi.get("/busan/products");
      setBusanProducts(Array.isArray(data) ? data : []);
    }
    catch (e: any) { setBusanError(e.message || "Failed to fetch products"); }
    finally { setBusanLoading(false); }
  }

  async function fetchSmileProducts() {
    if (!gameSlug) return;
    setSmileLoading(true); setSmileProducts([]);
    try {
      const res = await fetch(`/api/smileone/products?game=${encodeURIComponent(gameSlug)}&region=${region}`, {
        headers: { "X-Username": user?.username ?? "", "x-admin-role": user?.role ?? "super_admin" },
      });
      const data = await res.json();
      setSmileProducts(data.success && Array.isArray(data.products) ? data.products : []);
    } catch { setSmileProducts([]); }
    finally { setSmileLoading(false); }
  }

  async function fetchLioProducts() {
    setLioProductsLoading(true); setLioProductsError(""); setLioProducts([]);
    try {
      const res = await fetch("/api/admin/liogames/products", { headers: { "x-admin-role": user?.role ?? "super_admin" } });
      const data = await res.json();
      setLioProducts(Array.isArray(data?.products) ? data.products : []);
      if (!data?.success && !Array.isArray(data?.products)) setLioProductsError(data?.message || "Failed to fetch products");
    } catch (e: any) { setLioProductsError(e.message || "Failed to fetch products"); }
    finally { setLioProductsLoading(false); }
  }

  async function fetchLioVariations(productId: number) {
    setLioVarLoading(true); setLioVariationId(""); setLioVariations([]);
    try {
      const res = await fetch(`/api/admin/liogames/product-variations?product_id=${productId}`, {
        headers: { "x-admin-role": user?.role ?? "super_admin" },
      });
      const data = await res.json();
      setLioVariations(data?.data?.variations ?? []);
    } catch { setLioVariations([]); }
    finally { setLioVarLoading(false); }
  }

  async function fetchUsdInrRate() {
    try {
      const res = await fetch("/api/exchange-rate?from=USD&to=INR");
      const data = await res.json();
      const rate = data?.rate;
      setUsdInrRate(typeof rate === "number" ? rate : null);
    } catch {
      setUsdInrRate(null);
    }
  }

  function pickBusan(p: any) {
    setHighlightBusan(p);
    setSelectedProduct(p);
    setForm((prev) => ({ ...prev, rate: p.price ? String(p.price) : prev.rate }));
    fetchUsdInrRate();
    setStep(3);
  }

  function pickSmile(p: any) {
    setHighlightSmile(p);
    setSelectedProduct(p);
    setForm((prev) => ({ ...prev, rate: p.price ? String(p.price) : prev.rate }));
    fetchUsdInrRate();
    setStep(3);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { rate: _rate, ...formData } = form;
      const created = await adminApi.post("/services", {
        ...formData, gameId: game.id,
        finalPrice: formData.finalPrice || computeFinal(formData.price, formData.discountPercent),
        stock: formData.stock !== "" ? parseInt(formData.stock) : null,
      });
      if (selectedProduct && created?.id) {
        if (provider === "busan") {
          await adminApi.post("/busan/mappings", { cmsProductId: created.id, cmsProductName: form.name, busanProductId: selectedProduct.id, busanProductName: selectedProduct.name });
          qc.invalidateQueries({ queryKey: ["/api/admin/busan/mappings"] });
        } else if (provider === "smileone") {
          await adminApi.post("/smileone/mappings", { cmsProductId: created.id, cmsProductName: form.name, smileProductId: selectedProduct.product_id, smileProductName: selectedProduct.name, gameSlug, region });
          qc.invalidateQueries({ queryKey: ["/api/admin/smileone/mappings"] });
        }
      }
      if (provider === "liogames" && lioSelectedProduct && created?.id) {
        await adminApi.post("/liogames/mappings", {
          cmsProductId: created.id, cmsProductName: form.name,
          lioProductId: lioSelectedProduct.id,
          lioVariationId: lioVariationId ? parseInt(lioVariationId, 10) : undefined,
          lioProductName: lioSelectedProduct.name,
        });
        qc.invalidateQueries({ queryKey: ["/api/admin/liogames/mappings"] });
      }
      qc.invalidateQueries({ queryKey: [`/api/admin/services?gameId=${game.id}`] });
      onClose();
    } catch (e: any) { console.error(e); }
    finally { setSaving(false); }
  }

  const providerLabel = provider === "busan" ? "Select Busan Product" : provider === "smileone" ? "Select Smile.one Product" : provider === "liogames" ? "Enter Liogames Product" : "Select Product";
  const stepTitles = ["Choose Provider", providerLabel, "Service Details"];
  const stepTitle = stepTitles[step - 1];

  return (
    <Modal title={`Add Service — ${stepTitle}`} onClose={onClose}>
      {/* Progress bar */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "1.2rem" }}>
        {[1, 2, 3].map((s) => (
          <div key={s} style={{ flex: 1, height: "3px", borderRadius: "2px", background: step >= s ? "hsl(258,90%,62%)" : "hsl(var(--border))", transition: "background 0.25s" }} />
        ))}
      </div>

      {/* ── Step 1: Provider ── */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", margin: 0 }}>
            Choose a provider to browse its product list, or skip to fill in details manually.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <button
              type="button"
              onClick={() => { setProvider("busan"); setStep(2); fetchBusanProducts(); }}
              style={{ padding: "14px 10px", borderRadius: "8px", cursor: "pointer", textAlign: "left", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <Zap size={18} color="hsl(258,90%,62%)" />
              <span style={{ fontSize: "12px", fontWeight: 600, color: "hsl(var(--foreground))" }}>Busan</span>
              <span style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))" }}>Browse products</span>
            </button>
            <button
              type="button"
              onClick={() => { setProvider("smileone"); setStep(2); }}
              style={{ padding: "14px 10px", borderRadius: "8px", cursor: "pointer", textAlign: "left", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <Smile size={18} color="#f59e0b" />
              <span style={{ fontSize: "12px", fontWeight: 600, color: "hsl(var(--foreground))" }}>Smile.one</span>
              <span style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))" }}>Browse products</span>
            </button>
            <button
              type="button"
              onClick={() => { setProvider("liogames"); setStep(2); fetchLioProducts(); }}
              style={{ padding: "14px 10px", borderRadius: "8px", cursor: "pointer", textAlign: "left", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", display: "flex", flexDirection: "column", gap: "6px" }}
            >
              <Zap size={18} color="#06b6d4" />
              <span style={{ fontSize: "12px", fontWeight: 600, color: "hsl(var(--foreground))" }}>Liogames</span>
              <span style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))" }}>Browse products</span>
            </button>
          </div>
          <button type="button" onClick={() => { setProvider(null); setSelectedProduct(null); setStep(3); }} style={{ padding: "9px", borderRadius: "6px", border: "1px dashed hsl(var(--border))", background: "transparent", color: "hsl(var(--muted-foreground))", fontSize: "12px", cursor: "pointer" }}>
            Skip — Fill in manually
          </button>
        </div>
      )}

      {/* ── Step 2a: Busan ── */}
      {step === 2 && provider === "busan" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button type="button" onClick={() => setStep(1)} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" }}>
              <ArrowLeft size={13} /> Back
            </button>
            <button type="button" onClick={fetchBusanProducts} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--primary))", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
              <RefreshCw size={10} /> Refresh
            </button>
          </div>
          {busanLoading && <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "hsl(var(--muted-foreground))", padding: "16px 0" }}><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Loading products...</div>}
          {busanError && <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px", fontSize: "12px", color: "#f87171" }}>{busanError}</div>}
          {!busanLoading && busanProducts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "280px", overflowY: "auto" }}>
              {busanProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => pickBusan(p)}
                  style={{ padding: "9px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", background: highlightBusan?.id === p.id ? "rgba(124,58,237,0.12)" : "hsl(var(--card))", border: highlightBusan?.id === p.id ? "1px solid rgba(124,58,237,0.4)" : "1px solid hsl(var(--border))", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                >
                  <span style={{ color: "hsl(var(--foreground))" }}>{p.name}</span>
                  <span style={{ color: "hsl(var(--muted-foreground))", fontSize: "11px" }}>{p.priceRaw ?? `${p.currency} ${p.price}`}</span>
                </div>
              ))}
            </div>
          )}
          {!busanLoading && busanProducts.length === 0 && !busanError && (
            <div style={{ textAlign: "center", padding: "20px", color: "hsl(var(--muted-foreground))", fontSize: "12px" }}>No products loaded yet.</div>
          )}
        </div>
      )}

      {/* ── Step 2b: Smile.one ── */}
      {step === 2 && provider === "smileone" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button type="button" onClick={() => setStep(1)} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", alignSelf: "flex-start" }}>
            <ArrowLeft size={13} /> Back
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 130px", gap: "8px", alignItems: "end" }}>
            <div>
              <label style={labelStyle}>Game Slug</label>
              <input style={inputStyle} value={gameSlug} onChange={(e) => setGameSlug(e.target.value)} placeholder="e.g. mobile-legends" />
            </div>
            <div>
              <label style={labelStyle}>Region</label>
              <select style={inputStyle} value={region} onChange={(e) => setRegion(e.target.value)}>
                {REGIONS_SVC.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <button type="button" onClick={fetchSmileProducts} disabled={!gameSlug || smileLoading} style={{ ...btnPrimary, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", justifyContent: "center", opacity: (!gameSlug || smileLoading) ? 0.5 : 1 }}>
            {smileLoading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={12} />} Fetch Products
          </button>
          {smileProducts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "230px", overflowY: "auto" }}>
              {smileProducts.map((p) => (
                <div key={p.product_id} onClick={() => pickSmile(p)} style={{ padding: "9px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", background: highlightSmile?.product_id === p.product_id ? "rgba(124,58,237,0.12)" : "hsl(var(--card))", border: highlightSmile?.product_id === p.product_id ? "1px solid rgba(124,58,237,0.4)" : "1px solid hsl(var(--border))", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "hsl(var(--foreground))" }}>{p.name}</span>
                  <span style={{ color: "hsl(var(--muted-foreground))", fontSize: "11px" }}>{p.currency} {p.price}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Step 2c: Liogames ── */}
      {step === 2 && provider === "liogames" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button type="button" onClick={() => { setStep(1); setLioSelectedProduct(null); setLioVariations([]); }} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", alignSelf: "flex-start" }}>
            <ArrowLeft size={13} /> Back
          </button>

          {lioProductsLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "hsl(var(--muted-foreground))", fontSize: "12px", padding: "16px 0" }}>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Loading Liogames products...
            </div>
          )}
          {lioProductsError && (
            <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px", fontSize: "12px", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>{lioProductsError}</span>
              <button type="button" onClick={fetchLioProducts} style={{ color: "hsl(var(--primary))", background: "none", border: "none", cursor: "pointer", fontSize: "11px" }}>Retry</button>
            </div>
          )}
          {!lioProductsLoading && lioProducts.length > 0 && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>
                  {lioSelectedProduct ? `Selected: ${lioSelectedProduct.name}` : `${lioProducts.length} products — click to select`}
                </span>
                <button type="button" onClick={() => { fetchLioProducts(); setLioSelectedProduct(null); setLioVariations([]); setLioVariationId(""); }} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--primary))", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                  <RefreshCw size={10} /> Refresh
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "240px", overflowY: "auto" }}>
                {lioProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => { setLioSelectedProduct({ id: p.id, name: p.name }); fetchLioVariations(p.id); }}
                    style={{
                      padding: "8px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px",
                      background: lioSelectedProduct?.id === p.id ? "rgba(6,182,212,0.15)" : "hsl(var(--card))",
                      border: lioSelectedProduct?.id === p.id ? "1px solid rgba(6,182,212,0.4)" : "1px solid hsl(var(--border))",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}
                  >
                    <span style={{ color: "hsl(var(--foreground))" }}>{p.name}</span>
                    <span style={{ color: "hsl(var(--muted-foreground))", fontSize: "11px" }}>#{p.id}{p.price ? ` · ${p.price}` : ""}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {!lioProductsLoading && lioProducts.length === 0 && !lioProductsError && (
            <div style={{ textAlign: "center", padding: "24px", color: "hsl(var(--muted-foreground))", fontSize: "12px" }}>
              No products found.{" "}
              <button type="button" onClick={fetchLioProducts} style={{ color: "hsl(var(--primary))", background: "none", border: "none", cursor: "pointer" }}>Try again</button>
            </div>
          )}

          {lioVarLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>
              <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Loading variations...
            </div>
          )}
          {!lioVarLoading && lioVariations.length > 0 && lioSelectedProduct && (
            <div>
              <label style={labelStyle}>Variation <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span></label>
              <select style={inputStyle} value={lioVariationId} onChange={(e) => setLioVariationId(e.target.value)}>
                <option value="">— No specific variation —</option>
                {lioVariations.map((v) => <option key={v.variation_id} value={String(v.variation_id)}>{v.name} (#{v.variation_id})</option>)}
              </select>
            </div>
          )}

          <button type="button" onClick={() => setStep(3)} disabled={!lioSelectedProduct}
            style={{ ...btnPrimary, justifyContent: "center", opacity: !lioSelectedProduct ? 0.5 : 1 }}>
            Continue to Service Details
          </button>
        </div>
      )}

      {/* ── Step 3: Service details ── */}
      {step === 3 && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          {provider === "liogames" && lioSelectedProduct && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "6px", fontSize: "11px" }}>
              <CheckCircle size={12} color="hsl(142,71%,48%)" />
              <span style={{ color: "hsl(var(--foreground))" }}>
                <strong>Liogames</strong>: {lioSelectedProduct.name}{lioVariationId ? ` / Var #${lioVariationId}` : ""} — mapping will be saved automatically
              </span>
              <button type="button" onClick={() => setStep(2)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", fontSize: "10px", display: "flex", alignItems: "center", gap: "2px" }}>
                <ArrowLeft size={10} /> Change
              </button>
            </div>
          )}
          {selectedProduct && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "6px", fontSize: "11px" }}>
              <CheckCircle size={12} color="hsl(142,71%,48%)" />
              <span style={{ color: "hsl(var(--foreground))" }}>
                <strong>{provider === "busan" ? "Busan" : "Smile.one"}</strong>: {selectedProduct.name} — mapping will be saved automatically
              </span>
              <button type="button" onClick={() => setStep(2)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", fontSize: "10px", display: "flex", alignItems: "center", gap: "2px" }}>
                <ArrowLeft size={10} /> Change
              </button>
            </div>
          )}
          {!selectedProduct && (
            <button type="button" onClick={() => setStep(1)} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", alignSelf: "flex-start" }}>
              <ArrowLeft size={13} /> Back
            </button>
          )}
          <div>
            <label style={labelStyle}>Name *</label>
            <input style={inputStyle} required value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="100 UC" />
          </div>
          {form.rate && (
            <div>
              <label style={labelStyle}>Rate</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {/* USD box */}
                <div style={{ display: "flex", alignItems: "center", border: "1px solid hsl(var(--border))", borderRadius: "6px", overflow: "hidden", background: "hsl(var(--muted))" }}>
                  <span style={{ padding: "0 10px", fontSize: "13px", fontWeight: 600, color: "hsl(var(--muted-foreground))", borderRight: "1px solid hsl(var(--border))", alignSelf: "stretch", display: "flex", alignItems: "center", userSelect: "none" }}>$</span>
                  <input
                    style={{ ...inputStyle, border: "none", borderRadius: 0, flex: 1, background: "transparent", cursor: "not-allowed", margin: 0 }}
                    type="number"
                    step="0.01"
                    value={form.rate}
                    readOnly
                    disabled
                  />
                </div>
                {/* INR box */}
                <div style={{ display: "flex", alignItems: "center", border: "1px solid hsl(var(--border))", borderRadius: "6px", overflow: "hidden", background: "hsl(var(--muted))" }}>
                  <span style={{ padding: "0 10px", fontSize: "13px", fontWeight: 600, color: "hsl(var(--muted-foreground))", borderRight: "1px solid hsl(var(--border))", alignSelf: "stretch", display: "flex", alignItems: "center", userSelect: "none" }}>₹</span>
                  <span style={{ flex: 1, padding: "0 10px", fontSize: "13px", color: "hsl(var(--foreground))", display: "flex", alignItems: "center", height: "100%" }}>
                    {usdInrRate && form.rate
                      ? ((parseFloat(form.rate) || 0) * usdInrRate).toFixed(2)
                      : usdInrRate === null && form.rate ? "…" : "—"}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: "0.7rem" }}>
            <div>
              <label style={labelStyle}>Price *</label>
              <input style={inputStyle} required type="number" step="0.01" value={form.price} onChange={(e) => { setField("price", e.target.value); setField("finalPrice", computeFinal(e.target.value, form.discountPercent)); }} placeholder="9.99" />
            </div>
            <div>
              <label style={labelStyle}>Discount %</label>
              <input style={inputStyle} type="number" step="0.01" min="0" max="100" value={form.discountPercent} onChange={(e) => { setField("discountPercent", e.target.value); setField("finalPrice", computeFinal(form.price, e.target.value)); }} placeholder="0" />
            </div>
            <div>
              <label style={labelStyle}>Final Price</label>
              <input style={inputStyle} type="number" step="0.01" value={form.finalPrice} onChange={(e) => setField("finalPrice", e.target.value)} placeholder="auto" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: "0.7rem" }}>
            <div>
              <label style={labelStyle}>Status</label>
              <select style={inputStyle} value={form.status} onChange={(e) => setField("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Sort Order</label>
              <input style={inputStyle} type="number" value={form.sortOrder} onChange={(e) => setField("sortOrder", parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label style={labelStyle}>Stock <span style={{ fontWeight: 400, textTransform: "none", fontSize: "10px" }}>(blank = unlimited)</span></label>
              <input style={inputStyle} type="number" min="0" value={form.stock} onChange={(e) => setField("stock", e.target.value)} placeholder="Unlimited" />
            </div>
          </div>
          <button type="submit" style={{ ...btnPrimary, justifyContent: "center" }} disabled={saving}>
            {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
            {saving ? "Saving..." : selectedProduct ? "Save Service & Map Provider" : "Save Service"}
          </button>
        </form>
      )}
    </Modal>
  );
}

// ─── Services sub-panel ───────────────────────────────────────────────────────
function ServicesPanel({ game }: { game: Game }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editSvc, setEditSvc] = useState<Service | null>(null);
  const { data: svcs = [], isLoading } = useQuery<Service[]>({
    queryKey: [`/api/admin/services?gameId=${game.id}`],
    queryFn: () => adminApi.get(`/services?gameId=${game.id}`),
  });

  const addMut = useMutation({
    mutationFn: (d: any) => { const { id: _id, ...rest } = d; return adminApi.post("/services", { ...rest, gameId: game.id }); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/admin/services?gameId=${game.id}`] });
      setShowAdd(false);
    },
  });
  const editMut = useMutation({
    mutationFn: ({ id, data }: any) => { const { id: _id, ...rest } = data; return adminApi.patch(`/services/${id}`, rest); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/admin/services?gameId=${game.id}`] });
      setEditSvc(null);
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/services/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/admin/services?gameId=${game.id}`] }),
  });
  return (
    <div style={{ padding: "0 16px 16px", marginTop: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "hsl(var(--muted-foreground))" }}>Services / Top-up Options</span>
        <button style={btnPrimary} onClick={() => setShowAdd(true)}><Plus size={12} /> Add Service</button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "1rem", color: "hsl(var(--muted-foreground))", fontSize: "12px" }}>Loading...</div>
      ) : svcs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "1rem", color: "hsl(var(--muted-foreground))", fontSize: "12px", border: "1px dashed hsl(var(--border))", borderRadius: "6px" }}>
          No services yet. Add your first top-up option.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr>
                {["Name", "Price", "Discount", "Final", "Stock", "Status", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em", color: "hsl(var(--muted-foreground))", borderBottom: "1px solid hsl(var(--border))" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {svcs.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)" }}>
                  <td style={{ padding: "8px 10px", fontWeight: 500, color: "hsl(var(--foreground))" }}>
                    <div>{s.name}</div>
                  </td>
                  <td style={{ padding: "8px 10px", color: "hsl(var(--muted-foreground))" }}>{s.price}</td>
                  <td style={{ padding: "8px 10px", color: "hsl(var(--muted-foreground))" }}>{s.discountPercent}%</td>
                  <td style={{ padding: "8px 10px", color: "hsl(var(--primary))", fontWeight: 600 }}>{s.finalPrice}</td>
                  <td style={{ padding: "8px 10px" }}>
                    {(s as any).stock === null || (s as any).stock === undefined
                      ? <span style={{ color: "hsl(var(--muted-foreground))", fontSize: "11px" }}>∞</span>
                      : (s as any).stock === 0
                        ? <span style={{ color: "hsl(0,72%,55%)", fontWeight: 700, fontSize: "11px" }}>Out</span>
                        : <span style={{ color: "hsl(142,71%,45%)", fontWeight: 600, fontSize: "11px" }}>{(s as any).stock}</span>
                    }
                  </td>
                  <td style={{ padding: "8px 10px" }}><span style={statusBadge(s.status === "active")}>{s.status}</span></td>
                  <td style={{ padding: "8px 10px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button style={btnEdit} onClick={() => setEditSvc(s)}><Pencil size={11} /></button>
                      <button style={btnDanger} onClick={() => { if (confirm("Delete this service?")) delMut.mutate(s.id); }}><Trash2 size={11} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddServiceWizard game={game} onClose={() => setShowAdd(false)} />
      )}
      {editSvc && (
        <Modal title="Edit Service" onClose={() => setEditSvc(null)}>
          <ServiceForm
            initial={{ id: editSvc.id, name: editSvc.name, description: editSvc.description ?? "", imageUrl: editSvc.imageUrl ?? "", price: String(editSvc.price), discountPercent: String(editSvc.discountPercent), finalPrice: String(editSvc.finalPrice), status: editSvc.status, sortOrder: editSvc.sortOrder, stock: (editSvc as any).stock !== null && (editSvc as any).stock !== undefined ? String((editSvc as any).stock) : "" }}
            onSubmit={(d) => editMut.mutate({ id: editSvc.id, data: d })}
            loading={editMut.isPending}
          />
        </Modal>
      )}
    </div>
  );
}

// ─── Main Games page ──────────────────────────────────────────────────────────
export default function Games() {
  const qc = useQueryClient();
  const isMobile = useMobile(768);
  const [showAdd, setShowAdd] = useState(false);
  const [editGame, setEditGame] = useState<Game | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: gameList = [], isLoading } = useQuery<Game[]>({
    queryKey: ["/api/admin/games"],
    queryFn: () => adminApi.get("/games"),
  });

  const addMut = useMutation({
    mutationFn: (d: any) => adminApi.post("/games", d),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ["/api/admin/games"] }); 
      qc.invalidateQueries({ queryKey: ["/api/games"] });
      setShowAdd(false); 
    },
  });
  const editMut = useMutation({
    mutationFn: ({ id, data }: any) => adminApi.patch(`/games/${id}`, data),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ["/api/admin/games"] }); 
      qc.invalidateQueries({ queryKey: ["/api/games"] });
      setEditGame(null); 
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/games/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/games"] });
      qc.invalidateQueries({ queryKey: ["/api/games"] });
    },
  });
  const trendingMut = useMutation({
    mutationFn: (id: string) => adminApi.patch(`/games/${id}/trending`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/games"] });
      qc.invalidateQueries({ queryKey: ["/api/games/trending"] });
    },
  });

  return (
    <AdminLayout title="Games" actions={
      <button style={btnPrimary} onClick={() => setShowAdd(true)}>
        <Plus size={14} /> Add Game
      </button>
    }>

      <div style={card}>
        {isLoading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: "13px" }}>Loading games...</div>
        ) : gameList.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <p style={{ color: "hsl(var(--muted-foreground))", fontSize: "13px", marginBottom: "12px" }}>No games yet. Add your first game to get started.</p>
            <button style={btnPrimary} onClick={() => setShowAdd(true)}><Plus size={13} /> Add First Game</button>
          </div>
        ) : (
          <div>
            {gameList.map((g, idx) => (
              <div key={g.id} style={{ borderBottom: idx < gameList.length - 1 ? "1px solid hsl(var(--border) / 0.5)" : "none" }}>

                {isMobile ? (
                  /* ── Mobile card layout ── */
                  <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {/* Top row: icon + status + chevron */}
                    <div
                      style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
                      onClick={() => setExpandedId(expandedId === g.id ? null : g.id)}
                    >
                      {g.logoUrl ? (
                        <img src={g.logoUrl} alt={g.name} style={{ width: "44px", height: "44px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: "44px", height: "44px", borderRadius: "8px", background: "hsl(var(--primary) / 0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Gamepad2 size={18} style={{ color: "hsla(258,90%,66%,0.6)" }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "15px", color: "hsl(var(--foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</div>
                        <div style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "2px" }}>{g.slug}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                        <span style={statusBadge(g.status === "active")}>{g.status}</span>
                        <span style={{ color: "hsl(var(--muted-foreground))" }}>
                          {expandedId === g.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </span>
                      </div>
                    </div>

                    {/* Bottom row: action buttons */}
                    <div
                      style={{ display: "flex", gap: "8px", alignItems: "center" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        style={{
                          ...( g.isTrending
                            ? { ...btnEdit, background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24" }
                            : { ...btnEdit, background: "rgba(124,58,237,0.07)", color: "hsl(var(--muted-foreground))" }
                          ),
                          flex: 1,
                        }}
                        onClick={() => trendingMut.mutate(g.id)}
                        disabled={trendingMut.isPending}
                      >
                        <TrendingUp size={13} />
                        {g.isTrending ? "Trending" : "Trend"}
                      </button>
                      <button
                        style={{ ...btnEdit, flex: 1 }}
                        onClick={() => setEditGame(g)}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        style={{ ...btnDanger, flex: 1 }}
                        onClick={() => { if (confirm(`Delete "${g.name}"? This will also delete all its services.`)) delMut.mutate(g.id); }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Desktop card layout (unchanged) ── */
                  <div
                    style={{ display: "flex", flexDirection: "column", padding: "12px 16px", gap: "8px", cursor: "pointer" }}
                    onClick={() => setExpandedId(expandedId === g.id ? null : g.id)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0 }}>
                        {expandedId === g.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </span>
                      {g.logoUrl ? (
                        <img src={g.logoUrl} alt={g.name} style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: "hsl(var(--primary) / 0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Gamepad2 size={14} style={{ color: "hsla(258,90%,66%,0.6)" }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "13px", color: "hsl(var(--foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</div>
                        <div style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.slug}</div>
                      </div>
                      <span style={{ ...statusBadge(g.status === "active"), flexShrink: 0 }}>{g.status}</span>
                    </div>

                    <div
                      style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", paddingLeft: "44px" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        style={g.isTrending
                          ? { ...btnEdit, background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24" }
                          : { ...btnEdit, background: "rgba(124,58,237,0.07)", color: "hsl(var(--muted-foreground))" }}
                        onClick={() => trendingMut.mutate(g.id)}
                        disabled={trendingMut.isPending}
                        title={g.isTrending ? "Remove from Trending" : "Add to Trending"}
                      >
                        <TrendingUp size={11} /> {g.isTrending ? "Trending" : "Trend"}
                      </button>
                      <button style={btnEdit} onClick={() => setEditGame(g)}><Pencil size={11} /> Edit</button>
                      <button style={btnDanger} onClick={() => { if (confirm(`Delete "${g.name}"? This will also delete all its services.`)) delMut.mutate(g.id); }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Services panel */}
                {expandedId === g.id && (
                  <div style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border) / 0.5)" }}>
                    <ServicesPanel game={g} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <Modal title="Add Game" onClose={() => setShowAdd(false)}>
          <GameForm initial={EMPTY_GAME} onSubmit={(d) => addMut.mutate(d)} loading={addMut.isPending} />
        </Modal>
      )}
      {editGame && (
        <Modal title="Edit Game" onClose={() => setEditGame(null)}>
          <GameForm
            initial={{
              name: editGame.name,
              slug: editGame.slug,
              description: editGame.description ?? "",
              logoUrl: editGame.logoUrl ?? "",
              bannerUrl: editGame.bannerUrl ?? "",
              category: editGame.category,
              status: editGame.status,
              sortOrder: editGame.sortOrder,
              requiredFields: editGame.requiredFields ?? "userId",
              instantDelivery: editGame.instantDelivery !== false,
            }}
            onSubmit={(d) => editMut.mutate({ id: editGame.id, data: d })}
            loading={editMut.isPending}
          />
        </Modal>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AdminLayout>
  );
}
