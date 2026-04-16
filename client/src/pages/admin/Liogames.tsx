import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wifi, Trash2, RefreshCw, CheckCircle,
  XCircle, Loader2, Plus, Link2, Copy, Check,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import { card, btnPrimary, inputStyle, selectStyle } from "@/components/admin/shared";
import { SaveBar } from "@/components/admin/SaveBar";
import { useAuthStore } from "@/lib/store/authstore";
import type { LioGamesConfig, LioGamesMapping } from "@shared/schema";

// ─── Styles ───────────────────────────────────────────────────────────────────
const sectionTitle: React.CSSProperties = {
  fontSize: "11px", fontWeight: 700, color: "hsl(var(--muted-foreground))",
  textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "12px",
};
const tabBtn = (active: boolean): React.CSSProperties => ({
  padding: "7px 18px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
  cursor: "pointer", border: "none", transition: "all 0.15s",
  background: active ? "hsl(258, 90%, 62%)" : "transparent",
  color: active ? "white" : "hsl(var(--muted-foreground))",
});
const fieldRow: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "4px" };
const labelStyle: React.CSSProperties = { fontSize: "11px", fontWeight: 600, color: "hsl(var(--muted-foreground))" };
const innerCard: React.CSSProperties = {
  background: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  padding: "16px",
};

// ─── Config Tab ───────────────────────────────────────────────────────────────
function ConfigTab() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const { data: config } = useQuery<LioGamesConfig | null>({
    queryKey: ["/api/admin/liogames/config"],
    queryFn: () => adminApi.get("/liogames/config"),
  });

  const [form, setForm] = useState({
    memberCode: "",
    secret: "",
    baseUrl: "https://api.liogames.com/wp-json/liogames/v1",
  });
  const [testStatus, setTestStatus] = useState<null | { ok: boolean; message: string; balance?: number; currency?: string }>(null);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (config) {
      setForm({
        memberCode: config.memberCode ?? "",
        secret: config.secret ?? "",
        baseUrl: config.baseUrl ?? "https://api.liogames.com/wp-json/liogames/v1",
      });
    }
  }, [config]);

  const isDirty = useMemo(() => {
    if (!config) return true;
    return (
      form.memberCode !== (config.memberCode ?? "") ||
      form.secret !== (config.secret ?? "") ||
      form.baseUrl !== (config.baseUrl ?? "https://api.liogames.com/wp-json/liogames/v1")
    );
  }, [form, config]);

  const saveMut = useMutation({
    mutationFn: () => adminApi.post("/liogames/config", { ...form, isActive: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/liogames/config"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  async function testConnection() {
    setTesting(true);
    setTestStatus(null);
    try {
      const res = await fetch("/api/admin/liogames/test-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-role": user?.role ?? "super_admin",
        },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setTestStatus({ ok: data.success, message: data.message, balance: data.balance, currency: data.currency });
    } catch {
      setTestStatus({ ok: false, message: "Connection failed" });
    } finally {
      setTesting(false);
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ ...card, padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <p style={sectionTitle}>API Credentials</p>
        <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", margin: 0, lineHeight: 1.55 }}>
          Enter your Liogames reseller account credentials. The secret is used to sign HMAC-SHA256 request signatures and is never exposed to the frontend.
        </p>

        <div style={fieldRow}>
          <label style={labelStyle}>API Base URL</label>
          <input
            data-testid="input-liogames-base-url"
            style={inputStyle}
            value={form.baseUrl}
            onChange={set("baseUrl")}
            placeholder="https://api.liogames.com/wp-json/liogames/v1"
          />
          <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", margin: "4px 0 0" }}>
            Base URL without trailing slash. Change only if you have a custom endpoint.
          </p>
        </div>

        <div style={fieldRow}>
          <label style={labelStyle}>Member Code</label>
          <input
            data-testid="input-liogames-member-code"
            style={inputStyle}
            value={form.memberCode}
            onChange={set("memberCode")}
            placeholder="Your Liogames member code"
          />
        </div>

        <div style={fieldRow}>
          <label style={labelStyle}>Secret Key</label>
          <input
            data-testid="input-liogames-secret"
            type="password"
            style={inputStyle}
            value={form.secret}
            onChange={set("secret")}
            placeholder="••••••••"
            autoComplete="off"
          />
          <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", margin: "4px 0 0" }}>
            Used for HMAC-SHA256 request signing (<code style={{ background: "rgba(255,255,255,0.06)", padding: "1px 4px", borderRadius: "3px" }}>x-liog-sign</code> header).
          </p>
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
            <span>{testStatus.message}</span>
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            data-testid="button-test-liogames"
            style={{ ...btnPrimary, background: "hsl(220,20%,16%)", border: "1px solid hsl(220,15%,22%)", display: "inline-flex", alignItems: "center", gap: "6px" }}
            onClick={testConnection}
            disabled={testing || !form.memberCode || !form.secret}
          >
            {testing ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Wifi size={13} />}
            Test Connection
          </button>
        </div>
        <SaveBar
          show={isDirty || saved}
          saving={saveMut.isPending}
          saved={saved}
          onSave={() => saveMut.mutate()}
          label="LioGames configuration has unsaved changes"
        />
      </div>

      <LiogamesApiDocsPanel />
    </div>
  );
}

function LiogamesApiDocsPanel() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const endpoints = [
    { label: "Balance",            path: "/api/admin/liogames/balance",           desc: "Check your Liogames wallet balance" },
    { label: "Product Variations", path: "/api/admin/liogames/product-variations", desc: "GET ?product_id=N — list product variations" },
    { label: "Product Schema",     path: "/api/admin/liogames/product-schema",     desc: "GET ?product_id=N&variation_id=N — required fields" },
    { label: "Input Profiles",     path: "/api/admin/liogames/input-profiles",     desc: "List all available player input profiles" },
  ];

  function copy(path: string) {
    navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopiedKey(path);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <div style={{ ...card, padding: "20px", marginTop: "16px" }}>
      <p style={sectionTitle}>Admin API Endpoints</p>
      <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginBottom: "14px", lineHeight: 1.5 }}>
        Internal proxy endpoints for querying the Liogames API. These require admin authentication.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {endpoints.map((ep) => (
          <div key={ep.path} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "hsl(var(--foreground))" }}>{ep.label}</span>
              <span style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))", textAlign: "right" }}>{ep.desc}</span>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: "hsl(var(--background))", border: "1px solid hsl(var(--border))",
              borderRadius: "6px", padding: "6px 10px",
            }}>
              <code style={{ flex: 1, fontSize: "11px", color: "hsl(var(--muted-foreground))", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {window.location.origin}{ep.path}
              </code>
              <button
                data-testid={`button-copy-${ep.label.replace(/\s+/g, "-").toLowerCase()}`}
                onClick={() => copy(ep.path)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", flexShrink: 0 }}
              >
                {copiedKey === ep.path ? <Check size={13} style={{ color: "#4ade80" }} /> : <Copy size={13} />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Mappings Tab ─────────────────────────────────────────────────────────────
interface NewMappingForm {
  cmsProductId: string;
  cmsProductName: string;
  lioProductId: string;
  lioVariationId: string;
  lioProductName: string;
}

function MappingsTab() {
  const qc = useQueryClient();

  const { data: mappings = [], isLoading } = useQuery<LioGamesMapping[]>({
    queryKey: ["/api/admin/liogames/mappings"],
    queryFn: () => adminApi.get("/liogames/mappings"),
  });

  const { data: products = [] } = useQuery<{ id: string; title: string }[]>({
    queryKey: ["/api/admin/products"],
    queryFn: () => adminApi.get("/products"),
  });

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<NewMappingForm>({
    cmsProductId: "", cmsProductName: "",
    lioProductId: "", lioVariationId: "",
    lioProductName: "",
  });
  const [variations, setVariations] = useState<{ variation_id: number; name: string }[]>([]);
  const [varLoading, setVarLoading] = useState(false);

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/liogames/mappings/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/liogames/mappings"] }),
  });

  const createMut = useMutation({
    mutationFn: () => adminApi.post("/liogames/mappings", {
      cmsProductId: form.cmsProductId,
      cmsProductName: form.cmsProductName || undefined,
      lioProductId: parseInt(form.lioProductId, 10),
      lioVariationId: form.lioVariationId ? parseInt(form.lioVariationId, 10) : undefined,
      lioProductName: form.lioProductName || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/liogames/mappings"] });
      setShowModal(false);
      setForm({ cmsProductId: "", cmsProductName: "", lioProductId: "", lioVariationId: "", lioProductName: "" });
      setVariations([]);
    },
  });

  async function fetchVariations(productId: string) {
    if (!productId || isNaN(parseInt(productId, 10))) { setVariations([]); return; }
    setVarLoading(true);
    try {
      const { user } = useAuthStore.getState();
      const res = await fetch(`/api/admin/liogames/product-variations?product_id=${productId}`, {
        headers: { "x-admin-role": user?.role ?? "super_admin" },
      });
      const data = await res.json();
      setVariations(data?.data?.variations ?? []);
    } catch { setVariations([]); }
    finally { setVarLoading(false); }
  }

  const setF = (k: keyof NewMappingForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value;
    setForm((p) => ({ ...p, [k]: val }));
    if (k === "lioProductId") {
      setForm((p) => ({ ...p, lioProductId: val, lioVariationId: "" }));
      fetchVariations(val);
    }
    if (k === "cmsProductId") {
      const found = products.find((p) => p.id === val);
      setForm((p) => ({ ...p, cmsProductId: val, cmsProductName: found?.title ?? "" }));
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
        <p style={{ ...sectionTitle, margin: 0 }}>Product Mappings ({mappings.length})</p>
        <button
          data-testid="button-add-liogames-mapping"
          style={{ ...btnPrimary, display: "inline-flex", alignItems: "center", gap: "6px" }}
          onClick={() => setShowModal(true)}
        >
          <Plus size={13} /> New Mapping
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "hsl(var(--muted-foreground))", fontSize: "13px" }}>
          <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading mappings...
        </div>
      ) : mappings.length === 0 ? (
        <div style={{ ...innerCard, textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: "13px", padding: "32px" }}>
          No mappings yet. Click "New Mapping" to link a CMS product to a Liogames product.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {mappings.map((m) => (
            <div key={m.id} data-testid={`row-liogames-mapping-${m.id}`} style={{
              ...innerCard,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "hsl(var(--foreground))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {m.cmsProductName || m.cmsProductId}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "3px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>CMS: {m.cmsProductId.slice(0, 8)}…</span>
                  <Link2 size={10} style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0 }} />
                  <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>
                    Lio Product #{m.lioProductId}{m.lioVariationId ? ` / Var #${m.lioVariationId}` : ""}
                  </span>
                  {m.lioProductName && (
                    <span style={{ fontSize: "11px", color: "hsl(var(--foreground))", fontStyle: "italic" }}>({m.lioProductName})</span>
                  )}
                </div>
              </div>
              <button
                data-testid={`button-delete-mapping-${m.id}`}
                onClick={() => deleteMut.mutate(m.id)}
                disabled={deleteMut.isPending}
                style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--destructive))", padding: "4px", flexShrink: 0 }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
        }}>
          <div style={{ ...card, width: "100%", maxWidth: "520px", padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "hsl(var(--foreground))" }}>New Liogames Mapping</p>

            <div style={fieldRow}>
              <label style={labelStyle}>CMS Product</label>
              <select style={{ ...selectStyle, width: "100%" }} value={form.cmsProductId} onChange={setF("cmsProductId")} data-testid="select-cms-product">
                <option value="">— Select a product —</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>

            <div style={fieldRow}>
              <label style={labelStyle}>Liogames Product ID</label>
              <input
                data-testid="input-lio-product-id"
                style={inputStyle}
                type="number"
                value={form.lioProductId}
                onChange={setF("lioProductId")}
                placeholder="e.g. 123"
              />
              <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", margin: "3px 0 0" }}>
                Enter the WooCommerce product ID from Liogames. Variations will load automatically.
              </p>
            </div>

            {varLoading && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>
                <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Loading variations...
              </div>
            )}

            {variations.length > 0 && (
              <div style={fieldRow}>
                <label style={labelStyle}>Variation (optional)</label>
                <select style={{ ...selectStyle, width: "100%" }} value={form.lioVariationId} onChange={setF("lioVariationId")} data-testid="select-lio-variation">
                  <option value="">— No specific variation —</option>
                  {variations.map((v) => (
                    <option key={v.variation_id} value={String(v.variation_id)}>{v.name} (#{v.variation_id})</option>
                  ))}
                </select>
              </div>
            )}

            <div style={fieldRow}>
              <label style={labelStyle}>Liogames Product Name <span style={{ fontWeight: 400 }}>(optional label)</span></label>
              <input
                data-testid="input-lio-product-name"
                style={inputStyle}
                value={form.lioProductName}
                onChange={setF("lioProductName")}
                placeholder="e.g. Mobile Legends Diamonds"
              />
            </div>

            {createMut.isError && (
              <p style={{ fontSize: "12px", color: "hsl(var(--destructive))", margin: 0 }}>Failed to save mapping. Please try again.</p>
            )}

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => { setShowModal(false); setVariations([]); setForm({ cmsProductId: "", cmsProductName: "", lioProductId: "", lioVariationId: "", lioProductName: "" }); }}
                style={{ padding: "7px 14px", borderRadius: "6px", background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(var(--muted-foreground))", fontSize: "12px", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                data-testid="button-create-mapping"
                style={{ ...btnPrimary, opacity: createMut.isPending || !form.cmsProductId || !form.lioProductId ? 0.6 : 1 }}
                onClick={() => createMut.mutate()}
                disabled={createMut.isPending || !form.cmsProductId || !form.lioProductId}
              >
                {createMut.isPending ? "Saving..." : "Add Mapping"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Liogames() {
  const [tab, setTab] = useState<"config" | "mappings">("config");

  return (
    <AdminLayout title="Liogames">
      <div style={{ padding: "24px", maxWidth: "860px" }}>
        <div style={{ marginBottom: "20px" }}>
          <h1 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "hsl(var(--foreground))" }}>Liogames Integration</h1>
          <p style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", marginTop: "4px" }}>
            Connect your Liogames reseller account for automated game top-up fulfillment. All requests are signed with HMAC-SHA256.
          </p>
        </div>

        <div style={{ display: "flex", gap: "4px", marginBottom: "20px", background: "hsl(var(--card))", borderRadius: "8px", padding: "4px", border: "1px solid hsl(var(--border))", width: "fit-content" }}>
          <button style={tabBtn(tab === "config")} onClick={() => setTab("config")} data-testid="tab-liogames-config">Configuration</button>
          <button style={tabBtn(tab === "mappings")} onClick={() => setTab("mappings")} data-testid="tab-liogames-mappings">Product Mappings</button>
        </div>

        {tab === "config" ? <ConfigTab /> : <MappingsTab />}
      </div>
    </AdminLayout>
  );
}
