import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plug, CheckCircle, XCircle, Settings, Zap,
  RefreshCw, Trash2, Plus, Link2, DollarSign, Package,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import { card, btnPrimary, Modal } from "@/components/admin/shared";
import type { Plugin, Product, BusanMapping } from "@shared/schema";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "7px 10px", background: "hsl(220, 20%, 11%)",
  border: "1px solid hsl(220, 15%, 18%)", borderRadius: "6px", color: "hsl(210,40%,92%)",
  fontSize: "13px", outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: "11px", fontWeight: 600, color: "hsl(220,10%,55%)", marginBottom: "4px",
  display: "block", textTransform: "uppercase", letterSpacing: "0.04em",
};
const selectStyle: React.CSSProperties = {
  ...inputStyle, appearance: "none", cursor: "pointer",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23666'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
};
const sectionCard: React.CSSProperties = {
  ...card, padding: "0",
};
const sectionHeader: React.CSSProperties = {
  padding: "14px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)",
  display: "flex", alignItems: "center", gap: "10px",
};

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
    fields: [
      { key: "ANALYTICS_ID", label: "Analytics ID", placeholder: "G-XXXXXXXXXX or UA-XXXXXXXX" },
    ],
  },
  {
    slug: "social-auth",
    name: "Social Login (Google / Facebook)",
    note: "Required for Google and Facebook sign-in on the registration and login pages",
    fields: [
      { key: "GOOGLE_CLIENT_ID", label: "Google Client ID", placeholder: "xxxx.apps.googleusercontent.com" },
      { key: "GOOGLE_CLIENT_SECRET", label: "Google Client Secret", placeholder: "GOCSPX-..." },
      { key: "FACEBOOK_APP_ID", label: "Facebook App ID", placeholder: "1234567890" },
      { key: "FACEBOOK_APP_SECRET", label: "Facebook App Secret", placeholder: "abc123..." },
    ],
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
        name: service.name,
        description: service.note,
        category: "integration",
        isEnabled: true,
        config: JSON.stringify(values),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/plugins"] });
      onClose();
    },
  });

  return (
    <Modal title={`Configure: ${service.name}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p style={{ fontSize: "12px", color: "hsl(220,10%,45%)", margin: 0 }}>
          {service.note}. Credentials are stored in the database.
        </p>
        {service.fields.map((f) => (
          <div key={f.key}>
            <label style={labelStyle}>{f.label}</label>
            <input
              style={inputStyle}
              type="text"
              value={values[f.key]}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder ?? ""}
              autoComplete="off"
            />
          </div>
        ))}
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
          <button
            onClick={onClose}
            style={{ padding: "7px 14px", borderRadius: "6px", background: "hsl(220,15%,14%)", border: "1px solid hsl(220,15%,18%)", color: "hsl(220,10%,55%)", fontSize: "12px", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={() => saveMut.mutate()}
            style={{ ...btnPrimary, opacity: saveMut.isPending ? 0.7 : 1 }}
            disabled={saveMut.isPending}
          >
            {saveMut.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface BusanConfig {
  id?: string;
  apiToken?: string;
  currency?: string;
  isActive?: boolean;
}

interface BusanProduct {
  id: string;
  name: string;
  price: number;
  currency: string;
  category?: string;
}

function BusanSection() {
  const qc = useQueryClient();
  const [apiToken, setApiToken] = useState("");
  const [currency, setCurrency] = useState("IDR");
  const [configSaved, setConfigSaved] = useState(false);

  const [selectedCmsProduct, setSelectedCmsProduct] = useState("");
  const [selectedBusanProduct, setSelectedBusanProduct] = useState("");
  const [requiresZone, setRequiresZone] = useState(false);
  const [fetchingProducts, setFetchingProducts] = useState(false);
  const [busanProductsData, setBusanProductsData] = useState<BusanProduct[]>([]);
  const [busanProductsError, setBusanProductsError] = useState("");
  const [balanceData, setBalanceData] = useState<{ balance: number; currency: string } | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState("");

  const { data: configData } = useQuery<BusanConfig | null>({
    queryKey: ["/api/admin/busan/config"],
    queryFn: () => adminApi.get("/busan/config"),
  });

  const { data: cmsProducts = [] } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
    queryFn: () => adminApi.get("/products"),
  });

  const { data: mappings = [], refetch: refetchMappings } = useQuery<BusanMapping[]>({
    queryKey: ["/api/admin/busan/mappings"],
    queryFn: () => adminApi.get("/busan/mappings"),
  });

  useEffect(() => {
    if (configData) {
      setApiToken(configData.apiToken ?? "");
      setCurrency(configData.currency ?? "IDR");
    }
  }, [configData]);

  const saveConfigMut = useMutation({
    mutationFn: () =>
      adminApi.post("/busan/config", { apiToken, currency, isActive: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/busan/config"] });
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2500);
    },
  });

  async function checkBalance() {
    setBalanceLoading(true);
    setBalanceError("");
    setBalanceData(null);
    try {
      const data = await adminApi.get("/busan/balance");
      setBalanceData({ balance: data.balance, currency: data.currency });
    } catch (e: any) {
      setBalanceError(e.message || "Failed to fetch balance");
    } finally {
      setBalanceLoading(false);
    }
  }

  async function fetchBusanProducts() {
    setFetchingProducts(true);
    setBusanProductsError("");
    setBusanProductsData([]);
    try {
      const data = await adminApi.get("/busan/products");
      setBusanProductsData(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setBusanProductsError(e.message || "Failed to fetch Busan products");
    } finally {
      setFetchingProducts(false);
    }
  }

  const addMappingMut = useMutation({
    mutationFn: () => {
      const cmsProduct = cmsProducts.find(p => p.id === selectedCmsProduct);
      const busanProduct = busanProductsData.find(p => p.id === selectedBusanProduct);
      return adminApi.post("/busan/mappings", {
        cmsProductId: selectedCmsProduct,
        cmsProductName: cmsProduct?.title ?? "",
        busanProductId: selectedBusanProduct,
        busanProductName: busanProduct?.name ?? selectedBusanProduct,
        requiresZone,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/busan/mappings"] });
      refetchMappings();
      setSelectedCmsProduct("");
      setSelectedBusanProduct("");
      setRequiresZone(false);
    },
  });

  const deleteMappingMut = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/busan/mappings/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/busan/mappings"] });
      refetchMappings();
    },
  });

  const isConfigured = Boolean(configData?.apiToken);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Section Title */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(124,58,237,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Zap size={15} color="hsl(258,90%,66%)" />
        </div>
        <div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "hsl(210,40%,92%)" }}>Busan Game Top-up API</div>
          <div style={{ fontSize: "11px", color: "hsl(220,10%,42%)", marginTop: "1px" }}>
            Automatically fulfil game top-up orders via the Busan API after payment confirmation
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "4px" }}>
          {isConfigured ? (
            <><CheckCircle size={13} color="hsl(142,71%,48%)" /><span style={{ fontSize: "12px", color: "hsl(142,71%,48%)" }}>Configured</span></>
          ) : (
            <><XCircle size={13} color="hsl(220,10%,35%)" /><span style={{ fontSize: "12px", color: "hsl(220,10%,42%)" }}>Not configured</span></>
          )}
        </div>
      </div>

      {/* Top row: API Config + Balance */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        {/* API Config card */}
        <div style={sectionCard}>
          <div style={sectionHeader}>
            <Settings size={13} color="hsl(258,90%,66%)" />
            <span style={{ fontSize: "12px", fontWeight: 600, color: "hsl(210,40%,88%)" }}>API Configuration</span>
          </div>
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={labelStyle}>API Token</label>
              <input
                style={inputStyle}
                type="password"
                value={apiToken}
                onChange={e => setApiToken(e.target.value)}
                placeholder="Enter your Busan API token"
                autoComplete="off"
                data-testid="input-busan-api-token"
              />
            </div>
            <div>
              <label style={labelStyle}>Currency</label>
              <select
                style={selectStyle}
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                data-testid="select-busan-currency"
              >
                <option value="IDR">IDR — Indonesian Rupiah</option>
                <option value="MYR">MYR — Malaysian Ringgit</option>
                <option value="PHP">PHP — Philippine Peso</option>
                <option value="THB">THB — Thai Baht</option>
                <option value="VND">VND — Vietnamese Dong</option>
                <option value="USD">USD — US Dollar</option>
                <option value="SGD">SGD — Singapore Dollar</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => saveConfigMut.mutate()}
                disabled={saveConfigMut.isPending}
                style={{ ...btnPrimary, flex: 1, opacity: saveConfigMut.isPending ? 0.7 : 1 }}
                data-testid="button-save-busan-config"
              >
                {saveConfigMut.isPending ? "Saving..." : configSaved ? "Saved!" : "Save Configuration"}
              </button>
            </div>
          </div>
        </div>

        {/* Balance card */}
        <div style={sectionCard}>
          <div style={sectionHeader}>
            <DollarSign size={13} color="hsl(142,71%,48%)" />
            <span style={{ fontSize: "12px", fontWeight: 600, color: "hsl(210,40%,88%)" }}>Account Balance</span>
          </div>
          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <p style={{ fontSize: "12px", color: "hsl(220,10%,45%)", margin: 0, lineHeight: 1.5 }}>
              Check your current Busan API account balance. Ensure you have sufficient funds before processing orders.
            </p>
            {balanceData && (
              <div style={{
                background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.2)",
                borderRadius: "8px", padding: "14px 16px", textAlign: "center",
              }}>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "hsl(142,71%,55%)", fontFamily: "monospace" }}>
                  {balanceData.currency} {balanceData.balance.toLocaleString()}
                </div>
                <div style={{ fontSize: "11px", color: "hsl(142,71%,40%)", marginTop: "2px" }}>Available Balance</div>
              </div>
            )}
            {balanceError && (
              <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "6px", padding: "10px 12px", fontSize: "12px", color: "hsl(0,75%,65%)" }}>
                {balanceError}
              </div>
            )}
            <button
              onClick={checkBalance}
              disabled={balanceLoading || !isConfigured}
              style={{
                padding: "7px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: isConfigured ? "pointer" : "not-allowed",
                border: "1px solid rgba(74,222,128,0.3)", background: "rgba(74,222,128,0.08)", color: "hsl(142,71%,55%)",
                display: "inline-flex", alignItems: "center", gap: "6px", opacity: (!isConfigured || balanceLoading) ? 0.6 : 1,
              }}
              data-testid="button-check-balance"
            >
              <RefreshCw size={12} style={{ animation: balanceLoading ? "spin 1s linear infinite" : "none" }} />
              {balanceLoading ? "Checking..." : "Check Balance"}
            </button>
            {!isConfigured && (
              <p style={{ fontSize: "11px", color: "hsl(220,10%,38%)", margin: 0 }}>Save API configuration first to check balance.</p>
            )}
          </div>
        </div>
      </div>

      {/* Product Mapping Section */}
      <div style={sectionCard}>
        <div style={sectionHeader}>
          <Link2 size={13} color="hsl(258,90%,66%)" />
          <span style={{ fontSize: "12px", fontWeight: 600, color: "hsl(210,40%,88%)" }}>Product Mapping</span>
          <span style={{ marginLeft: "auto", fontSize: "11px", color: "hsl(220,10%,40%)" }}>
            Map your CMS products to Busan API products for automatic fulfilment
          </span>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Mapping form */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "12px", alignItems: "end" }}>
            <div>
              <label style={labelStyle}>CMS Product</label>
              <select
                style={selectStyle}
                value={selectedCmsProduct}
                onChange={e => setSelectedCmsProduct(e.target.value)}
                data-testid="select-cms-product"
              >
                <option value="">— Select CMS product —</option>
                {cmsProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "6px" }}>
                <span>Busan Product</span>
                <button
                  onClick={fetchBusanProducts}
                  disabled={fetchingProducts || !isConfigured}
                  title="Load products from Busan API"
                  style={{
                    padding: "2px 6px", borderRadius: "4px", fontSize: "10px", cursor: "pointer",
                    border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.1)",
                    color: "#a78bfa", display: "inline-flex", alignItems: "center", gap: "3px",
                    opacity: (!isConfigured || fetchingProducts) ? 0.5 : 1,
                  }}
                  data-testid="button-fetch-busan-products"
                >
                  <RefreshCw size={9} style={{ animation: fetchingProducts ? "spin 1s linear infinite" : "none" }} />
                  {fetchingProducts ? "Loading..." : "Load"}
                </button>
              </label>
              {busanProductsData.length > 0 ? (
                <select
                  style={selectStyle}
                  value={selectedBusanProduct}
                  onChange={e => setSelectedBusanProduct(e.target.value)}
                  data-testid="select-busan-product"
                >
                  <option value="">— Select Busan product —</option>
                  {busanProductsData.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.currency} {p.price})</option>
                  ))}
                </select>
              ) : (
                <input
                  style={inputStyle}
                  type="text"
                  value={selectedBusanProduct}
                  onChange={e => setSelectedBusanProduct(e.target.value)}
                  placeholder="Enter Busan Product ID manually"
                  data-testid="input-busan-product-id"
                />
              )}
              {busanProductsError && (
                <p style={{ fontSize: "11px", color: "hsl(0,75%,65%)", margin: "4px 0 0" }}>{busanProductsError}</p>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingBottom: "2px" }}>
              <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", marginBottom: "6px" }}>
                <input
                  type="checkbox"
                  checked={requiresZone}
                  onChange={e => setRequiresZone(e.target.checked)}
                  style={{ accentColor: "hsl(258,90%,66%)", width: "13px", height: "13px" }}
                  data-testid="checkbox-requires-zone"
                />
                Requires Zone ID
              </label>
              <button
                onClick={() => addMappingMut.mutate()}
                disabled={!selectedCmsProduct || !selectedBusanProduct || addMappingMut.isPending}
                style={{
                  ...btnPrimary,
                  opacity: (!selectedCmsProduct || !selectedBusanProduct || addMappingMut.isPending) ? 0.5 : 1,
                  display: "inline-flex", alignItems: "center", gap: "5px", whiteSpace: "nowrap",
                }}
                data-testid="button-add-mapping"
              >
                <Plus size={12} />
                {addMappingMut.isPending ? "Mapping..." : "Map Product"}
              </button>
            </div>
          </div>

          {/* Mapped products table */}
          {mappings.length > 0 ? (
            <div style={{ marginTop: "4px" }}>
              <div style={{ fontSize: "11px", fontWeight: 600, color: "hsl(220,10%,40%)", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Mapped Products ({mappings.length})
              </div>
              <div style={{ border: "1px solid hsl(220,15%,14%)", borderRadius: "6px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "hsl(220,20%,10%)" }}>
                      <th style={{ padding: "8px 12px", textAlign: "left", color: "hsl(220,10%,45%)", fontWeight: 600, fontSize: "11px" }}>CMS Product</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", color: "hsl(220,10%,45%)", fontWeight: 600, fontSize: "11px" }}>Busan Product ID</th>
                      <th style={{ padding: "8px 12px", textAlign: "left", color: "hsl(220,10%,45%)", fontWeight: 600, fontSize: "11px" }}>Zone Required</th>
                      <th style={{ padding: "8px 12px", textAlign: "right", color: "hsl(220,10%,45%)", fontWeight: 600, fontSize: "11px" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((m, i) => (
                      <tr
                        key={m.id}
                        style={{ borderTop: i > 0 ? "1px solid hsl(220,15%,12%)" : "none" }}
                      >
                        <td style={{ padding: "10px 12px", color: "hsl(210,40%,82%)" }}>
                          <div style={{ fontWeight: 500 }}>{m.cmsProductName || m.cmsProductId}</div>
                          <div style={{ fontSize: "10px", color: "hsl(220,10%,38%)", marginTop: "1px" }}>{m.cmsProductId}</div>
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ fontFamily: "monospace", fontSize: "11px", color: "hsl(258,80%,72%)", background: "rgba(124,58,237,0.08)", padding: "2px 6px", borderRadius: "4px", display: "inline-block" }}>
                            {m.busanProductId}
                          </div>
                          {m.busanProductName && (
                            <div style={{ fontSize: "10px", color: "hsl(220,10%,45%)", marginTop: "2px" }}>{m.busanProductName}</div>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {m.requiresZone ? (
                            <span style={{ fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "10px", background: "rgba(234,179,8,0.1)", color: "hsl(45,93%,60%)", border: "1px solid rgba(234,179,8,0.2)" }}>
                              Yes
                            </span>
                          ) : (
                            <span style={{ fontSize: "10px", color: "hsl(220,10%,38%)" }}>No</span>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px", textAlign: "right" }}>
                          <button
                            onClick={() => deleteMappingMut.mutate(m.id)}
                            disabled={deleteMappingMut.isPending}
                            style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.07)", color: "hsl(0,75%,65%)", cursor: "pointer", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                            data-testid={`button-delete-mapping-${m.id}`}
                          >
                            <Trash2 size={11} /> Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px", color: "hsl(220,10%,38%)", fontSize: "12px" }}>
              <Package size={28} style={{ display: "block", margin: "0 auto 8px", color: "hsl(220,10%,28%)" }} />
              No product mappings yet. Select a CMS product, load Busan products, and click Map Product.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ApiIntegration() {
  const [configuring, setConfiguring] = useState<ServiceDef | null>(null);

  const { data: plugins = [] } = useQuery<Plugin[]>({
    queryKey: ["/api/admin/plugins"],
    queryFn: () => adminApi.get("/plugins"),
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
    } catch {
      return false;
    }
  }

  return (
    <AdminLayout title="API Integration">
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ fontSize: "13px", color: "hsl(220,10%,45%)", lineHeight: 1.6 }}>
          Configure third-party integrations. Credentials are stored in the database and applied at runtime.
          Payment gateway configuration is managed in the{" "}
          <a href="/admin/payment-method" style={{ color: "hsl(258,90%,66%)", textDecoration: "none" }}>Payment Method</a> page.
        </div>

        {/* ── Busan Game Top-up API ── */}
        <div style={sectionCard}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>Game Top-up Integration</span>
            <p style={{ fontSize: "11px", color: "hsl(220,10%,42%)", margin: "4px 0 0" }}>
              Configure the Busan API to automatically fulfil game top-up orders after payment
            </p>
          </div>
          <div style={{ padding: "20px" }}>
            <BusanSection />
          </div>
        </div>

        {/* ── Service Integrations ── */}
        <div style={sectionCard}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>Service Integrations</span>
            <p style={{ fontSize: "11px", color: "hsl(220,10%,42%)", margin: "4px 0 0" }}>
              Click Configure to add your API keys for each service
            </p>
          </div>
          <div style={{ padding: "0 20px" }}>
            {SERVICES.map((svc, i) => {
              const configured = isConfigured(svc);
              return (
                <div
                  key={svc.slug}
                  id={svc.slug}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 0",
                    borderBottom: i < SERVICES.length - 1 ? "1px solid hsl(220, 15%, 12%)" : "none",
                    gap: "12px",
                    flexWrap: "wrap",
                    borderRadius: "4px",
                    transition: "box-shadow 0.3s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "36px", height: "36px", borderRadius: "6px", flexShrink: 0,
                        background: configured ? "rgba(74,222,128,0.08)" : "hsl(220, 15%, 13%)",
                        color: configured ? "hsl(142,71%,48%)" : "hsl(220, 10%, 40%)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Plug size={14} />
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "hsl(210, 40%, 85%)" }}>{svc.name}</div>
                      <div style={{ fontSize: "11px", color: "hsl(220, 10%, 38%)", marginTop: "2px" }}>{svc.note}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      {configured ? (
                        <><CheckCircle size={13} color="hsl(142,71%,48%)" /><span style={{ fontSize: "12px", color: "hsl(142,71%,48%)" }}>Configured</span></>
                      ) : (
                        <><XCircle size={13} color="hsl(220, 10%, 35%)" /><span style={{ fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>Not configured</span></>
                      )}
                    </div>
                    <button
                      onClick={() => setConfiguring(svc)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "5px",
                        padding: "5px 10px", borderRadius: "5px", fontSize: "11px", fontWeight: 600,
                        cursor: "pointer", border: "1px solid rgba(124,58,237,0.3)",
                        background: "rgba(124,58,237,0.1)", color: "#a78bfa",
                      }}
                      data-testid={`button-configure-${svc.slug}`}
                    >
                      <Settings size={11} /> Configure
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {configuring && (
        <ConfigureModal
          service={configuring}
          plugin={pluginMap[configuring.slug]}
          onClose={() => setConfiguring(null)}
        />
      )}
    </AdminLayout>
  );
}
