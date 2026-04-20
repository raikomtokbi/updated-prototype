import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail, Save, Eye, Send, ChevronRight, CheckCircle,
  AlertCircle, Loader2, ArrowLeft, Tag, Monitor, Smartphone,
  Palette, Type, Settings2, X, ChevronDown,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useMobile } from "@/components/admin/AdminLayout";
import { useNavGuard } from "@/hooks/useNavGuard";
import { useToast } from "@/hooks/use-toast";
import { UnsavedChangesDialog } from "@/components/admin/UnsavedChangesDialog";
import { getAuthToken } from "@/lib/store/authstore";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface EmailStyles {
  fontFamily: string;
  fontSize: string;
  textColor: string;
  backgroundColor: string;
  containerWidth: string;
  padding: string;
  spacing: string;
  headingSize: string;
  headingColor: string;
  buttonBg: string;
  buttonColor: string;
  buttonBorderRadius: string;
  buttonAlignment: string;
  cardBg: string;
  cardBorderRadius: string;
  cardShadow: string;
  headerBg: string;
  headerColor: string;
  headerText: string;
  headerImageUrl: string;
  footerColor: string;
  logoUrl: string;
}

interface EmailTemplate {
  id?: string;
  type: string;
  name: string;
  subject: string;
  title: string;
  body: string;
  footerText?: string | null;
  buttonText?: string | null;
  buttonLink?: string | null;
  isEnabled?: boolean;
  styles?: string | null;
  updatedAt?: string;
}

interface FormState {
  type: string;
  name: string;
  subject: string;
  title: string;
  body: string;
  footerText: string;
  buttonText: string;
  buttonLink: string;
  copyEmail: string;
  isEnabled: boolean;
  styles: EmailStyles;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_STYLES: EmailStyles = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
  fontSize: "14px",
  textColor: "#c8cfe0",
  backgroundColor: "#0d0f14",
  containerWidth: "600px",
  padding: "32px",
  spacing: "20px",
  headingSize: "18px",
  headingColor: "#e8eeff",
  buttonBg: "hsl(var(--primary))",
  buttonColor: "#ffffff",
  buttonBorderRadius: "7px",
  buttonAlignment: "center",
  cardBg: "#141720",
  cardBorderRadius: "12px",
  cardShadow: "none",
  headerBg: "hsl(var(--primary))",
  headerColor: "#ffffff",
  headerText: "",
  headerImageUrl: "",
  footerColor: "#4a5568",
  logoUrl: "",
};

const PREVIEW_VARS: Record<string, string> = {
  user_name: "John",
  user_email: "john@email.com",
  user_id: "USR-000123",
  user_created_at: new Date().toLocaleDateString(),
  site_name: "Nexcoin",
  site_url: "https://nexcoin.store",
  support_email: "support@nexcoin.store",
  logo: "",
  order_id: "ORD-20260401",
  order_amount: "₹499.00",
  order_status: "Confirmed",
  order_date: new Date().toLocaleDateString(),
  order_time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  order_currency: "₹",
  payment_method: "Razorpay",
  product_name: "Mobile Legends Diamonds",
  product_quantity: "1",
  game_name: "Mobile Legends: Bang Bang",
  player_id: "262918936",
  zone_id: "9398",
  otp_code: "847291",
  reset_link: "https://nexcoin.store/reset?token=abc123",
  verification_link: "https://nexcoin.store/verify?token=abc123",
  button_text: "Click Here",
  button_url: "https://nexcoin.store",
  ticket_id: "TKT-00042",
  ticket_subject: "Issue with my order",
  reply_message: "We have resolved your issue. Please check your account.",
};

const ALL_VARIABLES = [
  {
    category: "User",
    color: "#10b981",
    vars: ["{{user_name}}", "{{user_email}}", "{{user_id}}", "{{user_created_at}}"],
  },
  {
    category: "Site",
    color: "#6366f1",
    vars: ["{{site_name}}", "{{site_url}}", "{{support_email}}", "{{logo}}"],
  },
  {
    category: "Order",
    color: "#f59e0b",
    vars: ["{{order_id}}", "{{order_date}}", "{{order_time}}", "{{order_amount}}", "{{order_currency}}", "{{order_status}}", "{{payment_method}}"],
  },
  {
    category: "Product",
    color: "#06b6d4",
    vars: ["{{product_name}}", "{{product_quantity}}", "{{game_name}}", "{{player_id}}", "{{zone_id}}"],
  },
  {
    category: "Support",
    color: "#f97316",
    vars: ["{{ticket_id}}", "{{ticket_subject}}", "{{reply_message}}"],
  },
  {
    category: "Security",
    color: "#ef4444",
    vars: ["{{otp_code}}", "{{reset_link}}", "{{verification_link}}"],
  },
  {
    category: "Button",
    color: "#8b5cf6",
    vars: ["{{button_text}}", "{{button_url}}"],
  },
];

const TEMPLATE_DEFS = [
  {
    type: "welcome",
    name: "Welcome Email",
    description: "Sent when a new user registers",
    color: "#10b981",
    icon: Mail,
  },
  {
    type: "otp",
    name: "OTP / Verification",
    description: "For password reset or verification",
    color: "#6366f1",
    icon: Settings2,
  },
  {
    type: "promotional",
    name: "Promotional Email",
    description: "Marketing campaigns & announcements",
    color: "#f59e0b",
    icon: Tag,
  },
  {
    type: "order_confirmation",
    name: "Order Confirmation",
    description: "Sent after a successful order",
    color: "#3b82f6",
    icon: CheckCircle,
  },
  {
    type: "support_ticket_reply",
    name: "Support Ticket Reply",
    description: "When admin replies to a support ticket",
    color: "#8b5cf6",
    icon: Send,
  },
];

// ─── Client-side HTML Builder ──────────────────────────────────────────────────

function processVars(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

function buildEmailHtmlClient(form: FormState, siteName = "Nexcoin"): string {
  const s = form.styles;
  const title = processVars(form.title, PREVIEW_VARS);
  const body = processVars(form.body, PREVIEW_VARS);
  const footer = processVars(
    form.footerText || `© ${new Date().getFullYear()} ${siteName}. All rights reserved.`,
    PREVIEW_VARS
  );
  const buttonText = form.buttonText ? processVars(form.buttonText, PREVIEW_VARS) : null;
  const buttonLink = form.buttonLink ? processVars(form.buttonLink, PREVIEW_VARS) : null;

  const button =
    buttonText && buttonLink
      ? `<div style="text-align:${s.buttonAlignment};margin:${s.spacing} 0 12px">
           <a href="${buttonLink}" style="display:inline-block;padding:12px 28px;background:${s.buttonBg};color:${s.buttonColor};text-decoration:none;border-radius:${s.buttonBorderRadius};font-weight:600;font-size:${s.fontSize};letter-spacing:0.02em;font-family:${s.fontFamily}">${buttonText}</a>
         </div>`
      : "";

  const htmlBody = body
    .split(/\n\n+/)
    .map(
      (p) =>
        `<p style="margin:0 0 14px;color:${s.textColor};font-size:${s.fontSize};line-height:1.7;font-family:${s.fontFamily}">${p.replace(/\n/g, "<br>")}</p>`
    )
    .join("");

  const cardShadow = s.cardShadow !== "none" && s.cardShadow ? `;box-shadow:${s.cardShadow}` : "";

  const logoHtml = s.logoUrl
    ? `<img src="${s.logoUrl}" alt="${siteName}" style="max-height:48px;max-width:160px;margin-bottom:10px;display:block;margin-left:auto;margin-right:auto" />`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${processVars(form.subject, PREVIEW_VARS)}</title>
</head>
<body style="margin:0;padding:0;background:${s.backgroundColor};font-family:${s.fontFamily}">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${s.backgroundColor};padding:40px 20px">
    <tr>
      <td align="center">
        <table width="${s.containerWidth}" cellpadding="0" cellspacing="0" style="max-width:${s.containerWidth};width:100%">
          <tr>
            <td style="background:${s.headerBg};${s.headerImageUrl ? `background-image:url('${s.headerImageUrl}');background-size:cover;background-position:center;` : ""}padding:24px ${s.padding};border-radius:${s.cardBorderRadius} ${s.cardBorderRadius} 0 0;text-align:center">
              ${logoHtml}
              <h1 style="margin:0;font-size:22px;font-weight:700;color:${s.headerColor};letter-spacing:-0.02em;font-family:${s.fontFamily}">${s.headerText || siteName}</h1>
            </td>
          </tr>
          <tr>
            <td style="background:${s.cardBg};padding:${s.padding};border-radius:0 0 ${s.cardBorderRadius} ${s.cardBorderRadius};border:1px solid #1e2535;border-top:none${cardShadow}">
              <h2 style="margin:0 0 ${s.spacing};font-size:${s.headingSize};font-weight:700;color:${s.headingColor};letter-spacing:-0.01em;font-family:${s.fontFamily}">${title}</h2>
              <div>${htmlBody}</div>
              ${button}
              <div style="margin-top:${s.spacing};padding-top:${s.spacing};border-top:1px solid #1e2535;text-align:center;font-size:11px;color:${s.footerColor};font-family:${s.fontFamily}">
                ${footer}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Shared Styles ─────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  color: "hsl(var(--foreground))",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: "140px",
  lineHeight: 1.7,
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "hsl(var(--muted-foreground))",
  marginBottom: "4px",
  display: "block",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

// ─── Template List Item ───────────────────────────────────────────────────────

function TemplateListItem({
  def,
  template,
  isSelected,
  onClick,
}: {
  def: (typeof TEMPLATE_DEFS)[number];
  template?: EmailTemplate;
  isSelected: boolean;
  onClick: () => void;
}) {
  const Icon = def.icon;
  const saved = !!(template && template.id);
  return (
    <div
      onClick={onClick}
      style={{
        padding: "12px 14px",
        cursor: "pointer",
        background: isSelected ? "hsl(var(--primary) / 0.08)" : "transparent",
        borderLeft: `3px solid ${isSelected ? "hsl(var(--primary))" : "transparent"}`,
        borderBottom: "1px solid hsl(var(--border) / 0.5)",
        transition: "background 0.15s",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        background: `${def.color}18`, border: `1px solid ${def.color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Icon size={16} color={def.color} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(var(--foreground))", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {def.name}
        </div>
        <div style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {def.description}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {saved && <CheckCircle size={11} color="#10b981" />}
        <ChevronRight size={13} color="hsl(var(--muted-foreground) / 0.7)" />
      </div>
    </div>
  );
}

// ─── Variable Picker ──────────────────────────────────────────────────────────

function VariablePicker({ onInsert, activeField }: { onInsert: (v: string) => void; activeField: string | null }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string[]>(ALL_VARIABLES.map((g) => g.category));

  function toggle(cat: string) {
    setExpanded((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "5px 10px", borderRadius: 6, fontSize: "11px", fontWeight: 600,
          background: open ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)",
          border: "1px solid rgba(99,102,241,0.25)", color: "#818cf8", cursor: "pointer",
        }}
      >
        <Tag size={11} />
        Insert Variable
        <ChevronDown size={11} style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 100,
            background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
            borderRadius: 8, width: 280, maxHeight: 380, overflow: "auto",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ padding: "8px 12px", borderBottom: "1px solid hsl(var(--border))" }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {activeField ? `Insert into: ${activeField}` : "Click a variable to insert"}
            </div>
          </div>
          {ALL_VARIABLES.map((group) => (
            <div key={group.category}>
              <button
                type="button"
                onClick={() => toggle(group.category)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 12px", background: "transparent", border: "none",
                  borderBottom: "1px solid hsl(var(--border) / 0.5)", cursor: "pointer",
                  color: group.color, fontSize: "11px", fontWeight: 700,
                  textTransform: "uppercase", letterSpacing: "0.05em",
                }}
              >
                {group.category}
                <ChevronDown size={11} style={{ transform: expanded.includes(group.category) ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />
              </button>
              {expanded.includes(group.category) && (
                <div style={{ padding: "6px 10px 8px", display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {group.vars.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => { onInsert(v); setOpen(false); }}
                      style={{
                        padding: "3px 8px", borderRadius: 12, fontSize: "11px", fontFamily: "monospace",
                        background: `${group.color}12`, color: group.color,
                        border: `1px solid ${group.color}30`, cursor: "pointer",
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Style Control Helpers ─────────────────────────────────────────────────────

function StyleRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
      <label style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", flexShrink: 0, minWidth: 120 }}>{label}</label>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  // Extract a usable hex from gradient or hex for the color swatch
  const hexFromValue = value.match(/#([0-9a-fA-F]{3,8})/)?.[0] ?? "hsl(var(--primary))";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input
        type="color"
        value={hexFromValue}
        onChange={(e) => onChange(e.target.value)}
        title="Pick a solid color (replaces gradient)"
        style={{ width: 28, height: 26, borderRadius: 4, border: "1px solid hsl(var(--border))", background: "none", cursor: "pointer", padding: 1, flexShrink: 0 }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, flex: 1, padding: "6px 8px", fontSize: "12px", fontFamily: "monospace" }}
        placeholder="#hex or linear-gradient(...)"
      />
    </div>
  );
}

function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { label: string; value: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...inputStyle, padding: "6px 8px", fontSize: "12px" }}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...inputStyle, padding: "6px 8px", fontSize: "12px" }}
    />
  );
}

// ─── Styles Editor Panel ───────────────────────────────────────────────────────

function StylesEditor({ styles, onChange }: { styles: EmailStyles; onChange: (s: EmailStyles) => void }) {
  function set(key: keyof EmailStyles, value: string) {
    onChange({ ...styles, [key]: value });
  }

  const fontOptions = [
    { label: "System UI (Default)", value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" },
    { label: "Arial", value: "Arial, Helvetica, sans-serif" },
    { label: "Georgia", value: "Georgia, 'Times New Roman', serif" },
    { label: "Trebuchet MS", value: "'Trebuchet MS', Tahoma, sans-serif" },
    { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
    { label: "Courier New (Mono)", value: "'Courier New', Courier, monospace" },
  ];

  const alignOptions = [
    { label: "Left", value: "left" },
    { label: "Center", value: "center" },
    { label: "Right", value: "right" },
  ];

  const shadowOptions = [
    { label: "None", value: "none" },
    { label: "Subtle", value: "0 2px 8px rgba(0,0,0,0.3)" },
    { label: "Medium", value: "0 4px 16px rgba(0,0,0,0.4)" },
    { label: "Strong", value: "0 8px 32px rgba(0,0,0,0.6)" },
  ];

  const section: React.CSSProperties = {
    marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid hsl(var(--border) / 0.5)",
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: "11px", fontWeight: 700, color: "hsl(var(--muted-foreground))",
    textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12,
  };

  return (
    <div style={{ padding: "14px 14px" }}>
      <div style={section}>
        <div style={sectionTitle}>Typography</div>
        <StyleRow label="Font Family">
          <SelectInput value={styles.fontFamily} onChange={(v) => set("fontFamily", v)} options={fontOptions} />
        </StyleRow>
        <StyleRow label="Body Font Size">
          <TextInput value={styles.fontSize} onChange={(v) => set("fontSize", v)} placeholder="14px" />
        </StyleRow>
        <StyleRow label="Heading Size">
          <TextInput value={styles.headingSize} onChange={(v) => set("headingSize", v)} placeholder="18px" />
        </StyleRow>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Colors</div>
        <StyleRow label="Body Text">
          <ColorInput value={styles.textColor} onChange={(v) => set("textColor", v)} />
        </StyleRow>
        <StyleRow label="Heading Color">
          <ColorInput value={styles.headingColor} onChange={(v) => set("headingColor", v)} />
        </StyleRow>
        <StyleRow label="Background">
          <ColorInput value={styles.backgroundColor} onChange={(v) => set("backgroundColor", v)} />
        </StyleRow>
        <StyleRow label="Footer Text">
          <ColorInput value={styles.footerColor} onChange={(v) => set("footerColor", v)} />
        </StyleRow>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Header</div>
        <StyleRow label="Header Text">
          <TextInput value={styles.headerText} onChange={(v) => set("headerText", v)} placeholder="Leave blank to use site name" />
        </StyleRow>
        <StyleRow label="Header Background">
          <ColorInput value={styles.headerBg} onChange={(v) => set("headerBg", v)} />
        </StyleRow>
        <StyleRow label="Header Image URL">
          <TextInput value={styles.headerImageUrl} onChange={(v) => set("headerImageUrl", v)} placeholder="https://... (overrides background color)" />
        </StyleRow>
        <StyleRow label="Header Text Color">
          <ColorInput value={styles.headerColor} onChange={(v) => set("headerColor", v)} />
        </StyleRow>
        <StyleRow label="Logo URL">
          <TextInput value={styles.logoUrl} onChange={(v) => set("logoUrl", v)} placeholder="https://..." />
        </StyleRow>
      </div>

      <div style={section}>
        <div style={sectionTitle}>Card / Container</div>
        <StyleRow label="Card Background">
          <ColorInput value={styles.cardBg} onChange={(v) => set("cardBg", v)} />
        </StyleRow>
        <StyleRow label="Border Radius">
          <TextInput value={styles.cardBorderRadius} onChange={(v) => set("cardBorderRadius", v)} placeholder="12px" />
        </StyleRow>
        <StyleRow label="Card Shadow">
          <SelectInput value={styles.cardShadow} onChange={(v) => set("cardShadow", v)} options={shadowOptions} />
        </StyleRow>
        <StyleRow label="Container Width">
          <TextInput value={styles.containerWidth} onChange={(v) => set("containerWidth", v)} placeholder="600px" />
        </StyleRow>
        <StyleRow label="Padding">
          <TextInput value={styles.padding} onChange={(v) => set("padding", v)} placeholder="32px" />
        </StyleRow>
        <StyleRow label="Element Spacing">
          <TextInput value={styles.spacing} onChange={(v) => set("spacing", v)} placeholder="20px" />
        </StyleRow>
      </div>

      <div>
        <div style={sectionTitle}>Button</div>
        <StyleRow label="Button Background">
          <ColorInput value={styles.buttonBg} onChange={(v) => set("buttonBg", v)} />
        </StyleRow>
        <StyleRow label="Button Text Color">
          <ColorInput value={styles.buttonColor} onChange={(v) => set("buttonColor", v)} />
        </StyleRow>
        <StyleRow label="Border Radius">
          <TextInput value={styles.buttonBorderRadius} onChange={(v) => set("buttonBorderRadius", v)} placeholder="7px" />
        </StyleRow>
        <StyleRow label="Alignment">
          <SelectInput value={styles.buttonAlignment} onChange={(v) => set("buttonAlignment", v)} options={alignOptions} />
        </StyleRow>
      </div>
    </div>
  );
}

// ─── Test Email Dialog ────────────────────────────────────────────────────────

function TestEmailDialog({ type, onClose }: { type: string; onClose: () => void }) {
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSend() {
    if (!to) return;
    setSending(true);
    setResult(null);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/email-templates/${type}/test`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ to }),
      });
      const data = await res.json();
      setResult({ ok: res.ok, message: data.message || (res.ok ? "Sent!" : "Failed") });
    } catch {
      setResult({ ok: false, message: "Network error" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, width: "100%", maxWidth: 440 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "14px 16px", borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Send size={14} color="hsl(var(--primary))" />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(var(--foreground))" }}>Send Test Email</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", fontSize: 18, lineHeight: 1, padding: "0 4px", display: "flex" }}><X size={16} /></button>
        </div>
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", margin: 0, lineHeight: 1.6 }}>
            A test email will be sent using your SMTP configuration with sample preview data.
          </p>
          <div>
            <label style={labelStyle}>Recipient Email</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="test@example.com"
              style={inputStyle}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
          </div>
          {result && (
            <div style={{
              padding: "10px 12px", borderRadius: 6, fontSize: "12px",
              background: result.ok ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${result.ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
              color: result.ok ? "#10b981" : "#ef4444",
              display: "flex", gap: 8, alignItems: "flex-start",
            }}>
              {result.ok ? <CheckCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} /> : <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />}
              {result.message}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: "9px 0", borderRadius: 6, fontSize: "13px",
              background: "hsl(var(--border))", border: "1px solid hsl(var(--border))",
              color: "hsl(var(--muted-foreground))", cursor: "pointer",
            }}>Cancel</button>
            <button
              onClick={handleSend}
              disabled={!to || sending}
              style={{
                flex: 2, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "9px 0", borderRadius: 6, fontSize: "13px", fontWeight: 600,
                background: "hsl(var(--primary))", color: "#fff",
                border: "none", cursor: (!to || sending) ? "not-allowed" : "pointer",
                opacity: !to || sending ? 0.6 : 1,
              }}
            >
              {sending ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Sending...</> : <><Send size={13} /> Send Test</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Live Preview Panel ────────────────────────────────────────────────────────

function LivePreview({ html, previewMode, setPreviewMode, hideTitle }: {
  html: string;
  previewMode: "desktop" | "mobile";
  setPreviewMode: (m: "desktop" | "mobile") => void;
  hideTitle?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Preview toolbar */}
      <div style={{
        padding: "8px 14px",
        borderBottom: "1px solid hsl(var(--border))",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "hsl(var(--background))", flexShrink: 0,
      }}>
        {!hideTitle && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Eye size={13} color="hsl(var(--primary))" />
            <span style={{ fontSize: "12px", fontWeight: 600, color: "hsl(210,40%,86%)" }}>Live Preview</span>
            <span style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))" }}>updates in real time</span>
          </div>
        )}
        {hideTitle && <div />}
        <div style={{ display: "flex", gap: 4 }}>
          <button
            type="button"
            onClick={() => setPreviewMode("desktop")}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px",
              borderRadius: 5, fontSize: "11px", fontWeight: 600, border: "1px solid",
              cursor: "pointer", transition: "all 0.15s",
              background: previewMode === "desktop" ? "hsl(var(--primary) / 0.15)" : "transparent",
              borderColor: previewMode === "desktop" ? "rgba(124,58,237,0.4)" : "hsl(var(--border))",
              color: previewMode === "desktop" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}
          >
            <Monitor size={11} /> Desktop
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode("mobile")}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px",
              borderRadius: 5, fontSize: "11px", fontWeight: 600, border: "1px solid",
              cursor: "pointer", transition: "all 0.15s",
              background: previewMode === "mobile" ? "hsl(var(--primary) / 0.15)" : "transparent",
              borderColor: previewMode === "mobile" ? "rgba(124,58,237,0.4)" : "hsl(var(--border))",
              color: previewMode === "mobile" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}
          >
            <Smartphone size={11} /> Mobile
          </button>
        </div>
      </div>

      {/* Preview frame */}
      <div style={{ flex: 1, overflow: "auto", background: "hsl(var(--muted) / 0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px 16px" }}>
        <div style={{
          width: previewMode === "mobile" ? 375 : "100%",
          maxWidth: previewMode === "mobile" ? 375 : undefined,
          background: "#fff",
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
          transition: "width 0.25s",
        }}>
          <iframe
            ref={iframeRef}
            srcDoc={html}
            style={{ width: "100%", height: previewMode === "mobile" ? 640 : 520, border: "none", display: "block" }}
            title="Email Preview"
            sandbox="allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Template Editor ──────────────────────────────────────────────────────────

type EditorTab = "content" | "styles";

function TemplateEditor({
  def,
  template,
  onSaved,
  onBack,
  isMobile,
  onDirtyChange,
  registerSave,
  onSaveSuccess,
}: {
  def: (typeof TEMPLATE_DEFS)[number];
  template?: EmailTemplate;
  onSaved: () => void;
  onBack?: () => void;
  isMobile: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  registerSave?: (fn: () => void) => void;
  onSaveSuccess?: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>({
    type: def.type,
    name: def.name,
    subject: "",
    title: "",
    body: "",
    footerText: "",
    buttonText: "",
    buttonLink: "",
    copyEmail: "",
    isEnabled: true,
    styles: { ...DEFAULT_STYLES },
  });
  const [isDirty, setIsDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorTab>("content");
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const activeFieldRef = useRef<{ key: keyof FormState; el: HTMLTextAreaElement | HTMLInputElement } | null>(null);

  useEffect(() => {
    if (template) {
      let parsedStyles: EmailStyles = { ...DEFAULT_STYLES };
      if (template.styles) {
        try { parsedStyles = { ...DEFAULT_STYLES, ...JSON.parse(template.styles) }; } catch { /**/ }
      }
      setForm({
        type: template.type,
        name: template.name,
        subject: template.subject ?? "",
        title: template.title ?? "",
        body: template.body ?? "",
        footerText: template.footerText ?? "",
        buttonText: template.buttonText ?? "",
        buttonLink: template.buttonLink ?? "",
        copyEmail: template.copyEmail ?? "",
        isEnabled: template.isEnabled ?? true,
        styles: parsedStyles,
      });
      setIsDirty(false);
      setSaved(false);
    }
  }, [template?.type, template?.updatedAt]);

  useEffect(() => { onDirtyChange?.(isDirty); }, [isDirty]);

  const formRef = useRef(form);
  formRef.current = form;

  // Live preview HTML - recomputed on every form change
  const previewHtml = useMemo(() => buildEmailHtmlClient(form), [form]);

  const { toast } = useToast();
  const saveMut = useMutation({
    mutationFn: async (data: FormState) => {
      const token = getAuthToken();
      const res = await fetch(`/api/admin/email-templates/${def.type}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: data.type,
          name: data.name,
          subject: data.subject,
          title: data.title,
          body: data.body,
          footerText: data.footerText,
          buttonText: data.buttonText,
          buttonLink: data.buttonLink,
          copyEmail: data.copyEmail,
          isEnabled: data.isEnabled,
          styles: JSON.stringify(data.styles),
        }),
      });
      const text = await res.text();
      let d: any = {};
      try { d = text ? JSON.parse(text) : {}; } catch { d = { message: text || `HTTP ${res.status}` }; }
      if (!res.ok) throw new Error(d.message || `Failed (${res.status})`);
      return d;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      setSaved(true);
      setIsDirty(false);
      setTimeout(() => setSaved(false), 2500);
      onSaved();
      onSaveSuccess?.();
      toast({ title: "Template saved", description: `${def.name} saved successfully.` });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err?.message || "Could not save template.", variant: "destructive" });
    },
  });

  useEffect(() => {
    registerSave?.(() => { saveMut.mutate(formRef.current); });
  }, []);

  function setField(key: keyof FormState, value: string | boolean | EmailStyles) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setSaved(false);
  }

  function insertVar(v: string) {
    const ref = activeFieldRef.current;
    if (ref) {
      const { el, key } = ref;
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const newValue = el.value.slice(0, start) + v + el.value.slice(end);
      setField(key, newValue);
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + v.length;
        el.focus();
      }, 0);
    } else {
      // Append to body as fallback
      setField("body", (form.body || "") + v);
    }
  }

  function trackFocus(key: keyof FormState, label: string) {
    return {
      onFocus: (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        activeFieldRef.current = { key, el: e.currentTarget };
        setActiveField(label);
      },
    };
  }

  const Icon = def.icon;

  const tabBtn = (tab: EditorTab, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      style={{
        flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
        padding: "7px 0", borderRadius: 0, fontSize: "12px", fontWeight: 600,
        background: "transparent", border: "none",
        borderBottom: `2px solid ${activeTab === tab ? "hsl(var(--primary))" : "transparent"}`,
        color: activeTab === tab ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
        cursor: "pointer", transition: "color 0.15s",
      }}
    >
      {icon} {label}
    </button>
  );

  const editorPanel = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Editor header */}
      <div style={{ padding: "10px 14px", borderBottom: "1px solid hsl(var(--border))", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          {isMobile && onBack && (
            <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", padding: "4px 6px 4px 0", display: "flex", flexShrink: 0 }}>
              <ArrowLeft size={18} />
            </button>
          )}
          <div style={{ width: 32, height: 32, borderRadius: 7, flexShrink: 0, background: `${def.color}18`, border: `1px solid ${def.color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={15} color={def.color} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "hsl(210,40%,94%)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{def.name}</div>
            <div style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{def.description}</div>
          </div>

          {/* Enable toggle */}
          <button
            type="button"
            title={form.isEnabled ? "Template enabled" : "Template disabled"}
            onClick={() => setField("isEnabled", !form.isEnabled)}
            style={{
              position: "relative", width: 38, height: 22, borderRadius: 11, border: "none",
              background: form.isEnabled ? "hsl(var(--primary))" : "hsl(var(--border))",
              cursor: "pointer", flexShrink: 0, padding: 0,
            }}
          >
            <span style={{
              position: "absolute", top: 2,
              left: form.isEnabled ? "calc(100% - 19px)" : "2px",
              width: 18, height: 18, borderRadius: "50%", background: "white",
              transition: "left 0.2s", display: "block",
            }} />
          </button>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 6 }}>
          {isMobile && (
            <button
              onClick={() => setShowPreviewModal(true)}
              style={{
                flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
                padding: "6px 0", borderRadius: 6, fontSize: "12px", fontWeight: 600,
                background: "hsl(var(--border))", border: "1px solid hsl(var(--border))",
                color: "hsl(var(--primary))", cursor: "pointer",
              }}
            >
              <Eye size={12} /> Preview
            </button>
          )}
          <button
            onClick={() => setShowTestDialog(true)}
            style={{
              flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
              padding: "6px 0", borderRadius: 6, fontSize: "12px", fontWeight: 600,
              background: "hsl(var(--border))", border: "1px solid hsl(var(--border))",
              color: "#60a5fa", cursor: "pointer",
            }}
          >
            <Send size={12} /> Send Test
          </button>
          <button
            onClick={() => saveMut.mutate(form)}
            disabled={saveMut.isPending || (!isDirty && !saved)}
            style={{
              flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5,
              padding: "6px 0", borderRadius: 6, fontSize: "12px", fontWeight: 600,
              background: saved ? "#16a34a" : (isDirty ? "hsl(var(--primary))" : "hsl(var(--border))"),
              color: (saved || isDirty) ? "#fff" : "hsl(var(--muted-foreground))",
              border: "none", cursor: saveMut.isPending ? "wait" : "pointer",
              opacity: (!isDirty && !saved) ? 0.5 : 1,
            }}
          >
            {saveMut.isPending ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={12} />}
            {saved ? "Saved!" : "Save"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid hsl(var(--border))", flexShrink: 0 }}>
        {tabBtn("content", "Content", <Type size={11} />)}
        {tabBtn("styles", "Styles", <Palette size={11} />)}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {activeTab === "content" && (
          <div style={{ padding: "14px 14px", display: "flex", flexDirection: "column", gap: 13 }}>

            {/* Save error */}
            {saveMut.isError && (
              <div style={{ padding: "9px 12px", borderRadius: 6, fontSize: "12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", display: "flex", gap: 8, alignItems: "center" }}>
                <AlertCircle size={13} />
                {(saveMut.error as Error)?.message || "Failed to save"}
              </div>
            )}

            {/* Variable picker */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>
                Click a field, then insert a variable
              </div>
              <VariablePicker onInsert={insertVar} activeField={activeField} />
            </div>

            {/* Subject */}
            <div>
              <label style={labelStyle}>Email Subject</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setField("subject", e.target.value)}
                placeholder="Subject line..."
                style={inputStyle}
                {...trackFocus("subject", "Subject")}
              />
            </div>

            {/* Title */}
            <div>
              <label style={labelStyle}>Email Title / Heading</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="Main heading shown in the email..."
                style={inputStyle}
                {...trackFocus("title", "Title")}
              />
            </div>

            {/* Body */}
            <div>
              <label style={labelStyle}>Body Content</label>
              <textarea
                value={form.body}
                onChange={(e) => setField("body", e.target.value)}
                placeholder="Email body text... Use double blank line to create new paragraph."
                style={textareaStyle}
                {...trackFocus("body", "Body")}
              />
              <div style={{ fontSize: "10px", color: "hsl(var(--muted-foreground) / 0.7)", marginTop: 4 }}>
                Double blank line = new paragraph. Single line break = line break within paragraph.
              </div>
            </div>

            {/* Button */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>Button Text</label>
                <input
                  type="text"
                  value={form.buttonText}
                  onChange={(e) => setField("buttonText", e.target.value)}
                  placeholder="Click Here"
                  style={inputStyle}
                  {...trackFocus("buttonText", "Button Text")}
                />
              </div>
              <div>
                <label style={labelStyle}>Button URL</label>
                <input
                  type="text"
                  value={form.buttonLink}
                  onChange={(e) => setField("buttonLink", e.target.value)}
                  placeholder="https://..."
                  style={inputStyle}
                  {...trackFocus("buttonLink", "Button URL")}
                />
              </div>
            </div>

            {/* Footer */}
            <div>
              <label style={labelStyle}>Footer Text</label>
              <input
                type="text"
                value={form.footerText}
                onChange={(e) => setField("footerText", e.target.value)}
                placeholder="Footer text shown at the bottom..."
                style={inputStyle}
                {...trackFocus("footerText", "Footer Text")}
              />
            </div>

            {/* Email Copy */}
            <div>
              <label style={labelStyle}>Email Copy (CC)</label>
              <input
                type="email"
                value={form.copyEmail}
                onChange={(e) => setField("copyEmail", e.target.value)}
                placeholder="admin@example.com"
                style={inputStyle}
                {...trackFocus("copyEmail", "Email Copy")}
              />
            </div>
          </div>
        )}

        {activeTab === "styles" && (
          <StylesEditor
            styles={form.styles}
            onChange={(s) => {
              setForm((prev) => ({ ...prev, styles: s }));
              setIsDirty(true);
              setSaved(false);
            }}
          />
        )}
      </div>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <div style={{ height: "100%" }}>{editorPanel}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "100%", gap: 0 }}>
          <div style={{ borderRight: "1px solid hsl(var(--border))", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {editorPanel}
          </div>
          <div style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <LivePreview html={previewHtml} previewMode={previewMode} setPreviewMode={setPreviewMode} />
          </div>
        </div>
      )}

      {/* Mobile preview modal */}
      {showPreviewModal && isMobile && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "hsl(var(--background))", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 14px", borderBottom: "1px solid hsl(var(--border))", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Eye size={14} color="hsl(var(--primary))" />
              <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(var(--foreground))" }}>Live Preview</span>
            </div>
            <button onClick={() => setShowPreviewModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", display: "flex" }}>
              <X size={18} />
            </button>
          </div>
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <LivePreview html={previewHtml} previewMode={previewMode} setPreviewMode={setPreviewMode} hideTitle />
          </div>
        </div>
      )}

      {showTestDialog && <TestEmailDialog type={def.type} onClose={() => setShowTestDialog(false)} />}
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function EmailTemplates() {
  const isMobile = useMobile();
  const qc = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/admin/email-templates"],
  });

  const [selectedType, setSelectedType] = useState<string>(TEMPLATE_DEFS[0].type);
  const [showEditor, setShowEditor] = useState(!isMobile);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingType, setPendingType] = useState<string | null>(null);
  const [showUnsaved, setShowUnsaved] = useState(false);
  const saveFnRef = useRef<(() => void) | null>(null);

  const selectedDef = TEMPLATE_DEFS.find((d) => d.type === selectedType)!;
  const selectedTemplate = templates.find((t) => t.type === selectedType);

  function trySelectType(type: string) {
    if (isDirty && type !== selectedType) {
      setPendingType(type);
      setShowUnsaved(true);
    } else {
      setSelectedType(type);
      if (isMobile) setShowEditor(true);
    }
  }

  function handleDiscard() {
    if (pendingType) {
      setSelectedType(pendingType);
      setIsDirty(false);
      setPendingType(null);
      if (isMobile) setShowEditor(true);
    }
    setShowUnsaved(false);
  }

  function handleSaveAndLeave() {
    saveFnRef.current?.();
    if (pendingType) {
      setSelectedType(pendingType);
      setPendingType(null);
      if (isMobile) setShowEditor(true);
    }
    setShowUnsaved(false);
  }

  const { showDialog, confirmNavigation, cancelNavigation } = useNavGuard(isDirty);

  const sidebarWidth = isMobile ? "100%" : 220;

  return (
    <AdminLayout>
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "hsl(var(--background))" }}>

        {/* Page header */}
        <div style={{
          padding: "10px 16px",
          borderBottom: "1px solid hsl(var(--border) / 0.5)",
          display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
          background: "hsl(var(--background))",
        }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "hsl(var(--primary) / 0.15)", border: "1px solid hsl(var(--primary) / 0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Mail size={16} color="hsl(var(--primary))" />
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "hsl(210,40%,94%)" }}>Email Templates</div>
            <div style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>Edit, preview & send test emails</div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Sidebar — always visible on desktop, hidden on mobile when editor open */}
          {(!isMobile || !showEditor) && (
            <div style={{
              width: sidebarWidth, flexShrink: 0,
              borderRight: "1px solid hsl(var(--border) / 0.5)",
              display: "flex", flexDirection: "column", overflow: "hidden",
              background: "hsl(var(--background))",
            }}>
              <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid hsl(var(--border) / 0.5)" }}>
                <div style={{ fontSize: "10px", fontWeight: 700, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {TEMPLATE_DEFS.length} Templates
                </div>
              </div>
              <div style={{ flex: 1, overflow: "auto" }}>
                {isLoading ? (
                  <div style={{ padding: "24px", display: "flex", justifyContent: "center" }}>
                    <Loader2 size={18} color="hsl(var(--primary))" style={{ animation: "spin 1s linear infinite" }} />
                  </div>
                ) : (
                  TEMPLATE_DEFS.map((def) => (
                    <TemplateListItem
                      key={def.type}
                      def={def}
                      template={templates.find((t) => t.type === def.type)}
                      isSelected={selectedType === def.type}
                      onClick={() => trySelectType(def.type)}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* Editor area */}
          {(!isMobile || showEditor) && (
            <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {isLoading ? (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Loader2 size={24} color="hsl(var(--primary))" style={{ animation: "spin 1s linear infinite" }} />
                </div>
              ) : (
                <TemplateEditor
                  key={selectedType}
                  def={selectedDef}
                  template={selectedTemplate}
                  onSaved={() => qc.invalidateQueries({ queryKey: ["/api/admin/email-templates"] })}
                  onBack={() => setShowEditor(false)}
                  isMobile={isMobile}
                  onDirtyChange={setIsDirty}
                  registerSave={(fn) => { saveFnRef.current = fn; }}
                  onSaveSuccess={() => {
                    if (pendingType) {
                      setSelectedType(pendingType);
                      setPendingType(null);
                    }
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {showUnsaved && (
        <UnsavedChangesDialog
          onDiscard={handleDiscard}
          onSave={handleSaveAndLeave}
          onCancel={() => { setPendingType(null); setShowUnsaved(false); }}
        />
      )}

      {showDialog && (
        <UnsavedChangesDialog
          onDiscard={confirmNavigation}
          onSave={() => { saveFnRef.current?.(); confirmNavigation(); }}
          onCancel={cancelNavigation}
        />
      )}
    </AdminLayout>
  );
}
