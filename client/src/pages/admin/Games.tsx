import AdminLayout from "@/components/admin/AdminLayout";

const mockGames = [
  { id: 1, name: "Mobile Legends", category: "MOBA", products: 12, active: true },
  { id: 2, name: "Free Fire", category: "Battle Royale", products: 8, active: true },
  { id: 3, name: "PUBG Mobile", category: "Battle Royale", products: 10, active: true },
  { id: 4, name: "Genshin Impact", category: "RPG", products: 15, active: true },
  { id: 5, name: "Clash of Clans", category: "Strategy", products: 6, active: false },
  { id: 6, name: "Valorant", category: "FPS", products: 9, active: true },
];

const card: React.CSSProperties = {
  background: "hsl(220, 20%, 9%)",
  border: "1px solid hsl(220, 15%, 13%)",
  borderRadius: "8px",
};

export default function Games() {
  return (
    <AdminLayout title="Games">
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>All Games</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {["#", "Game Name", "Category", "Products", "Status"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", color: "hsl(220, 10%, 42%)", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockGames.map((g) => (
                <tr key={g.id} data-testid={`row-game-${g.id}`} style={{ borderBottom: "1px solid hsl(220, 15%, 11%)" }}>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>{g.id}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: "hsl(210, 40%, 95%)" }}>{g.name}</td>
                  <td style={{ padding: "12px 16px", color: "hsl(220, 10%, 58%)" }}>{g.category}</td>
                  <td style={{ padding: "12px 16px", color: "hsl(210, 40%, 80%)" }}>{g.products}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, background: g.active ? "rgba(74, 222, 128, 0.12)" : "rgba(239, 68, 68, 0.12)", color: g.active ? "hsl(142, 71%, 45%)" : "hsl(0, 72%, 51%)" }}>
                      {g.active ? "Active" : "Inactive"}
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
