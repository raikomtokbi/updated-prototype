import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Link, ChevronDown, ChevronUp } from "lucide-react";
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
  { value: "unmatched", label: "Unmatched UPI" },
];

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

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

// Unified row type
type Row =
  | { kind: "tx"; data: Transaction }
  | { kind: "upi"; data: UnmatchedPayment };

export default function Payments() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedAssign, setExpandedAssign] = useState<string | null>(null);
  const [assignOrderId, setAssignOrderId] = useState<Record<string, string>>({});

  const { data: transactions = [], isLoading: txLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/admin/transactions"],
    queryFn: () => adminApi.get("/transactions?limit=200"),
    refetchInterval: 5000,
  });

  const { data: upiPayments = [], isLoading: upiLoading } = useQuery<UnmatchedPayment[]>({
    queryKey: ["/api/admin/unmatched-payments"],
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, orderId }: { id: string; orderId: string }) =>
      apiRequest("POST", `/api/admin/unmatched-payments/${id}/assign`, { orderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/unmatched-payments"] });
      setExpandedAssign(null);
    },
  });

  const rows: Row[] = useMemo(() => {
    const txRows: Row[] = transactions.map(t => ({ kind: "tx", data: t }));
    const upiRows: Row[] = upiPayments.map(p => ({ kind: "upi", data: p }));
    const all = [...txRows, ...upiRows];

    // Sort by date descending
    all.sort((a, b) => {
      const da = a.kind === "tx" ? new Date(a.data.createdAt ?? 0) : new Date(a.data.detectedAt);
      const db = b.kind === "tx" ? new Date(b.data.createdAt ?? 0) : new Date(b.data.detectedAt);
      return db.getTime() - da.getTime();
    });

    const q = search.toLowerCase();
    return all.filter(row => {
      if (row.kind === "tx") {
        const t = row.data;
        const matchSearch = !q || t.id.toLowerCase().includes(q) || (t.userId ?? "").toLowerCase().includes(q) || (t.gatewayRef ?? "").toLowerCase().includes(q);
        const matchStatus = !statusFilter || t.status === statusFilter;
        return matchSearch && matchStatus;
      } else {
        const p = row.data;
        const matchSearch = !q || p.id.toLowerCase().includes(q) || (p.utr ?? "").toLowerCase().includes(q) || (p.senderName ?? "").toLowerCase().includes(q);
        const matchStatus = !statusFilter || statusFilter === "unmatched";
        return matchSearch && matchStatus;
      }
    });
  }, [transactions, upiPayments, search, statusFilter]);

  const isLoading = txLoading || upiLoading;

  return (
    <AdminLayout title="Payment Transactions">
      <div style={card}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search ID, user, UTR..." />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>
            {rows.length} row{rows.length !== 1 ? "s" : ""}
          </span>
        </Toolbar>

        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "hsl(220,10%,42%)", fontSize: "13px" }}>Loading...</div>
          ) : rows.length === 0 ? (
            <EmptyState message="No transactions yet." />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["ID", "User / Sender", "Method", "Reference", "Amount", "Status", "Date", ""].map((h, i) => (
                    <th key={i} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  if (row.kind === "tx") {
                    const t = row.data;
                    return (
                      <tr key={`tx-${t.id}`}>
                        <td style={tdStyle}>
                          <span style={{ fontFamily: "monospace", fontSize: "11px", color: "hsl(258,90%,70%)" }}>{t.id.slice(0, 14)}…</span>
                        </td>
                        <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(210,40%,80%)" }}>{t.userId ?? "—"}</td>
                        <td style={{ ...tdStyle, color: "hsl(220,10%,60%)" }}>{t.paymentMethod}</td>
                        <td style={{ ...tdStyle, fontSize: "11px", fontFamily: "monospace", color: "hsl(220,10%,50%)" }}>{t.gatewayRef ?? "—"}</td>
                        <td style={{ ...tdStyle, fontWeight: 500, color: "hsl(210,40%,95%)" }}>${Number(t.amount).toFixed(2)}</td>
                        <td style={tdStyle}><StatusBadge value={t.status} /></td>
                        <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(220,10%,46%)" }}>{formatDate(t.createdAt)}</td>
                        <td style={tdStyle} />
                      </tr>
                    );
                  } else {
                    const p = row.data;
                    const isExpanded = expandedAssign === p.id;
                    const isAssigned = !!p.assignedToOrderId;
                    return (
                      <>
                        <tr key={`upi-${p.id}`} style={{ background: isAssigned ? "transparent" : "hsl(38,90%,50%,0.04)" }}>
                          <td style={tdStyle}>
                            <span style={{ fontFamily: "monospace", fontSize: "11px", color: "hsl(258,90%,70%)" }}>{p.id.slice(0, 14)}…</span>
                          </td>
                          <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(210,40%,80%)" }}>{p.senderName ?? "—"}</td>
                          <td style={{ ...tdStyle, color: "hsl(220,10%,60%)" }}>UPI Email</td>
                          <td style={{ ...tdStyle, fontSize: "11px", fontFamily: "monospace", color: "hsl(220,10%,50%)" }}>{p.utr ?? "—"}</td>
                          <td style={{ ...tdStyle, fontWeight: 500, color: "hsl(210,40%,95%)" }}>₹{parseFloat(p.amount).toFixed(2)}</td>
                          <td style={tdStyle}>
                            {isAssigned ? (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, background: "rgba(74,222,128,0.1)", color: "hsl(142,71%,45%)" }}>
                                <CheckCircle size={11} /> Assigned
                              </span>
                            ) : (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, background: "rgba(251,191,36,0.1)", color: "hsl(38,95%,55%)" }}>
                                <AlertTriangle size={11} /> Unmatched
                              </span>
                            )}
                          </td>
                          <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(220,10%,46%)" }}>{formatDate(p.detectedAt)}</td>
                          <td style={tdStyle}>
                            {!isAssigned && (
                              <button
                                onClick={() => setExpandedAssign(isExpanded ? null : p.id)}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "hsl(258,90%,68%)", fontSize: "11px", display: "flex", alignItems: "center", gap: "3px", whiteSpace: "nowrap" }}
                                data-testid={`button-expand-assign-${p.id}`}
                              >
                                Assign {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </button>
                            )}
                            {isAssigned && (
                              <span style={{ fontSize: "11px", fontFamily: "monospace", color: "hsl(220,10%,40%)" }}>
                                {p.assignedToOrderId?.slice(0, 8)}…
                              </span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`assign-${p.id}`}>
                            <td colSpan={8} style={{ ...tdStyle, background: "hsl(220,20%,8%)", padding: "10px 16px" }}>
                              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                                <span style={{ fontSize: "12px", color: "hsl(220,10%,50%)" }}>Assign to Order ID:</span>
                                <input
                                  type="text"
                                  placeholder="Paste order UUID..."
                                  value={assignOrderId[p.id] || ""}
                                  onChange={e => setAssignOrderId(prev => ({ ...prev, [p.id]: e.target.value }))}
                                  style={{ flex: 1, minWidth: "220px", padding: "5px 9px", borderRadius: "5px", border: "1px solid hsl(220,15%,18%)", background: "hsl(220,20%,11%)", color: "hsl(210,40%,92%)", fontSize: "12px", outline: "none" }}
                                  data-testid={`input-assign-order-${p.id}`}
                                />
                                <button
                                  onClick={() => {
                                    const orderId = assignOrderId[p.id]?.trim();
                                    if (orderId) assignMutation.mutate({ id: p.id, orderId });
                                  }}
                                  disabled={assignMutation.isPending || !assignOrderId[p.id]?.trim()}
                                  style={{ ...btnPrimary, opacity: assignMutation.isPending || !assignOrderId[p.id]?.trim() ? 0.55 : 1 }}
                                  data-testid={`button-assign-${p.id}`}
                                >
                                  <Link size={12} /> Assign
                                </button>
                                {p.emailSubject && (
                                  <span style={{ fontSize: "11px", color: "hsl(220,10%,42%)", fontStyle: "italic", marginLeft: "4px" }}>{p.emailSubject}</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  }
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
