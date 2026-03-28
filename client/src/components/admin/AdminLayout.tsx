import { Link, useLocation, Redirect } from "wouter";
import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
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
  Palette,
  FileEdit,
  ChevronDown,
  LogOut,
  User,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/authstore";
import { useSiteStore, type SiteStatus } from "@/lib/store/siteStore";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "",
    items: [
      { label: "Dashboard", icon: <LayoutDashboard size={15} />, path: "/admin" },
    ],
  },
  {
    title: "ORDERS",
    items: [
      { label: "Top up orders", icon: <ShoppingCart size={15} />, path: "/admin/topup-orders" },
      { label: "Voucher orders", icon: <Tag size={15} />, path: "/admin/voucher-orders" },
    ],
  },
  {
    title: "TRANSACTIONS",
    items: [
      { label: "Payment", icon: <CreditCard size={15} />, path: "/admin/payments" },
      { label: "Refund", icon: <RotateCcw size={15} />, path: "/admin/refunds" },
    ],
  },
  {
    title: "TICKET",
    items: [
      { label: "Support tickets", icon: <LifeBuoy size={15} />, path: "/admin/support-tickets" },
    ],
  },
  {
    title: "PRODUCT",
    items: [
      { label: "Games", icon: <Gamepad2 size={15} />, path: "/admin/games" },
      { label: "Vouchers", icon: <Ticket size={15} />, path: "/admin/vouchers" },
      { label: "Subscription", icon: <RefreshCcw size={15} />, path: "/admin/subscriptions" },
    ],
  },
  {
    title: "USER MANAGER",
    items: [
      { label: "User", icon: <Users size={15} />, path: "/admin/users" },
      { label: "Subscriber", icon: <UserCheck size={15} />, path: "/admin/subscribers" },
    ],
  },
  {
    title: "MARKETING",
    items: [
      { label: "Campaigns", icon: <Megaphone size={15} />, path: "/admin/campaigns" },
      { label: "Coupons", icon: <BadgePercent size={15} />, path: "/admin/coupons" },
    ],
  },
  {
    title: "SETTINGS",
    items: [
      { label: "Control Panel", icon: <Settings size={15} />, path: "/admin/control-panel" },
      { label: "Payment method", icon: <Wallet size={15} />, path: "/admin/payment-method" },
      { label: "Api integration", icon: <Plug size={15} />, path: "/admin/api-integration" },
    ],
  },
  {
    title: "THEME",
    items: [
      { label: "Choose theme", icon: <Palette size={15} />, path: "/admin/choose-theme" },
      { label: "Edit Content", icon: <FileEdit size={15} />, path: "/admin/edit-content" },
    ],
  },
];

function AdminSidebar() {
  const [location] = useLocation();

  return (
    <aside
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: "256px",
        height: "100vh",
        background: "hsl(220, 20%, 7%)",
        borderRight: "none",
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "0 20px",
          height: "52px",
          borderBottom: "1px solid hsl(220, 15%, 13%)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "6px",
            background: "hsl(258, 90%, 66%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <LayoutDashboard size={14} color="white" />
        </div>
        <span style={{ fontWeight: 600, fontSize: "14px", color: "hsl(210, 40%, 95%)", letterSpacing: "0.02em" }}>
          Admin Panel
        </span>
      </div>

      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
        {navSections.map((section) => (
          <div key={section.title || "root"} style={{ marginBottom: "2px" }}>
            {section.title && (
              <div
                style={{
                  padding: "14px 16px 4px",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "hsl(220, 10%, 38%)",
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
                    gap: "10px",
                    margin: "1px 8px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    cursor: "pointer",
                    textDecoration: "none",
                    color: isActive ? "hsl(210, 40%, 95%)" : "hsl(220, 10%, 52%)",
                    background: isActive ? "rgba(139, 92, 246, 0.12)" : "transparent",
                    borderLeft: isActive ? "2px solid hsl(258, 90%, 66%)" : "2px solid transparent",
                    transition: "background 0.15s, color 0.15s",
                  }}
                >
                  <span style={{ color: isActive ? "hsl(258, 90%, 66%)" : "hsl(220, 10%, 42%)", flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ padding: "12px 20px", borderTop: "1px solid hsl(220, 15%, 13%)", flexShrink: 0 }}>
        <p style={{ fontSize: "11px", color: "hsl(220, 10%, 35%)" }}>Admin v1.0</p>
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

function StatusButton() {
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
          gap: "7px",
          padding: "6px 12px",
          background: "hsl(220, 20%, 11%)",
          border: "1px solid hsl(220, 15%, 18%)",
          borderRadius: "6px",
          cursor: "pointer",
          color: "hsl(210, 40%, 90%)",
          fontSize: "12px",
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: dotColor, flexShrink: 0, boxShadow: `0 0 5px ${dotColor}` }} />
        {label}
        <ChevronDown size={13} style={{ opacity: 0.5, marginLeft: "2px" }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: "150px",
            background: "hsl(220, 20%, 10%)",
            border: "1px solid hsl(220, 15%, 18%)",
            borderRadius: "8px",
            overflow: "hidden",
            zIndex: 100,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ padding: "6px 12px", fontSize: "10px", color: "hsl(220, 10%, 38%)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid hsl(220, 15%, 15%)" }}>
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
                background: status === opt.value ? "rgba(139, 92, 246, 0.1)" : "transparent",
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
              {status === opt.value && <span style={{ marginLeft: "auto", fontSize: "10px", color: "hsl(258, 90%, 66%)" }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminAccountButton() {
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
          gap: "8px",
          padding: "5px 10px 5px 5px",
          background: "hsl(220, 20%, 11%)",
          border: "1px solid hsl(220, 15%, 18%)",
          borderRadius: "6px",
          cursor: "pointer",
          color: "hsl(210, 40%, 90%)",
        }}
      >
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "hsl(258, 90%, 30%)",
            border: "1.5px solid hsl(258, 90%, 66%)",
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
        <span style={{ fontSize: "12px", fontWeight: 500, maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayName}
        </span>
        <ChevronDown size={13} style={{ opacity: 0.5 }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: "170px",
            background: "hsl(220, 20%, 10%)",
            border: "1px solid hsl(220, 15%, 18%)",
            borderRadius: "8px",
            overflow: "hidden",
            zIndex: 100,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ padding: "10px 14px", borderBottom: "1px solid hsl(220, 15%, 15%)" }}>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "hsl(210, 40%, 90%)" }}>{displayName}</div>
            <div style={{ fontSize: "11px", color: "hsl(220, 10%, 42%)", marginTop: "2px" }}>{user?.role?.replace("_", " ")}</div>
          </div>
          {[
            { icon: <User size={13} />, label: "Profile", action: () => { navigate("/account"); setOpen(false); } },
            { icon: <Settings size={13} />, label: "Settings", action: () => { navigate("/admin/control-panel"); setOpen(false); } },
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
              <span style={{ color: "hsl(220, 10%, 42%)" }}>{item.icon}</span>
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
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const { isStaff, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (!isStaff()) {
    return <Redirect to="/" />;
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "hsl(220, 20%, 6%)" }}>
      <AdminSidebar />
      <div
        style={{
          marginLeft: "256px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          minHeight: "100vh",
          borderLeft: "1px solid hsl(220, 15%, 13%)",
        }}
      >
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            background: "hsl(220, 20%, 7%)",
            borderBottom: "1px solid hsl(220, 15%, 13%)",
            minHeight: "52px",
            flexShrink: 0,
            gap: "12px",
          }}
        >
          <h1 style={{ fontSize: "14px", fontWeight: 600, color: "hsl(210, 40%, 95%)", flexShrink: 0 }}>
            {title}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <StatusButton />
            <AdminAccountButton />
          </div>
        </header>
        <main style={{ flex: 1, padding: "24px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
