import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plug, CheckCircle, XCircle, Plus, Pencil, Trash2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import type { PaymentMethod } from "@shared/schema";
import {
  card, btnPrimary, btnEdit, btnDanger, Modal,
  inputStyle as sharedInput, StatusBadge,
} from "@/components/admin/shared";

const inputStyle: React.CSSProperties = { ...sharedInput, padding: "7px 10px", fontSize: "13px" };
const labelStyle: React.CSSProperties = {
  fontSize: "11px", fontWeight: 600, color: "hsl(220,10%,55%)", marginBottom: "4px",
  display: "block", textTransform: "uppercase", letterSpacing: "0.04em",
};

const STATIC_APIS = [
  { name: "SMTP Email Service", key: "Configure in .env: SMTP_HOST", status: "unconfigured", note: "Used for transactional emails" },
  { name: "SMS Provider", key: "Configure in .env: SMS_API_KEY", status: "unconfigured", note: "Used for OTP & notifications" },
  { name: "Game Data API", key: "Configure in .env: GAME_API_KEY", status: "unconfigured", note: "Used for live game data" },
  { name: "Push Notifications (FCM)", key: "Configure in .env: FCM_SERVER_KEY", status: "unconfigured", note: "Used for push alerts" },
];

function PaymentMethodForm({ initial, onSubmit, loading }: { initial: Partial<PaymentMethod>; onSubmit: (d: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    name: initial.name ?? "",
    type: initial.type ?? "card",
    provider: initial.provider ?? "",
    publicKey: initial.publicKey ?? "",
    secretKey: initial.secretKey ?? "",
    webhookSecret: initial.webhookSecret ?? "",
    mode: initial.mode ?? "test",
    supportedCurrencies: initial.supportedCurrencies ?? "USD",
    isActive: initial.isActive !== false,
    sortOrder: initial.sortOrder ?? 0,
  });
  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Name *</label>
          <input style={inputStyle} required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Stripe" />
        </div>
        <div>
          <label style={labelStyle}>Type</label>
          <select style={inputStyle} value={form.type} onChange={(e) => set("type", e.target.value)}>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="ewallet">E-Wallet</option>
            <option value="crypto">Crypto</option>
            <option value="manual">Manual</option>
          </select>
        </div>
      </div>
      <div>
        <label style={labelStyle}>Provider</label>
        <input style={inputStyle} value={form.provider} onChange={(e) => set("provider", e.target.value)} placeholder="Stripe, PayPal, Midtrans..." />
      </div>
      <div>
        <label style={labelStyle}>Public Key</label>
        <input style={inputStyle} value={form.publicKey} onChange={(e) => set("publicKey", e.target.value)} placeholder="pk_..." />
      </div>
      <div>
        <label style={labelStyle}>Secret Key</label>
        <input style={{ ...inputStyle, fontFamily: "monospace" }} type="password" value={form.secretKey} onChange={(e) => set("secretKey", e.target.value)} placeholder="sk_..." />
      </div>
      <div>
        <label style={labelStyle}>Webhook Secret</label>
        <input style={{ ...inputStyle, fontFamily: "monospace" }} type="password" value={form.webhookSecret} onChange={(e) => set("webhookSecret", e.target.value)} placeholder="whsec_..." />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
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
        <input style={inputStyle} value={form.supportedCurrencies} onChange={(e) => set("supportedCurrencies", e.target.value)} placeholder="USD, EUR, IDR" />
      </div>
      <button type="submit" style={{ ...btnPrimary, justifyContent: "center" }} disabled={loading}>
        {loading ? "Saving..." : "Save Payment Method"}
      </button>
    </form>
  );
}

export default function ApiIntegration() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<PaymentMethod | null>(null);

  const { data: paymentMethods = [], isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/admin/payment-methods"],
    queryFn: () => adminApi.get("/payment-methods"),
  });

  const addMut = useMutation({
    mutationFn: (d: any) => adminApi.post("/payment-methods", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] }); setShowAdd(false); },
  });
  const editMut = useMutation({
    mutationFn: ({ id, data }: any) => adminApi.put(`/payment-methods/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/payment-methods"] }); setEditItem(null); },
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
    <AdminLayout title="API Integration">
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Payment Gateways */}
        <div style={card}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>Payment Gateways</span>
              <p style={{ fontSize: "11px", color: "hsl(220,10%,42%)", margin: "2px 0 0" }}>Configure payment providers for checkout</p>
            </div>
            <button style={btnPrimary} onClick={() => setShowAdd(true)}><Plus size={13} /> Add Gateway</button>
          </div>

          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "hsl(220,10%,42%)", fontSize: "13px" }}>Loading payment methods...</div>
          ) : paymentMethods.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center" }}>
              <div style={{ fontSize: "24px", marginBottom: "8px", opacity: 0.3 }}>💳</div>
              <p style={{ color: "hsl(220,10%,40%)", fontSize: "13px", marginBottom: "12px" }}>No payment gateways configured yet.</p>
              <button style={btnPrimary} onClick={() => setShowAdd(true)}><Plus size={13} /> Add First Gateway</button>
            </div>
          ) : (
            <div style={{ padding: "0 20px" }}>
              {paymentMethods.map((pm, i) => (
                <div key={pm.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: i < paymentMethods.length - 1 ? "1px solid hsl(220, 15%, 12%)" : "none", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: pm.isActive ? "rgba(124,58,237,0.12)" : "rgba(239,68,68,0.08)", color: pm.isActive ? "hsl(258,90%,66%)" : "hsl(0,72%,51%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Plug size={16} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 90%)" }}>{pm.name}</span>
                        <StatusBadge value={pm.mode} />
                        <StatusBadge value={pm.type} />
                      </div>
                      <div style={{ fontSize: "11px", color: "hsl(220, 10%, 38%)", marginTop: "2px" }}>
                        {pm.provider ?? "—"} • Currencies: {pm.supportedCurrencies ?? "—"} • Sort: {pm.sortOrder}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      {pm.isActive ? <CheckCircle size={13} color="hsl(142, 71%, 45%)" /> : <XCircle size={13} color="hsl(0, 72%, 51%)" />}
                      <span style={{ fontSize: "12px", color: pm.isActive ? "hsl(142, 71%, 45%)" : "hsl(0, 72%, 51%)" }}>{pm.isActive ? "Active" : "Inactive"}</span>
                    </div>
                    <div style={{ display: "flex", gap: "5px" }}>
                      <button style={btnEdit} onClick={() => setEditItem(pm)}><Pencil size={11} /> Edit</button>
                      <button
                        style={pm.isActive ? btnDanger : { ...btnDanger, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", color: "hsl(142,71%,48%)" }}
                        onClick={() => toggleMut.mutate({ id: pm.id, isActive: !pm.isActive })}
                        disabled={toggleMut.isPending}
                      >
                        {pm.isActive ? "Disable" : "Enable"}
                      </button>
                      <button style={btnDanger} onClick={() => { if (confirm(`Delete "${pm.name}"?`)) delMut.mutate(pm.id); }}><Trash2 size={11} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Other integrations (static info) */}
        <div style={card}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>Other Integrations</span>
            <p style={{ fontSize: "11px", color: "hsl(220,10%,42%)", margin: "4px 0 0" }}>Configure these via environment variables in your deployment settings</p>
          </div>
          <div style={{ padding: "0 20px" }}>
            {STATIC_APIS.map((api, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", borderBottom: i < STATIC_APIS.length - 1 ? "1px solid hsl(220, 15%, 12%)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: "hsl(220, 15%, 13%)", color: "hsl(220, 10%, 40%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Plug size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "hsl(210, 40%, 85%)" }}>{api.name}</div>
                    <div style={{ fontSize: "11px", color: "hsl(220, 10%, 38%)", marginTop: "2px" }}>{api.note}</div>
                    <div style={{ fontSize: "10px", fontFamily: "monospace", color: "hsl(220, 10%, 30%)", marginTop: "2px" }}>{api.key}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <XCircle size={13} color="hsl(220, 10%, 35%)" />
                  <span style={{ fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>Not configured</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAdd && (
        <Modal title="Add Payment Gateway" onClose={() => setShowAdd(false)}>
          <PaymentMethodForm initial={{}} onSubmit={(d) => addMut.mutate(d)} loading={addMut.isPending} />
        </Modal>
      )}
      {editItem && (
        <Modal title="Edit Payment Gateway" onClose={() => setEditItem(null)}>
          <PaymentMethodForm initial={editItem} onSubmit={(d) => editMut.mutate({ id: editItem.id, data: d })} loading={editMut.isPending} />
        </Modal>
      )}
    </AdminLayout>
  );
}
