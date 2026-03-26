import AdminLayout from "@/components/admin/AdminLayout";

const mockVouchers = [
  { id: 1, name: "Netflix 1 Month", category: "Streaming", price: "$15.99", stock: 50, active: true },
  { id: 2, name: "Spotify Premium", category: "Music", price: "$9.99", stock: 100, active: true },
  { id: 3, name: "Steam $20 Card", category: "Gaming", price: "$20.00", stock: 30, active: true },
  { id: 4, name: "iTunes $50 Card", category: "App Store", price: "$50.00", stock: 20, active: true },
  { id: 5, name: "PlayStation $25", category: "Gaming", price: "$25.00", stock: 0, active: false },
];

const card: React.CSSProperties = {
  background: "hsl(220, 20%, 9%)",
  border: "1px solid hsl(220, 15%, 13%)",
  borderRadius: "8px",
};

export default function Vouchers() {
  return (
    <AdminLayout title="Vouchers">
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>All Vouchers</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {["#", "Name", "Category", "Price", "Stock", "Status"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", color: "hsl(220, 10%, 42%)", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockVouchers.map((v) => (
                <tr key={v.id} data-testid={`row-voucher-${v.id}`} style={{ borderBottom: "1px solid hsl(220, 15%, 11%)" }}>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>{v.id}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: "hsl(210, 40%, 95%)" }}>{v.name}</td>
                  <td style={{ padding: "12px 16px", color: "hsl(220, 10%, 58%)" }}>{v.category}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: "hsl(210, 40%, 95%)" }}>{v.price}</td>
                  <td style={{ padding: "12px 16px", color: v.stock === 0 ? "hsl(0, 72%, 51%)" : "hsl(210, 40%, 80%)" }}>{v.stock}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, background: v.active ? "rgba(74, 222, 128, 0.12)" : "rgba(239, 68, 68, 0.12)", color: v.active ? "hsl(142, 71%, 45%)" : "hsl(0, 72%, 51%)" }}>
                      {v.active ? "Active" : "Inactive"}
                    </span>
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
