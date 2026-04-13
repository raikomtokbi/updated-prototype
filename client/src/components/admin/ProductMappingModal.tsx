import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X, ArrowLeft, Zap, Smile, Link2, Loader2,
  CheckCircle, Trash2, RefreshCw,
} from "lucide-react";
import { adminApi } from "@/lib/store/useAdmin";
import { useAuthStore } from "@/lib/store/authstore";

const REGIONS = [
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

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "7px 10px", background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))", borderRadius: "6px",
  color: "hsl(var(--foreground))", fontSize: "13px", outline: "none", boxSizing: "border-box",
};
const selectStyle: React.CSSProperties = {
  ...inputStyle, appearance: "none", cursor: "pointer",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
};
const labelStyle: React.CSSProperties = {
  fontSize: "11px", fontWeight: 600, color: "hsl(var(--muted-foreground))",
  marginBottom: "4px", display: "block", textTransform: "uppercase", letterSpacing: "0.04em",
};
const btnPrimary: React.CSSProperties = {
  padding: "7px 14px", borderRadius: "6px",
  background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
  color: "white", fontSize: "12px", fontWeight: 600, cursor: "pointer",
  border: "none", display: "inline-flex", alignItems: "center", gap: "6px",
};

interface BusanProduct {
  id: string; name: string; price: number; priceRaw?: string; currency: string;
}
interface SmileProduct {
  product_id: string; name: string; price: number; currency: string;
}

export function ProductMappingModal({
  cmsProductId,
  cmsProductName,
  onClose,
}: {
  cmsProductId: string;
  cmsProductName: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [provider, setProvider] = useState<"busan" | "smileone" | "liogames" | null>(null);
  const [saving, setSaving] = useState(false);

  const [busanProducts, setBusanProducts] = useState<BusanProduct[]>([]);
  const [selectedBusan, setSelectedBusan] = useState<BusanProduct | null>(null);
  const [busanLoading, setBusanLoading] = useState(false);
  const [busanError, setBusanError] = useState("");

  const [gameSlug, setGameSlug] = useState("");
  const [region, setRegion] = useState("global");
  const [smileProducts, setSmileProducts] = useState<SmileProduct[]>([]);
  const [selectedSmile, setSelectedSmile] = useState<SmileProduct | null>(null);
  const [smileLoading, setSmileLoading] = useState(false);

  const [lioProducts, setLioProducts] = useState<{ id: number; name: string; price: string }[]>([]);
  const [lioProductsLoading, setLioProductsLoading] = useState(false);
  const [lioProductsError, setLioProductsError] = useState("");
  const [lioSelectedProduct, setLioSelectedProduct] = useState<{ id: number; name: string } | null>(null);
  const [lioVariationId, setLioVariationId] = useState("");
  const [lioVariations, setLioVariations] = useState<{ variation_id: number; name: string }[]>([]);
  const [lioVarLoading, setLioVarLoading] = useState(false);

  const { data: busanMappings = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/busan/mappings"],
    queryFn: () => adminApi.get("/busan/mappings"),
  });
  const { data: smileMappings = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/smileone/mappings"],
    queryFn: () => adminApi.get("/smileone/mappings"),
  });
  const { data: lioMappings = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/liogames/mappings"],
    queryFn: () => adminApi.get("/liogames/mappings"),
  });

  const existingBusan = busanMappings.find((m: any) => m.cmsProductId === cmsProductId);
  const existingSmile = smileMappings.find((m: any) => m.cmsProductId === cmsProductId);
  const existingLio = lioMappings.find((m: any) => m.cmsProductId === cmsProductId);

  async function fetchBusanProducts() {
    setBusanLoading(true); setBusanError(""); setBusanProducts([]);
    try {
      const data = await adminApi.get("/busan/products");
      setBusanProducts(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setBusanError(e.message || "Failed to fetch Busan products");
    } finally { setBusanLoading(false); }
  }

  async function fetchSmileProducts() {
    if (!gameSlug) return;
    setSmileLoading(true); setSmileProducts([]);
    try {
      const res = await fetch(
        `/api/smileone/products?game=${encodeURIComponent(gameSlug)}&region=${region}`,
        { headers: { "X-Username": user?.username ?? "", "x-admin-role": user?.role ?? "super_admin" } },
      );
      const data = await res.json();
      setSmileProducts(data.success && Array.isArray(data.products) ? data.products : []);
    } catch { setSmileProducts([]); }
    finally { setSmileLoading(false); }
  }

  async function fetchLioProducts() {
    setLioProductsLoading(true); setLioProductsError(""); setLioProducts([]);
    try {
      const res = await fetch("/api/admin/liogames/products", {
        headers: { "x-admin-role": user?.role ?? "super_admin" },
      });
      const data = await res.json();
      setLioProducts(Array.isArray(data?.products) ? data.products : []);
      if (!data?.success && !Array.isArray(data?.products)) {
        setLioProductsError(data?.message || "Failed to fetch products");
      }
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

  async function mapBusan() {
    if (!selectedBusan) return;
    setSaving(true);
    try {
      if (existingBusan) await adminApi.delete(`/busan/mappings/${existingBusan.id}`);
      await adminApi.post("/busan/mappings", {
        cmsProductId, cmsProductName,
        busanProductId: selectedBusan.id,
        busanProductName: selectedBusan.name,
      });
      qc.invalidateQueries({ queryKey: ["/api/admin/busan/mappings"] });
      onClose();
    } catch (e: any) { console.error(e); }
    finally { setSaving(false); }
  }

  async function mapSmile() {
    if (!selectedSmile) return;
    setSaving(true);
    try {
      if (existingSmile) await adminApi.delete(`/smileone/mappings/${existingSmile.id}`);
      await adminApi.post("/smileone/mappings", {
        cmsProductId, cmsProductName,
        smileProductId: selectedSmile.product_id,
        smileProductName: selectedSmile.name,
        gameSlug, region,
      });
      qc.invalidateQueries({ queryKey: ["/api/admin/smileone/mappings"] });
      onClose();
    } catch (e: any) { console.error(e); }
    finally { setSaving(false); }
  }

  async function mapLio() {
    if (!lioSelectedProduct) return;
    setSaving(true);
    try {
      if (existingLio) await adminApi.delete(`/liogames/mappings/${existingLio.id}`);
      await adminApi.post("/liogames/mappings", {
        cmsProductId, cmsProductName,
        lioProductId: lioSelectedProduct.id,
        lioVariationId: lioVariationId ? parseInt(lioVariationId, 10) : undefined,
        lioProductName: lioSelectedProduct.name,
      });
      qc.invalidateQueries({ queryKey: ["/api/admin/liogames/mappings"] });
      onClose();
    } catch (e: any) { console.error(e); }
    finally { setSaving(false); }
  }

  async function removeBusan() {
    if (!existingBusan) return;
    await adminApi.delete(`/busan/mappings/${existingBusan.id}`);
    qc.invalidateQueries({ queryKey: ["/api/admin/busan/mappings"] });
  }

  async function removeSmile() {
    if (!existingSmile) return;
    await adminApi.delete(`/smileone/mappings/${existingSmile.id}`);
    qc.invalidateQueries({ queryKey: ["/api/admin/smileone/mappings"] });
  }

  async function removeLio() {
    if (!existingLio) return;
    await adminApi.delete(`/liogames/mappings/${existingLio.id}`);
    qc.invalidateQueries({ queryKey: ["/api/admin/liogames/mappings"] });
  }

  function goBack() {
    setProvider(null);
    setSelectedBusan(null);
    setSelectedSmile(null);
    setBusanProducts([]);
    setBusanError("");
    setSmileProducts([]);
    setLioProducts([]);
    setLioProductsError("");
    setLioSelectedProduct(null);
    setLioVariationId("");
    setLioVariations([]);
  }

  const titleMap: Record<string, string> = {
    busan: "Busan — Select Product",
    smileone: "Smile.one — Select Product",
    liogames: "Liogames — Enter Product",
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
      <div style={{
        position: "relative", width: "100%", maxWidth: "500px", maxHeight: "88vh",
        overflowY: "auto", background: "hsl(var(--background))",
        border: "1px solid rgba(124,58,237,0.25)", borderRadius: "10px", padding: "1.5rem",
      }}>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {provider && (
              <button type="button" onClick={goBack} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", padding: "2px", display: "flex" }}>
                <ArrowLeft size={15} />
              </button>
            )}
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "hsl(var(--foreground))", margin: 0 }}>
              {provider ? titleMap[provider] : "Map to Provider"}
            </h3>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "hsl(var(--muted-foreground))", cursor: "pointer", display: "flex" }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ marginBottom: "1rem", padding: "8px 12px", background: "hsl(var(--card))", borderRadius: "6px", fontSize: "12px", border: "1px solid hsl(var(--border))" }}>
          <span style={{ color: "hsl(var(--muted-foreground))" }}>Service: </span>
          <strong style={{ color: "hsl(var(--foreground))" }}>{cmsProductName}</strong>
        </div>

        {/* ── Provider selection ── */}
        {!provider && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", margin: 0 }}>
              Choose an API provider for auto-fulfillment:
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              <button
                type="button"
                onClick={() => { setProvider("busan"); fetchBusanProducts(); }}
                style={{
                  padding: "14px 10px", borderRadius: "8px", cursor: "pointer", textAlign: "left",
                  border: existingBusan ? "2px solid rgba(74,222,128,0.45)" : "1px solid hsl(var(--border))",
                  background: existingBusan ? "rgba(74,222,128,0.05)" : "hsl(var(--card))",
                  display: "flex", flexDirection: "column", gap: "6px", transition: "border 0.15s",
                }}
              >
                <Zap size={18} color="hsl(258,90%,62%)" />
                <span style={{ fontSize: "12px", fontWeight: 600, color: "hsl(var(--foreground))" }}>Busan</span>
                {existingBusan
                  ? <span style={{ fontSize: "10px", color: "hsl(142,71%,48%)", display: "flex", alignItems: "center", gap: "3px" }}><CheckCircle size={9} /> Mapped</span>
                  : <span style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))" }}>Not mapped</span>}
              </button>

              <button
                type="button"
                onClick={() => setProvider("smileone")}
                style={{
                  padding: "14px 10px", borderRadius: "8px", cursor: "pointer", textAlign: "left",
                  border: existingSmile ? "2px solid rgba(74,222,128,0.45)" : "1px solid hsl(var(--border))",
                  background: existingSmile ? "rgba(74,222,128,0.05)" : "hsl(var(--card))",
                  display: "flex", flexDirection: "column", gap: "6px", transition: "border 0.15s",
                }}
              >
                <Smile size={18} color="#f59e0b" />
                <span style={{ fontSize: "12px", fontWeight: 600, color: "hsl(var(--foreground))" }}>Smile.one</span>
                {existingSmile
                  ? <span style={{ fontSize: "10px", color: "hsl(142,71%,48%)", display: "flex", alignItems: "center", gap: "3px" }}><CheckCircle size={9} /> Mapped</span>
                  : <span style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))" }}>Not mapped</span>}
              </button>

              <button
                type="button"
                onClick={() => { setProvider("liogames"); fetchLioProducts(); }}
                style={{
                  padding: "14px 10px", borderRadius: "8px", cursor: "pointer", textAlign: "left",
                  border: existingLio ? "2px solid rgba(74,222,128,0.45)" : "1px solid hsl(var(--border))",
                  background: existingLio ? "rgba(74,222,128,0.05)" : "hsl(var(--card))",
                  display: "flex", flexDirection: "column", gap: "6px", transition: "border 0.15s",
                }}
              >
                <Zap size={18} color="#06b6d4" />
                <span style={{ fontSize: "12px", fontWeight: 600, color: "hsl(var(--foreground))" }}>Liogames</span>
                {existingLio
                  ? <span style={{ fontSize: "10px", color: "hsl(142,71%,48%)", display: "flex", alignItems: "center", gap: "3px" }}><CheckCircle size={9} /> Mapped</span>
                  : <span style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))" }}>Not mapped</span>}
              </button>
            </div>

            {(existingBusan || existingSmile || existingLio) && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 }}>
                  Active Mappings
                </p>
                {existingBusan && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "6px", fontSize: "11px" }}>
                    <span style={{ color: "hsl(var(--foreground))" }}><strong>Busan:</strong> {existingBusan.busanProductId}</span>
                    <button type="button" onClick={removeBusan} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", display: "flex", padding: "2px" }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
                {existingSmile && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "6px", fontSize: "11px" }}>
                    <span style={{ color: "hsl(var(--foreground))" }}><strong>Smile.one:</strong> {existingSmile.smileProductName ?? existingSmile.smileProductId}</span>
                    <button type="button" onClick={removeSmile} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", display: "flex", padding: "2px" }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
                {existingLio && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 10px", background: "rgba(74,222,128,0.05)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "6px", fontSize: "11px" }}>
                    <span style={{ color: "hsl(var(--foreground))" }}><strong>Liogames:</strong> {existingLio.lioProductName ?? `#${existingLio.lioProductId}`}{existingLio.lioVariationId ? ` / Var #${existingLio.lioVariationId}` : ""}</span>
                    <button type="button" onClick={removeLio} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", display: "flex", padding: "2px" }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Busan product list ── */}
        {provider === "busan" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {busanLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "hsl(var(--muted-foreground))", fontSize: "12px", padding: "16px 0" }}>
                <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Loading Busan products...
              </div>
            )}
            {busanError && (
              <div style={{ padding: "8px 12px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px", fontSize: "12px", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{busanError}</span>
                <button type="button" onClick={fetchBusanProducts} style={{ color: "hsl(var(--primary))", background: "none", border: "none", cursor: "pointer", fontSize: "11px" }}>Retry</button>
              </div>
            )}
            {!busanLoading && busanProducts.length > 0 && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>{busanProducts.length} products loaded</span>
                  <button type="button" onClick={fetchBusanProducts} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--primary))", fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <RefreshCw size={10} /> Refresh
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "260px", overflowY: "auto" }}>
                  {busanProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => setSelectedBusan(p)}
                      style={{
                        padding: "8px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px",
                        background: selectedBusan?.id === p.id ? "rgba(124,58,237,0.15)" : "hsl(var(--card))",
                        border: selectedBusan?.id === p.id ? "1px solid rgba(124,58,237,0.4)" : "1px solid hsl(var(--border))",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}
                    >
                      <span style={{ color: "hsl(var(--foreground))" }}>{p.name}</span>
                      <span style={{ color: "hsl(var(--muted-foreground))", fontSize: "11px" }}>{p.priceRaw ?? `${p.currency} ${p.price}`}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {!busanLoading && busanProducts.length === 0 && !busanError && (
              <div style={{ textAlign: "center", padding: "24px", color: "hsl(var(--muted-foreground))", fontSize: "12px" }}>
                No products loaded.{" "}
                <button type="button" onClick={fetchBusanProducts} style={{ color: "hsl(var(--primary))", background: "none", border: "none", cursor: "pointer" }}>Try again</button>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "10px", borderTop: "1px solid hsl(var(--border))" }}>
              <button type="button" onClick={goBack} style={{ padding: "7px 14px", borderRadius: "6px", background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))", fontSize: "12px", cursor: "pointer" }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={mapBusan}
                disabled={!selectedBusan || saving}
                style={{ ...btnPrimary, opacity: (!selectedBusan || saving) ? 0.5 : 1, cursor: !selectedBusan || saving ? "not-allowed" : "pointer" }}
              >
                {saving ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Link2 size={12} />}
                Map
              </button>
            </div>
          </div>
        )}

        {/* ── Smile.one ── */}
        {provider === "smileone" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: "8px", alignItems: "end" }}>
              <div>
                <label style={labelStyle}>Game Slug</label>
                <input style={inputStyle} value={gameSlug} onChange={(e) => setGameSlug(e.target.value)} placeholder="e.g. mobile-legends" />
              </div>
              <div>
                <label style={labelStyle}>Region</label>
                <select style={selectStyle} value={region} onChange={(e) => setRegion(e.target.value)}>
                  {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchSmileProducts}
              disabled={!gameSlug || smileLoading}
              style={{ ...btnPrimary, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--foreground))", opacity: (!gameSlug || smileLoading) ? 0.5 : 1 }}
            >
              {smileLoading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={12} />}
              Fetch Products
            </button>
            {smileProducts.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "220px", overflowY: "auto" }}>
                {smileProducts.map((p) => (
                  <div
                    key={p.product_id}
                    onClick={() => setSelectedSmile(p)}
                    style={{
                      padding: "8px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px",
                      background: selectedSmile?.product_id === p.product_id ? "rgba(124,58,237,0.15)" : "hsl(var(--card))",
                      border: selectedSmile?.product_id === p.product_id ? "1px solid rgba(124,58,237,0.4)" : "1px solid hsl(var(--border))",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}
                  >
                    <span style={{ color: "hsl(var(--foreground))" }}>{p.name}</span>
                    <span style={{ color: "hsl(var(--muted-foreground))", fontSize: "11px" }}>{p.currency} {p.price}</span>
                  </div>
                ))}
              </div>
            )}
            {!smileLoading && smileProducts.length === 0 && gameSlug && (
              <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>No products found. Check the game slug and region, then fetch again.</p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "10px", borderTop: "1px solid hsl(var(--border))" }}>
              <button type="button" onClick={goBack} style={{ padding: "7px 14px", borderRadius: "6px", background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))", fontSize: "12px", cursor: "pointer" }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={mapSmile}
                disabled={!selectedSmile || saving}
                style={{ ...btnPrimary, opacity: (!selectedSmile || saving) ? 0.5 : 1, cursor: !selectedSmile || saving ? "not-allowed" : "pointer" }}
              >
                {saving ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Link2 size={12} />}
                Map
              </button>
            </div>
          </div>
        )}

        {/* ── Liogames ── */}
        {provider === "liogames" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
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
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "220px", overflowY: "auto" }}>
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
                <select style={selectStyle} value={lioVariationId} onChange={(e) => setLioVariationId(e.target.value)} data-testid="select-lio-variation">
                  <option value="">— No specific variation —</option>
                  {lioVariations.map((v) => (
                    <option key={v.variation_id} value={String(v.variation_id)}>{v.name} (#{v.variation_id})</option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "10px", borderTop: "1px solid hsl(var(--border))" }}>
              <button type="button" onClick={goBack} style={{ padding: "7px 14px", borderRadius: "6px", background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))", fontSize: "12px", cursor: "pointer" }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={mapLio}
                disabled={!lioSelectedProduct || saving}
                style={{ ...btnPrimary, opacity: (!lioSelectedProduct || saving) ? 0.5 : 1, cursor: !lioSelectedProduct || saving ? "not-allowed" : "pointer" }}
                data-testid="button-map-liogames"
              >
                {saving ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Link2 size={12} />}
                Map
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
