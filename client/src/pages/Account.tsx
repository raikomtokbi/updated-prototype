import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  User, LogOut, ShoppingBag, Shield, Lock, ChevronRight,
  Package, Settings, Eye, EyeOff, Check, X, Loader2,
  Calendar, Hash, Clock, Headphones, Send, Paperclip, ArrowLeft, ChevronDown,
  RotateCcw, ChevronLeft,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/authstore";
import { useCartStore } from "@/lib/store/cartStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type Tab = "info" | "orders" | "security" | "tickets";

function formatDate(dateStr: string | Date | null | undefined) {
  if (!dateStr) return "—";
  const d = new Date(dateStr as string);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatCurrency(amount: string | number | null | undefined, currency = "USD") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));
}

function parseOrderNotes(notes: string | null | undefined): Array<{ productTitle?: string; packageName?: string; userId?: string; zoneId?: string; quantity?: number }> {
  if (!notes) return [];
  try {
    const parsed = JSON.parse(notes);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.items)) return parsed.items;
  } catch {}
  return [];
}

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: "hsla(40,90%,55%,0.12)", text: "hsl(40,90%,60%)", dot: "hsl(40,90%,60%)" },
  processing: { bg: "hsla(196,100%,50%,0.12)", text: "hsl(196,100%,55%)", dot: "hsl(196,100%,55%)" },
  completed: { bg: "hsla(145,70%,50%,0.12)", text: "hsl(145,70%,55%)", dot: "hsl(145,70%,55%)" },
  cancelled: { bg: "hsla(0,72%,55%,0.12)", text: "hsl(0,72%,60%)", dot: "hsl(0,72%,60%)" },
  refunded: { bg: "hsla(258,90%,66%,0.12)", text: "hsl(var(--primary))", dot: "hsl(var(--primary))" },
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
        <User size={32} style={{ color: "hsl(var(--primary))" }} />
      </div>
      <h2 className="font-orbitron" style={{ fontSize: "1.5rem", fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: "0.75rem" }}>
        Not Signed In
      </h2>
      <p style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))", marginBottom: "2rem", lineHeight: 1.6 }}>
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
    { key: "id", label: "Member ID", value: user.id, editable: false },
    { key: "username", label: "Username", value: user.username, editable: false },
    { key: "fullName", label: "Full Name", value: user.fullName || "—", editable: true, placeholder: "Enter your full name" },
    { key: "email", label: "Email Address", value: user.email || "—", editable: true, placeholder: "Enter your email" },
    { key: "phone", label: "Phone Number", value: (form.phone || "—"), editable: true, placeholder: "+1 (555) 000-0000" },
  ];

  const ROLE_LABELS: Record<string, { label: string; color: string }> = {
    super_admin: { label: "Super Admin", color: "hsl(0,72%,65%)" },
    admin: { label: "Admin", color: "hsl(var(--primary))" },
    staff: { label: "Staff", color: "hsl(196,100%,55%)" },
    user: { label: "Member", color: "hsl(145,70%,55%)" },
  };
  const roleInfo = ROLE_LABELS[user.role] ?? { label: user.role, color: "hsl(var(--muted-foreground))" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Edit form */}
      {editing && (
        <div style={{
          background: "hsl(var(--card))", border: "1px solid hsla(258,90%,66%,0.25)",
          borderRadius: "0.75rem", padding: "1.5rem",
        }}>
          <h3 style={{ fontSize: "0.68rem", fontWeight: 700, color: "hsl(var(--muted-foreground))", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.25rem" }}>
            Edit Profile
          </h3>
          <div style={{ display: "grid", gap: "1rem" }}>
            {[
              { key: "fullName", label: "Full Name", placeholder: "John Doe" },
              { key: "email", label: "Email Address", placeholder: "you@example.com", type: "email" },
              { key: "phone", label: "Phone Number", placeholder: "+1 (555) 000-0000", type: "tel" },
            ].map(({ key, label, placeholder, type = "text" }) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 600, color: "hsl(var(--muted-foreground))", marginBottom: "0.4rem" }}>
                  {label}
                </label>
                <input
                  type={type}
                  value={(form as any)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  data-testid={`input-${key}`}
                  style={{
                    width: "100%", background: "hsl(var(--background))", border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem", padding: "0.6rem 0.9rem", fontSize: "0.68rem",
                    color: "hsl(var(--foreground))", outline: "none", boxSizing: "border-box",
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
              style={{ fontSize: "0.68rem" }}
              data-testid="button-save-profile"
            >
              {updateMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save Changes
            </button>
            <button onClick={() => setEditing(false)} className="btn-secondary" style={{ fontSize: "0.68rem" }} data-testid="button-cancel-edit">
              <X size={14} />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Info fields */}
      <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", overflow: "hidden" }}>
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid hsl(var(--border))", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <h3 style={{ fontSize: "0.68rem", fontWeight: 700, color: "hsl(var(--muted-foreground))", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Account Details
          </h3>
          <button
            onClick={() => { setEditing(!editing); if (!editing) setForm({ fullName: user.fullName ?? "", email: user.email ?? "", phone: "" }); }}
            className="btn-secondary"
            style={{ fontSize: "0.68rem" }}
            data-testid="button-edit-profile"
          >
            <Settings size={13} />
            {editing ? "Cancel" : "Edit"}
          </button>
        </div>
        {fields.map(({ key, label, value }) => (
          <div key={key} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "0.9rem 1.5rem", borderBottom: "1px solid hsl(var(--border))", gap: "1rem", flexWrap: "wrap",
          }}>
            <span style={{ fontSize: "0.82rem", color: "hsl(var(--muted-foreground))", minWidth: "120px" }}>{label}</span>
            {key === "id" ? (
              <span
                data-testid="text-member-id"
                style={{
                  fontFamily: "monospace", fontSize: "0.9rem", fontWeight: 700,
                  color: "hsl(196,100%,60%)", letterSpacing: "0.08em",
                  background: "hsla(196,100%,50%,0.08)", border: "1px solid hsla(196,100%,50%,0.2)",
                  borderRadius: "4px", padding: "2px 8px",
                }}
              >
                #{value}
              </span>
            ) : (
              <span style={{ fontSize: "0.68rem", color: "hsl(var(--foreground))", fontWeight: 500, wordBreak: "break-all" }}
                data-testid={`text-${key}`}>
                {value}
              </span>
            )}
          </div>
        ))}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "0.9rem 1.5rem", gap: "1rem", flexWrap: "wrap",
        }}>
          <span style={{ fontSize: "0.82rem", color: "hsl(var(--muted-foreground))", minWidth: "120px" }}>Account Status</span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.68rem", color: "hsl(145,70%,55%)", fontWeight: 500 }}>
            <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "hsl(145,70%,55%)", flexShrink: 0 }} />
            Active
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Orders Tab ────────────────────────────────────────────────────────────────
const ORDERS_PAGE_SIZE = 5;

function OrdersTab({ user }: { user: any }) {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const logout = useAuthStore((s) => s.logout);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: orders, isLoading, error } = useQuery<any[]>({
    queryKey: ["/api/user/orders"],
    queryFn: async () => {
      const res = await fetch("/api/user/orders", {
        headers: { "X-Username": user.username },
        credentials: "include",
      });
      if (res.status === 401) {
        const body = await res.json().catch(() => ({}));
        const err: any = new Error(body.message || "Unauthorized");
        err.status = 401;
        throw err;
      }
      if (!res.ok) throw new Error("Failed to load orders");
      return res.json();
    },
  });

  const refundMutation = useMutation({
    mutationFn: async (order: any) => {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          subject: `Refund Request — Order #${order.orderNumber}`,
          message: `I would like to request a refund for order #${order.orderNumber} (placed on ${formatDate(order.createdAt)}, total: ${formatCurrency(order.totalAmount, order.currency)}). Please review and process the refund at your earliest convenience.`,
          category: "billing",
          priority: "medium",
        }),
      });
      if (!res.ok) throw new Error("Failed to submit refund request");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Refund request submitted", description: "We've opened a support ticket for your refund. Our team will be in touch shortly." });
      setOpenDropdown(null);
    },
    onError: () => {
      toast({ title: "Failed to submit", description: "Could not submit your refund request. Please try again.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{
            background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
            borderRadius: "0.75rem", padding: "1.25rem",
            animation: "pulse 1.5s ease-in-out infinite",
            height: "90px",
          }} />
        ))}
      </div>
    );
  }

  if (error && (error as any).status === 401) {
    return (
      <div style={{
        background: "hsl(var(--card))", border: "1px solid hsla(0,72%,55%,0.25)",
        borderRadius: "0.75rem", padding: "4rem 2rem", textAlign: "center",
      }}>
        <div style={{
          width: "56px", height: "56px", borderRadius: "50%",
          background: "hsla(0,72%,55%,0.08)", border: "1px solid hsla(0,72%,55%,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem",
        }}>
          <Lock size={24} style={{ color: "hsl(0,72%,65%)" }} />
        </div>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: "0.5rem" }}>Session Expired</h3>
        <p style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))", marginBottom: "1.5rem" }}>
          Your session is no longer valid. Please sign in again to view your orders.
        </p>
        <button
          className="btn-primary"
          style={{ fontSize: "0.68rem" }}
          onClick={() => { logout(); navigate("/login"); }}
        >
          Sign In Again
        </button>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div style={{
        background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
        borderRadius: "0.75rem", padding: "4rem 2rem", textAlign: "center",
      }}>
        <div style={{
          width: "56px", height: "56px", borderRadius: "50%",
          background: "hsla(258,90%,66%,0.08)", border: "1px solid hsla(258,90%,66%,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem",
        }}>
          <Package size={24} style={{ color: "hsl(var(--primary))" }} />
        </div>
        <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: "0.5rem" }}>No orders yet</h3>
        <p style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))", marginBottom: "1.5rem" }}>
          Your order history will appear here once you make a purchase.
        </p>
        <Link href="/products" className="btn-primary" style={{ fontSize: "0.68rem" }} data-testid="link-browse-products">
          <ShoppingBag size={14} />
          Browse Products
        </Link>
      </div>
    );
  }

  const totalPages = Math.ceil(orders.length / ORDERS_PAGE_SIZE);
  const paged = orders.slice((page - 1) * ORDERS_PAGE_SIZE, page * ORDERS_PAGE_SIZE);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
        <span style={{ fontSize: "0.82rem", color: "hsl(var(--muted-foreground))" }}>
          {orders.length} order{orders.length !== 1 ? "s" : ""} total
        </span>
        {totalPages > 1 && (
          <span style={{ fontSize: "0.72rem", color: "hsl(var(--muted-foreground))" }}>
            Page {page} of {totalPages}
          </span>
        )}
      </div>

      {/* Order cards */}
      {paged.map((order) => {
        const sc = STATUS_COLORS[order.status] ?? STATUS_COLORS.pending;
        const isExpanded = expandedOrder === order.id;
        const canRefund = !order.deliveryStatus || order.deliveryStatus === "pending";

        return (
          <div key={order.id} style={{
            background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
            borderRadius: "0.75rem", overflow: "hidden",
          }} data-testid={`card-order-${order.id}`}>

            {/* Main clickable row */}
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
                  <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "hsl(var(--foreground))" }}>
                    #{order.orderNumber}
                  </span>
                  <span style={{
                    fontSize: "0.68rem", fontWeight: 600, padding: "0.15rem 0.5rem", borderRadius: "99px",
                    background: sc.bg, color: sc.text, textTransform: "capitalize",
                  }}>
                    {order.status}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    <Calendar size={11} /> {formatDate(order.createdAt)}
                  </span>
                  {order.items?.length > 0 && (
                    <span style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Hash size={11} /> {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div className="font-orbitron" style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(var(--foreground))" }}>
                  {formatCurrency(order.totalAmount, order.currency)}
                </div>
                <ChevronRight size={14} style={{
                  color: "hsl(var(--muted-foreground))", marginTop: "0.25rem", float: "right",
                  transform: isExpanded ? "rotate(90deg)" : "none", transition: "transform 0.2s",
                }} />
              </div>
            </button>

            {/* Expanded section: items + actions */}
            {isExpanded && (
              <div style={{ borderTop: "1px solid hsl(var(--border))", padding: "0.75rem 1.25rem 1rem" }}>
                {(() => {
                  // Notes items are the primary source — order_items table may be empty for older orders
                  const notesItems = parseOrderNotes(order.notes);
                  // Fall back to DB items if notes is empty (future-proofing)
                  const dbItems: any[] = order.items ?? [];
                  const displayItems = notesItems.length > 0
                    ? notesItems.map((ni, idx) => ({
                        key: idx,
                        productTitle: ni.productTitle ?? dbItems[idx]?.productTitle ?? "—",
                        packageLabel: ni.packageName ?? dbItems[idx]?.packageLabel,
                        quantity: ni.quantity ?? dbItems[idx]?.quantity ?? 1,
                        price: ni.price != null ? ni.price : dbItems[idx]?.totalPrice,
                        userId: ni.userId,
                        zoneId: ni.zoneId,
                      }))
                    : dbItems.map((item, idx) => ({
                        key: item.id ?? idx,
                        productTitle: item.productTitle,
                        packageLabel: item.packageLabel,
                        quantity: item.quantity,
                        price: item.totalPrice,
                        userId: undefined,
                        zoneId: undefined,
                      }));

                  if (displayItems.length === 0) return null;
                  return (
                    <>
                      <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "hsl(var(--muted-foreground))", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
                        Order Details
                      </div>
                      {displayItems.map((item) => (
                        <div key={item.key} style={{ padding: "0.7rem 0", borderBottom: "1px solid hsl(var(--border))" }}
                          data-testid={`row-order-item-${item.key}`}>
                          {/* Game + price */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.4rem" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "hsl(var(--foreground))" }}>{item.productTitle}</div>
                              {item.packageLabel && (
                                <div style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))", marginTop: "1px" }}>
                                  {item.packageLabel}{item.quantity > 1 ? ` × ${item.quantity}` : ""}
                                </div>
                              )}
                            </div>
                            {item.price != null && (
                              <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "hsl(var(--foreground))", flexShrink: 0 }}>
                                {formatCurrency(item.price, order.currency)}
                              </div>
                            )}
                          </div>
                          {/* Player info badges */}
                          {(item.userId || item.zoneId) && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.3rem" }}>
                              {item.userId && (
                                <span style={{
                                  display: "inline-flex", alignItems: "center", gap: "0.3rem",
                                  fontSize: "0.65rem", fontFamily: "monospace",
                                  padding: "0.2rem 0.5rem", borderRadius: "0.3rem",
                                  background: "hsla(258,80%,60%,0.1)", color: "hsl(258,80%,70%)",
                                  border: "1px solid hsla(258,80%,60%,0.2)",
                                }}>
                                  <User size={9} /> ID: {item.userId}
                                </span>
                              )}
                              {item.zoneId && (
                                <span style={{
                                  display: "inline-flex", alignItems: "center", gap: "0.3rem",
                                  fontSize: "0.65rem", fontFamily: "monospace",
                                  padding: "0.2rem 0.5rem", borderRadius: "0.3rem",
                                  background: "hsla(196,100%,50%,0.08)", color: "hsl(196,100%,55%)",
                                  border: "1px solid hsla(196,100%,50%,0.2)",
                                }}>
                                  <Hash size={9} /> Zone: {item.zoneId}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.75rem" }}>
                        <span style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))" }}>Order Total</span>
                        <span className="font-orbitron" style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(var(--primary))" }}>
                          {formatCurrency(order.totalAmount, order.currency)}
                        </span>
                      </div>
                    </>
                  );
                })()}

                {/* Request Refund — only when delivery is still pending */}
                {canRefund && (
                  <div style={{ marginTop: order.items?.length > 0 ? "0.75rem" : 0, paddingTop: order.items?.length > 0 ? "0.75rem" : 0, borderTop: order.items?.length > 0 ? "1px solid hsl(var(--border))" : "none" }}>
                    <button
                      onClick={() => { if (!refundMutation.isPending) refundMutation.mutate(order); }}
                      disabled={refundMutation.isPending}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "0.4rem",
                        padding: "0.45rem 0.9rem", borderRadius: "0.4rem",
                        background: "hsla(40,90%,55%,0.1)", border: "1px solid hsla(40,90%,55%,0.25)",
                        cursor: refundMutation.isPending ? "not-allowed" : "pointer",
                        fontSize: "0.72rem", fontWeight: 600, color: "hsl(40,90%,60%)",
                        opacity: refundMutation.isPending ? 0.6 : 1,
                      }}
                      data-testid={`button-request-refund-${order.id}`}
                    >
                      {refundMutation.isPending
                        ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                        : <RotateCcw size={12} />
                      }
                      Request Refund
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", paddingTop: "0.5rem" }}>
          <button
            onClick={() => { setPage((p) => Math.max(1, p - 1)); setExpandedOrder(null); }}
            disabled={page === 1}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "32px", height: "32px", borderRadius: "0.4rem",
              background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
              cursor: page === 1 ? "not-allowed" : "pointer",
              color: page === 1 ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))",
              opacity: page === 1 ? 0.4 : 1,
            }}
            data-testid="button-orders-prev"
          >
            <ChevronLeft size={15} />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => { setPage(p); setExpandedOrder(null); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "32px", height: "32px", borderRadius: "0.4rem",
                background: page === p ? "hsl(var(--primary))" : "hsl(var(--card))",
                border: "1px solid " + (page === p ? "hsl(var(--primary))" : "hsl(var(--border))"),
                cursor: "pointer",
                color: page === p ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                fontSize: "0.72rem", fontWeight: page === p ? 700 : 400,
              }}
              data-testid={`button-orders-page-${p}`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); setExpandedOrder(null); }}
            disabled={page === totalPages}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "32px", height: "32px", borderRadius: "0.4rem",
              background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
              cursor: page === totalPages ? "not-allowed" : "pointer",
              color: page === totalPages ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))",
              opacity: page === totalPages ? 0.4 : 1,
            }}
            data-testid="button-orders-next"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Security Tab ─────────────────────────────────────────────────────────────
function SecurityTab({ user }: { user: any }) {
  const [showChangePassword, setShowChangePassword] = useState(false);
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

      {/* Change Password – collapsible */}
      <div style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.75rem", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", padding: "1.25rem" }}>
          <div>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: "0.25rem" }}>
              Change Password
            </h3>
            <p style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))", margin: 0 }}>
              Update your password to keep your account secure.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowChangePassword(v => !v)}
            className="btn-secondary"
            style={{ fontSize: "0.68rem", flexShrink: 0 }}
            data-testid="button-change-password-toggle"
          >
            {showChangePassword ? "Cancel" : "Change"}
          </button>
        </div>

        {showChangePassword && (
        <form onSubmit={handleSubmit} style={{ borderTop: "1px solid hsl(var(--border))", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Current password */}
          <div>
            <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 600, color: "hsl(var(--muted-foreground))", marginBottom: "0.4rem" }}>
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
                  width: "100%", background: "hsl(var(--background))", border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem", padding: "0.6rem 2.5rem 0.6rem 0.9rem",
                  fontSize: "0.68rem", color: "hsl(var(--foreground))", outline: "none", boxSizing: "border-box",
                }}
              />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} style={{
                position: "absolute", right: "0.7rem", top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", padding: "0.2rem",
              }} data-testid="button-toggle-current-password">
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 600, color: "hsl(var(--muted-foreground))", marginBottom: "0.4rem" }}>
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
                  width: "100%", background: "hsl(var(--background))", border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem", padding: "0.6rem 2.5rem 0.6rem 0.9rem",
                  fontSize: "0.68rem", color: "hsl(var(--foreground))", outline: "none", boxSizing: "border-box",
                }}
              />
              <button type="button" onClick={() => setShowNew(!showNew)} style={{
                position: "absolute", right: "0.7rem", top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", padding: "0.2rem",
              }} data-testid="button-toggle-new-password">
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {/* Strength meter */}
            {strength && (
              <div style={{ marginTop: "0.5rem" }}>
                <div style={{ height: "3px", background: "hsl(var(--border))", borderRadius: "99px", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: strength.width, background: strength.color,
                    transition: "width 0.3s, background 0.3s", borderRadius: "99px",
                  }} />
                </div>
                <div style={{ fontSize: "0.68rem", color: strength.color, marginTop: "0.3rem" }}>
                  Strength: {strength.label}
                </div>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 600, color: "hsl(var(--muted-foreground))", marginBottom: "0.4rem" }}>
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
                  width: "100%", background: "hsl(var(--background))",
                  border: `1px solid ${form.confirmPassword && form.confirmPassword !== form.newPassword ? "hsla(0,72%,55%,0.5)" : "hsl(var(--border))"}`,
                  borderRadius: "0.5rem", padding: "0.6rem 2.5rem 0.6rem 0.9rem",
                  fontSize: "0.68rem", color: "hsl(var(--foreground))", outline: "none", boxSizing: "border-box",
                }}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{
                position: "absolute", right: "0.7rem", top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer", color: "hsl(var(--muted-foreground))", padding: "0.2rem",
              }} data-testid="button-toggle-confirm-password">
                {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {form.confirmPassword && form.confirmPassword !== form.newPassword && (
              <div style={{ fontSize: "0.68rem", color: "hsl(0,72%,60%)", marginTop: "0.3rem" }}>
                Passwords do not match
              </div>
            )}
          </div>

          {/* Password requirements */}
          <div style={{
            background: "hsl(var(--background))", border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem", padding: "0.85rem 1rem",
          }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.5rem" }}>
              Requirements
            </div>
            {[
              { label: "At least 6 characters", met: form.newPassword.length >= 6 },
              { label: "One uppercase letter", met: /[A-Z]/.test(form.newPassword) },
              { label: "One number", met: /[0-9]/.test(form.newPassword) },
              { label: "One special character", met: /[^A-Za-z0-9]/.test(form.newPassword) },
            ].map(({ label, met }) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.3rem" }}>
                <span style={{ color: met ? "hsl(145,70%,55%)" : "hsl(var(--muted-foreground))", flexShrink: 0 }}>
                  {met ? <Check size={12} /> : <X size={12} />}
                </span>
                <span style={{ fontSize: "0.68rem", color: met ? "hsl(145,70%,55%)" : "hsl(var(--muted-foreground))" }}>{label}</span>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={changeMutation.isPending || !form.currentPassword || !form.newPassword || form.newPassword !== form.confirmPassword}
            className="btn-primary"
            style={{ alignSelf: "flex-start", fontSize: "0.68rem" }}
            data-testid="button-change-password"
          >
            {changeMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            Update Password
          </button>
        </form>
        )}
      </div>

      {/* Delete Account Section */}
      <DeleteAccountSection />
    </div>
  );
}

function DeleteAccountSection() {
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [, navigate] = useLocation();
  const { logout } = useAuthStore();
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete account");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Account deleted", description: "Your account has been permanently deleted." });
      logout();
      navigate("/");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleDelete = () => {
    if (!deletePassword) {
      toast({ title: "Error", description: "Please enter your password", variant: "destructive" });
      return;
    }
    deleteMutation.mutate(deletePassword);
  };

  return (
    <div style={{
      background: "hsla(0,72%,55%,0.08)", border: "1px solid hsla(0,72%,55%,0.2)",
      borderRadius: "0.75rem", padding: "1.25rem", overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(0,72%,60%)", marginBottom: "0.25rem" }}>
            Delete Account
          </h3>
          <p style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))", margin: 0 }}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
        </div>
        <button
          onClick={() => setShowDelete(!showDelete)}
          className="btn-secondary"
          style={{ fontSize: "0.68rem", flexShrink: 0 }}
          data-testid="button-delete-account-toggle"
        >
          {showDelete ? "Cancel" : "Delete"}
        </button>
      </div>

      {showDelete && (
        <div style={{
          borderTop: "1px solid hsla(0,72%,55%,0.2)", paddingTop: "1rem",
          display: "flex", flexDirection: "column", gap: "0.75rem",
        }}>
          <div style={{
            background: "hsla(0,72%,55%,0.08)", border: "1px solid hsla(0,72%,55%,0.15)",
            borderRadius: "0.5rem", padding: "0.75rem",
            fontSize: "0.68rem", color: "hsl(0,72%,65%)",
          }}>
            This will permanently delete your account, orders, and personal information. This cannot be reversed.
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 600, color: "hsl(var(--muted-foreground))", marginBottom: "0.3rem" }}>
              Enter your password to confirm
            </label>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Your password"
              data-testid="input-delete-password"
              style={{
                width: "100%", background: "hsl(var(--background))", border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem", padding: "0.6rem 0.9rem",
                fontSize: "0.68rem", color: "hsl(var(--foreground))", outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending || !deletePassword}
            style={{
              background: "hsl(0,72%,55%)", color: "white", border: "none",
              borderRadius: "0.5rem", padding: "0.6rem 1rem",
              fontSize: "0.68rem", fontWeight: 600, cursor: "pointer",
              opacity: deleteMutation.isPending || !deletePassword ? 0.6 : 1,
            }}
            data-testid="button-confirm-delete"
          >
            {deleteMutation.isPending ? <Loader2 size={14} className="inline animate-spin" /> : "Permanently Delete Account"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Ticket Status Badge ───────────────────────────────────────────────────────
const TICKET_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: "hsla(213,90%,55%,0.12)", text: "hsl(213,90%,65%)" },
  in_progress: { bg: "hsla(40,90%,55%,0.12)", text: "hsl(40,90%,60%)" },
  resolved: { bg: "hsla(145,70%,50%,0.12)", text: "hsl(145,70%,55%)" },
  closed: { bg: "hsla(220,10%,40%,0.12)", text: "hsl(var(--muted-foreground))" },
};

function TicketStatusBadge({ status }: { status: string }) {
  const c = TICKET_STATUS_COLORS[status] ?? { bg: "hsla(220,10%,40%,0.1)", text: "hsl(var(--muted-foreground))" };
  return (
    <span style={{
      display: "inline-block", fontSize: "0.68rem", fontWeight: 600,
      padding: "2px 8px", borderRadius: "999px",
      background: c.bg, color: c.text, textTransform: "capitalize",
    }}>
      {status.replace("_", " ")}
    </span>
  );
}

// ── Tickets Tab ───────────────────────────────────────────────────────────────
function TicketsTab({ user }: { user: any }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [replyMsg, setReplyMsg] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const authHeaders = { "X-Username": user.username };

  const { data: tickets = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/tickets"],
    queryFn: async () => {
      const res = await fetch("/api/tickets", { credentials: "include", headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load tickets");
      return res.json();
    },
  });

  const { data: ticketDetail, isLoading: detailLoading } = useQuery<any>({
    queryKey: ["/api/tickets", selectedTicketId],
    queryFn: async () => {
      const res = await fetch(`/api/tickets/${selectedTicketId}`, { credentials: "include", headers: authHeaders });
      if (!res.ok) throw new Error("Failed to load ticket");
      return res.json();
    },
    enabled: !!selectedTicketId,
    refetchInterval: 8000,
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("message", replyMsg);
      if (attachment) formData.append("attachment", attachment);
      const res = await fetch(`/api/tickets/${selectedTicketId}/reply`, {
        method: "POST",
        credentials: "include",
        headers: authHeaders,
        body: formData,
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to send reply");
      }
      return res.json();
    },
    onSuccess: () => {
      setReplyMsg("");
      setAttachment(null);
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["/api/tickets", selectedTicketId] });
      qc.invalidateQueries({ queryKey: ["/api/tickets"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const baseBox: React.CSSProperties = {
    background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
    borderRadius: "0.75rem", overflow: "hidden",
  };

  if (selectedTicketId) {
    const ticket = ticketDetail;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <button
          onClick={() => setSelectedTicketId(null)}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", background: "none", border: "none", cursor: "pointer", color: "hsl(var(--primary))", fontSize: "0.68rem", fontWeight: 600, padding: 0 }}
        >
          <ArrowLeft size={15} /> Back to tickets
        </button>

        {detailLoading || !ticket ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "hsl(var(--muted-foreground))" }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto" }} />
          </div>
        ) : (
          <>
            <div style={{ ...baseBox, padding: "1.25rem 1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: "0.3rem" }}>{ticket.subject}</div>
                  <div style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))" }}>
                    #{ticket.ticketNumber} · {formatDate(ticket.createdAt)}
                    {ticket.category && <> · {ticket.category}</>}
                  </div>
                </div>
                <TicketStatusBadge status={ticket.status} />
              </div>
            </div>

            <div style={baseBox}>
              <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid hsl(var(--border))" }}>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Conversation
                </span>
              </div>
              <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {/* Original message */}
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                    background: "linear-gradient(135deg,hsl(258,90%,45%),hsl(196,100%,40%))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.68rem", fontWeight: 700, color: "white",
                  }}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem" }}>
                      <span style={{ fontSize: "0.68rem", fontWeight: 600, color: "hsl(var(--foreground))" }}>{user.username}</span>
                      <span style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))" }}>{formatDate(ticket.createdAt)}</span>
                    </div>
                    <div style={{
                      background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
                      borderRadius: "0 0.75rem 0.75rem 0.75rem", padding: "0.75rem 1rem",
                      fontSize: "0.68rem", color: "hsl(var(--foreground))", lineHeight: 1.6, whiteSpace: "pre-wrap",
                    }}>
                      {ticket.message}
                    </div>
                  </div>
                </div>

                {/* Replies */}
                {(ticket.replies ?? []).map((r: any) => {
                  const isAdmin = r.isStaff;
                  return (
                    <div key={r.id} style={{ display: "flex", gap: "0.75rem", flexDirection: isAdmin ? "row-reverse" : "row" }}>
                      <div style={{
                        width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                        background: isAdmin ? "linear-gradient(135deg,hsl(258,90%,55%),hsl(196,100%,45%))" : "hsl(220,20%,18%)",
                        border: isAdmin ? "none" : "1px solid hsl(220,15%,24%)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.68rem", fontWeight: 700, color: "white",
                      }}>
                        {isAdmin ? "S" : user.username.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, maxWidth: "85%" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", justifyContent: isAdmin ? "flex-end" : "flex-start" }}>
                          <span style={{ fontSize: "0.68rem", fontWeight: 600, color: isAdmin ? "hsl(var(--primary))" : "hsl(var(--foreground))" }}>
                            {isAdmin ? "Support" : user.username}
                          </span>
                          <span style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))" }}>{formatDate(r.createdAt)}</span>
                        </div>
                        <div style={{
                          background: isAdmin ? "hsla(258,90%,55%,0.12)" : "hsl(var(--card))",
                          border: `1px solid ${isAdmin ? "hsla(258,90%,55%,0.25)" : "hsl(var(--border))"}`,
                          borderRadius: isAdmin ? "0.75rem 0 0.75rem 0.75rem" : "0 0.75rem 0.75rem 0.75rem",
                          padding: "0.75rem 1rem",
                          fontSize: "0.68rem", color: "hsl(var(--foreground))", lineHeight: 1.6, whiteSpace: "pre-wrap",
                        }}>
                          {r.message}
                        </div>
                        {r.attachmentUrl && (
                          <div style={{ marginTop: "0.35rem", textAlign: isAdmin ? "right" : "left" }}>
                            <a href={r.attachmentUrl} target="_blank" rel="noreferrer"
                              style={{ fontSize: "0.68rem", color: "hsl(var(--primary))", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                              <Paperclip size={12} /> Attachment
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {ticket.replies?.length === 0 && (
                  <div style={{ textAlign: "center", fontSize: "0.68rem", color: "hsl(var(--muted-foreground))", padding: "1rem 0" }}>
                    No replies yet. We'll respond within 24 hours.
                  </div>
                )}
              </div>
            </div>

            {/* Reply form — only if ticket is not closed */}
            {ticket.status !== "closed" && (
              <div style={baseBox}>
                <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid hsl(var(--border))" }}>
                  <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    Send Reply
                  </span>
                </div>
                <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <textarea
                    value={replyMsg}
                    onChange={(e) => setReplyMsg(e.target.value)}
                    placeholder="Type your reply..."
                    rows={4}
                    style={{
                      width: "100%", background: "hsl(var(--background))", border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem", padding: "0.7rem 1rem",
                      fontSize: "0.68rem", color: "hsl(var(--foreground))", outline: "none",
                      resize: "vertical", minHeight: "80px", boxSizing: "border-box",
                    }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                      style={{ display: "none" }}
                      onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "0.4rem",
                        background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem", padding: "0.45rem 0.85rem",
                        fontSize: "0.68rem", fontWeight: 600, color: "hsl(var(--muted-foreground))", cursor: "pointer",
                      }}
                    >
                      <Paperclip size={13} />
                      {attachment ? attachment.name.slice(0, 20) + (attachment.name.length > 20 ? "…" : "") : "Attach file"}
                    </button>
                    {attachment && (
                      <button onClick={() => { setAttachment(null); if (fileRef.current) fileRef.current.value = ""; }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(0,72%,60%)", fontSize: "0.68rem", padding: 0 }}>
                        Remove
                      </button>
                    )}
                    <button
                      onClick={() => replyMutation.mutate()}
                      disabled={!replyMsg.trim() || replyMutation.isPending}
                      style={{
                        marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "0.5rem",
                        background: "linear-gradient(135deg,hsl(258,90%,55%),hsl(258,90%,45%))",
                        border: "none", borderRadius: "0.5rem", padding: "0.5rem 1.1rem",
                        fontSize: "0.68rem", fontWeight: 600, color: "white", cursor: "pointer",
                        opacity: !replyMsg.trim() || replyMutation.isPending ? 0.6 : 1,
                      }}
                    >
                      {replyMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      {replyMutation.isPending ? "Sending…" : "Send Reply"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div style={baseBox}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "1rem 1.25rem", borderBottom: "1px solid hsl(var(--border))" }}>
        <div style={{
          width: "36px", height: "36px", borderRadius: "0.6rem", flexShrink: 0,
          background: "hsla(258,90%,66%,0.12)", border: "1px solid hsla(258,90%,66%,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Headphones size={16} style={{ color: "hsl(var(--primary))" }} />
        </div>
        <div>
          <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "hsl(var(--foreground))" }}>Support Tickets</div>
          <div style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))" }}>View and manage your submitted support requests</div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "hsl(var(--muted-foreground))" }}>
          <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto" }} />
        </div>
      ) : tickets.length === 0 ? (
        <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: "0.68rem" }}>
          <Headphones size={36} style={{ margin: "0 auto 1rem", opacity: 0.3 }} />
          <p style={{ fontWeight: 600, marginBottom: "0.4rem" }}>No tickets yet</p>
          <p style={{ fontSize: "0.68rem" }}>
            Visit the{" "}
            <Link href="/support" style={{ color: "hsl(var(--primary))" }}>Support page</Link>
            {" "}to submit a ticket.
          </p>
        </div>
      ) : (
        <>
          {tickets.map((t: any, i: number) => (
            <div
              key={t.id}
              onClick={() => t.status !== "closed" && setSelectedTicketId(t.id)}
              style={{
                display: "flex", alignItems: "center", gap: "1rem",
                padding: "1rem 1.25rem", cursor: t.status === "closed" ? "not-allowed" : "pointer",
                borderBottom: i < tickets.length - 1 ? "1px solid hsl(var(--border))" : "none",
                transition: "background 0.15s",
                opacity: t.status === "closed" ? 0.6 : 1,
              }}
              onMouseEnter={(e) => { if (t.status !== "closed") e.currentTarget.style.background = "hsl(var(--card))"; }}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "hsl(var(--foreground))", marginBottom: "0.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.subject}
                </div>
                <div style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))" }}>
                  #{t.ticketNumber} · {formatDate(t.createdAt)}
                  {t.category && <> · {t.category}</>}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                <TicketStatusBadge status={t.status} />
                <ChevronRight size={15} style={{ color: "hsl(var(--muted-foreground))" }} />
              </div>
            </div>
          ))}
        </>
      )}
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
    { id: "tickets", label: "Tickets", icon: Headphones },
    { id: "security", label: "Security", icon: Shield },
  ];

  const ROLE_LABELS: Record<string, { label: string; color: string }> = {
    super_admin: { label: "Super Admin", color: "hsl(0,72%,65%)" },
    admin: { label: "Admin", color: "hsl(var(--primary))" },
    staff: { label: "Staff", color: "hsl(196,100%,55%)" },
    user: { label: "Member", color: "hsl(145,70%,55%)" },
  };
  const roleInfo = ROLE_LABELS[user.role] ?? { label: user.role, color: "hsl(var(--muted-foreground))" };

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: "3.5rem 1.25rem 4rem" }}>
      {/* Header */}
      <div style={{
        background: "hsl(var(--card))", border: "1px solid hsl(var(--border))",
        borderRadius: "1rem", padding: "1.25rem 1.5rem",
        marginBottom: "1.5rem",
      }}>
        {/* Top row: avatar + info */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{
            width: "58px", height: "58px", borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg, hsl(258,90%,45%), hsl(196,100%,40%))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.username}
                style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <span className="font-orbitron" style={{ fontSize: "1.3rem", fontWeight: 800, color: "white" }}>
                {user.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <h1 className="font-orbitron" style={{ fontSize: "1.15rem", fontWeight: 800, color: "hsl(var(--foreground))", marginBottom: "0.25rem" }}
              data-testid="text-username">
              {user.fullName || user.username}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span className="badge" style={{ background: `${roleInfo.color}20`, color: roleInfo.color, border: `1px solid ${roleInfo.color}40` }}>
                {roleInfo.label}
              </span>
              <span style={{ fontFamily: "monospace", fontSize: "0.68rem", fontWeight: 700, color: "hsl(196,100%,55%)", background: "hsla(196,100%,50%,0.08)", border: "1px solid hsla(196,100%,50%,0.18)", borderRadius: "4px", padding: "1px 6px", letterSpacing: "0.06em" }}>
                #{user.id}
              </span>
            </div>
          </div>
        </div>
        {/* Bottom row: actions */}
        <div style={{
          borderTop: "1px solid hsl(var(--border))", padding: "0.75rem 0 0",
          display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "center",
        }}>
          {isStaff() && (
            <button onClick={() => navigate("/admin")} className="btn-primary" style={{ fontSize: "0.68rem" }} data-testid="button-go-to-admin">
              <Lock size={12} />
              Admin Panel
            </button>
          )}
          <button onClick={handleLogout} className="btn-secondary"
            style={{ fontSize: "0.68rem", color: "hsl(0,72%,60%)", borderColor: "hsla(0,72%,51%,0.3)" }}
            data-testid="button-logout">
            <LogOut size={12} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: "0.25rem", background: "hsl(var(--background))",
        border: "1px solid hsl(var(--border))", borderRadius: "0.75rem",
        padding: "0.3rem", marginBottom: "1.5rem",
      }}>
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              title={label}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                gap: "0.5rem", padding: "0.6rem 0.5rem", borderRadius: "0.5rem",
                fontSize: "0.82rem", fontWeight: active ? 600 : 500, border: "none", cursor: "pointer",
                background: active ? "hsl(var(--card))" : "none",
                color: active ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                transition: "all 0.15s",
              }}
              data-testid={`tab-${id}`}
            >
              <Icon size={15} />
              <span className="tab-label-text">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab === "info" && (
        <AccountInfoTab user={user} setUser={(u) => setUser(u)} />
      )}
      {activeTab === "orders" && <OrdersTab user={user} />}
      {activeTab === "tickets" && <TicketsTab user={user} />}
      {activeTab === "security" && <SecurityTab user={user} />}
    </div>
  );
}
