import { useQuery } from "@tanstack/react-query";

const LAST_UPDATED = "January 1, 2025";

const DEFAULT_SECTIONS = [
  {
    title: "1. Overview",
    body: `At Nexcoin, we are committed to ensuring your satisfaction. Due to the digital nature of our products — including game top-ups, vouchers, gift cards, and subscriptions — all sales are generally final once a digital product has been delivered or credited. Please read this policy carefully before making a purchase.`,
  },
  {
    title: "2. Eligible Refund Situations",
    body: `You are eligible for a refund under the following circumstances:\n\n(a) The top-up or product was not delivered within 24 hours of confirmed payment.\n(b) The product delivered was materially different from what was advertised on the platform.\n(c) A duplicate charge occurred due to a technical error on our end.\n(d) The product code or voucher provided was invalid or already used prior to your purchase.`,
  },
  {
    title: "3. Non-Refundable Situations",
    body: `Refunds will not be issued in the following cases:\n\n(a) The digital product has already been delivered and used in a game account.\n(b) You purchased the wrong product, denomination, or region.\n(c) Your game account is banned, suspended, or otherwise ineligible to receive top-ups.\n(d) More than 7 days have passed since the order date.\n(e) The request is based on a change of mind after delivery.`,
  },
  {
    title: "4. How to Request a Refund",
    body: `To submit a refund request, please contact our support team within 7 days of your order date. Include your Order ID, a description of the issue, and any relevant screenshots. We will review your request and respond within 2–3 business days.`,
  },
  {
    title: "5. Refund Processing",
    body: `Approved refunds will be processed back to the original payment method used for the purchase. Processing times may vary depending on your bank or payment provider but typically take 3–7 business days. We will notify you via email once your refund has been initiated.`,
  },
  {
    title: "6. Chargebacks",
    body: `Filing a chargeback without first contacting our support team may result in immediate account suspension. We take fraud prevention seriously and cooperate fully with payment processors. If you have an issue with a charge, please contact us first — we aim to resolve disputes fairly and promptly.`,
  },
  {
    title: "7. Changes to This Policy",
    body: `We reserve the right to update this Refund Policy at any time. Changes will be posted on this page with an updated date. Your continued use of the platform after changes are posted constitutes your acceptance of the revised policy.`,
  },
  {
    title: "8. Contact",
    body: `For refund requests or questions about this policy, please reach out through our Contact page or Support portal. We are here to help.`,
  },
];

export default function RefundPolicy() {
  const { data: siteSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
    staleTime: 0,
  });

  const customContent = siteSettings?.refund_content;

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1
          className="font-orbitron"
          style={{ fontSize: "1.75rem", fontWeight: 700, color: "hsl(210,40%,95%)", marginBottom: "0.5rem" }}
        >
          Refund Policy
        </h1>
        <p style={{ fontSize: "0.8rem", color: "hsl(220,10%,45%)" }}>
          Last updated: {LAST_UPDATED}
        </p>
      </div>

      {customContent ? (
        <div
          style={{
            background: "hsl(220,20%,9%)",
            border: "1px solid hsl(220,15%,18%)",
            borderRadius: "0.75rem",
            padding: "1.5rem",
            fontSize: "0.85rem",
            color: "hsl(220,10%,60%)",
            lineHeight: 1.75,
            whiteSpace: "pre-wrap",
          }}
        >
          {customContent}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {DEFAULT_SECTIONS.map((section) => (
            <div
              key={section.title}
              style={{
                background: "hsl(220,20%,9%)",
                border: "1px solid hsl(220,15%,18%)",
                borderRadius: "0.75rem",
                padding: "1.5rem",
              }}
            >
              <h2
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "hsl(210,40%,90%)",
                  marginBottom: "0.7rem",
                }}
              >
                {section.title}
              </h2>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "hsl(220,10%,55%)",
                  lineHeight: 1.7,
                  whiteSpace: "pre-line",
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
