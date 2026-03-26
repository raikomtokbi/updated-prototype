import AdminLayout from "@/components/admin/AdminLayout";
import { Plug, CheckCircle, XCircle } from "lucide-react";

const apis = [
  { name: "Payment Gateway", key: "pk_live_••••••••••••••••", status: "connected", lastSync: "2 min ago" },
  { name: "Email Service (SMTP)", key: "smtp.provider.com:587", status: "connected", lastSync: "1 hour ago" },
  { name: "SMS Provider", key: "Not configured", status: "disconnected", lastSync: "—" },
  { name: "Game Data API", key: "gd_••••••••••••••••", status: "connected", lastSync: "5 min ago" },
  { name: "Analytics SDK", key: "Not configured", status: "disconnected", lastSync: "—" },
  { name: "Push Notifications", key: "fcm_••••••••••••••••", status: "connected", lastSync: "10 min ago" },
];

const card: React.CSSProperties = {
  background: "hsl(220, 20%, 9%)",
  border: "1px solid hsl(220, 15%, 13%)",
  borderRadius: "8px",
};

export default function ApiIntegration() {
  return (
    <AdminLayout title="API Integration">
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>Connected APIs</span>
        </div>
        <div style={{ padding: "0 20px" }}>
          {apis.map((api, i) => (
            <div
              key={i}
              data-testid={`row-api-${api.name.toLowerCase().replace(/[\s()]/g, "-")}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 0",
                borderBottom: i < apis.length - 1 ? "1px solid hsl(220, 15%, 12%)" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: "hsl(220, 15%, 13%)", color: "hsl(258, 90%, 66%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Plug size={14} />
                </div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 500, color: "hsl(210, 40%, 90%)" }}>{api.name}</div>
                  <div style={{ fontSize: "11px", fontFamily: "monospace", color: "hsl(220, 10%, 38%)", marginTop: "2px" }}>{api.key}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <span style={{ fontSize: "11px", color: "hsl(220, 10%, 42%)" }}>Last sync: {api.lastSync}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  {api.status === "connected" ? <CheckCircle size={13} color="hsl(142, 71%, 45%)" /> : <XCircle size={13} color="hsl(0, 72%, 51%)" />}
                  <span style={{ fontSize: "12px", color: api.status === "connected" ? "hsl(142, 71%, 45%)" : "hsl(0, 72%, 51%)" }}>{api.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
