import AdminLayout from "@/components/admin/AdminLayout";

const mockOrders = [
  { id: "#VO-0008", user: "sara.j", voucher: "Netflix 1 Month", amount: "$15.99", status: "completed", date: "2024-12-01" },
  { id: "#VO-0007", user: "tom.h", voucher: "Spotify Premium", amount: "$9.99", status: "completed", date: "2024-12-01" },
  { id: "#VO-0006", user: "lisa.m", voucher: "Steam $20", amount: "$20.00", status: "pending", date: "2024-11-30" },
  { id: "#VO-0005", user: "kevin.b", voucher: "iTunes $50", amount: "$50.00", status: "failed", date: "2024-11-29" },
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

export default function VoucherOrders() {
  return (
    <AdminLayout title="Voucher Orders">
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>Recent Voucher Orders</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {["Order ID", "User", "Voucher", "Amount", "Status", "Date"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", color: "hsl(220, 10%, 42%)", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockOrders.map((order) => (
                <tr key={order.id} data-testid={`row-voucher-order-${order.id}`} style={{ borderBottom: "1px solid hsl(220, 15%, 11%)" }}>
                  <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: "12px", color: "hsl(258, 90%, 70%)" }}>{order.id}</td>
                  <td style={{ padding: "12px 16px", color: "hsl(210, 40%, 85%)" }}>{order.user}</td>
                  <td style={{ padding: "12px 16px", color: "hsl(220, 10%, 58%)" }}>{order.voucher}</td>
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
