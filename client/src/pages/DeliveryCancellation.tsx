import { useQuery } from "@tanstack/react-query";

const LAST_UPDATED = "January 1, 2025";

const DEFAULT_SECTIONS = [
  {
    title: "1. Instant Delivery",
    body: `Most game top-ups and vouchers are delivered instantly upon successful payment confirmation. You will receive your product code or credits within seconds.`,
  },
  {
    title: "2. Processing Time",
    body: `In rare cases, delivery may take up to 5 minutes due to payment gateway processing delays or system load.`,
  },
  {
    title: "3. Delivery Verification",
    body: `Once your order is confirmed, you will receive an email with your delivery details and product information.`,
  },
  {
    title: "4. Multiple Purchases",
    body: `If you purchase multiple items, each item will be delivered according to its processing requirements. You will receive individual confirmation emails for each delivery.`,
  },
  {
    title: "5. Cancellation Before Delivery",
    body: `If you wish to cancel your order before delivery, you must contact our support team within 1 hour of purchase.`,
  },
  {
    title: "6. Cancellation After Delivery",
    body: `Once the product has been delivered to your account, cancellation is not possible. However, you may request a refund if the product was not properly delivered or if it was a duplicate order.`,
  },
  {
    title: "7. Refund Eligibility",
    body: `Refunds are only available in the following cases: Product was not delivered within the promised timeframe (24 hours), Product was delivered multiple times (duplicate order), Technical error resulted in incorrect product delivery, or Payment was charged twice for the same order.`,
  },
  {
    title: "8. Refund Processing Time",
    body: `Approved refunds will be processed within 5-7 business days back to your original payment method.`,
  },
  {
    title: "9. Non-Refundable Items",
    body: `Expired vouchers or expired promotional codes, Redeemed or partially redeemed credits, Orders that were intentionally misused or fraudulently obtained, Purchases that violate the terms of service, and Third-party purchases made by authorized account users cannot be refunded.`,
  },
  {
    title: "10. How to Request a Refund",
    body: `To request a refund, log in to your account and go to your Order History, locate the order you wish to dispute, click the "Request Refund" button, provide details about your issue, and submit your request for review. Alternatively, you can contact our support team directly with your order number and reason for refund.`,
  },
  {
    title: "11. Contact Us",
    body: `If you have questions about our delivery and cancellation policy, please reach out to our support team through our Contact page or via email.`,
  },
];

export default function DeliveryCancellation() {
  const { data: siteSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
    staleTime: 0,
  });

  const customContent = siteSettings?.delivery_cancellation_content;

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1
          className="font-orbitron"
          style={{ fontSize: "1.75rem", fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: "0.5rem" }}
        >
          Delivery & Cancellation Policy
        </h1>
        <p style={{ fontSize: "0.68rem", color: "hsl(var(--muted-foreground))" }}>
          Last updated: {LAST_UPDATED}
        </p>
      </div>

      {customContent ? (
        <div
          style={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.75rem",
            padding: "1.5rem",
            fontSize: "0.68rem",
            color: "hsl(var(--muted-foreground))",
            lineHeight: 1.75,
            whiteSpace: "pre-wrap",
          }}
        >
          {customContent}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {DEFAULT_SECTIONS.map((section, idx) => (
            <div key={idx}>
              <h3
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  color: "hsl(var(--foreground))",
                  marginBottom: "0.5rem",
                }}
              >
                {section.title}
              </h3>
              <p
                style={{
                  fontSize: "0.68rem",
                  color: "hsl(var(--muted-foreground))",
                  lineHeight: 1.75,
                }}
              >
                {section.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
