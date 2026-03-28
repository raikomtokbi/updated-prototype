import { Plug, XCircle } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { card } from "@/components/admin/shared";

const STATIC_APIS = [
  { name: "SMTP Email Service", key: "Configure in .env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS", status: "unconfigured", note: "Used for transactional emails and notifications" },
  { name: "SMS / OTP Provider", key: "Configure in .env: SMS_API_KEY, SMS_SENDER_ID", status: "unconfigured", note: "Used for OTP verification and SMS alerts" },
  { name: "Game Data API", key: "Configure in .env: GAME_API_KEY, GAME_API_URL", status: "unconfigured", note: "Used for live game data and player lookups" },
  { name: "Push Notifications (FCM)", key: "Configure in .env: FCM_SERVER_KEY, FCM_PROJECT_ID", status: "unconfigured", note: "Used for push alerts on mobile and web" },
  { name: "Analytics", key: "Configure in .env: ANALYTICS_ID (Google Analytics / Mixpanel)", status: "unconfigured", note: "Used for tracking visits and conversions" },
  { name: "Webhook Integration", key: "Configure in .env: WEBHOOK_SECRET, WEBHOOK_URL", status: "unconfigured", note: "Used to push events to external systems" },
];

export default function ApiIntegration() {
  return (
    <AdminLayout title="API Integration">
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ fontSize: "13px", color: "hsl(220,10%,45%)", lineHeight: 1.6 }}>
          Configure third-party integrations via environment variables. Payment gateway configuration is managed in the{" "}
          <a href="/admin/payment-method" style={{ color: "hsl(258,90%,66%)", textDecoration: "none" }}>Payment Method</a> page.
        </div>

        <div style={card}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>Service Integrations</span>
            <p style={{ fontSize: "11px", color: "hsl(220,10%,42%)", margin: "4px 0 0" }}>
              Configure these via environment variables in your deployment settings
            </p>
          </div>
          <div style={{ padding: "0 20px" }}>
            {STATIC_APIS.map((api, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 0",
                  borderBottom: i < STATIC_APIS.length - 1 ? "1px solid hsl(220, 15%, 12%)" : "none",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "6px",
                      background: "hsl(220, 15%, 13%)",
                      color: "hsl(220, 10%, 40%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Plug size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 500, color: "hsl(210, 40%, 85%)" }}>{api.name}</div>
                    <div style={{ fontSize: "11px", color: "hsl(220, 10%, 38%)", marginTop: "2px" }}>{api.note}</div>
                    <div style={{ fontSize: "10px", fontFamily: "monospace", color: "hsl(220, 10%, 30%)", marginTop: "3px" }}>{api.key}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <XCircle size={13} color="hsl(220, 10%, 35%)" />
                  <span style={{ fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>Not configured</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
