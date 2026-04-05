import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Link, RefreshCw } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Transaction } from "@shared/schema";
import {
  card, thStyle, tdStyle, btnPrimary,
  SearchInput, FilterSelect, StatusBadge, EmptyState, Toolbar,
} from "@/components/admin/shared";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// ─── Unmatched UPI Payments tab ───────────────────────────────────────────────
interface UnmatchedPayment {
  id: string;
  amount: string;
  utr?: string;
  senderName?: string;
  emailSubject?: string;
  rawBody?: string;
  detectedAt: string;
  assignedToOrderId?: string;
}

const badgeStyle = (color: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "0.25rem",
  padding: "2px 8px",
  borderRadius: "9999px",
  fontSize: "11px",
  fontWeight: 600,
  background: `${color}18`,
  color,
  border: `1px solid ${color}30`,
});

function UpiLogsTab() {
  const [assignOrderId, setAssignOrderId] = useState<Record<string, string>>({});
  const [expandedBody, setExpandedBody] = useState<string | null>(null);

  const { data: payments = [], isLoading, refetch, isFetching } = useQuery<UnmatchedPayment[]>({
    queryKey: ["/api/admin/unmatched-payments"],
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, orderId }: { id: string; orderId: string }) =>
      apiRequest("POST", `/api/admin/unmatched-payments/${id}/assign`, { orderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/unmatched-payments"] });
    },
  });

  function handleAssign(paymentId: string) {
    const orderId = assignOrderId[paymentId]?.trim();
    if (!orderId) return;
    assignMutation.mutate({ id: paymentId, orderId });
  }

  const unassigned = payments.filter(p => !p.assignedToOrderId);
  const assigned = payments.filter(p => p.assignedToOrderId);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
        <p style={{ margin: 0, fontSize: "12px", color: "hsl(220,10%,48%)" }}>
          UPI payments detected from email that couldn't be auto-matched to an order.
        </p>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          style={{ ...btnPrimary, opacity: isFetching ? 0.7 : 1 }}
          data-testid="button-refresh-logs"
        >
          <RefreshCw size={13} style={{ animation: isFetching ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "hsl(220,10%,45%)", fontSize: "13px" }}>Loading...</div>
      ) : payments.length === 0 ? (
        <div style={{ ...card, padding: "3rem", textAlign: "center" }}>
          <CheckCircle size={36} style={{ color: "hsl(220,10%,35%)", marginBottom: "0.75rem" }} />
          <p style={{ color: "hsl(220,10%,50%)", fontSize: "13px", margin: 0 }}>
            No unmatched payments. All UPI payments were auto-matched.
          </p>
        </div>
      ) : (
        <>
          {/* Summary row */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
            <div style={{ ...card, padding: "10px 16px", display: "flex", gap: "10px", alignItems: "center" }}>
              <AlertTriangle size={16} style={{ color: "#f59e0b" }} />
              <div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "hsl(210,40%,95%)" }}>{unassigned.length}</div>
                <div style={{ fontSize: "11px", color: "hsl(220,10%,50%)" }}>Unassigned</div>
              </div>
            </div>
            <div style={{ ...card, padding: "10px 16px", display: "flex", gap: "10px", alignItems: "center" }}>
              <CheckCircle size={16} style={{ color: "#22c55e" }} />
              <div>
                <div style={{ fontSize: "18px", fontWeight: 700, color: "hsl(210,40%,95%)" }}>{assigned.length}</div>
                <div style={{ fontSize: "11px", color: "hsl(220,10%,50%)" }}>Assigned</div>
              </div>
            </div>
          </div>

          {/* Unassigned */}
          {unassigned.length > 0 && (
            <>
              <h3 style={{ fontSize: "12px", fontWeight: 700, color: "hsl(220,10%,55%)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                Needs Manual Assignment ({unassigned.length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                {unassigned.map(p => (
                  <div key={p.id} style={{ ...card, padding: "14px 16px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "16px", fontWeight: 700, color: "hsl(210,40%,95%)" }}>₹{parseFloat(p.amount).toFixed(2)}</span>
                        <span style={badgeStyle("#f59e0b")}><AlertTriangle size={10} /> Unmatched</span>
                        {p.utr && <span style={{ fontSize: "11px", color: "hsl(220,10%,50%)", fontFamily: "monospace" }}>UTR: {p.utr}</span>}
                        {p.senderName && <span style={{ fontSize: "11px", color: "hsl(210,40%,75%)" }}>{p.senderName}</span>}
                      </div>
                      <span style={{ fontSize: "11px", color: "hsl(220,10%,42%)" }}>{new Date(p.detectedAt).toLocaleString()}</span>
                    </div>

                    {p.emailSubject && (
                      <div style={{ fontSize: "11px", color: "hsl(220,10%,55%)", fontStyle: "italic", marginBottom: "6px" }}>{p.emailSubject}</div>
                    )}
                    {p.rawBody && (
                      <button
                        onClick={() => setExpandedBody(expandedBody === p.id ? null : p.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "hsl(258,90%,68%)", padding: 0, marginBottom: "6px" }}
                      >
                        {expandedBody === p.id ? "Hide raw email" : "Show raw email"}
                      </button>
                    )}
                    {expandedBody === p.id && p.rawBody && (
                      <pre style={{ fontSize: "11px", color: "hsl(220,10%,55%)", background: "hsl(220,20%,7%)", borderRadius: "4px", padding: "8px", margin: "0 0 8px", overflowX: "auto", whiteSpace: "pre-wrap", maxHeight: "160px", overflowY: "auto" }}>
                        {p.rawBody}
                      </pre>
                    )}

                    <div style={{ borderTop: "1px solid hsl(220,15%,14%)", paddingTop: "10px", display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="text"
                        placeholder="Paste order UUID to assign..."
                        value={assignOrderId[p.id] || ""}
                        onChange={e => setAssignOrderId(prev => ({ ...prev, [p.id]: e.target.value }))}
                        style={{ flex: 1, minWidth: "200px", padding: "6px 10px", borderRadius: "5px", border: "1px solid hsl(220,15%,18%)", background: "hsl(220,20%,11%)", color: "hsl(210,40%,92%)", fontSize: "12px", outline: "none" }}
                        data-testid={`input-assign-order-${p.id}`}
                      />
                      <button
                        onClick={() => handleAssign(p.id)}
                        disabled={assignMutation.isPending || !assignOrderId[p.id]?.trim()}
                        style={{ ...btnPrimary, opacity: assignMutation.isPending || !assignOrderId[p.id]?.trim() ? 0.55 : 1 }}
                        data-testid={`button-assign-${p.id}`}
                      >
                        <Link size={12} /> Assign
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Assigned */}
          {assigned.length > 0 && (
            <>
              <h3 style={{ fontSize: "12px", fontWeight: 700, color: "hsl(220,10%,55%)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                Assigned Payments ({assigned.length})
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {assigned.map(p => (
                  <div key={p.id} style={{ ...card, padding: "10px 14px", display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "14px", fontWeight: 700, color: "hsl(210,40%,90%)" }}>₹{parseFloat(p.amount).toFixed(2)}</span>
                      <span style={badgeStyle("#22c55e")}><CheckCircle size={10} /> Assigned</span>
                      {p.utr && <span style={{ fontSize: "11px", color: "hsl(220,10%,50%)", fontFamily: "monospace" }}>UTR: {p.utr}</span>}
                    </div>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: "hsl(220,10%,45%)" }}>
                        Order: <code style={{ color: "hsl(258,90%,68%)", fontSize: "11px" }}>{p.assignedToOrderId?.slice(0, 8)}…</code>
                      </span>
                      <span style={{ fontSize: "11px", color: "hsl(220,10%,40%)" }}>{new Date(p.detectedAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const TABS = ["Transactions", "UPI Logs"] as const;
type Tab = typeof TABS[number];

export default function Payments() {
  const [tab, setTab] = useState<Tab>("Transactions");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/admin/transactions"],
    queryFn: () => adminApi.get("/transactions?limit=200"),
    refetchInterval: 1000,
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return transactions.filter((t) => {
      const matchSearch =
        !q ||
        t.id.toLowerCase().includes(q) ||
        (t.userId ?? "").toLowerCase().includes(q) ||
        (t.gatewayRef ?? "").toLowerCase().includes(q);
      const matchStatus = !statusFilter || t.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [transactions, search, statusFilter]);

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "7px 16px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 600,
    background: active ? "hsl(258,90%,60%)" : "transparent",
    color: active ? "#fff" : "hsl(220,10%,52%)",
    transition: "background 0.15s, color 0.15s",
  });

  return (
    <AdminLayout title="Payments">
      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "14px", background: "hsl(220,20%,9%)", border: "1px solid hsl(220,15%,14%)", borderRadius: "8px", padding: "4px", width: "fit-content" }}>
        {TABS.map(t => (
          <button key={t} style={tabStyle(tab === t)} onClick={() => setTab(t)} data-testid={`tab-${t.toLowerCase().replace(" ", "-")}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Transactions" ? (
        <div style={card}>
          <Toolbar>
            <SearchInput value={search} onChange={setSearch} placeholder="Search transaction ID or user..." />
            <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
            <span style={{ marginLeft: "auto", fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>
              {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
            </span>
          </Toolbar>

          <div style={{ overflowX: "auto" }}>
            {isLoading ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "hsl(220,10%,42%)", fontSize: "13px" }}>Loading transactions...</div>
            ) : filtered.length === 0 ? (
              <EmptyState message={transactions.length === 0 ? "No transactions yet." : "No transactions match your filters."} />
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr>
                    {["Transaction ID", "User ID", "Method", "Gateway Ref", "Amount", "Status", "Date"].map((h) => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id}>
                      <td style={tdStyle}>
                        <span style={{ fontFamily: "monospace", fontSize: "11px", color: "hsl(258, 90%, 70%)" }}>{t.id.slice(0, 16)}…</span>
                      </td>
                      <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(210, 40%, 80%)" }}>{t.userId ?? "—"}</td>
                      <td style={{ ...tdStyle, color: "hsl(220, 10%, 60%)" }}>{t.paymentMethod}</td>
                      <td style={{ ...tdStyle, fontSize: "11px", fontFamily: "monospace", color: "hsl(220, 10%, 50%)" }}>{t.gatewayRef ?? "—"}</td>
                      <td style={{ ...tdStyle, fontWeight: 500, color: "hsl(210, 40%, 95%)" }}>${Number(t.amount).toFixed(2)}</td>
                      <td style={tdStyle}><StatusBadge value={t.status} /></td>
                      <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(220, 10%, 46%)" }}>{formatDate(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <UpiLogsTab />
      )}
    </AdminLayout>
  );
}
