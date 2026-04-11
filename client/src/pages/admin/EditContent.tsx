import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Loader2, Image, FileText, Plus, Pencil, Trash2, GripVertical, ChevronDown, ChevronUp, Zap } from "lucide-react";
import AdminLayout, { useMobile } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { ICON_MAP, ICON_LIST } from "@/lib/iconMap";
import { useNavGuard } from "@/hooks/useNavGuard";
import { UnsavedChangesDialog } from "@/components/admin/UnsavedChangesDialog";
import type { HeroSlider } from "@shared/schema";

const card: React.CSSProperties = {
  background: "hsl(220, 20%, 9%)",
  border: "1px solid hsl(220, 15%, 13%)",
  borderRadius: "8px",
  marginBottom: "16px",
};

const sectionHeader: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "14px 20px",
  borderBottom: "1px solid hsl(220, 15%, 13%)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: "hsl(220, 20%, 11%)",
  border: "1px solid hsl(220, 15%, 18%)",
  borderRadius: "6px",
  color: "hsl(210, 40%, 92%)",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  background: "hsl(220, 20%, 11%)",
  border: "1px solid hsl(220, 15%, 18%)",
  borderRadius: "6px",
  color: "hsl(210, 40%, 92%)",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
  resize: "none",
  minHeight: "250px",
  lineHeight: "1.5",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "hsl(220, 10%, 50%)",
  marginBottom: "5px",
  display: "block",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

type SettingsMap = Record<string, string>;

const DEFAULTS: SettingsMap = {
  hero_title: "Level Up Your Gaming Experience",
  hero_subtitle: "Buy game credits, vouchers & subscriptions instantly — safe, fast, and affordable.",
  hero_bg_image: "",
  og_image: "",
  about_banner: "",
  faq_items: "[]",
};

type GameOption = { id: string; name: string };
type ProductOption = { id: string; name: string };

// ─── Slider form ──────────────────────────────────────────────────────────────
function SliderForm({
  initial,
  onSubmit,
  loading,
  onCancel,
  games = [],
  products = [],
}: {
  initial: Partial<HeroSlider>;
  onSubmit: (d: any) => void;
  loading: boolean;
  onCancel: () => void;
  games?: GameOption[];
  products?: ProductOption[];
}) {
  const isMobileSlider = useMobile(768);
  const toInput = (d: Date | string | null | undefined) =>
    d ? new Date(d).toISOString().slice(0, 16) : "";

  const [form, setForm] = useState({
    title: initial.title ?? "",
    subtitle: initial.subtitle ?? "",
    bannerUrl: initial.bannerUrl ?? "",
    buttonText: initial.buttonText ?? "",
    buttonLink: initial.buttonLink ?? "",
    showButton: initial.showButton !== false,
    showText: initial.showText !== false,
    startsAt: toInput(initial.startsAt),
    endsAt: toInput(initial.endsAt),
    isActive: initial.isActive !== false,
    sortOrder: String(initial.sortOrder ?? 0),
    linkedGameId: initial.linkedGameId ?? "",
    linkedProductId: initial.linkedProductId ?? "",
  });

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          ...form,
          sortOrder: parseInt(form.sortOrder) || 0,
          startsAt: form.startsAt || null,
          endsAt: form.endsAt || null,
          showButton: form.showButton,
          showText: form.showText,
        });
      }}
      style={{ display: "flex", flexDirection: "column", gap: "12px" }}
    >
      <div>
        <label style={labelStyle}>Title</label>
        <input
          style={inputStyle}
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Level Up Your Gameplay (leave blank for image-only)"
        />
      </div>
      <div>
        <label style={labelStyle}>Subtitle</label>
        <textarea
          style={{ ...textareaStyle, minHeight: "64px" }}
          value={form.subtitle}
          onChange={(e) => set("subtitle", e.target.value)}
          placeholder="Short description under the title…"
        />
      </div>
      <ImageUploadField
        label="Banner Image"
        value={form.bannerUrl}
        onChange={(url) => set("bannerUrl", url)}
        inputStyle={inputStyle}
        labelStyle={labelStyle}
        ratio="rectangle"
        showRatioSelector={false}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div>
          <label style={labelStyle}>Button Text</label>
          <input
            style={inputStyle}
            value={form.buttonText}
            onChange={(e) => set("buttonText", e.target.value)}
            placeholder="Browse Games"
          />
        </div>
        <div>
          <label style={labelStyle}>Button Link</label>
          <input
            style={inputStyle}
            value={form.buttonLink}
            onChange={(e) => set("buttonLink", e.target.value)}
            placeholder="/products"
          />
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Show Text Overlay</label>
          <button
            type="button"
            onClick={() => set("showText", !form.showText)}
            style={{
              padding: "3px 12px",
              borderRadius: "4px",
              border: `1px solid ${form.showText ? "rgba(124,58,237,0.5)" : "hsl(220,15%,20%)"}`,
              background: form.showText ? "rgba(124,58,237,0.15)" : "transparent",
              color: form.showText ? "hsl(258,90%,70%)" : "hsl(220,10%,50%)",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            {form.showText ? "Enabled" : "Disabled"}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>Show Button</label>
          <button
            type="button"
            onClick={() => set("showButton", !form.showButton)}
            style={{
              padding: "3px 12px",
              borderRadius: "4px",
              border: `1px solid ${form.showButton ? "rgba(124,58,237,0.5)" : "hsl(220,15%,20%)"}`,
              background: form.showButton ? "rgba(124,58,237,0.15)" : "transparent",
              color: form.showButton ? "hsl(258,90%,70%)" : "hsl(220,10%,50%)",
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            {form.showButton ? "Enabled" : "Disabled"}
          </button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobileSlider ? "1fr" : "1fr 1fr 1fr", gap: "10px" }}>
        <div>
          <label style={labelStyle}>Start Date</label>
          <input
            style={inputStyle}
            type="datetime-local"
            value={form.startsAt}
            onChange={(e) => set("startsAt", e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>End Date</label>
          <input
            style={inputStyle}
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => set("endsAt", e.target.value)}
          />
        </div>
        <div>
          <label style={labelStyle}>Sort Order</label>
          <input
            style={inputStyle}
            type="number"
            min="0"
            value={form.sortOrder}
            onChange={(e) => set("sortOrder", e.target.value)}
          />
        </div>
      </div>
      {(games.length > 0 || products.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {games.length > 0 && (
            <div>
              <label style={labelStyle}>Linked Game (optional)</label>
              <select
                style={inputStyle}
                value={form.linkedGameId}
                onChange={(e) => set("linkedGameId", e.target.value)}
              >
                <option value="">— None —</option>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}
          {products.length > 0 && (
            <div>
              <label style={labelStyle}>Linked Product (optional)</label>
              <select
                style={inputStyle}
                value={form.linkedProductId}
                onChange={(e) => set("linkedProductId", e.target.value)}
              >
                <option value="">— None —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <label style={{ ...labelStyle, marginBottom: 0 }}>Active</label>
        <button
          type="button"
          onClick={() => set("isActive", !form.isActive)}
          style={{
            padding: "3px 12px",
            borderRadius: "4px",
            border: `1px solid ${form.isActive ? "rgba(124,58,237,0.5)" : "hsl(220,15%,20%)"}`,
            background: form.isActive ? "rgba(124,58,237,0.15)" : "transparent",
            color: form.isActive ? "hsl(258,90%,70%)" : "hsl(220,10%,50%)",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          {form.isActive ? "Enabled" : "Disabled"}
        </button>
      </div>
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", paddingTop: "4px" }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "7px 16px",
            borderRadius: "6px",
            background: "transparent",
            border: "1px solid hsl(220,15%,20%)",
            color: "hsl(220,10%,55%)",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "7px 18px",
            borderRadius: "6px",
            background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
            color: "white",
            fontSize: "12px",
            fontWeight: 600,
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={12} />}
          Save Slider
        </button>
      </div>
    </form>
  );
}

// ─── Hero Slider list item ────────────────────────────────────────────────────
function SliderItem({
  slider,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  deleting,
}: {
  slider: HeroSlider;
  onEdit: (s: HeroSlider) => void;
  onDelete: (id: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  deleting: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        padding: "10px 12px",
        background: "hsl(220,20%,11%)",
        border: "1px solid hsl(220,15%,16%)",
        borderRadius: "6px",
      }}
    >
      {/* Top row: thumbnail + info + status */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        {slider.bannerUrl ? (
          <img
            src={slider.bannerUrl}
            alt=""
            style={{ width: "72px", height: "36px", objectFit: "cover", borderRadius: "4px", flexShrink: 0 }}
          />
        ) : (
          <div
            style={{
              width: "72px",
              height: "36px",
              borderRadius: "4px",
              background: "hsl(220,20%,14%)",
              border: "1px dashed hsl(220,15%,22%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Image size={14} style={{ color: "hsl(220,10%,35%)" }} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210,40%,90%)", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {slider.title}
          </div>
          <div style={{ fontSize: "11px", color: "hsl(220,10%,42%)" }}>
            Order: {slider.sortOrder} &middot; {slider.isActive ? "Active" : "Inactive"}
            {slider.endsAt && ` · Ends ${new Date(slider.endsAt).toLocaleDateString()}`}
          </div>
        </div>
        <div
          style={{
            padding: "2px 8px",
            borderRadius: "4px",
            fontSize: "10px",
            fontWeight: 700,
            background: slider.isActive ? "rgba(74,222,128,0.1)" : "rgba(220,38,38,0.1)",
            color: slider.isActive ? "hsl(142,71%,48%)" : "hsl(0,72%,55%)",
            border: `1px solid ${slider.isActive ? "rgba(74,222,128,0.25)" : "rgba(220,38,38,0.25)"}`,
            flexShrink: 0,
          }}
        >
          {slider.isActive ? "Active" : "Inactive"}
        </div>
      </div>

      {/* Bottom row: action buttons */}
      <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
        {/* Reorder up/down */}
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          title="Move up"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px 8px",
            borderRadius: "4px",
            background: "hsl(220,20%,14%)",
            border: "1px solid hsl(220,15%,20%)",
            color: isFirst ? "hsl(220,10%,28%)" : "hsl(220,10%,55%)",
            cursor: isFirst ? "not-allowed" : "pointer",
          }}
        >
          <ChevronUp size={12} />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          title="Move down"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "4px 8px",
            borderRadius: "4px",
            background: "hsl(220,20%,14%)",
            border: "1px solid hsl(220,15%,20%)",
            color: isLast ? "hsl(220,10%,28%)" : "hsl(220,10%,55%)",
            cursor: isLast ? "not-allowed" : "pointer",
          }}
        >
          <ChevronDown size={12} />
        </button>

        <div style={{ flex: 1 }} />

        <button
          onClick={() => onEdit(slider)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "5px 14px",
            borderRadius: "5px",
            background: "rgba(124,58,237,0.1)",
            border: "1px solid rgba(124,58,237,0.25)",
            color: "#a78bfa",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Pencil size={11} /> Edit
        </button>
        <button
          onClick={() => { if (confirm(`Delete "${slider.title}"?`)) onDelete(slider.id); }}
          disabled={deleting}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "5px 12px",
            borderRadius: "5px",
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            color: "hsl(0,72%,60%)",
            fontSize: "11px",
            cursor: deleting ? "not-allowed" : "pointer",
            opacity: deleting ? 0.6 : 1,
          }}
        >
          <Trash2 size={11} /> Delete
        </button>
      </div>
    </div>
  );
}

export default function EditContent() {
  const qc = useQueryClient();
  const isMobile = useMobile(768);
  const [local, setLocal] = useState<SettingsMap>({ ...DEFAULTS });
  const [saved, setSaved] = useState(false);
  const [showAddSlider, setShowAddSlider] = useState(false);
  const [editSlider, setEditSlider] = useState<HeroSlider | null>(null);

  const { data: remoteSettings, isLoading } = useQuery<SettingsMap>({
    queryKey: ["/api/admin/settings"],
    queryFn: () => adminApi.get("/settings"),
  });

  const { data: sliders = [], isLoading: slidersLoading } = useQuery<HeroSlider[]>({
    queryKey: ["/api/admin/hero-sliders"],
    queryFn: () => adminApi.get("/hero-sliders"),
  });

  const { data: games = [] } = useQuery<GameOption[]>({
    queryKey: ["/api/admin/games"],
    queryFn: () => adminApi.get("/games").then((res: any[]) =>
      res.map((g) => ({ id: g.id, name: g.name }))
    ),
  });

  const { data: products = [] } = useQuery<ProductOption[]>({
    queryKey: ["/api/admin/products"],
    queryFn: () => adminApi.get("/products").then((res: any) => {
      const items = Array.isArray(res) ? res : (res?.products ?? []);
      return items.map((p: any) => ({ id: p.id, name: p.name }));
    }),
  });

  useEffect(() => {
    if (remoteSettings) {
      setLocal((prev) => ({ ...prev, ...remoteSettings }));
    }
  }, [remoteSettings]);

  const dirty = !!(remoteSettings && Object.keys(DEFAULTS).some((k) => local[k] !== (remoteSettings[k] ?? DEFAULTS[k])));
  const { leaveDialog, cancelLeave, doLeave } = useNavGuard(dirty);

  const save = useMutation({
    mutationFn: (settings: SettingsMap) => adminApi.put("/settings", settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  function leaveAndDiscard() {
    if (remoteSettings) setLocal({ ...DEFAULTS, ...remoteSettings });
    doLeave();
  }

  function leaveAndSave() {
    save.mutate(local, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/admin/settings"] });
        doLeave();
      },
    });
  }

  const addSlider = useMutation({
    mutationFn: (d: any) => adminApi.post("/hero-sliders", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/hero-sliders"] });
      qc.invalidateQueries({ queryKey: ["/api/hero-sliders/active"] });
      setShowAddSlider(false);
    },
  });

  const updateSlider = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.patch(`/hero-sliders/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/hero-sliders"] });
      qc.invalidateQueries({ queryKey: ["/api/hero-sliders/active"] });
      setEditSlider(null);
    },
  });

  const deleteSlider = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/hero-sliders/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/hero-sliders"] });
      qc.invalidateQueries({ queryKey: ["/api/hero-sliders/active"] });
    },
  });

  const reorderSlider = useMutation({
    mutationFn: ({ id, sortOrder }: { id: string; sortOrder: number }) =>
      adminApi.patch(`/hero-sliders/${id}`, { sortOrder }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/hero-sliders"] });
      qc.invalidateQueries({ queryKey: ["/api/hero-sliders/active"] });
    },
  });

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const current = sliders[index];
    const prev = sliders[index - 1];
    const currentOrder = current.sortOrder ?? index;
    const prevOrder = prev.sortOrder ?? (index - 1);
    reorderSlider.mutate({ id: current.id, sortOrder: prevOrder });
    reorderSlider.mutate({ id: prev.id, sortOrder: currentOrder });
  }

  function handleMoveDown(index: number) {
    if (index >= sliders.length - 1) return;
    const current = sliders[index];
    const next = sliders[index + 1];
    const currentOrder = current.sortOrder ?? index;
    const nextOrder = next.sortOrder ?? (index + 1);
    reorderSlider.mutate({ id: current.id, sortOrder: nextOrder });
    reorderSlider.mutate({ id: next.id, sortOrder: currentOrder });
  }

  function set(key: string, value: string) {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }

  function bool(key: string) {
    return local[key] === "true";
  }

  function toggleBool(key: string) {
    setLocal((prev) => ({ ...prev, [key]: prev[key] === "true" ? "false" : "true" }));
  }

  if (isLoading) {
    return (
      <AdminLayout title="Content">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", gap: "10px", color: "hsl(220, 10%, 45%)" }}>
          <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: "13px" }}>Loading content…</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Content" actions={dirty ? (
      <button
        data-testid="button-save-content"
        onClick={() => save.mutate(local)}
        disabled={save.isPending}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
          padding: "8px 18px",
          borderRadius: "6px",
          background: saved ? "hsl(142, 71%, 38%)" : "linear-gradient(135deg, #7c3aed, #6d28d9)",
          color: "white",
          fontSize: "13px",
          fontWeight: 600,
          cursor: save.isPending ? "not-allowed" : "pointer",
          border: "none",
          flexShrink: 0,
          transition: "background 0.2s",
          opacity: save.isPending ? 0.8 : 1,
        }}
      >
        {save.isPending ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />}
        {saved ? "Saved!" : "Save Changes"}
      </button>
    ) : undefined}>
      <div style={{ marginBottom: "20px" }}>
        <p style={{ fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>
          Manage homepage content, hero sliders, and media assets
        </p>
      </div>

      {/* ── Homepage Content & Media Assets ──────────────────────────────── */}
      <div style={card}>
        <div style={sectionHeader}>
          <FileText size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>Homepage Content & Media Assets</span>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={labelStyle}>Default Hero Title (fallback when no sliders)</label>
            <input
              data-testid="input-hero-title"
              style={inputStyle}
              value={local.hero_title ?? ""}
              onChange={(e) => set("hero_title", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Default Hero Subtitle</label>
            <textarea
              data-testid="input-hero-subtitle"
              style={{ ...textareaStyle, minHeight: "250px" }}
              value={local.hero_subtitle ?? ""}
              onChange={(e) => set("hero_subtitle", e.target.value)}
            />
          </div>
          <div style={{ paddingTop: "8px", borderTop: "1px solid hsl(220,15%,18%)" }}>
            <label style={labelStyle}>Media Assets</label>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: "16px", marginTop: "12px" }}>
              {[
                { key: "hero_bg_image", label: "Hero Background (fallback)" },
                { key: "og_image", label: "OG / Share Image" },
                { key: "about_banner", label: "About Page Banner" },
              ].map((item) => (
                <ImageUploadField
                  key={item.key}
                  label={item.label}
                  value={local[item.key] ?? ""}
                  onChange={(url) => set(item.key, url)}
                  inputStyle={inputStyle}
                  labelStyle={labelStyle}
                  ratio="rectangle"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Features Strip ───────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionHeader}>
          <Zap size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>Features Strip</span>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ fontSize: "11px", color: "hsl(220, 10%, 50%)", margin: 0 }}>
            Edit the three features displayed below the hero section including titles, descriptions, and icons
          </p>
          {[
            { key: "feature_1", title: "Lightning Fast", desc: "Instant delivery to your account within seconds", defaultIcon: "Zap" },
            { key: "feature_2", title: "Secure Payments", desc: "256-bit encryption on all transactions", defaultIcon: "Shield" },
            { key: "feature_3", title: "Best Deals", desc: "Lowest prices guaranteed on all top-ups", defaultIcon: "Tag" },
          ].map((feat, featIdx) => {
            const currentIcon = local[`${feat.key}_icon`] ?? feat.defaultIcon;
            const IconComponent = ICON_MAP[currentIcon] || ICON_MAP["Zap"];
            return (
              <div key={feat.key} style={{ borderTop: "1px solid hsl(220,15%,18%)", paddingTop: "12px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                  <div>
                    <label style={labelStyle}>Title</label>
                    <input
                      type="text"
                      data-testid={`input-${feat.key}-title`}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "hsl(220, 20%, 11%)",
                        border: "1px solid hsl(220, 15%, 18%)",
                        borderRadius: "6px",
                        color: "hsl(210, 40%, 92%)",
                        fontSize: "13px",
                        outline: "none",
                        boxSizing: "border-box",
                        fontFamily: "inherit",
                      }}
                      value={local[`${feat.key}_title`] ?? feat.title}
                      onChange={(e) => set(`${feat.key}_title`, e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Icon</label>
                    <button
                      data-testid={`button-icon-picker-${feat.key}`}
                      onClick={() => set(`${feat.key}_picker_open`, local[`${feat.key}_picker_open`] ? "" : "1")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        border: "1px solid hsl(220,15%,18%)",
                        background: "hsl(220,20%,11%)",
                        color: "hsl(210,40%,92%)",
                        fontSize: "13px",
                        cursor: "pointer",
                        width: "100%",
                      }}
                    >
                      <IconComponent size={16} />
                      {currentIcon}
                    </button>
                  </div>
                </div>
                <label style={labelStyle}>Description</label>
                <textarea
                  data-testid={`input-${feat.key}-desc`}
                  style={{ ...textareaStyle, minHeight: "60px", marginBottom: local[`${feat.key}_picker_open`] ? "12px" : "0" }}
                  value={local[`${feat.key}_desc`] ?? feat.desc}
                  onChange={(e) => set(`${feat.key}_desc`, e.target.value)}
                />
                {local[`${feat.key}_picker_open`] && (
                  <div style={{ borderTop: "1px solid hsl(220,15%,18%)", paddingTop: "12px", marginTop: "12px" }}>
                    <p style={{ fontSize: "11px", fontWeight: 600, color: "hsl(220,10%,45%)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Choose Icon</p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "6px" }}>
                      {ICON_LIST.map((iconName) => {
                        const Icon = ICON_MAP[iconName];
                        const selected = currentIcon === iconName;
                        return (
                          <button
                            key={iconName}
                            type="button"
                            data-testid={`button-icon-${iconName}-${feat.key}`}
                            onClick={() => { set(`${feat.key}_icon`, iconName); set(`${feat.key}_picker_open`, ""); }}
                            title={iconName}
                            style={{
                              padding: "8px",
                              borderRadius: "6px",
                              border: selected ? "1px solid hsl(258,90%,60%)" : "1px solid hsl(220,15%,18%)",
                              background: selected ? "hsla(258,90%,66%,0.15)" : "hsl(220,20%,13%)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: selected ? "hsl(258,90%,72%)" : "hsl(220,10%,55%)",
                              transition: "all 0.1s",
                            }}
                          >
                            <Icon size={14} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Hero Sliders ──────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={{ ...sectionHeader, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Image size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>Hero Sliders</span>
            <span style={{ fontSize: "11px", color: "hsl(220,10%,42%)" }}>({sliders.length} slides)</span>
          </div>
          {!showAddSlider && !editSlider && (
            <button
              onClick={() => setShowAddSlider(true)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                borderRadius: "6px",
                background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                color: "white",
                fontSize: "12px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              <Plus size={12} /> Add Slide
            </button>
          )}
        </div>

        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Add form */}
          {showAddSlider && !editSlider && (
            <div
              style={{
                background: "hsl(220,20%,8%)",
                border: "1px solid hsl(220,15%,16%)",
                borderRadius: "8px",
                padding: "16px",
                marginBottom: "8px",
              }}
            >
              <div style={{ fontSize: "12px", fontWeight: 700, color: "hsl(210,40%,80%)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                New Slide
              </div>
              <SliderForm
                initial={{}}
                onSubmit={(d) => addSlider.mutate(d)}
                loading={addSlider.isPending}
                onCancel={() => setShowAddSlider(false)}
                games={games}
                products={products}
              />
            </div>
          )}

          {/* Slider list */}
          {slidersLoading ? (
            <div style={{ textAlign: "center", padding: "24px", color: "hsl(220,10%,42%)", fontSize: "12px" }}>
              Loading slides…
            </div>
          ) : sliders.length === 0 && !showAddSlider ? (
            <div
              style={{
                textAlign: "center",
                padding: "32px",
                color: "hsl(220,10%,38%)",
                fontSize: "13px",
                border: "1px dashed hsl(220,15%,18%)",
                borderRadius: "6px",
              }}
            >
              No hero slides yet. Click "Add Slide" to create your first one.
            </div>
          ) : (
            sliders.map((s, idx) =>
              editSlider?.id === s.id ? (
                <div
                  key={s.id}
                  style={{
                    background: "hsl(220,20%,8%)",
                    border: "1px solid rgba(124,58,237,0.3)",
                    borderRadius: "8px",
                    padding: "16px",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "hsl(210,40%,80%)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Edit Slide
                  </div>
                  <SliderForm
                    initial={editSlider}
                    onSubmit={(d) => updateSlider.mutate({ id: editSlider.id, data: d })}
                    loading={updateSlider.isPending}
                    onCancel={() => setEditSlider(null)}
                    games={games}
                    products={products}
                  />
                </div>
              ) : (
                <SliderItem
                  key={s.id}
                  slider={s}
                  onEdit={setEditSlider}
                  onDelete={(id) => deleteSlider.mutate(id)}
                  onMoveUp={() => handleMoveUp(idx)}
                  onMoveDown={() => handleMoveDown(idx)}
                  isFirst={idx === 0}
                  isLast={idx === sliders.length - 1}
                  deleting={deleteSlider.isPending}
                />
              )
            )
          )}
        </div>
      </div>

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 0 }}>
        <div style={{ ...sectionHeader, justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <FileText size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>FAQ</span>
            <span style={{ fontSize: "11px", color: "hsl(220,10%,42%)" }}>
              ({(() => { try { return JSON.parse(local.faq_items || "[]").length; } catch { return 0; } })()} items)
            </span>
          </div>
          <button
            onClick={() => {
              try {
                const items = JSON.parse(local.faq_items || "[]");
                items.push({ q: "", a: "" });
                set("faq_items", JSON.stringify(items));
              } catch { set("faq_items", JSON.stringify([{ q: "", a: "" }])); }
            }}
            style={{
              display: "inline-flex", alignItems: "center", gap: "5px",
              padding: "6px 12px", borderRadius: "6px",
              background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
              color: "white", fontSize: "12px", fontWeight: 600,
              border: "none", cursor: "pointer",
            }}
          >
            <Plus size={12} /> Add Question
          </button>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <p style={{ fontSize: "11px", color: "hsl(220, 10%, 50%)", marginBottom: "2px" }}>
            Add frequently asked questions that appear on the public FAQ page.
          </p>
          {(() => {
            let items: { q: string; a: string }[] = [];
            try { items = JSON.parse(local.faq_items || "[]"); } catch { items = []; }
            if (items.length === 0) {
              return (
                <div style={{ textAlign: "center", padding: "24px", color: "hsl(220,10%,40%)", fontSize: "12px" }}>
                  No FAQ items yet. Click "Add Question" to create your first one.
                </div>
              );
            }
            return items.map((item, idx) => (
              <div key={idx} style={{ background: "hsl(220,20%,8%)", border: "1px solid hsl(220,15%,16%)", borderRadius: "8px", padding: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, color: "hsl(258,90%,66%)" }}>Q{idx + 1}</span>
                  <button
                    onClick={() => {
                      const updated = items.filter((_, i) => i !== idx);
                      set("faq_items", JSON.stringify(updated));
                    }}
                    style={{
                      background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                      color: "hsl(0,72%,60%)", borderRadius: "5px", padding: "3px 8px",
                      fontSize: "11px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px",
                    }}
                  >
                    <Trash2 size={11} /> Remove
                  </button>
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <label style={labelStyle}>Question</label>
                  <input
                    style={inputStyle}
                    value={item.q}
                    onChange={(e) => {
                      const updated = items.map((it, i) => i === idx ? { ...it, q: e.target.value } : it);
                      set("faq_items", JSON.stringify(updated));
                    }}
                    placeholder="e.g. How fast is delivery?"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Answer</label>
                  <textarea
                    style={{ ...textareaStyle, minHeight: "250px" }}
                    value={item.a}
                    onChange={(e) => {
                      const updated = items.map((it, i) => i === idx ? { ...it, a: e.target.value } : it);
                      set("faq_items", JSON.stringify(updated));
                    }}
                    placeholder="Provide a clear, helpful answer…"
                  />
                </div>
              </div>
            ));
          })()}
        </div>
      </div>

      <UnsavedChangesDialog
        open={leaveDialog}
        saving={save.isPending}
        onStay={cancelLeave}
        onDiscard={leaveAndDiscard}
        onSave={leaveAndSave}
      />
    </AdminLayout>
  );
}
