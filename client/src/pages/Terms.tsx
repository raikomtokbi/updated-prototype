import { useQuery } from "@tanstack/react-query";

const LAST_UPDATED = "January 1, 2025";

const DEFAULT_SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: `By accessing or using Nexcoin ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you may not use our services.`,
  },
  {
    title: "2. Eligibility",
    body: `You must be at least 13 years of age to use the Platform. By using our services, you represent and warrant that you meet this requirement. If you are under 18, you must have parental or guardian consent.`,
  },
  {
    title: "3. Account Responsibilities",
    body: `You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorised use of your account. Nexcoin is not liable for any loss arising from unauthorised account access caused by your failure to safeguard your credentials.`,
  },
  {
    title: "4. Purchases & Delivery",
    body: `All sales are final once a digital top-up has been credited to a game account. Delivery times are estimates and may vary. We strive to fulfil all orders instantly but reserve the right to cancel orders in cases of fraud, pricing errors, or product unavailability, with a full refund issued.`,
  },
  {
    title: "5. Refund Policy",
    body: `Due to the digital nature of our products, refunds are only issued if: (a) the top-up was not delivered within 24 hours of payment, (b) the product delivered was materially different from what was advertised, or (c) a duplicate charge occurred. All refund requests must be submitted within 7 days of the order date.`,
  },
  {
    title: "6. Prohibited Conduct",
    body: `You agree not to use the Platform to: (a) violate any applicable law or regulation, (b) engage in fraudulent transactions, (c) attempt to reverse-engineer or exploit our systems, (d) resell products without written authorisation from Nexcoin, or (e) harass or harm other users or our staff.`,
  },
  {
    title: "7. Intellectual Property",
    body: `All content on the Platform, including logos, product descriptions, and UI design, is owned by or licensed to Nexcoin. You may not reproduce, distribute, or create derivative works without our prior written consent.`,
  },
  {
    title: "8. Limitation of Liability",
    body: `To the maximum extent permitted by law, Nexcoin and its affiliates will not be liable for any indirect, incidental, or consequential damages arising from your use of the Platform. Our total aggregate liability for any claim is limited to the amount you paid for the specific order in dispute.`,
  },
  {
    title: "9. Changes to Terms",
    body: `We reserve the right to modify these Terms at any time. We will provide notice by updating the date at the top of this page. Continued use of the Platform after changes take effect constitutes your agreement to the revised Terms.`,
  },
  {
    title: "10. Governing Law",
    body: `These Terms shall be governed by and construed in accordance with applicable law. Any disputes shall be resolved through binding arbitration or, where not permitted, in the courts of competent jurisdiction.`,
  },
  {
    title: "11. Contact",
    body: `For questions regarding these Terms, please contact us through our Contact page.`,
  },
];

export default function Terms() {
  const { data: siteSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
    staleTime: 0,
  });

  const customContent = siteSettings?.terms_content;

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1
          className="font-orbitron"
          style={{ fontSize: "1.75rem", fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: "0.5rem" }}
        >
          Terms & Services
        </h1>
        <p style={{ fontSize: "0.8rem", color: "hsl(var(--muted-foreground))" }}>
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
            fontSize: "0.85rem",
            color: "hsl(var(--muted-foreground))",
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
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.75rem",
                padding: "1.5rem",
              }}
            >
              <h2
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: "hsl(var(--foreground))",
                  marginBottom: "0.7rem",
                }}
              >
                {section.title}
              </h2>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "hsl(var(--muted-foreground))",
                  lineHeight: 1.7,
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
