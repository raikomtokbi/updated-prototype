import AdminLayout from "@/components/admin/AdminLayout";

const settings = [
  { label: "Site Maintenance Mode", description: "Temporarily disable the site for maintenance", value: false },
  { label: "User Registration", description: "Allow new users to register accounts", value: true },
  { label: "Order Processing", description: "Enable automatic order processing", value: true },
  { label: "Email Notifications", description: "Send email notifications to users", value: true },
  { label: "Two-Factor Auth (2FA)", description: "Require 2FA for admin logins", value: false },
  { label: "Auto Refunds", description: "Automatically process refunds on failed orders", value: true },
];

const card: React.CSSProperties = {
  background: "hsl(220, 20%, 9%)",
  border: "1px solid hsl(220, 15%, 13%)",
  borderRadius: "8px",
};

export default function ControlPanel() {
  return (
    <AdminLayout title="Control Panel">
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>System Settings</span>
        </div>
        <div style={{ padding: "0 20px" }}>
          {settings.map((s, i) => (
            <div
              key={i}
              data-testid={`setting-${s.label.toLowerCase().replace(/[\s()]/g, "-")}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 0",
                borderBottom: i < settings.length - 1 ? "1px solid hsl(220, 15%, 12%)" : "none",
              }}
            >
              <div>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "hsl(210, 40%, 90%)", marginBottom: "2px" }}>{s.label}</div>
                <div style={{ fontSize: "11px", color: "hsl(220, 10%, 42%)" }}>{s.description}</div>
              </div>
              <div
                style={{
                  position: "relative",
                  width: "40px",
                  height: "22px",
                  borderRadius: "11px",
                  background: s.value ? "hsl(258, 90%, 66%)" : "hsl(220, 15%, 20%)",
                  flexShrink: 0,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "3px",
                    left: s.value ? "calc(100% - 19px)" : "3px",
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    background: "white",
                    transition: "left 0.2s",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
