import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import { useAuthStore } from "@/lib/store/authstore";
import type { Ticket } from "@shared/schema";
import {
  card, thStyle, tdStyle, btnSuccess, btnNeutral, btnDanger,
  SearchInput, FilterSelect, StatusBadge, EmptyState, Toolbar, Modal,
} from "@/components/admin/shared";
import { Send, Paperclip, Loader2, X } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: "hsla(213,90%,55%,0.15)", text: "hsl(213,90%,65%)" },
  in_progress: { bg: "hsla(40,90%,55%,0.15)", text: "hsl(40,90%,60%)" },
  resolved: { bg: "hsla(145,70%,50%,0.15)", text: "hsl(145,70%,55%)" },
  closed: { bg: "hsla(220,10%,40%,0.15)", text: "hsl(var(--muted-foreground))" },
};

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d as string).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  color: "hsl(var(--foreground))",
  fontSize: "13px",
  outline: "none",
  resize: "none",
  minHeight: "250px",
  boxSizing: "border-box",
};

function TicketStatusPill({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: "hsla(220,10%,40%,0.1)", text: "hsl(var(--muted-foreground))" };
  return (
    <span style={{
      display: "inline-block", fontSize: "11px", fontWeight: 600,
      padding: "2px 8px", borderRadius: "999px",
      background: c.bg, color: c.text, textTransform: "capitalize",
    }}>
      {status.replace("_", " ")}
    </span>
  );
}

function ContactViewModal({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [status, setStatus] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: ticket, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/tickets", ticketId],
    queryFn: () => adminApi.get(`/tickets/${ticketId}`),
    refetchInterval: 8000,
  });

  const statusMut = useMutation({
    mutationFn: (newStatus: string) => adminApi.patch(`/tickets/${ticketId}/status`, { status: newStatus }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/tickets"] }),
  });

  const replyMut = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("userId", user?.id ?? "");
      formData.append("message", message);
      if (attachment) formData.append("attachment", attachment);
      const res = await fetch(`/api/admin/tickets/${ticketId}/reply`, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: { "x-admin-role": user?.role ?? "super_admin" },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to send reply");
      }
      return res.json();
    },
    onSuccess: () => {
      setMessage("");
      setAttachment(null);
      qc.invalidateQueries({ queryKey: ["/api/admin/tickets", ticketId] });
    },
  });

  if (isLoading) return (
    <Modal title="Loading..." onClose={onClose}>
      <div style={{ padding: "2rem", textAlign: "center", color: "hsl(var(--muted-foreground))" }}>Loading submission…</div>
    </Modal>
  );

  return (
    <Modal title={`Contact Submission #${ticket?.ticketNumber ?? "—"}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ padding: "1rem", background: "hsl(var(--card))", borderRadius: "6px" }}>
          <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginBottom: "0.4rem" }}>Subject</p>
          <p style={{ fontSize: "13px", color: "hsl(var(--foreground))", fontWeight: 500 }}>{ticket?.subject ?? "—"}</p>
        </div>

        <div style={{ padding: "1rem", background: "hsl(var(--card))", borderRadius: "6px" }}>
          <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginBottom: "0.4rem" }}>From</p>
          <p style={{ fontSize: "13px", color: "hsl(var(--foreground))", fontWeight: 500 }}>{ticket?.email || ticket?.userId || "Guest"}</p>
        </div>

        <div style={{ padding: "1rem", background: "hsl(var(--card))", borderRadius: "6px" }}>
          <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginBottom: "0.4rem" }}>Message</p>
          <p style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{ticket?.message ?? "—"}</p>
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginBottom: "0.4rem" }}>Status</p>
            <select style={inputStyle} value={status || ticket?.status || ""} onChange={(e) => setStatus(e.target.value)}>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          {(status || ticket?.status) && (
            <button
              onClick={() => statusMut.mutate(status || ticket?.status)}
              disabled={statusMut.isPending}
              style={{
                alignSelf: "flex-end",
                padding: "0.5rem 1rem",
                background: "linear-gradient(135deg, hsl(142, 71%, 45%), hsl(145, 70%, 35%))",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              {statusMut.isPending ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : "Update"}
            </button>
          )}
        </div>

        <div style={{ borderTop: "1px solid hsl(220, 15%, 13%)", paddingTop: "1rem" }}>
          <h4 style={{ fontSize: "12px", fontWeight: 600, color: "hsl(var(--foreground))", marginBottom: "0.8rem" }}>Reply</h4>
          <textarea
            style={inputStyle}
            placeholder="Type your reply…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div style={{ display: "flex", gap: "8px", marginTop: "0.8rem", flexWrap: "wrap" }}>
            <input
              ref={fileRef}
              type="file"
              style={{ display: "none" }}
              onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                padding: "0.5rem 0.8rem",
                background: "hsl(220, 20%, 15%)",
                border: "1px solid hsl(var(--border))",
                borderRadius: "5px",
                color: "hsl(var(--muted-foreground))",
                cursor: "pointer",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <Paperclip size={13} /> Attach
            </button>
            {attachment && (
              <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>
                {attachment.name}
                <button
                  onClick={() => setAttachment(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "hsl(0, 72%, 51%)",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <button
              onClick={() => replyMut.mutate()}
              disabled={!message.trim() || replyMut.isPending}
              style={{
                marginLeft: "auto",
                padding: "0.5rem 1rem",
                background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)))",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "4px",
                opacity: !message.trim() ? 0.5 : 1,
              }}
            >
              {replyMut.isPending ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={13} />}
              Reply
            </button>
          </div>
        </div>

        {ticket?.replies && ticket.replies.length > 0 && (
          <div style={{ borderTop: "1px solid hsl(220, 15%, 13%)", paddingTop: "1rem" }}>
            <h4 style={{ fontSize: "12px", fontWeight: 600, color: "hsl(var(--foreground))", marginBottom: "0.8rem" }}>Conversation</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
              {ticket.replies.map((r: any) => (
                <div key={r.id} style={{ padding: "0.8rem", background: "hsl(var(--card))", borderRadius: "5px", fontSize: "13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <span style={{ color: r.isStaff ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))", fontWeight: 500 }}>
                      {r.isStaff ? "Staff" : "Customer"}
                    </span>
                    <span style={{ color: "hsl(var(--muted-foreground))", fontSize: "11px" }}>{formatDate(r.createdAt)}</span>
                  </div>
                  <p style={{ color: "hsl(var(--muted-foreground))", whiteSpace: "pre-wrap", lineHeight: 1.4, margin: 0 }}>{r.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default function ContactSubmissions() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewTicketId, setViewTicketId] = useState<string | null>(null);

  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/admin/tickets"],
    queryFn: () => adminApi.get("/tickets?limit=200"),
    refetchInterval: 1000,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.patch(`/tickets/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/tickets"] }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tickets.filter((t) => {
      const matchSearch = !q || t.subject.toLowerCase().includes(q) || (t.email ?? "").toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || (t.ticketNumber ?? "").toLowerCase().includes(q);
      const matchStatus = !statusFilter || t.status === statusFilter;
      const matchCategory = t.category === "contact";
      return matchSearch && matchStatus && matchCategory;
    });
  }, [tickets, search, statusFilter]);

  return (
    <AdminLayout title="Contact Submissions">
      <div style={card}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search subject, email or ID…" />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>
            {filtered.length} submission{filtered.length !== 1 ? "s" : ""}
          </span>
        </Toolbar>

        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: "13px" }}>Loading submissions…</div>
          ) : filtered.length === 0 ? (
            <EmptyState message={tickets.filter((t) => t.category === "contact").length === 0 ? "No contact submissions yet." : "No submissions match your filters."} />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["ID", "Email", "Subject", "Status", "Date", "Actions"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: "monospace", fontSize: "11px", color: "hsl(var(--primary))" }}>
                        {t.ticketNumber ?? t.id.slice(0, 14) + "…"}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontSize: "11px", color: "hsl(var(--muted-foreground))", maxWidth: "140px" }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                        {(t as any).email || "—"}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: "hsl(var(--foreground))", maxWidth: "200px" }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</span>
                    </td>
                    <td style={tdStyle}><StatusBadge value={t.status} /></td>
                    <td style={{ ...tdStyle, fontSize: "11px", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap" }}>
                      {new Date(t.createdAt as any).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                        <button
                          style={{
                            ...btnNeutral,
                            background: "linear-gradient(135deg,hsla(258,90%,55%,0.15),hsla(196,100%,50%,0.1))",
                            borderColor: "hsla(258,90%,55%,0.3)",
                            color: "hsl(var(--primary))",
                          }}
                          onClick={() => setViewTicketId(t.id)}
                        >
                          View
                        </button>
                        {t.status !== "resolved" && t.status !== "closed" && (
                          <button
                            style={btnSuccess}
                            onClick={() => statusMut.mutate({ id: t.id, status: "resolved" })}
                            disabled={statusMut.isPending}
                          >
                            Resolve
                          </button>
                        )}
                        {t.status !== "closed" && (
                          <button
                            style={btnDanger}
                            onClick={() => statusMut.mutate({ id: t.id, status: "closed" })}
                            disabled={statusMut.isPending}
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {viewTicketId && (
        <ContactViewModal ticketId={viewTicketId} onClose={() => setViewTicketId(null)} />
      )}
    </AdminLayout>
  );
}
