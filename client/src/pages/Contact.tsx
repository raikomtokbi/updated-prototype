import { useState } from "react";
import { Mail, MessageSquare, Send, Phone, MapPin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const { data: siteSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
    staleTime: 0,
  });

  const contactEmail = siteSettings?.contact_email || "support@nexcoin.gg";
  const contactPhone = siteSettings?.contact_phone || "";
  const contactAddress = siteSettings?.contact_address || "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: `Contact from ${name}`, message, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send message");
      setSuccess("Thanks for reaching out! We'll reply to your email within 24 hours.");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1
          className="font-orbitron"
          style={{ fontSize: "1.75rem", fontWeight: 700, color: "hsl(210,40%,95%)", marginBottom: "0.5rem" }}
        >
          Contact Us
        </h1>
        <p style={{ fontSize: "0.875rem", color: "hsl(220,10%,55%)" }}>
          Have a question or want to work with us? Drop us a message.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "2rem",
          alignItems: "start",
        }}
        className="contact-grid"
      >
        {/* Contact info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {[
            { icon: Mail, label: "Email", value: contactEmail, href: `mailto:${contactEmail}` },
            ...(contactPhone ? [{ icon: Phone, label: "Phone", value: contactPhone, href: `tel:${contactPhone}` }] : []),
            ...(contactAddress ? [{ icon: MapPin, label: "Address", value: contactAddress, href: "#" }] : []),
            { icon: MessageSquare, label: "Live Support", value: "Available via ticket", href: "/support" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.label}
                href={item.href}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.9rem",
                    padding: "1.1rem",
                    background: "hsl(220,20%,9%)",
                    border: "1px solid hsl(220,15%,18%)",
                    borderRadius: "0.75rem",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.borderColor = "hsla(258,90%,66%,0.4)")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.borderColor = "hsl(220,15%,18%)")
                  }
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "0.55rem",
                      background: "hsla(258,90%,66%,0.12)",
                      border: "1px solid hsla(258,90%,66%,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={16} style={{ color: "hsl(258,90%,70%)" }} />
                  </div>
                  <div>
                    <p style={{ fontSize: "0.72rem", color: "hsl(220,10%,45%)", marginBottom: "0.1rem" }}>
                      {item.label}
                    </p>
                    <p style={{ fontSize: "0.82rem", color: "hsl(210,40%,85%)", fontWeight: 500 }}>
                      {item.value}
                    </p>
                  </div>
                </div>
              </a>
            );
          })}

          <div
            style={{
              padding: "1.1rem",
              background: "hsl(220,20%,9%)",
              border: "1px solid hsl(220,15%,18%)",
              borderRadius: "0.75rem",
            }}
          >
            <p style={{ fontSize: "0.72rem", color: "hsl(220,10%,45%)", marginBottom: "0.4rem" }}>
              Response time
            </p>
            <p style={{ fontSize: "0.82rem", color: "hsl(210,40%,85%)", fontWeight: 500 }}>
              Within 24 hours
            </p>
            <p style={{ fontSize: "0.75rem", color: "hsl(220,10%,50%)", marginTop: "0.3rem" }}>
              Mon – Sun, including public holidays
            </p>
          </div>
        </div>

        {/* Form */}
        <div
          style={{
            background: "hsl(220,20%,9%)",
            border: "1px solid hsl(220,15%,18%)",
            borderRadius: "1rem",
            padding: "1.75rem",
          }}
        >
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            <div>
              <label
                htmlFor="contact-name"
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "hsl(220,10%,65%)",
                  marginBottom: "0.4rem",
                }}
              >
                Name
              </label>
              <input
                id="contact-name"
                className="input-field"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div>
              <label
                htmlFor="contact-email"
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "hsl(220,10%,65%)",
                  marginBottom: "0.4rem",
                }}
              >
                Email
              </label>
              <input
                id="contact-email"
                className="input-field"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
              />
            </div>

            <div>
              <label
                htmlFor="contact-message"
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "hsl(220,10%,65%)",
                  marginBottom: "0.4rem",
                }}
              >
                Message
              </label>
              <textarea
                id="contact-message"
                className="input-field"
                placeholder="How can we help you?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                style={{ resize: "vertical", minHeight: "100px" }}
              />
            </div>

            {error && (
              <div
                style={{
                  padding: "0.7rem 1rem",
                  background: "hsla(0,72%,51%,0.1)",
                  border: "1px solid hsla(0,72%,51%,0.3)",
                  borderRadius: "0.5rem",
                  color: "hsl(0,72%,65%)",
                  fontSize: "0.8rem",
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  padding: "0.7rem 1rem",
                  background: "hsla(142,76%,36%,0.1)",
                  border: "1px solid hsla(142,76%,36%,0.3)",
                  borderRadius: "0.5rem",
                  color: "hsl(142,76%,55%)",
                  fontSize: "0.8rem",
                }}
              >
                {success}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                "Sending..."
              ) : (
                <>
                  <Send size={15} />
                  Send Message
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
