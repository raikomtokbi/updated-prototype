import { useState, useMemo, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import type { Order } from "@shared/schema";
import {
  card, thStyle, tdStyle, btnSuccess, btnDanger, btnNeutral,
  SearchInput, FilterSelect, StatusBadge, EmptyState, Toolbar,
} from "@/components/admin/shared";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const DELIVERY_OPTIONS = [
  { value: "", label: "All Delivery" },
  { value: "pending", label: "Delivery Pending" },
  { value: "delivered", label: "Delivered" },
  { value: "failed", label: "Delivery Failed" },
  { value: "not_applicable", label: "N/A" },
];

function formatDate(d: string | Date | null | undefined) {
  return d ? new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

function parseNotesItems(notes: string | null | undefined): Array<{ productTitle?: string; packageName?: string; userId?: string; zoneId?: string; quantity?: number }> {
  if (!notes) return [];
  try {
    const parsed = JSON.parse(notes);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.items)) return parsed.items;
  } catch {}
  return [];
}

function DeliveryBadge({ status, note }: { status: string | null | undefined; note?: string | null }) {
  if (!status || status === "pending") {
    return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, background: "rgba(251,191,36,0.1)", color: "hsl(38,95%,60%)" }}>Pending</span>;
  }
  if (status === "delivered") {
    return <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, background: "rgba(74,222,128,0.1)", color: "hsl(142,71%,50%)" }}>Delivered</span>;
  }
  if (status === "failed") {
    return (
      <span title={note ?? ""} style={{ display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, background: "rgba(248,113,113,0.1)", color: "hsl(0,80%,65%)", cursor: note ? "help" : "default" }}>
        Failed {note ? "ⓘ" : ""}
      </span>
    );
  }
  if (status === "not_applicable") {
    return <span style={{ fontSize: "11px", color: "hsl(220,10%,38%)" }}>—</span>;
  }
  return <span style={{ fontSize: "11px", color: "hsl(220,10%,38%)" }}>{status}</span>;
}

export default function TopupOrders() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery<(Order & { deliveryStatus?: string; deliveryNote?: string })[]>({
    queryKey: ["/api/admin/orders"],
    queryFn: () => adminApi.get("/orders?limit=200"),
    refetchInterval: 5000,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/orders"] }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((o) => {
      const items = parseNotesItems((o as any).notes);
      const productStr = items.map(i => `${i.productTitle ?? ""} ${i.packageName ?? ""}`).join(" ").toLowerCase();
      const matchSearch = !q
        || (o.orderNumber ?? "").toLowerCase().includes(q)
        || (o.userId ?? "").toLowerCase().includes(q)
        || productStr.includes(q)
        || ((o as any).utr ?? "").toLowerCase().includes(q);
      const matchStatus = !statusFilter || o.status === statusFilter;
      const ds = (o as any).deliveryStatus ?? "pending";
      const matchDelivery = !deliveryFilter || ds === deliveryFilter;
      return matchSearch && matchStatus && matchDelivery;
    });
  }, [orders, search, statusFilter, deliveryFilter]);

  return (
    <AdminLayout title="Top-Up Orders">
      <div style={card}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search order #, user, product, UTR..." />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <FilterSelect value={deliveryFilter} onChange={setDeliveryFilter} options={DELIVERY_OPTIONS} />
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>
            {filtered.length} order{filtered.length !== 1 ? "s" : ""}
          </span>
        </Toolbar>

        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "hsl(220,10%,42%)", fontSize: "13px" }}>Loading orders...</div>
          ) : filtered.length === 0 ? (
            <EmptyState message={orders.length === 0 ? "No orders yet." : "No orders match your filters."} />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["Order #", "Product", "Player Info", "Amount", "Payment", "Delivery", "Date", "Actions"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const anyO = o as any;
                  const items = parseNotesItems(anyO.notes);
                  const firstItem = items[0];
                  const isExpanded = expandedOrder === o.id;

                  return (
                    <Fragment key={o.id}>
                      <tr style={{ borderBottom: "1px solid hsl(220,15%,11%)" }}>
                        <td style={tdStyle}>
                          <div style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 600, color: "hsl(258, 90%, 70%)" }}>{o.orderNumber}</div>
                          {anyO.utr && (
                            <div style={{ fontSize: "10px", fontFamily: "monospace", color: "hsl(220,10%,38%)", marginTop: "2px" }}>UTR: {anyO.utr}</div>
                          )}
                        </td>
                        <td style={tdStyle}>
                          {firstItem ? (
                            <div>
                              <div style={{ fontWeight: 500, color: "hsl(210,40%,85%)", fontSize: "12px" }}>{firstItem.productTitle ?? "—"}</div>
                              <div style={{ fontSize: "11px", color: "hsl(220,10%,50%)", marginTop: "1px" }}>{firstItem.packageName ?? ""}{firstItem.quantity && firstItem.quantity > 1 ? ` ×${firstItem.quantity}` : ""}</div>
                              {items.length > 1 && (
                                <button onClick={() => setExpandedOrder(isExpanded ? null : o.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", color: "hsl(258,80%,65%)", padding: 0, marginTop: "2px" }}>
                                  +{items.length - 1} more
                                </button>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "hsl(220,10%,38%)", fontSize: "12px" }}>—</span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          {firstItem ? (
                            <div>
                              {firstItem.userId && <div style={{ fontSize: "11px", fontFamily: "monospace", color: "hsl(210,40%,70%)" }}>ID: {firstItem.userId}</div>}
                              {firstItem.zoneId && <div style={{ fontSize: "11px", fontFamily: "monospace", color: "hsl(220,10%,50%)" }}>Zone: {firstItem.zoneId}</div>}
                              {o.userId && <div style={{ fontSize: "10px", color: "hsl(220,10%,38%)", marginTop: "2px" }}>User: {o.userId.slice(0, 12)}…</div>}
                            </div>
                          ) : (
                            <span style={{ color: "hsl(220,10%,38%)", fontSize: "12px" }}>{o.userId ? o.userId.slice(0, 12) + "…" : "Guest"}</span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 600, color: "hsl(210,40%,95%)" }}>
                          {o.currency === "INR" ? "₹" : "$"}{Number(o.totalAmount).toFixed(2)}
                        </td>
                        <td style={tdStyle}><StatusBadge value={o.status} /></td>
                        <td style={tdStyle}>
                          <DeliveryBadge status={anyO.deliveryStatus} note={anyO.deliveryNote} />
                        </td>
                        <td style={{ ...tdStyle, fontSize: "11px", color: "hsl(220, 10%, 46%)", whiteSpace: "nowrap" }}>{formatDate(o.createdAt)}</td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {o.status === "pending" && (
                              <>
                                <button style={btnSuccess} onClick={() => statusMut.mutate({ id: o.id, status: "completed" })} disabled={statusMut.isPending}>Approve</button>
                                <button style={btnDanger} onClick={() => statusMut.mutate({ id: o.id, status: "failed" })} disabled={statusMut.isPending}>Reject</button>
                              </>
                            )}
                            {o.status === "completed" && (
                              <button style={btnNeutral} onClick={() => statusMut.mutate({ id: o.id, status: "refunded" })} disabled={statusMut.isPending}>Refund</button>
                            )}
                            {(o.status === "failed" || o.status === "refunded") && (
                              <span style={{ fontSize: "11px", color: "hsl(220,10%,38%)" }}>—</span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && items.slice(1).map((item, idx) => (
                        <tr key={`${o.id}-item-${idx}`} style={{ background: "hsl(220,20%,7%)", borderBottom: "1px solid hsl(220,15%,10%)" }}>
                          <td style={{ ...tdStyle, color: "hsl(220,10%,35%)", fontSize: "11px" }} colSpan={2}>
                            <div style={{ paddingLeft: "12px" }}>
                              <div style={{ color: "hsl(210,40%,75%)", fontWeight: 500 }}>{item.productTitle ?? "—"}</div>
                              <div style={{ color: "hsl(220,10%,45%)", fontSize: "10px" }}>{item.packageName ?? ""}</div>
                            </div>
                          </td>
                          <td style={{ ...tdStyle, fontSize: "11px" }}>
                            {item.userId && <div style={{ fontFamily: "monospace", color: "hsl(210,40%,65%)" }}>ID: {item.userId}</div>}
                            {item.zoneId && <div style={{ fontFamily: "monospace", color: "hsl(220,10%,45%)" }}>Zone: {item.zoneId}</div>}
                          </td>
                          <td colSpan={5} style={tdStyle} />
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
