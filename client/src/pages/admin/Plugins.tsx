import { useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UploadCloud, FileArchive, Package, Power, PowerOff, Trash2,
  Settings, ChevronRight, Check, X, AlertCircle, RefreshCw,
  Plug, Zap, Globe, Mail, MessageSquare, Shield, Activity,
  Webhook, Bot, Layers, Database, Clock, User, Tag, Info,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { card } from "@/components/admin/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PluginSettingField {
  key: string;
  label: string;
  type: "string" | "password" | "number" | "boolean" | "select" | "textarea";
  required?: boolean;
  default?: unknown;
  options?: { label: string; value: string }[];
  placeholder?: string;
  description?: string;
}

interface Plugin {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  category: string;
  pluginType?: string | null;
  version?: string | null;
  author?: string | null;
  isEnabled: boolean;
  config?: string | null;
  settingsSchema?: string | null;
  installedAt?: string | null;
  fileSize?: number | null;
  status: string;
  hooks?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UploadPreview {
  uploadId: string;
  fileName: string;
  fileSize: number;
  manifest: {
    name: string;
    slug: string;
    version: string;
    description?: string;
    author?: string;
    pluginType: string;
    entryFile: string;
    settings?: PluginSettingField[];
    hooks?: string[];
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

const PLUGIN_TYPE_ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  payment: Database,
  validation: Shield,
  sms: MessageSquare,
  email: Mail,
  analytics: Activity,
  webhook: Webhook,
  automation: Bot,
  ui_extension: Layers,
  security: Shield,
  integration: Globe,
  custom: Plug,
};

const PLUGIN_TYPE_COLORS: Record<string, string> = {
  payment: "#10b981",
  validation: "#6366f1",
  sms: "#f59e0b",
  email: "#3b82f6",
  analytics: "#8b5cf6",
  webhook: "#f97316",
  automation: "#06b6d4",
  ui_extension: "#ec4899",
  security: "#ef4444",
  integration: "#14b8a6",
  custom: "#a78bfa",
};

function getPluginTypeIcon(type?: string | null) {
  const t = (type ?? "custom").toLowerCase();
  return PLUGIN_TYPE_ICONS[t] ?? Plug;
}

function getPluginTypeColor(type?: string | null) {
  const t = (type ?? "custom").toLowerCase();
  return PLUGIN_TYPE_COLORS[t] ?? "#a78bfa";
}

// ─── API Calls ────────────────────────────────────────────────────────────────

async function apiJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? "Request failed");
  return data as T;
}

// ─── Settings Dialog ──────────────────────────────────────────────────────────

function PluginSettingsDialog({
  plugin,
  onClose,
}: {
  plugin: Plugin;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const schema: PluginSettingField[] = (() => {
    try { return plugin.settingsSchema ? JSON.parse(plugin.settingsSchema) : []; }
    catch { return []; }
  })();
  const currentConfig: Record<string, unknown> = (() => {
    try { return plugin.config ? JSON.parse(plugin.config) : {}; }
    catch { return {}; }
  })();

  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    schema.forEach((f) => {
      init[f.key] = currentConfig[f.key] ?? f.default ?? (f.type === "boolean" ? false : "");
    });
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await apiJson(`/api/admin/plugins/${plugin.slug}/settings`, {
        method: "PATCH",
        body: JSON.stringify({ config: values }),
      });
      qc.invalidateQueries({ queryKey: ["/api/admin/plugins"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", borderRadius: "6px", fontSize: "13px",
    background: "hsl(220,15%,10%)", border: "1px solid hsl(220,15%,20%)",
    color: "hsl(var(--foreground))", outline: "none", boxSizing: "border-box",
  };

  if (schema.length === 0) {
    return (
      <div style={overlayStyle} onClick={onClose}>
        <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
          <DialogHeader title={`${plugin.name} Settings`} onClose={onClose} />
          <div style={{ padding: "32px 20px", textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: "13px" }}>
            <Settings size={32} color="hsl(var(--muted-foreground))" style={{ marginBottom: 12 }} />
            <p style={{ margin: 0 }}>This plugin has no configurable settings.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <DialogHeader title={`${plugin.name} Settings`} onClose={onClose} />
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {schema.map((field) => (
            <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "hsl(var(--foreground))" }}>
                {field.label}
                {field.required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
              </label>
              {field.description && (
                <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", margin: 0 }}>{field.description}</p>
              )}
              {field.type === "boolean" ? (
                <div
                  onClick={() => setValues((v) => ({ ...v, [field.key]: !v[field.key] }))}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer",
                    padding: "6px 12px", borderRadius: 6, width: "fit-content",
                    background: values[field.key] ? "rgba(124,58,237,0.15)" : "hsl(220,15%,13%)",
                    border: `1px solid ${values[field.key] ? "#7c3aed" : "hsl(220,15%,20%)"}`,
                  }}
                >
                  <div style={{
                    width: 32, height: 18, borderRadius: 9, transition: "background 0.2s",
                    background: values[field.key] ? "#7c3aed" : "hsl(220,15%,25%)",
                    position: "relative",
                  }}>
                    <div style={{
                      position: "absolute", top: 3, left: values[field.key] ? 16 : 3,
                      width: 12, height: 12, borderRadius: "50%", background: "white",
                      transition: "left 0.2s",
                    }} />
                  </div>
                  <span style={{ fontSize: "12px", color: "hsl(var(--foreground))" }}>
                    {values[field.key] ? "Enabled" : "Disabled"}
                  </span>
                </div>
              ) : field.type === "select" ? (
                <select
                  value={String(values[field.key] ?? "")}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="">Select...</option>
                  {(field.options ?? []).map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  value={String(values[field.key] ?? "")}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  style={{ ...inputStyle, resize: "none", fontFamily: "monospace", minHeight: "250px" }}
                />
              ) : (
                <input
                  type={field.type === "password" ? "password" : field.type === "number" ? "number" : "text"}
                  value={String(values[field.key] ?? "")}
                  onChange={(e) => setValues((v) => ({ ...v, [field.key]: field.type === "number" ? Number(e.target.value) : e.target.value }))}
                  placeholder={field.placeholder}
                  style={inputStyle}
                />
              )}
            </div>
          ))}

          {error && (
            <div style={{ padding: "10px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", fontSize: "12px", color: "#ef4444", display: "flex", gap: 8, alignItems: "center" }}>
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={onClose} style={secondaryBtnStyle}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={primaryBtnStyle}>
              {saving ? <><RefreshCw size={12} style={{ animation: "spin 1s linear infinite" }} /> Saving...</> : saved ? <><Check size={12} /> Saved!</> : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={{ ...dialogStyle, maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <DialogHeader title={title} onClose={onCancel} />
        <div style={{ padding: "20px" }}>
          <p style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", margin: "0 0 20px" }}>{message}</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={onCancel} style={secondaryBtnStyle}>Cancel</button>
            <button onClick={onConfirm} style={danger ? dangerBtnStyle : primaryBtnStyle}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dialog Header ────────────────────────────────────────────────────────────

function DialogHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220,15%,13%)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(var(--foreground))" }}>{title}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", padding: 4 }}>
        <X size={16} />
      </button>
    </div>
  );
}

// ─── Shared Button Styles ─────────────────────────────────────────────────────

const primaryBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 16px",
  borderRadius: 6, fontSize: "12px", fontWeight: 600,
  background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white",
  border: "none", cursor: "pointer",
};
const secondaryBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px",
  borderRadius: 6, fontSize: "12px", fontWeight: 600,
  background: "hsl(220,15%,13%)", color: "hsl(var(--muted-foreground))",
  border: "1px solid hsl(220,15%,20%)", cursor: "pointer",
};
const dangerBtnStyle: React.CSSProperties = {
  ...primaryBtnStyle, background: "linear-gradient(135deg, #ef4444, #dc2626)",
};
const overlayStyle: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
};
const dialogStyle: React.CSSProperties = {
  background: "hsl(220,15%,9%)", border: "1px solid hsl(220,15%,17%)",
  borderRadius: 12, width: "100%", maxWidth: 560,
  maxHeight: "90vh", overflow: "auto",
};

// ─── Plugin Card ──────────────────────────────────────────────────────────────

function PluginCard({ plugin }: { plugin: Plugin }) {
  const qc = useQueryClient();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmUninstall, setConfirmUninstall] = useState(false);
  const [togglingError, setTogglingError] = useState<string | null>(null);

  const settingsSchema: PluginSettingField[] = (() => {
    try { return plugin.settingsSchema ? JSON.parse(plugin.settingsSchema) : []; }
    catch { return []; }
  })();
  const hasSettings = settingsSchema.length > 0;

  const toggleMut = useMutation({
    mutationFn: () => apiJson(`/api/admin/plugins/${plugin.slug}/toggle`, { method: "PATCH" }),
    onSuccess: () => {
      setTogglingError(null);
      qc.invalidateQueries({ queryKey: ["/api/admin/plugins"] });
    },
    onError: (e: Error) => setTogglingError(e.message),
  });

  const uninstallMut = useMutation({
    mutationFn: () => apiJson(`/api/admin/plugins/${plugin.slug}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/plugins"] }),
  });

  const TypeIcon = getPluginTypeIcon(plugin.pluginType);
  const typeColor = getPluginTypeColor(plugin.pluginType);
  const hooks: string[] = (() => {
    try { return plugin.hooks ? JSON.parse(plugin.hooks) : []; }
    catch { return []; }
  })();

  return (
    <>
      <div style={{
        ...card, padding: 0, overflow: "hidden",
        border: plugin.isEnabled ? "1px solid rgba(124,58,237,0.35)" : "1px solid hsl(220,15%,14%)",
        transition: "border-color 0.2s",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 18px",
          borderBottom: "1px solid hsl(var(--input))",
          display: "flex", alignItems: "flex-start", gap: 14,
        }}>
          {/* Icon */}
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: `${typeColor}18`, border: `1px solid ${typeColor}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <TypeIcon size={20} color={typeColor} />
          </div>

          {/* Title area */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "hsl(var(--foreground))" }}>
                {plugin.name}
              </span>
              <span style={{
                fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: 20,
                background: plugin.isEnabled ? "rgba(16,185,129,0.15)" : "hsl(220,15%,15%)",
                color: plugin.isEnabled ? "#10b981" : "hsl(var(--muted-foreground))",
                border: `1px solid ${plugin.isEnabled ? "rgba(16,185,129,0.3)" : "hsl(220,15%,22%)"}`,
              }}>
                {plugin.isEnabled ? "Active" : "Inactive"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>
                v{plugin.version ?? "1.0.0"}
              </span>
              <span style={{
                fontSize: "10px", fontWeight: 600, padding: "1px 7px", borderRadius: 10,
                background: `${typeColor}18`, color: typeColor, border: `1px solid ${typeColor}25`,
                textTransform: "capitalize",
              }}>
                {(plugin.pluginType ?? "integration").replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {/* Toggle */}
          <div
            onClick={() => !toggleMut.isPending && toggleMut.mutate()}
            title={plugin.isEnabled ? "Disable plugin" : "Enable plugin"}
            style={{
              width: 42, height: 24, borderRadius: 12, flexShrink: 0,
              background: plugin.isEnabled ? "#7c3aed" : "hsl(220,15%,22%)",
              position: "relative", cursor: toggleMut.isPending ? "wait" : "pointer",
              transition: "background 0.2s", border: `1px solid ${plugin.isEnabled ? "#6d28d9" : "hsl(220,15%,28%)"}`,
            }}
          >
            <div style={{
              position: "absolute", top: 3, left: plugin.isEnabled ? 20 : 3,
              width: 16, height: 16, borderRadius: "50%", background: "white",
              transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            }} />
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          {plugin.description && (
            <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", margin: 0, lineHeight: 1.6 }}>
              {plugin.description}
            </p>
          )}

          {/* Meta grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px" }}>
            {plugin.author && (
              <MetaItem icon={<User size={11} />} label="Author" value={plugin.author} />
            )}
            <MetaItem icon={<Tag size={11} />} label="Slug" value={plugin.slug} mono />
            {plugin.installedAt && (
              <MetaItem icon={<Clock size={11} />} label="Installed" value={formatDate(plugin.installedAt)} />
            )}
            {plugin.fileSize && (
              <MetaItem icon={<Database size={11} />} label="Size" value={formatBytes(plugin.fileSize)} />
            )}
          </div>

          {/* Hooks */}
          {hooks.length > 0 && (
            <div>
              <span style={{ fontSize: "10px", fontWeight: 600, color: "hsl(var(--muted-foreground))", display: "block", marginBottom: 5 }}>HOOKS</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {hooks.map((h) => (
                  <span key={h} style={{
                    fontSize: "10px", padding: "2px 7px", borderRadius: 10, fontFamily: "monospace",
                    background: "rgba(99,102,241,0.1)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)",
                  }}>
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Toggle error */}
          {togglingError && (
            <div style={{
              padding: "8px 12px", borderRadius: 6, background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.25)", fontSize: "11px", color: "#ef4444",
              display: "flex", gap: 6, alignItems: "flex-start",
            }}>
              <AlertCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{togglingError}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{
          padding: "10px 18px",
          borderTop: "1px solid hsl(var(--input))",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <button
            onClick={() => !toggleMut.isPending && toggleMut.mutate()}
            disabled={toggleMut.isPending}
            style={{
              ...plugin.isEnabled ? secondaryBtnStyle : primaryBtnStyle,
              fontSize: "11px", padding: "5px 12px",
            }}
          >
            {toggleMut.isPending ? (
              <RefreshCw size={11} style={{ animation: "spin 1s linear infinite" }} />
            ) : plugin.isEnabled ? (
              <><PowerOff size={11} /> Disable</>
            ) : (
              <><Power size={11} /> Enable</>
            )}
          </button>

          {hasSettings && (
            <button onClick={() => setSettingsOpen(true)} style={{ ...secondaryBtnStyle, fontSize: "11px", padding: "5px 12px" }}>
              <Settings size={11} /> Settings
            </button>
          )}

          <button
            onClick={() => setConfirmUninstall(true)}
            disabled={uninstallMut.isPending}
            style={{
              ...secondaryBtnStyle, fontSize: "11px", padding: "5px 12px",
              marginLeft: "auto", color: "#ef4444", borderColor: "rgba(239,68,68,0.3)",
            }}
          >
            {uninstallMut.isPending ? <RefreshCw size={11} style={{ animation: "spin 1s linear infinite" }} /> : <><Trash2 size={11} /> Uninstall</>}
          </button>
        </div>
      </div>

      {settingsOpen && <PluginSettingsDialog plugin={plugin} onClose={() => setSettingsOpen(false)} />}
      {confirmUninstall && (
        <ConfirmDialog
          title="Uninstall Plugin"
          message={`Are you sure you want to uninstall "${plugin.name}"? This will remove all plugin files and configuration. This action cannot be undone.`}
          confirmLabel="Uninstall"
          danger
          onConfirm={() => { uninstallMut.mutate(); setConfirmUninstall(false); }}
          onCancel={() => setConfirmUninstall(false)}
        />
      )}
    </>
  );
}

function MetaItem({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
      <span style={{ color: "hsl(var(--muted-foreground))", marginTop: 2 }}>{icon}</span>
      <div>
        <span style={{ fontSize: "9px", fontWeight: 700, color: "hsl(var(--muted-foreground))", display: "block", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
        <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontFamily: mono ? "monospace" : undefined }}>{value}</span>
      </div>
    </div>
  );
}

// ─── Upload Section ───────────────────────────────────────────────────────────

function UploadSection({ onInstalled }: { onInstalled: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [preview, setPreview] = useState<UploadPreview | null>(null);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setPreview(null);
    setError(null);
    setSuccess(null);
    setUploadProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  async function handleFile(file: File) {
    if (!file.name.endsWith(".zip")) {
      setError("Only .zip plugin packages are accepted.");
      return;
    }
    setError(null);
    setPreview(null);
    setSuccess(null);
    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("plugin", file);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress((p) => Math.min(p + 10, 85));
    }, 200);

    try {
      const res = await fetch("/api/admin/plugins/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Upload failed");

      setTimeout(() => {
        setUploading(false);
        setPreview(data as UploadPreview);
        setUploadProgress(0);
      }, 400);
    } catch (e) {
      clearInterval(progressInterval);
      setUploading(false);
      setUploadProgress(0);
      setError(e instanceof Error ? e.message : "Upload failed");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleInstall() {
    if (!preview) return;
    setInstalling(true);
    setError(null);
    try {
      await fetch("/api/admin/plugins/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ uploadId: preview.uploadId }),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? "Install failed");
      });
      setSuccess(`Plugin "${preview.manifest.name}" installed successfully!`);
      setPreview(null);
      onInstalled();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Install failed");
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div style={{ ...card, padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220,15%,13%)", display: "flex", alignItems: "center", gap: 10 }}>
        <UploadCloud size={16} color="#a78bfa" />
        <div>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(var(--foreground))" }}>Upload Plugin</span>
          <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", margin: "2px 0 0" }}>
            Upload a .zip plugin package to extend platform functionality
          </p>
        </div>
      </div>

      <div style={{ padding: "20px" }}>
        {/* Success message */}
        {success && (
          <div style={{
            padding: "12px 16px", borderRadius: 8, marginBottom: 16,
            background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)",
            fontSize: "13px", color: "#10b981", display: "flex", gap: 8, alignItems: "center",
          }}>
            <Check size={14} /> {success}
            <button onClick={resetState} style={{ background: "none", border: "none", cursor: "pointer", color: "#10b981", marginLeft: "auto", padding: 0 }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{
            padding: "12px 16px", borderRadius: 8, marginBottom: 16,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
            fontSize: "13px", color: "#ef4444", display: "flex", gap: 8, alignItems: "flex-start",
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{error}</span>
            <button onClick={() => setError(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", marginLeft: "auto", padding: 0 }}>
              <X size={14} />
            </button>
          </div>
        )}

        {!preview ? (
          <>
            {/* Drop zone */}
            <div
              onClick={() => !uploading && fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); !uploading && setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (!uploading) {
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFile(file);
                }
              }}
              style={{
                width: "100%", boxSizing: "border-box",
                border: `2px dashed ${dragOver ? "#7c3aed" : uploading ? "rgba(124,58,237,0.5)" : "hsl(220,15%,22%)"}`,
                borderRadius: 10, padding: "36px 20px",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
                cursor: uploading ? "wait" : "pointer",
                background: dragOver ? "rgba(124,58,237,0.06)" : "transparent",
                transition: "border-color 0.15s, background 0.15s",
              }}
            >
              {uploading ? (
                <>
                  <div style={{ position: "relative", width: 52, height: 52 }}>
                    <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ transform: "rotate(-90deg)" }}>
                      <circle cx="26" cy="26" r="22" stroke="hsl(220,15%,20%)" strokeWidth="4" />
                      <circle cx="26" cy="26" r="22" stroke="#7c3aed" strokeWidth="4"
                        strokeDasharray={`${2 * Math.PI * 22}`}
                        strokeDashoffset={`${2 * Math.PI * 22 * (1 - uploadProgress / 100)}`}
                        style={{ transition: "stroke-dashoffset 0.3s" }}
                      />
                    </svg>
                    <span style={{
                      position: "absolute", inset: 0, display: "flex", alignItems: "center",
                      justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "hsl(var(--primary))",
                    }}>
                      {uploadProgress}%
                    </span>
                  </div>
                  <span style={{ fontSize: "13px", color: "hsl(var(--foreground))", fontWeight: 500 }}>
                    Uploading & validating...
                  </span>
                </>
              ) : (
                <>
                  <UploadCloud size={38} color={dragOver ? "#a78bfa" : "hsl(var(--muted-foreground))"} />
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "13px", color: "hsl(210,40%,78%)", fontWeight: 500, margin: "0 0 4px" }}>
                      Drag & drop plugin package here
                    </p>
                    <p style={{ fontSize: "11px", color: "hsl(220,10%,40%)", margin: 0 }}>
                      or click to browse — accepts <code style={{ color: "hsl(var(--primary))" }}>.zip</code> files up to 50MB
                    </p>
                  </div>
                </>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".zip"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />

            <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
              <button
                type="button"
                onClick={() => !uploading && fileRef.current?.click()}
                disabled={uploading}
                style={{ ...primaryBtnStyle, opacity: uploading ? 0.6 : 1 }}
              >
                <UploadCloud size={13} /> Browse File
              </button>
            </div>

            {/* Format guide */}
            <div style={{
              marginTop: 16, padding: "12px 16px", borderRadius: 8,
              background: "hsl(220,15%,8%)", border: "1px solid hsl(220,15%,14%)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Info size={12} color="#6366f1" />
                <span style={{ fontSize: "11px", fontWeight: 600, color: "hsl(var(--muted-foreground))" }}>Plugin Package Structure</span>
              </div>
              <pre style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))", margin: 0, lineHeight: 1.7, fontFamily: "monospace" }}>
{`my-plugin.zip
├── plugin.json     ← required manifest
├── index.js        ← required entry file
└── ...             ← any other plugin files`}
              </pre>
              <div style={{ marginTop: 10, fontSize: "10px", color: "hsl(var(--muted-foreground))", lineHeight: 1.7 }}>
                <strong style={{ color: "hsl(var(--muted-foreground))" }}>plugin.json</strong> must include:{" "}
                <code style={{ color: "hsl(var(--primary))" }}>name</code>,{" "}
                <code style={{ color: "hsl(var(--primary))" }}>slug</code>,{" "}
                <code style={{ color: "hsl(var(--primary))" }}>version</code>,{" "}
                <code style={{ color: "hsl(var(--primary))" }}>pluginType</code>,{" "}
                <code style={{ color: "hsl(var(--primary))" }}>entryFile</code>
              </div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid hsl(220,15%,14%)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))" }}>Need a starting point?</span>
                <a
                  href="/example-plugin.zip"
                  download="example-plugin.zip"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: "10px", fontWeight: 600, color: "hsl(var(--primary))",
                    textDecoration: "none", padding: "3px 8px", borderRadius: 5,
                    background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.25)",
                  }}
                >
                  <FileArchive size={10} /> Download Example Plugin
                </a>
              </div>
            </div>
          </>
        ) : (
          /* Plugin preview after upload */
          <PluginInstallPreview
            preview={preview}
            installing={installing}
            onInstall={handleInstall}
            onCancel={resetState}
          />
        )}
      </div>
    </div>
  );
}

// ─── Plugin Install Preview ───────────────────────────────────────────────────

function PluginInstallPreview({
  preview,
  installing,
  onInstall,
  onCancel,
}: {
  preview: UploadPreview;
  installing: boolean;
  onInstall: () => void;
  onCancel: () => void;
}) {
  const { manifest, fileName, fileSize } = preview;
  const TypeIcon = getPluginTypeIcon(manifest.pluginType);
  const typeColor = getPluginTypeColor(manifest.pluginType);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Validated badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8,
        background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)",
      }}>
        <Check size={14} color="#10b981" />
        <span style={{ fontSize: "12px", color: "#10b981", fontWeight: 600 }}>Plugin validated successfully</span>
        <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginLeft: "auto" }}>{fileName}</span>
      </div>

      {/* Plugin info card */}
      <div style={{
        borderRadius: 8, background: "hsl(220,15%,8%)", border: "1px solid hsl(220,15%,15%)", overflow: "hidden",
      }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid hsl(220,15%,13%)", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, flexShrink: 0,
            background: `${typeColor}18`, border: `1px solid ${typeColor}30`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <TypeIcon size={20} color={typeColor} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: "14px", fontWeight: 700, color: "hsl(var(--foreground))" }}>{manifest.name}</span>
              <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>v{manifest.version}</span>
              <span style={{
                fontSize: "10px", fontWeight: 600, padding: "1px 7px", borderRadius: 10,
                background: `${typeColor}18`, color: typeColor, textTransform: "capitalize",
              }}>
                {manifest.pluginType.replace(/_/g, " ")}
              </span>
            </div>
            {manifest.description && (
              <p style={{ fontSize: "12px", color: "hsl(220,10%,48%)", margin: "4px 0 0", lineHeight: 1.5 }}>
                {manifest.description}
              </p>
            )}
          </div>
        </div>

        <div style={{ padding: "12px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
          <MetaItem icon={<Tag size={11} />} label="Slug" value={manifest.slug} mono />
          {manifest.author && <MetaItem icon={<User size={11} />} label="Author" value={manifest.author} />}
          <MetaItem icon={<Database size={11} />} label="Size" value={formatBytes(fileSize)} />
          {manifest.hooks && manifest.hooks.length > 0 && (
            <MetaItem icon={<Zap size={11} />} label="Hooks" value={manifest.hooks.join(", ")} />
          )}
          <MetaItem icon={<FileArchive size={11} />} label="Entry" value={manifest.entryFile} mono />
          {manifest.settings && manifest.settings.length > 0 && (
            <MetaItem icon={<Settings size={11} />} label="Settings" value={`${manifest.settings.length} field${manifest.settings.length !== 1 ? "s" : ""}`} />
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onCancel} style={{ ...secondaryBtnStyle, flex: 1, justifyContent: "center" }}>
          <X size={13} /> Cancel
        </button>
        <button onClick={onInstall} disabled={installing} style={{ ...primaryBtnStyle, flex: 2, justifyContent: "center" }}>
          {installing ? (
            <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> Installing...</>
          ) : (
            <><Package size={13} /> Install Plugin</>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PLUGIN_TYPE_FILTERS = [
  { value: "all", label: "All Types" },
  { value: "payment", label: "Payment" },
  { value: "validation", label: "Validation" },
  { value: "sms", label: "SMS / OTP" },
  { value: "email", label: "Email" },
  { value: "analytics", label: "Analytics" },
  { value: "webhook", label: "Webhook" },
  { value: "automation", label: "Automation" },
  { value: "integration", label: "Integration" },
  { value: "security", label: "Security" },
  { value: "custom", label: "Custom" },
];

export default function Plugins() {
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const { data: plugins = [], isLoading } = useQuery<Plugin[]>({
    queryKey: ["/api/admin/plugins"],
    queryFn: () => apiJson("/api/admin/plugins"),
    refetchInterval: false,
  });

  const filtered = plugins.filter((p) => {
    if (typeFilter !== "all" && (p.pluginType ?? "integration") !== typeFilter) return false;
    if (statusFilter === "active" && !p.isEnabled) return false;
    if (statusFilter === "inactive" && p.isEnabled) return false;
    return true;
  });

  const activeCount = plugins.filter((p) => p.isEnabled).length;

  return (
    <AdminLayout title="Plugins">
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Upload section */}
        <UploadSection onInstalled={() => qc.invalidateQueries({ queryKey: ["/api/admin/plugins"] })} />

        {/* Plugin list */}
        {plugins.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(var(--foreground))" }}>
                Installed Plugins
              </span>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginLeft: "auto" }}>
                {/* Status filter */}
                {(["all", "active", "inactive"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    style={{
                      padding: "4px 10px", borderRadius: 20, fontSize: "11px", fontWeight: 600,
                      border: "1px solid",
                      borderColor: statusFilter === s ? "#7c3aed" : "hsl(220,15%,20%)",
                      background: statusFilter === s ? "rgba(124,58,237,0.15)" : "transparent",
                      color: statusFilter === s ? "#a78bfa" : "hsl(var(--muted-foreground))",
                      cursor: "pointer", textTransform: "capitalize",
                    }}
                  >
                    {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Type filter */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {PLUGIN_TYPE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setTypeFilter(f.value)}
                  style={{
                    padding: "3px 10px", borderRadius: 20, fontSize: "10px", fontWeight: 600,
                    border: "1px solid",
                    borderColor: typeFilter === f.value ? "#6366f1" : "hsl(var(--border))",
                    background: typeFilter === f.value ? "rgba(99,102,241,0.15)" : "transparent",
                    color: typeFilter === f.value ? "#818cf8" : "hsl(220,10%,40%)",
                    cursor: "pointer",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 40, color: "hsl(220,10%,40%)", gap: 10 }}>
                <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: "13px" }}>Loading plugins...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{
                ...card, padding: "40px 20px", textAlign: "center",
                color: "hsl(220,10%,40%)", fontSize: "13px",
              }}>
                <Package size={28} color="hsl(220,10%,28%)" style={{ marginBottom: 10 }} />
                <p style={{ margin: 0 }}>No plugins match the current filter.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
                {filtered.map((p) => <PluginCard key={p.id} plugin={p} />)}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && plugins.length === 0 && (
          <div style={{
            ...card, padding: "48px 20px", textAlign: "center",
          }}>
            <Plug size={36} color="hsl(220,10%,28%)" style={{ marginBottom: 12 }} />
            <h3 style={{ fontSize: "15px", fontWeight: 700, color: "hsl(var(--foreground))", margin: "0 0 8px" }}>
              No plugins installed
            </h3>
            <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", margin: 0, lineHeight: 1.6 }}>
              Upload a plugin package above to extend platform functionality.<br />
              Plugins can add payment gateways, validation, SMS/email, analytics, and more.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function StatPill({
  icon, label, value, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 20,
      background: "hsl(220,15%,9%)", border: "1px solid hsl(220,15%,15%)",
    }}>
      <span style={{ color }}>{icon}</span>
      <span style={{ fontSize: "12px", color: "hsl(220,10%,48%)" }}>{label}</span>
      <span style={{ fontSize: "14px", fontWeight: 700, color }}>{value}</span>
    </div>
  );
}
