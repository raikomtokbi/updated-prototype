import AdminLayout from "@/components/admin/AdminLayout";

const mockSubs = [
  { id: 1, name: "Basic Plan", price: "$4.99/mo", subscribers: 320, duration: "Monthly", active: true },
  { id: 2, name: "Pro Plan", price: "$9.99/mo", subscribers: 180, duration: "Monthly", active: true },
  { id: 3, name: "Elite Plan", price: "$19.99/mo", subscribers: 75, duration: "Monthly", active: true },
  { id: 4, name: "Annual Basic", price: "$49.99/yr", subscribers: 90, duration: "Yearly", active: true },
  { id: 5, name: "Annual Pro", price: "$99.99/yr", subscribers: 45, duration: "Yearly", active: false },
];

const card: React.CSSProperties = {
  background: "hsl(220, 20%, 9%)",
  border: "1px solid hsl(220, 15%, 13%)",
  borderRadius: "8px",
};

export default function Subscriptions() {
  return (
    <AdminLayout title="Subscriptions">
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>Subscription Plans</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {["#", "Plan Name", "Price", "Subscribers", "Duration", "Status"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", color: "hsl(220, 10%, 42%)", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockSubs.map((s) => (
                <tr key={s.id} data-testid={`row-subscription-${s.id}`} style={{ borderBottom: "1px solid hsl(220, 15%, 11%)" }}>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>{s.id}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: "hsl(210, 40%, 95%)" }}>{s.name}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: "hsl(258, 90%, 70%)" }}>{s.price}</td>
                  <td style={{ padding: "12px 16px", color: "hsl(210, 40%, 80%)" }}>{s.subscribers}</td>
                  <td style={{ padding: "12px 16px", color: "hsl(220, 10%, 58%)" }}>{s.duration}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, background: s.active ? "rgba(74, 222, 128, 0.12)" : "rgba(239, 68, 68, 0.12)", color: s.active ? "hsl(142, 71%, 45%)" : "hsl(0, 72%, 51%)" }}>
                      {s.active ? "Active" : "Inactive"}
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
