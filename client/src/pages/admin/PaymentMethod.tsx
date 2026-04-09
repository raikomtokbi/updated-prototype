import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, CreditCard, Wallet, Landmark, Loader2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from "lucide-react";
import AdminLayout, { useMobile } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import type { PaymentMethod } from "@shared/schema";

// ─── Styles ──────────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "hsl(220, 20%, 9%)",
  border: "1px solid hsl(220, 15%, 13%)",
  borderRadius: "8px",
};
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  background: "hsl(220, 20%, 11%)",
  border: "1px solid hsl(220, 15%, 18%)",
  borderRadius: "6px",
  color: "hsl(210,40%,92%)",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "hsl(220,10%,55%)",
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
  gap: "4px",
  padding: "5px 10px",
  borderRadius: "5px",
  background: "rgba(239,68,68,0.1)",
  border: "1px solid rgba(239,68,68,0.25)",
  color: "hsl(0,72%,62%)",
  fontSize: "11px",
  cursor: "pointer",
};
const btnEdit: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "5px 10px",
  borderRadius: "5px",
  background: "rgba(124,58,237,0.1)",
  border: "1px solid rgba(124,58,237,0.25)",
  color: "#a78bfa",
  fontSize: "11px",
  cursor: "pointer",
};
const sectionBox: React.CSSProperties = {
  padding: "0.75rem",
  background: "hsl(220,20%,7%)",
  borderRadius: "6px",
  border: "1px solid hsl(220,15%,14%)",
};

// ─── Gateway Types Config ─────────────────────────────────────────────────────
const GATEWAY_CONFIGS: Record<string, {
  label: string;
  fields: { key: string; label: string; placeholder: string; isSecret?: boolean; isConfig?: boolean }[];
  notes?: string;
}> = {
  razorpay: {
    label: "Razorpay",
    fields: [
      { key: "publicKey", label: "Key ID (Public Key)", placeholder: "rzp_test_..." },
      { key: "secretKey", label: "Key Secret", placeholder: "••••••••••••••••", isSecret: true },
    ],
    notes: "Supports INR and 90+ currencies. Dashboard: dashboard.razorpay.com",
  },
  payu: {
    label: "PayU",
    fields: [
      { key: "publicKey", label: "Merchant Key", placeholder: "JBZaLc" },
      { key: "secretKey", label: "Salt", placeholder: "••••••••••••••••", isSecret: true },
    ],
    notes: "For PayU India. Test URL: test.payu.in | Live: secure.payu.in",
  },
  cashfree: {
    label: "Cashfree",
    fields: [
      { key: "publicKey", label: "App ID", placeholder: "CF_APP_ID" },
      { key: "secretKey", label: "Secret Key", placeholder: "••••••••••••••••", isSecret: true },
    ],
    notes: "Use sandbox for test mode. Dashboard: merchant.cashfree.com",
  },
  instamojo: {
    label: "Instamojo",
    fields: [
      { key: "publicKey", label: "API Key", placeholder: "test_..." },
      { key: "secretKey", label: "Auth Token", placeholder: "••••••••••••••••", isSecret: true },
    ],
    notes: "Test: test.instamojo.com | Live: instamojo.com",
  },
  ccavenue: {
    label: "CCAvenue",
    fields: [
      { key: "publicKey", label: "Access Code", placeholder: "AVJE88JS56..." },
      { key: "secretKey", label: "Working Key", placeholder: "••••••••••••••••", isSecret: true },
      { key: "config.merchantId", label: "Merchant ID", placeholder: "123456", isConfig: true },
    ],
    notes: "Requires merchant account. Test: test.ccavenue.com",
  },
  phonepe: {
    label: "PhonePe",
    fields: [
      { key: "publicKey", label: "Merchant ID", placeholder: "MERCHANTID" },
      { key: "secretKey", label: "Salt Key", placeholder: "••••••••••••••••", isSecret: true },
      { key: "config.saltIndex", label: "Salt Index", placeholder: "1", isConfig: true },
    ],
    notes: "PhonePe Payment Gateway. Test: api-preprod.phonepe.com",
  },
  paytm: {
    label: "Paytm",
    fields: [
      { key: "publicKey", label: "Merchant ID (MID)", placeholder: "YourMID123" },
      { key: "secretKey", label: "Merchant Key", placeholder: "••••••••••••••••", isSecret: true },
      { key: "config.website", label: "Website", placeholder: "DEFAULT", isConfig: true },
      { key: "config.industryType", label: "Industry Type", placeholder: "Retail", isConfig: true },
    ],
    notes: "Test: securegw-stage.paytm.in | Live: securegw.paytm.in",
  },
  easybuzz: {
    label: "EasyBuzz",
    fields: [
      { key: "publicKey", label: "Key", placeholder: "xxxxxx" },
      { key: "secretKey", label: "Salt", placeholder: "••••••••••••••••", isSecret: true },
    ],
    notes: "Test: testpay.easebuzz.in | Live: pay.easebuzz.in",
  },
  bharatpe: {
    label: "BharatPe",
    fields: [
      { key: "publicKey", label: "Merchant ID", placeholder: "BPMERCHANTID" },
      { key: "secretKey", label: "Token", placeholder: "••••••••••••••••", isSecret: true },
    ],
    notes: "BharatPe Merchant Payment Gateway.",
  },
  stripe: {
    label: "Stripe",
    fields: [
      { key: "publicKey", label: "Publishable Key", placeholder: "pk_test_..." },
      { key: "secretKey", label: "Secret Key", placeholder: "••••••••••••••••", isSecret: true },
      { key: "webhookSecret", label: "Webhook Secret", placeholder: "whsec_...", isSecret: true },
    ],
    notes: "Supports global payments. Dashboard: dashboard.stripe.com",
  },
  paypal: {
    label: "PayPal",
    fields: [
      { key: "publicKey", label: "Client ID", placeholder: "AcD..." },
      { key: "secretKey", label: "Client Secret", placeholder: "••••••••••••••••", isSecret: true },
    ],
    notes: "PayPal Checkout. Dashboard: developer.paypal.com",
  },
  manual: {
    label: "Manual Payment",
    fields: [
      { key: "config.instructions", label: "Payment Instructions", placeholder: "Send payment to bank account...", isConfig: true },
    ],
    notes: "Bank transfer, UPI, or other manual payment methods.",
  },
  xyzpay: {
    label: "XYZPay",
    fields: [
      { key: "secretKey", label: "API Token", placeholder: "••••••••••••••••", isSecret: true },
    ],
    notes: "XYZPay Payment Gateway. Get your API token from XYZPay dashboard at https://www.xyzpay.site/",
  },
  manual_upi: {
    label: "Manual UPI",
    fields: [
      { key: "config.upiId", label: "UPI ID *", placeholder: "yourname@paytm or 9876543210@upi", isConfig: true },
      { key: "config.emailAddress", label: "IMAP Email Address", placeholder: "your-upi-email@gmail.com", isConfig: true },
      { key: "config.emailPassword", label: "App Password (IMAP)", placeholder: "Gmail App Password (16 chars)", isSecret: true, isConfig: true },
      { key: "config.imapHost", label: "IMAP Host", placeholder: "imap.gmail.com", isConfig: true },
      { key: "config.imapPort", label: "IMAP Port", placeholder: "993", isConfig: true },
      { key: "config.imapLabel", label: "Mailbox / Label", placeholder: "INBOX", isConfig: true },
    ],
    notes: "Customers pay via UPI and the server auto-verifies payment by polling the configured email inbox (IMAP). For Gmail, generate an App Password (not your main password) at myaccount.google.com/apppasswords and use host imap.gmail.com port 993. Set Mailbox / Label to read a specific Gmail label instead of the full inbox (e.g. Payments, or Parent/Child for nested labels).",
  },
};

// Default paymentType per gateway type
const GATEWAY_PAYMENT_TYPE: Record<string, string> = {
  manual_upi: "UPI",
  xyzpay: "UPI",
  bharatpe: "UPI",
  razorpay: "CARD",
  cashfree: "CARD",
  phonepe: "CARD",
  paytm: "CARD",
  ccavenue: "CARD",
  stripe: "CARD",
  paypal: "CARD",
  easybuzz: "CARD",
  manual: "CARD",
  payu: "NETBANKING",
  instamojo: "NETBANKING",
};

const EMPTY_PM = {
  name: "",
  type: "razorpay",
  paymentType: "CARD",
  provider: "Razorpay",
  publicKey: "",
  secretKey: "",
  webhookSecret: "",
  mode: "test" as "test" | "live",
  supportedCurrencies: "INR",
  isActive: true,
  sortOrder: 0,
  config: {} as Record<string, string>,
};

function getIcon(type: string) {
  if (type === "paypal") return <Wallet size={18} />;
  if (type === "manual") return <Landmark size={18} />;
  return <CreditCard size={18} />;
}

function getGatewayBadgeColor(_type: string): string {
  // Use site theme color for all gateways for consistency
  return "hsl(258, 90%, 66%)";
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: "580px", maxHeight: "90vh", overflowY: "auto", background: "hsl(220,22%,8%)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "10px", padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "hsl(210,40%,95%)", margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "hsl(220,10%,50%)", cursor: "pointer" }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Payment Method Form ──────────────────────────────────────────────────────
function PMForm({ initial, onSubmit, loading }: { initial: typeof EMPTY_PM; onSubmit: (d: any) => void; loading: boolean }) {
  const isMobile = useMobile(768);
  const [form, setForm] = useState(initial);
  const [showNotes, setShowNotes] = useState(false);

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));
  const setConfig = (k: string, v: string) => setForm((p) => ({
    ...p,
    config: { ...(p.config || {}), [k]: v },
  }));

  const gatewayCfg = GATEWAY_CONFIGS[form.type] || GATEWAY_CONFIGS.stripe;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const output = {
      ...form,
      name: gatewayCfg.label,
      provider: gatewayCfg.label,
      config: form.config && Object.keys(form.config).length > 0
        ? JSON.stringify(form.config)
        : undefined,
    };
    onSubmit(output);
  }

  function getFieldValue(fieldKey: string): string {
    if (fieldKey.startsWith("config.")) {
      const cfgKey = fieldKey.replace("config.", "");
      return (form.config as any)?.[cfgKey] || "";
    }
    return (form as any)[fieldKey] || "";
  }

  function setFieldValue(fieldKey: string, value: string) {
    if (fieldKey.startsWith("config.")) {
      setConfig(fieldKey.replace("config.", ""), value);
    } else {
      set(fieldKey, value);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      {/* Gateway Type Selector */}
      <div>
        <label style={labelStyle}>Gateway Type *</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px" }}>
          {Object.entries(GATEWAY_CONFIGS).map(([type, cfg]) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                set("type", type);
                set("provider", cfg.label);
                set("paymentType", GATEWAY_PAYMENT_TYPE[type] || "CARD");
                if (form.supportedCurrencies === "INR" || form.supportedCurrencies === "USD,EUR") {
                  set("supportedCurrencies", ["stripe", "paypal"].includes(type) ? "USD,EUR,GBP" : "INR");
                }
              }}
              style={{
                padding: "6px 8px",
                borderRadius: "5px",
                border: `1px solid ${form.type === type ? getGatewayBadgeColor(type) : "hsl(220,15%,18%)"}`,
                background: form.type === type ? `${getGatewayBadgeColor(type)}22` : "hsl(220,20%,10%)",
                color: form.type === type ? getGatewayBadgeColor(type) : "hsl(220,10%,55%)",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                textAlign: "center",
              }}
            >
              {cfg.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gateway-specific credentials */}
      <div style={sectionBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <p style={{ ...labelStyle, marginBottom: 0, color: "hsl(258,70%,65%)" }}>API Credentials — {gatewayCfg.label}</p>
          {gatewayCfg.notes && (
            <button
              type="button"
              onClick={() => setShowNotes(!showNotes)}
              style={{ background: "none", border: "none", color: "hsl(220,10%,45%)", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px", fontSize: "10px" }}
            >
              Setup guide {showNotes ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>
        {showNotes && gatewayCfg.notes && (
          <div style={{ fontSize: "11px", color: "hsl(220,10%,55%)", background: "hsl(220,20%,9%)", borderRadius: "4px", padding: "8px", marginBottom: "0.6rem", lineHeight: 1.6 }}>
            {gatewayCfg.notes}
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {gatewayCfg.fields.map((field) => (
            <div key={field.key}>
              <label style={labelStyle}>{field.label}</label>
              <input
                style={inputStyle}
                type={field.isSecret ? "password" : "text"}
                value={getFieldValue(field.key)}
                onChange={(e) => setFieldValue(field.key, e.target.value)}
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Settings */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Mode</label>
          <select style={inputStyle} value={form.mode} onChange={(e) => set("mode", e.target.value as "test" | "live")}>
            <option value="test">Test</option>
            <option value="live">Live</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={form.isActive ? "active" : "inactive"} onChange={(e) => set("isActive", e.target.value === "active")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Priority (lower = first)</label>
          <input style={inputStyle} type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", parseInt(e.target.value) || 0)} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Supported Currencies (comma-separated)</label>
        <input
          style={inputStyle}
          value={form.supportedCurrencies ?? ""}
          onChange={(e) => set("supportedCurrencies", e.target.value)}
          placeholder="INR,USD,EUR"
        />
      </div>

      <button type="submit" style={{ ...btnPrimary, justifyContent: "center", marginTop: "0.25rem" }} disabled={loading}>
        {loading && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
        {loading ? "Saving..." : "Save Gateway"}
      </button>
    </form>
  );
}

function buildEditInitial(m: PaymentMethod): typeof EMPTY_PM {
  let configObj: Record<string, string> = {};
  if (m.config) {
    try { configObj = JSON.parse(m.config); } catch {}
  }
  return {
    name: m.name,
    type: m.type || "razorpay",
    paymentType: (m as any).paymentType || GATEWAY_PAYMENT_TYPE[m.type] || "CARD",
    provider: m.provider ?? "",
    publicKey: m.publicKey ?? "",
    secretKey: "",
    webhookSecret: "",
    mode: (m.mode as "test" | "live") ?? "test",
    supportedCurrencies: m.supportedCurrencies ?? "INR",
    isActive: m.isActive,
    sortOrder: m.sortOrder,
    config: configObj,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function PaymentMethodPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editPM, setEditPM] = useState<PaymentMethod | null>(null);

  const { data: methods = [], isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/admin/payment-methods"],
    queryFn: () => adminApi.get("/payment-methods"),
  });

  const addMut = useMutation({
    mutationFn: (d: any) => adminApi.post("/payment-methods", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] }); setShowAdd(false); },
  });
  const editMut = useMutation({
    mutationFn: ({ id, data }: any) => adminApi.patch(`/payment-methods/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] }); setEditPM(null); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/payment-methods/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] }),
  });
  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.patch(`/payment-methods/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] }),
  });

  return (
    <AdminLayout title="Payment Gateways" actions={
      <button style={btnPrimary} onClick={() => setShowAdd(true)} data-testid="button-add-gateway">
        <Plus size={14} /> Add Gateway
      </button>
    }>

      {/* Info banner */}
      <div style={{ background: "hsl(220,20%,9%)", border: "1px solid hsl(220,15%,15%)", borderRadius: "8px", padding: "12px 16px", marginBottom: "16px" }}>
        <p style={{ fontSize: "12px", color: "hsl(220,10%,50%)", lineHeight: 1.6, margin: 0 }}>
          Supported gateways: <span style={{ color: "hsl(258,70%,65%)" }}>Razorpay, PayU, Cashfree, Instamojo, CCAvenue, PhonePe, Paytm, EasyBuzz, BharatPe, Stripe, PayPal, XYZPay, Manual UPI, Manual</span>.
          Set a lower priority number to make a gateway take precedence over others when multiple gateways are active.
        </p>
      </div>

      {isLoading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "hsl(220,10%,42%)", fontSize: "13px" }}>Loading...</div>
      ) : methods.length === 0 ? (
        <div style={{ ...card, padding: "3rem", textAlign: "center" }}>
          <CreditCard size={36} style={{ color: "rgba(124,58,237,0.3)", marginBottom: "0.75rem" }} />
          <p style={{ color: "hsl(220,10%,42%)", fontSize: "13px", marginBottom: "12px" }}>No payment gateways configured yet.</p>
          <button style={btnPrimary} onClick={() => setShowAdd(true)}><Plus size={13} /> Add First Gateway</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {methods.map((m) => {
            const color = getGatewayBadgeColor(m.type);
            return (
              <div
                key={m.id}
                data-testid={`card-payment-${m.type}`}
                style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", gap: "12px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                  <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: `${color}22`, border: `1px solid ${color}44`, color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "10px", fontWeight: 700 }}>
                    {getIcon(m.type)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210,40%,95%)", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                      {m.name}
                      <span style={{ padding: "1px 7px", borderRadius: "3px", fontSize: "10px", fontWeight: 600, background: `${color}22`, color }}>
                        {GATEWAY_CONFIGS[m.type]?.label || m.type}
                      </span>
                      <span style={{ padding: "1px 7px", borderRadius: "3px", fontSize: "10px", fontWeight: 500, background: m.mode === "live" ? "rgba(74,222,128,0.1)" : "rgba(251,191,36,0.1)", color: m.mode === "live" ? "hsl(142,71%,45%)" : "hsl(40,96%,60%)" }}>
                        {m.mode?.toUpperCase() ?? "TEST"}
                      </span>
                    </div>
                    <div style={{ fontSize: "11px", color: "hsl(220,10%,42%)", marginTop: "3px" }}>
                      {m.supportedCurrencies ? `Currencies: ${m.supportedCurrencies}` : ""}
                      {m.publicKey ? ` · Key: ${m.publicKey.slice(0, 8)}...` : ""}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                  <button
                    onClick={() => toggleMut.mutate({ id: m.id, isActive: !m.isActive })}
                    style={{ background: "none", border: "none", cursor: "pointer", color: m.isActive ? "hsl(142,71%,45%)" : "hsl(220,10%,38%)", display: "flex", alignItems: "center" }}
                    title={m.isActive ? "Disable" : "Enable"}
                    data-testid={`toggle-payment-${m.type}`}
                  >
                    {m.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                  </button>
                  <span style={{ fontSize: "11px", fontWeight: 500, color: m.isActive ? "hsl(142,71%,45%)" : "hsl(0,72%,51%)" }}>
                    {m.isActive ? "Active" : "Inactive"}
                  </span>
                  <button style={btnEdit} onClick={() => setEditPM(m)} data-testid={`button-edit-payment-${m.type}`}>
                    <Pencil size={11} /> Edit
                  </button>
                  <button style={btnDanger} onClick={() => { if (confirm(`Delete "${m.name}"?`)) delMut.mutate(m.id); }}>
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <Modal title="Add Payment Gateway" onClose={() => setShowAdd(false)}>
          <PMForm initial={EMPTY_PM} onSubmit={(d) => addMut.mutate(d)} loading={addMut.isPending} />
        </Modal>
      )}
      {editPM && (
        <Modal title="Edit Payment Gateway" onClose={() => setEditPM(null)}>
          <PMForm
            initial={buildEditInitial(editPM)}
            onSubmit={(d) => editMut.mutate({ id: editPM.id, data: d })}
            loading={editMut.isPending}
          />
        </Modal>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AdminLayout>
  );
}
