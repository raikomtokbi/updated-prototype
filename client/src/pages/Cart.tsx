import { Link, useLocation } from "wouter";
import { Trash2, ShoppingBag, Plus, Minus, ArrowLeft, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCartStore } from "@/lib/store/cartStore";
import { getCurrencySymbol } from "@/lib/currency";

interface Fee {
  id: string;
  name: string;
  amount: string;
  type: "fixed" | "percentage";
  isActive: boolean;
}

export default function Cart() {
  const [, navigate] = useLocation();
  const { items, removeItem, updateQuantity, getCartTotal, clearCart } = useCartStore();
  const { data: siteSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
  });
  const { data: fees = [] } = useQuery<Fee[]>({
    queryKey: ["/api/fees"],
  });
  const currencySymbol = getCurrencySymbol(siteSettings?.default_currency ?? "USD");

  const taxEnabled = siteSettings?.tax_enabled === "true";
  const taxRate = parseFloat(siteSettings?.tax_rate ?? "0") / 100;
  const taxName = siteSettings?.tax_name || "VAT";

  const subtotal = getCartTotal();
  const taxAmount = taxEnabled ? subtotal * taxRate : 0;
  
  // Calculate fees
  let totalFees = 0;
  fees.forEach(fee => {
    const feeAmount = fee.type === "percentage" 
      ? subtotal * (parseFloat(fee.amount) / 100)
      : parseFloat(fee.amount);
    totalFees += feeAmount;
  });
  
  const total = subtotal + taxAmount + totalFees;

  if (items.length === 0) {
    return (
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          padding: "6rem 1.5rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            background: "hsla(258,90%,66%,0.1)",
            border: "1px solid hsla(258,90%,66%,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
          }}
        >
          <ShoppingBag size={36} style={{ color: "hsl(var(--primary))" }} />
        </div>
        <h2
          className="font-orbitron"
          style={{ fontSize: "1.5rem", fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: "0.75rem" }}
        >
          Your Cart is Empty
        </h2>
        <p style={{ color: "hsl(var(--muted-foreground))", marginBottom: "2rem", lineHeight: 1.7, fontSize: "0.9rem" }}>
          Browse our game products and add items to your cart to get started.
        </p>
        <Link href="/products" className="btn-primary" data-testid="link-browse-products">
          <ArrowLeft size={16} />
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <h1
          className="font-orbitron"
          style={{ fontSize: "1.75rem", fontWeight: 700, color: "hsl(var(--foreground))" }}
        >
          Your Cart
        </h1>
        <button
          onClick={clearCart}
          className="btn-secondary"
          style={{ fontSize: "0.8rem", padding: "0.45rem 0.9rem", color: "hsl(0,72%,60%)", borderColor: "hsla(0,72%,51%,0.3)" }}
          data-testid="button-clear-cart"
        >
          <Trash2 size={14} />
          Clear Cart
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {items.map((item) => (
          <div
            key={item.id}
            data-testid={`card-cart-item-${item.id}`}
            style={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.75rem",
              padding: "1.25rem",
              display: "flex",
              gap: "1rem",
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            {/* Product image placeholder */}
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "0.5rem",
                background: "hsl(var(--card))",
                flexShrink: 0,
                overflow: "hidden",
              }}
            >
              {item.productImage ? (
                <img src={item.productImage} alt={item.productTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : null}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: "0.25rem" }}>
                {item.productTitle}
              </h3>
              <p style={{ fontSize: "0.78rem", color: "hsl(var(--muted-foreground))", marginBottom: "0.4rem" }}>
                Package: {item.packageName}
              </p>
              <p style={{ fontSize: "0.78rem", color: "hsl(var(--muted-foreground))" }}>
                Player ID: <span style={{ color: "hsl(var(--muted-foreground))" }}>{item.userId}</span>
                {item.zoneId && (
                  <> · Zone: <span style={{ color: "hsl(var(--muted-foreground))" }}>{item.zoneId}</span></>
                )}
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.75rem" }}>
              <span
                className="font-orbitron"
                style={{ fontSize: "1rem", fontWeight: 700, color: "hsl(var(--primary))" }}
              >
                {currencySymbol}{(item.price * item.quantity).toFixed(2)}
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button
                  onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeItem(item.id)}
                  data-testid={`button-decrease-${item.id}`}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "0.35rem",
                    border: "1px solid hsl(var(--border))",
                    background: "transparent",
                    color: "hsl(var(--muted-foreground))",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Minus size={12} />
                </button>
                <span
                  data-testid={`text-quantity-${item.id}`}
                  style={{ minWidth: "24px", textAlign: "center", fontSize: "0.875rem", fontWeight: 600, color: "hsl(var(--foreground))" }}
                >
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  data-testid={`button-increase-${item.id}`}
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "0.35rem",
                    border: "1px solid hsl(var(--border))",
                    background: "transparent",
                    color: "hsl(var(--muted-foreground))",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Plus size={12} />
                </button>
              </div>

              <button
                onClick={() => removeItem(item.id)}
                data-testid={`button-remove-${item.id}`}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "hsl(0,72%,55%)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontSize: "0.75rem",
                  padding: "0.2rem 0",
                }}
              >
                <Trash2 size={12} />
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Order summary */}
      <div
        style={{
          marginTop: "2rem",
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "0.75rem",
          padding: "1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: "1.25rem" }}>
          Order Summary
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
            <span style={{ color: "hsl(var(--muted-foreground))" }}>Subtotal ({items.length} {items.length === 1 ? "item" : "items"})</span>
            <span style={{ color: "hsl(var(--foreground))" }}>{currencySymbol}{subtotal.toFixed(2)}</span>
          </div>
          {fees.length > 0 && fees.map((fee) => {
            const feeAmount = fee.type === "percentage"
              ? subtotal * (parseFloat(fee.amount) / 100)
              : parseFloat(fee.amount);
            return (
              <div key={fee.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                <span style={{ color: "hsl(var(--muted-foreground))" }}>
                  {fee.name}
                  {fee.type === "percentage" && ` (${parseFloat(fee.amount).toFixed(2)}%)`}
                </span>
                <span style={{ color: "hsl(var(--foreground))" }}>{currencySymbol}{feeAmount.toFixed(2)}</span>
              </div>
            );
          })}
          {taxEnabled && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
              <span style={{ color: "hsl(var(--muted-foreground))" }}>
                {taxName} ({(taxRate * 100).toFixed(taxRate * 100 % 1 === 0 ? 0 : 2)}%)
              </span>
              <span data-testid="text-tax-amount" style={{ color: "hsl(var(--foreground))" }}>
                {currencySymbol}{taxAmount.toFixed(2)}
              </span>
            </div>
          )}
        </div>
        <hr style={{ border: "none", borderTop: "1px solid hsl(var(--border))", marginBottom: "1.25rem" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <span style={{ fontSize: "1rem", fontWeight: 700, color: "hsl(var(--foreground))" }}>Total</span>
          <span
            className="font-orbitron"
            data-testid="text-cart-total"
            style={{ fontSize: "1.25rem", fontWeight: 800, color: "hsl(var(--primary))" }}
          >
            {currencySymbol}{total.toFixed(2)}
          </span>
        </div>

        <button
          className="btn-primary"
          style={{ width: "100%" }}
          data-testid="button-checkout"
          onClick={() => navigate("/checkout?from=cart&fromName=Cart")}
        >
          Proceed to Checkout <ArrowRight size={16} />
        </button>
        <Link
          href="/products"
          className="btn-secondary"
          style={{ width: "100%", marginTop: "0.75rem", textAlign: "center" }}
          data-testid="link-continue-shopping"
        >
          <ArrowLeft size={16} />
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
