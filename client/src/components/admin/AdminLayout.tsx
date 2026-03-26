import { Link, useLocation, Redirect } from "wouter";
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
} from "lucide-react";
import { useAuthStore } from "@/lib/store/authstore";

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
        borderRight: "1px solid hsl(220, 15%, 13%)",
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
          padding: "16px 20px",
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
                <Link key={item.path} href={item.path}>
                  <a
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
                  </a>
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
        }}
      >
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 40,
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
            background: "hsl(220, 20%, 7%)",
            borderBottom: "1px solid hsl(220, 15%, 13%)",
            minHeight: "52px",
            flexShrink: 0,
          }}
        >
          <h1 style={{ fontSize: "14px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>
            {title}
          </h1>
        </header>
        <main style={{ flex: 1, padding: "24px" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
