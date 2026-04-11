import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wifi, Save, Trash2, RefreshCw, CheckCircle,
  XCircle, Loader2, Link2, ArrowRight, Copy, Check,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import { card, btnPrimary, inputStyle, selectStyle } from "@/components/admin/shared";
import { useAuthStore } from "@/lib/store/authstore";
import type { Game, Service, SmileOneConfig, SmileOneMapping } from "@shared/schema";

// ─── Types ───────────────────────────────────────────────────────────────────
interface SmileProduct {
  product_id: string;
  name: string;
  price: number;
  currency: string;
}

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

// ─── Shared Styles ───────────────────────────────────────────────────────────
const sectionTitle: React.CSSProperties = {
  fontSize: "11px", fontWeight: 700, color: "hsl(220,10%,55%)",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px",
};
const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: "7px 18px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
  cursor: "pointer", border: "none", transition: "all 0.15s",
  background: active ? "hsl(258, 90%, 62%)" : "transparent",
  color: active ? "white" : "hsl(220,10%,60%)",
});
const fieldRow: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "4px" };
const labelStyle: React.CSSProperties = { fontSize: "11px", fontWeight: 600, color: "hsl(220,10%,60%)" };

// ─── Configuration Tab ────────────────────────────────────────────────────────
function ConfigTab() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { data: config } = useQuery<SmileOneConfig | null>({
    queryKey: ["/api/admin/smileone/config"],
    queryFn: () => adminApi.get("/smileone/config"),
  });

  const [form, setForm] = useState({ uid: "", apiKey: "", licenseKey: "", region: "global", email: "", isActive: true });
  const [testStatus, setTestStatus] = useState<null | { ok: boolean; message: string; balance?: unknown }>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (config) {
      setForm({
        uid: config.uid ?? "",
        apiKey: config.apiKey ?? "",
        licenseKey: config.licenseKey ?? "",
        region: config.region ?? "global",
        email: config.email ?? "",
        isActive: config.isActive ?? true,
      });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: () => adminApi.post("/smileone/config", form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/smileone/config"] }),
  });

  async function testConnection() {
    setTesting(true);
    setTestStatus(null);
    try {
      const res = await fetch("/api/admin/smileone/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-role": user?.role ?? "super_admin",
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setTestStatus({ ok: data.success, message: data.message, balance: data.balance });
    } catch {
      setTestStatus({ ok: false, message: "Connection failed" });
    } finally {
      setTesting(false);
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div style={{ maxWidth: 540 }}>
      <div style={{ ...card, padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <p style={sectionTitle}>API Credentials</p>

        <div style={fieldRow}>
          <label style={labelStyle}>UID</label>
          <input data-testid="input-smileone-uid" style={inputStyle} value={form.uid} onChange={set("uid")} placeholder="Your Smile.one UID" />
        </div>
        <div style={fieldRow}>
          <label style={labelStyle}>API Key</label>
          <input data-testid="input-smileone-apikey" type="password" style={inputStyle} value={form.apiKey} onChange={set("apiKey")} placeholder="••••••••" />
        </div>
        <div style={fieldRow}>
          <label style={labelStyle}>License Key</label>
          <input data-testid="input-smileone-licensekey" type="password" style={inputStyle} value={form.licenseKey} onChange={set("licenseKey")} placeholder="••••••••" />
        </div>
        <div style={fieldRow}>
          <label style={labelStyle}>Email</label>
          <input data-testid="input-smileone-email" style={inputStyle} value={form.email} onChange={set("email")} placeholder="your@email.com" />
        </div>
        <div style={fieldRow}>
          <label style={labelStyle}>Region</label>
          <select data-testid="select-smileone-region" style={{ ...selectStyle, width: "100%" }} value={form.region} onChange={set("region")}>
            {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0" }}>
          <input
            data-testid="toggle-smileone-active"
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
            style={{ cursor: "pointer", width: "16px", height: "16px" }}
          />
          <label style={{ ...labelStyle, cursor: "pointer", margin: 0 }}>Enable Smile.one</label>
        </div>

        {testStatus && (
          <div style={{
            padding: "10px 14px", borderRadius: "6px", fontSize: "12px",
            background: testStatus.ok ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
            border: `1px solid ${testStatus.ok ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`,
            color: testStatus.ok ? "#4ade80" : "#f87171",
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            {testStatus.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
            <span>{testStatus.message}{testStatus.balance != null ? ` — Balance: ${testStatus.balance}` : ""}</span>
          </div>
        )}

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            data-testid="button-test-connection"
            style={{ ...btnPrimary, background: "hsl(220,20%,16%)", border: "1px solid hsl(220,15%,22%)" }}
            onClick={testConnection}
            disabled={testing}
          >
            {testing ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Wifi size={13} />}
            Test Connection
          </button>
          <button
            data-testid="button-save-config"
            style={btnPrimary}
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />}
            Save Config
          </button>
        </div>
      </div>

      <WebhookUrlsPanel />
    </div>
  );
}

function WebhookUrlsPanel() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const webhooks = [
    { label: "Product List",       path: "/api/smileone/callback/products", desc: "Returns available products to Smile.one" },
    { label: "Role Check",         path: "/api/smileone/callback/role",     desc: "Verifies player UID/SID before purchase" },
    { label: "Game Order",         path: "/api/smileone/callback/order",    desc: "Creates an order when user confirms" },
    { label: "Payment Notify",     path: "/api/smileone/callback/notify",   desc: "Called by Smile.one after payment success" },
  ];

  function copy(path: string) {
    navigator.clipboard.writeText(`${origin}${path}`);
    setCopiedKey(path);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <div style={{ ...card, padding: "20px", marginTop: "16px" }}>
      <p style={sectionTitle}>Merchant Callback URLs</p>
      <p style={{ fontSize: "11px", color: "hsl(220,10%,50%)", marginBottom: "14px", lineHeight: 1.5 }}>
        Register these URLs in your Smile.one Merchant Dashboard so Smile.one can call back to your store.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {webhooks.map((wh) => (
          <div key={wh.path} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "hsl(210,40%,80%)" }}>{wh.label}</span>
              <span style={{ fontSize: "10px", color: "hsl(220,10%,45%)" }}>{wh.desc}</span>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "hsl(220,20%,8%)", border: "1px solid hsl(220,15%,16%)",
              borderRadius: "6px", padding: "6px 10px",
            }}>
              <code style={{ flex: 1, fontSize: "11px", color: "hsl(210,40%,75%)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {origin}{wh.path}
              </code>
              <button
                data-testid={`button-copy-${wh.label.replace(/\s+/g, "-").toLowerCase()}`}
                onClick={() => copy(wh.path)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(220,10%,55%)", display: "flex", alignItems: "center", flexShrink: 0 }}
              >
                {copiedKey === wh.path ? <Check size={13} style={{ color: "#4ade80" }} /> : <Copy size={13} />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Product Mapping Tab ──────────────────────────────────────────────────────
function MappingTab() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const { data: games = [] } = useQuery<Game[]>({
    queryKey: ["/api/admin/games"],
    queryFn: () => adminApi.get("/games"),
  });
  const { data: mappings = [] } = useQuery<SmileOneMapping[]>({
    queryKey: ["/api/admin/smileone/mappings"],
    queryFn: () => adminApi.get("/smileone/mappings"),
  });

  // Left side state
  const [leftGame, setLeftGame] = useState("");
  const [selectedService, setSelectedService] = useState<{ id: string; name: string; price: string } | null>(null);

  // Right side state
  const [rightGame, setRightGame] = useState("");
  const [rightRegion, setRightRegion] = useState("global");
  const [smileProducts, setSmileProducts] = useState<SmileProduct[]>([]);
  const [fetchingSmile, setFetchingSmile] = useState(false);
  const [selectedSmile, setSelectedSmile] = useState<SmileProduct | null>(null);

  const { data: services = [], isLoading: loadingServices } = useQuery<Service[]>({
    queryKey: ["/api/admin/services", leftGame],
    queryFn: () => adminApi.get(`/services?gameId=${leftGame}`),
    enabled: !!leftGame,
  });

  async function fetchSmileProducts() {
    if (!rightGame) return;
    setFetchingSmile(true);
    setSmileProducts([]);
    try {
      const res = await fetch(`/api/smileone/products?game=${encodeURIComponent(rightGame)}&region=${rightRegion}`, {
        headers: {
          "X-Username": user?.username ?? "",
          "x-admin-role": user?.role ?? "super_admin",
        },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setSmileProducts(data.products);
      } else {
        setSmileProducts([]);
      }
    } catch {
      setSmileProducts([]);
    } finally {
      setFetchingSmile(false);
    }
  }

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedService || !selectedSmile) throw new Error("Select both products first");
      const gameSlug = games.find((g) => g.id === leftGame)?.slug ?? rightGame;
      return adminApi.post("/smileone/mappings", {
        cmsProductId: selectedService.id,
        cmsProductName: selectedService.name,
        smileProductId: selectedSmile.product_id,
        smileProductName: selectedSmile.name,
        gameSlug,
        region: rightRegion,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/smileone/mappings"] });
      setSelectedService(null);
      setSelectedSmile(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/smileone/mappings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/smileone/mappings"] }),
  });

  const canMap = selectedService && selectedSmile;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Two-column mapping builder */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "12px", alignItems: "start" }}>
        {/* Left column – CMS Products */}
        <div style={{ ...card, padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <p style={sectionTitle}>CMS Products (Services)</p>
          <div style={fieldRow}>
            <label style={labelStyle}>Select Game</label>
            <select
              data-testid="select-cms-game"
              style={{ ...selectStyle, width: "100%" }}
              value={leftGame}
              onChange={(e) => { setLeftGame(e.target.value); setSelectedService(null); }}
            >
              <option value="">— Choose a game —</option>
              {games.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          {leftGame && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "260px", overflowY: "auto" }}>
              {loadingServices && <p style={{ fontSize: "12px", color: "hsl(220,10%,50%)" }}>Loading...</p>}
              {!loadingServices && services.length === 0 && (
                <p style={{ fontSize: "12px", color: "hsl(220,10%,40%)" }}>No services for this game yet.</p>
              )}
              {services.map((svc) => (
                <div
                  data-testid={`cms-product-${svc.id}`}
                  key={svc.id}
                  onClick={() => setSelectedService({ id: svc.id, name: svc.name, price: String(svc.finalPrice) })}
                  style={{
                    padding: "8px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px",
                    background: selectedService?.id === svc.id ? "rgba(124,58,237,0.15)" : "hsl(220,20%,11%)",
                    border: selectedService?.id === svc.id ? "1px solid rgba(124,58,237,0.4)" : "1px solid hsl(220,15%,18%)",
                    color: "hsl(210,40%,88%)",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}
                >
                  <span>{svc.name}</span>
                  <span style={{ color: "hsl(220,10%,55%)", fontSize: "11px" }}>${svc.finalPrice}</span>
                </div>
              ))}
            </div>
          )}
          {!leftGame && (
            <p style={{ fontSize: "12px", color: "hsl(220,10%,40%)" }}>Select a game to see its products.</p>
          )}
        </div>

        {/* Arrow + Map button */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", paddingTop: "60px" }}>
          <ArrowRight size={20} color="hsl(220,10%,40%)" />
          <button
            data-testid="button-map-products"
            style={{
              ...btnPrimary,
              opacity: canMap ? 1 : 0.4,
              cursor: canMap ? "pointer" : "not-allowed",
              padding: "8px 16px",
              flexDirection: "column",
              gap: "4px",
            }}
            onClick={() => canMap && createMutation.mutate()}
            disabled={!canMap || createMutation.isPending}
          >
            {createMutation.isPending ? <Loader2 size={13} /> : <Link2 size={13} />}
            MAP
          </button>
        </div>

        {/* Right column – Smile.one Products */}
        <div style={{ ...card, padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <p style={sectionTitle}>Smile.one Products</p>
          <div style={fieldRow}>
            <label style={labelStyle}>Game Slug</label>
            <input
              data-testid="input-smile-game"
              style={inputStyle}
              value={rightGame}
              onChange={(e) => setRightGame(e.target.value)}
              placeholder="e.g. mobile-legends"
            />
          </div>
          <div style={fieldRow}>
            <label style={labelStyle}>Region</label>
            <select
              data-testid="select-smile-region"
              style={{ ...selectStyle, width: "100%" }}
              value={rightRegion}
              onChange={(e) => setRightRegion(e.target.value)}
            >
              {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <button
            data-testid="button-fetch-smile-products"
            style={{ ...btnPrimary, background: "hsl(220,20%,14%)", border: "1px solid hsl(220,15%,20%)" }}
            onClick={fetchSmileProducts}
            disabled={!rightGame || fetchingSmile}
          >
            {fetchingSmile ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={13} />}
            Fetch Products
          </button>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "200px", overflowY: "auto" }}>
            {smileProducts.length === 0 && !fetchingSmile && (
              <p style={{ fontSize: "12px", color: "hsl(220,10%,40%)" }}>Fetch products to see Smile.one options.</p>
            )}
            {smileProducts.map((p) => (
              <div
                data-testid={`smile-product-${p.product_id}`}
                key={p.product_id}
                onClick={() => setSelectedSmile(p)}
                style={{
                  padding: "8px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px",
                  background: selectedSmile?.product_id === p.product_id ? "rgba(124,58,237,0.15)" : "hsl(220,20%,11%)",
                  border: selectedSmile?.product_id === p.product_id ? "1px solid rgba(124,58,237,0.4)" : "1px solid hsl(220,15%,18%)",
                  color: "hsl(210,40%,88%)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}
              >
                <span>{p.name}</span>
                <span style={{ color: "hsl(220,10%,55%)", fontSize: "11px" }}>{p.currency} {p.price}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Selection summary */}
      {(selectedService || selectedSmile) && (
        <div style={{ ...card, padding: "12px 16px", display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "hsl(210,40%,80%)", flexWrap: "wrap" }}>
          <span style={{ color: selectedService ? "#4ade80" : "hsl(220,10%,40%)" }}>
            {selectedService ? `CMS: ${selectedService.name}` : "No CMS product selected"}
          </span>
          <ArrowRight size={13} color="hsl(220,10%,40%)" />
          <span style={{ color: selectedSmile ? "#4ade80" : "hsl(220,10%,40%)" }}>
            {selectedSmile ? `Smile: ${selectedSmile.name}` : "No Smile.one product selected"}
          </span>
        </div>
      )}

      {/* Existing mappings table */}
      <div style={{ ...card, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid hsl(220,15%,13%)" }}>
          <p style={sectionTitle}>Mapped Products</p>
        </div>
        {mappings.length === 0 ? (
          <div style={{ padding: "24px 16px", textAlign: "center", color: "hsl(220,10%,40%)", fontSize: "12px" }}>
            No product mappings yet. Create one using the panel above.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid hsl(220,15%,13%)" }}>
                  {["Game", "Region", "CMS Product", "Smile.one Product", "Actions"].map((h) => (
                    <th key={h} style={{ padding: "8px 14px", textAlign: "left", color: "hsl(220,10%,50%)", fontWeight: 600, fontSize: "11px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mappings.map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid hsl(220,15%,11%)" }}>
                    <td style={{ padding: "10px 14px", color: "hsl(210,40%,85%)" }}>{m.gameSlug}</td>
                    <td style={{ padding: "10px 14px", color: "hsl(220,10%,60%)" }}>{m.region}</td>
                    <td style={{ padding: "10px 14px", color: "hsl(210,40%,85%)" }}>{m.cmsProductName ?? m.cmsProductId}</td>
                    <td style={{ padding: "10px 14px", color: "hsl(210,40%,85%)" }}>{m.smileProductName ?? m.smileProductId}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <button
                        data-testid={`button-delete-mapping-${m.id}`}
                        onClick={() => deleteMutation.mutate(m.id)}
                        disabled={deleteMutation.isPending}
                        style={{
                          background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)",
                          color: "#f87171", borderRadius: "5px", padding: "3px 8px", cursor: "pointer",
                          fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px",
                        }}
                      >
                        <Trash2 size={11} /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SmileOnePage() {
  const [tab, setTab] = useState<"config" | "mapping">("config");

  return (
    <AdminLayout title="Smile.one Integration">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ fontSize: "16px", fontWeight: 700, color: "hsl(210,40%,95%)", margin: 0 }}>
              Smile.one Integration
            </h2>
            <p style={{ fontSize: "12px", color: "hsl(220,10%,50%)", marginTop: "3px" }}>
              Configure API credentials, define game input fields, and map products.
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: "4px", background: "hsl(220,20%,9%)", padding: "4px", borderRadius: "8px", width: "fit-content", border: "1px solid hsl(220,15%,13%)" }}>
          <button data-testid="tab-config" style={tabBtn(tab === "config")} onClick={() => setTab("config")}>Configuration</button>
          <button data-testid="tab-mapping" style={tabBtn(tab === "mapping")} onClick={() => setTab("mapping")}>Product Mapping</button>
        </div>

        {/* Tab content */}
        {tab === "config" && <ConfigTab />}
        {tab === "mapping" && <MappingTab />}
      </div>
    </AdminLayout>
  );
}
