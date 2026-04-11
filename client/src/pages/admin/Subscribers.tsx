import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import type { User } from "@shared/schema";
import {
  card, thStyle, tdStyle,
  SearchInput, StatusBadge, EmptyState, Toolbar,
} from "@/components/admin/shared";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function Subscribers() {
  const [search, setSearch] = useState("");

  const { data: subscribers = [], isLoading } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/admin/users/subscribers"],
    queryFn: () => adminApi.get("/users/subscribers"),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return subscribers.filter((s) =>
      !q || s.username.toLowerCase().includes(q) || (s.email ?? "").toLowerCase().includes(q)
    );
  }, [subscribers, search]);

  return (
    <AdminLayout title="Subscribers">
      <div style={card}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search username or email..." />
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>
            {filtered.length} subscriber{filtered.length !== 1 ? "s" : ""}
          </span>
        </Toolbar>

        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "hsl(220,10%,42%)", fontSize: "13px" }}>Loading subscribers...</div>
          ) : filtered.length === 0 ? (
            <EmptyState message={subscribers.length === 0 ? "No subscribers yet." : "No subscribers match your search."} />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["Username", "Email", "Role", "Joined", "Status"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id}>
                    <td style={{ ...tdStyle, fontWeight: 500, color: "hsl(var(--foreground))" }}>{s.username}</td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(220, 10%, 58%)" }}>{s.email ?? "—"}</td>
                    <td style={tdStyle}><StatusBadge value={s.role} /></td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(220, 10%, 46%)" }}>{formatDate(s.createdAt)}</td>
                    <td style={tdStyle}><StatusBadge value={s.isActive ? "active" : "inactive"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
