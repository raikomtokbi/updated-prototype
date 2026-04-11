import { Link, useLocation, useSearch } from "wouter";
import { ArrowLeft, ArrowRight, AlertCircle, CheckCircle, Tag, X, Copy, Clock, Loader2,
         CreditCard, Smartphone, Building2, Wallet, ChevronRight } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState, useEffect, useRef } from "react";
import { useCartStore } from "@/lib/store/cartStore";
import { useAuthStore } from "@/lib/store/authstore";
import { useQuery } from "@tanstack/react-query";
import { getCurrencySymbol } from "@/lib/currency";

// ─── Types ───────────────────────────────────────────────────────────────────
interface PaymentTypeOption { key: string; label: string; providerCount: number }
interface Fee { id: string; name: string; amount: string; type: "fixed" | "percentage"; isActive: boolean }
interface RazorpayResponse { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }

declare global { interface Window { Razorpay: any } }

// ─── Styles ──────────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "hsl(220,20%,9%)",
  border: "1px solid hsl(220,15%,16%)",
  borderRadius: "0.75rem",
  padding: "1.25rem",
};

const PAYMENT_ICONS: Record<string, React.ReactNode> = {
  UPI: <Smartphone size={20} />,
  CARD: <CreditCard size={20} />,
  NETBANKING: <Building2 size={20} />,
  WALLET: <Wallet size={20} />,
};

const PAYMENT_DESCRIPTIONS: Record<string, string> = {
  UPI: "Pay via UPI ID or QR Code",
  CARD: "Credit / Debit card",
  NETBANKING: "Internet banking",
  WALLET: "Digital wallets",
};

// ─── Inline UPI Payment Overlay ──────────────────────────────────────────────
interface UpiData {
  orderId: string;
  orderNumber: string;
  upiId: string;
  qrCodeUrl?: string;
  amount: string;
  currency: string;
  expiresAt?: string;
}

const TIMEOUT_SECONDS = 300;

function UpiPaymentOverlay({
  data,
  onSuccess,
  onExpired,
  onClose,
}: {
  data: UpiData;
  onSuccess: (utr?: string) => void;
  onExpired: () => void;
  onClose: () => void;
}) {
  const { data: siteSettings } = useQuery<Record<string, string>>({ queryKey: ["/api/site-settings"] });
  const merchantName = encodeURIComponent(siteSettings?.site_name || "Merchant");

  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (data.expiresAt) {
      return Math.max(0, Math.floor((new Date(data.expiresAt).getTime() - Date.now()) / 1000));
    }
    return TIMEOUT_SECONDS;
  });
  const [copied, setCopied] = useState<string | null>(null);
  const [utr, setUtr] = useState<string | undefined>(undefined);
  const [utrInput, setUtrInput] = useState("");
  const [utrSubmitting, setUtrSubmitting] = useState(false);
  const [utrSubmitted, setUtrSubmitted] = useState(false);
  const [utrError, setUtrError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isExpiredRef = useRef(false);

  const currencySymbol = getCurrencySymbol(data.currency || "INR");
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const timerColor = secondsLeft < 60 ? "#ef4444" : secondsLeft < 180 ? "#f59e0b" : "#22c55e";

  function stopAll() {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  async function checkStatus() {
    if (isExpiredRef.current) return;
    try {
      const res = await fetch(`/api/orders/${data.orderId}/status`);
      if (!res.ok) return;
      const d = await res.json();
      if (d.status === "completed") {
        stopAll();
        setUtr(d.utr);
        onSuccess(d.utr);
      } else if (d.status === "payment_review" && !utrSubmitted) {
        setUtrSubmitted(true);
        if (d.utr) setUtrInput(d.utr);
      }
    } catch {}
  }

  async function handleUtrSubmit() {
    const trimmed = utrInput.trim();
    if (!trimmed || trimmed.length < 6) {
      setUtrError("Enter a valid UTR / transaction reference (min 6 characters)");
      return;
    }
    setUtrError(null);
    setUtrSubmitting(true);
    try {
      const res = await fetch("/api/upi/submit-utr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: data.orderId, utr: trimmed }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to submit UTR");
      if (d.status === "completed") {
        stopAll();
        onSuccess(trimmed);
      } else {
        setUtrSubmitted(true);
      }
    } catch (err: any) {
      setUtrError(err.message || "Failed to submit UTR");
    } finally {
      setUtrSubmitting(false);
    }
  }

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          isExpiredRef.current = true;
          stopAll();
          onExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    pollingRef.current = setInterval(checkStatus, 5000);
    return stopAll;
  }, []);

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", background: "rgba(0,0,0,0.75)" }}>
      <div style={{ width: "100%", maxWidth: "480px", maxHeight: "90vh", overflowY: "auto", background: "hsl(220,20%,8%)", border: "1px solid hsl(220,15%,16%)", borderRadius: "1rem", padding: "1.5rem", scrollbarWidth: "none" }}>
        <style>{`div::-webkit-scrollbar { display: none; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
        {/* Header */}
        <div style={{ marginBottom: "1.25rem" }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "hsl(210,40%,95%)" }}>Complete UPI Payment</h3>
          <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "hsl(220,10%,50%)" }}>Order #{data.orderNumber || data.orderId.slice(0, 8)}</p>
        </div>

        {/* Amount + Timer */}
        <div style={{ ...card, padding: "1rem", marginBottom: "0.875rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <p style={{ margin: "0 0 2px", fontSize: "11px", color: "hsl(220,10%,50%)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Amount to Pay</p>
            <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800, color: "hsl(258,90%,72%)" }}>{currencySymbol}{parseFloat(data.amount).toFixed(2)}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", justifyContent: "flex-end", marginBottom: "2px" }}>
              <Clock size={12} style={{ color: timerColor }} />
              <span style={{ fontSize: "11px", color: "hsl(220,10%,50%)" }}>Expires in</span>
            </div>
            <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: timerColor, fontVariantNumeric: "tabular-nums" }}>
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </p>
          </div>
        </div>

        {/* UPI App Deep Link Buttons */}
        {data.upiId && (() => {
          const pa = encodeURIComponent(data.upiId);
          const am = String(Math.round(parseFloat(data.amount)));
          const tn = encodeURIComponent("Order " + (data.orderNumber || data.orderId.slice(0, 8)));
          // Universal UPI deep link — opens any installed UPI app (GPay, PhonePe, Paytm, BHIM, etc.)
          const upiLink = `upi://pay?pa=${pa}&pn=${merchantName}&am=${am}&cu=INR&tn=${tn}`;
          return (
            <div style={{ marginBottom: "0.875rem" }}>
              <p style={{ margin: "0 0 8px", fontSize: "11px", color: "hsl(220,10%,50%)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pay instantly with</p>
              <a
                href={upiLink}
                data-testid="button-open-gpay"
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "12px 16px", borderRadius: "8px",
                  background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.3)",
                  textDecoration: "none", cursor: "pointer",
                }}
              >
                <span style={{
                  width: "32px", height: "32px", borderRadius: "8px",
                  background: "linear-gradient(135deg,#7c3aed,#6d28d9)", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontWeight: 800, fontSize: "12px", flexShrink: 0,
                }}>UPI</span>
                <div>
                  <span style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "hsl(210,40%,88%)" }}>Open UPI App</span>
                  <span style={{ display: "block", fontSize: "11px", color: "hsl(220,10%,48%)", marginTop: "1px" }}>Works with GPay, PhonePe, Paytm &amp; more</span>
                </div>
              </a>
              <p style={{ margin: "8px 0 0", fontSize: "11px", color: "hsl(220,10%,38%)", textAlign: "center" }}>
                Tap to open your UPI app — just confirm and pay
              </p>
            </div>
          );
        })()}

        {/* QR Code — auto-generated from UPI ID + amount */}
        {data.upiId && (
          <div style={{ ...card, padding: "1rem", marginBottom: "0.875rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
            <p style={{ margin: 0, fontSize: "12px", color: "hsl(220,10%,50%)" }}>Or scan QR to pay</p>
            <div style={{ background: "#fff", borderRadius: "0.5rem", padding: "10px" }}>
              <QRCodeSVG
                value={`upi://pay?pa=${encodeURIComponent(data.upiId)}&pn=${merchantName}&am=${Math.round(parseFloat(data.amount))}&cu=INR&tn=Order+Payment`}
                size={160}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
                data-testid="img-upi-qr"
              />
            </div>
          </div>
        )}

        {/* UPI ID */}
        {data.upiId && (
          <div style={{ marginBottom: "0.875rem" }}>
            <p style={{ margin: "0 0 6px", fontSize: "11px", color: "hsl(220,10%,50%)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Or pay to UPI ID</p>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "hsl(220,20%,12%)", border: "1px solid hsl(220,15%,18%)", borderRadius: "0.5rem", padding: "0.75rem 1rem" }}>
              <span style={{ flex: 1, color: "hsl(210,40%,92%)", fontSize: "0.9rem", fontWeight: 600, wordBreak: "break-all" }} data-testid="text-upi-id">{data.upiId}</span>
              <button onClick={() => copyText(data.upiId, "upiId")} style={{ background: "none", border: "none", cursor: "pointer", color: copied === "upiId" ? "#22c55e" : "hsl(220,10%,50%)", padding: "2px", flexShrink: 0 }} data-testid="button-copy-upi-id">
                {copied === "upiId" ? <CheckCircle size={15} /> : <Copy size={15} />}
              </button>
            </div>
          </div>
        )}

        {/* Exact Amount */}
        <div style={{ marginBottom: "0.875rem" }}>
          <p style={{ margin: "0 0 6px", fontSize: "11px", color: "hsl(220,10%,50%)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Exact amount to enter</p>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "hsl(220,20%,12%)", border: "1px solid hsl(220,15%,18%)", borderRadius: "0.5rem", padding: "0.75rem 1rem" }}>
            <span style={{ flex: 1, color: "hsl(210,40%,92%)", fontSize: "0.9rem", fontWeight: 600 }} data-testid="text-exact-amount">{parseFloat(data.amount).toFixed(2)}</span>
            <button onClick={() => copyText(parseFloat(data.amount).toFixed(2), "amount")} style={{ background: "none", border: "none", cursor: "pointer", color: copied === "amount" ? "#22c55e" : "hsl(220,10%,50%)", padding: "2px", flexShrink: 0 }} data-testid="button-copy-amount">
              {copied === "amount" ? <CheckCircle size={15} /> : <Copy size={15} />}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div style={{ background: "hsl(220,20%,11%)", border: "1px solid hsl(220,15%,16%)", borderRadius: "0.5rem", padding: "0.875rem", marginBottom: "1rem" }}>
          <p style={{ margin: "0 0 0.5rem", fontSize: "12px", fontWeight: 600, color: "hsl(210,40%,88%)" }}>How to pay</p>
          <ol style={{ margin: 0, paddingLeft: "1.1rem", color: "hsl(220,10%,55%)", fontSize: "12px", lineHeight: 1.8 }}>
            <li>Open your UPI app (GPay, PhonePe, Paytm, etc.)</li>
            <li>Scan the QR code or enter the UPI ID manually</li>
            <li>Enter the <strong style={{ color: "hsl(210,40%,85%)" }}>exact amount</strong> shown above</li>
            <li>After paying, enter your <strong style={{ color: "hsl(210,40%,85%)" }}>UPI Txn ID</strong> below</li>
          </ol>
        </div>

        {/* UPI Txn ID Submission */}
        {utrSubmitted ? (
          <div style={{ background: "hsla(142,70%,50%,0.08)", border: "1px solid hsla(142,70%,50%,0.25)", borderRadius: "0.5rem", padding: "1rem", textAlign: "center", marginBottom: "1rem" }}>
            <CheckCircle size={20} style={{ color: "hsl(142,70%,55%)", marginBottom: "6px" }} />
            <p style={{ margin: "0 0 2px", fontSize: "13px", fontWeight: 600, color: "hsl(210,40%,88%)" }}>UPI Txn ID Submitted!</p>
            <p style={{ margin: 0, fontSize: "12px", color: "hsl(220,10%,52%)" }}>Your payment is under review. You'll be notified once verified.</p>
            <p style={{ margin: "8px 0 0", fontSize: "11px", color: "hsl(258,80%,68%)", fontFamily: "monospace" }}>{utrInput}</p>
          </div>
        ) : (
          <div style={{ background: "hsl(220,20%,11%)", border: "1px solid hsl(258,50%,30%)", borderRadius: "0.5rem", padding: "0.875rem", marginBottom: "1rem" }}>
            <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 600, color: "hsl(258,80%,72%)" }}>After paying — enter your UPI Txn ID</p>
            <p style={{ margin: "0 0 10px", fontSize: "11px", color: "hsl(220,10%,48%)" }}>
              Find the transaction ID in your UPI app under payment history.
            </p>
            <input
              data-testid="input-utr"
              value={utrInput}
              onChange={(e) => { setUtrInput(e.target.value); setUtrError(null); }}
              placeholder="e.g. 123456789012"
              maxLength={50}
              style={{
                width: "100%", boxSizing: "border-box",
                padding: "0.6rem 0.75rem", borderRadius: "6px",
                background: "hsl(220,20%,8%)", border: `1px solid ${utrError ? "#ef4444" : "hsl(220,15%,22%)"}`,
                color: "hsl(210,40%,90%)", fontSize: "13px", outline: "none", marginBottom: "8px",
              }}
            />
            <button
              data-testid="button-submit-utr"
              onClick={handleUtrSubmit}
              disabled={utrSubmitting || !utrInput.trim()}
              style={{
                width: "100%", padding: "0.6rem 1rem", borderRadius: "6px", border: "none",
                background: utrSubmitting || !utrInput.trim() ? "hsl(258,50%,28%)" : "linear-gradient(135deg, #7c3aed, #6d28d9)",
                color: utrSubmitting || !utrInput.trim() ? "hsl(210,20%,55%)" : "#fff",
                fontSize: "13px", fontWeight: 600, cursor: utrSubmitting ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}
            >
              {utrSubmitting ? <Loader2 size={13} style={{ animation: "spin 1.5s linear infinite" }} /> : <CheckCircle size={13} />}
              {utrSubmitting ? "Submitting…" : "Submit UPI Txn ID"}
            </button>
            {utrError && <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#ef4444" }}>{utrError}</p>}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "10px", color: "hsl(220,10%,40%)", fontSize: "11px" }}>
              <Loader2 size={11} style={{ animation: "spin 1.5s linear infinite" }} />
              <span>Also checking for automatic verification every 5s…</span>
            </div>
          </div>
        )}

        {/* Cancel Button */}
        <button
          data-testid="button-cancel-upi"
          onClick={onClose}
          style={{
            width: "100%", padding: "0.6rem", borderRadius: "6px",
            background: "none", border: "1px solid hsl(220,15%,22%)",
            color: "hsl(220,10%,50%)", fontSize: "13px", cursor: "pointer",
          }}
        >
          Cancel Payment
        </button>
      </div>
    </div>
  );
}

// ─── Success Overlay ──────────────────────────────────────────────────────────
const CONFETTI_COLORS = ["#7c3aed","#22c55e","#3b82f6","#f59e0b","#ec4899","#06b6d4"];
const CONFETTI_COUNT = 18;

function SuccessScreen({ utr, redirectTo }: { utr?: string; redirectTo: string }) {
  const [, navigate] = useLocation();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown <= 0) {
      navigate(redirectTo);
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, navigate, redirectTo]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3000,
      background: "hsl(220,22%,6%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
    }}>
      {/* Confetti particles */}
      {Array.from({ length: CONFETTI_COUNT }).map((_, i) => {
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const left = `${(i * 5.5 + 2) % 100}%`;
        const delay = `${(i * 0.15) % 2}s`;
        const dur = `${2.5 + (i % 4) * 0.4}s`;
        const size = 8 + (i % 3) * 4;
        return (
          <div key={i} style={{
            position: "absolute", top: "-30px", left,
            width: size, height: size,
            background: color, borderRadius: i % 3 === 0 ? "50%" : "2px",
            animation: `confetti-fall ${dur} ${delay} ease-in forwards`,
            opacity: 0,
          }} />
        );
      })}

      {/* Radial glow behind checkmark */}
      <div style={{
        position: "absolute", width: "400px", height: "400px", borderRadius: "50%",
        background: "radial-gradient(circle, hsla(142,70%,45%,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Content card */}
      <div style={{
        position: "relative", zIndex: 1,
        textAlign: "center", padding: "0 1.5rem",
        animation: "success-fade-in 0.5s ease both",
        maxWidth: "420px", width: "100%",
      }}>
        {/* Animated checkmark */}
        <div style={{
          width: "110px", height: "110px", borderRadius: "50%",
          margin: "0 auto 1.75rem",
          animation: "ring-pop 0.55s cubic-bezier(0.34,1.56,0.64,1) both, pulse-glow 2s 0.8s ease-in-out infinite",
          background: "hsla(142,70%,50%,0.12)",
          border: "3px solid hsl(142,70%,48%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <polyline
              points="14,27 23,36 38,18"
              stroke="hsl(142,70%,55%)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="200"
              style={{ animation: "check-draw 0.5s 0.4s ease both" }}
            />
          </svg>
        </div>

        <h1 className="font-orbitron" style={{
          fontSize: "clamp(1.4rem, 5vw, 2rem)", fontWeight: 800,
          color: "hsl(210,40%,95%)", marginBottom: "0.625rem", letterSpacing: "0.01em",
        }}>
          Payment Successful!
        </h1>
        <p style={{ color: "hsl(220,10%,55%)", fontSize: "0.9rem", lineHeight: 1.65, marginBottom: "1.5rem" }}>
          Your order has been confirmed and is now being processed.
        </p>

        {utr && (
          <div style={{
            background: "hsla(142,70%,50%,0.07)", border: "1px solid hsla(142,70%,50%,0.2)",
            borderRadius: "10px", padding: "0.75rem 1.1rem", marginBottom: "1.5rem",
            textAlign: "left",
          }}>
            <p style={{ margin: "0 0 3px", fontSize: "10px", color: "hsl(220,10%,45%)", textTransform: "uppercase", letterSpacing: "0.06em" }}>UPI Transaction ID</p>
            <p style={{ margin: 0, fontSize: "14px", color: "hsl(142,60%,65%)", fontFamily: "monospace", fontWeight: 600 }}>{utr}</p>
          </div>
        )}

        {/* Countdown bar */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{
            height: "3px", borderRadius: "99px",
            background: "hsl(220,15%,14%)", overflow: "hidden", marginBottom: "0.6rem",
          }}>
            <div style={{
              height: "100%", borderRadius: "99px",
              background: "linear-gradient(90deg, hsl(142,70%,48%), hsl(258,70%,60%))",
              animation: `progress-drain ${5}s linear both`,
            }} />
          </div>
          <p style={{ fontSize: "0.78rem", color: "hsl(220,10%,45%)" }}>
            Redirecting in <span style={{ color: "hsl(210,40%,80%)", fontWeight: 600 }}>{countdown}s</span>…
          </p>
        </div>

        <button
          onClick={() => navigate(redirectTo)}
          data-testid="button-go-back"
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "0.65rem 1.4rem", borderRadius: "0.5rem",
            background: "hsl(220,20%,13%)", border: "1px solid hsl(220,15%,20%)",
            color: "hsl(210,40%,80%)", fontSize: "0.875rem", cursor: "pointer",
          }}
        >
          Go Back Now <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Checkout Component ──────────────────────────────────────────────────
export default function Checkout() {
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const { items, getCartTotal, clearCart } = useCartStore();
  const { user } = useAuthStore();

  // Parse back-navigation context from query params
  const searchParams = new URLSearchParams(searchStr);
  const fromParam = searchParams.get("from") ?? "";
  const fromName = searchParams.get("fromName") ?? "";
  const backHref = fromParam === "cart" ? "/cart"
    : fromParam === "product" ? "/products"
    : "/products";
  const backLabel = fromName ? fromName : fromParam === "cart" ? "Cart" : "Products";

  const [selectedPaymentType, setSelectedPaymentType] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponSuccessMsg, setCouponSuccessMsg] = useState("");
  const [couponError, setCouponError] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);

  // UPI inline modal state
  const [upiModalData, setUpiModalData] = useState<UpiData | null>(null);
  const [upiSuccess, setUpiSuccess] = useState<{ utr?: string } | null>(null);
  const [payerName, setPayerName] = useState("");

  const { data: siteSettings } = useQuery<Record<string, string>>({ queryKey: ["/api/site-settings"] });
  const { data: paymentTypes = [] } = useQuery<PaymentTypeOption[]>({ queryKey: ["/api/payment-types"] });
  const { data: fees = [] } = useQuery<Fee[]>({ queryKey: ["/api/fees"] });

  const currencySymbol = getCurrencySymbol(siteSettings?.default_currency ?? "USD");
  const taxEnabled = siteSettings?.tax_enabled === "true";
  const taxRate = parseFloat(siteSettings?.tax_rate ?? "0") / 100;
  const taxName = siteSettings?.tax_name || "VAT";
  const currency = siteSettings?.default_currency ?? "INR";

  const subtotal = getCartTotal();
  const taxAmount = taxEnabled ? subtotal * taxRate : 0;
  let totalFees = 0;
  fees.forEach(fee => {
    totalFees += fee.type === "percentage"
      ? subtotal * (parseFloat(fee.amount) / 100)
      : parseFloat(fee.amount);
  });
  const total = Math.max(0, subtotal + taxAmount + totalFees - couponDiscount);

  // Load Razorpay SDK if CARD type available
  useEffect(() => {
    const hasCard = paymentTypes.some(t => t.key === "CARD");
    if (!hasCard) return;
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { try { document.body.removeChild(script); } catch {} };
  }, [paymentTypes]);

  // Auto-select first available payment type
  useEffect(() => {
    if (paymentTypes.length > 0 && !selectedPaymentType) {
      setSelectedPaymentType(paymentTypes[0].key);
    }
  }, [paymentTypes, selectedPaymentType]);

  async function applyCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    setCouponSuccessMsg("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), amount: subtotal }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setCouponError(data.message || "Invalid or expired coupon");
        setCouponApplied(false);
        setCouponDiscount(0);
      } else {
        setCouponApplied(true);
        setCouponDiscount(data.discountAmount ?? 0);
        setCouponSuccessMsg(data.message || "Coupon applied successfully");
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
    setCouponSuccessMsg("");
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
    if (!selectedPaymentType) {
      setErrorMsg("Please select a payment method.");
      return;
    }

    setIsProcessing(true);
    try {
      const productInfo = items.map(i => i.productTitle).join(", ").slice(0, 100);
      const cartItemsPayload = items.map(i => ({
        productId: i.productId,
        productTitle: i.productTitle,
        packageId: i.packageId,
        packageName: i.packageName,
        price: i.price,
        quantity: i.quantity,
        productCategory: i.productCategory,
        userId: i.userId,
        zoneId: i.zoneId,
        playerId: i.playerId,
        loginId: i.loginId,
        characterName: i.characterName,
        email: i.email,
      }));

      // ── UPI payment (inline overlay) ────────────────────────────────────────
      if (selectedPaymentType === "UPI") {
        const upiRes = await fetch("/api/upi/initiate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: total,
            currency,
            email: "guest@checkout.com",
            name: "Guest",
            productInfo,
            cartItems: cartItemsPayload,
            payerName: payerName.trim(),
            userId: user?.id ?? null,
            couponCode: couponApplied ? couponCode : undefined,
          }),
        });
        if (upiRes.ok) {
          const upiData = await upiRes.json();
          clearCart();
          setUpiModalData({
            orderId: upiData.orderId,
            orderNumber: upiData.orderNumber || "",
            upiId: upiData.upiId || "",
            qrCodeUrl: upiData.qrCodeUrl || undefined,
            amount: String(upiData.amount || total),
            currency: upiData.currency || currency,
            expiresAt: upiData.expiresAt,
          });
          setIsProcessing(false);
          return;
        }
        // Fall through to generic payment initiate if UPI initiate failed
      }

      // ── Generic gateway payment ──────────────────────────────────────────────
      const initiateRes = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentType: selectedPaymentType,
          amount: total,
          currency,
          email: "guest@checkout.com",
          name: "Guest",
          productInfo,
          couponCode: couponApplied ? couponCode : undefined,
          cartItems: cartItemsPayload,
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
                  gatewayId: result.gatewayId,
                  internalOrderId: result.internalOrderId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              const verifyData = await verifyRes.json();
              if (verifyData.success) {
                setUpiSuccess({}); // reuse success overlay
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
              setErrorMsg("Payment cancelled.");
            },
          },
        });
        rzp.open();

      } else if (result.type === "upi") {
        // manual_upi gateway responded via generic initiate — show UPI overlay
        clearCart();
        setUpiModalData({
          orderId: result.orderId,
          orderNumber: result.orderNumber || "",
          upiId: result.upiId || "",
          amount: String(result.amount || total),
          currency: result.currency || currency,
          expiresAt: result.expiresAt,
        });
        setIsProcessing(false);

      } else if (result.type === "redirect_url") {
        clearCart();
        window.location.href = result.url;

      } else if (result.type === "redirect") {
        clearCart();
        submitRedirectForm(result.formUrl, result.method || "POST", result.fields || {});

      } else {
        throw new Error("Unknown payment response");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Payment failed. Please try again.");
      setIsProcessing(false);
    }
  }

  // ─── Empty cart ────────────────────────────────────────────────────────────
  if (items.length === 0 && !upiModalData && !upiSuccess) {
    return (
      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "4rem 1.5rem", textAlign: "center" }}>
        <h2 className="font-orbitron" style={{ fontSize: "1.5rem", fontWeight: 700, color: "hsl(210,40%,90%)", marginBottom: "1rem" }}>Your Cart is Empty</h2>
        <p style={{ color: "hsl(220,10%,50%)", marginBottom: "2rem" }}>Add items to your cart before proceeding to checkout.</p>
        <Link href="/products" className="btn-primary" data-testid="link-browse-products">
          <ArrowLeft size={16} /> Browse Products
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* ─── UPI Inline Modal ─────────────────────────────────────────────── */}
      {upiModalData && !upiSuccess && (
        <UpiPaymentOverlay
          data={upiModalData}
          onSuccess={(utr) => {
            setUpiModalData(null);
            setUpiSuccess({ utr });
          }}
          onExpired={() => {
            setUpiModalData(null);
            setErrorMsg("Payment window expired. If you completed the payment, check your orders in a few minutes.");
          }}
          onClose={() => {
            setUpiModalData(null);
            setErrorMsg("Payment window closed. Your order is pending — check Orders to see status.");
          }}
        />
      )}

      {/* ─── Payment Success Screen ──────────────────────────────────────── */}
      {upiSuccess && (
        <SuccessScreen utr={upiSuccess.utr} redirectTo={backHref} />
      )}

      {/* ─── Main Checkout ────────────────────────────────────────────────── */}
      <div style={{ maxWidth: "560px", margin: "0 auto", padding: "1.5rem 1rem 4rem" }}>
        <Link href={backHref} style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "hsl(220,10%,55%)", marginBottom: "1.25rem", textDecoration: "none", fontSize: "0.875rem" }} data-testid="link-back-to-cart">
          <ArrowLeft size={15} /> Back to {backLabel}
        </Link>

        <h1 className="font-orbitron" style={{ fontSize: "1.5rem", fontWeight: 700, color: "hsl(210,40%,95%)", marginBottom: "1.5rem" }}>Checkout</h1>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* ── Order Summary ── */}
          <div style={card}>
            <h3 style={{ fontSize: "0.8rem", fontWeight: 700, color: "hsl(220,10%,52%)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem" }}>
              Order Summary
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
              {items.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(210,40%,92%)" }}>{item.productTitle}</div>
                    <div style={{ fontSize: "0.75rem", color: "hsl(220,10%,48%)", marginTop: "2px" }}>
                      {item.packageName} × {item.quantity}
                    </div>
                    {/* Player info */}
                    {(item.userId || item.playerId || item.zoneId) && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginTop: "5px" }}>
                        {(item.userId || item.playerId) && (
                          <span style={{ fontSize: "0.7rem", color: "hsl(220,10%,42%)" }}>
                            User ID: {item.playerId || item.userId}
                          </span>
                        )}
                        {item.zoneId && (
                          <span style={{ fontSize: "0.7rem", color: "hsl(220,10%,42%)" }}>
                            Zone / Server: {item.zoneId}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "hsl(210,40%,88%)", whiteSpace: "nowrap" }}>
                    {currencySymbol}{(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ borderTop: "1px solid hsl(220,15%,16%)", paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                <span style={{ color: "hsl(220,10%,50%)" }}>Subtotal</span>
                <span style={{ color: "hsl(210,40%,82%)" }}>{currencySymbol}{subtotal.toFixed(2)}</span>
              </div>
              {fees.map((fee) => {
                const amt = fee.type === "percentage" ? subtotal * (parseFloat(fee.amount) / 100) : parseFloat(fee.amount);
                return (
                  <div key={fee.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                    <span style={{ color: "hsl(220,10%,50%)" }}>{fee.name}{fee.type === "percentage" && ` (${parseFloat(fee.amount).toFixed(2)}%)`}</span>
                    <span style={{ color: "hsl(210,40%,82%)" }}>{currencySymbol}{amt.toFixed(2)}</span>
                  </div>
                );
              })}
              {taxEnabled && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                  <span style={{ color: "hsl(220,10%,50%)" }}>{taxName} ({(taxRate * 100).toFixed(taxRate * 100 % 1 === 0 ? 0 : 1)}%)</span>
                  <span style={{ color: "hsl(210,40%,82%)" }}>{currencySymbol}{taxAmount.toFixed(2)}</span>
                </div>
              )}
              {couponApplied && couponDiscount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                  <span style={{ color: "hsl(142,70%,55%)" }}>Coupon Discount</span>
                  <span style={{ color: "hsl(142,70%,55%)" }}>-{currencySymbol}{couponDiscount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ borderTop: "1px solid hsl(220,15%,16%)", paddingTop: "0.6rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "hsl(210,40%,92%)" }}>Total</span>
                <span className="font-orbitron" style={{ fontSize: "1.25rem", fontWeight: 800, color: "hsl(258,90%,72%)" }} data-testid="text-checkout-total">
                  {currencySymbol}{total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Coupon Code ── */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <Tag size={13} style={{ color: "hsl(258,90%,68%)" }} />
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "hsl(210,40%,85%)" }}>Coupon Code</span>
            </div>
            {couponApplied ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "hsla(142,70%,55%,0.1)", border: "1px solid hsla(142,70%,55%,0.25)", borderRadius: "0.5rem", padding: "0.6rem 0.75rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Tag size={12} style={{ color: "hsl(142,70%,55%)" }} />
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(142,70%,60%)" }}>{couponCode.toUpperCase()}</span>
                  <span style={{ fontSize: "0.75rem", color: "hsl(142,70%,50%)" }}>(-{currencySymbol}{couponDiscount.toFixed(2)})</span>
                </div>
                <button onClick={removeCoupon} data-testid="button-remove-coupon" style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(142,70%,50%)" }}>
                  <X size={14} />
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
            {couponError && <p style={{ fontSize: "0.75rem", color: "hsl(0,72%,60%)", marginTop: "0.4rem" }}>{couponError}</p>}
            {couponSuccessMsg && !couponError && <p style={{ fontSize: "0.75rem", color: "hsl(142,70%,50%)", marginTop: "0.4rem" }}>{couponSuccessMsg}</p>}
          </div>

          {/* ── Payment Method Type Selection ── */}
          <div style={card}>
            <h3 style={{ fontSize: "0.8rem", fontWeight: 700, color: "hsl(220,10%,52%)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.875rem" }}>
              Payment Method
            </h3>
            {paymentTypes.length === 0 ? (
              <p style={{ fontSize: "0.875rem", color: "hsl(0,72%,60%)", textAlign: "center", padding: "1rem 0" }}>
                No payment methods configured. Please contact support.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {paymentTypes.map((pt) => {
                  const isSelected = selectedPaymentType === pt.key;
                  return (
                    <button
                      key={pt.key}
                      type="button"
                      onClick={() => setSelectedPaymentType(pt.key)}
                      data-testid={`select-payment-type-${pt.key.toLowerCase()}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.875rem",
                        padding: "0.875rem 1rem",
                        borderRadius: "0.625rem",
                        border: `1px solid ${isSelected ? "hsl(258,90%,58%)" : "hsl(220,15%,18%)"}`,
                        background: isSelected ? "hsla(258,90%,58%,0.1)" : "hsl(220,20%,11%)",
                        cursor: "pointer",
                        textAlign: "left",
                        width: "100%",
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                    >
                      {/* Radio dot */}
                      <div style={{
                        width: "18px", height: "18px", borderRadius: "50%", flexShrink: 0,
                        border: `2px solid ${isSelected ? "hsl(258,90%,62%)" : "hsl(220,15%,32%)"}`,
                        background: isSelected ? "hsl(258,90%,62%)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {isSelected && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "white" }} />}
                      </div>

                      {/* Icon */}
                      <div style={{
                        width: "36px", height: "36px", borderRadius: "8px",
                        background: isSelected ? "hsla(258,90%,62%,0.18)" : "hsl(220,20%,14%)",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        color: isSelected ? "hsl(258,90%,70%)" : "hsl(220,10%,55%)",
                      }}>
                        {PAYMENT_ICONS[pt.key] || <CreditCard size={18} />}
                      </div>

                      {/* Label */}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.9rem", fontWeight: 700, color: isSelected ? "hsl(210,40%,95%)" : "hsl(210,40%,75%)" }}>
                          {pt.label}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "hsl(220,10%,45%)", marginTop: "1px" }}>
                          {PAYMENT_DESCRIPTIONS[pt.key] || pt.label}
                        </div>
                      </div>

                      <ChevronRight size={15} style={{ color: isSelected ? "hsl(258,90%,68%)" : "hsl(220,10%,38%)", flexShrink: 0 }} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Payer Name (UPI only) ── */}
          {selectedPaymentType === "UPI" && (
            <div style={card}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(210,40%,80%)", marginBottom: "0.5rem" }}>
                Your name (as in UPI / bank account)
              </label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={payerName}
                onChange={e => setPayerName(e.target.value)}
                data-testid="input-payer-name"
                style={{
                  width: "100%",
                  padding: "0.7rem 0.875rem",
                  borderRadius: "0.5rem",
                  border: "1px solid hsl(220,15%,22%)",
                  background: "hsl(220,20%,11%)",
                  color: "hsl(210,40%,92%)",
                  fontSize: "0.9rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <p style={{ margin: "0.375rem 0 0", fontSize: "11px", color: "hsl(220,10%,42%)" }}>
                Optional — helps us match your payment faster when multiple orders arrive at the same time.
              </p>
            </div>
          )}

          {/* ── Error ── */}
          {errorMsg && (
            <div style={{ background: "hsla(0,72%,55%,0.08)", border: "1px solid hsla(0,72%,55%,0.25)", borderRadius: "0.75rem", padding: "0.85rem 1rem", display: "flex", gap: "0.65rem", alignItems: "flex-start" }}>
              <AlertCircle size={15} style={{ color: "hsl(0,72%,58%)", flexShrink: 0, marginTop: "1px" }} />
              <div style={{ fontSize: "0.8rem", color: "hsl(0,72%,62%)" }}>{errorMsg}</div>
            </div>
          )}

          {/* ── Buy Now Button ── */}
          <button
            type="button"
            disabled={isProcessing || paymentTypes.length === 0}
            onClick={handlePayment}
            className="btn-buy-action"
            style={{
              width: "100%",
              justifyContent: "center",
              padding: "0.95rem 1.5rem",
              fontSize: "1rem",
              fontWeight: 700,
              opacity: isProcessing || paymentTypes.length === 0 ? 0.7 : 1,
              cursor: isProcessing || paymentTypes.length === 0 ? "not-allowed" : "pointer",
            }}
            data-testid="button-place-order"
          >
            {paymentTypes.length === 0
              ? "Payment Not Configured"
              : isProcessing
              ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Processing...</>
              : <>Pay {currencySymbol}{total.toFixed(2)} <ArrowRight size={16} /></>}
          </button>

          {selectedPaymentType && (
            <p style={{ textAlign: "center", fontSize: "0.7rem", color: "hsl(220,10%,35%)" }}>
              Secured payment via {paymentTypes.find(t => t.key === selectedPaymentType)?.label || selectedPaymentType}
              {" · "}Encrypted end-to-end
            </p>
          )}

        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
