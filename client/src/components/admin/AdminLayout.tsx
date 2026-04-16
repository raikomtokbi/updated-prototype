import { Link, useLocation, Redirect } from "wouter";
import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  BarChart2,
  ShoppingCart,
  Tag,
  CreditCard,
  RotateCcw,
  LifeBuoy,
  Gamepad2,
  Ticket,
  RefreshCcw,
  Users,
  UserCheck,
  Megaphone,
  BadgePercent,
  Settings,
  Wallet,
  Plug,
  Package,
  Palette,
  FileEdit,
  ChevronDown,
  LogOut,
  User,
  Bell,
  CheckCheck,
  ShoppingBag,
  AlertTriangle,
  Info,
  Menu,
  Mail,
  X,
  Trash2,
  Key,
  Zap,
} from "lucide-react";

import { useAuthStore } from "@/lib/store/authstore";
import { useSiteStore, type SiteStatus } from "@/lib/store/siteStore";
import { adminApi } from "@/lib/store/useAdmin";
import type { Notification } from "@shared/schema";

export function useMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < breakpoint);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  permKey?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "",
    items: [
      { label: "Dashboard", icon: <LayoutDashboard size={15} />, path: "/admin", permKey: "dashboard" },
      { label: "Analytics", icon: <BarChart2 size={15} />, path: "/admin/analytics", permKey: "analytics" },
    ],
  },
  {
    title: "ORDERS",
    items: [
      { label: "Top up orders", icon: <ShoppingCart size={15} />, path: "/admin/topup-orders", permKey: "topup_orders" },
      { label: "Voucher orders", icon: <Tag size={15} />, path: "/admin/voucher-orders", permKey: "voucher_orders" },
    ],
  },
  {
    title: "TRANSACTIONS",
    items: [
      { label: "Payment", icon: <CreditCard size={15} />, path: "/admin/payments", permKey: "payments" },
      { label: "Refund", icon: <RotateCcw size={15} />, path: "/admin/refunds", permKey: "refunds" },
    ],
  },
  {
    title: "SUPPORT",
    items: [
      { label: "Contact submissions", icon: <Mail size={15} />, path: "/admin/contact-submissions", permKey: "contact_submissions" },
      { label: "Support tickets", icon: <LifeBuoy size={15} />, path: "/admin/support-tickets", permKey: "support_tickets" },
    ],
  },
  {
    title: "PRODUCT",
    items: [
      { label: "Games", icon: <Gamepad2 size={15} />, path: "/admin/games", permKey: "games" },
      { label: "Gift Cards", icon: <Package size={15} />, path: "/admin/gift-cards", permKey: "gift_cards" },
      { label: "Vouchers", icon: <Ticket size={15} />, path: "/admin/vouchers", permKey: "vouchers" },
      { label: "Subscription", icon: <RefreshCcw size={15} />, path: "/admin/subscriptions", permKey: "subscriptions" },
    ],
  },
  {
    title: "USER MANAGER",
    items: [
      { label: "User", icon: <Users size={15} />, path: "/admin/users", permKey: "users" },
      { label: "Subscriber", icon: <UserCheck size={15} />, path: "/admin/subscribers", permKey: "subscribers" },
    ],
  },
  {
    title: "MARKETING",
    items: [
      { label: "Campaigns", icon: <Megaphone size={15} />, path: "/admin/campaigns", permKey: "campaigns" },
      { label: "Coupons", icon: <BadgePercent size={15} />, path: "/admin/coupons", permKey: "coupons" },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      { label: "Control Panel", icon: <Settings size={15} />, path: "/admin/control-panel", permKey: "control_panel" },
      { label: "Payment method", icon: <Wallet size={15} />, path: "/admin/payment-method", permKey: "payment_method" },
      { label: "Api integration", icon: <Plug size={15} />, path: "/admin/api-integration", permKey: "api_integration" },
      { label: "Email Templates", icon: <Mail size={15} />, path: "/admin/email-templates", permKey: "email_templates" },
    ],
  },
  {
    title: "APPEARANCE",
    items: [
      { label: "Theme", icon: <Palette size={15} />, path: "/admin/choose-theme", permKey: "theme" },
      { label: "Content", icon: <FileEdit size={15} />, path: "/admin/edit-content", permKey: "content" },
    ],
  },
  {
    title: "ACCESS",
    items: [
      { label: "Roles & Permissions", icon: <Key size={15} />, path: "/admin/roles-permissions", permKey: "roles_permissions" },
    ],
  },
];

function AdminSidebar({ onClose, animate }: { onClose?: () => void; animate?: boolean }) {
  const [location] = useLocation();
  const { data: siteSettings } = useQuery<Record<string, string>>({ queryKey: ["/api/site-settings"], staleTime: 60000 });
  const siteLogo = siteSettings?.site_logo || "";
  const siteName = siteSettings?.site_name || "Nexcoin";
  const { data: myPerms, isLoading: permsLoading } = useQuery<{ role: string; permissions: string[] }>({
    queryKey: ["/api/admin/my-permissions"],
    queryFn: () => adminApi.get("/my-permissions"),
    staleTime: 30000,
    retry: false,
  });
  const isSuperAdmin = myPerms?.role === "super_admin";
  const permSet = new Set(myPerms?.permissions ?? []);
  // While loading or on error, show all nav items (safe fallback)
  const visibleSections = permsLoading || !myPerms
    ? navSections
    : navSections
        .map(section => ({
          ...section,
          items: section.items.filter(item => !item.permKey || isSuperAdmin || permSet.has(item.permKey)),
        }))
        .filter(section => section.items.length > 0);

  return (
    <aside
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "236px",
        height: "100vh",
        background: "hsl(var(--background))",
        borderRight: "1px solid hsl(var(--input))",
        display: "flex",
        flexDirection: "column",
        zIndex: 200,
        ...(animate ? { animation: "slideInLeft 0.3s ease forwards" } : {}),
      }}
    >
      {animate && <style>{`@keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "0 14px",
          height: "46px",
          borderBottom: "1px solid hsl(220, 15%, 13%)",
          flexShrink: 0,
        }}
      >
        {siteLogo ? (
          <img src={siteLogo} alt={siteName} style={{ width: "28px", height: "28px", objectFit: "contain", borderRadius: "6px", flexShrink: 0 }} />
        ) : (
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: "hsl(var(--primary))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <LayoutDashboard size={14} color="white" />
          </div>
        )}
        <span style={{ fontWeight: 600, fontSize: "13px", color: "hsl(var(--foreground))", letterSpacing: "0.02em", flex: 1 }}>
          {siteLogo ? siteName : "Admin Panel"}
        </span>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "hsl(var(--muted-foreground))",
              borderRadius: "4px",
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {visibleSections.map((section) => (
          <div key={section.title || "root"} style={{ marginBottom: "2px" }}>
            {section.title && (
              <div
                style={{
                  padding: "10px 14px 3px",
                  fontSize: "9px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "hsl(var(--muted-foreground))",
                  textTransform: "uppercase",
                  userSelect: "none",
                }}
              >
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const isActive =
                item.path === "/admin"
                  ? location === "/admin"
                  : location.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    margin: "1px 6px",
                    padding: "6px 10px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    cursor: "pointer",
                    textDecoration: "none",
                    color: isActive ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
                    background: isActive ? "hsl(var(--primary) / 0.12)" : "transparent",
                    borderLeft: isActive ? "2px solid hsl(var(--primary))" : "2px solid transparent",
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  <span style={{ color: isActive ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))", flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: "8px 14px", borderTop: "1px solid hsl(220, 15%, 13%)", flexShrink: 0 }}>
        <p style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))" }}>Admin v1.12.6</p>
      </div>
    </aside>
  );
}

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);
  return { open, setOpen, ref };
}

function notifIcon(type: string) {
  const s = { flexShrink: 0 };
  if (type === "order") return <ShoppingBag size={13} style={s} />;
  if (type === "user") return <User size={13} style={s} />;
  if (type === "alert" || type === "warning") return <AlertTriangle size={13} style={s} />;
  return <Info size={13} style={s} />;
}

function notifColor(type: string) {
  if (type === "order") return "hsl(142, 71%, 45%)";
  if (type === "user") return "hsl(var(--primary))";
  if (type === "alert" || type === "warning") return "hsl(38, 92%, 50%)";
  return "hsl(200, 80%, 55%)";
}

function timeAgo(dateStr: string | Date | null | undefined) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function NotificationBell() {
  const qc = useQueryClient();
  const { open, setOpen, ref } = useDropdown();
  const [confirmingClear, setConfirmingClear] = useState(false);

  useEffect(() => {
    if (!open) setConfirmingClear(false);
  }, [open]);

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["/api/admin/notifications"],
    queryFn: () => adminApi.get("/notifications?limit=15"),
    refetchInterval: 30000,
  });

  const { data: countData } = useQuery<{ count: number }>({
    queryKey: ["/api/admin/notifications/unread-count"],
    queryFn: () => adminApi.get("/notifications/unread-count"),
    refetchInterval: 30000,
  });

  const unread = countData?.count ?? 0;

  const markOne = useMutation({
    mutationFn: (id: string) => adminApi.patch(`/notifications/${id}/read`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/notifications/unread-count"] });
    },
  });

  const markAll = useMutation({
    mutationFn: () => adminApi.patch("/notifications/read-all", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/notifications/unread-count"] });
    },
  });

  const clearAll = useMutation({
    mutationFn: () => adminApi.delete("/notifications/clear-all"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/notifications/unread-count"] });
    },
  });

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        data-testid="button-notifications"
        onClick={() => setOpen(!open)}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "34px",
          height: "34px",
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "6px",
          cursor: "pointer",
          color: "hsl(var(--foreground))",
        }}
      >
        <Bell size={15} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-4px",
              right: "-4px",
              minWidth: "16px",
              height: "16px",
              borderRadius: "8px",
              background: "hsl(0, 72%, 55%)",
              color: "white",
              fontSize: "9px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
              lineHeight: 1,
            }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            width: "auto",
            minWidth: "300px",
            maxWidth: "340px",
            marginLeft: "auto",
            marginRight: "0",
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            overflow: "hidden",
            zIndex: 200,
            boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: "1px solid hsl(220, 15%, 15%)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Bell size={14} style={{ color: "hsl(var(--primary))" }} />
              <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(var(--foreground))" }}>Notifications</span>
              {unread > 0 && (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    background: "rgba(239, 68, 68, 0.15)",
                    color: "hsl(0, 72%, 60%)",
                    padding: "1px 6px",
                    borderRadius: "4px",
                  }}
                >
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                data-testid="button-mark-all-read"
                onClick={() => markAll.mutate()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "11px",
                  color: "hsl(var(--primary))",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px 4px",
                }}
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: "360px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: "12px" }}>
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  data-testid={`notification-${n.id}`}
                  onClick={() => { if (!n.isRead) markOne.mutate(n.id); }}
                  style={{
                    display: "flex",
                    gap: "10px",
                    padding: "12px 16px",
                    borderBottom: "1px solid hsl(var(--input))",
                    background: n.isRead ? "transparent" : "hsl(var(--primary) / 0.05)",
                    cursor: n.isRead ? "default" : "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: `${notifColor(n.type ?? "info")}18`,
                      border: `1px solid ${notifColor(n.type ?? "info")}40`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      color: notifColor(n.type ?? "info"),
                      marginTop: "1px",
                    }}
                  >
                    {notifIcon(n.type ?? "info")}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: "2px" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: n.isRead ? 400 : 600,
                          color: n.isRead ? "hsl(var(--muted-foreground))" : "hsl(var(--foreground))",
                          lineHeight: 1.3,
                        }}
                      >
                        {n.title}
                      </span>
                      {!n.isRead && (
                        <span
                          style={{
                            width: "7px",
                            height: "7px",
                            borderRadius: "50%",
                            background: "hsl(var(--primary))",
                            flexShrink: 0,
                            marginTop: "3px",
                          }}
                        />
                      )}
                    </div>
                    <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginBottom: "4px", lineHeight: 1.4 }}>
                      {n.message}
                    </p>
                    <span style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))" }}>
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={{ padding: "10px 16px", borderTop: "1px solid hsl(220, 15%, 14%)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
            {confirmingClear ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%" }}>
                <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", flex: 1 }}>Remove all notifications?</span>
                <button
                  onClick={() => { clearAll.mutate(); setConfirmingClear(false); }}
                  disabled={clearAll.isPending}
                  style={{ fontSize: "11px", color: "hsl(0, 72%, 55%)", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "4px", cursor: "pointer", padding: "3px 10px", whiteSpace: "nowrap", fontWeight: 600 }}
                >
                  {clearAll.isPending ? "Clearing..." : "Yes, clear"}
                </button>
                <button
                  onClick={() => setConfirmingClear(false)}
                  style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "4px", cursor: "pointer", padding: "3px 10px", whiteSpace: "nowrap" }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <>
                <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>
                  {notifications.length === 0 ? "No notifications" : `Showing ${notifications.length} notifications`}
                </span>
                {notifications.length > 0 && (
                  <button
                    data-testid="button-clear-notifications"
                    onClick={() => setConfirmingClear(true)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "11px",
                      color: "hsl(0, 72%, 55%)",
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      borderRadius: "4px",
                      cursor: "pointer",
                      padding: "3px 8px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Trash2 size={10} />
                    Clear all
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusButton({ compact = false }: { compact?: boolean }) {
  const { status, setStatus } = useSiteStore();
  const { open, setOpen, ref } = useDropdown();

  const isActive = status === "active";
  const dotColor = isActive ? "hsl(142, 71%, 45%)" : "hsl(38, 92%, 50%)";
  const label = isActive ? "Active" : "Maintenance";

  const options: { value: SiteStatus; label: string; color: string }[] = [
    { value: "active", label: "Active", color: "hsl(142, 71%, 45%)" },
    { value: "maintenance", label: "Maintenance", color: "hsl(38, 92%, 50%)" },
  ];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: compact ? "0" : "7px",
          padding: compact ? "6px" : "6px 12px",
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "6px",
          cursor: "pointer",
          color: "hsl(var(--foreground))",
          fontSize: "12px",
          fontWeight: 500,
          whiteSpace: "nowrap",
          minWidth: compact ? "34px" : undefined,
          height: "34px",
          justifyContent: compact ? "center" : undefined,
        }}
      >
        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: dotColor, flexShrink: 0, boxShadow: `0 0 6px ${dotColor}` }} />
        {!compact && label}
        {!compact && <ChevronDown size={13} style={{ opacity: 0.5, marginLeft: "2px" }} />}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: "150px",
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            overflow: "hidden",
            zIndex: 100,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ padding: "6px 12px", fontSize: "10px", color: "hsl(var(--muted-foreground))", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid hsl(220, 15%, 15%)" }}>
            Site Status
          </div>
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatus(opt.value); setOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                padding: "9px 14px",
                background: status === opt.value ? "hsl(var(--primary) / 0.1)" : "transparent",
                border: "none",
                cursor: "pointer",
                color: status === opt.value ? "hsl(258, 90%, 75%)" : "hsl(220, 10%, 65%)",
                fontSize: "13px",
                textAlign: "left",
                transition: "background 0.1s",
              }}
            >
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: opt.color, flexShrink: 0 }} />
              {opt.label}
              {status === opt.value && <span style={{ marginLeft: "auto", fontSize: "10px", color: "hsl(var(--primary))" }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminAccountButton({ compact = false }: { compact?: boolean }) {
  const { user, logout } = useAuthStore();
  const [, navigate] = useLocation();
  const { open, setOpen, ref } = useDropdown();

  const initials = user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : (user?.username ?? "A")[0].toUpperCase();

  const displayName = user?.fullName || user?.username || "Admin";

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: compact ? "0" : "8px",
          padding: compact ? "3px" : "5px 10px 5px 5px",
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "6px",
          cursor: "pointer",
          color: "hsl(var(--foreground))",
          height: "34px",
        }}
      >
        <div
          style={{
            width: "26px",
            height: "26px",
            borderRadius: "50%",
            background: "hsl(258, 90%, 30%)",
            border: "1.5px solid hsl(var(--primary))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 700,
            color: "hsl(258, 90%, 80%)",
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        {!compact && (
          <>
            <span style={{ fontSize: "12px", fontWeight: 500, maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {displayName}
            </span>
            <ChevronDown size={13} style={{ opacity: 0.5 }} />
          </>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: "170px",
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            overflow: "hidden",
            zIndex: 100,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ padding: "10px 14px", borderBottom: "1px solid hsl(220, 15%, 15%)" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "hsl(var(--foreground))" }}>{displayName}</div>
            <div style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginTop: "2px" }}>{user?.role?.replace("_", " ")}</div>
          </div>
          {[
            { icon: <User size={13} />, label: "Profile", action: () => { navigate("/admin/profile"); setOpen(false); } },
            { icon: <ShoppingBag size={13} />, label: "Go back to store", action: () => { navigate("/"); setOpen(false); } },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                padding: "9px 14px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "hsl(220, 10%, 65%)",
                fontSize: "13px",
                textAlign: "left",
              }}
            >
              <span style={{ color: "hsl(var(--muted-foreground))" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
          <div style={{ borderTop: "1px solid hsl(220, 15%, 15%)" }}>
            <button
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                width: "100%",
                padding: "9px 14px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "hsl(0, 72%, 60%)",
                fontSize: "13px",
                textAlign: "left",
              }}
            >
              <LogOut size={13} />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  actions?: React.ReactNode;
  saveBar?: React.ReactNode;
}

export default function AdminLayout({ children, title, actions, saveBar }: AdminLayoutProps) {
  const { isStaff, isAuthenticated } = useAuthStore();
  const isMobile = useMobile(1024);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isMobile) setSidebarOpen(false);
  }, [isMobile]);

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (!isStaff()) {
    return <Redirect to="/" />;
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "hsl(var(--background))" }}>
      {/* Desktop sidebar */}
      {!isMobile && <AdminSidebar />}

      {/* Mobile sidebar overlay + drawer */}
      {isMobile && sidebarOpen && (
        <>
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 190,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(2px)",
            }}
          />
          <AdminSidebar onClose={() => setSidebarOpen(false)} animate />
        </>
      )}

      <div
        style={{
          marginLeft: isMobile ? 0 : "236px",
          width: isMobile ? "100%" : "calc(100% - 236px)",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          borderLeft: isMobile ? "none" : "1px solid hsl(220, 15%, 13%)",
          minWidth: 0,
          overflowX: "clip",
          overflowY: "visible",
        }}
      >
        {/* ── Mobile header ── */}
        {isMobile ? (
          <header
            style={{
              position: "relative",
              zIndex: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 12px",
              background: "hsl(var(--background))",
              borderBottom: "1px solid hsl(220, 15%, 13%)",
              height: "46px",
              flexShrink: 0,
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
              <button
                data-testid="button-mobile-menu"
                onClick={() => setSidebarOpen(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "34px",
                  height: "34px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "hsl(var(--primary))",
                  flexShrink: 0,
                }}
              >
                <Menu size={20} />
              </button>

              <h1 style={{ fontSize: "13px", fontWeight: 600, color: "hsl(var(--foreground))", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {title}
              </h1>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
              <NotificationBell />
              <StatusButton compact />
              <AdminAccountButton compact />
            </div>
          </header>
        ) : (
          /* ── Desktop header ── */
          <header
            style={{
              position: "relative",
              zIndex: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 20px",
              background: "hsl(var(--background))",
              borderBottom: "1px solid hsl(220, 15%, 13%)",
              minHeight: "46px",
              flexShrink: 0,
              gap: "10px",
            }}
          >
            <h1 style={{ fontSize: "13px", fontWeight: 600, color: "hsl(var(--foreground))", flexShrink: 0 }}>
              {title}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginLeft: "auto" }}>
              <NotificationBell />
              <StatusButton />
              <AdminAccountButton />
            </div>
          </header>
        )}

        <main style={{ flex: 1, overflowY: "auto", paddingTop: isMobile ? "10px" : "14px", paddingLeft: isMobile ? "10px" : "14px", paddingRight: isMobile ? "10px" : "14px", paddingBottom: saveBar ? "60px" : isMobile ? "10px" : "14px", fontSize: "12px" }}>
          {/* Toolbar actions strip (Add/Edit buttons etc.) */}
          {actions && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
              {actions}
            </div>
          )}
          {children}
        </main>
      </div>

      {/* ── Fixed bottom save pill ── */}
      {saveBar && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            left: isMobile ? 0 : "236px",
            right: 0,
            zIndex: 200,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              pointerEvents: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 10px 8px 14px",
              background: "hsl(var(--card))",
              border: "1px solid hsl(220,15%,20%)",
              borderRadius: "999px",
              boxShadow: "0 4px 24px rgba(0,0,0,0.55)",
            }}
          >
            <span style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
              <span style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "hsl(38,92%,50%)", flexShrink: 0 }} />
              Unsaved changes
            </span>
            <div className="admin-save-pill-action">
              {saveBar}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
