import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Loader2, Globe, Image, Phone, FileText } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

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
  ...{
    width: "100%",
    padding: "8px 12px",
    background: "hsl(220, 20%, 11%)",
    border: "1px solid hsl(220, 15%, 18%)",
    borderRadius: "6px",
    color: "hsl(210, 40%, 92%)",
    fontSize: "13px",
    outline: "none",
    boxSizing: "border-box" as const,
    resize: "vertical" as const,
    minHeight: "80px",
    lineHeight: "1.5",
    fontFamily: "inherit",
  },
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
  // Site identity
  site_name: "Nexcoin",
  site_tagline: "Level Up Your Gaming Experience",
  site_description: "We are a premier digital marketplace for gamers worldwide, offering instant top-ups, vouchers, and subscriptions.",
  site_logo: "",
  site_favicon: "",
  // Homepage
  hero_title: "Level Up Your Gaming Experience",
  hero_subtitle: "Buy game credits, vouchers & subscriptions instantly — safe, fast, and affordable.",
  announcement_text: "Year-end sale! Get up to 20% off on all game credits!",
  announcement_enabled: "true",
  // Contact
  contact_email: "support@nexcoin.gg",
  contact_phone: "+1 (800) 123-4567",
  contact_address: "123 Gaming Ave, Singapore",
  social_twitter: "https://twitter.com/nexcoin",
  social_facebook: "https://facebook.com/nexcoin",
  social_instagram: "https://instagram.com/nexcoin",
  social_discord: "https://discord.gg/nexcoin",
  // SEO
  seo_title: "Nexcoin — Game Top-Ups, Vouchers & Subscriptions",
  seo_description: "Buy game credits, vouchers, and subscriptions instantly. Fast, secure & affordable.",
  seo_keywords: "game top-up, game credits, mobile legends, free fire, voucher",
};

export default function EditContent() {
  const qc = useQueryClient();
  const [local, setLocal] = useState<SettingsMap>({ ...DEFAULTS });
  const [saved, setSaved] = useState(false);

  const { data: remoteSettings, isLoading } = useQuery<SettingsMap>({
    queryKey: ["/api/admin/settings"],
    queryFn: () => adminApi.get("/settings"),
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

  function set(key: string, value: string) {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }

  function bool(key: string) {
    return local[key] === "true";
  }

  function toggleBool(key: string) {
    setLocal((prev) => ({ ...prev, [key]: prev[key] === "true" ? "false" : "true" }));
  }

  function handleSave() {
    save.mutate(local);
  }

  if (isLoading) {
    return (
      <AdminLayout title="Edit Content">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", gap: "10px", color: "hsl(220, 10%, 45%)" }}>
          <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: "13px" }}>Loading content…</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Edit Content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "12px" }}>
        <p style={{ fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>
          Manage your storefront content, branding, and SEO settings
        </p>
        <button
          data-testid="button-save-content"
          onClick={handleSave}
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

      {/* ── Site Identity ──────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionHeader}>
          <Globe size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>Site Identity</span>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={labelStyle}>Site Name</label>
              <input
                data-testid="input-site-name"
                style={inputStyle}
                value={local.site_name ?? ""}
                onChange={(e) => set("site_name", e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Tagline</label>
              <input
                data-testid="input-site-tagline"
                style={inputStyle}
                value={local.site_tagline ?? ""}
                onChange={(e) => set("site_tagline", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Site Description</label>
            <textarea
              data-testid="input-site-description"
              style={textareaStyle}
              value={local.site_description ?? ""}
              onChange={(e) => set("site_description", e.target.value)}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={labelStyle}>Site Logo</label>
              <ImageUploadField
                value={local.site_logo ?? ""}
                onChange={(url) => set("site_logo", url)}
                label="Upload Logo"
              />
            </div>
            <div>
              <label style={labelStyle}>Favicon</label>
              <ImageUploadField
                value={local.site_favicon ?? ""}
                onChange={(url) => set("site_favicon", url)}
                label="Upload Favicon"
              />
            </div>
          </div>
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
            <label style={labelStyle}>Hero Title</label>
            <input
              data-testid="input-hero-title"
              style={inputStyle}
              value={local.hero_title ?? ""}
              onChange={(e) => set("hero_title", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Hero Subtitle</label>
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
      <div style={card}>
        <div style={sectionHeader}>
          <Image size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>Media Assets</span>
        </div>
        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
          {[
            { key: "hero_bg_image", label: "Hero Background" },
            { key: "og_image", label: "OG / Share Image" },
            { key: "about_banner", label: "About Page Banner" },
          ].map((item) => (
            <div key={item.key}>
              <label style={labelStyle}>{item.label}</label>
              <ImageUploadField
                value={local[item.key] ?? ""}
                onChange={(url) => set(item.key, url)}
                label={`Upload ${item.label}`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Contact & Social ───────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionHeader}>
          <Phone size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>Contact & Social</span>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={labelStyle}>Support Email</label>
              <input
                data-testid="input-contact-email"
                type="email"
                style={inputStyle}
                value={local.contact_email ?? ""}
                onChange={(e) => set("contact_email", e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Phone Number</label>
              <input
                data-testid="input-contact-phone"
                style={inputStyle}
                value={local.contact_phone ?? ""}
                onChange={(e) => set("contact_phone", e.target.value)}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Address</label>
              <input
                data-testid="input-contact-address"
                style={inputStyle}
                value={local.contact_address ?? ""}
                onChange={(e) => set("contact_address", e.target.value)}
              />
            </div>
          </div>
          <div style={{ borderTop: "1px solid hsl(220, 15%, 12%)", paddingTop: "14px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: "hsl(220, 10%, 50%)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Social Links
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {[
                { key: "social_twitter", label: "Twitter / X" },
                { key: "social_facebook", label: "Facebook" },
                { key: "social_instagram", label: "Instagram" },
                { key: "social_discord", label: "Discord" },
              ].map((item) => (
                <div key={item.key}>
                  <label style={labelStyle}>{item.label}</label>
                  <input
                    data-testid={`input-${item.key}`}
                    style={inputStyle}
                    value={local[item.key] ?? ""}
                    onChange={(e) => set(item.key, e.target.value)}
                    placeholder="https://…"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── SEO ───────────────────────────────────────────────────────────── */}
      <div style={{ ...card, marginBottom: 0 }}>
        <div style={sectionHeader}>
          <Globe size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>SEO Settings</span>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={labelStyle}>Meta Title</label>
            <input
              data-testid="input-seo-title"
              style={inputStyle}
              value={local.seo_title ?? ""}
              onChange={(e) => set("seo_title", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Meta Description</label>
            <textarea
              data-testid="input-seo-description"
              style={{ ...textareaStyle, minHeight: "70px" }}
              value={local.seo_description ?? ""}
              onChange={(e) => set("seo_description", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Keywords (comma-separated)</label>
            <input
              data-testid="input-seo-keywords"
              style={inputStyle}
              value={local.seo_keywords ?? ""}
              onChange={(e) => set("seo_keywords", e.target.value)}
              placeholder="game top-up, game credits, voucher…"
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
