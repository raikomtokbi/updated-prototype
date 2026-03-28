import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plug, CheckCircle, XCircle, Settings } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import { card, btnPrimary, Modal } from "@/components/admin/shared";
import type { Plugin } from "@shared/schema";

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "7px 10px", background: "hsl(220, 20%, 11%)",
  border: "1px solid hsl(220, 15%, 18%)", borderRadius: "6px", color: "hsl(210,40%,92%)",
  fontSize: "13px", outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: "11px", fontWeight: 600, color: "hsl(220,10%,55%)", marginBottom: "4px",
  display: "block", textTransform: "uppercase", letterSpacing: "0.04em",
};

interface ServiceDef {
  slug: string;
  name: string;
  note: string;
  fields: { key: string; label: string; placeholder?: string }[];
}

const SERVICES: ServiceDef[] = [
  {
    slug: "smtp-email",
    name: "SMTP Email Service",
    note: "Used for transactional emails and notifications",
    fields: [
      { key: "SMTP_HOST", label: "SMTP Host", placeholder: "smtp.example.com" },
      { key: "SMTP_PORT", label: "SMTP Port", placeholder: "587" },
      { key: "SMTP_USER", label: "SMTP Username", placeholder: "user@example.com" },
      { key: "SMTP_PASS", label: "SMTP Password", placeholder: "••••••••" },
    ],
  },
  {
    slug: "sms-otp",
    name: "SMS / OTP Provider",
    note: "Used for OTP verification and SMS alerts",
    fields: [
      { key: "SMS_API_KEY", label: "API Key", placeholder: "your-api-key" },
      { key: "SMS_SENDER_ID", label: "Sender ID", placeholder: "NEXCOIN" },
    ],
  },
  {
    slug: "game-api",
    name: "Game Data API",
    note: "Used for live game data and player lookups",
    fields: [
      { key: "GAME_API_KEY", label: "API Key", placeholder: "your-game-api-key" },
      { key: "GAME_API_URL", label: "API Base URL", placeholder: "https://api.gamedata.com" },
    ],
  },
  {
    slug: "push-notifications",
    name: "Push Notifications (FCM)",
    note: "Used for push alerts on mobile and web",
    fields: [
      { key: "FCM_SERVER_KEY", label: "FCM Server Key", placeholder: "AAAA..." },
      { key: "FCM_PROJECT_ID", label: "FCM Project ID", placeholder: "my-firebase-project" },
    ],
  },
  {
    slug: "analytics",
    name: "Analytics",
    note: "Used for tracking visits and conversions",
    fields: [
      { key: "ANALYTICS_ID", label: "Analytics ID", placeholder: "G-XXXXXXXXXX or UA-XXXXXXXX" },
    ],
  },
  {
    slug: "webhook",
    name: "Webhook Integration",
    note: "Used to push events to external systems",
    fields: [
      { key: "WEBHOOK_SECRET", label: "Webhook Secret", placeholder: "your-webhook-secret" },
      { key: "WEBHOOK_URL", label: "Webhook URL", placeholder: "https://your-server.com/hook" },
    ],
  },
];

function ConfigureModal({
  service,
  plugin,
  onClose,
}: {
  service: ServiceDef;
  plugin: Plugin | undefined;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const existingConfig = (() => { try { return JSON.parse(plugin?.config ?? "{}"); } catch { return {}; } })();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    service.fields.forEach((f) => { init[f.key] = existingConfig[f.key] ?? ""; });
    return init;
  });

  const saveMut = useMutation({
    mutationFn: () =>
      adminApi.put(`/plugins/${service.slug}`, {
        name: service.name,
        description: service.note,
        category: "integration",
        isEnabled: true,
        config: JSON.stringify(values),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/plugins"] });
      onClose();
    },
  });

  return (
    <Modal title={`Configure: ${service.name}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <p style={{ fontSize: "12px", color: "hsl(220,10%,45%)", margin: 0 }}>
          {service.note}. Credentials are stored in the database.
        </p>

        {service.fields.map((f) => (
          <div key={f.key}>
            <label style={labelStyle}>{f.label}</label>
            <input
              style={inputStyle}
              type="text"
              value={values[f.key]}
              onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder ?? ""}
              autoComplete="off"
            />
          </div>
        ))}

        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
          <button
            onClick={onClose}
            style={{ padding: "7px 14px", borderRadius: "6px", background: "hsl(220,15%,14%)", border: "1px solid hsl(220,15%,18%)", color: "hsl(220,10%,55%)", fontSize: "12px", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={() => saveMut.mutate()}
            style={{ ...btnPrimary, opacity: saveMut.isPending ? 0.7 : 1 }}
            disabled={saveMut.isPending}
          >
            {saveMut.isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function ApiIntegration() {
  const [configuring, setConfiguring] = useState<ServiceDef | null>(null);

  const { data: plugins = [] } = useQuery<Plugin[]>({
    queryKey: ["/api/admin/plugins"],
    queryFn: () => adminApi.get("/plugins"),
  });

  const pluginMap = Object.fromEntries(plugins.map((p) => [p.slug, p]));

  function isConfigured(service: ServiceDef) {
    const p = pluginMap[service.slug];
    if (!p) return false;
    try {
      const config = JSON.parse(p.config ?? "{}");
      return service.fields.every((f) => Boolean(config[f.key]));
    } catch {
      return false;
    }
  }

  return (
    <AdminLayout title="API Integration">
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ fontSize: "13px", color: "hsl(220,10%,45%)", lineHeight: 1.6 }}>
          Configure third-party integrations. Credentials are stored in the database and applied at runtime.
          Payment gateway configuration is managed in the{" "}
          <a href="/admin/payment-method" style={{ color: "hsl(258,90%,66%)", textDecoration: "none" }}>Payment Method</a> page.
        </div>

        <div style={card}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>Service Integrations</span>
            <p style={{ fontSize: "11px", color: "hsl(220,10%,42%)", margin: "4px 0 0" }}>
              Click Configure to add your API keys for each service
            </p>
          </div>
          <div style={{ padding: "0 20px" }}>
            {SERVICES.map((svc, i) => {
              const configured = isConfigured(svc);
              return (
                <div
                  key={svc.slug}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 0",
                    borderBottom: i < SERVICES.length - 1 ? "1px solid hsl(220, 15%, 12%)" : "none",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "36px", height: "36px", borderRadius: "6px", flexShrink: 0,
                        background: configured ? "rgba(74,222,128,0.08)" : "hsl(220, 15%, 13%)",
                        color: configured ? "hsl(142,71%,48%)" : "hsl(220, 10%, 40%)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Plug size={14} />
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: "hsl(210, 40%, 85%)" }}>{svc.name}</div>
                      <div style={{ fontSize: "11px", color: "hsl(220, 10%, 38%)", marginTop: "2px" }}>{svc.note}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      {configured ? (
                        <>
                          <CheckCircle size={13} color="hsl(142,71%,48%)" />
                          <span style={{ fontSize: "12px", color: "hsl(142,71%,48%)" }}>Configured</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={13} color="hsl(220, 10%, 35%)" />
                          <span style={{ fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>Not configured</span>
                        </>
                      )}
                    </div>
                    <button
                      onClick={() => setConfiguring(svc)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "5px",
                        padding: "5px 10px", borderRadius: "5px", fontSize: "11px", fontWeight: 600,
                        cursor: "pointer", border: "1px solid rgba(124,58,237,0.3)",
                        background: "rgba(124,58,237,0.1)", color: "#a78bfa",
                      }}
                    >
                      <Settings size={11} /> Configure
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {configuring && (
        <ConfigureModal
          service={configuring}
          plugin={pluginMap[configuring.slug]}
          onClose={() => setConfiguring(null)}
        />
      )}
    </AdminLayout>
  );
}
