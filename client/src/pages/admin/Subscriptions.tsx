import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import type { Product } from "@shared/schema";
import {
  card, thStyle, tdStyle, btnPrimary, btnEdit, btnDanger,
  SearchInput, FilterSelect, StatusBadge, EmptyState, Toolbar, Modal,
  inputStyle as sharedInput,
} from "@/components/admin/shared";

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

function SubForm({ initial, onSubmit, loading }: { initial: Partial<Product>; onSubmit: (d: any) => void; loading: boolean }) {
  const [form, setForm] = useState({
    title: initial.title ?? "",
    description: initial.description ?? "",
    imageUrl: initial.imageUrl ?? "",
    isActive: initial.isActive !== false,
    sortOrder: initial.sortOrder ?? 0,
  });
  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, category: "subscription" }); }} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <div>
        <label style={labelStyle}>Plan Name *</label>
        <input style={inputStyle} required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Pro Monthly" />
      </div>
      <div>
        <label style={labelStyle}>Description</label>
        <textarea style={{ ...inputStyle, resize: "vertical", minHeight: "60px" } as any} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What's included in this plan..." />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
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
        <label style={labelStyle}>Image URL</label>
        <input style={inputStyle} value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://..." />
      </div>
      <button type="submit" style={{ ...btnPrimary, justifyContent: "center" }} disabled={loading}>
        {loading ? "Saving..." : "Save Plan"}
      </button>
    </form>
  );
}

export default function Subscriptions() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Product | null>(null);

  const { data: allProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
    queryFn: () => adminApi.get("/products"),
  });

  const plans = useMemo(() => allProducts.filter((p) => p.category === "subscription"), [allProducts]);

  const addMut = useMutation({
    mutationFn: (d: any) => adminApi.post("/products", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/products"] }); setShowAdd(false); },
  });
  const editMut = useMutation({
    mutationFn: ({ id, data }: any) => adminApi.patch(`/products/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/products"] }); setEditItem(null); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/products"] }),
  });
  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => adminApi.patch(`/products/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/products"] }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return plans.filter((p) => {
      const matchSearch = !q || p.title.toLowerCase().includes(q);
      const matchStatus = !statusFilter || (statusFilter === "active" ? p.isActive : !p.isActive);
      return matchSearch && matchStatus;
    });
  }, [plans, search, statusFilter]);

  return (
    <AdminLayout title="Subscription Plans">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "14px" }}>
        <button style={btnPrimary} onClick={() => setShowAdd(true)}><Plus size={14} /> Add Plan</button>
      </div>

      <div style={card}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search plan name..." />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>
            {filtered.length} plan{filtered.length !== 1 ? "s" : ""}
          </span>
        </Toolbar>

        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "hsl(220,10%,42%)", fontSize: "13px" }}>Loading plans...</div>
          ) : filtered.length === 0 ? (
            <EmptyState message={plans.length === 0 ? "No subscription plans yet. Add your first plan." : "No plans match your filters."} />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["Plan Name", "Description", "Status", "Sort", "Actions"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td style={{ ...tdStyle, fontWeight: 500, color: "hsl(210, 40%, 95%)" }}>{p.title}</td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(220, 10%, 55%)", maxWidth: "220px" }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.description ?? "—"}
                      </span>
                    </td>
                    <td style={tdStyle}><StatusBadge value={p.isActive ? "active" : "inactive"} /></td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(220,10%,46%)" }}>{p.sortOrder}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "5px" }}>
                        <button style={btnEdit} onClick={() => setEditItem(p)}><Pencil size={11} /> Edit</button>
                        <button
                          style={p.isActive ? btnDanger : { ...btnDanger, background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)", color: "hsl(142,71%,48%)" }}
                          onClick={() => toggleMut.mutate({ id: p.id, isActive: !p.isActive })}
                          disabled={toggleMut.isPending}
                        >
                          {p.isActive ? "Disable" : "Enable"}
                        </button>
                        <button style={btnDanger} onClick={() => { if (confirm(`Delete "${p.title}"?`)) delMut.mutate(p.id); }}><Trash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showAdd && <Modal title="Add Subscription Plan" onClose={() => setShowAdd(false)}><SubForm initial={{}} onSubmit={(d) => addMut.mutate(d)} loading={addMut.isPending} /></Modal>}
      {editItem && <Modal title="Edit Subscription Plan" onClose={() => setEditItem(null)}><SubForm initial={editItem} onSubmit={(d) => editMut.mutate({ id: editItem.id, data: d })} loading={editMut.isPending} /></Modal>}
    </AdminLayout>
  );
}
