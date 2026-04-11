import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { CheckCircle, Clock, Copy, AlertTriangle, Loader2, ArrowRight, RotateCcw, XCircle } from "lucide-react";
import { getCurrencySymbol } from "@/lib/currency";

interface OrderStatus {
  orderId: string;
  orderNumber: string;
  status: string;
  utr?: string;
  paymentVerifiedAt?: string;
  totalAmount: string;
  currency: string;
}

const card: React.CSSProperties = {
  background: "hsl(220,20%,9%)",
  border: "1px solid hsl(220,15%,16%)",
  borderRadius: "0.75rem",
  padding: "1.5rem",
};

const TIMEOUT_SECONDS = 600;

export default function UpiPayment() {
  const { orderId } = useParams<{ orderId: string }>();
  const [, navigate] = useLocation();

  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [upiId, setUpiId] = useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [currency, setCurrency] = useState<string>("INR");
  const [orderNumber, setOrderNumber] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_SECONDS);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial order info from sessionStorage (set by Checkout)
  useEffect(() => {
    const stored = sessionStorage.getItem(`upi_order_${orderId}`);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setUpiId(data.upiId || "");
        setQrCodeUrl(data.qrCodeUrl || null);
        setAmount(String(data.amount || ""));
        setCurrency(data.currency || "INR");
        setOrderNumber(data.orderNumber || "");
        if (data.expiresAt) {
          const exp = new Date(data.expiresAt);
          setExpiresAt(exp);
          const sLeft = Math.max(0, Math.floor((exp.getTime() - Date.now()) / 1000));
          setSecondsLeft(sLeft);
        }
      } catch {}
    } else {
      // Fetch order status directly to get info
      fetchStatus();
    }
  }, [orderId]);

  async function fetchStatus() {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/status`);
      if (!res.ok) return;
      const data: OrderStatus = await res.json();
      setOrderStatus(data);
      if (!amount) setAmount(data.totalAmount);
      if (!currency) setCurrency(data.currency);
      if (!orderNumber) setOrderNumber(data.orderNumber);

      if (data.status === "completed") {
        setIsSuccess(true);
        stopPolling();
      } else if (data.status === "failed") {
        setError("This order has been cancelled or failed.");
        stopPolling();
      }
    } catch {}
  }

  // Countdown timer
  useEffect(() => {
    if (isSuccess || isExpired) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          setIsExpired(true);
          stopPolling();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isSuccess, isExpired]);

  // Poll for payment status every 5 seconds
  useEffect(() => {
    if (isSuccess || isExpired) return;
    pollingRef.current = setInterval(fetchStatus, 5000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [isSuccess, isExpired, orderId]);

  // Redirect to success after showing payment confirmed
  useEffect(() => {
    if (isSuccess) {
      const t = setTimeout(() => navigate(`/account`), 4000);
      return () => clearTimeout(t);
    }
  }, [isSuccess]);

  function stopPolling() {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const currencySymbol = getCurrencySymbol(currency);
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timerColor = secondsLeft < 60 ? "#ef4444" : secondsLeft < 180 ? "#f59e0b" : "#22c55e";

  if (isSuccess) {
    return (
      <div style={{ maxWidth: "520px", margin: "4rem auto", padding: "2rem 1.5rem", textAlign: "center" }}>
        <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "hsla(142,70%,55%,0.15)", border: "2px solid hsl(142,70%,55%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
          <CheckCircle size={40} style={{ color: "hsl(142,70%,55%)" }} />
        </div>
        <h2 className="font-orbitron" style={{ fontSize: "1.5rem", fontWeight: 700, color: "hsl(210,40%,92%)", marginBottom: "0.75rem" }}>
          Payment Confirmed!
        </h2>
        <p style={{ color: "hsl(220,10%,60%)", fontSize: "0.875rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
          Your UPI payment has been verified. Your order is being processed and digital products will be delivered shortly.
        </p>
        {orderStatus?.utr && (
          <div style={{ background: "hsla(258,70%,65%,0.08)", border: "1px solid hsla(258,70%,65%,0.2)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1.5rem", textAlign: "left" }}>
            <p style={{ fontSize: "11px", color: "hsl(220,10%,45%)", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>UTR Reference</p>
            <p style={{ fontSize: "13px", color: "hsl(210,40%,85%)", fontFamily: "monospace", wordBreak: "break-all", margin: 0 }}>{orderStatus.utr}</p>
          </div>
        )}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/account" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }} data-testid="link-view-orders">
            View Orders <ArrowRight size={16} />
          </Link>
          <Link href="/products" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "0.6rem 1.25rem", borderRadius: "0.5rem", background: "hsl(220,20%,12%)", border: "1px solid hsl(220,15%,18%)", color: "hsl(220,10%,65%)", fontSize: "0.875rem", textDecoration: "none" }}>
            Continue Shopping
          </Link>
        </div>
        <p style={{ fontSize: "12px", color: "hsl(220,10%,42%)", marginTop: "1.5rem" }}>
          Redirecting to your account automatically...
        </p>
      </div>
    );
  }

  if (isExpired || error) {
    return (
      <div style={{ maxWidth: "480px", margin: "4rem auto", padding: "2rem 1.5rem", textAlign: "center" }}>
        <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "hsla(0,70%,55%,0.15)", border: "2px solid hsl(0,70%,55%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
          {isExpired ? <AlertTriangle size={40} style={{ color: "hsl(0,70%,55%)" }} /> : <XCircle size={40} style={{ color: "hsl(0,70%,55%)" }} />}
        </div>
        <h2 className="font-orbitron" style={{ fontSize: "1.5rem", fontWeight: 700, color: "hsl(210,40%,92%)", marginBottom: "0.75rem" }}>
          {isExpired ? "Payment Window Expired" : "Payment Failed"}
        </h2>
        <p style={{ color: "hsl(220,10%,60%)", fontSize: "0.875rem", marginBottom: "2rem", lineHeight: 1.6 }}>
          {isExpired
            ? "The payment window has closed. If you completed the payment, our system will still verify it within a few minutes."
            : error || "Your payment could not be processed. Please try again or use a different payment method."}
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/account" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "0.6rem 1.25rem", borderRadius: "0.5rem", background: "hsla(258,70%,65%,0.15)", border: "1px solid hsla(258,70%,65%,0.3)", color: "hsl(258,70%,72%)", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }} data-testid="link-check-orders">
            View Orders
          </Link>
          <Link href="/checkout" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "0.6rem 1.25rem", borderRadius: "0.5rem", background: "hsl(220,20%,12%)", border: "1px solid hsl(220,15%,18%)", color: "hsl(220,10%,65%)", fontSize: "0.875rem", textDecoration: "none" }} data-testid="link-try-again">
            <RotateCcw size={15} /> Try Again
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "hsl(220,20%,6%)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: "520px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "22px", fontWeight: 700, color: "hsl(210,40%,95%)", margin: 0 }}>
            Complete Your Payment
          </h1>
          <p style={{ color: "hsl(220,10%,55%)", fontSize: "13px", marginTop: "0.4rem" }}>
            Order #{orderNumber || orderId?.slice(0, 8)}
          </p>
        </div>

        {/* Timer + Amount */}
        <div style={{ ...card, marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <p style={{ color: "hsl(220,10%,55%)", fontSize: "12px", margin: "0 0 2px" }}>Amount to Pay</p>
            <p style={{ color: "hsl(210,40%,95%)", fontSize: "24px", fontWeight: 700, margin: 0 }}>
              {currencySymbol}{parseFloat(amount || "0").toFixed(2)}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", justifyContent: "flex-end", marginBottom: "2px" }}>
              <Clock size={14} style={{ color: timerColor }} />
              <span style={{ color: "hsl(220,10%,55%)", fontSize: "12px" }}>Time remaining</span>
            </div>
            <p style={{ color: timerColor, fontSize: "22px", fontWeight: 700, margin: 0, fontVariantNumeric: "tabular-nums" }}>
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </p>
          </div>
        </div>

        {/* QR Code */}
        {qrCodeUrl && (
          <div style={{ ...card, marginBottom: "1rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
            <p style={{ color: "hsl(220,10%,55%)", fontSize: "13px", margin: 0 }}>Scan QR Code to Pay</p>
            <div style={{ background: "#fff", borderRadius: "0.5rem", padding: "12px" }}>
              <img
                src={qrCodeUrl}
                alt="UPI QR Code"
                style={{ width: "200px", height: "200px", display: "block" }}
                data-testid="img-upi-qr"
              />
            </div>
          </div>
        )}

        {/* UPI ID */}
        {upiId && (
          <div style={{ ...card, marginBottom: "1rem" }}>
            <p style={{ color: "hsl(220,10%,55%)", fontSize: "12px", marginBottom: "0.5rem", marginTop: 0 }}>
              Or Pay Using UPI ID
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "hsl(220,20%,13%)", borderRadius: "0.5rem", padding: "0.75rem 1rem" }}>
              <span style={{ flex: 1, color: "hsl(210,40%,95%)", fontSize: "15px", fontWeight: 600, wordBreak: "break-all" }} data-testid="text-upi-id">
                {upiId}
              </span>
              <button
                onClick={() => copyText(upiId, "upiId")}
                style={{ background: "none", border: "none", cursor: "pointer", color: copied === "upiId" ? "#22c55e" : "hsl(220,10%,55%)", padding: "0.25rem", flexShrink: 0 }}
                data-testid="button-copy-upi-id"
                title="Copy UPI ID"
              >
                {copied === "upiId" ? <CheckCircle size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* Amount copy */}
        <div style={{ ...card, marginBottom: "1rem" }}>
          <p style={{ color: "hsl(220,10%,55%)", fontSize: "12px", marginBottom: "0.5rem", marginTop: 0 }}>
            Exact Amount (copy and paste)
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "hsl(220,20%,13%)", borderRadius: "0.5rem", padding: "0.75rem 1rem" }}>
            <span style={{ flex: 1, color: "hsl(210,40%,95%)", fontSize: "15px", fontWeight: 600 }} data-testid="text-exact-amount">
              {parseFloat(amount || "0").toFixed(2)}
            </span>
            <button
              onClick={() => copyText(String(parseFloat(amount || "0").toFixed(2)), "amount")}
              style={{ background: "none", border: "none", cursor: "pointer", color: copied === "amount" ? "#22c55e" : "hsl(220,10%,55%)", padding: "0.25rem", flexShrink: 0 }}
              data-testid="button-copy-amount"
              title="Copy Amount"
            >
              {copied === "amount" ? <CheckCircle size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div style={{ ...card, marginBottom: "1.5rem" }}>
          <p style={{ color: "hsl(210,40%,95%)", fontSize: "13px", fontWeight: 600, marginTop: 0, marginBottom: "0.75rem" }}>
            How to Pay
          </p>
          <ol style={{ color: "hsl(220,10%,60%)", fontSize: "13px", margin: 0, paddingLeft: "1.25rem", lineHeight: 1.8 }}>
            <li>Open Google Pay on your phone</li>
            <li>Scan the QR code OR enter the UPI ID above</li>
            <li>Enter the <strong style={{ color: "hsl(210,40%,90%)" }}>exact amount</strong> shown</li>
            <li>Complete the payment and wait for confirmation</li>
          </ol>
          <p style={{ color: "hsl(258,90%,70%)", fontSize: "12px", marginTop: "0.75rem", marginBottom: 0 }}>
            Your order will be processed automatically once payment is detected.
          </p>
        </div>

        {/* Polling indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "center", color: "hsl(220,10%,50%)", fontSize: "12px" }}>
          <Loader2 size={14} style={{ animation: "spin 1.5s linear infinite" }} />
          <span>Checking payment status automatically...</span>
        </div>

        {error && (
          <p style={{ color: "#ef4444", textAlign: "center", marginTop: "1rem", fontSize: "13px" }}>{error}</p>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
