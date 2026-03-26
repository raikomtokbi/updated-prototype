import AdminLayout from "@/components/admin/AdminLayout";

const mockUsers = [
  { id: 1, username: "alex.smith", email: "alex@example.com", role: "user", joined: "2024-01-15", active: true },
  { id: 2, username: "jade.wong", email: "jade@example.com", role: "admin", joined: "2024-02-20", active: true },
  { id: 3, username: "carlos.r", email: "carlos@example.com", role: "user", joined: "2024-03-10", active: true },
  { id: 4, username: "nina.k", email: "nina@example.com", role: "staff", joined: "2024-04-05", active: true },
  { id: 5, username: "mark.t", email: "mark@example.com", role: "user", joined: "2024-05-22", active: false },
  { id: 6, username: "lisa.m", email: "lisa@example.com", role: "user", joined: "2024-06-18", active: true },
];

const roleColor: Record<string, string> = {
  super_admin: "hsl(258, 90%, 66%)",
  admin: "hsl(196, 100%, 50%)",
  staff: "hsl(38, 92%, 50%)",
  user: "hsl(220, 10%, 55%)",
};

const card: React.CSSProperties = {
  background: "hsl(220, 20%, 9%)",
  border: "1px solid hsl(220, 15%, 13%)",
  borderRadius: "8px",
};

export default function Users() {
  return (
    <AdminLayout title="User Manager">
      <div style={card}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>All Users</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr>
                {["#", "Username", "Email", "Role", "Joined", "Status"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.05em", color: "hsl(220, 10%, 42%)", borderBottom: "1px solid hsl(220, 15%, 13%)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockUsers.map((u) => (
                <tr key={u.id} data-testid={`row-user-${u.id}`} style={{ borderBottom: "1px solid hsl(220, 15%, 11%)" }}>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>{u.id}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 500, color: "hsl(210, 40%, 95%)" }}>{u.username}</td>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "hsl(220, 10%, 58%)" }}>{u.email}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, textTransform: "capitalize", background: `${roleColor[u.role]}20`, color: roleColor[u.role] }}>{u.role}</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "12px", color: "hsl(220, 10%, 46%)" }}>{u.joined}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, background: u.active ? "rgba(74, 222, 128, 0.12)" : "rgba(239, 68, 68, 0.12)", color: u.active ? "hsl(142, 71%, 45%)" : "hsl(0, 72%, 51%)" }}>
                      {u.active ? "Active" : "Banned"}
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
