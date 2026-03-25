import { Link, useLocation } from "wouter";
import { User, LogOut, ShoppingBag, Shield, ChevronRight } from "lucide-react";
import { useAuthStore } from "@/lib/store/authstore";
import { useCartStore } from "@/lib/store/cartStore";

export default function Account() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const itemCount = useCartStore((s) => s.getItemCount());

  if (!isAuthenticated) {
    return (
      <div
        style={{
          maxWidth: "480px",
          margin: "0 auto",
          padding: "6rem 1.5rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: "hsla(258,90%,66%,0.1)",
            border: "1px solid hsla(258,90%,66%,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
          }}
        >
          <User size={32} style={{ color: "hsl(258,90%,66%)" }} />
        </div>
        <h2
          className="font-orbitron"
          style={{ fontSize: "1.5rem", fontWeight: 700, color: "hsl(210,40%,92%)", marginBottom: "0.75rem" }}
        >
          Not Signed In
        </h2>
        <p style={{ fontSize: "0.875rem", color: "hsl(220,10%,50%)", marginBottom: "2rem", lineHeight: 1.6 }}>
          Sign in to manage your orders, view history and access exclusive offers.
        </p>
        <Link href="/login" className="btn-primary" data-testid="link-sign-in">
          Sign In to Your Account
        </Link>
      </div>
    );
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  const ROLE_LABELS: Record<string, { label: string; color: string }> = {
    super_admin: { label: "Super Admin", color: "hsl(0,72%,65%)" },
    admin: { label: "Admin", color: "hsl(258,90%,70%)" },
    staff: { label: "Staff", color: "hsl(196,100%,55%)" },
    user: { label: "Member", color: "hsl(145,70%,55%)" },
  };
  const roleInfo = ROLE_LABELS[user!.role] ?? { label: user!.role, color: "hsl(220,10%,60%)" };

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      {/* Header card */}
      <div
        style={{
          background: "hsl(220,20%,9%)",
          border: "1px solid hsl(220,15%,16%)",
          borderRadius: "1rem",
          padding: "2rem",
          display: "flex",
          alignItems: "center",
          gap: "1.5rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            width: "70px",
            height: "70px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, hsl(258,90%,45%), hsl(196,100%,40%))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.username}
              style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
            />
          ) : (
            <span
              className="font-orbitron"
              style={{ fontSize: "1.5rem", fontWeight: 800, color: "white" }}
            >
              {user!.username.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            className="font-orbitron"
            style={{ fontSize: "1.4rem", fontWeight: 800, color: "hsl(210,40%,95%)", marginBottom: "0.35rem" }}
            data-testid="text-username"
          >
            {user?.fullName || user?.username}
          </h1>
          {user?.email && (
            <p style={{ fontSize: "0.85rem", color: "hsl(220,10%,50%)", marginBottom: "0.5rem" }}>
              {user.email}
            </p>
          )}
          <span
            className="badge"
            style={{
              background: `${roleInfo.color}20`,
              color: roleInfo.color,
              border: `1px solid ${roleInfo.color}40`,
            }}
          >
            {roleInfo.label}
          </span>
        </div>

        <button
          onClick={handleLogout}
          className="btn-secondary"
          style={{ fontSize: "0.8rem", color: "hsl(0,72%,60%)", borderColor: "hsla(0,72%,51%,0.3)" }}
          data-testid="button-logout"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {[
          { label: "Cart Items", value: itemCount, icon: ShoppingBag, color: "hsl(258,90%,66%)" },
          { label: "Account Status", value: "Active", icon: Shield, color: "hsl(145,70%,55%)" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            style={{
              background: "hsl(220,20%,9%)",
              border: "1px solid hsl(220,15%,16%)",
              borderRadius: "0.75rem",
              padding: "1.25rem",
              display: "flex",
              gap: "0.75rem",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "0.5rem",
                background: `${color}18`,
                border: `1px solid ${color}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon size={18} style={{ color }} />
            </div>
            <div>
              <div className="font-orbitron" style={{ fontSize: "1.1rem", fontWeight: 700, color: "hsl(210,40%,92%)" }}>
                {value}
              </div>
              <div style={{ fontSize: "0.75rem", color: "hsl(220,10%,50%)" }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div
        style={{
          background: "hsl(220,20%,9%)",
          border: "1px solid hsl(220,15%,16%)",
          borderRadius: "0.75rem",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid hsl(220,15%,14%)" }}>
          <h2 style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(220,10%,55%)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            Quick Actions
          </h2>
        </div>
        {[
          { label: "Browse Products", desc: "Find and top up your games", href: "/products", icon: ShoppingBag },
          { label: "View Cart", desc: `${itemCount} item${itemCount !== 1 ? "s" : ""} ready`, href: "/cart", icon: ShoppingBag },
        ].map(({ label, desc, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "1rem 1.5rem",
              textDecoration: "none",
              borderBottom: "1px solid hsl(220,15%,14%)",
              transition: "background 0.15s",
            }}
            data-testid={`link-quick-${label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "0.5rem",
                background: "hsla(258,90%,66%,0.08)",
                border: "1px solid hsla(258,90%,66%,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon size={16} style={{ color: "hsl(258,90%,70%)" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(210,40%,90%)" }}>{label}</div>
              <div style={{ fontSize: "0.75rem", color: "hsl(220,10%,50%)" }}>{desc}</div>
            </div>
            <ChevronRight size={16} style={{ color: "hsl(220,10%,40%)" }} />
          </Link>
        ))}
      </div>
    </div>
  );
}
