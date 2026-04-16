import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X, Loader2, Ban, UserCheck, Trash2, PowerOff } from "lucide-react";
import AdminLayout, { useMobile } from "@/components/admin/AdminLayout";
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
  { value: "inactive", label: "Inactive" },
  { value: "banned", label: "Banned" },
];

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "7px 14px",
  borderRadius: "6px",
  background: "hsl(var(--primary))",
  color: "white",
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
  border: "none",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  color: "hsl(var(--foreground))",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "hsl(var(--muted-foreground))",
  marginBottom: "4px",
  display: "block",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: "440px", maxHeight: "85vh", overflowY: "auto", background: "hsl(var(--background))", border: "1px solid hsl(var(--primary) / 0.25)", borderRadius: "10px", padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "hsl(var(--foreground))", margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "hsl(var(--muted-foreground))", cursor: "pointer" }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const EMPTY_USER = { username: "", email: "", password: "", role: "user", fullName: "", phone: "", isActive: true };

function AddUserForm({ onSubmit, loading }: { onSubmit: (d: any) => void; loading: boolean }) {
  const isMobile = useMobile(768);
  const [form, setForm] = useState(EMPTY_USER);
  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Username *</label>
          <input style={inputStyle} required value={form.username} onChange={(e) => set("username", e.target.value)} placeholder="johndoe" />
        </div>
        <div>
          <label style={labelStyle}>Full Name</label>
          <input style={inputStyle} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} placeholder="John Doe" />
        </div>
      </div>
      <div>
        <label style={labelStyle}>Email</label>
        <input style={inputStyle} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="john@example.com" autoComplete="off" />
      </div>
      <div>
        <label style={labelStyle}>Phone</label>
        <input style={inputStyle} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+1 555 000 0000" />
      </div>
      <div>
        <label style={labelStyle}>Password *</label>
        <input style={inputStyle} type="password" required value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="••••••••" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>Role</label>
          <select style={inputStyle} value={form.role} onChange={(e) => set("role", e.target.value)}>
            <option value="user">User</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Status</label>
          <select style={inputStyle} value={form.isActive ? "active" : "inactive"} onChange={(e) => set("isActive", e.target.value === "active")}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>
      <button type="submit" style={{ ...btnPrimary, justifyContent: "center", marginTop: "0.25rem" }} disabled={loading}>
        {loading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
        {loading ? "Creating..." : "Create User"}
      </button>
    </form>
  );
}

interface RoleWithOrder { role: string; sortOrder: number; }

function UserActionButtons({
  user,
  myRoleOrder,
  roleOrderMap,
  onUpdate,
  onDelete,
  disabled,
}: {
  user: Omit<User, "password"> & { isBanned?: boolean };
  myRoleOrder: number;
  roleOrderMap: Record<string, number>;
  onUpdate: (data: Partial<User & { isBanned: boolean }>) => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const { user: me } = useAuthStore();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const confirmRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!confirmDelete) return;
    const h = (e: MouseEvent) => {
      if (confirmRef.current && !confirmRef.current.contains(e.target as Node)) setConfirmDelete(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [confirmDelete]);

  const isSelf = me?.id === user.id;
  const targetOrder = roleOrderMap[user.role] ?? 0;
  const canAct = !isSelf && myRoleOrder > targetOrder;

  const isBanned = (user as any).isBanned ?? false;

  const actionBtn = (color: string, extra?: React.CSSProperties): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    padding: "4px 9px",
    borderRadius: "5px",
    border: `1px solid ${color}22`,
    background: `${color}12`,
    color: color,
    fontSize: "11px",
    fontWeight: 600,
    cursor: canAct ? "pointer" : "not-allowed",
    opacity: canAct ? 1 : 0.35,
    whiteSpace: "nowrap",
    ...extra,
  });

  if (isSelf) {
    return (
      <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontStyle: "italic" }}>
        (self)
      </span>
    );
  }

  if (!canAct) {
    return (
      <span
        title={`Cannot manage users with equal or higher role (${user.role})`}
        style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", fontStyle: "italic" }}
      >
        Restricted
      </span>
    );
  }

  if (confirmDelete) {
    return (
      <div ref={confirmRef} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <span style={{ fontSize: "11px", color: "hsl(0,72%,62%)", fontWeight: 600 }}>Delete?</span>
        <button
          onClick={() => { onDelete(); setConfirmDelete(false); }}
          disabled={disabled}
          data-testid={`btn-confirm-delete-${user.id}`}
          style={{ ...actionBtn("hsl(0,72%,58%)"), background: "hsl(0,72%,58%)", color: "white", border: "none" }}
        >
          Yes
        </button>
        <button
          onClick={() => setConfirmDelete(false)}
          style={{ ...actionBtn("hsl(var(--muted-foreground))") }}
        >
          No
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
      {/* Ban / Unban */}
      <button
        disabled={disabled}
        onClick={() => onUpdate({ isBanned: !isBanned } as any)}
        data-testid={`btn-${isBanned ? "unban" : "ban"}-${user.id}`}
        title={isBanned ? "Unban this user" : "Ban this user"}
        style={actionBtn(isBanned ? "hsl(142,70%,45%)" : "hsl(0,72%,58%)")}
      >
        {isBanned ? <UserCheck size={11} /> : <Ban size={11} />}
        {isBanned ? "Unban" : "Ban"}
      </button>

      {/* Active / Deactivate */}
      <button
        disabled={disabled}
        onClick={() => onUpdate({ isActive: !user.isActive })}
        data-testid={`btn-${user.isActive ? "deactivate" : "activate"}-${user.id}`}
        title={user.isActive ? "Deactivate this account" : "Activate this account"}
        style={actionBtn(user.isActive ? "hsl(38,92%,50%)" : "hsl(196,100%,50%)")}
      >
        <PowerOff size={11} />
        {user.isActive ? "Deactivate" : "Activate"}
      </button>

      {/* Delete */}
      <button
        disabled={disabled}
        onClick={() => setConfirmDelete(true)}
        data-testid={`btn-delete-${user.id}`}
        title="Permanently delete this user"
        style={actionBtn("hsl(0,72%,58%)")}
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}

export default function Users() {
  const qc = useQueryClient();
  const { user: me } = useAuthStore();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const { data: users = [], isLoading } = useQuery<(Omit<User, "password"> & { isBanned?: boolean })[]>({
    queryKey: ["/api/admin/users"],
    queryFn: () => adminApi.get("/users?limit=200"),
    refetchInterval: 5000,
  });

  const { data: allRoles = [] } = useQuery<RoleWithOrder[]>({
    queryKey: ["/api/admin/role-permissions"],
    queryFn: () => adminApi.get("/role-permissions"),
  });

  const roleOrderMap = useMemo(() => {
    const m: Record<string, number> = {};
    allRoles.forEach((r) => { m[r.role] = r.sortOrder; });
    return m;
  }, [allRoles]);

  const myRoleOrder = me ? (roleOrderMap[me.role] ?? 0) : 0;

  const addMut = useMutation({
    mutationFn: (d: any) => adminApi.post("/users", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); setShowAdd(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User & { isBanned: boolean }> }) =>
      adminApi.patch(`/users/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminApi.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch = !q || (u.username ?? "").toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q) || (u.fullName ?? "").toLowerCase().includes(q);
      const matchRole = !roleFilter || u.role === roleFilter;
      const isBanned = (u as any).isBanned;
      const matchStatus = !statusFilter ||
        (statusFilter === "active" && u.isActive && !isBanned) ||
        (statusFilter === "inactive" && !u.isActive && !isBanned) ||
        (statusFilter === "banned" && isBanned);
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  return (
    <AdminLayout title="User Manager" actions={
      <button style={btnPrimary} onClick={() => setShowAdd(true)} data-testid="button-add-user">
        <Plus size={14} /> Add User
      </button>
    }>

      <div style={card}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search username, email or name..." />
          <FilterSelect value={roleFilter} onChange={setRoleFilter} options={ROLE_OPTIONS} />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>
            {filtered.length} user{filtered.length !== 1 ? "s" : ""}
          </span>
        </Toolbar>

        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: "13px" }}>Loading users...</div>
          ) : filtered.length === 0 ? (
            <EmptyState message={users.length === 0 ? "No users yet. Create the first user." : "No users match your filters."} />
          ) : (
            <table style={{ width: "100%", minWidth: "760px", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["Username", "Full Name", "Email", "Role", "Joined", "Status", "Actions"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const isBanned = (u as any).isBanned;
                  const statusVal = isBanned ? "banned" : (u.isActive ? "active" : "inactive");
                  return (
                    <tr key={u.id}>
                      <td style={{ ...tdStyle, fontWeight: 500, color: "hsl(var(--foreground))" }}>{u.username}</td>
                      <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(220, 10%, 70%)" }}>{u.fullName ?? "—"}</td>
                      <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(220, 10%, 58%)" }}>{u.email ?? "—"}</td>
                      <td style={tdStyle}><StatusBadge value={u.role} /></td>
                      <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>{formatDate(u.createdAt)}</td>
                      <td style={tdStyle}>
                        <StatusBadge value={statusVal} />
                      </td>
                      <td style={{ ...tdStyle, minWidth: "200px" }}>
                        <UserActionButtons
                          user={u}
                          myRoleOrder={myRoleOrder}
                          roleOrderMap={roleOrderMap}
                          onUpdate={(data) => updateMut.mutate({ id: u.id, data })}
                          onDelete={() => deleteMut.mutate(u.id)}
                          disabled={updateMut.isPending || deleteMut.isPending}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showAdd && (
        <Modal title="Add New User" onClose={() => setShowAdd(false)}>
          <AddUserForm onSubmit={(d) => addMut.mutate(d)} loading={addMut.isPending} />
        </Modal>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AdminLayout>
  );
}
