import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import {
  card, thStyle, tdStyle,
  SearchInput, FilterSelect, StatusBadge, EmptyState, Toolbar,
} from "@/components/admin/shared";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "closed", label: "Closed" },
];

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function extractOrderNumber(subject: string): string {
  const match = subject.match(/#([A-Z0-9-]+)/i);
  return match ? `#${match[1]}` : "—";
}

export default function Refunds() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: tickets = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/refund-requests"],
    queryFn: () => adminApi.get("/refund-requests"),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.patch(`/tickets/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/refund-requests"] }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tickets.filter((t) => {
      const matchSearch =
        !q ||
        t.subject?.toLowerCase().includes(q) ||
        (t.userId ?? "").toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q);
      const matchStatus = !statusFilter || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [tickets, search, statusFilter]);

  return (
    <AdminLayout title="Refund Requests">
      <div style={card}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search order, user ID..." />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>
            {filtered.length} request{filtered.length !== 1 ? "s" : ""}
          </span>
        </Toolbar>

        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: "13px" }}>Loading refund requests...</div>
          ) : filtered.length === 0 ? (
            <EmptyState message={tickets.length === 0 ? "No refund requests yet." : "No requests match your filters."} />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["Order", "User ID", "Subject", "Priority", "Status", "Date", "Action"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: "hsl(var(--primary))", fontFamily: "monospace", fontSize: "12px" }}>
                      {extractOrderNumber(t.subject ?? "")}
                    </td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(var(--foreground))" }}>{t.userId ?? "Guest"}</td>
                    <td style={{ ...tdStyle, maxWidth: "240px" }}>
                      <span style={{ fontSize: "12px", color: "hsl(var(--foreground))", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                        {t.subject}
                      </span>
                      {t.message && (
                        <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", display: "block", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.message}
                        </span>
                      )}
                    </td>
                    <td style={tdStyle}><StatusBadge value={t.priority ?? "medium"} /></td>
                    <td style={tdStyle}><StatusBadge value={t.status} /></td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>{formatDate(t.createdAt)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "5px" }}>
                        {t.status !== "closed" && (
                          <button
                            onClick={() => updateStatus.mutate({ id: t.id, status: "closed" })}
                            disabled={updateStatus.isPending}
                            style={{
                              fontSize: "11px", padding: "4px 10px", borderRadius: "4px",
                              background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.25)",
                              color: "hsl(142,71%,48%)", cursor: "pointer", fontWeight: 600,
                            }}
                          >
                            Mark Resolved
                          </button>
                        )}
                        {t.status === "open" && (
                          <button
                            onClick={() => updateStatus.mutate({ id: t.id, status: "in_progress" })}
                            disabled={updateStatus.isPending}
                            style={{
                              fontSize: "11px", padding: "4px 10px", borderRadius: "4px",
                              background: "hsl(var(--primary) / 0.1)", border: "1px solid hsl(var(--primary) / 0.3)",
                              color: "hsl(var(--primary))", cursor: "pointer", fontWeight: 600,
                            }}
                          >
                            In Progress
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
    </AdminLayout>
  );
}
