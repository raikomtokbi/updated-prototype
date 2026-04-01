import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, AlertCircle, CheckCircle, CreditCard, Tag, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useCartStore } from "@/lib/store/cartStore";
import { useQuery } from "@tanstack/react-query";
import { getCurrencySymbol } from "@/lib/currency";

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface ActiveGateway {
  id: string;
  name: string;
  type: string;
  mode: string;
  supportedCurrencies: string;
}

interface Fee {
  id: string;
  name: string;
  amount: string;
  type: "fixed" | "percentage";
  isActive: boolean;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const GATEWAY_COLORS: Record<string, string> = {
  razorpay: "#3395FF",
  payu: "#FF6B35",
  cashfree: "#2D8A4E",
  instamojo: "#FFA500",
  ccavenue: "#C41E3A",
  phonepe: "#5F259F",
  paytm: "#00B9F1",
  easybuzz: "#E91E8C",
  bharatpe: "#003366",
  stripe: "#635BFF",
  paypal: "#0070BA",
  manual: "#6B7280",
};

const GATEWAY_LABELS: Record<string, string> = {
  razorpay: "Razorpay", payu: "PayU", cashfree: "Cashfree",
  instamojo: "Instamojo", ccavenue: "CCAvenue", phonepe: "PhonePe",
  paytm: "Paytm", easybuzz: "EasyBuzz", bharatpe: "BharatPe",
  stripe: "Stripe", paypal: "PayPal", manual: "Manual",
};

const card: React.CSSProperties = {
  background: "hsl(220,20%,9%)",
  border: "1px solid hsl(220,15%,16%)",
  borderRadius: "0.75rem",
  padding: "1.25rem",
};

export default function Checkout() {
  const [, navigate] = useLocation();
  const { items, getCartTotal, clearCart } = useCartStore();
  const [selectedGatewayId, setSelectedGatewayId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  const { data: siteSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
  });

  const { data: gateways = [] } = useQuery<ActiveGateway[]>({
    queryKey: ["/api/payment-methods"],
    select: (data: any[]) => data.filter(g => g.isActive !== false),
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
  
  const total = subtotal + taxAmount + totalFees - couponDiscount;
  const currency = siteSettings?.default_currency ?? "INR";

  useEffect(() => {
    if (gateways.length > 0 && !selectedGatewayId) {
      setSelectedGatewayId(gateways[0].id);
    }
  }, [gateways, selectedGatewayId]);

  useEffect(() => {
    const hasRazorpay = gateways.some(g => g.type === "razorpay");
    if (!hasRazorpay) return;
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { try { document.body.removeChild(script); } catch {} };
  }, [gateways]);

  const selectedGateway = gateways.find(g => g.id === selectedGatewayId) || gateways[0];

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const res = await fetch(`/api/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), amount: subtotal }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setCouponError(data.message || "Invalid or expired coupon");
      } else {
        setCouponApplied(true);
        setCouponDiscount(data.discountAmount ?? 0);
      }
    } catch {
      setCouponError("Could not apply coupon. Try again.");
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setCouponApplied(false);
    setCouponDiscount(0);
    setCouponCode("");
    setCouponError("");
  }

  function submitRedirectForm(formUrl: string, method: string, fields: Record<string, string>) {
    const form = document.createElement("form");
    form.method = method.toLowerCase() === "get" ? "GET" : "POST";
    form.action = formUrl;
    form.style.display = "none";
    Object.entries(fields).forEach(([key, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  }

  async function handlePayment() {
    setErrorMsg("");
    if (!selectedGateway) {
      setErrorMsg("No payment gateway available. Please contact support.");
      return;
    }

    setIsProcessing(true);
    try {
      const productInfo = items.map(i => i.productTitle).join(", ").slice(0, 100);

      const initiateRes = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gatewayId: selectedGateway.id,
          amount: total,
          currency,
          email: "guest@checkout.com",
          name: "Guest",
          productInfo,
          couponCode: couponApplied ? couponCode : undefined,
        }),
      });

      if (!initiateRes.ok) {
        const error = await initiateRes.json();
        throw new Error(error.error || "Failed to initiate payment");
      }

      const result = await initiateRes.json();

      if (result.type === "modal" && result.gatewayType === "razorpay") {
        const rzp = new window.Razorpay({
          key: result.keyId,
          amount: result.amount,
          currency: result.currency,
          name: result.name || "Nexcoin",
          description: result.description || "Order Payment",
          order_id: result.orderId,
          prefill: {},
          handler: async (response: RazorpayResponse) => {
            try {
              const verifyRes = await fetch("/api/payment/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  gatewayId: selectedGateway.id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                setOrderPlaced(true);
                clearCart();
              } else {
                setErrorMsg("Payment verification failed. Please contact support.");
              }
            } catch {
              setErrorMsg("Verification error. Please contact support.");
            } finally {
              setIsProcessing(false);
            }
          },
          modal: {
            ondismiss: () => {
              setIsProcessing(false);
              setErrorMsg("Payment cancelled");
            },
          },
        });
        rzp.open();

      } else if (result.type === "redirect_url") {
        clearCart();
        window.location.href = result.url;

      } else if (result.type === "redirect") {
        clearCart();
        submitRedirectForm(result.formUrl, result.method || "POST", result.fields || {});

      } else {
        throw new Error("Unknown payment response type");
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      setErrorMsg(err.message || "Payment failed. Please try again.");
      setIsProcessing(false);
    }
  }

  if (items.length === 0) {
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "4rem 1.5rem", textAlign: "center" }}>
        <h2 className="font-orbitron" style={{ fontSize: "1.5rem", fontWeight: 700, color: "hsl(210,40%,90%)", marginBottom: "1rem" }}>
          Your Cart is Empty
        </h2>
        <p style={{ color: "hsl(220,10%,50%)", marginBottom: "2rem" }}>
          Add items to your cart before proceeding to checkout.
        </p>
        <Link href="/products" className="btn-primary" data-testid="link-browse-products">
          <ArrowLeft size={16} /> Browse Products
        </Link>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "4rem 1.5rem", textAlign: "center" }}>
        <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "hsla(142,70%,55%,0.15)", border: "2px solid hsl(142,70%,55%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
          <CheckCircle size={40} style={{ color: "hsl(142,70%,55%)" }} />
        </div>
        <h2 className="font-orbitron" style={{ fontSize: "1.5rem", fontWeight: 700, color: "hsl(210,40%,90%)", marginBottom: "1rem" }}>
          Order Placed Successfully!
        </h2>
        <div style={{ background: "hsla(258,90%,66%,0.1)", border: "1px solid hsla(258,90%,66%,0.2)", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "2rem" }}>
          <p className="font-orbitron" style={{ fontSize: "1.5rem", fontWeight: 800, color: "hsl(258,90%,72%)" }}>
            {currencySymbol}{total.toFixed(2)}
          </p>
        </div>
        <p style={{ color: "hsl(220,10%,55%)", marginBottom: "2rem", fontSize: "0.85rem", lineHeight: 1.6 }}>
          Your digital products will be delivered instantly. Check your account orders for details.
        </p>
        <Link href="/products" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }} data-testid="link-shop-again">
          Continue Shopping <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  const noGateways = gateways.length === 0;

  return (
    <div style={{ maxWidth: "520px", margin: "0 auto", padding: "1.5rem 1rem 3rem" }}>
      {/* Back */}
      <Link href="/cart" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "hsl(220,10%,55%)", marginBottom: "1.25rem", textDecoration: "none", fontSize: "0.875rem" }} data-testid="link-back-to-cart">
        <ArrowLeft size={15} /> Back to Cart
      </Link>

      <h1 className="font-orbitron" style={{ fontSize: "1.5rem", fontWeight: 700, color: "hsl(210,40%,95%)", marginBottom: "1.5rem" }}>
        Checkout
      </h1>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* ── Order Summary ── */}
        <div style={card}>
          <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: "hsl(210,40%,85%)", marginBottom: "1rem" }}>
            Order Summary
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", marginBottom: "1rem" }}>
            {items.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(210,40%,92%)" }}>{item.productTitle}</div>
                  <div style={{ fontSize: "0.75rem", color: "hsl(220,10%,50%)", marginTop: "1px" }}>
                    {item.packageName} × {item.quantity}
                  </div>
                </div>
                <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "hsl(210,40%,88%)", whiteSpace: "nowrap" }}>
                  {currencySymbol}{(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid hsl(220,15%,16%)", paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
              <span style={{ color: "hsl(220,10%,52%)" }}>Subtotal</span>
              <span style={{ color: "hsl(210,40%,85%)" }}>{currencySymbol}{subtotal.toFixed(2)}</span>
            </div>
            {fees.length > 0 && fees.map((fee) => {
              const feeAmount = fee.type === "percentage"
                ? subtotal * (parseFloat(fee.amount) / 100)
                : parseFloat(fee.amount);
              return (
                <div key={fee.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                  <span style={{ color: "hsl(220,10%,52%)" }}>
                    {fee.name}
                    {fee.type === "percentage" && ` (${parseFloat(fee.amount).toFixed(2)}%)`}
                  </span>
                  <span style={{ color: "hsl(210,40%,85%)" }}>{currencySymbol}{feeAmount.toFixed(2)}</span>
                </div>
              );
            })}
            {taxEnabled && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span style={{ color: "hsl(220,10%,52%)" }}>{taxName} ({(taxRate * 100).toFixed(taxRate * 100 % 1 === 0 ? 0 : 1)}%)</span>
                <span style={{ color: "hsl(210,40%,85%)" }}>{currencySymbol}{taxAmount.toFixed(2)}</span>
              </div>
            )}
            {couponApplied && couponDiscount > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span style={{ color: "hsl(142,70%,55%)" }}>Coupon Discount</span>
                <span style={{ color: "hsl(142,70%,55%)" }}>-{currencySymbol}{couponDiscount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ borderTop: "1px solid hsl(220,15%,16%)", paddingTop: "0.65rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(210,40%,92%)" }}>Total</span>
              <span className="font-orbitron" style={{ fontSize: "1.2rem", fontWeight: 800, color: "hsl(258,90%,72%)" }} data-testid="text-checkout-total">
                {currencySymbol}{Math.max(0, total).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Coupon ── */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <Tag size={14} style={{ color: "hsl(258,90%,68%)" }} />
            <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "hsl(210,40%,85%)" }}>Coupon Code</span>
          </div>
          {couponApplied ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "hsla(142,70%,55%,0.1)", border: "1px solid hsla(142,70%,55%,0.25)", borderRadius: "0.5rem", padding: "0.65rem 0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Tag size={13} style={{ color: "hsl(142,70%,55%)" }} />
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(142,70%,60%)" }}>{couponCode.toUpperCase()}</span>
                <span style={{ fontSize: "0.75rem", color: "hsl(142,70%,50%)" }}>(-{currencySymbol}{couponDiscount.toFixed(2)})</span>
              </div>
              <button onClick={removeCoupon} data-testid="button-remove-coupon" style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(142,70%,50%)", display: "flex", alignItems: "center" }}>
                <X size={15} />
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                value={couponCode}
                onChange={(e) => { setCouponCode(e.target.value); setCouponError(""); }}
                onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                placeholder="Enter coupon code"
                data-testid="input-coupon"
                style={{ flex: 1, padding: "0.6rem 0.75rem", borderRadius: "0.5rem", border: `1px solid ${couponError ? "hsla(0,72%,55%,0.5)" : "hsl(220,15%,18%)"}`, background: "hsl(220,20%,11%)", color: "hsl(210,40%,92%)", fontSize: "0.875rem", outline: "none" }}
              />
              <button
                onClick={applyCoupon}
                disabled={couponLoading || !couponCode.trim()}
                data-testid="button-apply-coupon"
                style={{ padding: "0.6rem 1rem", borderRadius: "0.5rem", background: "hsl(258,90%,58%)", color: "#fff", border: "none", fontWeight: 600, fontSize: "0.8rem", cursor: couponLoading || !couponCode.trim() ? "not-allowed" : "pointer", opacity: couponLoading || !couponCode.trim() ? 0.6 : 1, whiteSpace: "nowrap" }}
              >
                {couponLoading ? "..." : "Apply"}
              </button>
            </div>
          )}
          {couponError && (
            <p style={{ fontSize: "0.75rem", color: "hsl(0,72%,60%)", marginTop: "0.4rem" }}>{couponError}</p>
          )}
        </div>

        {/* ── Payment Method ── */}
        {!noGateways && (
          <div style={card}>
            <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: "hsl(210,40%,85%)", marginBottom: "0.75rem" }}>
              Payment Method
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {gateways.map((gw) => {
                const color = GATEWAY_COLORS[gw.type] || "#6B7280";
                const isSelected = selectedGatewayId === gw.id;
                return (
                  <button
                    key={gw.id}
                    type="button"
                    onClick={() => setSelectedGatewayId(gw.id)}
                    data-testid={`select-gateway-${gw.type}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "0.5rem",
                      border: `1px solid ${isSelected ? color : "hsl(220,15%,18%)"}`,
                      background: isSelected ? `${color}15` : "hsl(220,20%,11%)",
                      cursor: "pointer",
                      textAlign: "left",
                      width: "100%",
                    }}
                  >
                    <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <CreditCard size={14} style={{ color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: isSelected ? "hsl(210,40%,95%)" : "hsl(210,40%,78%)" }}>
                        {gw.name}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "hsl(220,10%,45%)" }}>
                        {GATEWAY_LABELS[gw.type] || gw.type}
                        {gw.mode === "test" && <span style={{ marginLeft: "6px", color: "hsl(40,96%,55%)" }}>TEST MODE</span>}
                      </div>
                    </div>
                    <div style={{ width: "15px", height: "15px", borderRadius: "50%", border: `2px solid ${isSelected ? color : "hsl(220,15%,30%)"}`, background: isSelected ? color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {isSelected && <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "white" }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {errorMsg && (
          <div style={{ background: "hsla(0,72%,55%,0.08)", border: "1px solid hsla(0,72%,55%,0.25)", borderRadius: "0.75rem", padding: "0.85rem 1rem", display: "flex", gap: "0.65rem", alignItems: "flex-start" }}>
            <AlertCircle size={16} style={{ color: "hsl(0,72%,58%)", flexShrink: 0, marginTop: "1px" }} />
            <div style={{ fontSize: "0.8rem", color: "hsl(0,72%,62%)" }}>{errorMsg}</div>
          </div>
        )}

        {/* ── Buy Now ── */}
        <button
          type="button"
          disabled={isProcessing || noGateways}
          onClick={handlePayment}
          className="btn-primary"
          style={{
            width: "100%",
            justifyContent: "center",
            padding: "0.9rem 1.5rem",
            fontSize: "1rem",
            fontWeight: 700,
            opacity: isProcessing || noGateways ? 0.7 : 1,
            cursor: isProcessing || noGateways ? "not-allowed" : "pointer",
          }}
          data-testid="button-place-order"
        >
          {noGateways
            ? "Payment Not Configured"
            : isProcessing
            ? "Processing..."
            : <>Buy Now — {currencySymbol}{Math.max(0, total).toFixed(2)} <ArrowRight size={16} /></>}
        </button>

        {selectedGateway && (
          <p style={{ textAlign: "center", fontSize: "0.7rem", color: "hsl(220,10%,38%)" }}>
            Secured by {GATEWAY_LABELS[selectedGateway.type] || selectedGateway.type}
          </p>
        )}

        {/* ── Browse More ── */}
        <Link
          href="/products"
          data-testid="link-browse-more"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "0.75rem",
            borderRadius: "0.5rem",
            border: "1px solid hsl(220,15%,18%)",
            color: "hsl(220,10%,55%)",
            textDecoration: "none",
            fontSize: "0.875rem",
            fontWeight: 500,
            transition: "color 0.15s, border-color 0.15s",
          }}
        >
          <ArrowLeft size={14} /> Browse More Products
        </Link>
      </div>
    </div>
  );
}
