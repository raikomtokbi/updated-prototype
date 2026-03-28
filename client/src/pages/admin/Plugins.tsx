import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Power, Trash2, Settings, Plus, ChevronDown, ChevronUp } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import type { Plugin } from "@shared/schema";
import { card, btnPrimary, btnDanger, Modal } from "@/components/admin/shared";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "7px 10px", background: "hsl(220, 20%, 11%)",
  border: "1px solid hsl(220, 15%, 18%)", borderRadius: "6px", color: "hsl(210,40%,92%)",
  fontSize: "13px", outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: "11px", fontWeight: 600, color: "hsl(220,10%,55%)", marginBottom: "4px",
  display: "block", textTransform: "uppercase", letterSpacing: "0.04em",
};

const DEFAULT_PLUGINS = [
  { slug: "smtp-email", name: "SMTP Email Service", description: "Send transactional emails (registration, order confirmation, password reset)", category: "notification" },
  { slug: "sms-otp", name: "SMS / OTP Service", description: "Send one-time passwords and SMS notifications to users via SMS provider", category: "notification" },
  { slug: "analytics", name: "Analytics", description: "Track page views, user behavior, and conversion events via Google Analytics or Mixpanel", category: "tracking" },
  { slug: "webhook", name: "Webhook Integration", description: "Push real-time events to external systems when orders, payments, or tickets change", category: "integration" },
  { slug: "push-notifications", name: "Push Notifications (FCM)", description: "Send push alerts to users on mobile and web using Firebase Cloud Messaging", category: "notification" },
  { slug: "game-api", name: "Game Data API", description: "Fetch live game data, player information and validate user IDs for top-ups", category: "integration" },
];

const CATEGORIES: Record<string, { label: string; color: string }> = {
  notification: { label: "Notification", color: "#22d3ee" },
  tracking: { label: "Tracking", color: "#a78bfa" },
  integration: { label: "Integration", color: "#34d399" },
};

function ConfigModal({ plugin, onClose }: { plugin: Plugin; onClose: () => void }) {
  const qc = useQueryClient();
  const [config, setConfig] = useState(() => {
    try { return JSON.parse(plugin.config ?? "{}"); } catch { return {}; }
  });
  const [key, setKey] = useState("");
  const [val, setVal] = useState("");

  const saveMut = useMutation({
    mutationFn: (d: any) => adminApi.put(`/plugins/${plugin.slug}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/plugins"] }); onClose(); },
  });

  function addEntry() {
    if (!key.trim()) return;
    setConfig((prev: any) => ({ ...prev, [key.trim()]: val }));
    setKey("");
    setVal("");
  }
  function removeEntry(k: string) {
    const next = { ...config };
    delete next[k];
    setConfig(next);
  }

  return (
    <Modal title={`Configure: ${plugin.name}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p style={{ fontSize: "12px", color: "hsl(220,10%,45%)", margin: 0 }}>
          Configuration is stored securely. Keys set here override environment variables for this plugin.
        </p>

        {Object.entries(config).length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {Object.entries(config).map(([k, v]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: "8px", background: "hsl(220,20%,10%)", border: "1px solid hsl(220,15%,16%)", borderRadius: "6px", padding: "7px 10px" }}>
                <span style={{ fontSize: "11px", fontFamily: "monospace", color: "#a78bfa", flex: "0 0 120px" }}>{k}</span>
                <span style={{ fontSize: "11px", color: "hsl(210,40%,75%)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(v)}</span>
                <button onClick={() => removeEntry(k)} style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(0,72%,51%)", padding: 0 }}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "8px", alignItems: "end" }}>
          <div>
            <label style={labelStyle}>Key</label>
            <input style={inputStyle} value={key} onChange={(e) => setKey(e.target.value)} placeholder="API_KEY" />
          </div>
          <div>
            <label style={labelStyle}>Value</label>
            <input style={inputStyle} value={val} onChange={(e) => setVal(e.target.value)} placeholder="your-value" />
          </div>
          <button onClick={addEntry} style={{ ...btnPrimary, alignSelf: "flex-end" }}><Plus size={13} /></button>
        </div>

        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
          <button onClick={onClose} style={{ padding: "7px 14px", borderRadius: "6px", background: "hsl(220,15%,14%)", border: "1px solid hsl(220,15%,18%)", color: "hsl(220,10%,55%)", fontSize: "12px", cursor: "pointer" }}>Cancel</button>
          <button onClick={() => saveMut.mutate({ ...plugin, config: JSON.stringify(config) })} style={{ ...btnPrimary, opacity: saveMut.isPending ? 0.7 : 1 }} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function Plugins() {
  const qc = useQueryClient();
  const [configPlugin, setConfigPlugin] = useState<Plugin | null>(null);
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  const { data: installedPlugins = [], isLoading } = useQuery<Plugin[]>({
    queryKey: ["/api/admin/plugins"],
    queryFn: () => adminApi.get("/plugins"),
  });

  const toggleMut = useMutation({
    mutationFn: ({ slug, data }: { slug: string; data: any }) => adminApi.patch(`/plugins/${slug}/toggle`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/plugins"] }),
  });

  const installMut = useMutation({
    mutationFn: (p: typeof DEFAULT_PLUGINS[0]) => adminApi.put(`/plugins/${p.slug}`, {
      name: p.name, description: p.description, category: p.category, isEnabled: false, config: "{}",
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/plugins"] }),
  });

  const removeMut = useMutation({
    mutationFn: (slug: string) => adminApi.delete(`/plugins/${slug}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/plugins"] }),
  });

  const installedMap = Object.fromEntries(installedPlugins.map((p) => [p.slug, p]));

  return (
    <AdminLayout title="Plugins">
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

        {/* Installed plugins */}
        <div style={card}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>Installed Plugins</span>
              <p style={{ fontSize: "11px", color: "hsl(220,10%,42%)", margin: "2px 0 0" }}>{installedPlugins.length} plugin{installedPlugins.length !== 1 ? "s" : ""} installed</p>
            </div>
          </div>

          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "hsl(220,10%,42%)", fontSize: "13px" }}>Loading plugins...</div>
          ) : installedPlugins.length === 0 ? (
            <div style={{ padding: "2.5rem", textAlign: "center", color: "hsl(220,10%,40%)", fontSize: "13px" }}>
              No plugins installed yet. Install one from the available list below.
            </div>
          ) : (
            <div style={{ padding: "0 20px" }}>
              {installedPlugins.map((p, i) => {
                const cat = CATEGORIES[p.category ?? "integration"];
                const isExpanded = expandedSlug === p.slug;
                const configObj = (() => { try { return JSON.parse(p.config ?? "{}"); } catch { return {}; } })();
                return (
                  <div key={p.id} style={{ borderBottom: i < installedPlugins.length - 1 ? "1px solid hsl(220,15%,12%)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 0", flexWrap: "wrap" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: p.isEnabled ? "rgba(124,58,237,0.12)" : "hsl(220,15%,13%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Package size={16} color={p.isEnabled ? "hsl(258,90%,66%)" : "hsl(220,10%,40%)"} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210,40%,92%)" }}>{p.name}</span>
                          <span style={{ padding: "1px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 600, background: `${cat?.color ?? "#a78bfa"}18`, color: cat?.color ?? "#a78bfa" }}>{cat?.label ?? p.category}</span>
                          <span style={{ padding: "1px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 600, background: p.isEnabled ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)", color: p.isEnabled ? "hsl(142,71%,45%)" : "hsl(0,72%,51%)" }}>
                            {p.isEnabled ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p style={{ fontSize: "11px", color: "hsl(220,10%,40%)", margin: 0, lineHeight: 1.5 }}>{p.description}</p>
                      </div>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                        <button
                          onClick={() => setExpandedSlug(isExpanded ? null : p.slug)}
                          style={{ background: "none", border: "1px solid hsl(220,15%,18%)", borderRadius: "5px", color: "hsl(220,10%,45%)", padding: "5px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}
                        >
                          <Settings size={11} /> {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                        </button>
                        <button
                          onClick={() => toggleMut.mutate({ slug: p.slug, data: {} })}
                          disabled={toggleMut.isPending}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 10px", borderRadius: "5px", fontSize: "11px", fontWeight: 600, cursor: "pointer", border: "1px solid",
                            background: p.isEnabled ? "rgba(239,68,68,0.1)" : "rgba(74,222,128,0.1)",
                            borderColor: p.isEnabled ? "rgba(239,68,68,0.25)" : "rgba(74,222,128,0.25)",
                            color: p.isEnabled ? "hsl(0,72%,62%)" : "hsl(142,71%,48%)",
                          }}
                        >
                          <Power size={11} /> {p.isEnabled ? "Disable" : "Enable"}
                        </button>
                        <button onClick={() => { if (confirm(`Remove "${p.name}"?`)) removeMut.mutate(p.slug); }} style={{ display: "inline-flex", alignItems: "center", padding: "5px 8px", borderRadius: "5px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "hsl(0,72%,62%)", fontSize: "11px", cursor: "pointer" }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded config section */}
                    {isExpanded && (
                      <div style={{ background: "hsl(220,20%,7%)", border: "1px solid hsl(220,15%,12%)", borderRadius: "6px", padding: "12px 14px", marginBottom: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "hsl(220,10%,50%)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Plugin Settings</span>
                          <button onClick={() => setConfigPlugin(p)} style={{ ...btnPrimary, padding: "4px 10px", fontSize: "11px" }}><Settings size={10} /> Edit Config</button>
                        </div>
                        {Object.keys(configObj).length === 0 ? (
                          <p style={{ fontSize: "11px", color: "hsl(220,10%,35%)", margin: 0 }}>No configuration set. Click "Edit Config" to add settings.</p>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {Object.entries(configObj).map(([k, v]) => (
                              <div key={k} style={{ display: "flex", gap: "10px", fontSize: "11px" }}>
                                <span style={{ fontFamily: "monospace", color: "#a78bfa", minWidth: "100px" }}>{k}</span>
                                <span style={{ color: "hsl(210,40%,60%)" }}>{"•".repeat(Math.min(String(v).length, 20))}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Available plugins to install */}
        <div style={card}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>Available Plugins</span>
            <p style={{ fontSize: "11px", color: "hsl(220,10%,42%)", margin: "4px 0 0" }}>Install to enable additional functionality</p>
          </div>
          <div style={{ padding: "0 20px" }}>
            {DEFAULT_PLUGINS.map((p, i) => {
              const installed = !!installedMap[p.slug];
              const cat = CATEGORIES[p.category];
              return (
                <div key={p.slug} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 0", borderBottom: i < DEFAULT_PLUGINS.length - 1 ? "1px solid hsl(220,15%,12%)" : "none", flexWrap: "wrap" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: installed ? "rgba(74,222,128,0.1)" : "hsl(220,15%,13%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Package size={16} color={installed ? "hsl(142,71%,48%)" : "hsl(220,10%,40%)"} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210,40%,92%)" }}>{p.name}</span>
                      <span style={{ padding: "1px 6px", borderRadius: "3px", fontSize: "10px", fontWeight: 600, background: `${cat?.color ?? "#a78bfa"}18`, color: cat?.color ?? "#a78bfa" }}>{cat?.label ?? p.category}</span>
                    </div>
                    <p style={{ fontSize: "11px", color: "hsl(220,10%,40%)", margin: 0, lineHeight: 1.5 }}>{p.description}</p>
                  </div>
                  <button
                    disabled={installed || installMut.isPending}
                    onClick={() => installMut.mutate(p)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: "5px", padding: "5px 12px", borderRadius: "5px", fontSize: "11px", fontWeight: 600, cursor: installed ? "default" : "pointer", border: "1px solid", flexShrink: 0,
                      background: installed ? "rgba(74,222,128,0.08)" : "rgba(124,58,237,0.12)",
                      borderColor: installed ? "rgba(74,222,128,0.2)" : "rgba(124,58,237,0.3)",
                      color: installed ? "hsl(142,71%,45%)" : "#a78bfa",
                      opacity: !installed && installMut.isPending ? 0.7 : 1,
                    }}
                  >
                    {installed ? "Installed" : <><Plus size={11} /> Install</>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {configPlugin && <ConfigModal plugin={configPlugin} onClose={() => setConfigPlugin(null)} />}
    </AdminLayout>
  );
}
