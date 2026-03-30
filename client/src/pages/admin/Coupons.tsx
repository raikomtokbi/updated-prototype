import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import AdminLayout, { useMobile } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import type { Coupon } from "@shared/schema";
import {
  card, thStyle, tdStyle, btnPrimary, btnEdit, btnDanger,
  SearchInput, FilterSelect, StatusBadge, EmptyState, Toolbar, Modal,
  inputStyle as sharedInput,
} from "@/components/admin/shared";

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "percentage", label: "Percentage" },
  { value: "fixed", label: "Fixed Amount" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const inputStyle: React.CSSProperties = { ...sharedInput, padding: "7px 10px", fontSize: "13px" };
const labelStyle: React.CSSProperties = {
  fontSize: "11px", fontWeight: 600, color: "hsl(220,10%,55%)", marginBottom: "4px",
  display: "block", textTransform: "uppercase", letterSpacing: "0.04em",
};

function CouponForm({ initial, onSubmit, loading }: { initial: Partial<Coupon>; onSubmit: (d: any) => void; loading: boolean }) {
  const isMobile = useMobile(768);
  const toDate = (d: Date | string | null | undefined) => {
    if (!d) return "";
    return new Date(d).toISOString().slice(0, 10);
  };
  const [form, setForm] = useState({
    code: initial.code ?? "",
    description: initial.description ?? "",
    discountType: initial.discountType ?? "percentage",
    discountValue: initial.discountValue ? String(initial.discountValue) : "",
    minOrderAmount: initial.minOrderAmount ? String(initial.minOrderAmount) : "",
    maxUses: initial.maxUses ? String(initial.maxUses) : "",
    isActive: initial.isActive !== false,
    expiresAt: toDate(initial.expiresAt),
  });
  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit({
        ...form,
        code: form.code.toUpperCase(),
        discountValue: parseFloat(form.discountValue) || 0,
        minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : null,
        maxUses: form.maxUses ? parseInt(form.maxUses) : null,
        expiresAt: form.expiresAt || null,
      });
    }} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Coupon Code *</label>
          <input style={{ ...inputStyle, textTransform: "uppercase", fontFamily: "monospace" }} required value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="SAVE20" />
        </div>
        <div>
          <label style={labelStyle}>Type</label>
          <select style={inputStyle} value={form.discountType} onChange={(e) => set("discountType", e.target.value)}>
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount ($)</option>
          </select>
        </div>
      </div>
      <div>
        <label style={labelStyle}>Description</label>
        <input style={inputStyle} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Optional description" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Discount Value *</label>
          <input style={inputStyle} required type="number" step="0.01" min="0" value={form.discountValue} onChange={(e) => set("discountValue", e.target.value)} placeholder={form.discountType === "percentage" ? "20" : "10.00"} />
        </div>
        <div>
          <label style={labelStyle}>Min Order ($)</label>
          <input style={inputStyle} type="number" step="0.01" min="0" value={form.minOrderAmount} onChange={(e) => set("minOrderAmount", e.target.value)} placeholder="0" />
        </div>
        <div>
          <label style={labelStyle}>Max Uses</label>
          <input style={inputStyle} type="number" min="1" value={form.maxUses} onChange={(e) => set("maxUses", e.target.value)} placeholder="Unlimited" />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Expires At</label>
          <input style={inputStyle} type="date" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={form.isActive ? "active" : "inactive"} onChange={(e) => set("isActive", e.target.value === "active")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <button type="submit" style={{ ...btnPrimary, justifyContent: "center" }} disabled={loading}>
        {loading ? "Saving..." : "Save Coupon"}
      </button>
    </form>
  );
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function Coupons() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Coupon | null>(null);

  const { data: coupons = [], isLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/admin/coupons"],
    queryFn: () => adminApi.get("/coupons"),
  });

  const addMut = useMutation({
    mutationFn: (d: any) => adminApi.post("/coupons", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/coupons"] }); setShowAdd(false); },
  });
  const editMut = useMutation({
    mutationFn: ({ id, data }: any) => adminApi.patch(`/coupons/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/coupons"] }); setEditItem(null); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/coupons/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/coupons"] }),
  });
  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminApi.patch(`/coupons/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/coupons"] }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return coupons.filter((c) => {
      const matchSearch = !q || c.code.toLowerCase().includes(q) || (c.description ?? "").toLowerCase().includes(q);
      const matchType = !typeFilter || c.discountType === typeFilter;
      const matchStatus = !statusFilter || (statusFilter === "active" ? c.isActive : !c.isActive);
      return matchSearch && matchType && matchStatus;
    });
  }, [coupons, search, typeFilter, statusFilter]);

  return (
    <AdminLayout title="Coupons" actions={
      <button style={btnPrimary} onClick={() => setShowAdd(true)}><Plus size={14} /> New Coupon</button>
    }>

      <div style={card}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search coupon code..." />
          <FilterSelect value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>
            {filtered.length} coupon{filtered.length !== 1 ? "s" : ""}
          </span>
        </Toolbar>

        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "hsl(220,10%,42%)", fontSize: "13px" }}>Loading coupons...</div>
          ) : filtered.length === 0 ? (
            <EmptyState message={coupons.length === 0 ? "No coupons yet. Create your first coupon." : "No coupons match your filters."} />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["Code", "Type", "Value", "Min Order", "Uses / Max", "Expires", "Status", "Actions"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "12px", color: "hsl(196, 100%, 60%)" }}>{c.code}</span>
                    </td>
                    <td style={tdStyle}><StatusBadge value={c.discountType} /></td>
                    <td style={{ ...tdStyle, fontWeight: 500, color: "hsl(258, 90%, 70%)" }}>
                      {c.discountType === "percentage" ? `${c.discountValue}%` : `$${Number(c.discountValue).toFixed(2)}`}
                    </td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(220, 10%, 55%)" }}>
                      {c.minOrderAmount ? `$${Number(c.minOrderAmount).toFixed(2)}` : "—"}
                    </td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(210, 40%, 80%)" }}>
                      {c.usedCount} / {c.maxUses ?? "∞"}
                    </td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(220, 10%, 46%)" }}>{formatDate(c.expiresAt)}</td>
                    <td style={tdStyle}><StatusBadge value={c.isActive ? "active" : "inactive"} /></td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "5px" }}>
                        <button style={btnEdit} onClick={() => setEditItem(c)}><Pencil size={11} /> Edit</button>
                        <button
                          style={c.isActive ? btnDanger : { ...btnDanger, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", color: "hsl(142,71%,48%)" }}
                          onClick={() => toggleMut.mutate({ id: c.id, isActive: !c.isActive })}
                          disabled={toggleMut.isPending}
                        >
                          {c.isActive ? "Disable" : "Enable"}
                        </button>
                        <button style={btnDanger} onClick={() => { if (confirm(`Delete coupon "${c.code}"?`)) delMut.mutate(c.id); }}><Trash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showAdd && <Modal title="New Coupon" onClose={() => setShowAdd(false)}><CouponForm initial={{}} onSubmit={(d) => addMut.mutate(d)} loading={addMut.isPending} /></Modal>}
      {editItem && <Modal title="Edit Coupon" onClose={() => setEditItem(null)}><CouponForm initial={editItem} onSubmit={(d) => editMut.mutate({ id: editItem.id, data: d })} loading={editMut.isPending} /></Modal>}
    </AdminLayout>
  );
}
