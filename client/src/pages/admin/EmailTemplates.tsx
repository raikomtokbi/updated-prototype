import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail, Save, Eye, Send, ChevronRight, CheckCircle,
  AlertCircle, Loader2, ArrowLeft, Tag, Info,
} from "lucide-react";
import { useLocation } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";

// ─── Types ─────────────────────────────────────────────────────────────────────

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
  updatedAt?: string;
}

// ─── Template Definitions ─────────────────────────────────────────────────────

const TEMPLATE_DEFS = [
  {
    type: "welcome",
    name: "Welcome Email",
    icon: "👋",
    description: "Sent automatically when a new user registers",
    color: "#10b981",
    variables: ["{{user_name}}", "{{user_email}}", "{{site_name}}", "{{site_url}}"],
  },
  {
    type: "otp",
    name: "OTP / Verification Email",
    icon: "🔐",
    description: "Sent for password reset or account verification",
    color: "#6366f1",
    variables: ["{{user_name}}", "{{otp_code}}", "{{site_name}}"],
  },
  {
    type: "promotional",
    name: "Promotional Email",
    icon: "🎉",
    description: "Used for marketing campaigns and announcements",
    color: "#f59e0b",
    variables: ["{{user_name}}", "{{site_name}}", "{{site_url}}"],
  },
  {
    type: "order_confirmation",
    name: "Order Confirmation Email",
    icon: "✅",
    description: "Sent after a successful order is placed",
    color: "#3b82f6",
    variables: ["{{user_name}}", "{{order_id}}", "{{order_amount}}", "{{order_currency}}", "{{order_date}}", "{{site_name}}", "{{site_url}}"],
  },
  {
    type: "support_ticket_reply",
    name: "Support Ticket Reply Email",
    icon: "💬",
    description: "Sent when admin replies to a support ticket",
    color: "#8b5cf6",
    variables: ["{{user_name}}", "{{ticket_id}}", "{{ticket_subject}}", "{{reply_message}}", "{{site_name}}", "{{support_email}}", "{{site_url}}"],
  },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "hsl(220, 20%, 9%)",
  border: "1px solid hsl(220, 15%, 13%)",
  borderRadius: "8px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "hsl(220, 20%, 11%)",
  border: "1px solid hsl(220, 15%, 18%)",
  borderRadius: "6px",
  color: "hsl(210, 40%, 92%)",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: "180px",
  lineHeight: 1.7,
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "hsl(220, 10%, 50%)",
  marginBottom: "6px",
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
  const saved = template && template.id && template.id !== "";
  return (
    <div
      onClick={onClick}
      style={{
        padding: "14px 16px",
        cursor: "pointer",
        background: isSelected ? "rgba(124,58,237,0.08)" : "transparent",
        borderLeft: `3px solid ${isSelected ? "#7c3aed" : "transparent"}`,
        borderBottom: "1px solid hsl(220,15%,12%)",
        transition: "background 0.15s",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 8, flexShrink: 0,
        background: `${def.color}18`, border: `1px solid ${def.color}30`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16,
      }}>
        {def.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210,40%,90%)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {def.name}
        </div>
        <div style={{ fontSize: "11px", color: "hsl(220,10%,40%)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {def.description}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {saved && <CheckCircle size={12} color="#10b981" />}
        <ChevronRight size={14} color="hsl(220,10%,35%)" />
      </div>
    </div>
  );
}

// ─── Variable chip ────────────────────────────────────────────────────────────

function VarChip({ variable, onInsert }: { variable: string; onInsert: (v: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onInsert(variable)}
      title={`Click to copy ${variable}`}
      style={{
        padding: "3px 9px", borderRadius: 12, fontSize: "11px", fontFamily: "monospace",
        background: "rgba(99,102,241,0.1)", color: "#818cf8",
        border: "1px solid rgba(99,102,241,0.25)", cursor: "pointer",
        transition: "background 0.1s",
      }}
    >
      {variable}
    </button>
  );
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({ html, onClose }: { html: string; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
    }} onClick={onClose}>
      <div style={{
        background: "hsl(220,20%,9%)", border: "1px solid hsl(220,15%,17%)",
        borderRadius: 12, width: "100%", maxWidth: 680, maxHeight: "90vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid hsl(220,15%,13%)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Eye size={15} color="#a78bfa" />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210,40%,92%)" }}>Email Preview</span>
            <span style={{ fontSize: "11px", color: "hsl(220,10%,40%)" }}>— shown with sample data</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(220,10%,45%)", fontSize: 18, lineHeight: 1, padding: "2px 6px" }}>×</button>
        </div>
        <div style={{ flex: 1, overflow: "auto", background: "#0d0f14" }}>
          <iframe
            srcDoc={html}
            style={{ width: "100%", height: "100%", minHeight: 520, border: "none" }}
            title="Email Preview"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Test Email Dialog ────────────────────────────────────────────────────────

function TestEmailDialog({
  type,
  onClose,
}: {
  type: string;
  onClose: () => void;
}) {
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSend() {
    if (!to) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/email-templates/${type}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-role": "super_admin" },
        credentials: "include",
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
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.75)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: "hsl(220,20%,9%)", border: "1px solid hsl(220,15%,17%)",
        borderRadius: 12, width: "100%", maxWidth: 420,
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid hsl(220,15%,13%)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Send size={14} color="#a78bfa" />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210,40%,92%)" }}>Send Test Email</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(220,10%,45%)", fontSize: 18, lineHeight: 1, padding: "2px 6px" }}>×</button>
        </div>
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: "12px", color: "hsl(220,10%,45%)", margin: 0, lineHeight: 1.6 }}>
            A test email will be sent using your SMTP configuration with sample data.
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
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={{
              padding: "7px 14px", borderRadius: 6, fontSize: "12px",
              background: "hsl(220,15%,13%)", border: "1px solid hsl(220,15%,20%)",
              color: "hsl(220,10%,55%)", cursor: "pointer",
            }}>Cancel</button>
            <button
              onClick={handleSend}
              disabled={!to || sending}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 16px", borderRadius: 6, fontSize: "12px", fontWeight: 600,
                background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "#fff",
                border: "none", cursor: (!to || sending) ? "not-allowed" : "pointer",
                opacity: !to || sending ? 0.6 : 1,
              }}
            >
              {sending ? <><Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Sending...</> : <><Send size={12} /> Send Test</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Template Editor ──────────────────────────────────────────────────────────

function TemplateEditor({
  def,
  template,
  onSaved,
}: {
  def: (typeof TEMPLATE_DEFS)[number];
  template?: EmailTemplate;
  onSaved: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<EmailTemplate>({
    type: def.type,
    name: def.name,
    subject: "",
    title: "",
    body: "",
    footerText: "",
    buttonText: "",
    buttonLink: "",
    isEnabled: true,
  });
  const [isDirty, setIsDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Load template into form when template prop changes
  useEffect(() => {
    if (template) {
      setForm({
        type: template.type,
        name: template.name,
        subject: template.subject ?? "",
        title: template.title ?? "",
        body: template.body ?? "",
        footerText: template.footerText ?? "",
        buttonText: template.buttonText ?? "",
        buttonLink: template.buttonLink ?? "",
        isEnabled: template.isEnabled ?? true,
      });
      setIsDirty(false);
      setSaved(false);
    }
  }, [template?.type, template?.updatedAt]);

  const saveMut = useMutation({
    mutationFn: (data: EmailTemplate) =>
      fetch(`/api/admin/email-templates/${def.type}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-role": "super_admin" },
        credentials: "include",
        body: JSON.stringify(data),
      }).then(async (res) => {
        const d = await res.json();
        if (!res.ok) throw new Error(d.message);
        return d;
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/email-templates"] });
      setSaved(true);
      setIsDirty(false);
      setTimeout(() => setSaved(false), 2500);
      onSaved();
    },
  });

  function set(key: keyof EmailTemplate, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
    setSaved(false);
  }

  function insertVar(v: string) {
    navigator.clipboard?.writeText(v).catch(() => {});
    // Also try to insert into focused textarea
    const active = document.activeElement as HTMLTextAreaElement | HTMLInputElement | null;
    if (active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT")) {
      const start = active.selectionStart ?? active.value.length;
      const end = active.selectionEnd ?? active.value.length;
      const before = active.value.slice(0, start);
      const after = active.value.slice(end);
      const newValue = before + v + after;
      // Find the key by the element's data-key attribute
      const key = active.getAttribute("data-key") as keyof EmailTemplate | null;
      if (key) {
        set(key, newValue);
        setTimeout(() => {
          active.selectionStart = active.selectionEnd = start + v.length;
          active.focus();
        }, 0);
      }
    }
  }

  async function handlePreview() {
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/admin/email-templates/${def.type}/preview`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-role": "super_admin" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const html = await res.text();
      setPreviewHtml(html);
    } catch {
      // ignore
    } finally {
      setLoadingPreview(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      {/* Editor header */}
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid hsl(220,15%,13%)",
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: `${def.color}18`, border: `1px solid ${def.color}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16,
          }}>
            {def.icon}
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "hsl(210,40%,94%)" }}>{def.name}</div>
            <div style={{ fontSize: "11px", color: "hsl(220,10%,40%)" }}>{def.description}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={handlePreview}
            disabled={loadingPreview}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px",
              borderRadius: 6, fontSize: "12px", fontWeight: 600,
              background: "hsl(220,15%,13%)", border: "1px solid hsl(220,15%,20%)",
              color: "#a78bfa", cursor: "pointer",
            }}
          >
            {loadingPreview ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Eye size={12} />}
            Preview
          </button>
          <button
            onClick={() => setShowTestDialog(true)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px",
              borderRadius: 6, fontSize: "12px", fontWeight: 600,
              background: "hsl(220,15%,13%)", border: "1px solid hsl(220,15%,20%)",
              color: "#60a5fa", cursor: "pointer",
            }}
          >
            <Send size={12} /> Send Test
          </button>
          {(isDirty || saved) && (
            <button
              onClick={() => saveMut.mutate(form)}
              disabled={saveMut.isPending}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 16px",
                borderRadius: 6, fontSize: "12px", fontWeight: 600,
                background: saved ? "#16a34a" : "linear-gradient(135deg,#7c3aed,#6d28d9)",
                color: "#fff", border: "none",
                cursor: saveMut.isPending ? "wait" : "pointer",
              }}
            >
              {saveMut.isPending ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={12} />}
              {saved ? "Saved!" : "Save Changes"}
            </button>
          )}
        </div>
      </div>

      {/* Save error */}
      {saveMut.isError && (
        <div style={{
          margin: "12px 20px 0", padding: "10px 12px", borderRadius: 6, fontSize: "12px",
          background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
          color: "#ef4444", display: "flex", gap: 8, alignItems: "center",
        }}>
          <AlertCircle size={13} />
          {(saveMut.error as Error)?.message || "Failed to save template"}
        </div>
      )}

      {/* Variables reference */}
      <div style={{ padding: "12px 20px", borderBottom: "1px solid hsl(220,15%,11%)", background: "hsl(220,20%,8%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <Tag size={12} color="#6366f1" />
          <span style={{ fontSize: "11px", fontWeight: 700, color: "hsl(220,10%,45%)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Available Variables
          </span>
          <span style={{ fontSize: "10px", color: "hsl(220,10%,35%)" }}>— click to copy & insert at cursor</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {def.variables.map((v) => <VarChip key={v} variable={v} onInsert={insertVar} />)}
        </div>
      </div>

      {/* Form fields */}
      <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Enable toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderRadius: 8, background: "hsl(220,20%,8%)", border: "1px solid hsl(220,15%,14%)" }}>
          <div>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210,40%,88%)" }}>Enable Template</div>
            <div style={{ fontSize: "11px", color: "hsl(220,10%,40%)" }}>When disabled, this email type will not be sent</div>
          </div>
          <button
            type="button"
            onClick={() => set("isEnabled", !form.isEnabled)}
            style={{
              position: "relative", width: 42, height: 24, borderRadius: 12, border: "none",
              background: form.isEnabled ? "#7c3aed" : "hsl(220,15%,20%)",
              cursor: "pointer", flexShrink: 0, transition: "background 0.2s", padding: 0,
            }}
          >
            <span style={{
              position: "absolute", top: 3,
              left: form.isEnabled ? "calc(100% - 21px)" : "3px",
              width: 18, height: 18, borderRadius: "50%", background: "white",
              transition: "left 0.2s", display: "block", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }} />
          </button>
        </div>

        <div>
          <label style={labelStyle}>Email Subject</label>
          <input
            data-key="subject"
            style={inputStyle}
            value={form.subject}
            onChange={(e) => set("subject", e.target.value)}
            placeholder="e.g. Welcome to {{site_name}}, {{user_name}}!"
          />
        </div>

        <div>
          <label style={labelStyle}>Email Title (Heading)</label>
          <input
            data-key="title"
            style={inputStyle}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Welcome aboard, {{user_name}}!"
          />
        </div>

        <div>
          <label style={labelStyle}>Email Body</label>
          <textarea
            data-key="body"
            style={textareaStyle as React.CSSProperties}
            value={form.body}
            onChange={(e) => set("body", e.target.value)}
            placeholder="Write the email body here. Use double line breaks for paragraphs. Variables like {{user_name}} will be replaced automatically."
          />
          <p style={{ fontSize: "10px", color: "hsl(220,10%,35%)", margin: "5px 0 0" }}>
            Double line break = new paragraph. Single line break = line break.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label style={labelStyle}>Button Text (optional)</label>
            <input
              data-key="buttonText"
              style={inputStyle}
              value={form.buttonText ?? ""}
              onChange={(e) => set("buttonText", e.target.value)}
              placeholder="e.g. View Order"
            />
          </div>
          <div>
            <label style={labelStyle}>Button Link (optional)</label>
            <input
              data-key="buttonLink"
              style={inputStyle}
              value={form.buttonLink ?? ""}
              onChange={(e) => set("buttonLink", e.target.value)}
              placeholder="e.g. {{site_url}}/orders"
            />
          </div>
        </div>

        <div>
          <label style={labelStyle}>Footer Text (optional)</label>
          <input
            data-key="footerText"
            style={inputStyle}
            value={form.footerText ?? ""}
            onChange={(e) => set("footerText", e.target.value)}
            placeholder="e.g. You received this email because you registered at {{site_name}}."
          />
        </div>

        {/* Info box */}
        <div style={{ padding: "12px 16px", borderRadius: 8, background: "hsl(220,20%,8%)", border: "1px solid hsl(220,15%,14%)", display: "flex", gap: 10 }}>
          <Info size={14} color="#6366f1" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: "11px", color: "hsl(220,10%,42%)", lineHeight: 1.7 }}>
            This template is sent <strong style={{ color: "hsl(210,40%,65%)" }}>{def.description.toLowerCase()}</strong>. Make sure SMTP is configured in{" "}
            <a href="/admin/api-integration" style={{ color: "#a78bfa", textDecoration: "none" }}>API Integration</a> for emails to send.
          </div>
        </div>
      </div>

      {previewHtml && <PreviewModal html={previewHtml} onClose={() => setPreviewHtml(null)} />}
      {showTestDialog && <TestEmailDialog type={def.type} onClose={() => setShowTestDialog(false)} />}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EmailTemplates() {
  const [, setLocation] = useLocation();
  const [selectedType, setSelectedType] = useState<string>(TEMPLATE_DEFS[0].type);
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);

  const { data: templates = [], refetch } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/admin/email-templates"],
    queryFn: () =>
      fetch("/api/admin/email-templates", {
        headers: { "x-admin-role": "super_admin" },
        credentials: "include",
      }).then((r) => r.json()),
  });

  const templateByType = Object.fromEntries(templates.map((t) => [t.type, t]));
  const selectedDef = TEMPLATE_DEFS.find((d) => d.type === selectedType) ?? TEMPLATE_DEFS[0];
  const selectedTemplate = templateByType[selectedType];

  function handleSelect(type: string) {
    setSelectedType(type);
    setIsMobileListVisible(false);
  }

  return (
    <AdminLayout title="Email Templates">
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Breadcrumb + back */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setLocation("/admin/control-panel")}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "none", border: "none", cursor: "pointer",
            fontSize: "12px", color: "hsl(220,10%,45%)", padding: 0,
          }}
        >
          <ArrowLeft size={14} /> Control Panel
        </button>
        <ChevronRight size={12} color="hsl(220,10%,30%)" />
        <span style={{ fontSize: "12px", color: "hsl(210,40%,75%)", fontWeight: 600 }}>
          <Mail size={12} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />
          Email Templates
        </span>
      </div>

      <div style={{ fontSize: "12px", color: "hsl(220,10%,42%)", marginBottom: 20, lineHeight: 1.6 }}>
        Edit email templates for automated system emails. Changes save to the database and apply immediately.{" "}
        <a href="/admin/api-integration" style={{ color: "#a78bfa", textDecoration: "none" }}>Configure SMTP →</a>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, alignItems: "start" }}>
        {/* Left: template list */}
        <div style={{ ...card, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: "1px solid hsl(220,15%,13%)" }}>
            <span style={{ fontSize: "12px", fontWeight: 700, color: "hsl(220,10%,50%)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Email Types
            </span>
          </div>
          {TEMPLATE_DEFS.map((def) => (
            <TemplateListItem
              key={def.type}
              def={def}
              template={templateByType[def.type]}
              isSelected={selectedType === def.type}
              onClick={() => handleSelect(def.type)}
            />
          ))}
        </div>

        {/* Right: editor */}
        <div style={{ ...card, overflow: "hidden" }}>
          <TemplateEditor
            key={selectedType}
            def={selectedDef}
            template={selectedTemplate}
            onSaved={() => refetch()}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
