import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Loader2, Shield, Globe, Bell, Lock, Users, DollarSign, FileText, ToggleLeft } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";

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

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 20px",
        borderBottom: "1px solid hsl(220, 15%, 12%)",
        gap: "16px",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "hsl(210, 40%, 88%)", marginBottom: "2px" }}>{label}</div>
        {description && <div style={{ fontSize: "11px", color: "hsl(220, 10%, 42%)" }}>{description}</div>}
      </div>
      {children}
    </div>
  );
}

type SettingsMap = Record<string, string>;

const DEFAULTS: SettingsMap = {
  // General
  site_name: "Nexcoin",
  site_tagline: "Level Up Your Gaming Experience",
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
};

export default function ControlPanel() {
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

  function toggle(key: string) {
    setLocal((prev) => ({ ...prev, [key]: prev[key] === "true" ? "false" : "true" }));
  }

  function bool(key: string) {
    return local[key] === "true";
  }

  function handleSave() {
    save.mutate(local);
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

  return (
    <AdminLayout title="Control Panel">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", gap: "12px" }}>
        <div>
          <p style={{ fontSize: "12px", color: "hsl(220, 10%, 42%)", marginTop: "2px" }}>
            Manage system-wide configuration and feature toggles
          </p>
        </div>
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

      {/* ── General ─────────────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionHeader}>
          <Globe size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>General Settings</span>
        </div>
        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
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
          <div>
            <label style={labelStyle}>Timezone</label>
            <select
              data-testid="select-timezone"
              style={selectStyle}
              value={local.site_timezone ?? "UTC"}
              onChange={(e) => set("site_timezone", e.target.value)}
            >
              {["UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney"].map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
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
          </div>
          <div>
            <label style={labelStyle}>Default Currency</label>
            <select
              data-testid="select-currency"
              style={selectStyle}
              value={local.default_currency ?? "USD"}
              onChange={(e) => set("default_currency", e.target.value)}
            >
              {["USD", "EUR", "GBP", "SGD", "MYR", "IDR", "PHP"].map((c) => (
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
          </div>
        </div>
      </div>

      {/* ── System Toggles ──────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionHeader}>
          <ToggleLeft size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>System Toggles</span>
        </div>
        {[
          { key: "maintenance_mode", label: "Maintenance Mode", description: "Temporarily disable the storefront for all non-admin users" },
          { key: "user_registration", label: "User Registration", description: "Allow new users to create accounts" },
          { key: "order_processing", label: "Order Processing", description: "Enable automatic order fulfillment" },
          { key: "email_notifications", label: "Email Notifications", description: "Send transactional emails to customers" },
          { key: "two_factor_auth", label: "Two-Factor Auth (2FA)", description: "Require 2FA for all admin logins" },
          { key: "auto_refunds", label: "Automatic Refunds", description: "Automatically process refunds for failed orders" },
        ].map((item, i, arr) => (
          <div
            key={item.key}
            data-testid={`setting-${item.key}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 20px",
              borderBottom: i < arr.length - 1 ? "1px solid hsl(220, 15%, 12%)" : "none",
              gap: "16px",
            }}
          >
            <div>
              <div style={{ fontSize: "13px", fontWeight: 500, color: "hsl(210, 40%, 88%)", marginBottom: "2px" }}>{item.label}</div>
              <div style={{ fontSize: "11px", color: "hsl(220, 10%, 42%)" }}>{item.description}</div>
            </div>
            <Toggle checked={bool(item.key)} onChange={() => toggle(item.key)} />
          </div>
        ))}
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
        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
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
          </div>
        </div>
        <SettingRow label="Cookie Consent Banner" description="Show GDPR cookie consent notice to new visitors">
          <Toggle checked={bool("cookie_consent_enabled")} onChange={() => toggle("cookie_consent_enabled")} />
        </SettingRow>
        <div style={{ borderBottom: "none" }}>
          <SettingRow label="Audit Log" description="Record admin actions for security auditing">
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
        <SettingRow label="Require Email Verification" description="Users must verify their email before ordering">
          <Toggle checked={bool("require_email_verify")} onChange={() => toggle("require_email_verify")} />
        </SettingRow>
        <SettingRow label="Allow Social Login" description="Enable Google / Facebook sign-in">
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
            <option value="manual">Manual review required</option>
            <option value="invite">Invite only</option>
          </select>
        </div>
      </div>

      {/* ── Tax & Invoicing ─────────────────────────────────────────────────── */}
      <div style={card}>
        <div style={sectionHeader}>
          <DollarSign size={15} style={{ color: "hsl(258, 90%, 66%)" }} />
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 92%)" }}>Tax & Invoicing</span>
        </div>
        <SettingRow label="Enable Tax Calculation" description="Automatically apply tax to all orders">
          <Toggle checked={bool("tax_enabled")} onChange={() => toggle("tax_enabled")} />
        </SettingRow>
        {bool("tax_enabled") && (
          <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", borderTop: "1px solid hsl(220, 15%, 12%)" }}>
            <div>
              <label style={labelStyle}>Tax Name</label>
              <input
                data-testid="input-tax-name"
                style={inputStyle}
                value={local.tax_name ?? "VAT"}
                onChange={(e) => set("tax_name", e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Tax Rate (%)</label>
              <input
                data-testid="input-tax-rate"
                type="number"
                min="0"
                max="100"
                step="0.01"
                style={inputStyle}
                value={local.tax_rate ?? "0"}
                onChange={(e) => set("tax_rate", e.target.value)}
              />
            </div>
            <div>
              <label style={labelStyle}>Invoice Prefix</label>
              <input
                data-testid="input-invoice-prefix"
                style={inputStyle}
                value={local.invoice_prefix ?? "INV"}
                onChange={(e) => set("invoice_prefix", e.target.value)}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Invoice Footer Note</label>
              <textarea
                data-testid="input-invoice-footer"
                style={{ ...inputStyle, resize: "vertical", minHeight: "72px" } as React.CSSProperties}
                value={local.invoice_footer ?? ""}
                onChange={(e) => set("invoice_footer", e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

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
            <label style={labelStyle}>Support Email</label>
            <input
              data-testid="input-support-email"
              type="email"
              style={inputStyle}
              value={local.footer_support_email ?? ""}
              onChange={(e) => set("footer_support_email", e.target.value)}
            />
          </div>
        </div>
        <div style={{ padding: "0 20px 6px" }}>
          {[
            { key: "terms_of_service", label: "Terms of Service" },
            { key: "privacy_policy", label: "Privacy Policy" },
            { key: "refund_policy", label: "Refund Policy" },
          ].map((doc) => (
            <div
              key={doc.key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 0",
                borderTop: "1px solid hsl(220, 15%, 12%)",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "13px", color: "hsl(210, 40%, 80%)" }}>{doc.label}</span>
              <button
                data-testid={`button-edit-${doc.key}`}
                style={{
                  padding: "5px 14px",
                  borderRadius: "5px",
                  fontSize: "12px",
                  background: "hsl(220, 15%, 13%)",
                  color: "hsl(210, 40%, 70%)",
                  border: "1px solid hsl(220, 15%, 18%)",
                  cursor: "pointer",
                }}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
