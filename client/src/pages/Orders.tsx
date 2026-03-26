import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/authstore";
import { Link } from "wouter";
import { ShoppingBag, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface Order {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  items?: { productTitle: string; packageName: string; quantity: number; price: number }[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "hsl(45,80%,60%)", icon: Clock },
  processing: { label: "Processing", color: "hsl(195,80%,60%)", icon: AlertCircle },
  completed: { label: "Completed", color: "hsl(142,60%,55%)", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "hsl(0,72%,60%)", icon: XCircle },
  refunded: { label: "Refunded", color: "hsl(220,10%,55%)", icon: XCircle },
};

export default function Orders() {
  const { isAuthenticated, user } = useAuthStore();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          padding: "4rem 1.5rem",
          textAlign: "center",
        }}
      >
        <ShoppingBag size={48} style={{ color: "hsl(258,90%,66%)", opacity: 0.4, marginBottom: "1rem" }} />
        <h2
          className="font-orbitron"
          style={{ fontSize: "1.25rem", fontWeight: 700, color: "hsl(210,40%,90%)", marginBottom: "0.5rem" }}
        >
          Sign In to View Orders
        </h2>
        <p style={{ fontSize: "0.875rem", color: "hsl(220,10%,50%)", marginBottom: "1.5rem" }}>
          You need to be signed in to view your order history.
        </p>
        <Link href="/login">
          <button className="btn-primary">Sign In</button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            style={{
              height: "100px",
              background: "hsl(220,20%,9%)",
              border: "1px solid hsl(220,15%,14%)",
              borderRadius: "0.75rem",
              marginBottom: "1rem",
              animation: "pulse 1.5s infinite",
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1
          className="font-orbitron"
          style={{ fontSize: "1.75rem", fontWeight: 700, color: "hsl(210,40%,95%)", marginBottom: "0.5rem" }}
        >
          My Orders
        </h1>
        <p style={{ fontSize: "0.875rem", color: "hsl(220,10%,55%)" }}>
          Your complete order history, {user?.username}.
        </p>
      </div>

      {orders.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "4rem 1rem",
            background: "hsl(220,20%,9%)",
            border: "1px solid hsl(220,15%,16%)",
            borderRadius: "1rem",
          }}
        >
          <ShoppingBag size={48} style={{ color: "hsl(258,90%,66%)", opacity: 0.3, marginBottom: "1rem" }} />
          <h3 style={{ color: "hsl(210,40%,80%)", marginBottom: "0.5rem" }}>No orders yet</h3>
          <p style={{ fontSize: "0.875rem", color: "hsl(220,10%,50%)", marginBottom: "1.5rem" }}>
            Once you place an order it will appear here.
          </p>
          <Link href="/products">
            <button className="btn-primary">Browse Products</button>
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {orders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
            const StatusIcon = cfg.icon;
            return (
              <div
                key={order.id}
                style={{
                  background: "hsl(220,20%,9%)",
                  border: "1px solid hsl(220,15%,18%)",
                  borderRadius: "0.75rem",
                  padding: "1.25rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div>
                    <p style={{ fontSize: "0.75rem", color: "hsl(220,10%,45%)", marginBottom: "0.2rem" }}>
                      Order #{order.id}
                    </p>
                    <p style={{ fontSize: "0.75rem", color: "hsl(220,10%,40%)" }}>
                      {new Date(order.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        padding: "0.25rem 0.65rem",
                        borderRadius: "0.4rem",
                        background: `${cfg.color}1a`,
                        border: `1px solid ${cfg.color}44`,
                        color: cfg.color,
                        fontSize: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      <StatusIcon size={12} />
                      {cfg.label}
                    </span>
                    <span
                      style={{
                        fontSize: "1rem",
                        fontWeight: 700,
                        color: "hsl(258,90%,72%)",
                      }}
                    >
                      ${Number(order.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>

                {order.items && order.items.length > 0 && (
                  <div
                    style={{
                      borderTop: "1px solid hsl(220,15%,14%)",
                      paddingTop: "0.75rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.4rem",
                    }}
                  >
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.8rem",
                          color: "hsl(220,10%,55%)",
                        }}
                      >
                        <span>
                          {item.productTitle} — {item.packageName} ×{item.quantity}
                        </span>
                        <span>${Number(item.price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
