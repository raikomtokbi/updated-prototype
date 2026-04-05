import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Link, Search, RefreshCw } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { btnPrimary } from "@/components/admin/shared";

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

const card: React.CSSProperties = {
  background: "hsl(220,20%,9%)",
  border: "1px solid hsl(220,15%,16%)",
  borderRadius: "0.75rem",
  padding: "1.25rem",
};

const badge = (color: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "0.25rem",
  padding: "0.2rem 0.55rem",
  borderRadius: "9999px",
  fontSize: "11px",
  fontWeight: 600,
  background: `${color}18`,
  color,
  border: `1px solid ${color}30`,
});

export default function PaymentLogs() {
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
    <div style={{ padding: "1.5rem", maxWidth: "900px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "hsl(210,40%,95%)", margin: 0 }}>
            UPI Payment Logs
          </h1>
          <p style={{ color: "hsl(220,10%,50%)", fontSize: "13px", marginTop: "4px" }}>
            Payments detected from email that couldn't be automatically matched to an order
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          style={{ ...btnPrimary, opacity: isFetching ? 0.7 : 1 }}
          data-testid="button-refresh-logs"
        >
          <RefreshCw size={14} style={{ animation: isFetching ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div style={{ color: "hsl(220,10%,50%)", textAlign: "center", padding: "3rem" }}>Loading payment logs...</div>
      ) : payments.length === 0 ? (
        <div style={{ ...card, textAlign: "center", padding: "3rem" }}>
          <CheckCircle size={40} style={{ color: "hsl(220,10%,35%)", marginBottom: "1rem" }} />
          <p style={{ color: "hsl(220,10%,50%)", fontSize: "14px", margin: 0 }}>
            No unmatched payments found. All detected UPI payments were automatically matched.
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <div style={{ ...card, padding: "0.75rem 1.25rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <AlertTriangle size={18} style={{ color: "#f59e0b" }} />
              <div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "hsl(210,40%,95%)" }}>{unassigned.length}</div>
                <div style={{ fontSize: "11px", color: "hsl(220,10%,50%)" }}>Unassigned</div>
              </div>
            </div>
            <div style={{ ...card, padding: "0.75rem 1.25rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <CheckCircle size={18} style={{ color: "#22c55e" }} />
              <div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: "hsl(210,40%,95%)" }}>{assigned.length}</div>
                <div style={{ fontSize: "11px", color: "hsl(220,10%,50%)" }}>Assigned</div>
              </div>
            </div>
          </div>

          {/* Unassigned payments */}
          {unassigned.length > 0 && (
            <>
              <h2 style={{ fontSize: "14px", fontWeight: 700, color: "hsl(210,40%,85%)", marginBottom: "0.75rem" }}>
                Needs Manual Assignment ({unassigned.length})
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                {unassigned.map(p => (
                  <div key={p.id} style={{ ...card, borderColor: "hsl(38,95%,50%,0.3)" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: "18px", fontWeight: 700, color: "hsl(210,40%,95%)" }}>
                          ₹{parseFloat(p.amount).toFixed(2)}
                        </span>
                        <span style={badge("#f59e0b")}>
                          <AlertTriangle size={10} /> Unmatched
                        </span>
                      </div>
                      <span style={{ fontSize: "11px", color: "hsl(220,10%,45%)" }}>
                        {new Date(p.detectedAt).toLocaleString()}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.85rem" }}>
                      {p.utr && (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <span style={{ fontSize: "11px", color: "hsl(220,10%,45%)", minWidth: "75px" }}>UTR Ref:</span>
                          <span style={{ fontSize: "12px", color: "hsl(210,40%,85%)", fontFamily: "monospace" }}>{p.utr}</span>
                        </div>
                      )}
                      {p.senderName && (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <span style={{ fontSize: "11px", color: "hsl(220,10%,45%)", minWidth: "75px" }}>Sender:</span>
                          <span style={{ fontSize: "12px", color: "hsl(210,40%,85%)" }}>{p.senderName}</span>
                        </div>
                      )}
                      {p.emailSubject && (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <span style={{ fontSize: "11px", color: "hsl(220,10%,45%)", minWidth: "75px" }}>Subject:</span>
                          <span style={{ fontSize: "12px", color: "hsl(220,10%,65%)", fontStyle: "italic" }}>{p.emailSubject}</span>
                        </div>
                      )}
                      {p.rawBody && (
                        <button
                          onClick={() => setExpandedBody(expandedBody === p.id ? null : p.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "hsl(258,90%,68%)", padding: 0, textAlign: "left" }}
                        >
                          {expandedBody === p.id ? "Hide raw email" : "Show raw email"}
                        </button>
                      )}
                      {expandedBody === p.id && p.rawBody && (
                        <pre style={{ fontSize: "11px", color: "hsl(220,10%,55%)", background: "hsl(220,20%,7%)", borderRadius: "0.4rem", padding: "0.6rem", margin: "0.25rem 0 0", overflowX: "auto", whiteSpace: "pre-wrap", maxHeight: "200px", overflowY: "auto" }}>
                          {p.rawBody}
                        </pre>
                      )}
                    </div>

                    {/* Assign to order */}
                    <div style={{ borderTop: "1px solid hsl(220,15%,16%)", paddingTop: "0.75rem" }}>
                      <label style={{ fontSize: "12px", color: "hsl(220,10%,55%)", display: "block", marginBottom: "0.4rem" }}>
                        Manually assign to Order ID:
                      </label>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <input
                          type="text"
                          placeholder="Paste order UUID here..."
                          value={assignOrderId[p.id] || ""}
                          onChange={e => setAssignOrderId(prev => ({ ...prev, [p.id]: e.target.value }))}
                          style={{ flex: 1, padding: "0.45rem 0.65rem", borderRadius: "0.4rem", border: "1px solid hsl(220,15%,20%)", background: "hsl(220,20%,11%)", color: "hsl(210,40%,92%)", fontSize: "13px", outline: "none" }}
                          data-testid={`input-assign-order-${p.id}`}
                        />
                        <button
                          onClick={() => handleAssign(p.id)}
                          disabled={assignMutation.isPending || !assignOrderId[p.id]?.trim()}
                          style={{ ...btnPrimary, opacity: assignMutation.isPending || !assignOrderId[p.id]?.trim() ? 0.6 : 1, cursor: assignMutation.isPending || !assignOrderId[p.id]?.trim() ? "not-allowed" : "pointer" }}
                          data-testid={`button-assign-${p.id}`}
                        >
                          <Link size={13} />
                          Assign
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Assigned payments */}
          {assigned.length > 0 && (
            <>
              <h2 style={{ fontSize: "14px", fontWeight: 700, color: "hsl(210,40%,85%)", marginBottom: "0.75rem" }}>
                Assigned Payments ({assigned.length})
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {assigned.map(p => (
                  <div key={p.id} style={{ ...card, padding: "0.75rem 1rem", display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "15px", fontWeight: 700, color: "hsl(210,40%,90%)" }}>₹{parseFloat(p.amount).toFixed(2)}</span>
                      <span style={badge("#22c55e")}><CheckCircle size={10} /> Assigned</span>
                      {p.utr && <span style={{ fontSize: "11px", color: "hsl(220,10%,50%)", fontFamily: "monospace" }}>UTR: {p.utr}</span>}
                    </div>
                    <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: "hsl(220,10%,45%)" }}>
                        Order: <code style={{ color: "hsl(258,90%,68%)", fontSize: "11px" }}>{p.assignedToOrderId?.slice(0, 8)}...</code>
                      </span>
                      <span style={{ fontSize: "11px", color: "hsl(220,10%,40%)" }}>
                        {new Date(p.detectedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
