import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, AlertCircle, CheckCircle, CreditCard } from "lucide-react";
import { useState, useEffect, useRef } from "react";
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

export default function Checkout() {
  const [, navigate] = useLocation();
  const { items, getCartTotal, clearCart } = useCartStore();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [selectedGatewayId, setSelectedGatewayId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const redirectFormRef = useRef<HTMLFormElement | null>(null);

  const { data: siteSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
  });

  const { data: gateways = [] } = useQuery<ActiveGateway[]>({
    queryKey: ["/api/payment-methods"],
    select: (data: any[]) => data.filter(g => g.isActive !== false),
  });

  const currencySymbol = getCurrencySymbol(siteSettings?.default_currency ?? "USD");
  const taxEnabled = siteSettings?.tax_enabled === "true";
  const taxRate = parseFloat(siteSettings?.tax_rate ?? "0") / 100;
  const taxName = siteSettings?.tax_name || "VAT";

  const subtotal = getCartTotal();
  const taxAmount = taxEnabled ? subtotal * taxRate : 0;
  const total = subtotal + taxAmount;
  const currency = siteSettings?.default_currency ?? "INR";

  // Auto-select first gateway
  useEffect(() => {
    if (gateways.length > 0 && !selectedGatewayId) {
      setSelectedGatewayId(gateways[0].id);
    }
  }, [gateways, selectedGatewayId]);

  // Load Razorpay SDK
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
    if (!email || !email.includes("@")) {
      setErrorMsg("Please enter a valid email address");
      return;
    }
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
          email,
          name: name || email,
          phone: phone || undefined,
          productInfo,
        }),
      });

      if (!initiateRes.ok) {
        const error = await initiateRes.json();
        throw new Error(error.error || "Failed to initiate payment");
      }

      const result = await initiateRes.json();

      if (result.type === "modal" && result.gatewayType === "razorpay") {
        // Razorpay modal flow
        const rzp = new window.Razorpay({
          key: result.keyId,
          amount: result.amount,
          currency: result.currency,
          name: result.name || "Nexcoin",
          description: result.description || "Order Payment",
          order_id: result.orderId,
          prefill: { email, contact: phone || "", name: name || "" },
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
        // Direct URL redirect (Cashfree, Instamojo, PhonePe, etc.)
        clearCart();
        window.location.href = result.url;

      } else if (result.type === "redirect") {
        // Form POST redirect (PayU, CCAvenue, Paytm, EasyBuzz, BharatPe, etc.)
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
      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "3rem 1.5rem", textAlign: "center" }}>
        <h2 className="font-orbitron" style={{ fontSize: "1.5rem", fontWeight: 700, color: "hsl(210,40%,90%)", marginBottom: "1rem" }}>
          Your Cart is Empty
        </h2>
        <p style={{ color: "hsl(220,10%,50%)", marginBottom: "2rem" }}>
          Add items to your cart before proceeding to checkout.
        </p>
        <Link href="/products" className="btn-primary" data-testid="link-browse-products">
          <ArrowLeft size={16} /> Continue Shopping
        </Link>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div style={{ maxWidth: "520px", margin: "0 auto", padding: "3rem 1.5rem", textAlign: "center" }}>
        <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "hsla(142,70%,55%,0.15)", border: "2px solid hsl(142,70%,55%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
          <CheckCircle size={40} style={{ color: "hsl(142,70%,55%)" }} />
        </div>
        <h2 className="font-orbitron" style={{ fontSize: "1.5rem", fontWeight: 700, color: "hsl(210,40%,90%)", marginBottom: "1rem" }}>
          Order Placed Successfully!
        </h2>
        <p style={{ color: "hsl(220,10%,55%)", marginBottom: "0.5rem", fontSize: "0.9rem" }}>
          Confirmation sent to:
        </p>
        <p style={{ color: "hsl(210,40%,88%)", marginBottom: "2rem", fontWeight: 600 }}>{email}</p>
        <div style={{ background: "hsla(258,90%,66%,0.1)", border: "1px solid hsla(258,90%,66%,0.2)", borderRadius: "0.75rem", padding: "1.25rem", marginBottom: "2rem" }}>
          <p className="font-orbitron" style={{ fontSize: "1.5rem", fontWeight: 800, color: "hsl(258,90%,72%)" }}>
            {currencySymbol}{total.toFixed(2)}
          </p>
        </div>
        <p style={{ color: "hsl(220,10%,55%)", marginBottom: "2rem", fontSize: "0.85rem", lineHeight: 1.6 }}>
          Your digital products will be delivered to your email within minutes. Check your spam folder if needed.
        </p>
        <Link href="/products" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }} data-testid="link-shop-again">
          Continue Shopping <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  const noGateways = gateways.length === 0;

  return (
    <div style={{ maxWidth: "940px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <Link href="/cart" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "hsl(220,10%,60%)", marginBottom: "1.5rem", textDecoration: "none", fontSize: "0.9rem" }} data-testid="link-back-to-cart">
        <ArrowLeft size={16} /> Back to Cart
      </Link>

      <h1 className="font-orbitron" style={{ fontSize: "1.75rem", fontWeight: 700, color: "hsl(210,40%,95%)", marginBottom: "2rem" }}>
        Checkout
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
        {/* Left: Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* Contact info */}
          <div style={{ background: "hsl(220,20%,9%)", border: "1px solid hsl(220,15%,16%)", borderRadius: "0.75rem", padding: "1.25rem" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(210,40%,90%)", marginBottom: "1rem" }}>Contact Information</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220,10%,55%)", marginBottom: "0.4rem" }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  data-testid="input-name"
                  style={{ width: "100%", padding: "0.65rem 0.75rem", borderRadius: "0.5rem", border: "1px solid hsl(220,15%,18%)", background: "hsl(220,20%,11%)", color: "hsl(210,40%,92%)", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220,10%,55%)", marginBottom: "0.4rem" }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  data-testid="input-email"
                  style={{ width: "100%", padding: "0.65rem 0.75rem", borderRadius: "0.5rem", border: "1px solid hsl(220,15%,18%)", background: "hsl(220,20%,11%)", color: "hsl(210,40%,92%)", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
                />
                <p style={{ fontSize: "0.7rem", color: "hsl(220,10%,45%)", marginTop: "0.25rem" }}>Order confirmation will be sent here</p>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220,10%,55%)", marginBottom: "0.4rem" }}>
                  Phone (optional)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9999999999"
                  data-testid="input-phone"
                  style={{ width: "100%", padding: "0.65rem 0.75rem", borderRadius: "0.5rem", border: "1px solid hsl(220,15%,18%)", background: "hsl(220,20%,11%)", color: "hsl(210,40%,92%)", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>
          </div>

          {/* Payment method selector */}
          {!noGateways && (
            <div style={{ background: "hsl(220,20%,9%)", border: "1px solid hsl(220,15%,16%)", borderRadius: "0.75rem", padding: "1.25rem" }}>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(210,40%,90%)", marginBottom: "1rem" }}>
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
                        padding: "0.75rem 1rem",
                        borderRadius: "0.5rem",
                        border: `1px solid ${isSelected ? color : "hsl(220,15%,18%)"}`,
                        background: isSelected ? `${color}18` : "hsl(220,20%,11%)",
                        cursor: "pointer",
                        textAlign: "left",
                        width: "100%",
                      }}
                    >
                      <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <CreditCard size={16} style={{ color }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: isSelected ? "hsl(210,40%,95%)" : "hsl(210,40%,80%)" }}>
                          {gw.name}
                        </div>
                        <div style={{ fontSize: "11px", color: "hsl(220,10%,45%)" }}>
                          {GATEWAY_LABELS[gw.type] || gw.type}
                          {gw.mode === "test" && <span style={{ marginLeft: "6px", color: "hsl(40,96%,55%)" }}>TEST MODE</span>}
                        </div>
                      </div>
                      <div style={{ width: "16px", height: "16px", borderRadius: "50%", border: `2px solid ${isSelected ? color : "hsl(220,15%,30%)"}`, background: isSelected ? color : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {isSelected && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "white" }} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <div style={{ background: "hsla(0,72%,55%,0.1)", border: "1px solid hsla(0,72%,55%,0.3)", borderRadius: "0.75rem", padding: "1rem", display: "flex", gap: "0.75rem" }}>
              <AlertCircle size={18} style={{ color: "hsl(0,72%,55%)", flexShrink: 0 }} />
              <div style={{ fontSize: "0.8rem", color: "hsl(0,72%,60%)" }}>{errorMsg}</div>
            </div>
          )}

          {/* Info */}
          <div style={{ background: "hsla(142,70%,55%,0.1)", border: "1px solid hsla(142,70%,55%,0.3)", borderRadius: "0.75rem", padding: "1rem", display: "flex", gap: "0.75rem" }}>
            <AlertCircle size={18} style={{ color: "hsl(142,70%,55%)", flexShrink: 0 }} />
            <div style={{ fontSize: "0.8rem", color: "hsl(142,70%,60%)" }}>
              <strong>Instant Delivery:</strong> Your digital products will be sent to your email immediately after payment.
            </div>
          </div>

          {/* Pay button */}
          <button
            type="button"
            disabled={isProcessing || noGateways}
            onClick={handlePayment}
            className="btn-primary"
            style={{
              width: "100%",
              opacity: isProcessing || noGateways ? 0.7 : 1,
              cursor: isProcessing || noGateways ? "not-allowed" : "pointer",
              justifyContent: "center",
            }}
            data-testid="button-place-order"
          >
            {noGateways
              ? "Payment Not Configured"
              : isProcessing
              ? "Processing..."
              : <>Complete Order — {currencySymbol}{total.toFixed(2)} <ArrowRight size={16} /></>}
          </button>

          {selectedGateway && (
            <p style={{ textAlign: "center", fontSize: "11px", color: "hsl(220,10%,40%)" }}>
              Secured by {GATEWAY_LABELS[selectedGateway.type] || selectedGateway.type}
            </p>
          )}
        </div>

        {/* Right: Order Summary */}
        <div style={{ background: "hsl(220,20%,9%)", border: "1px solid hsl(220,15%,16%)", borderRadius: "0.75rem", padding: "1.5rem", position: "sticky", top: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "hsl(210,40%,92%)", marginBottom: "1.25rem" }}>
            Order Summary
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem", maxHeight: "300px", overflowY: "auto", paddingRight: "0.25rem" }}>
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
