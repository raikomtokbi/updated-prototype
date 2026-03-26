import AdminLayout from "@/components/admin/AdminLayout";

const mockCoupons = [
  { id: 1, code: "SAVE20", type: "Percentage", discount: "20%", uses: 142, limit: 500, expiry: "2024-12-31", active: true },
  { id: 2, code: "FLAT10", type: "Fixed", discount: "$10", uses: 89, limit: 200, expiry: "2024-12-15", active: true },
  { id: 3, code: "WELCOME15", type: "Percentage", discount: "15%", uses: 200, limit: 200, expiry: "2025-01-01", active: false },
  { id: 4, code: "VIP50", type: "Percentage", discount: "50%", uses: 10, limit: 50, expiry: "2025-01-31", active: true },
  { id: 5, code: "FLASH5", type: "Fixed", discount: "$5", uses: 350, limit: 350, expiry: "2024-11-16", active: false },
];

const card: React.CSSProperties = {
  background: "hsl(220, 20%, 9%)",
  border: "1px solid hsl(220, 15%, 13%)",
  borderRadius: "8px",
};

export default function Coupons() {
  return (
    <AdminLayout title="Coupons">
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>All Coupons</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {["#", "Code", "Type", "Discount", "Uses / Limit", "Expiry", "Status"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", color: "hsl(220, 10%, 42%)", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockCoupons.map((c) => (
                <tr key={c.id} data-testid={`row-coupon-${c.id}`} style={{ borderBottom: "1px solid hsl(220, 15%, 11%)" }}>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>{c.id}</td>
                  <td style={{ padding: "12px 16px", fontFamily: "monospace", fontWeight: 700, fontSize: "12px", color: "hsl(196, 100%, 50%)" }}>{c.code}</td>
                  <td style={{ padding: "12px 16px", color: "hsl(220, 10%, 58%)" }}>{c.type}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: "hsl(258, 90%, 70%)" }}>{c.discount}</td>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "hsl(210, 40%, 80%)" }}>{c.uses} / {c.limit}</td>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "hsl(220, 10%, 46%)" }}>{c.expiry}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, background: c.active ? "rgba(74, 222, 128, 0.12)" : "rgba(239, 68, 68, 0.12)", color: c.active ? "hsl(142, 71%, 45%)" : "hsl(0, 72%, 51%)" }}>
                      {c.active ? "Active" : "Inactive"}
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
