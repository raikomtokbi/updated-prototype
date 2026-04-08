import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronRight, Loader2, TrendingUp, Plug, Gamepad2 } from "lucide-react";
import AdminLayout, { useMobile } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import type { Game, Service, Plugin } from "@shared/schema";

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
  justifyContent: "center",
  gap: "5px",
  padding: "0 12px",
  height: "32px",
  borderRadius: "6px",
  background: "rgba(239,68,68,0.1)",
  border: "1px solid rgba(239,68,68,0.25)",
  color: "hsl(0,72%,62%)",
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
};
const btnEdit: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "5px",
  padding: "0 12px",
  height: "32px",
  borderRadius: "6px",
  background: "rgba(124,58,237,0.1)",
  border: "1px solid rgba(124,58,237,0.25)",
  color: "#a78bfa",
  fontSize: "12px",
  fontWeight: 500,
  cursor: "pointer",
};

const statusBadge = (active: boolean): React.CSSProperties => ({
  padding: "2px 8px",
  borderRadius: "4px",
  fontSize: "11px",
  fontWeight: 500,
  background: active ? "rgba(74,222,128,0.12)" : "rgba(239,68,68,0.12)",
  color: active ? "hsl(142,71%,45%)" : "hsl(0,72%,51%)",
  whiteSpace: "nowrap" as const,
});

const EMPTY_GAME = {
  name: "",
  slug: "",
  description: "",
  logoUrl: "",
  bannerUrl: "",
  category: "game_currency",
  status: "active",
  sortOrder: 0,
  requiredFields: "userId",
  instantDelivery: true,
  pluginSlug: "",
};
const EMPTY_SERVICE = { name: "", description: "", imageUrl: "", price: "", discountPercent: "0", finalPrice: "", status: "active", sortOrder: 0, stock: "" };

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

// ─── Map Plugin Modal (used only for Services now) ────────────────────────────
type MapTarget = { type: "game" | "service"; id: string; name: string; currentSlug?: string | null };

function MapPluginModal({
  target,
  onClose,
  onMap,
  loading,
  description,
}: {
  target: MapTarget;
  onClose: () => void;
  onMap: (slug: string | null) => void;
  loading: boolean;
  description: string;
}) {
  const { data: plugins = [], isLoading } = useQuery<Plugin[]>({
    queryKey: ["/api/admin/plugins"],
    queryFn: () => adminApi.get("/plugins"),
  });

  const [selected, setSelected] = useState<string | null>(target.currentSlug ?? null);

  const enabledPlugins = plugins.filter((p) => p.isEnabled);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.65)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: "460px", background: "hsl(220,22%,8%)", border: "1px solid rgba(34,211,238,0.2)", borderRadius: "10px", padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Plug size={15} color="hsl(187,100%,42%)" />
            <h3 style={{ fontSize: "14px", fontWeight: 700, color: "hsl(210,40%,95%)", margin: 0 }}>Map Plugin</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "hsl(220,10%,50%)", cursor: "pointer" }}><X size={16} /></button>
        </div>
        <p style={{ fontSize: "12px", color: "hsl(220,10%,45%)", marginBottom: "16px", marginTop: "4px" }}>
          <span style={{ color: "hsl(187,100%,42%)" }}>{target.name}</span> — {description}
        </p>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "1.5rem", color: "hsl(220,10%,40%)", fontSize: "13px" }}>Loading plugins...</div>
        ) : enabledPlugins.length === 0 ? (
          <div style={{ padding: "1.25rem", background: "hsl(220,20%,10%)", borderRadius: "6px", border: "1px dashed hsl(220,15%,20%)", textAlign: "center" }}>
            <p style={{ fontSize: "12px", color: "hsl(220,10%,40%)", margin: 0 }}>No enabled plugins found.</p>
            <p style={{ fontSize: "11px", color: "hsl(220,10%,30%)", margin: "4px 0 0" }}>Enable plugins in the Plugins page first.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "260px", overflowY: "auto" }}>
            <label
              style={{
                display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px",
                borderRadius: "6px", cursor: "pointer",
                background: selected === null ? "rgba(34,211,238,0.07)" : "hsl(220,20%,10%)",
                border: `1px solid ${selected === null ? "rgba(34,211,238,0.3)" : "hsl(220,15%,16%)"}`,
              }}
            >
              <input type="radio" name="plugin" checked={selected === null} onChange={() => setSelected(null)}
                style={{ accentColor: "hsl(187,100%,42%)" }} />
              <div>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "hsl(210,40%,70%)" }}>No Plugin</div>
                <div style={{ fontSize: "11px", color: "hsl(220,10%,38%)" }}>Remove mapping</div>
              </div>
            </label>

            {enabledPlugins.map((p) => (
              <label
                key={p.slug}
                style={{
                  display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px",
                  borderRadius: "6px", cursor: "pointer",
                  background: selected === p.slug ? "rgba(34,211,238,0.07)" : "hsl(220,20%,10%)",
                  border: `1px solid ${selected === p.slug ? "rgba(34,211,238,0.3)" : "hsl(220,15%,16%)"}`,
                }}
              >
                <input type="radio" name="plugin" checked={selected === p.slug} onChange={() => setSelected(p.slug)}
                  style={{ accentColor: "hsl(187,100%,42%)" }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "hsl(210,40%,90%)" }}>{p.name}</div>
                  <div style={{ fontSize: "11px", color: "hsl(220,10%,40%)", display: "flex", gap: "6px", alignItems: "center" }}>
                    <code style={{ background: "hsl(220,20%,14%)", padding: "1px 5px", borderRadius: "3px", fontSize: "10px" }}>{p.slug}</code>
                    {p.description && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.description}</span>}
                  </div>
                </div>
                {selected === p.slug && <span style={{ color: "hsl(187,100%,42%)", fontSize: "10px", fontWeight: 600, flexShrink: 0 }}>SELECTED</span>}
              </label>
            ))}
          </div>
        )}

        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "16px" }}>
          <button onClick={onClose} style={{ padding: "7px 14px", borderRadius: "6px", fontSize: "12px", background: "hsl(220,15%,16%)", color: "hsl(220,10%,50%)", border: "1px solid hsl(220,15%,22%)", cursor: "pointer" }}>
            Cancel
          </button>
          <button
            onClick={() => onMap(selected)}
            disabled={loading}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "6px", background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", color: "hsl(187,100%,42%)", fontSize: "12px", fontWeight: 600, cursor: "pointer", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Plug size={12} />}
            {loading ? "Saving..." : "Apply Mapping"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Field Map Picker ─────────────────────────────────────────────────────────
const FIELD_OPTIONS = [
  { key: "userId", label: "User ID", hint: "Game account / player ID" },
  { key: "zoneId", label: "Zone / Server ID", hint: "Required for Mobile Legends etc." },
  { key: "email", label: "Email", hint: "Account email address" },
];

function FieldMapPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const active = value ? value.split(",").filter(Boolean) : [];

  function toggle(key: string) {
    const next = active.includes(key) ? active.filter((k) => k !== key) : [...active, key];
    onChange(next.join(",") || "userId");
  }

  return (
    <div>
      <label style={labelStyle}>Input Fields</label>
      <p style={{ fontSize: "11px", color: "hsl(220,10%,42%)", marginBottom: "8px", marginTop: "2px" }}>
        Toggle which fields buyers must fill in on the top-up page.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {FIELD_OPTIONS.map((opt) => {
          const on = active.includes(opt.key);
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => toggle(opt.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                borderRadius: "7px",
                border: `1px solid ${on ? "hsl(258,90%,60%)" : "hsl(220,15%,20%)"}`,
                background: on ? "hsla(258,90%,66%,0.12)" : "hsl(220,20%,11%)",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                transition: "all 0.15s",
              }}
            >
              <span style={{
                width: "18px", height: "18px", borderRadius: "4px", flexShrink: 0,
                border: `2px solid ${on ? "hsl(258,90%,60%)" : "hsl(220,15%,25%)"}`,
                background: on ? "hsl(258,90%,60%)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {on && <span style={{ color: "white", fontSize: "11px", fontWeight: 700, lineHeight: 1 }}>✓</span>}
              </span>
              <span>
                <span style={{ display: "block", fontSize: "12px", fontWeight: 600, color: on ? "hsl(210,40%,92%)" : "hsl(220,10%,65%)" }}>
                  {opt.label}
                </span>
                <span style={{ display: "block", fontSize: "11px", color: "hsl(220,10%,40%)", marginTop: "1px" }}>
                  {opt.hint}
                </span>
              </span>
              {on && (
                <span style={{ marginLeft: "auto", fontSize: "10px", fontWeight: 700, color: "hsl(258,90%,70%)", flexShrink: 0 }}>ON</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Plugin Picker (inline, for Edit Game form) ───────────────────────────────
function PluginPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { data: plugins = [], isLoading } = useQuery<Plugin[]>({
    queryKey: ["/api/admin/plugins"],
    queryFn: () => adminApi.get("/plugins"),
  });
  const enabledPlugins = plugins.filter((p) => p.isEnabled);

  return (
    <div>
      <label style={labelStyle}>Delivery Plugin</label>
      <p style={{ fontSize: "11px", color: "hsl(220,10%,42%)", marginBottom: "8px", marginTop: "2px" }}>
        Optional: map this game to a plugin for automated top-up delivery.
      </p>
      {isLoading ? (
        <div style={{ ...inputStyle, color: "hsl(220,10%,40%)" }}>Loading plugins...</div>
      ) : (
        <select
          style={inputStyle}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">No Plugin</option>
          {enabledPlugins.map((p) => (
            <option key={p.slug} value={p.slug}>{p.name} ({p.slug})</option>
          ))}
        </select>
      )}
      {value && (
        <p style={{ fontSize: "11px", color: "hsl(187,100%,42%)", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
          <Plug size={10} /> Mapped to: {value}
        </p>
      )}
    </div>
  );
}

// ─── Game Form ────────────────────────────────────────────────────────────────
function GameForm({ initial, onSubmit, loading }: { initial: typeof EMPTY_GAME; onSubmit: (d: any) => void; loading: boolean }) {
  const isMobile = useMobile(768);
  const [form, setForm] = useState(initial);
  const set = (k: string, v: string | number | boolean) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.75rem" }}>
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
        <textarea style={{ ...inputStyle, resize: "none", minHeight: "250px" }} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Short description..." />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.75rem" }}>
        <ImageUploadField
          label="Logo URL"
          value={form.logoUrl ?? ""}
          onChange={(url) => set("logoUrl", url)}
          inputStyle={inputStyle}
          labelStyle={labelStyle}
        />
        <ImageUploadField
          label="Banner URL"
          value={form.bannerUrl ?? ""}
          onChange={(url) => set("bannerUrl", url)}
          inputStyle={inputStyle}
          labelStyle={labelStyle}
        />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.75rem" }}>
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

      {/* ─── Field Map ─────────────────────────────────────────────── */}
      <FieldMapPicker
        value={form.requiredFields ?? "userId"}
        onChange={(v) => set("requiredFields", v)}
      />

      {/* ─── Delivery Plugin ───────────────────────────────────────── */}
      <PluginPicker
        value={form.pluginSlug ?? ""}
        onChange={(v) => set("pluginSlug", v)}
      />

      {/* ─── Instant Delivery toggle ───────────────────────────────── */}
      <div>
        <label style={labelStyle}>Instant Delivery</label>
        <button
          type="button"
          onClick={() => set("instantDelivery", !form.instantDelivery)}
          style={{
            display: "flex", alignItems: "center", gap: "10px",
            width: "100%", padding: "10px 12px",
            background: form.instantDelivery ? "rgba(74,222,128,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${form.instantDelivery ? "rgba(74,222,128,0.25)" : "rgba(239,68,68,0.25)"}`,
            borderRadius: "7px", cursor: "pointer",
          }}
        >
          <span style={{
            width: "36px", height: "20px", borderRadius: "10px", flexShrink: 0,
            background: form.instantDelivery ? "hsl(142,71%,45%)" : "hsl(220,10%,30%)",
            position: "relative", transition: "background 0.2s",
          }}>
            <span style={{
              position: "absolute", top: "3px",
              left: form.instantDelivery ? "19px" : "3px",
              width: "14px", height: "14px", borderRadius: "50%",
              background: "white", transition: "left 0.2s",
            }} />
          </span>
          <span style={{ fontSize: "12px", fontWeight: 600, color: form.instantDelivery ? "hsl(142,71%,52%)" : "hsl(220,10%,55%)" }}>
            {form.instantDelivery ? "Instant Delivery Enabled" : "Instant Delivery Disabled"}
          </span>
        </button>
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
  const isMobile = useMobile(768);
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
      onSubmit({
        ...form,
        finalPrice: form.finalPrice || computeFinal(form.price, form.discountPercent),
        stock: (form.stock as string) !== "" ? parseInt(form.stock as string) : null,
      });
    }} style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
      <div>
        <label style={labelStyle}>Name *</label>
        <input style={inputStyle} required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="100 UC" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: "0.7rem" }}>
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
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: "0.7rem" }}>
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
        <div>
          <label style={labelStyle}>Stock <span style={{ fontWeight: 400, textTransform: "none", fontSize: "10px" }}>(blank = unlimited)</span></label>
          <input style={inputStyle} type="number" min="0" value={form.stock} onChange={(e) => set("stock", e.target.value)} placeholder="Unlimited" />
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
  const [mapTarget, setMapTarget] = useState<MapTarget | null>(null);

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
  const mapMut = useMutation({
    mutationFn: ({ id, pluginSlug }: { id: string; pluginSlug: string | null }) =>
      adminApi.patch(`/services/${id}`, { pluginSlug }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/admin/services?gameId=${game.id}`] });
      setMapTarget(null);
    },
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
                {["Name", "Price", "Discount", "Final", "Stock", "Status", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em", color: "hsl(220,10%,38%)", borderBottom: "1px solid hsl(220,15%,13%)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {svcs.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid hsl(220,15%,11%)" }}>
                  <td style={{ padding: "8px 10px", fontWeight: 500, color: "hsl(210,40%,90%)" }}>
                    <div>{s.name}</div>
                    {s.pluginSlug && (
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                        <Plug size={9} color="hsl(187,100%,42%)" />
                        <span style={{ fontSize: "10px", color: "hsl(187,100%,42%)" }}>{s.pluginSlug}</span>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "8px 10px", color: "hsl(210,40%,70%)" }}>{s.price}</td>
                  <td style={{ padding: "8px 10px", color: "hsl(220,10%,55%)" }}>{s.discountPercent}%</td>
                  <td style={{ padding: "8px 10px", color: "#a78bfa", fontWeight: 600 }}>{s.finalPrice}</td>
                  <td style={{ padding: "8px 10px" }}>
                    {(s as any).stock === null || (s as any).stock === undefined
                      ? <span style={{ color: "hsl(220,10%,40%)", fontSize: "11px" }}>∞</span>
                      : (s as any).stock === 0
                        ? <span style={{ color: "hsl(0,72%,55%)", fontWeight: 700, fontSize: "11px" }}>Out</span>
                        : <span style={{ color: "hsl(142,71%,45%)", fontWeight: 600, fontSize: "11px" }}>{(s as any).stock}</span>
                    }
                  </td>
                  <td style={{ padding: "8px 10px" }}><span style={statusBadge(s.status === "active")}>{s.status}</span></td>
                  <td style={{ padding: "8px 10px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "4px",
                          padding: "5px 10px", borderRadius: "5px", fontSize: "11px", cursor: "pointer",
                          ...(s.pluginSlug
                            ? { background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", color: "hsl(187,100%,42%)" }
                            : { background: "rgba(34,211,238,0.04)", color: "hsl(220,10%,40%)", border: "1px solid hsl(220,15%,16%)" }
                          )
                        }}
                        onClick={() => setMapTarget({ type: "service", id: s.id, name: s.name, currentSlug: s.pluginSlug })}
                        title={s.pluginSlug ? `Mapped to: ${s.pluginSlug}` : "Map to a plugin"}
                      >
                        <Plug size={10} /> Map
                      </button>
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
            initial={{ name: editSvc.name, description: editSvc.description ?? "", imageUrl: editSvc.imageUrl ?? "", price: String(editSvc.price), discountPercent: String(editSvc.discountPercent), finalPrice: String(editSvc.finalPrice), status: editSvc.status, sortOrder: editSvc.sortOrder, stock: (editSvc as any).stock !== null && (editSvc as any).stock !== undefined ? String((editSvc as any).stock) : "" }}
            onSubmit={(d) => editMut.mutate({ id: editSvc.id, data: d })}
            loading={editMut.isPending}
          />
        </Modal>
      )}
      {mapTarget && (
        <MapPluginModal
          target={mapTarget}
          description="Select a plugin to handle top-up delivery for this service."
          loading={mapMut.isPending}
          onClose={() => setMapTarget(null)}
          onMap={(slug) => mapMut.mutate({ id: mapTarget.id, pluginSlug: slug })}
        />
      )}
    </div>
  );
}

// ─── Main Games page ──────────────────────────────────────────────────────────
export default function Games() {
  const qc = useQueryClient();
  const isMobile = useMobile(768);
  const [showAdd, setShowAdd] = useState(false);
  const [editGame, setEditGame] = useState<Game | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: gameList = [], isLoading } = useQuery<Game[]>({
    queryKey: ["/api/admin/games"],
    queryFn: () => adminApi.get("/games"),
  });

  const addMut = useMutation({
    mutationFn: (d: any) => adminApi.post("/games", d),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ["/api/admin/games"] }); 
      qc.invalidateQueries({ queryKey: ["/api/games"] });
      setShowAdd(false); 
    },
  });
  const editMut = useMutation({
    mutationFn: ({ id, data }: any) => adminApi.patch(`/games/${id}`, data),
    onSuccess: () => { 
      qc.invalidateQueries({ queryKey: ["/api/admin/games"] }); 
      qc.invalidateQueries({ queryKey: ["/api/games"] });
      setEditGame(null); 
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/games/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/games"] });
      qc.invalidateQueries({ queryKey: ["/api/games"] });
    },
  });
  const trendingMut = useMutation({
    mutationFn: (id: string) => adminApi.patch(`/games/${id}/trending`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/games"] });
      qc.invalidateQueries({ queryKey: ["/api/games/trending"] });
    },
  });

  return (
    <AdminLayout title="Games" actions={
      <button style={btnPrimary} onClick={() => setShowAdd(true)}>
        <Plus size={14} /> Add Game
      </button>
    }>

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

                {isMobile ? (
                  /* ── Mobile card layout ── */
                  <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {/* Top row: icon + status + chevron */}
                    <div
                      style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }}
                      onClick={() => setExpandedId(expandedId === g.id ? null : g.id)}
                    >
                      {g.logoUrl ? (
                        <img src={g.logoUrl} alt={g.name} style={{ width: "44px", height: "44px", borderRadius: "8px", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: "44px", height: "44px", borderRadius: "8px", background: "rgba(124,58,237,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Gamepad2 size={18} style={{ color: "hsla(258,90%,66%,0.6)" }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "15px", color: "hsl(210,40%,95%)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</div>
                        <div style={{ fontSize: "12px", color: "hsl(220,10%,42%)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "2px" }}>{g.slug}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                        <span style={statusBadge(g.status === "active")}>{g.status}</span>
                        <span style={{ color: "hsl(220,10%,42%)" }}>
                          {expandedId === g.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </span>
                      </div>
                    </div>

                    {/* Bottom row: action buttons */}
                    <div
                      style={{ display: "flex", gap: "8px", alignItems: "center" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        style={{
                          ...( g.isTrending
                            ? { ...btnEdit, background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24" }
                            : { ...btnEdit, background: "rgba(124,58,237,0.07)", color: "hsl(220,10%,45%)" }
                          ),
                          flex: 1,
                        }}
                        onClick={() => trendingMut.mutate(g.id)}
                        disabled={trendingMut.isPending}
                      >
                        <TrendingUp size={13} />
                        {g.isTrending ? "Trending" : "Trend"}
                      </button>
                      <button
                        style={{ ...btnEdit, flex: 1 }}
                        onClick={() => setEditGame(g)}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        style={{ ...btnDanger, flex: 1 }}
                        onClick={() => { if (confirm(`Delete "${g.name}"? This will also delete all its services.`)) delMut.mutate(g.id); }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Desktop card layout (unchanged) ── */
                  <div
                    style={{ display: "flex", flexDirection: "column", padding: "12px 16px", gap: "8px", cursor: "pointer" }}
                    onClick={() => setExpandedId(expandedId === g.id ? null : g.id)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ color: "hsl(220,10%,42%)", flexShrink: 0 }}>
                        {expandedId === g.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </span>
                      {g.logoUrl ? (
                        <img src={g.logoUrl} alt={g.name} style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: "rgba(124,58,237,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Gamepad2 size={14} style={{ color: "hsla(258,90%,66%,0.6)" }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: "13px", color: "hsl(210,40%,95%)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</div>
                        <div style={{ fontSize: "11px", color: "hsl(220,10%,42%)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.slug}</div>
                      </div>
                      <span style={{ ...statusBadge(g.status === "active"), flexShrink: 0 }}>{g.status}</span>
                    </div>

                    <div
                      style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", paddingLeft: "44px" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        style={g.isTrending
                          ? { ...btnEdit, background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", color: "#fbbf24" }
                          : { ...btnEdit, background: "rgba(124,58,237,0.07)", color: "hsl(220,10%,45%)" }}
                        onClick={() => trendingMut.mutate(g.id)}
                        disabled={trendingMut.isPending}
                        title={g.isTrending ? "Remove from Trending" : "Add to Trending"}
                      >
                        <TrendingUp size={11} /> {g.isTrending ? "Trending" : "Trend"}
                      </button>
                      <button style={btnEdit} onClick={() => setEditGame(g)}><Pencil size={11} /> Edit</button>
                      <button style={btnDanger} onClick={() => { if (confirm(`Delete "${g.name}"? This will also delete all its services.`)) delMut.mutate(g.id); }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                )}

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
            initial={{
              name: editGame.name,
              slug: editGame.slug,
              description: editGame.description ?? "",
              logoUrl: editGame.logoUrl ?? "",
              bannerUrl: editGame.bannerUrl ?? "",
              category: editGame.category,
              status: editGame.status,
              sortOrder: editGame.sortOrder,
              requiredFields: editGame.requiredFields ?? "userId",
              instantDelivery: editGame.instantDelivery !== false,
              pluginSlug: editGame.pluginSlug ?? "",
            }}
            onSubmit={(d) => editMut.mutate({ id: editGame.id, data: { ...d, pluginSlug: d.pluginSlug || null } })}
            loading={editMut.isPending}
          />
        </Modal>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AdminLayout>
  );
}
