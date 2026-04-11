import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, MessageCircleQuestion } from "lucide-react";
import { Link } from "wouter";

type FaqItem = { q: string; a: string };

function FaqRow({ item, index }: { item: FaqItem; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{
        background: "hsl(var(--card))",
        border: "1px solid hsl(var(--border))",
        borderRadius: "0.75rem",
        overflow: "hidden",
        transition: "border-color 0.2s",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "1.1rem 1.4rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              flexShrink: 0,
              width: "24px",
              height: "24px",
              borderRadius: "6px",
              background: "hsla(258,90%,66%,0.12)",
              border: "1px solid hsla(258,90%,66%,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              fontWeight: 700,
              color: "hsl(var(--primary))",
            }}
          >
            {index + 1}
          </span>
          <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "hsl(var(--foreground))", lineHeight: 1.4 }}>
            {item.q}
          </span>
        </div>
        {open
          ? <ChevronUp size={16} style={{ color: "hsl(var(--primary))", flexShrink: 0 }} />
          : <ChevronDown size={16} style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0 }} />
        }
      </button>
      {open && (
        <div
          style={{
            padding: "0 1.4rem 1.2rem 3.6rem",
            fontSize: "0.875rem",
            color: "hsl(var(--muted-foreground))",
            lineHeight: 1.7,
            borderTop: "1px solid hsl(var(--border))",
            paddingTop: "1rem",
          }}
        >
          {item.a}
        </div>
      )}
    </div>
  );
}

export default function Faq() {
  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
    staleTime: 5 * 60 * 1000,
  });

  let faqs: FaqItem[] = [];
  try {
    const parsed = JSON.parse(settings?.faq_items || "[]");
    if (Array.isArray(parsed)) {
      faqs = parsed.filter((item: any) => item.q || item.a);
    }
  } catch {
    faqs = [];
  }

  const siteName = settings?.site_name || "Nexcoin";

  return (
    <div style={{ maxWidth: "780px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      {/* Header */}
      <div
        style={{
          textAlign: "center",
          padding: "2.5rem 1rem",
          marginBottom: "2.5rem",
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "1.25rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse 60% 60% at 50% 0%, hsla(258,90%,66%,0.07) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            width: "52px", height: "52px", borderRadius: "0.9rem",
            background: "hsla(258,90%,66%,0.12)",
            border: "1px solid hsla(258,90%,66%,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1.1rem", position: "relative",
          }}
        >
          <MessageCircleQuestion size={24} style={{ color: "hsl(var(--primary))" }} />
        </div>
        <h1
          className="font-orbitron"
          style={{ fontSize: "1.85rem", fontWeight: 800, color: "hsl(var(--foreground))", marginBottom: "0.6rem", position: "relative" }}
        >
          Frequently Asked Questions
        </h1>
        <p style={{ fontSize: "0.9rem", color: "hsl(var(--muted-foreground))", maxWidth: "480px", margin: "0 auto", position: "relative" }}>
          Everything you need to know about {siteName}. Can't find an answer?{" "}
          <Link href="/support" style={{ color: "hsl(var(--primary))", textDecoration: "underline" }}>
            Contact support
          </Link>.
        </p>
      </div>

      {/* FAQ list */}
      {faqs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "hsl(var(--muted-foreground))", fontSize: "13px" }}>
          No FAQ items yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {faqs.map((item, i) => (
            <FaqRow key={i} item={item} index={i} />
          ))}
        </div>
      )}

      {/* CTA */}
      <div
        style={{
          marginTop: "2.5rem",
          padding: "1.5rem",
          background: "hsl(var(--card))",
          border: "1px solid hsl(var(--border))",
          borderRadius: "0.75rem",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: "0.875rem", color: "hsl(var(--muted-foreground))", marginBottom: "0.75rem" }}>
          Still have questions? Our support team is available 24/7.
        </p>
        <Link href="/support">
          <button className="btn-primary" style={{ fontSize: "13px" }}>
            Contact Support
          </button>
        </Link>
      </div>
    </div>
  );
}
