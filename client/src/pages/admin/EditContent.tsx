import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Loader2, Image, FileText, Plus, Pencil, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
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
  resize: "vertical",
  minHeight: "80px",
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
  announcement_text: "Year-end sale! Get up to 20% off on all game credits!",
  announcement_enabled: "true",
  hero_bg_image: "",
  og_image: "",
  about_banner: "",
};

// ─── Slider form ──────────────────────────────────────────────────────────────
function SliderForm({
  initial,
  onSubmit,
  loading,
  onCancel,
}: {
  initial: Partial<HeroSlider>;
  onSubmit: (d: any) => void;
  loading: boolean;
  onCancel: () => void;
}) {
  const toInput = (d: Date | string | null | undefined) =>
    d ? new Date(d).toISOString().slice(0, 16) : "";

  const [form, setForm] = useState({
    title: initial.title ?? "",
    subtitle: initial.subtitle ?? "",
    bannerUrl: initial.bannerUrl ?? "",
    buttonText: initial.buttonText ?? "",
    buttonLink: initial.buttonLink ?? "",
    startsAt: toInput(initial.startsAt),
    endsAt: toInput(initial.endsAt),
    isActive: initial.isActive !== false,
    sortOrder: String(initial.sortOrder ?? 0),
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
        });
      }}
      style={{ display: "flex", flexDirection: "column", gap: "12px" }}
    >
      <div>
        <label style={labelStyle}>Title *</label>
        <input
          style={inputStyle}
          required
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Level Up Your Gameplay"
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
        ratio="banner"
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
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
  deleting,
}: {
  slider: HeroSlider;
  onEdit: (s: HeroSlider) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 12px",
        background: "hsl(220,20%,11%)",
        border: "1px solid hsl(220,15%,16%)",
        borderRadius: "6px",
      }}
    >
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
      <button
        onClick={() => onEdit(slider)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "5px 10px",
          borderRadius: "5px",
          background: "rgba(124,58,237,0.1)",
          border: "1px solid rgba(124,58,237,0.25)",
          color: "#a78bfa",
          fontSize: "11px",
          fontWeight: 600,
          cursor: "pointer",
          flexShrink: 0,
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
          padding: "5px 8px",
          borderRadius: "5px",
          background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.25)",
          color: "hsl(0,72%,60%)",
          fontSize: "11px",
          cursor: deleting ? "not-allowed" : "pointer",
          flexShrink: 0,
          opacity: deleting ? 0.6 : 1,
        }}
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}

export default function EditContent() {
  const qc = useQueryClient();
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

  useEffect(() => {
    if (remoteSettings) {
      setLocal((prev) => ({ ...prev, ...remoteSettings }));
    }
  }, [remoteSettings]);

  const save = useMutation({
    mutationFn: (settings: SettingsMap) => adminApi.put("/settings", settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const addSlider = useMutation({
    mutationFn: (d: any) => adminApi.post("/hero-sliders", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/hero-sliders"] });
      setShowAddSlider(false);
    },
  });

  const updateSlider = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => adminApi.patch(`/hero-sliders/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/hero-sliders"] });
      setEditSlider(null);
    },
  });

  const deleteSlider = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/hero-sliders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/hero-sliders"] }),
  });

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
    <AdminLayout title="Content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "12px" }}>
        <p style={{ fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>
          Manage homepage content, hero sliders, and media assets
        </p>
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
            cursor: "pointer",
            border: "none",
            flexShrink: 0,
            transition: "background 0.2s",
          }}
        >
          {save.isPending ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />}
          {saved ? "Saved!" : "Save Changes"}
        </button>
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
            sliders.map((s) =>
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
                  />
                </div>
              ) : (
                <SliderItem
                  key={s.id}
                  slider={s}
                  onEdit={setEditSlider}
                  onDelete={(id) => deleteSlider.mutate(id)}
                  deleting={deleteSlider.isPending}
                />
              )
            )
          )}
        </div>
      </div>

      {/* ── Homepage Content ───────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionHeader}>
          <FileText size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>Homepage Content</span>
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
              style={{ ...textareaStyle, minHeight: "60px" }}
              value={local.hero_subtitle ?? ""}
              onChange={(e) => set("hero_subtitle", e.target.value)}
            />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Announcement Banner</label>
              <button
                data-testid="toggle-announcement"
                onClick={() => toggleBool("announcement_enabled")}
                style={{
                  fontSize: "11px",
                  padding: "3px 10px",
                  borderRadius: "4px",
                  background: bool("announcement_enabled") ? "rgba(139, 92, 246, 0.15)" : "hsl(220, 15%, 13%)",
                  color: bool("announcement_enabled") ? "hsl(258, 90%, 70%)" : "hsl(220, 10%, 50%)",
                  border: "1px solid hsl(220, 15%, 20%)",
                  cursor: "pointer",
                }}
              >
                {bool("announcement_enabled") ? "Enabled" : "Disabled"}
              </button>
            </div>
            <input
              data-testid="input-announcement-text"
              style={inputStyle}
              value={local.announcement_text ?? ""}
              onChange={(e) => set("announcement_text", e.target.value)}
              placeholder="Announcement banner text…"
            />
          </div>
        </div>
      </div>

      {/* ── Media Assets ───────────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 0 }}>
        <div style={sectionHeader}>
          <Image size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>Media Assets</span>
        </div>
        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
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
              ratio="banner"
            />
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
