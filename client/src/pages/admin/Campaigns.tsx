import AdminLayout from "@/components/admin/AdminLayout";

const mockCampaigns = [
  { id: 1, name: "Year End Sale", type: "Discount", reach: "12,400", startDate: "2024-12-01", endDate: "2024-12-31", status: "active" },
  { id: 2, name: "New User Welcome", type: "Email", reach: "3,200", startDate: "2024-11-01", endDate: "2025-01-01", status: "active" },
  { id: 3, name: "Flash Sale Nov", type: "Discount", reach: "8,900", startDate: "2024-11-15", endDate: "2024-11-16", status: "ended" },
  { id: 4, name: "Referral Boost", type: "Referral", reach: "5,600", startDate: "2024-10-01", endDate: "2024-10-31", status: "ended" },
  { id: 5, name: "VIP Loyalty Q1", type: "Loyalty", reach: "2,100", startDate: "2025-01-01", endDate: "2025-03-31", status: "draft" },
];

const statusColor: Record<string, string> = {
  active: "hsl(142, 71%, 45%)",
  ended: "hsl(220, 10%, 45%)",
  draft: "hsl(38, 92%, 50%)",
};

const card: React.CSSProperties = {
  background: "hsl(220, 20%, 9%)",
  border: "1px solid hsl(220, 15%, 13%)",
  borderRadius: "8px",
};

export default function Campaigns() {
  return (
    <AdminLayout title="Campaigns">
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>All Campaigns</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {["#", "Campaign Name", "Type", "Reach", "Start", "End", "Status"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", color: "hsl(220, 10%, 42%)", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockCampaigns.map((c) => (
                <tr key={c.id} data-testid={`row-campaign-${c.id}`} style={{ borderBottom: "1px solid hsl(220, 15%, 11%)" }}>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>{c.id}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: "hsl(210, 40%, 95%)" }}>{c.name}</td>
                  <td style={{ padding: "12px 16px", color: "hsl(196, 100%, 50%)" }}>{c.type}</td>
                  <td style={{ padding: "12px 16px", color: "hsl(210, 40%, 80%)" }}>{c.reach}</td>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "hsl(220, 10%, 46%)" }}>{c.startDate}</td>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "hsl(220, 10%, 46%)" }}>{c.endDate}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, textTransform: "capitalize", background: `${statusColor[c.status]}20`, color: statusColor[c.status] }}>{c.status}</span>
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
