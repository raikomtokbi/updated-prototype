import { useState } from "react";
import { Headphones, Send, ChevronDown, ChevronUp } from "lucide-react";
import { useAuthStore } from "@/lib/store/authstore";
import { useQuery } from "@tanstack/react-query";

type FaqItem = { q: string; a: string };

export default function Support() {
  const { user, isAuthenticated } = useAuthStore();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
    staleTime: 5 * 60 * 1000,
  });

  let faqs: FaqItem[] = [];
  try {
    const parsed = JSON.parse(settings?.faq_items || "[]");
    if (Array.isArray(parsed)) {
      faqs = parsed.filter((item: FaqItem) => item.q || item.a);
    }
  } catch {
    faqs = [];
  }
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subject, message, category: category || undefined, priority, userId: user?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit ticket");
      setSuccess("Your support ticket has been submitted. We'll get back to you soon!");
      setSubject("");
      setMessage("");
      setCategory("");
      setPriority("medium");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <h1
          className="font-orbitron"
          style={{ fontSize: "1.75rem", fontWeight: 700, color: "hsl(210,40%,95%)", marginBottom: "0.5rem" }}
        >
          Support Center
        </h1>
        <p style={{ fontSize: "0.875rem", color: "hsl(220,10%,55%)" }}>
          Find answers to common questions or reach out to our team.
        </p>
      </div>

      {/* FAQ */}
      <section style={{ marginBottom: "3rem" }}>
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            color: "hsl(210,40%,85%)",
            marginBottom: "1rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Frequently Asked Questions
        </h2>
        {faqs.length === 0 ? (
          <div style={{ padding: "1.5rem", textAlign: "center", color: "hsl(220,10%,40%)", fontSize: "13px", background: "hsl(220,20%,9%)", border: "1px solid hsl(220,15%,18%)", borderRadius: "0.75rem" }}>
            No FAQ items available yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                style={{
                  background: "hsl(220,20%,9%)",
                  border: "1px solid hsl(220,15%,18%)",
                  borderRadius: "0.75rem",
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "1rem 1.25rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "hsl(210,40%,88%)",
                    fontWeight: 600,
                    fontSize: "0.875rem",
                    textAlign: "left",
                    gap: "0.5rem",
                  }}
                >
                  <span>{faq.q}</span>
                  {openFaq === idx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {openFaq === idx && (
                  <div
                    style={{
                      padding: "0 1.25rem 1rem",
                      fontSize: "0.85rem",
                      color: "hsl(220,10%,55%)",
                      lineHeight: 1.65,
                    }}
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Contact form */}
      <section>
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 700,
            color: "hsl(210,40%,85%)",
            marginBottom: "1rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Submit a Ticket
        </h2>
        <div
          style={{
            background: "hsl(220,20%,9%)",
            border: "1px solid hsl(220,15%,18%)",
            borderRadius: "1rem",
            padding: "1.75rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "0.65rem",
                background: "hsla(258,90%,66%,0.12)",
                border: "1px solid hsla(258,90%,66%,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Headphones size={18} style={{ color: "hsl(258,90%,70%)" }} />
            </div>
            <div>
              <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(210,40%,90%)" }}>
                Our support team
              </p>
              <p style={{ fontSize: "0.75rem", color: "hsl(220,10%,50%)" }}>
                Typically responds within 24 hours
              </p>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {!isAuthenticated && (
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "hsl(45,80%,60%)",
                  padding: "0.6rem 0.9rem",
                  background: "hsla(45,80%,60%,0.08)",
                  border: "1px solid hsla(45,80%,60%,0.2)",
                  borderRadius: "0.5rem",
                }}
              >
                Sign in so we can link your ticket to your account.
              </p>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label htmlFor="ticket-category" style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220,10%,65%)", marginBottom: "0.4rem" }}>
                  Category
                </label>
                <select
                  id="ticket-category"
                  className="input-field"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ cursor: "pointer" }}
                >
                  <option value="">Select category…</option>
                  <option value="Payment">Payment</option>
                  <option value="Order">Order</option>
                  <option value="Account">Account</option>
                  <option value="Technical">Technical</option>
                  <option value="Delivery">Delivery</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="ticket-priority" style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "hsl(220,10%,65%)", marginBottom: "0.4rem" }}>
                  Priority
                </label>
                <select
                  id="ticket-priority"
                  className="input-field"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  style={{ cursor: "pointer" }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="ticket-subject"
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "hsl(220,10%,65%)",
                  marginBottom: "0.4rem",
                }}
              >
                Subject
              </label>
              <input
                id="ticket-subject"
                className="input-field"
                placeholder="Brief description of your issue"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div>
              <label
                htmlFor="ticket-message"
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
                id="ticket-message"
                className="input-field"
                placeholder="Describe your issue in detail, including your order ID if applicable..."
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

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ alignSelf: "flex-start" }}
            >
              {loading ? (
                "Sending..."
              ) : (
                <>
                  <Send size={15} />
                  Send Ticket
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
