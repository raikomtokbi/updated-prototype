import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Plus, X, Loader2 } from "lucide-react";
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
  { value: "disabled", label: "Disabled" },
];

const ROLE_ORDER = ["user", "staff", "admin", "super_admin"];

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "7px 14px",
  borderRadius: "6px",
  background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
  color: "white",
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
  border: "none",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  background: "hsl(220, 20%, 11%)",
  border: "1px solid hsl(220, 15%, 18%)",
  borderRadius: "6px",
  color: "hsl(210,40%,92%)",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  color: "hsl(220,10%,55%)",
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
      <div style={{ position: "relative", width: "100%", maxWidth: "440px", maxHeight: "85vh", overflowY: "auto", background: "hsl(220,22%,8%)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: "10px", padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "hsl(210,40%,95%)", margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "hsl(220,10%,50%)", cursor: "pointer" }}><X size={16} /></button>
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
        <input style={inputStyle} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="john@example.com" />
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
  const [showAdd, setShowAdd] = useState(false);

  const { data: users = [], isLoading } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/admin/users"],
    queryFn: () => adminApi.get("/users?limit=200"),
  });

  const addMut = useMutation({
    mutationFn: (d: any) => adminApi.post("/users", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); setShowAdd(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      adminApi.patch(`/users/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/users"] }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch = !q || u.username.toLowerCase().includes(q) || (u.email ?? "").toLowerCase().includes(q) || (u.fullName ?? "").toLowerCase().includes(q);
      const matchRole = !roleFilter || u.role === roleFilter;
      const matchStatus = !statusFilter || (statusFilter === "active" ? u.isActive : !u.isActive);
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
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>
            {filtered.length} user{filtered.length !== 1 ? "s" : ""}
          </span>
        </Toolbar>

        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "hsl(220,10%,42%)", fontSize: "13px" }}>Loading users...</div>
          ) : filtered.length === 0 ? (
            <EmptyState message={users.length === 0 ? "No users yet. Create the first user." : "No users match your filters."} />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["ID", "Username", "Full Name", "Email", "Role", "Joined", "Status", "Actions"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td style={{ ...tdStyle, fontSize: "11px", fontFamily: "monospace", color: "hsl(196,100%,55%)", letterSpacing: "0.05em" }}>{u.id}</td>
                    <td style={{ ...tdStyle, fontWeight: 500, color: "hsl(210, 40%, 95%)" }}>{u.username}</td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(220, 10%, 70%)" }}>{u.fullName ?? "—"}</td>
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

      {showAdd && (
        <Modal title="Add New User" onClose={() => setShowAdd(false)}>
          <AddUserForm onSubmit={(d) => addMut.mutate(d)} loading={addMut.isPending} />
        </Modal>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AdminLayout>
  );
}
