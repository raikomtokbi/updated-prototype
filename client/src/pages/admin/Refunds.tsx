import AdminLayout from "@/components/admin/AdminLayout";

const mockRefunds = [
  { id: "#REF-001", user: "nina.k", reason: "Item not received", amount: "$14.99", status: "approved", date: "2024-11-30" },
  { id: "#REF-002", user: "lisa.m", reason: "Duplicate charge", amount: "$20.00", status: "pending", date: "2024-11-29" },
  { id: "#REF-003", user: "tom.h", reason: "Wrong product", amount: "$9.99", status: "rejected", date: "2024-11-28" },
  { id: "#REF-004", user: "kevin.b", reason: "Technical issue", amount: "$50.00", status: "approved", date: "2024-11-27" },
];

const statusColor: Record<string, string> = {
  approved: "hsl(142, 71%, 45%)",
  pending: "hsl(38, 92%, 50%)",
  rejected: "hsl(0, 72%, 51%)",
};

const card: React.CSSProperties = {
  background: "hsl(220, 20%, 9%)",
  border: "1px solid hsl(220, 15%, 13%)",
  borderRadius: "8px",
};

export default function Refunds() {
  return (
    <AdminLayout title="Refund Transactions">
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>Refund Requests</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {["Refund ID", "User", "Reason", "Amount", "Status", "Date"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", color: "hsl(220, 10%, 42%)", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockRefunds.map((r) => (
                <tr key={r.id} data-testid={`row-refund-${r.id}`} style={{ borderBottom: "1px solid hsl(220, 15%, 11%)" }}>
                  <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "12px", color: "hsl(258, 90%, 70%)" }}>{r.id}</td>
                  <td style={{ padding: "12px 16px", color: "hsl(210, 40%, 85%)" }}>{r.user}</td>
                  <td style={{ padding: "12px 16px", color: "hsl(220, 10%, 58%)" }}>{r.reason}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: "hsl(210, 40%, 95%)" }}>{r.amount}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, background: `${statusColor[r.status]}20`, color: statusColor[r.status] }}>{r.status}</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "hsl(220, 10%, 46%)" }}>{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
