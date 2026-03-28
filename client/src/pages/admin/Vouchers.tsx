import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import type { Product } from "@shared/schema";
import {
  card, thStyle, tdStyle, btnPrimary, btnEdit, btnDanger,
  SearchInput, FilterSelect, StatusBadge, EmptyState, Toolbar, Modal,
  inputStyle as sharedInputStyle,
} from "@/components/admin/shared";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

const CATEGORY_OPTIONS = [
  { value: "", label: "All Categories" },
  { value: "gift_card", label: "Gift Card" },
  { value: "voucher", label: "Voucher" },
  { value: "subscription", label: "Subscription" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const inputStyle: React.CSSProperties = {
  ...sharedInputStyle,
  padding: "7px 10px",
  fontSize: "13px",
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

const VOUCHER_CATEGORIES = ["gift_card", "voucher", "subscription"];

function ProductForm({
  initial,
  onSubmit,
  loading,
}: {
  initial: Partial<Product>;
  onSubmit: (d: any) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    title: initial.title ?? "",
    description: initial.description ?? "",
    category: initial.category ?? "gift_card",
    imageUrl: initial.imageUrl ?? "",
    isActive: initial.isActive !== false,
    sortOrder: initial.sortOrder ?? 0,
  });
  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <div>
        <label style={labelStyle}>Title *</label>
        <input style={inputStyle} required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Netflix 1 Month" />
      </div>
      <div>
        <label style={labelStyle}>Description</label>
        <textarea style={{ ...inputStyle, resize: "vertical", minHeight: "60px" } as any} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Short description..." />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Category</label>
          <select style={inputStyle} value={form.category} onChange={(e) => set("category", e.target.value)}>
            <option value="gift_card">Gift Card</option>
            <option value="voucher">Voucher</option>
            <option value="subscription">Subscription</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={form.isActive ? "active" : "inactive"} onChange={(e) => set("isActive", e.target.value === "active")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <ImageUploadField
        label="Image URL"
        value={form.imageUrl}
        onChange={(url) => set("imageUrl", url)}
        inputStyle={inputStyle}
        labelStyle={labelStyle}
      />
      <div>
        <label style={labelStyle}>Sort Order</label>
        <input style={inputStyle} type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", parseInt(e.target.value) || 0)} />
      </div>
      <button type="submit" style={{ ...btnPrimary, justifyContent: "center" }} disabled={loading}>
        {loading ? "Saving..." : "Save Product"}
      </button>
    </form>
  );
}

export default function Vouchers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);

  const { data: allProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
    queryFn: () => adminApi.get("/products"),
  });

  const products = useMemo(() =>
    allProducts.filter((p) => VOUCHER_CATEGORIES.includes(p.category)),
    [allProducts]
  );

  const addMut = useMutation({
    mutationFn: (d: any) => adminApi.post("/products", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/products"] }); setShowAdd(false); },
  });
  const editMut = useMutation({
    mutationFn: ({ id, data }: any) => adminApi.patch(`/products/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/products"] }); setEditProduct(null); },
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
    return products.filter((p) => {
      const matchSearch = !q || p.title.toLowerCase().includes(q);
      const matchCat = !catFilter || p.category === catFilter;
      const matchStatus = !statusFilter || (statusFilter === "active" ? p.isActive : !p.isActive);
      return matchSearch && matchCat && matchStatus;
    });
  }, [products, search, catFilter, statusFilter]);

  return (
    <AdminLayout title="Vouchers & Gift Cards">
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "14px" }}>
        <button style={btnPrimary} onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add Product
        </button>
      </div>

      <div style={card}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name..." />
          <FilterSelect value={catFilter} onChange={setCatFilter} options={CATEGORY_OPTIONS} />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>
            {filtered.length} product{filtered.length !== 1 ? "s" : ""}
          </span>
        </Toolbar>

        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "hsl(220,10%,42%)", fontSize: "13px" }}>Loading products...</div>
          ) : filtered.length === 0 ? (
            <EmptyState message={products.length === 0 ? "No vouchers or gift cards yet. Add your first product." : "No products match your filters."} />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["Title", "Category", "Status", "Sort", "Actions"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td style={{ ...tdStyle, fontWeight: 500, color: "hsl(210, 40%, 95%)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.title} style={{ width: "28px", height: "28px", borderRadius: "4px", objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: "28px", height: "28px", borderRadius: "4px", background: "rgba(124,58,237,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>🎁</div>
                        )}
                        {p.title}
                      </div>
                    </td>
                    <td style={tdStyle}><StatusBadge value={p.category} /></td>
                    <td style={tdStyle}><StatusBadge value={p.isActive ? "active" : "inactive"} /></td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(220,10%,46%)" }}>{p.sortOrder}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "5px" }}>
                        <button style={btnEdit} onClick={() => setEditProduct(p)}><Pencil size={11} /> Edit</button>
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

      {showAdd && (
        <Modal title="Add Product" onClose={() => setShowAdd(false)}>
          <ProductForm initial={{}} onSubmit={(d) => addMut.mutate(d)} loading={addMut.isPending} />
        </Modal>
      )}
      {editProduct && (
        <Modal title="Edit Product" onClose={() => setEditProduct(null)}>
          <ProductForm initial={editProduct} onSubmit={(d) => editMut.mutate({ id: editProduct.id, data: d })} loading={editMut.isPending} />
        </Modal>
      )}
    </AdminLayout>
  );
}
