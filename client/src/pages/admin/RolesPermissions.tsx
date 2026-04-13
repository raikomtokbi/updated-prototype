import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield, Plus, Trash2, Save, ChevronDown, ChevronRight,
  Lock, LayoutDashboard, BarChart2, ShoppingCart, Tag, CreditCard,
  RotateCcw, Mail, LifeBuoy, Gamepad2, Package, Ticket,
  RefreshCcw, Users, UserCheck, Megaphone, BadgePercent,
  Settings, Wallet, Plug, Palette, FileEdit, Key, X, Check,
  GripVertical,
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import {
  card, btnPrimary, btnDanger, btnNeutral, inputStyle as sharedInput, Modal,
  SearchInput,
} from "@/components/admin/shared";

// ── Permission definitions ────────────────────────────────────────────────────
const PERMISSION_GROUPS = [
  {
    group: "Overview",
    permissions: [
      { key: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
      { key: "analytics", label: "Analytics", Icon: BarChart2 },
    ],
  },
  {
    group: "Orders",
    permissions: [
      { key: "topup_orders", label: "Top-up orders", Icon: ShoppingCart },
      { key: "voucher_orders", label: "Voucher orders", Icon: Tag },
    ],
  },
  {
    group: "Transactions",
    permissions: [
      { key: "payments", label: "Payment", Icon: CreditCard },
      { key: "refunds", label: "Refund", Icon: RotateCcw },
    ],
  },
  {
    group: "Support",
    permissions: [
      { key: "contact_submissions", label: "Contact submissions", Icon: Mail },
      { key: "support_tickets", label: "Support tickets", Icon: LifeBuoy },
    ],
  },
  {
    group: "Products",
    permissions: [
      { key: "games", label: "Games", Icon: Gamepad2 },
      { key: "gift_cards", label: "Gift cards", Icon: Package },
      { key: "vouchers", label: "Vouchers", Icon: Ticket },
      { key: "subscriptions", label: "Subscriptions", Icon: RefreshCcw },
    ],
  },
  {
    group: "Users",
    permissions: [
      { key: "users", label: "Users", Icon: Users },
      { key: "subscribers", label: "Subscribers", Icon: UserCheck },
    ],
  },
  {
    group: "Marketing",
    permissions: [
      { key: "campaigns", label: "Campaigns", Icon: Megaphone },
      { key: "coupons", label: "Coupons", Icon: BadgePercent },
    ],
  },
  {
    group: "Settings",
    permissions: [
      { key: "control_panel", label: "Control panel", Icon: Settings },
      { key: "payment_method", label: "Payment method", Icon: Wallet },
      { key: "api_integration", label: "API integration", Icon: Plug },
      { key: "plugins", label: "Plugins", Icon: Package },
      { key: "email_templates", label: "Email templates", Icon: Mail },
    ],
  },
  {
    group: "Appearance",
    permissions: [
      { key: "theme", label: "Theme", Icon: Palette },
      { key: "content", label: "Content", Icon: FileEdit },
    ],
  },
  {
    group: "Admin Access",
    permissions: [
      { key: "roles_permissions", label: "Roles & Permissions", Icon: Key },
    ],
  },
];

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));

interface RoleRow {
  id: string;
  role: string;
  label: string;
  isSystem: boolean;
  permissions: string[];
  sortOrder: number;
}

// ── Mini toggle switch ────────────────────────────────────────────────────────
function Toggle({ on, disabled }: { on: boolean; disabled?: boolean }) {
  return (
    <div
      style={{
        width: "34px", height: "18px", borderRadius: "9px", flexShrink: 0,
        background: on ? "hsl(var(--primary))" : "hsl(var(--muted))",
        position: "relative", transition: "background 0.2s",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div
        style={{
          position: "absolute", top: "2px",
          left: on ? "17px" : "2px",
          width: "14px", height: "14px", borderRadius: "50%",
          background: "white", transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
        }}
      />
    </div>
  );
}

// ── RoleCard ─────────────────────────────────────────────────────────────────
function RoleCard({
  row, onSave, onDelete, saving,
  isDragOver, dragHandleProps,
}: {
  row: RoleRow;
  onSave: (role: string, label: string, permissions: string[]) => void;
  onDelete: (role: string) => void;
  saving: boolean;
  isDragOver: boolean;
  dragHandleProps: React.HTMLAttributes<HTMLDivElement>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [perms, setPerms] = useState<Set<string>>(new Set(row.permissions));
  const [label, setLabel] = useState(row.label);
  const [dirty, setDirty] = useState(false);

  const isSuperAdmin = row.role === "super_admin";

  const toggle = (key: string) => {
    if (isSuperAdmin) return;
    setPerms(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    setDirty(true);
  };

  const toggleGroup = (keys: string[]) => {
    if (isSuperAdmin) return;
    const allOn = keys.every(k => perms.has(k));
    setPerms(prev => {
      const next = new Set(prev);
      if (allOn) keys.forEach(k => next.delete(k));
      else keys.forEach(k => next.add(k));
      return next;
    });
    setDirty(true);
  };

  const toggleAll = () => {
    if (isSuperAdmin) return;
    const allOn = ALL_PERMISSION_KEYS.every(k => perms.has(k));
    setPerms(new Set(allOn ? [] : ALL_PERMISSION_KEYS));
    setDirty(true);
  };

  const handleSave = () => {
    onSave(row.role, label, Array.from(perms));
    setDirty(false);
  };

  const grantedCount = isSuperAdmin ? ALL_PERMISSION_KEYS.length : perms.size;

  return (
    <div
      style={{
        ...card,
        marginBottom: "10px",
        overflow: "hidden",
        padding: 0,
        outline: isDragOver ? "2px dashed hsl(var(--primary) / 0.6)" : "2px solid transparent",
        transition: "outline-color 0.15s",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex", alignItems: "center",
        }}
      >
        {/* Drag handle — separate from expand click */}
        <div
          {...dragHandleProps}
          title="Drag to reorder"
          data-testid={`drag-handle-${row.role}`}
          style={{
            padding: "0 4px 0 12px",
            alignSelf: "stretch",
            display: "flex",
            alignItems: "center",
            cursor: "grab",
            color: "hsl(var(--muted-foreground) / 0.5)",
            flexShrink: 0,
          }}
          onClick={e => e.stopPropagation()}
        >
          <GripVertical size={14} />
        </div>

        {/* Expand / collapse area */}
        <div
          onClick={() => setExpanded(e => !e)}
          data-testid={`role-card-${row.role}`}
          style={{
            flex: 1,
            display: "flex", alignItems: "center", gap: "12px",
            padding: "13px 16px 13px 8px", cursor: "pointer", userSelect: "none",
          }}
        >
          <div
            style={{
              width: "36px", height: "36px", borderRadius: "8px", flexShrink: 0,
              background: isSuperAdmin ? "hsl(var(--primary) / 0.15)" : "hsl(var(--muted) / 0.5)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {isSuperAdmin
              ? <Lock size={15} style={{ color: "hsl(var(--primary))" }} />
              : <Shield size={15} style={{ color: "hsl(var(--muted-foreground))" }} />
            }
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: "13px", color: "hsl(var(--foreground))" }}>
              {row.label}
            </div>
            <div style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginTop: "1px" }}>
              <code style={{ fontSize: "10px", background: "hsl(var(--muted) / 0.5)", padding: "1px 4px", borderRadius: "3px" }}>{row.role}</code>
              {"  ·  "}
              {isSuperAdmin ? "Full access" : `${grantedCount} / ${ALL_PERMISSION_KEYS.length} permissions granted`}
            </div>
          </div>

          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
            {row.isSystem && (
              <span style={{
                fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "10px",
                background: "hsl(var(--muted) / 0.8)", color: "hsl(var(--muted-foreground))",
                letterSpacing: "0.04em",
              }}>SYSTEM</span>
            )}
            {dirty && (
              <span style={{
                fontSize: "10px", fontWeight: 600, padding: "2px 7px", borderRadius: "10px",
                background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))",
              }}>UNSAVED</span>
            )}
            {expanded
              ? <ChevronDown size={14} style={{ color: "hsl(var(--muted-foreground))" }} />
              : <ChevronRight size={14} style={{ color: "hsl(var(--muted-foreground))" }} />
            }
          </div>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div style={{ borderTop: "1px solid hsl(var(--border) / 0.5)", padding: "16px" }}>

          {/* Label edit */}
          <div style={{ marginBottom: "14px" }}>
            <label style={{ fontSize: "11px", fontWeight: 600, color: "hsl(var(--muted-foreground))", display: "block", marginBottom: "5px", letterSpacing: "0.04em" }}>
              DISPLAY NAME
            </label>
            <input
              value={label}
              disabled={isSuperAdmin}
              onChange={e => { setLabel(e.target.value); setDirty(true); }}
              style={{ ...sharedInput, maxWidth: "280px", fontSize: "12px" }}
              data-testid={`input-role-label-${row.role}`}
            />
          </div>

          {/* Bulk controls */}
          {!isSuperAdmin && (
            <div style={{ marginBottom: "12px", display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                onClick={toggleAll}
                data-testid={`toggle-all-${row.role}`}
                style={{ ...btnNeutral, fontSize: "11px", padding: "4px 10px" }}
              >
                {ALL_PERMISSION_KEYS.every(k => perms.has(k)) ? "Deselect all" : "Select all"}
              </button>
              <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>
                Click a permission row to toggle access
              </span>
            </div>
          )}

          {/* Permission groups grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px", marginBottom: "16px" }}>
            {PERMISSION_GROUPS.map(group => {
              const groupKeys = group.permissions.map(p => p.key);
              const groupAllOn = isSuperAdmin || groupKeys.every(k => perms.has(k));

              return (
                <div
                  key={group.group}
                  style={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border) / 0.7)",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "7px 10px", borderBottom: "1px solid hsl(var(--border) / 0.5)",
                    background: groupAllOn ? "hsl(var(--primary) / 0.06)" : "hsl(var(--muted) / 0.3)",
                  }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em", color: "hsl(var(--foreground))" }}>
                      {group.group.toUpperCase()}
                    </span>
                    {!isSuperAdmin && (
                      <button
                        onClick={() => toggleGroup(groupKeys)}
                        data-testid={`toggle-group-${row.role}-${group.group}`}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", color: "hsl(var(--primary))", fontWeight: 600 }}
                      >
                        {groupAllOn ? "Remove all" : "Grant all"}
                      </button>
                    )}
                  </div>

                  {group.permissions.map((perm, idx) => {
                    const granted = isSuperAdmin || perms.has(perm.key);
                    const { Icon } = perm;
                    return (
                      <div
                        key={perm.key}
                        onClick={() => toggle(perm.key)}
                        data-testid={`perm-${row.role}-${perm.key}`}
                        style={{
                          display: "flex", alignItems: "center", gap: "9px",
                          padding: "8px 10px",
                          cursor: isSuperAdmin ? "default" : "pointer",
                          background: granted ? "hsl(var(--primary) / 0.04)" : "transparent",
                          borderBottom: idx < group.permissions.length - 1 ? "1px solid hsl(var(--border) / 0.3)" : "none",
                          transition: "background 0.12s",
                        }}
                      >
                        <Icon size={12} style={{ color: granted ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))", flexShrink: 0 }} />
                        <span style={{ fontSize: "12px", flex: 1, color: granted ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}>
                          {perm.label}
                        </span>
                        <Toggle on={granted} disabled={isSuperAdmin} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Footer actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
            {!row.isSystem ? (
              <button
                onClick={() => onDelete(row.role)}
                data-testid={`btn-delete-role-${row.role}`}
                style={{ ...btnDanger, fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}
              >
                <Trash2 size={12} /> Delete role
              </button>
            ) : <div />}

            {!isSuperAdmin && (
              <button
                onClick={handleSave}
                disabled={!dirty || saving}
                data-testid={`btn-save-role-${row.role}`}
                style={{
                  ...btnPrimary, fontSize: "12px",
                  display: "flex", alignItems: "center", gap: "5px",
                  opacity: (!dirty || saving) ? 0.6 : 1,
                  cursor: (!dirty || saving) ? "not-allowed" : "pointer",
                }}
              >
                <Save size={12} /> Save changes
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RolesPermissions() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // Drag state
  const [orderedRoles, setOrderedRoles] = useState<RoleRow[]>([]);
  const [hierarchyDirty, setHierarchyDirty] = useState(false);
  const [dragOverRole, setDragOverRole] = useState<string | null>(null);
  const dragIdx = useRef<number | null>(null);

  const { data: roles = [], isLoading } = useQuery<RoleRow[]>({
    queryKey: ["/api/admin/role-permissions"],
    queryFn: () => adminApi.get("/role-permissions") as Promise<RoleRow[]>,
  });

  // Sync ordered list when server data arrives (only if not dirty)
  const prevRoleKey = useRef("");
  const roleKey = roles.map(r => r.role + r.sortOrder).join(",");
  if (!hierarchyDirty && prevRoleKey.current !== roleKey) {
    prevRoleKey.current = roleKey;
    const sorted = [...roles].sort((a, b) => b.sortOrder - a.sortOrder);
    setOrderedRoles(sorted);
  }

  const showMsg = (text: string, ok = true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  };

  const saveMutation = useMutation({
    mutationFn: ({ role, label, permissions }: { role: string; label: string; permissions: string[] }) =>
      adminApi.post("/role-permissions", { role, label, permissions }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/role-permissions"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/my-permissions"] });
      showMsg("Role permissions saved.");
    },
    onError: (e: any) => showMsg(e.message ?? "Failed to save.", false),
  });

  const deleteMutation = useMutation({
    mutationFn: (role: string) => adminApi.delete(`/role-permissions/${role}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/role-permissions"] });
      showMsg("Role deleted.");
    },
    onError: (e: any) => showMsg(e.message ?? "Failed to delete.", false),
  });

  const addMutation = useMutation({
    mutationFn: ({ role, label }: { role: string; label: string }) =>
      adminApi.post("/role-permissions", { role, label, permissions: [] }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/role-permissions"] });
      showMsg("Role created. You can now configure its permissions.");
      setAddOpen(false);
      setNewLabel("");
      setNewSlug("");
    },
    onError: (e: any) => showMsg(e.message ?? "Failed to create.", false),
  });

  const orderMutation = useMutation({
    mutationFn: (orders: { role: string; sortOrder: number }[]) =>
      adminApi.post("/role-permissions/order", { orders }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/role-permissions"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/my-permissions"] });
      setHierarchyDirty(false);
      showMsg("Hierarchy saved.");
    },
    onError: (e: any) => showMsg(e.message ?? "Failed to save hierarchy.", false),
  });

  const handleLabelChange = (val: string) => {
    setNewLabel(val);
    setNewSlug(val.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
  };

  // Drag handlers
  const handleDragStart = (idx: number) => {
    dragIdx.current = idx;
  };

  const handleDragOver = (e: React.DragEvent, role: string, toIdx: number) => {
    e.preventDefault();
    setDragOverRole(role);
    const from = dragIdx.current;
    if (from === null || from === toIdx) return;
    setOrderedRoles(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    dragIdx.current = toIdx;
    setHierarchyDirty(true);
  };

  const handleDragEnd = () => {
    setDragOverRole(null);
    dragIdx.current = null;
  };

  const handleSaveHierarchy = () => {
    const total = orderedRoles.length;
    const orders = orderedRoles.map((r, i) => ({ role: r.role, sortOrder: total - i }));
    orderMutation.mutate(orders);
  };

  // Displayed list — apply search filter but keep drag order
  const filtered = useMemo(() => {
    if (!search.trim()) return orderedRoles;
    const q = search.toLowerCase();
    return orderedRoles.filter(r => r.label.toLowerCase().includes(q) || r.role.toLowerCase().includes(q));
  }, [orderedRoles, search]);

  return (
    <AdminLayout>
      <div style={{ padding: "24px", maxWidth: "1050px", margin: "0 auto" }}>

        {/* Toast notification */}
        {msg && (
          <div style={{
            position: "fixed", bottom: "24px", right: "24px", zIndex: 9999,
            background: msg.ok ? "hsl(142 70% 38%)" : "hsl(0 72% 50%)",
            color: "white", borderRadius: "8px", padding: "10px 16px",
            fontSize: "13px", fontWeight: 500, display: "flex", alignItems: "center", gap: "8px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
          }}>
            {msg.ok ? <Check size={14} /> : <X size={14} />}
            {msg.text}
          </div>
        )}

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <h1 className="font-orbitron" style={{ fontSize: "18px", fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: "4px" }}>
              Roles &amp; Permissions
            </h1>
            <p style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>
              Control what each role can access. Drag cards to set hierarchy — higher position = more authority.
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {hierarchyDirty && (
              <button
                onClick={handleSaveHierarchy}
                disabled={orderMutation.isPending}
                data-testid="btn-save-hierarchy"
                style={{
                  ...btnPrimary, fontSize: "12px",
                  display: "flex", alignItems: "center", gap: "5px",
                  opacity: orderMutation.isPending ? 0.6 : 1,
                }}
              >
                <Save size={12} /> Save hierarchy
              </button>
            )}
            <button
              onClick={() => setAddOpen(true)}
              data-testid="btn-add-role"
              style={{ ...btnPrimary, display: "flex", alignItems: "center", gap: "6px", fontSize: "12px" }}
            >
              <Plus size={13} /> Add role
            </button>
          </div>
        </div>

        {/* Summary stats */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "18px", flexWrap: "wrap" }}>
          {[
            { label: "Total roles", value: roles.length, color: "hsl(var(--primary))" },
            { label: "System roles", value: roles.filter(r => r.isSystem).length, color: "hsl(var(--muted-foreground))" },
            { label: "Custom roles", value: roles.filter(r => !r.isSystem).length, color: "hsl(39 100% 55%)" },
            { label: "Permission types", value: ALL_PERMISSION_KEYS.length, color: "hsl(142 70% 45%)" },
          ].map(stat => (
            <div key={stat.label} style={{ ...card, padding: "10px 16px", minWidth: "120px" }}>
              <div style={{ fontSize: "22px", fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))", marginTop: "2px" }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ marginBottom: "14px" }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search roles..." />
        </div>

        {/* Roles list — draggable */}
        {isLoading ? (
          <div style={{ textAlign: "center", padding: "48px", color: "hsl(var(--muted-foreground))", fontSize: "13px" }}>
            Loading roles...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px", color: "hsl(var(--muted-foreground))", fontSize: "13px" }}>
            No roles found.
          </div>
        ) : (
          <div>
            {filtered.map((row, idx) => (
              <div
                key={row.role}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, row.role, idx)}
                onDragEnd={handleDragEnd}
                style={{ userSelect: "none" }}
              >
                <RoleCard
                  row={row}
                  onSave={(role, label, permissions) => saveMutation.mutate({ role, label, permissions })}
                  onDelete={(role) => deleteMutation.mutate(role)}
                  saving={saveMutation.isPending}
                  isDragOver={dragOverRole === row.role}
                  dragHandleProps={{}}
                />
              </div>
            ))}
          </div>
        )}

        {/* Add role modal */}
        {addOpen && (
          <Modal title="Add new role" onClose={() => { setAddOpen(false); setNewLabel(""); setNewSlug(""); }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "hsl(var(--muted-foreground))", display: "block", marginBottom: "5px", letterSpacing: "0.04em" }}>
                  DISPLAY NAME
                </label>
                <input
                  autoFocus
                  placeholder="e.g. Moderator"
                  value={newLabel}
                  onChange={e => handleLabelChange(e.target.value)}
                  style={{ ...sharedInput, width: "100%", fontSize: "13px" }}
                  data-testid="input-new-role-label"
                />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 600, color: "hsl(var(--muted-foreground))", display: "block", marginBottom: "5px", letterSpacing: "0.04em" }}>
                  ROLE SLUG
                </label>
                <input
                  placeholder="e.g. moderator"
                  value={newSlug}
                  onChange={e => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  style={{ ...sharedInput, width: "100%", fontSize: "13px" }}
                  data-testid="input-new-role-slug"
                />
                <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginTop: "4px" }}>
                  Auto-generated from name. Lowercase letters, numbers, underscores only.
                </p>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
                <button
                  onClick={() => { setAddOpen(false); setNewLabel(""); setNewSlug(""); }}
                  style={{ ...btnNeutral, fontSize: "12px" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => newLabel.trim() && newSlug.trim() && addMutation.mutate({ role: newSlug, label: newLabel.trim() })}
                  disabled={!newLabel.trim() || !newSlug.trim() || addMutation.isPending}
                  data-testid="btn-confirm-add-role"
                  style={{
                    ...btnPrimary, fontSize: "12px",
                    display: "flex", alignItems: "center", gap: "5px",
                    opacity: (!newLabel.trim() || !newSlug.trim()) ? 0.5 : 1,
                  }}
                >
                  <Plus size={12} /> Create role
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AdminLayout>
  );
}
