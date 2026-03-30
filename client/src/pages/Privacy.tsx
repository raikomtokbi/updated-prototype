import { useQuery } from "@tanstack/react-query";

const LAST_UPDATED = "January 1, 2025";

const DEFAULT_SECTIONS = [
  {
    title: "1. Information We Collect",
    body: `We collect information you provide directly to us when you create an account, place an order, or contact our support team. This includes your username, email address, and transaction details. We do not store payment card details — these are handled by our PCI-compliant payment processors.`,
  },
  {
    title: "2. How We Use Your Information",
    body: `We use the information we collect to process your orders, deliver digital products, send order confirmations, provide customer support, and improve our platform. We do not sell your personal data to third parties.`,
  },
  {
    title: "3. Data Sharing",
    body: `We may share your information with trusted service providers who assist us in operating our platform, such as payment processors and email delivery services. These providers are contractually required to protect your data and may not use it for their own purposes.`,
  },
  {
    title: "4. Cookies",
    body: `We use essential cookies to maintain your session and remember your preferences. We do not use tracking or advertising cookies. You can disable cookies in your browser settings, but this may affect the functionality of our site.`,
  },
  {
    title: "5. Data Retention",
    body: `We retain your personal data for as long as your account is active or as needed to provide you services. You may request deletion of your account and associated data at any time by contacting our support team.`,
  },
  {
    title: "6. Security",
    body: `We implement industry-standard security measures to protect your data, including encrypted connections (HTTPS/TLS) and access controls. However, no method of transmission over the internet is 100% secure. Please keep your login credentials confidential.`,
  },
  {
    title: "7. Children's Privacy",
    body: `Our services are not directed to individuals under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal data, please contact us so we can delete it.`,
  },
  {
    title: "8. Changes to This Policy",
    body: `We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page with an updated date. Your continued use of the platform after changes are posted constitutes your acceptance.`,
  },
  {
    title: "9. Contact",
    body: `If you have questions about this Privacy Policy, please contact us through our Contact page.`,
  },
];

export default function Privacy() {
  const { data: siteSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
    staleTime: 0,
  });

  const customContent = siteSettings?.privacy_content;

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1
          className="font-orbitron"
          style={{ fontSize: "1.75rem", fontWeight: 700, color: "hsl(210,40%,95%)", marginBottom: "0.5rem" }}
        >
          Privacy Policy
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
