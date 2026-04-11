import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Loader2, Shield, Globe, Bell, Users, DollarSign, FileText, ToggleLeft, Image, Phone, Search, Mail, Info, CheckCircle, Settings, ExternalLink, Plus, Trash2 } from "lucide-react";
import { ICON_MAP, ICON_LIST, DEFAULT_VALUE_CARDS } from "@/lib/iconMap";
import AdminLayout, { useMobile } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { useNavGuard } from "@/hooks/useNavGuard";
import { UnsavedChangesDialog } from "@/components/admin/UnsavedChangesDialog";

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

const selectStyle: React.CSSProperties = {
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
  },
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
  minHeight: "72px",
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

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        position: "relative",
        width: "40px",
        height: "22px",
        borderRadius: "11px",
        background: checked ? "hsl(258, 90%, 60%)" : "hsl(220, 15%, 20%)",
        border: "none",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 0.2s",
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "3px",
          left: checked ? "calc(100% - 19px)" : "3px",
          width: "16px",
          height: "16px",
          borderRadius: "50%",
          background: "white",
          transition: "left 0.2s",
          display: "block",
        }}
      />
    </button>
  );
}

function InfoNote({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", marginTop: "6px", padding: "6px 8px", background: "hsl(220, 20%, 11%)", borderRadius: "5px", border: "1px solid hsl(220, 15%, 18%)" }}>
      <Info size={11} style={{ color: "hsl(220, 10%, 52%)", flexShrink: 0, marginTop: "1px" }} />
      <span style={{ fontSize: "10px", color: "hsl(220, 10%, 48%)", lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

function ApiConfigLink({ slug, label = "Configure API" }: { slug: string; label?: string }) {
  const { data: plugins = [] } = useQuery<{ slug: string; config?: string | null; isEnabled?: boolean }[]>({
    queryKey: ["/api/admin/plugins"],
    queryFn: () => adminApi.get("/plugins"),
    staleTime: 30_000,
  });

  const plugin = plugins.find((p) => p.slug === slug);
  const connected = (() => {
    if (!plugin) return false;
    try {
      const cfg = JSON.parse(plugin.config ?? "{}");
      return Object.keys(cfg).length > 0 && Object.values(cfg).some(Boolean);
    } catch { return false; }
  })();

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "7px", marginTop: "7px", flexWrap: "wrap" }}>
      {connected && (
        <span
          style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            padding: "2px 8px", borderRadius: "4px",
            background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)",
            fontSize: "10px", fontWeight: 600, color: "hsl(142,71%,48%)",
          }}
        >
          <CheckCircle size={10} /> API Connected
        </span>
      )}
      <a
        href={`/admin/api-integration#${slug}`}
        data-testid={`link-configure-${slug}`}
        style={{
          display: "inline-flex", alignItems: "center", gap: "4px",
          padding: "2px 9px", borderRadius: "4px",
          background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)",
          fontSize: "10px", fontWeight: 600, color: "hsl(258,80%,72%)",
          textDecoration: "none", cursor: "pointer",
        }}
      >
        <Settings size={10} /> {label} <ExternalLink size={9} style={{ opacity: 0.7 }} />
      </a>
    </div>
  );
}

function SettingRow({ label, description, children, note, apiSlug }: { label: string; description?: string; children: React.ReactNode; note?: string; apiSlug?: string }) {
  return (
    <div
      style={{
        padding: "14px 20px",
        borderBottom: "1px solid hsl(220, 15%, 12%)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 500, color: "hsl(210, 40%, 88%)", marginBottom: "2px" }}>{label}</div>
          {description && <div style={{ fontSize: "11px", color: "hsl(220, 10%, 42%)" }}>{description}</div>}
        </div>
        {children}
      </div>
      {note && <InfoNote text={note} />}
      {apiSlug && <ApiConfigLink slug={apiSlug} />}
    </div>
  );
}

type SettingsMap = Record<string, string>;

const DEFAULTS: SettingsMap = {
  // General
  site_name: "Nexcoin",
  site_tagline: "Level Up Your Gaming Experience",
  site_description: "We are a premier digital marketplace for gamers worldwide, offering instant top-ups, vouchers, and subscriptions.",
  site_logo: "",
  site_favicon: "",
  site_timezone: "UTC",
  date_format: "DD/MM/YYYY",
  default_currency: "USD",
  default_language: "en",
  // System toggles
  maintenance_mode: "false",
  user_registration: "true",
  order_processing: "true",
  email_notifications: "true",
  two_factor_auth: "false",
  auto_refunds: "true",
  // Notifications
  notif_new_user: "true",
  notif_new_order: "true",
  notif_new_ticket: "true",
  notif_payment_failed: "true",
  notif_low_stock: "false",
  // Security
  session_timeout_minutes: "60",
  max_login_attempts: "5",
  ip_whitelist: "",
  // Legal
  cookie_consent_enabled: "true",
  audit_log_enabled: "true",
  // Tax
  tax_enabled: "false",
  tax_rate: "0",
  tax_name: "VAT",
  invoice_prefix: "INV",
  invoice_footer: "Thank you for your purchase.",
  // Footer
  footer_copyright: "© 2024 Nexcoin. All rights reserved.",
  footer_support_email: "support@nexcoin.gg",
  footer_button_name: "",
  footer_button_link: "",
  // Legal page content
  terms_content: "",
  privacy_content: "",
  refund_content: "",
  delivery_cancellation_content: "",
  // About page
  about_headline: "",
  about_tagline: "",
  about_story: "",
  why_nexcoin_cards: JSON.stringify(DEFAULT_VALUE_CARDS),
  // About page stats overrides
  about_stat_games: "0",
  about_stat_products: "0",
  about_stat_orders: "0",
  about_stat_users: "0",
  // Contact
  contact_email: "support@nexcoin.gg",
  contact_phone: "+1 (800) 123-4567",
  contact_address: "123 Gaming Ave, Singapore",
  social_twitter: "",
  social_facebook: "",
  social_instagram: "",
  social_discord: "",
  // SEO
  seo_title: "Nexcoin — Game Top-Ups, Vouchers & Subscriptions",
  seo_description: "Buy game credits, vouchers, and subscriptions instantly. Fast, secure & affordable.",
  seo_keywords: "game top-up, game credits, mobile legends, free fire, voucher",
  // User management
  require_email_verify: "false",
  social_login: "false",
  account_approval: "auto",
};

interface ValueCard { icon: string; title: string; desc: string }

function ValueCardsEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [openPickerIdx, setOpenPickerIdx] = useState<number | null>(null);

  const cards: ValueCard[] = (() => {
    try {
      const p = JSON.parse(value || "[]");
      return Array.isArray(p) && p.length > 0 ? p : DEFAULT_VALUE_CARDS;
    } catch { return DEFAULT_VALUE_CARDS; }
  })();

  function update(idx: number, field: keyof ValueCard, val: string) {
    const next = cards.map((c, i) => i === idx ? { ...c, [field]: val } : c);
    onChange(JSON.stringify(next));
  }

  function remove(idx: number) {
    const next = cards.filter((_, i) => i !== idx);
    onChange(JSON.stringify(next));
    if (openPickerIdx === idx) setOpenPickerIdx(null);
  }

  function addCard() {
    const next = [...cards, { icon: "Star", title: "New Feature", desc: "Describe this feature." }];
    onChange(JSON.stringify(next));
  }

  const pickerBtnBase: React.CSSProperties = {
    width: "32px", height: "32px", borderRadius: "6px", border: "1px solid hsl(220,15%,18%)",
    background: "hsl(220,20%,11%)", cursor: "pointer", display: "flex", alignItems: "center",
    justifyContent: "center", flexShrink: 0, color: "hsl(258,90%,70%)",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {cards.map((card, idx) => {
        const CardIcon = ICON_MAP[card.icon] ?? ICON_MAP["Star"];
        const pickerOpen = openPickerIdx === idx;
        return (
          <div
            key={idx}
            style={{
              background: "hsl(220,20%,11%)", border: "1px solid hsl(220,15%,18%)",
              borderRadius: "8px", padding: "12px", display: "flex",
              flexDirection: "column", gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
              <button
                type="button"
                title="Choose icon"
                onClick={() => setOpenPickerIdx(pickerOpen ? null : idx)}
                style={{ ...pickerBtnBase, background: pickerOpen ? "hsla(258,90%,66%,0.15)" : "hsl(220,20%,11%)", border: pickerOpen ? "1px solid hsla(258,90%,66%,0.4)" : "1px solid hsl(220,15%,18%)" }}
                data-testid={`button-icon-picker-${idx}`}
              >
                <CardIcon size={16} />
              </button>
              <input
                style={{ flex: 1, padding: "6px 10px", background: "hsl(220,20%,13%)", border: "1px solid hsl(220,15%,18%)", borderRadius: "6px", color: "hsl(210,40%,92%)", fontSize: "12px", outline: "none" }}
                value={card.title}
                onChange={(e) => update(idx, "title", e.target.value)}
                placeholder="Card title"
                data-testid={`input-card-title-${idx}`}
              />
              <button
                type="button"
                onClick={() => remove(idx)}
                data-testid={`button-remove-card-${idx}`}
                style={{ ...pickerBtnBase, color: "hsl(0,60%,55%)", border: "1px solid hsla(0,60%,40%,0.3)" }}
              >
                <Trash2 size={13} />
              </button>
            </div>
            <textarea
              style={{ width: "100%", padding: "6px 10px", background: "hsl(220,20%,13%)", border: "1px solid hsl(220,15%,18%)", borderRadius: "6px", color: "hsl(210,40%,90%)", fontSize: "12px", outline: "none", minHeight: "250px", lineHeight: 1.5, fontFamily: "inherit", boxSizing: "border-box", resize: "none" }}
              value={card.desc}
              onChange={(e) => update(idx, "desc", e.target.value)}
              placeholder="Short description for this feature card"
              data-testid={`input-card-desc-${idx}`}
            />
            {pickerOpen && (
              <div style={{ borderTop: "1px solid hsl(220,15%,18%)", paddingTop: "10px" }}>
                <p style={{ fontSize: "10px", color: "hsl(220,10%,45%)", marginBottom: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Choose Icon</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "6px" }}>
                  {ICON_LIST.map((name) => {
                    const Ic = ICON_MAP[name];
                    const selected = card.icon === name;
                    return (
                      <button
                        key={name}
                        type="button"
                        title={name}
                        data-testid={`button-icon-${name}-${idx}`}
                        onClick={() => { update(idx, "icon", name); setOpenPickerIdx(null); }}
                        style={{
                          padding: "7px", borderRadius: "6px", border: selected ? "1px solid hsl(258,90%,60%)" : "1px solid hsl(220,15%,18%)",
                          background: selected ? "hsla(258,90%,66%,0.15)" : "hsl(220,20%,13%)",
                          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          color: selected ? "hsl(258,90%,72%)" : "hsl(220,10%,55%)",
                          transition: "all 0.1s",
                        }}
                      >
                        <Ic size={14} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={addCard}
        data-testid="button-add-card"
        style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          padding: "7px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
          background: "hsla(258,90%,66%,0.08)", border: "1px solid hsla(258,90%,66%,0.2)",
          color: "hsl(258,80%,72%)", cursor: "pointer", alignSelf: "flex-start",
        }}
      >
        <Plus size={13} /> Add Card
      </button>
    </div>
  );
}

export default function ControlPanel() {
  const qc = useQueryClient();
  const isMobile = useMobile(768);
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

  const isDirty = !!(remoteSettings && Object.keys(DEFAULTS).some((k) => local[k] !== (remoteSettings[k] ?? DEFAULTS[k])));

  const { leaveDialog, cancelLeave, doLeave } = useNavGuard(isDirty);

  const save = useMutation({
    mutationFn: (settings: SettingsMap) => adminApi.put("/settings", settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      qc.invalidateQueries({ queryKey: ["/api/site-settings"] });
      qc.invalidateQueries({ queryKey: ["/api/about-stats"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  function set(key: string, value: string) {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }

  function toggle(key: string) {
    setLocal((prev) => ({ ...prev, [key]: prev[key] === "true" ? "false" : "true" }));
  }

  function bool(key: string) {
    return local[key] === "true";
  }

  function handleSave() {
    save.mutate(local);
  }

  function leaveAndDiscard() {
    if (remoteSettings) setLocal({ ...remoteSettings });
    doLeave();
  }

  function leaveAndSave() {
    save.mutate(local, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["/api/admin/settings"] });
        qc.invalidateQueries({ queryKey: ["/api/site-settings"] });
        qc.invalidateQueries({ queryKey: ["/api/about-stats"] });
        doLeave();
      },
    });
  }

  if (isLoading) {
    return (
      <AdminLayout title="Control Panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", gap: "10px", color: "hsl(220, 10%, 45%)" }}>
          <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: "13px" }}>Loading settings…</span>
        </div>
      </AdminLayout>
    );
  }

  const saveBtn = (isDirty || saved) ? (
    <button
      data-testid="button-save-settings"
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
        cursor: save.isPending ? "default" : "pointer",
        border: "none",
        flexShrink: 0,
        transition: "background 0.2s",
        opacity: save.isPending ? 0.75 : 1,
      }}
    >
      {save.isPending ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={13} />}
      {saved ? "Saved!" : "Save Changes"}
    </button>
  ) : undefined;

  return (
    <AdminLayout title="Control Panel" actions={saveBtn}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ marginBottom: "20px" }}>
        <p style={{ fontSize: "12px", color: "hsl(220, 10%, 42%)", margin: 0 }}>
          Manage system-wide configuration and feature toggles
        </p>
      </div>

      {/* ── Site Identity ───────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionHeader}>
          <Globe size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>Site Identity</span>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "14px" }}>
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
                data-testid="input-tagline"
                style={inputStyle}
                value={local.site_tagline ?? ""}
                onChange={(e) => set("site_tagline", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Short Description</label>
            <textarea
              data-testid="input-site-description"
              style={textareaStyle as React.CSSProperties}
              value={local.site_description ?? ""}
              onChange={(e) => set("site_description", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>
              <Mail size={11} style={{ display: "inline", marginRight: "5px", verticalAlign: "middle" }} />
              Footer Support Email
            </label>
            <input
              data-testid="input-support-email"
              type="email"
              style={inputStyle}
              value={local.footer_support_email ?? ""}
              onChange={(e) => set("footer_support_email", e.target.value)}
              placeholder="support@yourdomain.com"
              autoComplete="off"
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "14px" }}>
            <ImageUploadField
              label="Site Logo"
              value={local.site_logo ?? ""}
              onChange={(url) => set("site_logo", url)}
              inputStyle={inputStyle}
              labelStyle={labelStyle}
              ratio="square"
            />
            <ImageUploadField
              label="Favicon"
              value={local.site_favicon ?? ""}
              onChange={(url) => set("site_favicon", url)}
              inputStyle={inputStyle}
              labelStyle={labelStyle}
              ratio="square"
            />
          </div>
        </div>
      </div>

      {/* ── Contact & Social ────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionHeader}>
          <Phone size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>Contact & Social</span>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={labelStyle}>Support Email</label>
              <input
                data-testid="input-contact-email"
                type="email"
                style={inputStyle}
                value={local.contact_email ?? ""}
                onChange={(e) => set("contact_email", e.target.value)}
                autoComplete="off"
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
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "10px" }}>
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

      {/* ── SEO ─────────────────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionHeader}>
          <Search size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
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
              style={{ ...textareaStyle, minHeight: "250px" } as React.CSSProperties}
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

      {/* ── General ─────────────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionHeader}>
          <Globe size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>General Settings</span>
        </div>
        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "14px" }}>
          <div>
            <label style={labelStyle}>Timezone</label>
            <select
              data-testid="select-timezone"
              style={selectStyle}
              value={local.site_timezone ?? "UTC"}
              onChange={(e) => set("site_timezone", e.target.value)}
            >
              {["UTC", "America/New_York", "America/Chicago", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Europe/Berlin", "Africa/Nairobi", "Asia/Kolkata", "Asia/Dhaka", "Asia/Jakarta", "Asia/Singapore", "Asia/Manila", "Asia/Karachi", "Asia/Dubai", "Asia/Tokyo", "Australia/Sydney"].map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
            <InfoNote text="Saved to config. Used by server-side date generation for reports and exports." />
          </div>
          <div>
            <label style={labelStyle}>Date Format</label>
            <select
              data-testid="select-date-format"
              style={selectStyle}
              value={local.date_format ?? "DD/MM/YYYY"}
              onChange={(e) => set("date_format", e.target.value)}
            >
              {["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <InfoNote text="Saved to config. Applied to date display in reports and exports." />
          </div>
          <div>
            <label style={labelStyle}>Default Currency</label>
            <select
              data-testid="select-currency"
              style={selectStyle}
              value={local.default_currency ?? "USD"}
              onChange={(e) => set("default_currency", e.target.value)}
            >
              {["USD", "EUR", "GBP", "INR", "SGD", "MYR", "IDR", "PHP", "BDT", "PKR", "LKR", "THB", "VND", "AED", "SAR"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Default Language</label>
            <select
              data-testid="select-language"
              style={selectStyle}
              value={local.default_language ?? "en"}
              onChange={(e) => set("default_language", e.target.value)}
            >
              {[{ v: "en", l: "English" }, { v: "id", l: "Indonesian" }, { v: "ms", l: "Malay" }, { v: "tl", l: "Filipino" }, { v: "zh", l: "Chinese" }].map((o) => (
                <option key={o.v} value={o.v}>{o.l}</option>
              ))}
            </select>
            <InfoNote text="Saved to config. Full multi-language support requires an i18n library to be integrated." />
          </div>
        </div>
      </div>

      {/* ── System Toggles ──────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionHeader}>
          <ToggleLeft size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>System Toggles</span>
        </div>
        <SettingRow key="user_registration" label="User Registration" description="Allow new users to create accounts">
          <Toggle checked={bool("user_registration")} onChange={() => toggle("user_registration")} />
        </SettingRow>
        <SettingRow key="order_processing" label="Order Processing" description="Enable automatic order fulfillment" note="Saved to config — enforcement applies when the order API is active.">
          <Toggle checked={bool("order_processing")} onChange={() => toggle("order_processing")} />
        </SettingRow>
        <SettingRow key="email_notifications" label="Email Notifications" description="Send transactional emails to customers (welcome email, ticket replies)" apiSlug="smtp-email">
          <Toggle checked={bool("email_notifications")} onChange={() => toggle("email_notifications")} />
        </SettingRow>
        <SettingRow key="two_factor_auth" label="Two-Factor Auth (2FA)" description="Require 2FA for all admin logins" note="Setting is saved. Enforcement needs a 2FA/OTP provider configured below." apiSlug="sms-otp">
          <Toggle checked={bool("two_factor_auth")} onChange={() => toggle("two_factor_auth")} />
        </SettingRow>
        <SettingRow key="auto_refunds" label="Automatic Refunds" description="Automatically process refunds for failed orders" note="Saved to config — applies when the payment gateway and refund flow are active.">
          <Toggle checked={bool("auto_refunds")} onChange={() => toggle("auto_refunds")} />
        </SettingRow>
      </div>

      {/* ── Notifications ───────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionHeader}>
          <Bell size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>Admin Notification Events</span>
        </div>
        {[
          { key: "notif_new_user", label: "New User Registrations", description: "Notify when a new user signs up" },
          { key: "notif_new_order", label: "New Orders", description: "Notify when a new order is placed" },
          { key: "notif_new_ticket", label: "New Support Tickets", description: "Notify when a customer opens a ticket" },
          { key: "notif_payment_failed", label: "Failed Payments", description: "Notify when a payment attempt fails" },
          { key: "notif_low_stock", label: "Low Stock Alerts", description: "Notify when voucher/subscription stock runs low" },
        ].map((item) => (
          <SettingRow key={item.key} label={item.label} description={item.description}>
            <Toggle checked={bool(item.key)} onChange={() => toggle(item.key)} />
          </SettingRow>
        ))}
      </div>

      {/* ── Security ────────────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionHeader}>
          <Shield size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>Security & Access</span>
        </div>
        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "14px" }}>
          <div>
            <label style={labelStyle}>Session Timeout (minutes)</label>
            <input
              data-testid="input-session-timeout"
              type="number"
              min="5"
              max="1440"
              style={inputStyle}
              value={local.session_timeout_minutes ?? "60"}
              onChange={(e) => set("session_timeout_minutes", e.target.value)}
            />
            <InfoNote text="Saved to config. Full enforcement requires server-side session management to be implemented." />
          </div>
          <div>
            <label style={labelStyle}>Max Login Attempts</label>
            <input
              data-testid="input-max-login-attempts"
              type="number"
              min="1"
              max="20"
              style={inputStyle}
              value={local.max_login_attempts ?? "5"}
              onChange={(e) => set("max_login_attempts", e.target.value)}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>IP Whitelist (comma-separated, leave blank to allow all)</label>
            <input
              data-testid="input-ip-whitelist"
              style={inputStyle}
              placeholder="e.g. 192.168.1.1, 10.0.0.0/8"
              value={local.ip_whitelist ?? ""}
              onChange={(e) => set("ip_whitelist", e.target.value)}
            />
            <InfoNote text="Saved to config. IP-level enforcement requires a server middleware layer — contact a developer to activate." />
          </div>
        </div>
        <SettingRow label="Cookie Consent Banner" description="Show GDPR cookie consent notice to new visitors">
          <Toggle checked={bool("cookie_consent_enabled")} onChange={() => toggle("cookie_consent_enabled")} />
        </SettingRow>
        <div style={{ borderBottom: "none" }}>
          <SettingRow label="Audit Log" description="Record admin actions for security auditing" note="Saved to config. A full audit log system (logging all admin write actions to a dedicated table) can be enabled when the audit middleware is implemented.">
            <Toggle checked={bool("audit_log_enabled")} onChange={() => toggle("audit_log_enabled")} />
          </SettingRow>
        </div>
      </div>

      {/* ── User & Access ───────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionHeader}>
          <Users size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>User Management</span>
        </div>
        <SettingRow label="Require Email Verification" description="Users must verify their email before ordering" note="Requires SMTP for sending verification emails and an OTP flow to validate." apiSlug="smtp-email">
          <Toggle checked={bool("require_email_verify")} onChange={() => toggle("require_email_verify")} />
        </SettingRow>
        <SettingRow label="Allow Social Login" description="Enable Google, Facebook, and Discord sign-in" note="Sign-in buttons appear once OAuth credentials are configured in API Integration." apiSlug="social-auth-google">
          <Toggle checked={bool("social_login")} onChange={() => toggle("social_login")} />
        </SettingRow>
        <div style={{ padding: "14px 20px", borderTop: "1px solid hsl(220, 15%, 12%)" }}>
          <label style={labelStyle}>New Account Approval</label>
          <select
            data-testid="select-account-approval"
            style={{ ...selectStyle, maxWidth: "260px" }}
            value={local.account_approval ?? "auto"}
            onChange={(e) => set("account_approval", e.target.value)}
          >
            <option value="auto">Automatic (approved instantly)</option>
            <option value="manual">Manual review required — new accounts start inactive until an admin approves</option>
            <option value="invite">Invite only</option>
          </select>
        </div>
      </div>

      {/* ── Fees & Taxes ────────────────────────────────────────────────────── */}
      <FeesAndTaxesManager local={local} set={set} bool={bool} toggle={toggle} isMobile={isMobile} />


      {/* ── Legal & Footer ──────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionHeader}>
          <FileText size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>Footer & Legal</span>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={labelStyle}>Footer Copyright Text</label>
            <input
              data-testid="input-footer-copyright"
              style={inputStyle}
              value={local.footer_copyright ?? ""}
              onChange={(e) => set("footer_copyright", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Footer Button Label</label>
            <input
              data-testid="input-footer-button-name"
              style={inputStyle}
              placeholder="e.g. Contact Us (leave blank to hide)"
              value={local.footer_button_name ?? ""}
              onChange={(e) => set("footer_button_name", e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Footer Button Link</label>
            <input
              data-testid="input-footer-button-link"
              style={inputStyle}
              placeholder="e.g. /contact or https://..."
              value={local.footer_button_link ?? ""}
              onChange={(e) => set("footer_button_link", e.target.value)}
            />
          </div>
        </div>
        <div style={{ padding: "16px 20px", borderTop: "1px solid hsl(220, 15%, 12%)", display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ fontSize: "11px", color: "hsl(220, 10%, 50%)", margin: 0 }}>
            Override the default content for each legal page. Leave blank to use the built-in defaults.
          </p>
          {[
            { key: "terms_content", label: "Terms of Service" },
            { key: "privacy_content", label: "Privacy Policy" },
            { key: "refund_content", label: "Refund Policy" },
            { key: "delivery_cancellation_content", label: "Delivery & Cancellation Policy" },
          ].map((item) => (
            <div key={item.key}>
              <label style={labelStyle}>{item.label}</label>
              <textarea
                data-testid={`input-${item.key}`}
                style={{ ...textareaStyle, minHeight: "250px" }}
                value={local[item.key] ?? ""}
                onChange={(e) => set(item.key, e.target.value)}
                placeholder={`Custom ${item.label} content (plain text or Markdown)…`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── About Us Page ───────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionHeader}>
          <FileText size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>About Us Page</span>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <p style={{ fontSize: "11px", color: "hsl(220, 10%, 50%)", margin: 0 }}>
            Customize the public About Us page. Leave any field blank to use the built-in default.
          </p>
          <div>
            <label style={labelStyle}>Page Headline</label>
            <input
              data-testid="input-about-headline"
              style={inputStyle}
              value={local.about_headline ?? ""}
              onChange={(e) => set("about_headline", e.target.value)}
              placeholder="About Us (defaults to site name)"
            />
          </div>
          <div>
            <label style={labelStyle}>Tagline / Intro</label>
            <textarea
              data-testid="input-about-tagline"
              style={{ ...textareaStyle, minHeight: "250px" }}
              value={local.about_tagline ?? ""}
              onChange={(e) => set("about_tagline", e.target.value)}
              placeholder="Short intro paragraph shown under the headline…"
            />
          </div>
          <div>
            <label style={labelStyle}>Our Story</label>
            <textarea
              data-testid="input-about-story"
              style={{ ...textareaStyle, minHeight: "130px" }}
              value={local.about_story ?? ""}
              onChange={(e) => set("about_story", e.target.value)}
              placeholder="Tell visitors your story — how you started, your mission, etc…"
            />
          </div>
        </div>
        <div style={{ padding: "16px 20px", borderTop: "1px solid hsl(220,15%,13%)", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <span style={{ fontSize: "12px", fontWeight: 600, color: "hsl(210, 40%, 85%)" }}>About Page Stats</span>
            <p style={{ fontSize: "11px", color: "hsl(220, 10%, 50%)", margin: "4px 0 0" }}>
              Override the live counts shown on the About page. Enter 0 to display the real database count.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {([
              { key: "about_stat_games",    label: "Games Available" },
              { key: "about_stat_products", label: "Products Available" },
              { key: "about_stat_orders",   label: "Orders Fulfilled" },
              { key: "about_stat_users",    label: "Registered Users" },
            ] as { key: string; label: string }[]).map((item) => (
              <div key={item.key}>
                <label style={labelStyle}>{item.label}</label>
                <input
                  data-testid={`input-${item.key}`}
                  type="number"
                  min="0"
                  step="1"
                  style={inputStyle}
                  placeholder="0"
                  value={local[item.key] ?? "0"}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    set(item.key, raw === "" ? "0" : String(Math.max(0, parseInt(raw, 10))));
                  }}
                />
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: "16px 20px", borderTop: "1px solid hsl(220,15%,13%)", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ ...labelStyle, marginBottom: "2px" }}>Why {local.site_name || "Nexcoin"} — Feature Cards</label>
            <p style={{ fontSize: "11px", color: "hsl(220,10%,40%)", marginBottom: "10px" }}>
              Click the icon button on each card to open the icon picker. Changes are saved with the rest of the settings.
            </p>
            <ValueCardsEditor
              value={local.why_nexcoin_cards ?? JSON.stringify(DEFAULT_VALUE_CARDS)}
              onChange={(v) => set("why_nexcoin_cards", v)}
            />
          </div>
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

// ─── Fees & Taxes Manager Component ────────────────────────────────────────────
interface Fee {
  id: string;
  name: string;
  description?: string;
  amount: string;
  type: "fixed" | "percentage";
  isActive: boolean;
  sortOrder: number;
}

function FeesAndTaxesManager({ local, set, bool, toggle, isMobile }: any) {
  const { data: fees = [], isLoading } = useQuery<Fee[]>({
    queryKey: ["/api/admin/fees"],
    queryFn: () => adminApi.get("/fees"),
  });
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", amount: "", type: "fixed", isActive: true });

  const createFee = useMutation({
    mutationFn: (data: any) => adminApi.post("/fees", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fees"] });
      setShowForm(false);
      setFormData({ name: "", amount: "", type: "fixed", isActive: true });
    },
  });

  const updateFee = useMutation({
    mutationFn: (data: any) => adminApi.patch(`/fees/${editingId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fees"] });
      setEditingId(null);
      setFormData({ name: "", amount: "", type: "fixed", isActive: true });
    },
  });

  const deleteFee = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/fees/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/fees"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount) return;
    const data = { ...formData, amount: parseFloat(formData.amount).toString() };
    if (editingId) updateFee.mutate(data);
    else createFee.mutate(data);
  };

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
    borderRadius: "4px",
    color: "hsl(210, 40%, 92%)",
    fontSize: "14px",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: "hsl(210, 40%, 85%)",
    marginBottom: "4px",
  };

  return (
    <div style={card}>
      <div style={sectionHeader}>
        <DollarSign size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
        <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>Fees & Taxes</span>
      </div>

      {/* Tax Settings */}
      <SettingRow label="Enable Tax Calculation" description="Automatically apply tax to all orders">
        <Toggle checked={bool("tax_enabled")} onChange={() => toggle("tax_enabled")} />
      </SettingRow>
      {bool("tax_enabled") && (
        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: "14px", borderTop: "1px solid hsl(220, 15%, 12%)" }}>
          <div>
            <label style={labelStyle}>Tax Name</label>
            <input data-testid="input-tax-name" style={inputStyle} value={local.tax_name ?? "VAT"} onChange={(e) => set("tax_name", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Tax Rate (%)</label>
            <input data-testid="input-tax-rate" type="number" min="0" max="100" step="0.01" style={inputStyle} value={local.tax_rate ?? "0"} onChange={(e) => set("tax_rate", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Invoice Prefix</label>
            <input data-testid="input-invoice-prefix" style={inputStyle} value={local.invoice_prefix ?? "INV"} onChange={(e) => set("invoice_prefix", e.target.value)} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Invoice Footer Note</label>
            <textarea data-testid="input-invoice-footer" style={{ ...inputStyle, minHeight: "72px" } as React.CSSProperties} value={local.invoice_footer ?? ""} onChange={(e) => set("invoice_footer", e.target.value)} />
          </div>
        </div>
      )}

      {/* Additional Fees Section */}
      <div style={{ borderTop: "1px solid hsl(220, 15%, 12%)", padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <label style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>Additional Charges</label>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setShowForm(!showForm); setEditingId(null); setFormData({ name: "", amount: "", type: "fixed", isActive: true }); }}
            style={{ display: "flex", alignItems: "center", gap: "4px", padding: "6px 12px", background: "hsl(258, 90%, 66%)", color: "#000", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
          >
            <Plus size={12} /> Add Fee
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: "16px", padding: "12px", background: "hsl(220, 15%, 12%)", borderRadius: "4px" }}>
            <div style={{ marginBottom: "10px" }}>
              <label style={labelStyle}>Fee Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Processing Fee" style={inputStyle} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              <div>
                <label style={labelStyle}>Amount</label>
                <input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} placeholder="0.00" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as "fixed" | "percentage" })} style={inputStyle}>
                  <option value="fixed">Fixed Amount</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="submit" style={{ flex: 1, padding: "8px 12px", background: "hsl(258, 90%, 66%)", color: "#000", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }} disabled={createFee.isPending || updateFee.isPending}>
                {editingId ? "Update" : "Add"}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setFormData({ name: "", amount: "", type: "fixed", isActive: true }); }} style={{ flex: 1, padding: "8px 12px", background: "hsl(220, 15%, 18%)", color: "hsl(210, 40%, 85%)", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {isLoading ? <p style={{ color: "hsl(220, 10%, 50%)", fontSize: "13px" }}>Loading fees...</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {fees.length === 0 ? (
              <p style={{ color: "hsl(220, 10%, 50%)", fontSize: "12px" }}>No additional fees configured. All charges will be free.</p>
            ) : (
              fees.map((fee) => (
                <div key={fee.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", background: "hsl(220, 15%, 11%)", borderRadius: "4px", border: "1px solid hsl(220, 15%, 18%)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>{fee.name}</div>
                    <div style={{ fontSize: "12px", color: "hsl(220, 10%, 50%)", marginTop: "2px" }}>
                      {fee.type === "percentage" ? `${parseFloat(fee.amount).toFixed(2)}%` : `${parseFloat(fee.amount).toFixed(2)}`} • {fee.isActive ? "Active" : "Inactive"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => { setEditingId(fee.id); setFormData({ name: fee.name, amount: fee.amount, type: fee.type, isActive: fee.isActive }); setShowForm(true); }}
                      style={{ padding: "4px 8px", background: "hsl(220, 15%, 18%)", color: "hsl(210, 40%, 85%)", border: "none", borderRadius: "3px", cursor: "pointer", fontSize: "11px" }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteFee.mutate(fee.id)}
                      style={{ padding: "4px 8px", background: "hsl(0, 100%, 50%, 0.2)", color: "hsl(0, 100%, 70%)", border: "none", borderRadius: "3px", cursor: "pointer", fontSize: "11px" }}
                      disabled={deleteFee.isPending}
                    >
                      <Trash2 size={11} style={{ display: "inline" }} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
