import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, PlusCircle, X } from "lucide-react";
import AdminLayout, { useMobile } from "@/components/admin/AdminLayout";
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
  fontSize: "11px", fontWeight: 600, color: "hsl(var(--muted-foreground))", marginBottom: "4px",
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
  const [newStock, setNewStock] = useState("");
  const [editingStock, setEditingStock] = useState<Record<string, string>>({});

  const { data: packages = [] } = useQuery<ProductPackage[]>({
    queryKey: ["/api/admin/products", productId, "packages"],
    queryFn: () => adminApi.get(`/products/${productId}/packages`),
  });

  const addPkg = useMutation({
    mutationFn: () => adminApi.post(`/products/${productId}/packages`, {
      label: newLabel,
      price: newPrice,
      originalPrice: newOrigPrice || undefined,
      stock: newStock !== "" ? parseInt(newStock) : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/products", productId, "packages"] });
      setNewLabel(""); setNewPrice(""); setNewOrigPrice(""); setNewStock("");
    },
  });

  const delPkg = useMutation({
    mutationFn: (pkgId: string) => adminApi.delete(`/products/${productId}/packages/${pkgId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/products", productId, "packages"] }),
  });

  const patchStock = (pkgId: string, val: string) => {
    const stock = val === "" ? null : parseInt(val);
    adminApi.patch(`/products/${productId}/packages/${pkgId}`, { stock }).then(() =>
      qc.invalidateQueries({ queryKey: ["/api/admin/products", productId, "packages"] })
    );
  };

  return (
    <div style={{ marginTop: "1rem" }}>
      <label style={labelStyle}>Price Packages</label>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.6rem" }}>
        {packages.map((pkg) => {
          const stockVal = editingStock[pkg.id] !== undefined ? editingStock[pkg.id] : ((pkg as any).stock !== null && (pkg as any).stock !== undefined ? String((pkg as any).stock) : "");
          return (
            <div key={pkg.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px" }}>
              <span style={{ fontSize: "12px", color: "hsl(var(--foreground))" }}>{pkg.label}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {pkg.originalPrice && (
                  <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", textDecoration: "line-through" }}>${pkg.originalPrice}</span>
                )}
                <span style={{ fontSize: "12px", fontWeight: 700, color: "hsl(258,90%,72%)" }}>${pkg.price}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                  <span style={{ fontSize: "9px", color: "hsl(220,10%,40%)", textTransform: "uppercase" }}>Stock:</span>
                  <input
                    type="number" min="0"
                    value={stockVal}
                    placeholder="∞"
                    onChange={(e) => setEditingStock((p) => ({ ...p, [pkg.id]: e.target.value }))}
                    onBlur={() => { patchStock(pkg.id, stockVal); setEditingStock((p) => { const n = { ...p }; delete n[pkg.id]; return n; }); }}
                    style={{ ...inputStyle, width: "52px", padding: "2px 5px", fontSize: "11px", textAlign: "center" }}
                    title="Stock (blank = unlimited)"
                  />
                </div>
                <button onClick={() => delPkg.mutate(pkg.id)} style={{ ...btnDanger, padding: "2px 6px", fontSize: "11px" }}><X size={10} /></button>
              </div>
            </div>
          );
        })}
        {packages.length === 0 && (
          <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontStyle: "italic" }}>No packages yet.</p>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 70px 60px auto" : "1fr 90px 90px 70px auto", gap: "0.4rem", alignItems: "end" }}>
        <div>
          <label style={{ ...labelStyle, marginBottom: "2px" }}>Label</label>
          <input style={inputStyle} placeholder="e.g. $25 Gift Card" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
        </div>
        <div>
          <label style={{ ...labelStyle, marginBottom: "2px" }}>Price</label>
          <input style={inputStyle} type="number" placeholder="25.00" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
        </div>
        <div>
          <label style={{ ...labelStyle, marginBottom: "2px" }}>Orig</label>
          <input style={inputStyle} type="number" placeholder="Opt" value={newOrigPrice} onChange={(e) => setNewOrigPrice(e.target.value)} />
        </div>
        <div>
          <label style={{ ...labelStyle, marginBottom: "2px" }}>Stock</label>
          <input style={inputStyle} type="number" min="0" placeholder="∞" value={newStock} onChange={(e) => setNewStock(e.target.value)} />
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
        <textarea style={{ ...inputStyle, resize: "none", minHeight: "250px" } as any} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Short description..." />
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

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["/api/admin/products"] });
    qc.invalidateQueries({ queryKey: ["/api/products"] });
  };

  const addMut = useMutation({
    mutationFn: (d: any) => adminApi.post("/products", d),
    onSuccess: () => { invalidateAll(); setShowAdd(false); },
  });

  const editMut = useMutation({
    mutationFn: ({ id, ...d }: any) => adminApi.patch(`/products/${id}`, d),
    onSuccess: () => { invalidateAll(); setEditItem(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/products/${id}`),
    onSuccess: () => invalidateAll(),
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
        <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: "480px", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Title", "Status", "Sort", "Created", "Actions"].map((h) => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: "hsl(var(--muted-foreground))", padding: "2rem" }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5}><EmptyState message="No gift cards found." /></td></tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} data-testid={`row-giftcard-${p.id}`} style={{ borderBottom: "1px solid hsl(var(--input))" }}>
                  <td style={tdStyle}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      {p.imageUrl && <img src={p.imageUrl} alt="" style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover", border: "1px solid hsl(var(--border))" }} />}
                      <span style={{ fontWeight: 500, color: "hsl(var(--foreground))", fontSize: "13px" }}>{p.title}</span>
                    </div>
                  </td>
                  <td style={tdStyle}><StatusBadge value={p.isActive ? "active" : "inactive"} /></td>
                  <td style={{ ...tdStyle, color: "hsl(var(--muted-foreground))" }}>{p.sortOrder}</td>
                  <td style={{ ...tdStyle, color: "hsl(var(--muted-foreground))", fontSize: "12px" }}>{fmtDate(p.createdAt)}</td>
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
