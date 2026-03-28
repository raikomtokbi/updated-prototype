import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import { useAuthStore } from "@/lib/store/authstore";
import type { Ticket } from "@shared/schema";
import {
  card, thStyle, tdStyle, btnSuccess, btnNeutral, btnDanger,
  SearchInput, FilterSelect, StatusBadge, EmptyState, Toolbar, Modal,
} from "@/components/admin/shared";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
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

function ReplyModal({ ticket, onClose }: { ticket: Ticket; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [message, setMessage] = useState("");

  const replyMut = useMutation({
    mutationFn: () => adminApi.post(`/tickets/${ticket.id}/reply`, { userId: user?.id, message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/tickets"] });
      onClose();
    },
  });

  return (
    <Modal title={`Reply — ${ticket.subject}`} onClose={onClose}>
      <div style={{ marginBottom: "10px" }}>
        <StatusBadge value={ticket.status} />
        <span style={{ fontSize: "12px", color: "hsl(220,10%,42%)", marginLeft: "8px" }}>
          {ticket.subject}
        </span>
      </div>
      <textarea
        style={inputStyle as any}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Write your reply..."
      />
      <div style={{ display: "flex", gap: "8px", marginTop: "12px", justifyContent: "flex-end" }}>
        <button onClick={onClose} style={{ ...btnNeutral, padding: "7px 16px" }}>Cancel</button>
        <button
          disabled={!message.trim() || replyMut.isPending}
          onClick={() => replyMut.mutate()}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "6px", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "white", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "none" }}
        >
          {replyMut.isPending ? "Sending..." : "Send Reply"}
        </button>
      </div>
    </Modal>
  );
}

export default function SupportTickets() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [replyTicket, setReplyTicket] = useState<Ticket | null>(null);

  const { data: tickets = [], isLoading } = useQuery<Ticket[]>({
    queryKey: ["/api/admin/tickets"],
    queryFn: () => adminApi.get("/tickets?limit=200"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.patch(`/tickets/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/tickets"] }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tickets.filter((t) => {
      const matchSearch = !q || t.subject.toLowerCase().includes(q) || (t.userId ?? "").toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
      const matchStatus = !statusFilter || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [tickets, search, statusFilter]);

  return (
    <AdminLayout title="Support Tickets">
      <div style={card}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search subject or user..." />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>
            {filtered.length} ticket{filtered.length !== 1 ? "s" : ""}
          </span>
        </Toolbar>

        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "hsl(220,10%,42%)", fontSize: "13px" }}>Loading tickets...</div>
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
                      <span style={{ fontFamily: "monospace", fontSize: "11px", color: "hsl(258, 90%, 70%)" }}>{t.id.slice(0, 14)}…</span>
                    </td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(210, 40%, 80%)" }}>{t.userId ?? "—"}</td>
                    <td style={{ ...tdStyle, color: "hsl(210, 40%, 90%)", maxWidth: "220px" }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</span>
                    </td>
                    <td style={tdStyle}><StatusBadge value={t.priority} /></td>
                    <td style={tdStyle}><StatusBadge value={t.status} /></td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(220, 10%, 46%)" }}>{formatDate(t.createdAt)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                        <button style={btnNeutral} onClick={() => setReplyTicket(t)}>Reply</button>
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

      {replyTicket && <ReplyModal ticket={replyTicket} onClose={() => setReplyTicket(null)} />}
    </AdminLayout>
  );
}
