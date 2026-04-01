import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useCartStore } from "@/lib/store/cartStore";
import { useQuery } from "@tanstack/react-query";
import { getCurrencySymbol } from "@/lib/currency";

export default function Checkout() {
  const [, navigate] = useLocation();
  const { items, getCartTotal, clearCart } = useCartStore();
  const [email, setEmail] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const { data: siteSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
  });

  const currencySymbol = getCurrencySymbol(siteSettings?.default_currency ?? "USD");
  const taxEnabled = siteSettings?.tax_enabled === "true";
  const taxRate = parseFloat(siteSettings?.tax_rate ?? "0") / 100;
  const taxName = siteSettings?.tax_name || "VAT";

  const subtotal = getCartTotal();
  const taxAmount = taxEnabled ? subtotal * taxRate : 0;
  const total = subtotal + taxAmount;

  if (items.length === 0) {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "3rem 1.5rem", textAlign: "center" }}>
        <h2 className="font-orbitron" style={{ fontSize: "1.5rem", fontWeight: 700, color: "hsl(210,40%,90%)", marginBottom: "1rem" }}>
          Your Cart is Empty
        </h2>
        <p style={{ color: "hsl(220,10%,50%)", marginBottom: "2rem" }}>
          Add items to your cart before proceeding to checkout.
        </p>
        <Link href="/products" className="btn-primary" data-testid="link-browse-products">
          <ArrowLeft size={16} />
          Continue Shopping
        </Link>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "3rem 1.5rem", textAlign: "center" }}>
        <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "hsla(142,70%,55%,0.15)", border: "2px solid hsl(142,70%,55%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
          <span style={{ fontSize: "2rem" }}>✓</span>
        </div>
        <h2 className="font-orbitron" style={{ fontSize: "1.5rem", fontWeight: 700, color: "hsl(210,40%,90%)", marginBottom: "1rem" }}>
          Order Placed Successfully!
        </h2>
        <p style={{ color: "hsl(220,10%,55%)", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
          Confirmation email sent to:
        </p>
        <p style={{ color: "hsl(210,40%,88%)", marginBottom: "2rem", fontSize: "0.95rem", fontWeight: 600 }}>
          {email}
        </p>
        <div style={{ background: "hsla(258,90%,66%,0.1)", border: "1px solid hsla(258,90%,66%,0.2)", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "2rem", textAlign: "left" }}>
          <p style={{ fontSize: "0.8rem", color: "hsl(220,10%,55%)", marginBottom: "0.5rem" }}>
            <strong>Order Total:</strong>
          </p>
          <p className="font-orbitron" style={{ fontSize: "1.5rem", fontWeight: 800, color: "hsl(258,90%,72%)" }}>
            {currencySymbol}{total.toFixed(2)}
          </p>
        </div>
        <p style={{ color: "hsl(220,10%,55%)", marginBottom: "2rem", fontSize: "0.85rem", lineHeight: 1.6 }}>
          Your digital products will be delivered to the email address above within minutes. Check your spam folder if you don't see the email.
        </p>
        <Link href="/products" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }} data-testid="link-shop-again">
          Continue Shopping
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      alert("Please enter a valid email address");
      return;
    }
    setIsProcessing(true);
    // Simulate order processing
    setTimeout(() => {
      setOrderPlaced(true);
      clearCart();
    }, 1500);
  };

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <Link href="/cart" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "hsl(220,10%,60%)", marginBottom: "1.5rem", textDecoration: "none", cursor: "pointer", fontSize: "0.9rem" }} data-testid="link-back-to-cart">
        <ArrowLeft size={16} />
        Back to Cart
      </Link>

      <h1 className="font-orbitron" style={{ fontSize: "1.75rem", fontWeight: 700, color: "hsl(210,40%,95%)", marginBottom: "2rem" }}>
        Checkout
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
        {/* Left: Checkout Form */}
        <div>
          <form onSubmit={handleSubmitOrder}>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "hsl(210,40%,90%)", marginBottom: "0.5rem" }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                data-testid="input-email"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid hsl(220,15%,18%)",
                  background: "hsl(220,20%,11%)",
                  color: "hsl(210,40%,92%)",
                  fontSize: "0.9rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <p style={{ fontSize: "0.75rem", color: "hsl(220,10%,50%)", marginTop: "0.3rem" }}>
                Your order details will be sent to this email
              </p>
            </div>

            <div style={{ background: "hsla(142,70%,55%,0.1)", border: "1px solid hsla(142,70%,55%,0.3)", borderRadius: "0.75rem", padding: "1rem", marginBottom: "1.5rem", display: "flex", gap: "0.75rem" }}>
              <AlertCircle size={18} style={{ color: "hsl(142,70%,55%)", flexShrink: 0 }} />
              <div style={{ fontSize: "0.8rem", color: "hsl(142,70%,60%)" }}>
                <strong>Digital Delivery:</strong> Your products will be delivered instantly via email after payment confirmation.
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="btn-primary"
              style={{
                width: "100%",
                opacity: isProcessing ? 0.7 : 1,
                cursor: isProcessing ? "not-allowed" : "pointer",
              }}
              data-testid="button-place-order"
            >
              {isProcessing ? "Processing..." : (
                <>
                  Complete Order <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right: Order Summary */}
        <div style={{ background: "hsl(220,20%,9%)", border: "1px solid hsl(220,15%,16%)", borderRadius: "0.75rem", padding: "1.5rem", position: "sticky", top: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "hsl(210,40%,92%)", marginBottom: "1.25rem" }}>
            Order Summary
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem", maxHeight: "300px", overflowY: "auto", paddingRight: "0.5rem" }}>
            {items.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", paddingBottom: "0.75rem", borderBottom: "1px solid hsl(220,15%,16%)" }}>
                <div>
                  <div style={{ color: "hsl(210,40%,92%)", fontWeight: 600 }}>{item.productTitle}</div>
                  <div style={{ color: "hsl(220,10%,50%)", fontSize: "0.75rem", marginTop: "0.2rem" }}>
                    {item.packageName} × {item.quantity}
                  </div>
                </div>
                <div style={{ color: "hsl(210,40%,88%)", fontWeight: 600 }}>
                  {currencySymbol}{(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <hr style={{ border: "none", borderTop: "1px solid hsl(220,15%,16%)", margin: "1rem 0" }} />

          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
              <span style={{ color: "hsl(220,10%,55%)" }}>Subtotal</span>
              <span style={{ color: "hsl(210,40%,88%)" }}>{currencySymbol}{subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
              <span style={{ color: "hsl(220,10%,55%)" }}>Processing Fee</span>
              <span style={{ color: "hsl(145,70%,55%)" }}>Free</span>
            </div>
            {taxEnabled && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                <span style={{ color: "hsl(220,10%,55%)" }}>
                  {taxName} ({(taxRate * 100).toFixed(taxRate * 100 % 1 === 0 ? 0 : 2)}%)
                </span>
                <span style={{ color: "hsl(210,40%,88%)" }}>{currencySymbol}{taxAmount.toFixed(2)}</span>
              </div>
            )}
          </div>

          <hr style={{ border: "none", borderTop: "1px solid hsl(220,15%,16%)", margin: "1rem 0" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "hsl(210,40%,92%)" }}>Total</span>
            <span className="font-orbitron" style={{ fontSize: "1.25rem", fontWeight: 800, color: "hsl(258,90%,72%)" }} data-testid="text-checkout-total">
              {currencySymbol}{total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
