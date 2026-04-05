import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, PlusCircle, X } from "lucide-react";
import AdminLayout, { useMobile } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import type { Product, ProductPackage } from "@shared/schema";
import {
  card, thStyle, tdStyle, btnPrimary, btnEdit, btnDanger,
  SearchInput, FilterSelect, StatusBadge, EmptyState, Toolbar, Modal,
  inputStyle as sharedInput,
} from "@/components/admin/shared";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

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

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  const y = dt.getFullYear();
  const mo = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  const h = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");
  return `${y}-${mo}-${day} ${h}:${mi}`;
}

function PackageManager({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const isMobile = useMobile(768);
  const [newLabel, setNewLabel] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newOrigPrice, setNewOrigPrice] = useState("");

  const { data: packages = [] } = useQuery<ProductPackage[]>({
    queryKey: ["/api/admin/products", productId, "packages"],
    queryFn: () => adminApi.get(`/products/${productId}/packages`),
  });

  const addPkg = useMutation({
    mutationFn: () => adminApi.post(`/products/${productId}/packages`, {
      label: newLabel, price: newPrice, originalPrice: newOrigPrice || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/products", productId, "packages"] });
      setNewLabel(""); setNewPrice(""); setNewOrigPrice("");
    },
  });

  const delPkg = useMutation({
    mutationFn: (pkgId: string) => adminApi.delete(`/products/${productId}/packages/${pkgId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/products", productId, "packages"] }),
  });

  return (
    <div style={{ marginTop: "1rem" }}>
      <label style={labelStyle}>Billing Tiers</label>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "0.6rem" }}>
        {packages.map((pkg) => (
          <div key={pkg.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "hsl(220,20%,12%)", border: "1px solid hsl(220,15%,18%)", borderRadius: "6px" }}>
            <span style={{ fontSize: "12px", color: "hsl(210,40%,85%)" }}>{pkg.label}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {pkg.originalPrice && <span style={{ fontSize: "11px", color: "hsl(220,10%,45%)", textDecoration: "line-through" }}>${pkg.originalPrice}</span>}
              <span style={{ fontSize: "12px", fontWeight: 700, color: "hsl(258,90%,72%)" }}>${pkg.price}</span>
              <button onClick={() => delPkg.mutate(pkg.id)} style={{ ...btnDanger, padding: "2px 6px", fontSize: "11px" }}><X size={10} /></button>
            </div>
          </div>
        ))}
        {packages.length === 0 && <p style={{ fontSize: "11px", color: "hsl(220,10%,38%)", fontStyle: "italic" }}>No tiers yet.</p>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 80px auto" : "1fr 90px 90px auto", gap: "0.4rem", alignItems: "end" }}>
        <div><label style={{ ...labelStyle, marginBottom: "2px" }}>Label</label><input style={inputStyle} placeholder="Monthly" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} /></div>
        <div><label style={{ ...labelStyle, marginBottom: "2px" }}>Price</label><input style={inputStyle} type="number" placeholder="9.99" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} /></div>
        <div><label style={{ ...labelStyle, marginBottom: "2px" }}>Orig</label><input style={inputStyle} type="number" placeholder="Optional" value={newOrigPrice} onChange={(e) => setNewOrigPrice(e.target.value)} /></div>
        <button type="button" onClick={() => { if (newLabel && newPrice) addPkg.mutate(); }} disabled={!newLabel || !newPrice || addPkg.isPending} style={{ ...btnPrimary, padding: "7px 10px", alignSelf: "end" }}><PlusCircle size={14} /></button>
      </div>
    </div>
  );
}

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
        <textarea style={{ ...inputStyle, resize: "none", minHeight: "250px" } as any} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="What's included in this plan..." />
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
      <ImageUploadField
        label="Image URL"
        value={form.imageUrl}
        onChange={(url) => set("imageUrl", url)}
        inputStyle={inputStyle}
        labelStyle={labelStyle}
      />
      {initial.id && <PackageManager productId={initial.id} />}
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
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return plans.filter((p) => {
      const matchSearch = !q || p.title.toLowerCase().includes(q);
      const matchStatus = !statusFilter || (statusFilter === "active" ? p.isActive : !p.isActive);
      return matchSearch && matchStatus;
    });
  }, [plans, search, statusFilter]);

  return (
    <AdminLayout title="Subscription Plans" actions={
      <button style={btnPrimary} onClick={() => setShowAdd(true)}><Plus size={14} /> Add Plan</button>
    }>

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
            <table style={{ width: "100%", minWidth: "560px", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["Plan Name", "Description", "Status", "Sort", "Created", "Actions"].map((h) => (
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
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(220,10%,45%)" }}>{fmtDate(p.createdAt)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "5px" }}>
                        <button style={btnEdit} onClick={() => setEditItem(p)}><Pencil size={11} /></button>
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
