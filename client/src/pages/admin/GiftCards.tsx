import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, PlusCircle, X } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import type { Product, ProductPackage } from "@shared/schema";
import {
  card, thStyle, tdStyle, btnPrimary, btnEdit, btnDanger,
  SearchInput, FilterSelect, StatusBadge, EmptyState, Toolbar, Modal,
  inputStyle as sharedInputStyle,
} from "@/components/admin/shared";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const inputStyle: React.CSSProperties = { ...sharedInputStyle, padding: "7px 10px", fontSize: "13px" };
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
  const [newLabel, setNewLabel] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newOrigPrice, setNewOrigPrice] = useState("");

  const { data: packages = [] } = useQuery<ProductPackage[]>({
    queryKey: ["/api/admin/products", productId, "packages"],
    queryFn: () => adminApi.get(`/products/${productId}/packages`),
  });

  const addPkg = useMutation({
    mutationFn: () => adminApi.post(`/products/${productId}/packages`, {
      label: newLabel,
      price: newPrice,
      originalPrice: newOrigPrice || undefined,
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
      <label style={labelStyle}>Price Packages</label>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.6rem" }}>
        {packages.map((pkg) => (
          <div key={pkg.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "hsl(220,20%,12%)", border: "1px solid hsl(220,15%,18%)", borderRadius: "6px" }}>
            <span style={{ fontSize: "12px", color: "hsl(210,40%,85%)" }}>{pkg.label}</span>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {pkg.originalPrice && (
                <span style={{ fontSize: "11px", color: "hsl(220,10%,45%)", textDecoration: "line-through" }}>${pkg.originalPrice}</span>
              )}
              <span style={{ fontSize: "12px", fontWeight: 700, color: "hsl(258,90%,72%)" }}>${pkg.price}</span>
              <button
                onClick={() => delPkg.mutate(pkg.id)}
                style={{ ...btnDanger, padding: "2px 6px", fontSize: "11px" }}
              >
                <X size={10} />
              </button>
            </div>
          </div>
        ))}
        {packages.length === 0 && (
          <p style={{ fontSize: "11px", color: "hsl(220,10%,38%)", fontStyle: "italic" }}>No packages yet.</p>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px auto", gap: "0.4rem", alignItems: "end" }}>
        <div>
          <label style={{ ...labelStyle, marginBottom: "2px" }}>Label</label>
          <input style={inputStyle} placeholder="e.g. $25 Gift Card" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
        </div>
        <div>
          <label style={{ ...labelStyle, marginBottom: "2px" }}>Price</label>
          <input style={inputStyle} type="number" placeholder="25.00" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
        </div>
        <div>
          <label style={{ ...labelStyle, marginBottom: "2px" }}>Orig Price</label>
          <input style={inputStyle} type="number" placeholder="Optional" value={newOrigPrice} onChange={(e) => setNewOrigPrice(e.target.value)} />
        </div>
        <button
          type="button"
          onClick={() => { if (newLabel && newPrice) addPkg.mutate(); }}
          disabled={!newLabel || !newPrice || addPkg.isPending}
          style={{ ...btnPrimary, padding: "7px 10px", alignSelf: "end" }}
        >
          <PlusCircle size={14} />
        </button>
      </div>
    </div>
  );
}

function GiftCardForm({
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
    imageUrl: initial.imageUrl ?? "",
    isActive: initial.isActive !== false,
    sortOrder: initial.sortOrder ?? 0,
  });
  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ ...form, category: "gift_card" }); }} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <div>
        <label style={labelStyle}>Title *</label>
        <input style={inputStyle} required value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Netflix Gift Card" />
      </div>
      <div>
        <label style={labelStyle}>Description</label>
        <textarea style={{ ...inputStyle, resize: "vertical", minHeight: "60px" } as any} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Short description..." />
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
      <ImageUploadField label="Image" value={form.imageUrl} onChange={(url) => set("imageUrl", url)} inputStyle={inputStyle} labelStyle={labelStyle} />
      {initial.id && <PackageManager productId={initial.id} />}
      <button type="submit" style={{ ...btnPrimary, justifyContent: "center" }} disabled={loading}>
        {loading ? "Saving..." : "Save Gift Card"}
      </button>
    </form>
  );
}

export default function GiftCards() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<Product | null>(null);

  const { data: allProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
    queryFn: () => adminApi.get("/products"),
  });

  const giftCards = useMemo(() => allProducts.filter((p) => p.category === "gift_card"), [allProducts]);

  const addMut = useMutation({
    mutationFn: (d: any) => adminApi.post("/products", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/products"] }); setShowAdd(false); },
  });

  const editMut = useMutation({
    mutationFn: ({ id, ...d }: any) => adminApi.patch(`/products/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/products"] }); setEditItem(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/products"] }),
  });

  const filtered = useMemo(() => {
    return giftCards.filter((p) => {
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
      const matchStatus = !statusFilter || (statusFilter === "active" ? p.isActive : !p.isActive);
      return matchSearch && matchStatus;
    });
  }, [giftCards, search, statusFilter]);

  return (
    <AdminLayout title="Gift Cards" actions={
      <button style={btnPrimary} onClick={() => setShowAdd(true)} data-testid="button-add-gift-card">
        <Plus size={14} /> Add Gift Card
      </button>
    }>
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search gift cards..." />
        <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
      </Toolbar>

      <div style={card}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Title", "Status", "Sort", "Created", "Actions"].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: "hsl(220,10%,45%)", padding: "2rem" }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5}><EmptyState message="No gift cards found." /></td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} data-testid={`row-giftcard-${p.id}`} style={{ borderBottom: "1px solid hsl(220,15%,12%)" }}>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      {p.imageUrl && <img src={p.imageUrl} alt="" style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover", border: "1px solid hsl(220,15%,18%)" }} />}
                      <span style={{ fontWeight: 500, color: "hsl(210,40%,88%)", fontSize: "13px" }}>{p.title}</span>
                    </div>
                  </td>
                  <td style={tdStyle}><StatusBadge value={p.isActive ? "active" : "inactive"} /></td>
                  <td style={{ ...tdStyle, color: "hsl(220,10%,55%)" }}>{p.sortOrder}</td>
                  <td style={{ ...tdStyle, color: "hsl(220,10%,45%)", fontSize: "12px" }}>{fmtDate(p.createdAt)}</td>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button style={btnEdit} onClick={() => setEditItem(p)} data-testid={`button-edit-${p.id}`}>
                        <Pencil size={13} />
                      </button>
                      <button style={btnDanger} onClick={() => { if (confirm("Delete this gift card?")) deleteMut.mutate(p.id); }} data-testid={`button-delete-${p.id}`}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <Modal title="Add Gift Card" onClose={() => setShowAdd(false)}>
          <GiftCardForm initial={{}} onSubmit={(d) => addMut.mutate(d)} loading={addMut.isPending} />
        </Modal>
      )}

      {editItem && (
        <Modal title="Edit Gift Card" onClose={() => setEditItem(null)}>
          <GiftCardForm initial={editItem} onSubmit={(d) => editMut.mutate({ id: editItem.id, ...d })} loading={editMut.isPending} />
        </Modal>
      )}
    </AdminLayout>
  );
}
