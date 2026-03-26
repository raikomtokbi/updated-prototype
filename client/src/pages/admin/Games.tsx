import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import type { Game, Service } from "@shared/schema";

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
  padding: "5px 10px",
  borderRadius: "5px",
  background: "rgba(124,58,237,0.1)",
  border: "1px solid rgba(124,58,237,0.25)",
  color: "#a78bfa",
  fontSize: "11px",
  cursor: "pointer",
};
const statusBadge = (active: boolean): React.CSSProperties => ({
  padding: "2px 8px",
  borderRadius: "4px",
  fontSize: "11px",
  fontWeight: 500,
  background: active ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.12)",
  color: active ? "hsl(142,71%,45%)" : "hsl(0,72%,51%)",
});

const EMPTY_GAME = { name: "", slug: "", description: "", logoUrl: "", bannerUrl: "", category: "game_currency", status: "active", sortOrder: 0 };
const EMPTY_SERVICE = { name: "", description: "", imageUrl: "", price: "", discountPercent: "0", finalPrice: "", currency: "USD", status: "active", sortOrder: 0 };

// ─── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: "520px", maxHeight: "85vh", overflowY: "auto", background: "hsl(220,22%,8%)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "10px", padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "hsl(210,40%,95%)", margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "hsl(220,10%,50%)", cursor: "pointer" }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Game Form ────────────────────────────────────────────────────────────────
function GameForm({ initial, onSubmit, loading }: { initial: typeof EMPTY_GAME; onSubmit: (d: any) => void; loading: boolean }) {
  const [form, setForm] = useState(initial);
  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Name *</label>
          <input style={inputStyle} required value={form.name} onChange={(e) => { set("name", e.target.value); set("slug", e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")); }} placeholder="Mobile Legends" />
        </div>
        <div>
          <label style={labelStyle}>Slug *</label>
          <input style={inputStyle} required value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="mobile-legends" />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Description</label>
        <textarea style={{ ...inputStyle, resize: "vertical", minHeight: "70px" }} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Short description..." />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Logo URL</label>
          <input style={inputStyle} value={form.logoUrl ?? ""} onChange={(e) => set("logoUrl", e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <label style={labelStyle}>Banner URL</label>
          <input style={inputStyle} value={form.bannerUrl ?? ""} onChange={(e) => set("bannerUrl", e.target.value)} placeholder="https://..." />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Category</label>
          <select style={inputStyle} value={form.category} onChange={(e) => set("category", e.target.value)}>
            <option value="game_currency">Game Currency</option>
            <option value="gift_card">Gift Card</option>
            <option value="voucher">Voucher</option>
            <option value="subscription">Subscription</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Sort Order</label>
          <input style={inputStyle} type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", parseInt(e.target.value) || 0)} />
        </div>
      </div>
      <button type="submit" style={{ ...btnPrimary, marginTop: "0.25rem", justifyContent: "center" }} disabled={loading}>
        {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
        {loading ? "Saving..." : "Save Game"}
      </button>
    </form>
  );
}

// ─── Service Form ─────────────────────────────────────────────────────────────
function ServiceForm({ initial, onSubmit, loading }: { initial: typeof EMPTY_SERVICE; onSubmit: (d: any) => void; loading: boolean }) {
  const [form, setForm] = useState(initial);
  const set = (k: string, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  function computeFinal(price: string, disc: string) {
    const p = parseFloat(price) || 0;
    const d = parseFloat(disc) || 0;
    return (p * (1 - d / 100)).toFixed(2);
  }

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit({ ...form, finalPrice: form.finalPrice || computeFinal(form.price, form.discountPercent) });
    }} style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
      <div>
        <label style={labelStyle}>Name *</label>
        <input style={inputStyle} required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="100 UC" />
      </div>
      <div>
        <label style={labelStyle}>Description</label>
        <input style={inputStyle} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="100 Unknown Cash for PUBG Mobile" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.7rem" }}>
        <div>
          <label style={labelStyle}>Price *</label>
          <input style={inputStyle} required type="number" step="0.01" value={form.price} onChange={(e) => {
            set("price", e.target.value);
            set("finalPrice", computeFinal(e.target.value, form.discountPercent));
          }} placeholder="9.99" />
        </div>
        <div>
          <label style={labelStyle}>Discount %</label>
          <input style={inputStyle} type="number" step="0.01" min="0" max="100" value={form.discountPercent} onChange={(e) => {
            set("discountPercent", e.target.value);
            set("finalPrice", computeFinal(form.price, e.target.value));
          }} placeholder="0" />
        </div>
        <div>
          <label style={labelStyle}>Final Price</label>
          <input style={inputStyle} type="number" step="0.01" value={form.finalPrice} onChange={(e) => set("finalPrice", e.target.value)} placeholder="auto" />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.7rem" }}>
        <div>
          <label style={labelStyle}>Currency</label>
          <select style={inputStyle} value={form.currency} onChange={(e) => set("currency", e.target.value)}>
            <option>USD</option><option>EUR</option><option>IDR</option><option>MYR</option><option>SGD</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={form.status} onChange={(e) => set("status", e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Sort Order</label>
          <input style={inputStyle} type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", parseInt(e.target.value) || 0)} />
        </div>
      </div>
      <button type="submit" style={{ ...btnPrimary, justifyContent: "center" }} disabled={loading}>
        {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
        {loading ? "Saving..." : "Save Service"}
      </button>
    </form>
  );
}

// ─── Services sub-panel ───────────────────────────────────────────────────────
function ServicesPanel({ game }: { game: Game }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editSvc, setEditSvc] = useState<Service | null>(null);

  const { data: svcs = [], isLoading } = useQuery<Service[]>({
    queryKey: [`/api/admin/services?gameId=${game.id}`],
    queryFn: () => adminApi.get(`/services?gameId=${game.id}`),
  });

  const addMut = useMutation({
    mutationFn: (d: any) => adminApi.post("/services", { ...d, gameId: game.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [`/api/admin/services?gameId=${game.id}`] }); setShowAdd(false); },
  });
  const editMut = useMutation({
    mutationFn: ({ id, data }: any) => adminApi.patch(`/services/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [`/api/admin/services?gameId=${game.id}`] }); setEditSvc(null); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/services/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [`/api/admin/services?gameId=${game.id}`] }),
  });

  return (
    <div style={{ padding: "0 16px 16px", marginTop: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "hsl(220,10%,55%)" }}>Services / Top-up Options</span>
        <button style={btnPrimary} onClick={() => setShowAdd(true)}><Plus size={12} /> Add Service</button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "1rem", color: "hsl(220,10%,42%)", fontSize: "12px" }}>Loading...</div>
      ) : svcs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "1rem", color: "hsl(220,10%,38%)", fontSize: "12px", border: "1px dashed hsl(220,15%,18%)", borderRadius: "6px" }}>
          No services yet. Add your first top-up option.
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr>
                {["Name", "Price", "Discount", "Final", "Currency", "Status", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em", color: "hsl(220,10%,38%)", borderBottom: "1px solid hsl(220,15%,13%)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {svcs.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid hsl(220,15%,11%)" }}>
                  <td style={{ padding: "8px 10px", fontWeight: 500, color: "hsl(210,40%,90%)" }}>{s.name}</td>
                  <td style={{ padding: "8px 10px", color: "hsl(210,40%,70%)" }}>{s.price}</td>
                  <td style={{ padding: "8px 10px", color: "hsl(220,10%,55%)" }}>{s.discountPercent}%</td>
                  <td style={{ padding: "8px 10px", color: "#a78bfa", fontWeight: 600 }}>{s.finalPrice}</td>
                  <td style={{ padding: "8px 10px", color: "hsl(220,10%,55%)" }}>{s.currency}</td>
                  <td style={{ padding: "8px 10px" }}><span style={statusBadge(s.status === "active")}>{s.status}</span></td>
                  <td style={{ padding: "8px 10px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button style={btnEdit} onClick={() => setEditSvc(s)}><Pencil size={11} /></button>
                      <button style={btnDanger} onClick={() => { if (confirm("Delete this service?")) delMut.mutate(s.id); }}><Trash2 size={11} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <Modal title="Add Service" onClose={() => setShowAdd(false)}>
          <ServiceForm initial={EMPTY_SERVICE} onSubmit={(d) => addMut.mutate(d)} loading={addMut.isPending} />
        </Modal>
      )}
      {editSvc && (
        <Modal title="Edit Service" onClose={() => setEditSvc(null)}>
          <ServiceForm
            initial={{ name: editSvc.name, description: editSvc.description ?? "", imageUrl: editSvc.imageUrl ?? "", price: String(editSvc.price), discountPercent: String(editSvc.discountPercent), finalPrice: String(editSvc.finalPrice), currency: editSvc.currency, status: editSvc.status, sortOrder: editSvc.sortOrder }}
            onSubmit={(d) => editMut.mutate({ id: editSvc.id, data: d })}
            loading={editMut.isPending}
          />
        </Modal>
      )}
    </div>
  );
}

// ─── Main Games page ──────────────────────────────────────────────────────────
export default function Games() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editGame, setEditGame] = useState<Game | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: gameList = [], isLoading } = useQuery<Game[]>({
    queryKey: ["/api/admin/games"],
    queryFn: () => adminApi.get("/games"),
  });

  const addMut = useMutation({
    mutationFn: (d: any) => adminApi.post("/games", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/games"] }); setShowAdd(false); },
  });
  const editMut = useMutation({
    mutationFn: ({ id, data }: any) => adminApi.patch(`/games/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/games"] }); setEditGame(null); },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/games/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/games"] }),
  });

  return (
    <AdminLayout title="Games">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <h2 style={{ fontSize: "15px", fontWeight: 700, color: "hsl(210,40%,95%)", margin: 0 }}>All Games</h2>
          <p style={{ fontSize: "12px", color: "hsl(220,10%,42%)", margin: "2px 0 0" }}>{gameList.length} game{gameList.length !== 1 ? "s" : ""} total</p>
        </div>
        <button style={btnPrimary} onClick={() => setShowAdd(true)}>
          <Plus size={14} /> Add Game
        </button>
      </div>

      <div style={card}>
        {isLoading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "hsl(220,10%,42%)", fontSize: "13px" }}>Loading games...</div>
        ) : gameList.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <p style={{ color: "hsl(220,10%,42%)", fontSize: "13px", marginBottom: "12px" }}>No games yet. Add your first game to get started.</p>
            <button style={btnPrimary} onClick={() => setShowAdd(true)}><Plus size={13} /> Add First Game</button>
          </div>
        ) : (
          <div>
            {gameList.map((g, idx) => (
              <div key={g.id} style={{ borderBottom: idx < gameList.length - 1 ? "1px solid hsl(220,15%,11%)" : "none" }}>
                {/* Game row */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", cursor: "pointer" }}
                  onClick={() => setExpandedId(expandedId === g.id ? null : g.id)}
                >
                  {/* Expand icon */}
                  <span style={{ color: "hsl(220,10%,42%)", flexShrink: 0 }}>
                    {expandedId === g.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>

                  {/* Logo */}
                  {g.logoUrl ? (
                    <img src={g.logoUrl} alt={g.name} style={{ width: "34px", height: "34px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: "34px", height: "34px", borderRadius: "6px", background: "rgba(124,58,237,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: "14px" }}>🎮</span>
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "13px", color: "hsl(210,40%,95%)" }}>{g.name}</div>
                    <div style={{ fontSize: "11px", color: "hsl(220,10%,42%)" }}>{g.slug} &bull; {g.category}</div>
                  </div>

                  <span style={statusBadge(g.status === "active")}>{g.status}</span>

                  <div style={{ display: "flex", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                    <button style={btnEdit} onClick={() => setEditGame(g)}><Pencil size={11} /> Edit</button>
                    <button style={btnDanger} onClick={() => { if (confirm(`Delete "${g.name}"? This will also delete all its services.`)) delMut.mutate(g.id); }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                {/* Services panel */}
                {expandedId === g.id && (
                  <div style={{ background: "hsl(220,20%,7%)", borderTop: "1px solid hsl(220,15%,11%)" }}>
                    <ServicesPanel game={g} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <Modal title="Add Game" onClose={() => setShowAdd(false)}>
          <GameForm initial={EMPTY_GAME} onSubmit={(d) => addMut.mutate(d)} loading={addMut.isPending} />
        </Modal>
      )}
      {editGame && (
        <Modal title="Edit Game" onClose={() => setEditGame(null)}>
          <GameForm
            initial={{ name: editGame.name, slug: editGame.slug, description: editGame.description ?? "", logoUrl: editGame.logoUrl ?? "", bannerUrl: editGame.bannerUrl ?? "", category: editGame.category, status: editGame.status, sortOrder: editGame.sortOrder }}
            onSubmit={(d) => editMut.mutate({ id: editGame.id, data: d })}
            loading={editMut.isPending}
          />
        </Modal>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AdminLayout>
  );
}
