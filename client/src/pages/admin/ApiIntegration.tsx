import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plug, CheckCircle, XCircle, Settings, Zap,
  RefreshCw, Trash2, Plus, Package, Save, Smile,
  Wifi, Loader2, Link2, ArrowRight, ShieldCheck,
} from "lucide-react";
import { SiGoogle, SiFacebook, SiDiscord } from "react-icons/si";
import AdminLayout, { useMobile } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import { card, btnPrimary, Modal } from "@/components/admin/shared";
import { useAuthStore } from "@/lib/store/authstore";
import type { Plugin, Service, BusanMapping, Game, SmileOneConfig, SmileOneMapping } from "@shared/schema";

// ─── Shared Styles ────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "7px 10px", background: "hsl(220, 20%, 11%)",
  border: "1px solid hsl(220, 15%, 18%)", borderRadius: "6px", color: "hsl(210,40%,92%)",
  fontSize: "13px", outline: "none", boxSizing: "border-box",
};
const selectStyle: React.CSSProperties = {
  ...inputStyle, appearance: "none", cursor: "pointer",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
};
const labelStyle: React.CSSProperties = {
  fontSize: "11px", fontWeight: 600, color: "hsl(220,10%,55%)", marginBottom: "4px",
  display: "block", textTransform: "uppercase", letterSpacing: "0.04em",
};
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
const innerCard: React.CSSProperties = {
  background: "hsl(220, 20%, 7%)",
  border: "1px solid hsl(220, 15%, 13%)",
  borderRadius: "8px",
  padding: "16px",
};

// ─── CURRENCIES ───────────────────────────────────────────────────────────────
const CURRENCIES = [
  { value: "IDR", label: "IDR — Indonesian Rupiah" },
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "MYR", label: "MYR — Malaysian Ringgit" },
  { value: "PHP", label: "PHP — Philippine Peso" },
  { value: "THB", label: "THB — Thai Baht" },
  { value: "VND", label: "VND — Vietnamese Dong" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
];

// ─── Service Integration Definitions ─────────────────────────────────────────
interface ServiceDef {
  slug: string;
  name: string;
  note: string;
  fields: { key: string; label: string; placeholder?: string }[];
}

const SERVICES: ServiceDef[] = [
  {
    slug: "smtp-email",
    name: "SMTP Email Service",
    note: "Used for transactional emails and notifications",
    fields: [
      { key: "SMTP_HOST", label: "SMTP Host", placeholder: "smtp.example.com" },
      { key: "SMTP_PORT", label: "SMTP Port", placeholder: "587" },
      { key: "SMTP_USER", label: "SMTP Username", placeholder: "user@example.com" },
      { key: "SMTP_PASS", label: "SMTP Password", placeholder: "••••••••" },
      { key: "SMTP_FROM_EMAIL", label: "From Email Address", placeholder: "noreply@example.com" },
      { key: "SMTP_FROM_NAME", label: "From Name", placeholder: "Nexcoin Support" },
    ],
  },
  {
    slug: "sms-otp",
    name: "SMS / OTP Provider",
    note: "Used for OTP verification and SMS alerts",
    fields: [
      { key: "SMS_API_KEY", label: "API Key", placeholder: "your-api-key" },
      { key: "SMS_SENDER_ID", label: "Sender ID", placeholder: "NEXCOIN" },
    ],
  },
  {
    slug: "game-api",
    name: "Game Data API",
    note: "Used for live game data and player lookups",
    fields: [
      { key: "GAME_API_KEY", label: "API Key", placeholder: "your-game-api-key" },
      { key: "GAME_API_URL", label: "API Base URL", placeholder: "https://api.gamedata.com" },
    ],
  },
  {
    slug: "push-notifications",
    name: "Push Notifications (FCM)",
    note: "Used for push alerts on mobile and web",
    fields: [
      { key: "FCM_SERVER_KEY", label: "FCM Server Key", placeholder: "AAAA..." },
      { key: "FCM_PROJECT_ID", label: "FCM Project ID", placeholder: "my-firebase-project" },
    ],
  },
  {
    slug: "analytics",
    name: "Analytics",
    note: "Used for tracking visits and conversions",
    fields: [{ key: "ANALYTICS_ID", label: "Analytics ID", placeholder: "G-XXXXXXXXXX or UA-XXXXXXXX" }],
  },
  {
    slug: "webhook",
    name: "Webhook Integration",
    note: "Used to push events to external systems",
    fields: [
      { key: "WEBHOOK_SECRET", label: "Webhook Secret", placeholder: "your-webhook-secret" },
      { key: "WEBHOOK_URL", label: "Webhook URL", placeholder: "https://your-server.com/hook" },
    ],
  },
];

// ─── Configure Modal (for standard services) ──────────────────────────────────
function ConfigureModal({
  service, plugin, onClose,
}: { service: ServiceDef; plugin: Plugin | undefined; onClose: () => void }) {
  const qc = useQueryClient();
  const existingConfig = (() => { try { return JSON.parse(plugin?.config ?? "{}"); } catch { return {}; } })();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    service.fields.forEach((f) => { init[f.key] = existingConfig[f.key] ?? ""; });
    return init;
  });

  const saveMut = useMutation({
    mutationFn: () =>
      adminApi.put(`/plugins/${service.slug}`, {
        name: service.name, description: service.note,
        category: "integration", isEnabled: true, config: JSON.stringify(values),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/plugins"] }); onClose(); },
  });

  return (
    <Modal title={`Configure: ${service.name}`} onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p style={{ fontSize: "12px", color: "hsl(220,10%,45%)", margin: 0 }}>
          {service.note}. Credentials are stored in the database.
        </p>
        {service.fields.map((f) => (
          <div key={f.key}>
            <label style={labelStyle}>{f.label}</label>
            <input style={inputStyle} type="text" value={values[f.key]}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder ?? ""} autoComplete="off" />
          </div>
        ))}
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
          <button onClick={onClose}
            style={{ padding: "7px 14px", borderRadius: "6px", background: "hsl(220,15%,14%)", border: "1px solid hsl(220,15%,18%)", color: "hsl(220,10%,55%)", fontSize: "12px", cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={() => saveMut.mutate()} style={{ ...btnPrimary, opacity: saveMut.isPending ? 0.7 : 1 }} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Busan Types ──────────────────────────────────────────────────────────────
interface BusanConfig { id?: string; apiToken?: string; apiBaseUrl?: string; currency?: string; isActive?: boolean; }
interface BusanProduct { id: string; name: string; price: number; priceRaw?: string; currency: string; category?: string; }

// ─── Busan Config Tab ─────────────────────────────────────────────────────────
function BusanConfigTab() {
  const qc = useQueryClient();
  const [apiToken, setApiToken] = useState("");
  const [apiBaseUrl, setApiBaseUrl] = useState("https://1gamestopup.com/api/v1");
  const [currency, setCurrency] = useState("IDR");
  const [saved, setSaved] = useState(false);
  const [balanceData, setBalanceData] = useState<{ balance: number; currency: string } | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState("");

  const { data: configData } = useQuery<BusanConfig | null>({
    queryKey: ["/api/admin/busan/config"],
    queryFn: () => adminApi.get("/busan/config"),
  });

  useEffect(() => {
    if (configData) {
      setApiToken(configData.apiToken ?? "");
      setApiBaseUrl(configData.apiBaseUrl ?? "https://1gamestopup.com/api/v1");
      setCurrency(configData.currency ?? "IDR");
    }
  }, [configData]);

  const isDirty = useMemo(() => {
    if (!configData) return true; // Not yet saved
    return (
      apiToken !== (configData.apiToken ?? "") ||
      apiBaseUrl !== (configData.apiBaseUrl ?? "https://1gamestopup.com/api/v1") ||
      currency !== (configData.currency ?? "IDR")
    );
  }, [apiToken, apiBaseUrl, currency, configData]);

  const saveMut = useMutation({
    mutationFn: () => adminApi.post("/busan/config", { apiToken, apiBaseUrl, currency, isActive: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/busan/config"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  async function checkBalance() {
    setBalanceLoading(true); setBalanceError(""); setBalanceData(null);
    try {
      const data = await adminApi.get("/busan/balance");
      setBalanceData({ balance: data.balance, currency: data.currency });
    } catch (e: any) {
      setBalanceError(e.message || "Failed to fetch balance");
    } finally { setBalanceLoading(false); }
  }

  const isConfigured = Boolean(configData?.apiToken);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* API Credentials */}
      <div style={innerCard}>
        <p style={sectionTitle}>API Credentials</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={labelStyle}>API Base URL</label>
            <input style={inputStyle} type="url" value={apiBaseUrl}
              onChange={e => setApiBaseUrl(e.target.value)}
              placeholder="e.g. https://busangame.com/api or https://api.yourdomain.com/v1"
              data-testid="input-busan-api-base-url" />
            <p style={{ fontSize: "11px", color: "hsl(220,10%,38%)", marginTop: "5px" }}>
              The base URL for the Busan API (without trailing slash). Correct this if you see HTML errors.
            </p>
          </div>
          <div>
            <label style={labelStyle}>API Key <span style={{ fontWeight: 400, color: "hsl(220,10%,45%)" }}>(x-api-key header)</span></label>
            <input style={inputStyle} type="password" value={apiToken}
              onChange={e => setApiToken(e.target.value)}
              placeholder="Enter your 1GameStopUp API key" autoComplete="off"
              data-testid="input-busan-api-token" />
            <p style={{ fontSize: "11px", color: "hsl(220,10%,38%)", marginTop: "5px" }}>
              Sent as the <code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 4px", borderRadius: "3px" }}>x-api-key</code> header. Never exposed to the frontend.
            </p>
          </div>
          <div>
            <label style={labelStyle}>Default Currency</label>
            <select style={selectStyle} value={currency} onChange={e => setCurrency(e.target.value)}
              data-testid="select-busan-currency">
              {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            {isDirty && (
              <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
                style={{ ...btnPrimary, display: "inline-flex", alignItems: "center", gap: "6px", opacity: saveMut.isPending ? 0.7 : 1 }}
                data-testid="button-save-busan-config">
                <Save size={13} />
                {saveMut.isPending ? "Saving..." : "Save Configuration"}
              </button>
            )}
            {saved && <span style={{ fontSize: "12px", color: "hsl(142,71%,52%)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <CheckCircle size={13} /> Configuration saved
            </span>}
            {!isDirty && !saved && (
              <span style={{ fontSize: "12px", color: "hsl(220,10%,42%)" }}>No unsaved changes</span>
            )}
          </div>
        </div>
      </div>

      {/* Balance Check */}
      <div style={innerCard}>
        <p style={sectionTitle}>Account Balance</p>
        <p style={{ fontSize: "12px", color: "hsl(220,10%,45%)", marginBottom: "14px", lineHeight: 1.6 }}>
          Verify your Busan API balance before processing orders.
        </p>
        {balanceData && (
          <div style={{ background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "8px", padding: "16px", textAlign: "center", marginBottom: "14px" }}>
            <div style={{ fontSize: "26px", fontWeight: 800, color: "hsl(142,71%,55%)", fontFamily: "monospace" }}>
              {balanceData.currency} {balanceData.balance.toLocaleString()}
            </div>
            <div style={{ fontSize: "11px", color: "hsl(142,71%,40%)", marginTop: "3px" }}>Available Balance</div>
          </div>
        )}
        {balanceError && (
          <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px", padding: "10px 14px", fontSize: "12px", color: "hsl(0,75%,65%)", marginBottom: "14px" }}>
            {balanceError}
          </div>
        )}
        <button onClick={checkBalance} disabled={balanceLoading || !isConfigured}
          style={{
            padding: "7px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
            cursor: isConfigured ? "pointer" : "not-allowed",
            border: "1px solid rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.08)",
            color: "hsl(142,71%,55%)", display: "inline-flex", alignItems: "center", gap: "6px",
            opacity: (!isConfigured || balanceLoading) ? 0.5 : 1,
          }}
          data-testid="button-check-balance">
          <RefreshCw size={12} style={{ animation: balanceLoading ? "spin 1s linear infinite" : "none" }} />
          {balanceLoading ? "Checking..." : "Check Balance"}
        </button>
        {!isConfigured && (
          <p style={{ fontSize: "11px", color: "hsl(220,10%,38%)", marginTop: "8px" }}>Save your API token first to check balance.</p>
        )}
      </div>
    </div>
  );
}

// ─── Busan Mapping Tab ────────────────────────────────────────────────────────
function BusanMappingTab() {
  const qc = useQueryClient();
  const isMobile = useMobile(640);

  // Left (CMS) side state
  const [selectedCmsProduct, setSelectedCmsProduct] = useState("");

  // Right (Busan) side state
  const [selectedBusanProduct, setSelectedBusanProduct] = useState("");
  const [manualBusanId, setManualBusanId] = useState("");
  const [busanProducts, setBusanProducts] = useState<BusanProduct[]>([]);
  const [fetchingProducts, setFetchingProducts] = useState(false);
  const [fetchError, setFetchError] = useState("");


  const { data: configData } = useQuery<BusanConfig | null>({
    queryKey: ["/api/admin/busan/config"],
    queryFn: () => adminApi.get("/busan/config"),
  });
  const { data: games = [] } = useQuery<Game[]>({
    queryKey: ["/api/admin/games"],
    queryFn: () => adminApi.get("/games"),
  });
  const { data: cmsProducts = [] } = useQuery<Service[]>({
    queryKey: ["/api/admin/services"],
    queryFn: () => adminApi.get("/services"),
  });
  const { data: mappings = [], refetch: refetchMappings } = useQuery<BusanMapping[]>({
    queryKey: ["/api/admin/busan/mappings"],
    queryFn: () => adminApi.get("/busan/mappings"),
  });

  const isConfigured = Boolean(configData?.apiToken);

  async function fetchBusanProducts() {
    setFetchingProducts(true); setFetchError(""); setBusanProducts([]);
    try {
      const data = await adminApi.get("/busan/products");
      setBusanProducts(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setFetchError(e.message || "Failed to fetch Busan products");
    } finally { setFetchingProducts(false); }
  }

  // Auto-fetch Busan products when tab mounts and API is configured
  useEffect(() => {
    if (isConfigured) fetchBusanProducts();
  }, [isConfigured]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build a gameId → game name map for display
  const gameNameMap = Object.fromEntries(games.map(g => [g.id, g.name]));

  const effectiveBusanId = busanProducts.length > 0 ? selectedBusanProduct : manualBusanId;

  const addMappingMut = useMutation({
    mutationFn: () => {
      const cmsProduct = cmsProducts.find(p => p.id === selectedCmsProduct);
      const busanProduct = busanProducts.find(p => p.id === selectedBusanProduct);
      return adminApi.post("/busan/mappings", {
        cmsProductId: selectedCmsProduct,
        cmsProductName: cmsProduct?.name ?? "",
        busanProductId: effectiveBusanId,
        busanProductName: busanProduct?.name ?? effectiveBusanId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/busan/mappings"] });
      refetchMappings();
      setSelectedCmsProduct(""); setSelectedBusanProduct(""); setManualBusanId("");
    },
  });

  const deleteMappingMut = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/busan/mappings/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/busan/mappings"] }); refetchMappings(); },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {!isConfigured && (
        <div style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", borderRadius: "8px", padding: "12px 16px", fontSize: "12px", color: "hsl(45,93%,65%)", display: "flex", alignItems: "center", gap: "8px" }}>
          <Zap size={14} />
          Configure and save your Busan API token in the Configuration tab first.
        </div>
      )}

      {/* Two-column mapping builder */}
      <div style={innerCard}>
        <p style={sectionTitle}>Add Product Mapping</p>

        {/* Even two-column picker */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr auto 1fr", gap: isMobile ? "12px" : "16px", alignItems: "start" }}>

          {/* ── LEFT: CMS Side ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "hsl(210,40%,72%)", paddingBottom: "8px", borderBottom: "1px solid hsl(220,15%,16%)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              CMS Product
            </div>
            <div>
              <label style={labelStyle}>Select Product</label>
              <select style={selectStyle} value={selectedCmsProduct} onChange={e => setSelectedCmsProduct(e.target.value)}
                data-testid="select-cms-product">
                <option value="">— Choose product —</option>
                {cmsProducts.map(p => {
                  const gameName = gameNameMap[p.gameId] ?? "Unknown Game";
                  return (
                    <option key={p.id} value={p.id}>
                      {gameName} — {p.name}{p.finalPrice ? ` (${p.currency} ${p.finalPrice})` : ""}
                    </option>
                  );
                })}
              </select>
              {cmsProducts.length === 0 && (
                <p style={{ fontSize: "11px", color: "hsl(220,10%,38%)", marginTop: "5px" }}>
                  No services found. Add them in the Services section.
                </p>
              )}
            </div>
          </div>

          {/* ── Divider Arrow ── */}
          {!isMobile && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", paddingTop: "30px", color: "hsl(258,80%,65%)", fontSize: "18px", flexShrink: 0 }}>
              →
            </div>
          )}

          {/* ── RIGHT: Busan Side ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", paddingBottom: "8px", borderBottom: "1px solid hsl(220,15%,16%)" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "hsl(210,40%,72%)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Busan Product</span>
              {fetchingProducts && (
                <span style={{ fontSize: "11px", color: "hsl(258,80%,70%)", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  <RefreshCw size={10} style={{ animation: "spin 1s linear infinite" }} /> Loading…
                </span>
              )}
              {!fetchingProducts && busanProducts.length > 0 && (
                <button onClick={fetchBusanProducts} disabled={fetchingProducts || !isConfigured}
                  style={{
                    padding: "3px 8px", borderRadius: "5px", fontSize: "11px", fontWeight: 600, cursor: "pointer",
                    border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.1)", color: "#a78bfa",
                    display: "inline-flex", alignItems: "center", gap: "4px",
                  }}
                  data-testid="button-refresh-busan-products">
                  <RefreshCw size={10} /> Refresh
                </button>
              )}
            </div>
            <div>
              <label style={labelStyle}>Select Product</label>
              {fetchError ? (
                <div>
                  <input style={inputStyle} type="text" value={manualBusanId} onChange={e => setManualBusanId(e.target.value)}
                    placeholder="Enter Busan Product ID manually"
                    data-testid="input-busan-product-id" />
                  <p style={{ fontSize: "11px", color: "hsl(0,75%,65%)", marginTop: "5px" }}>{fetchError}</p>
                  <button onClick={fetchBusanProducts} disabled={!isConfigured}
                    style={{ marginTop: "6px", padding: "4px 10px", borderRadius: "5px", fontSize: "11px", border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.1)", color: "#a78bfa", cursor: "pointer" }}>
                    Retry
                  </button>
                </div>
              ) : (
                <select style={selectStyle} value={selectedBusanProduct} onChange={e => setSelectedBusanProduct(e.target.value)}
                  disabled={fetchingProducts}
                  data-testid="select-busan-product">
                  <option value="">
                    {fetchingProducts ? "Loading products..." : busanProducts.length === 0 ? "No products loaded yet" : "— Choose product —"}
                  </option>
                  {busanProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.priceRaw ?? `${p.currency} ${p.price}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Add button */}
        <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid hsl(220,15%,16%)", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }}>
          <button onClick={() => addMappingMut.mutate()}
            disabled={!selectedCmsProduct || !effectiveBusanId || addMappingMut.isPending}
            style={{
              ...btnPrimary, display: "inline-flex", alignItems: "center", gap: "6px",
              opacity: (!selectedCmsProduct || !effectiveBusanId || addMappingMut.isPending) ? 0.5 : 1,
            }}
            data-testid="button-add-mapping">
            <Plus size={13} />
            {addMappingMut.isPending ? "Saving..." : "Add Mapping"}
          </button>
        </div>
      </div>

      {/* Mapped Products Table */}
      <div style={{ ...innerCard, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid hsl(220,15%,13%)" }}>
          <p style={{ ...sectionTitle, marginBottom: 0 }}>
            Mapped Products{mappings.length > 0 && <span style={{ color: "hsl(258,80%,70%)" }}> ({mappings.length})</span>}
          </p>
        </div>
        {mappings.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "hsl(220,10%,40%)", fontSize: "12px" }}>
            <Package size={28} style={{ display: "block", margin: "0 auto 10px", color: "hsl(220,10%,28%)" }} />
            No mappings yet. Use the form above to add your first product mapping.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid hsl(220,15%,13%)" }}>
                  {["CMS Product", "Busan Product ID", "Actions"].map(h => (
                    <th key={h} style={{ padding: "8px 14px", textAlign: "left", color: "hsl(220,10%,50%)", fontWeight: 600, fontSize: "11px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mappings.map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid hsl(220,15%,11%)" }}>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontWeight: 500, color: "hsl(210,40%,85%)" }}>{m.cmsProductName || m.cmsProductId}</div>
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontFamily: "monospace", fontSize: "11px", color: "hsl(258,80%,72%)", background: "rgba(124,58,237,0.08)", padding: "2px 7px", borderRadius: "4px", display: "inline-block" }}>
                        {m.busanProductId}
                      </div>
                      {m.busanProductName && <div style={{ fontSize: "10px", color: "hsl(220,10%,45%)", marginTop: "2px" }}>{m.busanProductName}</div>}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => deleteMappingMut.mutate(m.id)} disabled={deleteMappingMut.isPending}
                        style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", borderRadius: "5px", padding: "3px 8px", cursor: "pointer", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        data-testid={`button-delete-mapping-${m.id}`}>
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

// ─── Busan Modal ──────────────────────────────────────────────────────────────
function BusanModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"config" | "mapping">("config");
  return (
    <Modal title="Busan Integration" onClose={onClose} wide>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Tab bar */}
        <div style={{ display: "flex", gap: "4px", background: "hsl(220,20%,9%)", padding: "4px", borderRadius: "8px", width: "fit-content", border: "1px solid hsl(220,15%,13%)" }}>
          <button data-testid="tab-busan-config" style={tabBtn(tab === "config")} onClick={() => setTab("config")}>
            Configuration
          </button>
          <button data-testid="tab-busan-mapping" style={tabBtn(tab === "mapping")} onClick={() => setTab("mapping")}>
            Product Mapping
          </button>
        </div>
        {tab === "config" && <BusanConfigTab />}
        {tab === "mapping" && <BusanMappingTab />}
      </div>
    </Modal>
  );
}

// ─── Smile.one Types ──────────────────────────────────────────────────────────
interface SmileProduct { product_id: string; name: string; price: number; currency: string; }

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

// ─── Smile.one Config Tab ─────────────────────────────────────────────────────
function SmileOneConfigTab() {
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

  const isDirty = useMemo(() => {
    if (!config) return true;
    return (
      form.uid !== (config.uid ?? "") ||
      form.apiKey !== (config.apiKey ?? "") ||
      form.licenseKey !== (config.licenseKey ?? "") ||
      form.region !== (config.region ?? "global") ||
      form.email !== (config.email ?? "") ||
      form.isActive !== (config.isActive ?? true)
    );
  }, [form, config]);

  const saveMutation = useMutation({
    mutationFn: () => adminApi.post("/smileone/config", form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/smileone/config"] }),
  });

  async function testConnection() {
    setTesting(true); setTestStatus(null);
    try {
      const res = await fetch("/api/admin/smileone/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-role": user?.role ?? "super_admin" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setTestStatus({ ok: data.success, message: data.message, balance: data.balance });
    } catch { setTestStatus({ ok: false, message: "Connection failed" }); }
    finally { setTesting(false); }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={innerCard}>
        <p style={sectionTitle}>API Credentials</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={labelStyle}>UID</label>
            <input data-testid="input-smileone-uid" style={inputStyle} value={form.uid} onChange={set("uid")} placeholder="Your Smile.one UID" />
          </div>
          <div>
            <label style={labelStyle}>API Key</label>
            <input data-testid="input-smileone-apikey" type="password" style={inputStyle} value={form.apiKey} onChange={set("apiKey")} placeholder="••••••••" />
          </div>
          <div>
            <label style={labelStyle}>License Key</label>
            <input data-testid="input-smileone-licensekey" type="password" style={inputStyle} value={form.licenseKey} onChange={set("licenseKey")} placeholder="••••••••" />
          </div>
          <div>
            <label style={labelStyle}>Email</label>
            <input data-testid="input-smileone-email" style={inputStyle} value={form.email} onChange={set("email")} placeholder="your@email.com" />
          </div>
          <div>
            <label style={labelStyle}>Region</label>
            <select data-testid="select-smileone-region" style={selectStyle} value={form.region} onChange={set("region")}>
              {REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "12px", color: "hsl(210,40%,80%)" }}>
            <input data-testid="toggle-smileone-active" type="checkbox" checked={form.isActive}
              onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))}
              style={{ cursor: "pointer", width: "14px", height: "14px", accentColor: "hsl(258,90%,66%)" }} />
            Enable Smile.one
          </label>
          {testStatus && (
            <div style={{
              padding: "10px 14px", borderRadius: "6px", fontSize: "12px",
              background: testStatus.ok ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
              border: `1px solid ${testStatus.ok ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`,
              color: testStatus.ok ? "#4ade80" : "#f87171",
              display: "flex", alignItems: "center", gap: "8px",
            }}>
              {testStatus.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {testStatus.message}{testStatus.balance != null ? ` — Balance: ${testStatus.balance}` : ""}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <button data-testid="button-test-smileone-connection"
              style={{ ...btnPrimary, background: "hsl(220,20%,16%)", border: "1px solid hsl(220,15%,22%)" }}
              onClick={testConnection} disabled={testing}>
              {testing ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Wifi size={13} />}
              Test Connection
            </button>
            {isDirty && (
              <button data-testid="button-save-smileone-config" style={{ ...btnPrimary, opacity: saveMutation.isPending ? 0.7 : 1 }}
                onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />}
                Save Config
              </button>
            )}
            {!isDirty && (
              <span style={{ fontSize: "12px", color: "hsl(220,10%,42%)" }}>No unsaved changes</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Smile.one Mapping Tab ────────────────────────────────────────────────────
function SmileOneMappingTab() {
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

  const [leftGame, setLeftGame] = useState("");
  const [selectedService, setSelectedService] = useState<{ id: string; name: string; price: string } | null>(null);
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
    setFetchingSmile(true); setSmileProducts([]);
    try {
      const res = await fetch(`/api/smileone/products?game=${encodeURIComponent(rightGame)}&region=${rightRegion}`, {
        headers: { "X-Username": user?.username ?? "", "x-admin-role": user?.role ?? "super_admin" },
      });
      const data = await res.json();
      setSmileProducts(data.success && Array.isArray(data.products) ? data.products : []);
    } catch { setSmileProducts([]); }
    finally { setFetchingSmile(false); }
  }

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedService || !selectedSmile) throw new Error("Select both products first");
      const gameSlug = games.find(g => g.id === leftGame)?.slug ?? rightGame;
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
      setSelectedService(null); setSelectedSmile(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/smileone/mappings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/smileone/mappings"] }),
  });

  const canMap = selectedService && selectedSmile;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={innerCard}>
        <p style={sectionTitle}>Add Product Mapping</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "12px", alignItems: "start" }}>
          {/* Left – CMS */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "hsl(210,40%,75%)", paddingBottom: "6px", borderBottom: "1px solid hsl(220,15%,16%)", display: "block" }}>CMS Product</span>
            <div>
              <label style={labelStyle}>Select Game</label>
              <select data-testid="select-smileone-cms-game" style={selectStyle} value={leftGame}
                onChange={e => { setLeftGame(e.target.value); setSelectedService(null); }}>
                <option value="">— Choose a game —</option>
                {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            {leftGame && (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "220px", overflowY: "auto" }}>
                {loadingServices && <p style={{ fontSize: "12px", color: "hsl(220,10%,50%)" }}>Loading...</p>}
                {!loadingServices && services.length === 0 && (
                  <p style={{ fontSize: "12px", color: "hsl(220,10%,40%)" }}>No services for this game.</p>
                )}
                {services.map(svc => (
                  <div key={svc.id} data-testid={`smileone-cms-product-${svc.id}`}
                    onClick={() => setSelectedService({ id: svc.id, name: svc.name, price: String(svc.finalPrice) })}
                    style={{
                      padding: "7px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px",
                      background: selectedService?.id === svc.id ? "rgba(124,58,237,0.15)" : "hsl(220,20%,11%)",
                      border: selectedService?.id === svc.id ? "1px solid rgba(124,58,237,0.4)" : "1px solid hsl(220,15%,18%)",
                      color: "hsl(210,40%,88%)", display: "flex", justifyContent: "space-between",
                    }}>
                    <span>{svc.name}</span>
                    <span style={{ color: "hsl(220,10%,55%)", fontSize: "11px" }}>${svc.finalPrice}</span>
                  </div>
                ))}
              </div>
            )}
            {!leftGame && <p style={{ fontSize: "12px", color: "hsl(220,10%,40%)" }}>Select a game to see its products.</p>}
          </div>

          {/* Arrow + Map */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", paddingTop: "50px" }}>
            <ArrowRight size={18} color="hsl(220,10%,40%)" />
            <button data-testid="button-smileone-map"
              style={{ ...btnPrimary, opacity: canMap ? 1 : 0.4, cursor: canMap ? "pointer" : "not-allowed", flexDirection: "column", gap: "3px" }}
              onClick={() => canMap && createMutation.mutate()} disabled={!canMap || createMutation.isPending}>
              {createMutation.isPending ? <Loader2 size={12} /> : <Link2 size={12} />}
              MAP
            </button>
          </div>

          {/* Right – Smile.one */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "hsl(210,40%,75%)", paddingBottom: "6px", borderBottom: "1px solid hsl(220,15%,16%)", display: "block" }}>Smile.one Products</span>
            <div>
              <label style={labelStyle}>Game Slug</label>
              <input data-testid="input-smileone-game-slug" style={inputStyle} value={rightGame}
                onChange={e => setRightGame(e.target.value)} placeholder="e.g. mobile-legends" />
            </div>
            <div>
              <label style={labelStyle}>Region</label>
              <select data-testid="select-smileone-region-map" style={selectStyle} value={rightRegion}
                onChange={e => setRightRegion(e.target.value)}>
                {REGIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <button data-testid="button-fetch-smileone-products"
              style={{ ...btnPrimary, background: "hsl(220,20%,14%)", border: "1px solid hsl(220,15%,20%)" }}
              onClick={fetchSmileProducts} disabled={!rightGame || fetchingSmile}>
              {fetchingSmile ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <RefreshCw size={12} />}
              Fetch Products
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "160px", overflowY: "auto" }}>
              {smileProducts.length === 0 && !fetchingSmile && (
                <p style={{ fontSize: "12px", color: "hsl(220,10%,40%)" }}>Enter game slug and fetch to see products.</p>
              )}
              {smileProducts.map(p => (
                <div key={p.product_id} data-testid={`smileone-product-${p.product_id}`}
                  onClick={() => setSelectedSmile(p)}
                  style={{
                    padding: "7px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px",
                    background: selectedSmile?.product_id === p.product_id ? "rgba(124,58,237,0.15)" : "hsl(220,20%,11%)",
                    border: selectedSmile?.product_id === p.product_id ? "1px solid rgba(124,58,237,0.4)" : "1px solid hsl(220,15%,18%)",
                    color: "hsl(210,40%,88%)", display: "flex", justifyContent: "space-between",
                  }}>
                  <span>{p.name}</span>
                  <span style={{ color: "hsl(220,10%,55%)", fontSize: "11px" }}>{p.currency} {p.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Selection summary */}
      {(selectedService || selectedSmile) && (
        <div style={{ ...innerCard, padding: "10px 14px", display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "hsl(210,40%,80%)", flexWrap: "wrap" }}>
          <span style={{ color: selectedService ? "#4ade80" : "hsl(220,10%,40%)" }}>
            {selectedService ? `CMS: ${selectedService.name}` : "No CMS product selected"}
          </span>
          <ArrowRight size={12} color="hsl(220,10%,40%)" />
          <span style={{ color: selectedSmile ? "#4ade80" : "hsl(220,10%,40%)" }}>
            {selectedSmile ? `Smile: ${selectedSmile.name}` : "No Smile.one product selected"}
          </span>
        </div>
      )}

      {/* Mappings table */}
      <div style={{ ...innerCard, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid hsl(220,15%,13%)" }}>
          <p style={{ ...sectionTitle, marginBottom: 0 }}>
            Mapped Products{mappings.length > 0 && <span style={{ color: "hsl(258,80%,70%)" }}> ({mappings.length})</span>}
          </p>
        </div>
        {mappings.length === 0 ? (
          <div style={{ padding: "24px 16px", textAlign: "center", color: "hsl(220,10%,40%)", fontSize: "12px" }}>
            No mappings yet. Use the form above to create your first mapping.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid hsl(220,15%,13%)" }}>
                  {["Game", "Region", "CMS Product", "Smile.one Product", "Actions"].map(h => (
                    <th key={h} style={{ padding: "8px 14px", textAlign: "left", color: "hsl(220,10%,50%)", fontWeight: 600, fontSize: "11px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mappings.map(m => (
                  <tr key={m.id} style={{ borderBottom: "1px solid hsl(220,15%,11%)" }}>
                    <td style={{ padding: "9px 14px", color: "hsl(210,40%,85%)" }}>{m.gameSlug}</td>
                    <td style={{ padding: "9px 14px", color: "hsl(220,10%,60%)" }}>{m.region}</td>
                    <td style={{ padding: "9px 14px", color: "hsl(210,40%,85%)" }}>{m.cmsProductName ?? m.cmsProductId}</td>
                    <td style={{ padding: "9px 14px", color: "hsl(210,40%,85%)" }}>{m.smileProductName ?? m.smileProductId}</td>
                    <td style={{ padding: "9px 14px" }}>
                      <button data-testid={`button-delete-smileone-mapping-${m.id}`}
                        onClick={() => deleteMutation.mutate(m.id)} disabled={deleteMutation.isPending}
                        style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171", borderRadius: "5px", padding: "3px 8px", cursor: "pointer", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
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

// ─── Smile.one Modal ──────────────────────────────────────────────────────────
function SmileOneModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"config" | "mapping">("config");
  return (
    <Modal title="Smile.one Integration" onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", gap: "4px", background: "hsl(220,20%,9%)", padding: "4px", borderRadius: "8px", width: "fit-content", border: "1px solid hsl(220,15%,13%)" }}>
          <button data-testid="tab-smileone-config" style={tabBtn(tab === "config")} onClick={() => setTab("config")}>Configuration</button>
          <button data-testid="tab-smileone-mapping" style={tabBtn(tab === "mapping")} onClick={() => setTab("mapping")}>Product Mapping</button>
        </div>
        {tab === "config" && <SmileOneConfigTab />}
        {tab === "mapping" && <SmileOneMappingTab />}
      </div>
    </Modal>
  );
}

// ─── Social Auth Modal ────────────────────────────────────────────────────────
interface ProviderSectionProps {
  slug: string;
  label: string;
  icon: React.ReactNode;
  accentColor: string;
  fields: { key: string; label: string; placeholder: string }[];
  plugins: Plugin[];
}

function ProviderSection({ slug, label, icon, accentColor, fields, plugins }: ProviderSectionProps) {
  const qc = useQueryClient();
  const plugin = plugins.find((p) => p.slug === slug);
  const existingConfig = (() => { try { return JSON.parse(plugin?.config ?? "{}"); } catch { return {}; } })();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    fields.forEach((f) => { init[f.key] = existingConfig[f.key] ?? ""; });
    return init;
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const cfg = (() => { try { return JSON.parse(plugin?.config ?? "{}"); } catch { return {}; } })();
    setValues(() => {
      const init: Record<string, string> = {};
      fields.forEach((f) => { init[f.key] = cfg[f.key] ?? ""; });
      return init;
    });
  }, [plugin]);

  const saveMut = useMutation({
    mutationFn: () => adminApi.put(`/plugins/${slug}`, { name: label, config: JSON.stringify(values) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/plugins"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const isConfigured = fields.every((f) => Boolean(values[f.key]));

  return (
    <div style={{ border: "1px solid hsl(220,15%,15%)", borderRadius: "8px", overflow: "hidden" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", background: "hsl(220,20%,8%)", gap: "10px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "30px", height: "30px", borderRadius: "6px", flexShrink: 0,
            background: isConfigured ? "rgba(74,222,128,0.08)" : "hsl(220,15%,13%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: accentColor,
          }}>
            {icon}
          </div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210,40%,90%)" }}>{label}</div>
            {isConfigured
              ? <div style={{ fontSize: "11px", color: "hsl(142,71%,48%)", display: "flex", alignItems: "center", gap: "3px", marginTop: "1px" }}>
                  <CheckCircle size={10} /> Configured
                </div>
              : <div style={{ fontSize: "11px", color: "hsl(220,10%,40%)", marginTop: "1px" }}>Not configured</div>
            }
          </div>
        </div>
      </div>
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px", background: "hsl(220,20%,7%)" }}>
        {fields.map((f) => (
          <div key={f.key}>
            <label style={labelStyle}>{f.label}</label>
            <input
              style={inputStyle}
              type="text"
              value={values[f.key]}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              autoComplete="off"
              data-testid={`input-${slug}-${f.key.toLowerCase()}`}
            />
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
          {saved && <span style={{ fontSize: "11px", color: "hsl(142,71%,48%)", alignSelf: "center", marginRight: "8px" }}>Saved</span>}
          <button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending}
            style={{ ...btnPrimary, opacity: saveMut.isPending ? 0.7 : 1 }}
            data-testid={`button-save-${slug}`}
          >
            {saveMut.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SocialAuthModal({ plugins, onClose }: { plugins: Plugin[]; onClose: () => void }) {
  return (
    <Modal title="Social Login Configuration" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <p style={{ fontSize: "12px", color: "hsl(220,10%,45%)", lineHeight: 1.6, margin: 0 }}>
          Configure OAuth credentials for each provider. Sign-in buttons appear on the login page once
          credentials are saved and "Allow Social Login" is enabled in the Control Panel.
        </p>
        <ProviderSection
          slug="social-auth-google"
          label="Google"
          icon={<SiGoogle size={14} />}
          accentColor="#EA4335"
          fields={[
            { key: "GOOGLE_CLIENT_ID", label: "Client ID", placeholder: "xxxx.apps.googleusercontent.com" },
            { key: "GOOGLE_CLIENT_SECRET", label: "Client Secret", placeholder: "GOCSPX-..." },
          ]}
          plugins={plugins}
        />
        <ProviderSection
          slug="social-auth-facebook"
          label="Facebook"
          icon={<SiFacebook size={14} />}
          accentColor="#1877F2"
          fields={[
            { key: "FACEBOOK_APP_ID", label: "App ID", placeholder: "1234567890" },
            { key: "FACEBOOK_APP_SECRET", label: "App Secret", placeholder: "abc123..." },
          ]}
          plugins={plugins}
        />
        <ProviderSection
          slug="social-auth-discord"
          label="Discord"
          icon={<SiDiscord size={14} />}
          accentColor="#5865F2"
          fields={[
            { key: "DISCORD_CLIENT_ID", label: "Client ID", placeholder: "1234567890123456789" },
            { key: "DISCORD_CLIENT_SECRET", label: "Client Secret", placeholder: "abcdefghijklmnopqrstuvwxyz" },
          ]}
          plugins={plugins}
        />
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ApiIntegration() {
  const [configuring, setConfiguring] = useState<ServiceDef | null>(null);
  const [busanOpen, setBusanOpen] = useState(false);
  const [smileOneOpen, setSmileOneOpen] = useState(false);
  const [socialAuthOpen, setSocialAuthOpen] = useState(false);

  const { data: plugins = [] } = useQuery<Plugin[]>({
    queryKey: ["/api/admin/plugins"],
    queryFn: () => adminApi.get("/plugins"),
  });

  const { data: busanConfig } = useQuery<BusanConfig | null>({
    queryKey: ["/api/admin/busan/config"],
    queryFn: () => adminApi.get("/busan/config"),
  });

  const { data: smileOneConfig } = useQuery<SmileOneConfig | null>({
    queryKey: ["/api/admin/smileone/config"],
    queryFn: () => adminApi.get("/smileone/config"),
  });

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const tryScroll = (attempts = 0) => {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.style.transition = "box-shadow 0.3s";
        el.style.boxShadow = "0 0 0 2px hsl(258,90%,66%)";
        setTimeout(() => { el.style.boxShadow = ""; }, 2000);
      } else if (attempts < 10) {
        setTimeout(() => tryScroll(attempts + 1), 150);
      }
    };
    tryScroll();
  }, []);

  const pluginMap = Object.fromEntries(plugins.map((p) => [p.slug, p]));

  function isConfigured(service: ServiceDef) {
    const p = pluginMap[service.slug];
    if (!p) return false;
    try {
      const config = JSON.parse(p.config ?? "{}");
      return service.fields.every((f) => Boolean(config[f.key]));
    } catch { return false; }
  }

  const busanConfigured = Boolean(busanConfig?.apiToken);
  const smileOneConfigured = Boolean(smileOneConfig?.apiKey);

  const socialAuthConfigured = (() => {
    const slugs = ["social-auth-google", "social-auth-facebook", "social-auth-discord"];
    return slugs.some((slug) => {
      const p = pluginMap[slug];
      if (!p) return false;
      try { const cfg = JSON.parse(p.config ?? "{}"); return Object.values(cfg).some(Boolean); }
      catch { return false; }
    });
  })();

  // Shared row renderer
  const renderRow = (
    icon: React.ReactNode,
    name: string,
    note: string,
    configured: boolean,
    onConfigure: () => void,
    testId: string,
    isLast: boolean,
  ) => (
    <div
      style={{
        display: "flex", alignItems: "center",
        padding: "14px 0", borderBottom: isLast ? "none" : "1px solid hsl(220, 15%, 12%)",
        gap: "12px", minWidth: 0,
      }}>
      <div style={{
        width: "36px", height: "36px", borderRadius: "6px", flexShrink: 0,
        background: configured ? "rgba(74,222,128,0.08)" : "hsl(220, 15%, 13%)",
        color: configured ? "hsl(142,71%,48%)" : "hsl(220, 10%, 40%)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "hsl(210, 40%, 85%)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
        <div style={{ fontSize: "11px", color: "hsl(220, 10%, 38%)", marginTop: "2px" }}>{note}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, marginLeft: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {configured
            ? <><CheckCircle size={12} color="hsl(142,71%,48%)" /><span style={{ fontSize: "11px", color: "hsl(142,71%,48%)" }}>Configured</span></>
            : <><XCircle size={12} color="hsl(220, 10%, 35%)" /><span style={{ fontSize: "11px", color: "hsl(220, 10%, 42%)" }}>Not set</span></>
          }
        </div>
        <button onClick={onConfigure}
          style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "5px", fontSize: "11px", fontWeight: 600, cursor: "pointer", border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.1)", color: "#a78bfa", whiteSpace: "nowrap", flexShrink: 0 }}
          data-testid={testId}>
          <Settings size={11} /> Configure
        </button>
      </div>
    </div>
  );

  return (
    <AdminLayout title="API Integration">
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        <div style={{ fontSize: "13px", color: "hsl(220,10%,45%)", lineHeight: 1.6 }}>
          Configure third-party integrations. Credentials are stored securely in the database.
          Payment gateway settings are managed in the{" "}
          <a href="/admin/payment-method" style={{ color: "hsl(258,90%,66%)", textDecoration: "none" }}>Payment Method</a> page.
        </div>

        {/* ── All Integrations ── */}
        <div style={{ ...card, padding: "0" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>Service Integrations</span>
            <p style={{ fontSize: "11px", color: "hsl(220,10%,42%)", margin: "4px 0 0" }}>
              Click Configure to add your API keys for each service
            </p>
          </div>
          <div style={{ padding: "0 20px" }}>
            {/* Standard services */}
            {SERVICES.map((svc) => (
              <div key={svc.slug} id={svc.slug}>
                {renderRow(
                  <Plug size={14} />,
                  svc.name,
                  svc.note,
                  isConfigured(svc),
                  () => setConfiguring(svc),
                  `button-configure-${svc.slug}`,
                  false,
                )}
              </div>
            ))}

            {/* Social Login row */}
            <div id="social-auth-google">
              {renderRow(
                <ShieldCheck size={14} />,
                "Social Login (Google / Facebook / Discord)",
                "Configure OAuth credentials for Google, Facebook, and Discord sign-in",
                socialAuthConfigured,
                () => setSocialAuthOpen(true),
                "button-configure-social-auth",
                false,
              )}
            </div>

            {/* Busan Integration row */}
            {renderRow(
              <Zap size={14} />,
              "Busan Integration",
              "Auto-fulfil game top-ups via 1GameStopUp after payment confirmation",
              busanConfigured,
              () => setBusanOpen(true),
              "button-configure-busan",
              false,
            )}

            {/* Smile.one Integration row */}
            {renderRow(
              <Smile size={14} />,
              "Smile.one Integration",
              "Auto-fulfil game top-ups via Smile.one after payment confirmation",
              smileOneConfigured,
              () => setSmileOneOpen(true),
              "button-configure-smileone",
              true,
            )}
          </div>
        </div>

      </div>

      {configuring && (
        <ConfigureModal service={configuring} plugin={pluginMap[configuring.slug]} onClose={() => setConfiguring(null)} />
      )}
      {busanOpen && <BusanModal onClose={() => setBusanOpen(false)} />}
      {smileOneOpen && <SmileOneModal onClose={() => setSmileOneOpen(false)} />}
      {socialAuthOpen && <SocialAuthModal plugins={plugins} onClose={() => setSocialAuthOpen(false)} />}
    </AdminLayout>
  );
}
