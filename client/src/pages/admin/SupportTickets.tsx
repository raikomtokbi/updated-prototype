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

const TICKET_STATUS_LIST = ["open", "in_progress", "resolved", "closed"];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  open: { bg: "hsla(213,90%,55%,0.15)", text: "hsl(213,90%,65%)" },
  in_progress: { bg: "hsla(40,90%,55%,0.15)", text: "hsl(40,90%,60%)" },
  resolved: { bg: "hsla(145,70%,50%,0.15)", text: "hsl(145,70%,55%)" },
  closed: { bg: "hsla(220,10%,40%,0.15)", text: "hsl(220,10%,55%)" },
};

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d as string).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  background: "hsl(220, 20%, 11%)",
  border: "1px solid hsl(220, 15%, 18%)",
  borderRadius: "6px",
  color: "hsl(210, 40%, 90%)",
  fontSize: "13px",
  outline: "none",
  resize: "vertical",
  minHeight: "90px",
  boxSizing: "border-box",
};

function TicketStatusPill({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: "hsla(220,10%,40%,0.1)", text: "hsl(220,10%,55%)" };
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

function TicketViewModal({ ticketId, onClose }: { ticketId: string; onClose: () => void }) {
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
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["/api/admin/tickets", ticketId] });
      qc.invalidateQueries({ queryKey: ["/api/admin/tickets"] });
    },
  });

  const currentStatus = ticket?.status ?? "open";

  return (
    <Modal title={ticket ? `Ticket — ${ticket.subject}` : "Loading…"} onClose={onClose}>
      {isLoading || !ticket ? (
        <div style={{ textAlign: "center", padding: "2rem", color: "hsl(220,10%,40%)" }}>
          <Loader2 size={22} className="animate-spin" style={{ margin: "0 auto" }} />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Header info */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <TicketStatusPill status={currentStatus} />
            <StatusBadge value={ticket.priority} />
            <span style={{ fontSize: "11px", color: "hsl(220,10%,40%)", marginLeft: "auto" }}>
              #{ticket.ticketNumber} · User: {ticket.userId?.slice(0, 10) ?? "Guest"} · {formatDate(ticket.createdAt)}
            </span>
          </div>

          {/* Status change */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "hsl(220,10%,50%)", fontWeight: 600 }}>Change Status:</span>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {TICKET_STATUS_LIST.map((s) => (
                <button
                  key={s}
                  disabled={currentStatus === s || statusMut.isPending}
                  onClick={() => statusMut.mutate(s)}
                  style={{
                    padding: "3px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: 600,
                    cursor: currentStatus === s ? "default" : "pointer", border: "1px solid",
                    background: currentStatus === s ? (STATUS_COLORS[s]?.bg ?? "transparent") : "transparent",
                    color: STATUS_COLORS[s]?.text ?? "hsl(220,10%,55%)",
                    borderColor: STATUS_COLORS[s]?.text ?? "hsl(220,15%,25%)",
                    opacity: currentStatus === s ? 1 : 0.7,
                    textTransform: "capitalize",
                  }}
                >
                  {s.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation thread */}
          <div style={{
            background: "hsl(220,20%,8%)", border: "1px solid hsl(220,15%,16%)",
            borderRadius: "8px", overflow: "hidden",
          }}>
            <div style={{ padding: "8px 14px", borderBottom: "1px solid hsl(220,15%,14%)" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "hsl(220,10%,42%)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                Conversation
              </span>
            </div>
            <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "10px", maxHeight: "340px", overflowY: "auto" }}>
              {/* Original message */}
              <div style={{ display: "flex", gap: "8px" }}>
                <div style={{
                  width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                  background: "hsl(220,20%,20%)", border: "1px solid hsl(220,15%,28%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "11px", fontWeight: 700, color: "hsl(210,40%,75%)",
                }}>U</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "11px", color: "hsl(220,10%,42%)", marginBottom: "4px" }}>
                    User · {formatDate(ticket.createdAt)}
                    {ticket.category && <> · <span style={{ color: "hsl(258,90%,65%)" }}>{ticket.category}</span></>}
                  </div>
                  <div style={{
                    background: "hsl(220,20%,13%)", border: "1px solid hsl(220,15%,22%)",
                    borderRadius: "0 8px 8px 8px", padding: "8px 12px",
                    fontSize: "13px", color: "hsl(210,40%,85%)", lineHeight: 1.6, whiteSpace: "pre-wrap",
                  }}>
                    {ticket.message}
                  </div>
                </div>
              </div>

              {/* Replies */}
              {(ticket.replies ?? []).map((r: any) => {
                const isAdmin = r.isStaff;
                return (
                  <div key={r.id} style={{ display: "flex", gap: "8px", flexDirection: isAdmin ? "row-reverse" : "row" }}>
                    <div style={{
                      width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                      background: isAdmin ? "linear-gradient(135deg,hsl(258,90%,50%),hsl(196,100%,40%))" : "hsl(220,20%,20%)",
                      border: isAdmin ? "none" : "1px solid hsl(220,15%,28%)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "11px", fontWeight: 700, color: "white",
                    }}>
                      {isAdmin ? "A" : "U"}
                    </div>
                    <div style={{ flex: 1, maxWidth: "85%" }}>
                      <div style={{ fontSize: "11px", color: "hsl(220,10%,42%)", marginBottom: "4px", textAlign: isAdmin ? "right" : "left" }}>
                        {isAdmin ? "Admin" : "User"} · {formatDate(r.createdAt)}
                      </div>
                      <div style={{
                        background: isAdmin ? "hsla(258,90%,55%,0.14)" : "hsl(220,20%,13%)",
                        border: `1px solid ${isAdmin ? "hsla(258,90%,55%,0.28)" : "hsl(220,15%,22%)"}`,
                        borderRadius: isAdmin ? "8px 0 8px 8px" : "0 8px 8px 8px",
                        padding: "8px 12px",
                        fontSize: "13px", color: "hsl(210,40%,85%)", lineHeight: 1.6, whiteSpace: "pre-wrap",
                      }}>
                        {r.message}
                      </div>
                      {r.attachmentUrl && (
                        <div style={{ marginTop: "4px", textAlign: isAdmin ? "right" : "left" }}>
                          <a href={r.attachmentUrl} target="_blank" rel="noreferrer"
                            style={{ fontSize: "11px", color: "hsl(258,90%,70%)", display: "inline-flex", alignItems: "center", gap: "3px" }}>
                            <Paperclip size={11} /> Attachment
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {(ticket.replies ?? []).length === 0 && (
                <div style={{ textAlign: "center", fontSize: "12px", color: "hsl(220,10%,36%)", padding: "0.5rem 0" }}>
                  No replies yet.
                </div>
              )}
            </div>
          </div>

          {/* Reply form */}
          <div>
            <textarea
              style={inputStyle as any}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your reply…"
            />
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "8px", flexWrap: "wrap" }}>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                style={{ display: "none" }}
                onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  background: "hsl(220,20%,13%)", border: "1px solid hsl(220,15%,20%)",
                  borderRadius: "6px", padding: "5px 10px",
                  fontSize: "11px", fontWeight: 600, color: "hsl(220,10%,55%)", cursor: "pointer",
                }}
              >
                <Paperclip size={12} />
                {attachment ? attachment.name.slice(0, 18) + (attachment.name.length > 18 ? "…" : "") : "Attach"}
              </button>
              {attachment && (
                <button onClick={() => { setAttachment(null); if (fileRef.current) fileRef.current.value = ""; }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(0,72%,60%)", padding: 0 }}>
                  <X size={14} />
                </button>
              )}
              <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
                <button onClick={onClose} style={{ ...btnNeutral, padding: "6px 14px", fontSize: "12px" }}>Close</button>
                <button
                  disabled={!message.trim() || replyMut.isPending}
                  onClick={() => replyMut.mutate()}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "5px",
                    padding: "6px 14px", borderRadius: "6px",
                    background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "white",
                    fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "none",
                    opacity: !message.trim() || replyMut.isPending ? 0.6 : 1,
                  }}
                >
                  {replyMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  {replyMut.isPending ? "Sending…" : "Send Reply"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function SupportTickets() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [viewTicketId, setViewTicketId] = useState<string | null>(null);

  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/admin/tickets"],
    queryFn: () => adminApi.get("/tickets?limit=200"),
    refetchInterval: 15000,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.patch(`/tickets/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/tickets"] }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tickets.filter((t) => {
      const matchSearch = !q || t.subject.toLowerCase().includes(q) || (t.userId ?? "").toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || (t.ticketNumber ?? "").toLowerCase().includes(q);
      const matchStatus = !statusFilter || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [tickets, search, statusFilter]);

  return (
    <AdminLayout title="Support Tickets">
      <div style={card}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search subject, user or ticket ID…" />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>
            {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
          </span>
        </Toolbar>

        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "hsl(220,10%,42%)", fontSize: "13px" }}>Loading tickets…</div>
          ) : filtered.length === 0 ? (
            <EmptyState message={tickets.length === 0 ? "No support tickets yet." : "No tickets match your filters."} />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["Ticket ID", "User ID", "Subject", "Priority", "Status", "Date", "Actions"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: "monospace", fontSize: "11px", color: "hsl(258, 90%, 70%)" }}>
                        {t.ticketNumber ?? t.id.slice(0, 14) + "…"}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, fontSize: "11px", color: "hsl(210, 40%, 70%)", maxWidth: "120px" }}>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                        {t.userId ?? "Guest"}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: "hsl(210, 40%, 90%)", maxWidth: "200px" }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</span>
                    </td>
                    <td style={tdStyle}><StatusBadge value={t.priority} /></td>
                    <td style={tdStyle}><StatusBadge value={t.status} /></td>
                    <td style={{ ...tdStyle, fontSize: "11px", color: "hsl(220, 10%, 46%)", whiteSpace: "nowrap" }}>
                      {new Date(t.createdAt as any).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                        <button
                          style={{
                            ...btnNeutral,
                            background: "linear-gradient(135deg,hsla(258,90%,55%,0.15),hsla(196,100%,50%,0.1))",
                            borderColor: "hsla(258,90%,55%,0.3)",
                            color: "hsl(258,90%,70%)",
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
        <TicketViewModal ticketId={viewTicketId} onClose={() => setViewTicketId(null)} />
      )}
    </AdminLayout>
  );
}
