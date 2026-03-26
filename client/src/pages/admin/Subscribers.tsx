import AdminLayout from "@/components/admin/AdminLayout";

const mockSubs = [
  { id: 1, username: "alex.smith", plan: "Pro Plan", startDate: "2024-11-01", endDate: "2024-12-01", status: "active" },
  { id: 2, username: "jade.wong", plan: "Basic Plan", startDate: "2024-10-15", endDate: "2024-11-15", status: "expired" },
  { id: 3, username: "carlos.r", plan: "Elite Plan", startDate: "2024-11-20", endDate: "2024-12-20", status: "active" },
  { id: 4, username: "lisa.m", plan: "Annual Basic", startDate: "2024-01-01", endDate: "2024-12-31", status: "active" },
  { id: 5, username: "mark.t", plan: "Pro Plan", startDate: "2024-09-01", endDate: "2024-10-01", status: "cancelled" },
];

const statusColor: Record<string, string> = {
  active: "hsl(142, 71%, 45%)",
  expired: "hsl(38, 92%, 50%)",
  cancelled: "hsl(0, 72%, 51%)",
};

const card: React.CSSProperties = {
  background: "hsl(220, 20%, 9%)",
  border: "1px solid hsl(220, 15%, 13%)",
  borderRadius: "8px",
};

export default function Subscribers() {
  return (
    <AdminLayout title="Subscribers">
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>All Subscribers</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {["#", "Username", "Plan", "Start Date", "End Date", "Status"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", color: "hsl(220, 10%, 42%)", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockSubs.map((s) => (
                <tr key={s.id} data-testid={`row-subscriber-${s.id}`} style={{ borderBottom: "1px solid hsl(220, 15%, 11%)" }}>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>{s.id}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: "hsl(210, 40%, 95%)" }}>{s.username}</td>
                  <td style={{ padding: "12px 16px", color: "hsl(258, 90%, 70%)" }}>{s.plan}</td>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "hsl(220, 10%, 46%)" }}>{s.startDate}</td>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "hsl(220, 10%, 46%)" }}>{s.endDate}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, background: `${statusColor[s.status]}20`, color: statusColor[s.status] }}>{s.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
