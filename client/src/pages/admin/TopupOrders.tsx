import AdminLayout from "@/components/admin/AdminLayout";

const mockOrders = [
  { id: "#TU-0012", user: "alex.smith", game: "Mobile Legends", amount: "$9.99", status: "completed", date: "2024-12-01" },
  { id: "#TU-0011", user: "jade.wong", game: "Free Fire", amount: "$4.99", status: "pending", date: "2024-12-01" },
  { id: "#TU-0010", user: "carlos.r", game: "PUBG Mobile", amount: "$19.99", status: "completed", date: "2024-11-30" },
  { id: "#TU-0009", user: "nina.k", game: "Genshin Impact", amount: "$29.99", status: "failed", date: "2024-11-30" },
  { id: "#TU-0008", user: "mark.t", game: "Mobile Legends", amount: "$4.99", status: "completed", date: "2024-11-29" },
];

const statusColor: Record<string, string> = {
  completed: "hsl(142, 71%, 45%)",
  pending: "hsl(38, 92%, 50%)",
  failed: "hsl(0, 72%, 51%)",
};

const card: React.CSSProperties = {
  background: "hsl(220, 20%, 9%)",
  border: "1px solid hsl(220, 15%, 13%)",
  borderRadius: "8px",
};

export default function TopupOrders() {
  return (
    <AdminLayout title="Top Up Orders">
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>Recent Top Up Orders</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {["Order ID", "User", "Game", "Amount", "Status", "Date"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", color: "hsl(220, 10%, 42%)", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockOrders.map((order) => (
                <tr key={order.id} data-testid={`row-topup-${order.id}`} style={{ borderBottom: "1px solid hsl(220, 15%, 11%)" }}>
                  <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "12px", color: "hsl(258, 90%, 70%)" }}>{order.id}</td>
                  <td style={{ padding: "12px 16px", color: "hsl(210, 40%, 85%)" }}>{order.user}</td>
                  <td style={{ padding: "12px 16px", color: "hsl(220, 10%, 58%)" }}>{order.game}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: "hsl(210, 40%, 95%)" }}>{order.amount}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, background: `${statusColor[order.status]}20`, color: statusColor[order.status] }}>{order.status}</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "hsl(220, 10%, 46%)" }}>{order.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
