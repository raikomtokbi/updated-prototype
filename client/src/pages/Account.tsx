import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  User, LogOut, ShoppingBag, Shield, Lock, ChevronRight,
  Package, Settings, Eye, EyeOff, Check, X, Loader2,
  Calendar, Hash, Clock
} from "lucide-react";
import { useAuthStore } from "@/lib/store/authstore";
import { useCartStore } from "@/lib/store/cartStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type Tab = "info" | "orders" | "security";

function formatDate(dateStr: string | Date | null | undefined) {
  if (!dateStr) return "—";
  const d = new Date(dateStr as string);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatCurrency(amount: string | number | null | undefined, currency = "USD") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: "hsla(40,90%,55%,0.12)", text: "hsl(40,90%,60%)", dot: "hsl(40,90%,60%)" },
  processing: { bg: "hsla(196,100%,50%,0.12)", text: "hsl(196,100%,55%)", dot: "hsl(196,100%,55%)" },
  completed: { bg: "hsla(145,70%,50%,0.12)", text: "hsl(145,70%,55%)", dot: "hsl(145,70%,55%)" },
  cancelled: { bg: "hsla(0,72%,55%,0.12)", text: "hsl(0,72%,60%)", dot: "hsl(0,72%,60%)" },
  refunded: { bg: "hsla(258,90%,66%,0.12)", text: "hsl(258,90%,70%)", dot: "hsl(258,90%,70%)" },
};

// ── Not-logged-in screen ──────────────────────────────────────────────────────
function NotLoggedIn() {
  return (
    <div style={{ maxWidth: "480px", margin: "0 auto", padding: "6rem 1.5rem", textAlign: "center" }}>
      <div style={{
        width: "72px", height: "72px", borderRadius: "50%",
        background: "hsla(258,90%,66%,0.1)", border: "1px solid hsla(258,90%,66%,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem",
      }}>
        <User size={32} style={{ color: "hsl(258,90%,66%)" }} />
      </div>
      <h2 className="font-orbitron" style={{ fontSize: "1.5rem", fontWeight: 700, color: "hsl(210,40%,92%)", marginBottom: "0.75rem" }}>
        Not Signed In
      </h2>
      <p style={{ fontSize: "0.875rem", color: "hsl(220,10%,50%)", marginBottom: "2rem", lineHeight: 1.6 }}>
        Sign in to manage your account, view orders and update your security settings.
      </p>
      <Link href="/login" className="btn-primary" data-testid="link-sign-in">
        Sign In to Your Account
      </Link>
    </div>
  );
}

// ── Account Info Tab ──────────────────────────────────────────────────────────
function AccountInfoTab({ user, setUser }: { user: any; setUser: (u: any) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: user.fullName ?? "",
    email: user.email ?? "",
    phone: "",
  });
  const { toast } = useToast();
  const qc = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data, {
        "X-Username": user.username,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setUser(data.user);
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["/api/user/orders"] });
      toast({ title: "Profile updated", description: "Your account info has been saved." });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  const fields = [
    { key: "username", label: "Username", value: user.username, editable: false },
    { key: "fullName", label: "Full Name", value: user.fullName || "—", editable: true, placeholder: "Enter your full name" },
    { key: "email", label: "Email Address", value: user.email || "—", editable: true, placeholder: "Enter your email" },
    { key: "phone", label: "Phone Number", value: (form.phone || "—"), editable: true, placeholder: "+1 (555) 000-0000" },
  ];

  const ROLE_LABELS: Record<string, { label: string; color: string }> = {
    super_admin: { label: "Super Admin", color: "hsl(0,72%,65%)" },
    admin: { label: "Admin", color: "hsl(258,90%,70%)" },
    staff: { label: "Staff", color: "hsl(196,100%,55%)" },
    user: { label: "Member", color: "hsl(145,70%,55%)" },
  };
  const roleInfo = ROLE_LABELS[user.role] ?? { label: user.role, color: "hsl(220,10%,60%)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Edit form */}
      {editing && (
        <div style={{
          background: "hsl(220,20%,9%)", border: "1px solid hsla(258,90%,66%,0.25)",
          borderRadius: "0.75rem", padding: "1.5rem",
        }}>
          <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "hsl(220,10%,55%)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.25rem" }}>
            Edit Profile
          </h3>
          <div style={{ display: "grid", gap: "1rem" }}>
            {[
              { key: "fullName", label: "Full Name", placeholder: "John Doe" },
              { key: "email", label: "Email Address", placeholder: "you@example.com", type: "email" },
              { key: "phone", label: "Phone Number", placeholder: "+1 (555) 000-0000", type: "tel" },
            ].map(({ key, label, placeholder, type = "text" }) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220,10%,55%)", marginBottom: "0.4rem" }}>
                  {label}
                </label>
                <input
                  type={type}
                  value={(form as any)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  data-testid={`input-${key}`}
                  style={{
                    width: "100%", background: "hsl(220,20%,7%)", border: "1px solid hsl(220,15%,18%)",
                    borderRadius: "0.5rem", padding: "0.6rem 0.9rem", fontSize: "0.875rem",
                    color: "hsl(210,40%,90%)", outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.25rem" }}>
            <button
              onClick={() => updateMutation.mutate(form)}
              disabled={updateMutation.isPending}
              className="btn-primary"
              style={{ fontSize: "0.85rem" }}
              data-testid="button-save-profile"
            >
              {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save Changes
            </button>
            <button onClick={() => setEditing(false)} className="btn-secondary" style={{ fontSize: "0.85rem" }} data-testid="button-cancel-edit">
              <X size={14} />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Info fields */}
      <div style={{ background: "hsl(220,20%,9%)", border: "1px solid hsl(220,15%,16%)", borderRadius: "0.75rem", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid hsl(220,15%,14%)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "hsl(220,10%,55%)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Account Details
          </h3>
          <button
            onClick={() => { setEditing(!editing); if (!editing) setForm({ fullName: user.fullName ?? "", email: user.email ?? "", phone: "" }); }}
            className="btn-secondary"
            style={{ fontSize: "0.75rem" }}
            data-testid="button-edit-profile"
          >
            <Settings size={13} />
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>
        {fields.map(({ key, label, value }) => (
          <div key={key} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "0.9rem 1.5rem", borderBottom: "1px solid hsl(220,15%,12%)", gap: "1rem", flexWrap: "wrap",
          }}>
            <span style={{ fontSize: "0.82rem", color: "hsl(220,10%,50%)", minWidth: "120px" }}>{label}</span>
            <span style={{ fontSize: "0.875rem", color: "hsl(210,40%,85%)", fontWeight: 500, wordBreak: "break-all" }}
              data-testid={`text-${key}`}>
              {value}
            </span>
          </div>
        ))}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "0.9rem 1.5rem", gap: "1rem", flexWrap: "wrap",
        }}>
          <span style={{ fontSize: "0.82rem", color: "hsl(220,10%,50%)", minWidth: "120px" }}>Account Status</span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.875rem", color: "hsl(145,70%,55%)", fontWeight: 500 }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "hsl(145,70%,55%)", flexShrink: 0 }} />
            Active
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Orders Tab ────────────────────────────────────────────────────────────────
function OrdersTab({ user }: { user: any }) {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery<any[]>({
    queryKey: ["/api/user/orders"],
    queryFn: async () => {
      const res = await fetch("/api/user/orders", {
        headers: { "X-Username": user.username },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load orders");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{
            background: "hsl(220,20%,9%)", border: "1px solid hsl(220,15%,16%)",
            borderRadius: "0.75rem", padding: "1.25rem",
            animation: "pulse 1.5s ease-in-out infinite",
            height: "90px",
          }} />
        ))}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div style={{
        background: "hsl(220,20%,9%)", border: "1px solid hsl(220,15%,16%)",
        borderRadius: "0.75rem", padding: "4rem 2rem", textAlign: "center",
      }}>
        <div style={{
          width: "56px", height: "56px", borderRadius: "50%",
          background: "hsla(258,90%,66%,0.08)", border: "1px solid hsla(258,90%,66%,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem",
        }}>
          <Package size={24} style={{ color: "hsl(258,90%,66%)" }} />
        </div>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "hsl(210,40%,85%)", marginBottom: "0.5rem" }}>No orders yet</h3>
        <p style={{ fontSize: "0.85rem", color: "hsl(220,10%,45%)", marginBottom: "1.5rem" }}>
          Your order history will appear here once you make a purchase.
        </p>
        <Link href="/products" className="btn-primary" style={{ fontSize: "0.85rem" }} data-testid="link-browse-products">
          <ShoppingBag size={14} />
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
        <span style={{ fontSize: "0.82rem", color: "hsl(220,10%,50%)" }}>
          {orders.length} order{orders.length !== 1 ? "s" : ""} total
        </span>
      </div>
      {orders.map((order) => {
        const sc = STATUS_COLORS[order.status] ?? STATUS_COLORS.pending;
        const isExpanded = expandedOrder === order.id;
        return (
          <div key={order.id} style={{
            background: "hsl(220,20%,9%)", border: "1px solid hsl(220,15%,16%)",
            borderRadius: "0.75rem", overflow: "hidden",
          }} data-testid={`card-order-${order.id}`}>
            <button
              onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: "1rem",
                padding: "1rem 1.25rem", background: "none", border: "none", cursor: "pointer",
                textAlign: "left", flexWrap: "wrap",
              }}
              data-testid={`button-order-expand-${order.id}`}
            >
              <div style={{
                width: "36px", height: "36px", borderRadius: "0.5rem", flexShrink: 0,
                background: sc.bg, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Package size={16} style={{ color: sc.text }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(210,40%,90%)" }}>
                    #{order.orderNumber}
                  </span>
                  <span style={{
                    fontSize: "0.7rem", fontWeight: 600, padding: "0.15rem 0.5rem", borderRadius: "99px",
                    background: sc.bg, color: sc.text, textTransform: "capitalize",
                  }}>
                    {order.status}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.75rem", color: "hsl(220,10%,50%)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Calendar size={11} /> {formatDate(order.createdAt)}
                  </span>
                  {order.items?.length > 0 && (
                    <span style={{ fontSize: "0.75rem", color: "hsl(220,10%,50%)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Hash size={11} /> {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div className="font-orbitron" style={{ fontSize: "1rem", fontWeight: 700, color: "hsl(210,40%,92%)" }}>
                  {formatCurrency(order.totalAmount, order.currency)}
                </div>
                <ChevronRight size={14} style={{
                  color: "hsl(220,10%,40%)", marginTop: "0.25rem", float: "right",
                  transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s",
                }} />
              </div>
            </button>

            {isExpanded && order.items && order.items.length > 0 && (
              <div style={{ borderTop: "1px solid hsl(220,15%,14%)", padding: "0.75rem 1.25rem 1rem" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "hsl(220,10%,45%)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                  Order Items
                </div>
                {order.items.map((item: any) => (
                  <div key={item.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "0.6rem 0", borderBottom: "1px solid hsl(220,15%,12%)", gap: "0.5rem", flexWrap: "wrap",
                  }} data-testid={`row-order-item-${item.id}`}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 500, color: "hsl(210,40%,85%)" }}>{item.productTitle}</div>
                      {item.packageLabel && (
                        <div style={{ fontSize: "0.75rem", color: "hsl(220,10%,50%)" }}>{item.packageLabel} × {item.quantity}</div>
                      )}
                    </div>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(210,40%,90%)", flexShrink: 0 }}>
                      {formatCurrency(item.totalPrice)}
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.75rem" }}>
                  <span style={{ fontSize: "0.8rem", color: "hsl(220,10%,45%)" }}>Order Total</span>
                  <span className="font-orbitron" style={{ fontSize: "1rem", fontWeight: 700, color: "hsl(258,90%,70%)" }}>
                    {formatCurrency(order.totalAmount, order.currency)}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Security Tab ─────────────────────────────────────────────────────────────
function SecurityTab({ user }: { user: any }) {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const { toast } = useToast();

  const changeMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("POST", "/api/user/change-password", data, {
        "X-Username": user.username,
      });
      return res.json();
    },
    onSuccess: () => {
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({ title: "Password changed", description: "Your password has been updated successfully." });
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast({ title: "Passwords don't match", description: "New password and confirmation must match.", variant: "destructive" });
      return;
    }
    if (form.newPassword.length < 6) {
      toast({ title: "Password too short", description: "New password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    changeMutation.mutate({ currentPassword: form.currentPassword, newPassword: form.newPassword });
  }

  const passwordStrength = (pwd: string) => {
    if (!pwd) return null;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { label: "Weak", color: "hsl(0,72%,60%)", width: "25%" };
    if (score === 2) return { label: "Fair", color: "hsl(40,90%,60%)", width: "50%" };
    if (score === 3) return { label: "Good", color: "hsl(196,100%,55%)", width: "75%" };
    return { label: "Strong", color: "hsl(145,70%,55%)", width: "100%" };
  };

  const strength = passwordStrength(form.newPassword);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Security overview */}
      <div style={{
        background: "hsl(220,20%,9%)", border: "1px solid hsl(220,15%,16%)",
        borderRadius: "0.75rem", padding: "1.25rem",
        display: "flex", alignItems: "center", gap: "1rem",
      }}>
        <div style={{
          width: "44px", height: "44px", borderRadius: "0.5rem", flexShrink: 0,
          background: "hsla(145,70%,55%,0.1)", border: "1px solid hsla(145,70%,55%,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Shield size={20} style={{ color: "hsl(145,70%,55%)" }} />
        </div>
        <div>
          <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(210,40%,90%)", marginBottom: "0.2rem" }}>Account Security</div>
          <div style={{ fontSize: "0.8rem", color: "hsl(220,10%,50%)" }}>
            Manage your password to keep your account safe.
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div style={{ background: "hsl(220,20%,9%)", border: "1px solid hsl(220,15%,16%)", borderRadius: "0.75rem", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid hsl(220,15%,14%)" }}>
          <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "hsl(220,10%,55%)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Change Password
          </h3>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Current password */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220,10%,55%)", marginBottom: "0.4rem" }}>
              Current Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showCurrent ? "text" : "password"}
                value={form.currentPassword}
                onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
                placeholder="Enter current password"
                required
                autoComplete="current-password"
                data-testid="input-current-password"
                style={{
                  width: "100%", background: "hsl(220,20%,7%)", border: "1px solid hsl(220,15%,18%)",
                  borderRadius: "0.5rem", padding: "0.6rem 2.5rem 0.6rem 0.9rem",
                  fontSize: "0.875rem", color: "hsl(210,40%,90%)", outline: "none", boxSizing: "border-box",
                }}
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} style={{
                position: "absolute", right: "0.7rem", top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", color: "hsl(220,10%,45%)", padding: "0.2rem",
              }} data-testid="button-toggle-current-password">
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220,10%,55%)", marginBottom: "0.4rem" }}>
              New Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showNew ? "text" : "password"}
                value={form.newPassword}
                onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                placeholder="Enter new password"
                required
                autoComplete="new-password"
                data-testid="input-new-password"
                style={{
                  width: "100%", background: "hsl(220,20%,7%)", border: "1px solid hsl(220,15%,18%)",
                  borderRadius: "0.5rem", padding: "0.6rem 2.5rem 0.6rem 0.9rem",
                  fontSize: "0.875rem", color: "hsl(210,40%,90%)", outline: "none", boxSizing: "border-box",
                }}
              />
              <button type="button" onClick={() => setShowNew(!showNew)} style={{
                position: "absolute", right: "0.7rem", top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", color: "hsl(220,10%,45%)", padding: "0.2rem",
              }} data-testid="button-toggle-new-password">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {/* Strength meter */}
            {strength && (
              <div style={{ marginTop: "0.5rem" }}>
                <div style={{ height: "3px", background: "hsl(220,15%,18%)", borderRadius: "99px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: strength.width, background: strength.color,
                    transition: "width 0.3s, background 0.3s", borderRadius: "99px",
                  }} />
                </div>
                <div style={{ fontSize: "0.72rem", color: strength.color, marginTop: "0.3rem" }}>
                  Strength: {strength.label}
                </div>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220,10%,55%)", marginBottom: "0.4rem" }}>
              Confirm New Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showConfirm ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="Confirm new password"
                required
                autoComplete="new-password"
                data-testid="input-confirm-password"
                style={{
                  width: "100%", background: "hsl(220,20%,7%)",
                  border: `1px solid ${form.confirmPassword && form.confirmPassword !== form.newPassword ? "hsla(0,72%,55%,0.5)" : "hsl(220,15%,18%)"}`,
                  borderRadius: "0.5rem", padding: "0.6rem 2.5rem 0.6rem 0.9rem",
                  fontSize: "0.875rem", color: "hsl(210,40%,90%)", outline: "none", boxSizing: "border-box",
                }}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{
                position: "absolute", right: "0.7rem", top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", color: "hsl(220,10%,45%)", padding: "0.2rem",
              }} data-testid="button-toggle-confirm-password">
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {form.confirmPassword && form.confirmPassword !== form.newPassword && (
              <div style={{ fontSize: "0.72rem", color: "hsl(0,72%,60%)", marginTop: "0.3rem" }}>
                Passwords do not match
              </div>
            )}
          </div>

          {/* Password requirements */}
          <div style={{
            background: "hsl(220,20%,7%)", border: "1px solid hsl(220,15%,16%)",
            borderRadius: "0.5rem", padding: "0.85rem 1rem",
          }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "hsl(220,10%,50%)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>
              Requirements
            </div>
            {[
              { label: "At least 6 characters", met: form.newPassword.length >= 6 },
              { label: "One uppercase letter", met: /[A-Z]/.test(form.newPassword) },
              { label: "One number", met: /[0-9]/.test(form.newPassword) },
              { label: "One special character", met: /[^A-Za-z0-9]/.test(form.newPassword) },
            ].map(({ label, met }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.3rem" }}>
                <span style={{ color: met ? "hsl(145,70%,55%)" : "hsl(220,10%,40%)", flexShrink: 0 }}>
                  {met ? <Check size={12} /> : <X size={12} />}
                </span>
                <span style={{ fontSize: "0.78rem", color: met ? "hsl(145,70%,55%)" : "hsl(220,10%,45%)" }}>{label}</span>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={changeMutation.isPending || !form.currentPassword || !form.newPassword || form.newPassword !== form.confirmPassword}
            className="btn-primary"
            style={{ alignSelf: "flex-start", fontSize: "0.85rem" }}
            data-testid="button-change-password"
          >
            {changeMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Account component ─────────────────────────────────────────────────────
export default function Account() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, logout, isStaff, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>("info");

  if (!isAuthenticated || !user) return <NotLoggedIn />;

  function handleLogout() {
    logout();
    navigate("/");
  }

  const TABS: { id: Tab; label: string; icon: typeof User }[] = [
    { id: "info", label: "Account Info", icon: User },
    { id: "orders", label: "Orders", icon: Package },
    { id: "security", label: "Security", icon: Shield },
  ];

  const ROLE_LABELS: Record<string, { label: string; color: string }> = {
    super_admin: { label: "Super Admin", color: "hsl(0,72%,65%)" },
    admin: { label: "Admin", color: "hsl(258,90%,70%)" },
    staff: { label: "Staff", color: "hsl(196,100%,55%)" },
    user: { label: "Member", color: "hsl(145,70%,55%)" },
  };
  const roleInfo = ROLE_LABELS[user.role] ?? { label: user.role, color: "hsl(220,10%,60%)" };

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: "3.5rem 1.25rem 4rem" }}>
      {/* Header */}
      <div style={{
        background: "hsl(220,20%,9%)", border: "1px solid hsl(220,15%,16%)",
        borderRadius: "1rem", padding: "1.5rem 1.75rem",
        display: "flex", alignItems: "center", gap: "1.25rem",
        marginBottom: "1.5rem", flexWrap: "wrap",
      }}>
        <div style={{
          width: "62px", height: "62px", borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, hsl(258,90%,45%), hsl(196,100%,40%))",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.username}
              style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
          ) : (
            <span className="font-orbitron" style={{ fontSize: "1.4rem", fontWeight: 800, color: "white" }}>
              {user.username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="font-orbitron" style={{ fontSize: "1.25rem", fontWeight: 800, color: "hsl(210,40%,95%)", marginBottom: "0.25rem" }}
            data-testid="text-username">
            {user.fullName || user.username}
          </h1>
          {user.email && (
            <p style={{ fontSize: "0.82rem", color: "hsl(220,10%,50%)", marginBottom: "0.4rem" }}>{user.email}</p>
          )}
          <span className="badge" style={{ background: `${roleInfo.color}20`, color: roleInfo.color, border: `1px solid ${roleInfo.color}40` }}>
            {roleInfo.label}
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {isStaff() && (
            <button onClick={() => navigate("/admin")} className="btn-primary" style={{ fontSize: "0.8rem" }} data-testid="button-go-to-admin">
              <Lock size={13} />
              Admin Panel
            </button>
          )}
          <button onClick={handleLogout} className="btn-secondary"
            style={{ fontSize: "0.8rem", color: "hsl(0,72%,60%)", borderColor: "hsla(0,72%,51%,0.3)" }}
            data-testid="button-logout">
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: "0.25rem", background: "hsl(220,20%,8%)",
        border: "1px solid hsl(220,15%,14%)", borderRadius: "0.75rem",
        padding: "0.3rem", marginBottom: "1.5rem",
      }}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                gap: "0.5rem", padding: "0.6rem 0.5rem", borderRadius: "0.5rem",
                fontSize: "0.82rem", fontWeight: active ? 600 : 500, border: "none", cursor: "pointer",
                background: active ? "hsl(220,20%,14%)" : "none",
                color: active ? "hsl(210,40%,92%)" : "hsl(220,10%,45%)",
                transition: "all 0.15s",
              }}
              data-testid={`tab-${id}`}
            >
              <Icon size={14} />
              <span style={{ display: "flex" }}>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "info" && (
        <AccountInfoTab user={user} setUser={(u) => setUser(u)} />
      )}
      {activeTab === "orders" && <OrdersTab user={user} />}
      {activeTab === "security" && <SecurityTab user={user} />}
    </div>
  );
}
