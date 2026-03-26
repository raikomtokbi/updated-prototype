import AdminLayout from "@/components/admin/AdminLayout";

const mockTickets = [
  { id: "#TKT-012", user: "alex.smith", subject: "Payment not received", priority: "high", status: "open", date: "2024-12-01" },
  { id: "#TKT-011", user: "jade.wong", subject: "Account locked", priority: "medium", status: "in-progress", date: "2024-12-01" },
  { id: "#TKT-010", user: "carlos.r", subject: "Wrong game code", priority: "low", status: "resolved", date: "2024-11-30" },
  { id: "#TKT-009", user: "nina.k", subject: "Refund not processed", priority: "high", status: "open", date: "2024-11-30" },
  { id: "#TKT-008", user: "mark.t", subject: "Subscription issue", priority: "medium", status: "resolved", date: "2024-11-29" },
];

const priorityColor: Record<string, string> = {
  high: "hsl(0, 72%, 51%)",
  medium: "hsl(38, 92%, 50%)",
  low: "hsl(142, 71%, 45%)",
};

const statusColor: Record<string, string> = {
  open: "hsl(196, 100%, 50%)",
  "in-progress": "hsl(38, 92%, 50%)",
  resolved: "hsl(142, 71%, 45%)",
};

const card: React.CSSProperties = {
  background: "hsl(220, 20%, 9%)",
  border: "1px solid hsl(220, 15%, 13%)",
  borderRadius: "8px",
};

export default function SupportTickets() {
  return (
    <AdminLayout title="Support Tickets">
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>All Support Tickets</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {["Ticket ID", "User", "Subject", "Priority", "Status", "Date"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", color: "hsl(220, 10%, 42%)", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockTickets.map((t) => (
                <tr key={t.id} data-testid={`row-ticket-${t.id}`} style={{ borderBottom: "1px solid hsl(220, 15%, 11%)" }}>
                  <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "12px", color: "hsl(258, 90%, 70%)" }}>{t.id}</td>
                  <td style={{ padding: "12px 16px", color: "hsl(210, 40%, 85%)" }}>{t.user}</td>
                  <td style={{ padding: "12px 16px", color: "hsl(220, 10%, 58%)" }}>{t.subject}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, background: `${priorityColor[t.priority]}20`, color: priorityColor[t.priority] }}>{t.priority}</span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, background: `${statusColor[t.status]}20`, color: statusColor[t.status] }}>{t.status}</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "hsl(220, 10%, 46%)" }}>{t.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
