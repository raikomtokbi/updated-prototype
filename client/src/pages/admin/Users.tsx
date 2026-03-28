import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import { useAuthStore } from "@/lib/store/authstore";
import type { User } from "@shared/schema";
import {
  card, thStyle, tdStyle,
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

const ROLE_ORDER = ["user", "staff", "admin", "super_admin"];

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function UserActionsMenu({ user, onUpdate, disabled }: {
  user: Omit<User, "password">;
  onUpdate: (data: Partial<User>) => void;
  disabled: boolean;
}) {
  const { user: me } = useAuthStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const isSelf = me?.id === user.id;
  const roleIdx = ROLE_ORDER.indexOf(user.role);
  const canPromote = roleIdx < ROLE_ORDER.length - 1;
  const canDemote = roleIdx > 0;

  const menuBtn: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: "8px 14px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: "12px",
    textAlign: "left",
    gap: "8px",
    whiteSpace: "nowrap",
  };

  const actions = [
    canPromote && !isSelf && {
      label: `Promote → ${ROLE_ORDER[roleIdx + 1].replace("_", " ")}`,
      color: "hsl(196, 100%, 60%)",
      onClick: () => onUpdate({ role: ROLE_ORDER[roleIdx + 1] as User["role"] }),
    },
    canDemote && !isSelf && {
      label: `Demote → ${ROLE_ORDER[roleIdx - 1].replace("_", " ")}`,
      color: "hsl(38, 92%, 60%)",
      onClick: () => onUpdate({ role: ROLE_ORDER[roleIdx - 1] as User["role"] }),
    },
    !isSelf && {
      label: user.isActive ? "Ban User" : "Unban User",
      color: user.isActive ? "hsl(0, 72%, 62%)" : "hsl(142, 71%, 48%)",
      onClick: () => onUpdate({ isActive: !user.isActive }),
    },
    ...["user", "staff", "admin"].filter((r) => r !== user.role).map((r) => ({
      label: `Set Role: ${r.replace("_", " ")}`,
      color: "hsl(220, 10%, 60%)",
      onClick: () => onUpdate({ role: r as User["role"] }),
    })),
  ].filter(Boolean) as { label: string; color: string; onClick: () => void }[];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        disabled={disabled || isSelf}
        onClick={() => setOpen(!open)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "5px 10px",
          borderRadius: "5px",
          background: "hsl(220, 20%, 14%)",
          border: "1px solid hsl(220, 15%, 20%)",
          color: isSelf ? "hsl(220,10%,35%)" : "hsl(220, 10%, 65%)",
          fontSize: "11px",
          cursor: isSelf ? "not-allowed" : "pointer",
          whiteSpace: "nowrap",
        }}
        title={isSelf ? "Cannot modify your own account" : "Actions"}
      >
        Actions <ChevronDown size={11} />
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          right: 0,
          minWidth: "180px",
          background: "hsl(220, 20%, 10%)",
          border: "1px solid hsl(220, 15%, 18%)",
          borderRadius: "8px",
          overflow: "hidden",
          zIndex: 100,
          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        }}>
          {actions.length === 0 ? (
            <div style={{ padding: "10px 14px", fontSize: "12px", color: "hsl(220,10%,40%)" }}>No actions available</div>
          ) : (
            actions.map((a) => (
              <button
                key={a.label}
                style={{ ...menuBtn, color: a.color }}
                onClick={() => { a.onClick(); setOpen(false); }}
              >
                {a.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
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

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      adminApi.patch(`/users/${id}`, data),
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
                    <td style={tdStyle}><StatusBadge value={u.isActive ? "active" : "inactive"} /></td>
                    <td style={tdStyle}>
                      <UserActionsMenu
                        user={u}
                        onUpdate={(data) => updateMut.mutate({ id: u.id, data })}
                        disabled={updateMut.isPending}
                      />
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
