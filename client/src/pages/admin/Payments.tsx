import AdminLayout from "@/components/admin/AdminLayout";

const mockPayments = [
  { id: "#PAY-001", user: "alex.smith", method: "Credit Card", amount: "$29.99", status: "success", date: "2024-12-01" },
  { id: "#PAY-002", user: "jade.wong", method: "PayPal", amount: "$9.99", status: "success", date: "2024-12-01" },
  { id: "#PAY-003", user: "carlos.r", method: "Bank Transfer", amount: "$49.99", status: "pending", date: "2024-11-30" },
  { id: "#PAY-004", user: "nina.k", method: "Credit Card", amount: "$14.99", status: "failed", date: "2024-11-30" },
  { id: "#PAY-005", user: "mark.t", method: "Crypto", amount: "$99.99", status: "success", date: "2024-11-29" },
];

const statusColor: Record<string, string> = {
  success: "hsl(142, 71%, 45%)",
  pending: "hsl(38, 92%, 50%)",
  failed: "hsl(0, 72%, 51%)",
};

const card: React.CSSProperties = {
  background: "hsl(220, 20%, 9%)",
  border: "1px solid hsl(220, 15%, 13%)",
  borderRadius: "8px",
};

export default function Payments() {
  return (
    <AdminLayout title="Payment Transactions">
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>Payment History</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {["Transaction ID", "User", "Method", "Amount", "Status", "Date"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", color: "hsl(220, 10%, 42%)", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockPayments.map((p) => (
                <tr key={p.id} data-testid={`row-payment-${p.id}`} style={{ borderBottom: "1px solid hsl(220, 15%, 11%)" }}>
                  <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "12px", color: "hsl(258, 90%, 70%)" }}>{p.id}</td>
                  <td style={{ padding: "12px 16px", color: "hsl(210, 40%, 85%)" }}>{p.user}</td>
                  <td style={{ padding: "12px 16px", color: "hsl(220, 10%, 58%)" }}>{p.method}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: "hsl(210, 40%, 95%)" }}>{p.amount}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, background: `${statusColor[p.status]}20`, color: statusColor[p.status] }}>{p.status}</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "hsl(220, 10%, 46%)" }}>{p.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
