import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import type { User } from "@shared/schema";
import {
  card, thStyle, tdStyle, btnSuccess, btnDanger,
  SearchInput, FilterSelect, StatusBadge, EmptyState, Toolbar,
} from "@/components/admin/shared";

const ROLE_OPTIONS = [
  { value: "", label: "All Roles" },
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "staff", label: "Staff" },
  { value: "user", label: "User" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled" },
];

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function Users() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: users = [], isLoading } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/admin/users"],
    queryFn: () => adminApi.get("/users?limit=200"),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.patch(`/users/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch = !q || u.username.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q);
      const matchRole = !roleFilter || u.role === roleFilter;
      const matchStatus = !statusFilter || (statusFilter === "active" ? u.isActive : !u.isActive);
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  return (
    <AdminLayout title="User Manager">
      <div style={card}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search username or email..." />
          <FilterSelect value={roleFilter} onChange={setRoleFilter} options={ROLE_OPTIONS} />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>
            {filtered.length} user{filtered.length !== 1 ? "s" : ""}
          </span>
        </Toolbar>

        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "hsl(220,10%,42%)", fontSize: "13px" }}>Loading users...</div>
          ) : filtered.length === 0 ? (
            <EmptyState message={users.length === 0 ? "No users yet." : "No users match your filters."} />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["Username", "Email", "Role", "Joined", "Status", "Actions"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td style={{ ...tdStyle, fontWeight: 500, color: "hsl(210, 40%, 95%)" }}>{u.username}</td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(220, 10%, 58%)" }}>{u.email ?? "—"}</td>
                    <td style={tdStyle}><StatusBadge value={u.role} /></td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(220, 10%, 46%)" }}>{formatDate(u.createdAt)}</td>
                    <td style={tdStyle}>
                      <StatusBadge value={u.isActive ? "active" : "inactive"} />
                    </td>
                    <td style={tdStyle}>
                      {u.isActive ? (
                        <button
                          style={btnDanger}
                          onClick={() => toggleMut.mutate({ id: u.id, isActive: false })}
                          disabled={toggleMut.isPending}
                        >
                          Disable
                        </button>
                      ) : (
                        <button
                          style={btnSuccess}
                          onClick={() => toggleMut.mutate({ id: u.id, isActive: true })}
                          disabled={toggleMut.isPending}
                        >
                          Enable
                        </button>
                      )}
                    </td>
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
