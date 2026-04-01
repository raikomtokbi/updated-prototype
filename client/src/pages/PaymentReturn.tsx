import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { CheckCircle, XCircle, Loader2, ArrowRight, RotateCcw } from "lucide-react";

interface ReturnStatus {
  status: "loading" | "success" | "failed" | "pending";
  message?: string;
  transactionId?: string;
  orderId?: string;
  gateway?: string;
}

export default function PaymentReturn() {
  const [, navigate] = useLocation();
  const [state, setState] = useState<ReturnStatus>({ status: "loading" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    const gateway = params.get("gateway") || "unknown";
    const orderId = params.get("order_id") || params.get("txnid") || params.get("merchantTransactionId");
    const txnId = params.get("cf_order_token") || params.get("payment_id") || params.get("TXNID") || orderId;

    // Handle CCAvenue encrypted response
    const encResp = params.get("encResp");
    if (encResp) {
      verifyGatewayResponse(gateway, { encResp }).then(setState);
      return;
    }

    // Handle Cashfree return
    const cfOrderId = params.get("order_id");
    if (cfOrderId && gateway === "cashfree") {
      verifyGatewayResponse(gateway, { order_id: cfOrderId }).then(setState);
      return;
    }

    // Handle Instamojo return
    const paymentRequestId = params.get("payment_request_id");
    const paymentId = params.get("payment_id");
    if (paymentId && paymentRequestId) {
      verifyGatewayResponse(gateway, { payment_id: paymentId, payment_request_id: paymentRequestId }).then(setState);
      return;
    }

    // Handle PhonePe return
    if (gateway === "phonepe" && orderId) {
      verifyGatewayResponse(gateway, { merchantTransactionId: orderId }).then(setState);
      return;
    }

    // Handle Paytm callback POST (usually comes as POST, but redirect is GET with STATUS)
    const paytmStatus = params.get("STATUS");
    if (paytmStatus) {
      if (paytmStatus === "TXN_SUCCESS") {
        setState({ status: "success", gateway, transactionId: params.get("TXNID") || undefined, orderId: orderId || undefined });
      } else {
        setState({ status: "failed", gateway, message: params.get("RESPMSG") || "Payment failed" });
      }
      return;
    }

    // Handle PayU / EasyBuzz simple status
    if (status === "success") {
      setState({ status: "success", gateway, transactionId: txnId || undefined, orderId: orderId || undefined });
    } else if (status === "failed" || status === "failure" || status === "cancelled") {
      setState({ status: "failed", gateway, message: "Payment was not completed" });
    } else {
      setState({ status: "pending", gateway, message: "Payment status is being confirmed..." });
    }
  }, []);

  async function verifyGatewayResponse(gateway: string, params: Record<string, string>): Promise<ReturnStatus> {
    try {
      const res = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...params, gateway }),
      });
      const data = await res.json();
      if (data.success) {
        return { status: "success", gateway, transactionId: data.transactionId };
      }
      return { status: "failed", gateway, message: data.error || "Verification failed" };
    } catch {
      return { status: "failed", gateway, message: "Could not verify payment" };
    }
  }

  if (state.status === "loading") {
    return (
      <div style={{ maxWidth: "480px", margin: "4rem auto", padding: "2rem 1.5rem", textAlign: "center" }}>
        <Loader2 size={48} style={{ color: "hsl(258,70%,65%)", animation: "spin 1s linear infinite", margin: "0 auto 1.5rem" }} />
        <h2 className="font-orbitron" style={{ fontSize: "1.25rem", fontWeight: 700, color: "hsl(210,40%,92%)", marginBottom: "0.5rem" }}>
          Confirming Payment...
        </h2>
        <p style={{ color: "hsl(220,10%,50%)", fontSize: "0.875rem" }}>
          Please wait while we verify your payment.
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (state.status === "success") {
    return (
      <div style={{ maxWidth: "520px", margin: "4rem auto", padding: "2rem 1.5rem", textAlign: "center" }}>
        <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "hsla(142,70%,55%,0.15)", border: "2px solid hsl(142,70%,55%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
          <CheckCircle size={40} style={{ color: "hsl(142,70%,55%)" }} />
        </div>
        <h2 className="font-orbitron" style={{ fontSize: "1.5rem", fontWeight: 700, color: "hsl(210,40%,92%)", marginBottom: "0.75rem" }}>
          Payment Successful!
        </h2>
        <p style={{ color: "hsl(220,10%,60%)", fontSize: "0.875rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
          Your order has been confirmed. Digital products will be delivered to your email shortly. Check your spam folder if needed.
        </p>
        {state.transactionId && (
          <div style={{ background: "hsla(258,70%,65%,0.08)", border: "1px solid hsla(258,70%,65%,0.2)", borderRadius: "8px", padding: "0.75rem 1rem", marginBottom: "1.5rem", textAlign: "left" }}>
            <p style={{ fontSize: "11px", color: "hsl(220,10%,45%)", marginBottom: "2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Transaction ID</p>
            <p style={{ fontSize: "13px", color: "hsl(210,40%,85%)", fontFamily: "monospace", wordBreak: "break-all" }}>{state.transactionId}</p>
          </div>
        )}
        <Link href="/products" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }} data-testid="link-continue-shopping">
          Continue Shopping <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  if (state.status === "pending") {
    return (
      <div style={{ maxWidth: "480px", margin: "4rem auto", padding: "2rem 1.5rem", textAlign: "center" }}>
        <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "hsla(40,70%,55%,0.15)", border: "2px solid hsl(40,70%,55%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
          <Loader2 size={40} style={{ color: "hsl(40,70%,55%)", animation: "spin 1s linear infinite" }} />
        </div>
        <h2 className="font-orbitron" style={{ fontSize: "1.25rem", fontWeight: 700, color: "hsl(210,40%,92%)", marginBottom: "0.75rem" }}>
          Payment Pending
        </h2>
        <p style={{ color: "hsl(220,10%,60%)", fontSize: "0.875rem", marginBottom: "2rem", lineHeight: 1.6 }}>
          {state.message || "Your payment is being processed. You will receive a confirmation email once confirmed."}
        </p>
        <Link href="/products" className="btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          Continue Shopping <ArrowRight size={16} />
        </Link>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "480px", margin: "4rem auto", padding: "2rem 1.5rem", textAlign: "center" }}>
      <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "hsla(0,70%,55%,0.15)", border: "2px solid hsl(0,70%,55%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
        <XCircle size={40} style={{ color: "hsl(0,70%,55%)" }} />
      </div>
      <h2 className="font-orbitron" style={{ fontSize: "1.5rem", fontWeight: 700, color: "hsl(210,40%,92%)", marginBottom: "0.75rem" }}>
        Payment Failed
      </h2>
      <p style={{ color: "hsl(220,10%,60%)", fontSize: "0.875rem", marginBottom: "2rem", lineHeight: 1.6 }}>
        {state.message || "Your payment could not be processed. Please try again or use a different payment method."}
      </p>
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
        <Link href="/checkout" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "0.6rem 1.25rem", borderRadius: "0.5rem", background: "hsla(258,70%,65%,0.15)", border: "1px solid hsla(258,70%,65%,0.3)", color: "hsl(258,70%,72%)", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }} data-testid="link-retry-payment">
          <RotateCcw size={15} /> Try Again
        </Link>
        <Link href="/products" style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "0.6rem 1.25rem", borderRadius: "0.5rem", background: "hsl(220,20%,12%)", border: "1px solid hsl(220,15%,18%)", color: "hsl(220,10%,65%)", fontSize: "0.875rem", textDecoration: "none" }}>
          Browse Products
        </Link>
      </div>
    </div>
  );
}
