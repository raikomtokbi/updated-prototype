import { useState, useMemo, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle, Link, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  card, thStyle, tdStyle, btnPrimary, btnNeutral,
  SearchInput, FilterSelect, StatusBadge, EmptyState, Toolbar,
} from "@/components/admin/shared";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
  { value: "unmatched", label: "Unmatched UPI" },
];

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatCurrency(amount: string | number, currency = "INR") {
  const symbol = currency === "USD" ? "$" : "₹";
  return `${symbol}${Number(amount).toFixed(2)}`;
}

interface Order {
  id: string;
  userId: string | null;
  orderNumber: string;
  status: string;
  totalAmount: string;
  currency: string;
  notes: string | null;
  paymentMethod: string | null;
  utr: string | null;
  paymentVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
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

type Row =
  | { kind: "order"; data: Order }
  | { kind: "upi"; data: UnmatchedPayment };

export default function Payments() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedAssign, setExpandedAssign] = useState<string | null>(null);
  const [assignOrderId, setAssignOrderId] = useState<Record<string, string>>({});

  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
    queryFn: () => adminApi.get("/orders?limit=200"),
    refetchInterval: 8000,
  });

  const { data: upiPayments = [], isLoading: upiLoading } = useQuery<UnmatchedPayment[]>({
    queryKey: ["/api/admin/unmatched-payments"],
    queryFn: () => adminApi.get("/unmatched-payments"),
    refetchInterval: 15000,
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, orderId }: { id: string; orderId: string }) =>
      apiRequest("POST", `/api/admin/unmatched-payments/${id}/assign`, { orderId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/unmatched-payments"] });
      setExpandedAssign(null);
    },
  });

  const refundMutation = useMutation({
    mutationFn: (id: string) => adminApi.patch(`/orders/${id}/status`, { status: "refunded" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] }),
  });

  const rows: Row[] = useMemo(() => {
    const orderRows: Row[] = orders.map(o => ({ kind: "order", data: o }));
    const upiRows: Row[] = upiPayments.map(p => ({ kind: "upi", data: p }));
    const all = [...orderRows, ...upiRows];

    all.sort((a, b) => {
      const da = a.kind === "order" ? new Date(a.data.createdAt) : new Date(a.data.detectedAt);
      const db = b.kind === "order" ? new Date(b.data.createdAt) : new Date(b.data.detectedAt);
      return db.getTime() - da.getTime();
    });

    const q = search.toLowerCase();
    return all.filter(row => {
      if (row.kind === "order") {
        const o = row.data;
        const matchSearch = !q
          || o.orderNumber.toLowerCase().includes(q)
          || (o.userId ?? "").toLowerCase().includes(q)
          || (o.utr ?? "").toLowerCase().includes(q)
          || (o.paymentMethod ?? "").toLowerCase().includes(q);
        const matchStatus = !statusFilter || statusFilter === "unmatched"
          ? !statusFilter
          : o.status === statusFilter;
        return matchSearch && matchStatus;
      } else {
        const p = row.data;
        const matchSearch = !q
          || p.id.toLowerCase().includes(q)
          || (p.utr ?? "").toLowerCase().includes(q)
          || (p.senderName ?? "").toLowerCase().includes(q);
        const matchStatus = !statusFilter || statusFilter === "unmatched";
        return matchSearch && matchStatus;
      }
    });
  }, [orders, upiPayments, search, statusFilter]);

  const isLoading = ordersLoading || upiLoading;

  return (
    <AdminLayout title="Payment History">
      <div style={card}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search order #, UTR, user, method..." />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>
            {rows.length} row{rows.length !== 1 ? "s" : ""}
          </span>
        </Toolbar>

        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "hsl(220,10%,42%)", fontSize: "13px" }}>Loading...</div>
          ) : rows.length === 0 ? (
            <EmptyState message="No payment records yet." />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["Order #", "User / Sender", "Method", "UTR / Ref", "Amount", "Status", "Date", ""].map((h, i) => (
                    <th key={i} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  if (row.kind === "order") {
                    const o = row.data;
                    return (
                      <tr key={`order-${o.id}`} style={{ borderBottom: "1px solid hsl(220,15%,11%)" }}>
                        <td style={tdStyle}>
                          <span style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 600, color: "hsl(258,90%,70%)" }}>
                            {o.orderNumber}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(210,40%,80%)" }}>
                          {o.userId ? (
                            <span style={{ fontFamily: "monospace", fontSize: "11px" }}>{o.userId.slice(0, 12)}…</span>
                          ) : (
                            <span style={{ color: "hsl(220,10%,40%)", fontSize: "11px" }}>Guest</span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, color: "hsl(220,10%,60%)", fontSize: "11px", textTransform: "uppercase" }}>
                          {o.paymentMethod?.replace(/_/g, " ") ?? "—"}
                        </td>
                        <td style={{ ...tdStyle, fontSize: "11px", fontFamily: "monospace", color: "hsl(220,10%,50%)" }}>
                          {o.utr ?? "—"}
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 600, color: "hsl(210,40%,95%)" }}>
                          {formatCurrency(o.totalAmount, o.currency)}
                        </td>
                        <td style={tdStyle}><StatusBadge value={o.status} /></td>
                        <td style={{ ...tdStyle, fontSize: "11px", color: "hsl(220,10%,46%)" }}>
                          {formatDate(o.createdAt)}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                            {o.status === "completed" && (
                              <button
                                style={btnNeutral}
                                onClick={() => refundMutation.mutate(o.id)}
                                disabled={refundMutation.isPending}
                                data-testid={`button-refund-${o.id}`}
                              >
                                Refund
                              </button>
                            )}
                            <a
                              href={`/admin/orders`}
                              style={{ color: "hsl(258,90%,70%)", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "2px", textDecoration: "none" }}
                              data-testid={`link-view-order-${o.id}`}
                            >
                              <ExternalLink size={11} /> View
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  } else {
                    const p = row.data;
                    const isExpanded = expandedAssign === p.id;
                    const isAssigned = !!p.assignedToOrderId;
                    return (
                      <Fragment key={`upi-${p.id}`}>
                        <tr style={{ borderBottom: "1px solid hsl(220,15%,11%)", background: isAssigned ? "transparent" : "hsl(38,90%,50%,0.04)" }}>
                          <td style={tdStyle}>
                            <span style={{ fontFamily: "monospace", fontSize: "11px", color: "hsl(220,10%,40%)" }}>
                              {p.id.slice(0, 12)}…
                            </span>
                          </td>
                          <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(210,40%,80%)" }}>{p.senderName ?? "—"}</td>
                          <td style={{ ...tdStyle, color: "hsl(220,10%,60%)", fontSize: "11px" }}>UPI Email</td>
                          <td style={{ ...tdStyle, fontSize: "11px", fontFamily: "monospace", color: "hsl(220,10%,50%)" }}>
                            {p.utr ?? "—"}
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 600, color: "hsl(210,40%,95%)" }}>
                            ₹{parseFloat(p.amount).toFixed(2)}
                          </td>
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
                          <td style={{ ...tdStyle, fontSize: "11px", color: "hsl(220,10%,46%)" }}>
                            {formatDate(p.detectedAt)}
                          </td>
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
                                <span style={{ fontSize: "12px", color: "hsl(220,10%,50%)" }}>Assign to Order #:</span>
                                <input
                                  type="text"
                                  placeholder="Paste order ID (UUID)..."
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
                                  style={{ ...btnPrimary, opacity: assignMutation.isPending || !assignOrderId[p.id]?.trim() ? 0.55 : 1, display: "inline-flex", alignItems: "center", gap: "4px" }}
                                  data-testid={`button-assign-${p.id}`}
                                >
                                  <Link size={12} /> Assign
                                </button>
                                {p.emailSubject && (
                                  <span style={{ fontSize: "11px", color: "hsl(220,10%,42%)", fontStyle: "italic", marginLeft: "4px" }}>
                                    {p.emailSubject}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
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
