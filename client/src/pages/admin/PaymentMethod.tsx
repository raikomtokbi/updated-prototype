import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, CreditCard, Wallet, Landmark, Loader2, ToggleLeft, ToggleRight } from "lucide-react";
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

const PROVIDER_TYPES = [
  { value: "stripe", label: "Stripe" },
  { value: "razorpay", label: "Razorpay" },
  { value: "paypal", label: "PayPal" },
  { value: "manual", label: "Manual Payment" },
  { value: "other", label: "Other" },
];

const EMPTY_PM = {
  name: "",
  type: "stripe",
  provider: "Stripe",
  publicKey: "",
  secretKey: "",
  webhookSecret: "",
  mode: "test" as "test" | "live",
  supportedCurrencies: "USD,EUR",
  isActive: true,
  sortOrder: 0,
};

function getIcon(type: string) {
  if (type === "paypal") return <Wallet size={18} />;
  if (type === "manual") return <Landmark size={18} />;
  return <CreditCard size={18} />;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: "540px", maxHeight: "88vh", overflowY: "auto", background: "hsl(220,22%,8%)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "10px", padding: "1.5rem" }}>
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
  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Display Name *</label>
          <input style={inputStyle} required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Stripe Cards" />
        </div>
        <div>
          <label style={labelStyle}>Provider / Type *</label>
          <select style={inputStyle} value={form.type} onChange={(e) => {
            const found = PROVIDER_TYPES.find((p) => p.value === e.target.value);
            set("type", e.target.value);
            set("provider", found?.label ?? e.target.value);
          }}>
            {PROVIDER_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ padding: "0.75rem", background: "hsl(220,20%,7%)", borderRadius: "6px", border: "1px solid hsl(220,15%,14%)" }}>
        <p style={{ ...labelStyle, marginBottom: "0.75rem", color: "hsl(258,70%,65%)" }}>API Credentials</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <div>
            <label style={labelStyle}>Public Key</label>
            <input style={inputStyle} value={form.publicKey ?? ""} onChange={(e) => set("publicKey", e.target.value)} placeholder="pk_test_..." />
          </div>
          <div>
            <label style={labelStyle}>Secret Key</label>
            <input style={inputStyle} type="password" value={form.secretKey ?? ""} onChange={(e) => set("secretKey", e.target.value)} placeholder="sk_test_..." />
          </div>
          <div>
            <label style={labelStyle}>Webhook Secret</label>
            <input style={inputStyle} type="password" value={form.webhookSecret ?? ""} onChange={(e) => set("webhookSecret", e.target.value)} placeholder="whsec_..." />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Mode</label>
          <select style={inputStyle} value={form.mode} onChange={(e) => set("mode", e.target.value)}>
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
          <label style={labelStyle}>Sort Order</label>
          <input style={inputStyle} type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", parseInt(e.target.value) || 0)} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Supported Currencies (comma-separated)</label>
        <input style={inputStyle} value={form.supportedCurrencies ?? ""} onChange={(e) => set("supportedCurrencies", e.target.value)} placeholder="USD,EUR,GBP" />
      </div>

      <button type="submit" style={{ ...btnPrimary, justifyContent: "center", marginTop: "0.25rem" }} disabled={loading}>
        {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
        {loading ? "Saving..." : "Save Gateway"}
      </button>
    </form>
  );
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
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminApi.patch(`/payment-methods/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] }),
  });

  return (
    <AdminLayout title="Payment Methods" actions={
      <button style={btnPrimary} onClick={() => setShowAdd(true)}>
        <Plus size={14} /> Add Gateway
      </button>
    }>

      {isLoading ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "hsl(220,10%,42%)", fontSize: "13px" }}>Loading...</div>
      ) : methods.length === 0 ? (
        <div style={{ ...card, padding: "3rem", textAlign: "center" }}>
          <CreditCard size={36} style={{ color: "rgba(124,58,237,0.3)", marginBottom: "0.75rem" }} />
          <p style={{ color: "hsl(220,10%,42%)", fontSize: "13px", marginBottom: "12px" }}>No payment gateways yet.</p>
          <button style={btnPrimary} onClick={() => setShowAdd(true)}><Plus size={13} /> Add First Gateway</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {methods.map((m) => (
            <div
              key={m.id}
              data-testid={`card-payment-${m.name.toLowerCase().replace(/[\s/]/g, "-")}`}
              style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", gap: "12px" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "hsl(220,15%,13%)", color: "hsl(258,90%,66%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {getIcon(m.type)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210,40%,95%)", display: "flex", alignItems: "center", gap: "8px" }}>
                    {m.name}
                    <span style={{ padding: "1px 7px", borderRadius: "3px", fontSize: "10px", fontWeight: 500, background: m.mode === "live" ? "rgba(74,222,128,0.1)" : "rgba(251,191,36,0.1)", color: m.mode === "live" ? "hsl(142,71%,45%)" : "hsl(40,96%,60%)" }}>
                      {m.mode?.toUpperCase() ?? "TEST"}
                    </span>
                  </div>
                  <div style={{ fontSize: "11px", color: "hsl(220,10%,42%)", marginTop: "2px" }}>
                    {m.provider ?? m.type}
                    {m.supportedCurrencies ? ` — ${m.supportedCurrencies}` : ""}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                {/* Toggle */}
                <button
                  onClick={() => toggleMut.mutate({ id: m.id, isActive: !m.isActive })}
                  style={{ background: "none", border: "none", cursor: "pointer", color: m.isActive ? "hsl(142,71%,45%)" : "hsl(220,10%,38%)", display: "flex", alignItems: "center" }}
                  title={m.isActive ? "Disable" : "Enable"}
                >
                  {m.isActive ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                </button>
                <span style={{ fontSize: "11px", fontWeight: 500, color: m.isActive ? "hsl(142,71%,45%)" : "hsl(0,72%,51%)" }}>
                  {m.isActive ? "Active" : "Inactive"}
                </span>
                <button style={btnEdit} onClick={() => setEditPM(m)}><Pencil size={11} /> Edit</button>
                <button style={btnDanger} onClick={() => { if (confirm(`Delete "${m.name}"?`)) delMut.mutate(m.id); }}><Trash2 size={11} /></button>
              </div>
            </div>
          ))}
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
            initial={{
              name: editPM.name,
              type: editPM.type,
              provider: editPM.provider ?? "",
              publicKey: editPM.publicKey ?? "",
              secretKey: "",
              webhookSecret: "",
              mode: (editPM.mode as "test" | "live") ?? "test",
              supportedCurrencies: editPM.supportedCurrencies ?? "",
              isActive: editPM.isActive,
              sortOrder: editPM.sortOrder,
            }}
            onSubmit={(d) => editMut.mutate({ id: editPM.id, data: d })}
            loading={editMut.isPending}
          />
        </Modal>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AdminLayout>
  );
}
