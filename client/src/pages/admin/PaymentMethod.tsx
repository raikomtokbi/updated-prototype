import AdminLayout from "@/components/admin/AdminLayout";
import { CreditCard, Wallet, Landmark } from "lucide-react";

const paymentMethods = [
  { name: "Credit / Debit Card", provider: "Stripe", icon: <CreditCard size={17} />, enabled: true, fees: "2.9% + $0.30" },
  { name: "PayPal", provider: "PayPal Inc.", icon: <Wallet size={17} />, enabled: true, fees: "3.49% + fixed fee" },
  { name: "Bank Transfer", provider: "Manual", icon: <Landmark size={17} />, enabled: false, fees: "No fee" },
  { name: "Cryptocurrency", provider: "CoinGate", icon: <Wallet size={17} />, enabled: false, fees: "1% per transaction" },
];

const card: React.CSSProperties = {
  background: "hsl(220, 20%, 9%)",
  border: "1px solid hsl(220, 15%, 13%)",
  borderRadius: "8px",
  marginBottom: "12px",
};

export default function PaymentMethod() {
  return (
    <AdminLayout title="Payment Methods">
      <div>
        {paymentMethods.map((method, i) => (
          <div
            key={i}
            data-testid={`card-payment-${method.name.toLowerCase().replace(/[\s/]/g, "-")}`}
            style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "hsl(220, 15%, 13%)", color: "hsl(258, 90%, 66%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {method.icon}
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 500, color: "hsl(210, 40%, 95%)" }}>{method.name}</div>
                <div style={{ fontSize: "11px", color: "hsl(220, 10%, 42%)", marginTop: "2px" }}>
                  {method.provider} &mdash; {method.fees}
                </div>
              </div>
            </div>
            <span style={{ padding: "2px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, background: method.enabled ? "rgba(74, 222, 128, 0.12)" : "rgba(239, 68, 68, 0.12)", color: method.enabled ? "hsl(142, 71%, 45%)" : "hsl(0, 72%, 51%)" }}>
              {method.enabled ? "Enabled" : "Disabled"}
            </span>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
