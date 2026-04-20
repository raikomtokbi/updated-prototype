import { useState, useMemo, useEffect, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import { apiRequest } from "@/lib/queryClient";
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
  { value: "cancelled", label: "Cancelled" },
];

const DELIVERY_OPTIONS = [
  { value: "", label: "All Delivery" },
  { value: "pending", label: "Delivery Pending" },
  { value: "delivered", label: "Delivered" },
  { value: "failed", label: "Delivery Failed" },
  { value: "not_applicable", label: "N/A" },
];

function formatDate(d: string | Date | null | undefined, tz = "UTC") {
  return d ? new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: tz }) : "—";
}

function parseNotesItems(notes: string | null | undefined): Array<{ productTitle?: string; packageName?: string; userId?: string; zoneId?: string; quantity?: number; packageId?: string; productId?: string }> {
  if (!notes) return [];
  try {
    const parsed = JSON.parse(notes);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.items)) return parsed.items;
  } catch {}
  return [];
}

type DeliveryAttempt = {
  cmsProduct: string;
  provider?: string;
  success?: boolean;
  message?: string;
  status?: string;
};

function parseDeliveryAttempts(note: string | null | undefined): DeliveryAttempt[] {
  if (!note) return [];
  try {
    const parsed = JSON.parse(note);
    if (Array.isArray(parsed)) return parsed as DeliveryAttempt[];
  } catch {}
  return [];
}

function itemDeliveryStatus(
  itemCmsId: string | undefined,
  attempts: DeliveryAttempt[]
): { state: "delivered" | "failed" | "pending"; provider?: string; message?: string } {
  if (!itemCmsId) return { state: "pending" };
  const match = attempts.find((a) => String(a.cmsProduct) === String(itemCmsId));
  if (!match) return { state: "pending" };
  if (match.success) return { state: "delivered", provider: match.provider, message: match.message };
  if ((match as any).pending) return { state: "pending", provider: match.provider, message: match.message };
  return { state: "failed", provider: match.provider, message: match.message };
}

function ItemDeliveryPill({ status, provider, message }: { status: "delivered" | "failed" | "pending"; provider?: string; message?: string }) {
  const base: React.CSSProperties = {
    display: "inline-block", padding: "1px 6px", borderRadius: "4px",
    fontSize: "10px", fontWeight: 600, marginLeft: "6px",
  };
  if (status === "delivered") {
    return <span title={provider ? `Delivered via ${provider}` : "Delivered"} style={{ ...base, background: "rgba(74,222,128,0.12)", color: "hsl(142,71%,55%)" }}>Delivered{provider ? ` · ${provider}` : ""}</span>;
  }
  if (status === "failed") {
    return <span title={message || "Delivery failed"} style={{ ...base, background: "rgba(248,113,113,0.12)", color: "hsl(0,80%,68%)", cursor: message ? "help" : "default" }}>Failed{provider ? ` · ${provider}` : ""}{message ? " ⓘ" : ""}</span>;
  }
  return <span style={{ ...base, background: "rgba(251,191,36,0.12)", color: "hsl(38,95%,62%)" }}>Pending</span>;
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
    return <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>—</span>;
  }
  return <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>{status}</span>;
}

type AnyOrder = Order & { deliveryStatus?: string | null; deliveryNote?: string | null; utr?: string | null };

export default function TopupOrders() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [deliveryFilter, setDeliveryFilter] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const highlightId = useMemo(() => new URLSearchParams(window.location.search).get("highlight"), []);

  const { data: siteSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/site-settings"],
    queryFn: () => apiRequest("GET", "/api/site-settings").then(r => r.json()),
    staleTime: 0,
    refetchOnMount: true,
  });
  const siteTimezone = siteSettings?.site_timezone ?? "UTC";

  const { data: orders = [], isLoading } = useQuery<AnyOrder[]>({
    queryKey: ["/api/admin/orders"],
    queryFn: () => adminApi.get("/orders?limit=200"),
    refetchInterval: 5000,
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/orders"] }),
  });

  const deliveryMut = useMutation({
    mutationFn: ({ id, deliveryStatus }: { id: string; deliveryStatus: string }) =>
      adminApi.patch(`/orders/${id}/delivery`, { deliveryStatus }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/orders"] }),
  });

  const deliverMut = useMutation({
    mutationFn: (id: string) => adminApi.post(`/orders/${id}/deliver`, {}),
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      const ds = data?.deliveryStatus;
      if (ds === "delivered") alert("Order delivered successfully.");
      else if (ds === "pending") alert("Provider returned pending — verify with the provider then use 'Mark Delivered'.");
      else if (ds === "failed") alert("Delivery attempt failed. Check provider config and product mapping.");
      else if (ds === "not_applicable") alert("Provider is not active or no mappings exist for this order.");
    },
    onError: (err: any) => alert(err?.message || "Delivery failed"),
  });

  // Manually mark an order as delivered after verifying fulfillment with the
  // provider (used for Liogames orders that come back with a pending result).
  const markDeliveredMut = useMutation({
    mutationFn: (id: string) => adminApi.post(`/orders/${id}/mark-delivered`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/orders"] }),
    onError: (err: any) => alert(err?.message || "Failed to mark delivered"),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((o) => {
      const items = parseNotesItems(o.notes);
      // Only show game top-up orders (game_currency category, or unknown category as legacy fallback)
      const firstCat = (items[0] as any)?.productCategory;
      const isTopup = !firstCat || firstCat === "game_currency";
      if (!isTopup) return false;

      const productStr = items.map(i => `${i.productTitle ?? ""} ${i.packageName ?? ""}`).join(" ").toLowerCase();
      const matchSearch = !q
        || (o.orderNumber ?? "").toLowerCase().includes(q)
        || (o.userId ?? "").toLowerCase().includes(q)
        || productStr.includes(q)
        || (o.utr ?? "").toLowerCase().includes(q);
      const matchStatus = !statusFilter || o.status === statusFilter;
      const ds = o.deliveryStatus ?? "pending";
      const matchDelivery = !deliveryFilter || ds === deliveryFilter;
      return matchSearch && matchStatus && matchDelivery;
    });
  }, [orders, search, statusFilter, deliveryFilter]);

  useEffect(() => {
    if (!highlightId || isLoading) return;
    const el = document.getElementById(`order-row-${highlightId}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId, isLoading, orders]);

  return (
    <AdminLayout title="Top-Up Orders">
      <div style={card}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search order #, user, product, UTR..." />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <FilterSelect value={deliveryFilter} onChange={setDeliveryFilter} options={DELIVERY_OPTIONS} />
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>
            {filtered.length} order{filtered.length !== 1 ? "s" : ""}
          </span>
        </Toolbar>

        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: "13px" }}>Loading orders...</div>
          ) : filtered.length === 0 ? (
            <EmptyState message={orders.length === 0 ? "No orders yet." : "No orders match your filters."} />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["Order #", "Product", "Player Info", "Payment", "Delivery", "Date", "Actions"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const items = parseNotesItems(o.notes);
                  const firstItem = items[0];
                  const firstItemCmsId = firstItem?.packageId || firstItem?.productId;
                  const isExpanded = expandedOrder === o.id;
                  const attempts = parseDeliveryAttempts(o.deliveryNote);
                  const firstItemDelivery = itemDeliveryStatus(firstItemCmsId, attempts);
                  // Items still pending delivery (not yet attempted, or last attempt failed)
                  const pendingItems = items.filter((it) => {
                    const cms = it.packageId || it.productId;
                    if (!cms) return false;
                    const s = itemDeliveryStatus(cms, attempts).state;
                    return s !== "delivered";
                  });
                  const hasMixedDelivery = attempts.length > 0 && pendingItems.length > 0 && pendingItems.length < items.length;
                  const deliveryPending = !o.deliveryStatus || o.deliveryStatus === "pending" || o.deliveryStatus === "failed";

                  return (
                    <Fragment key={o.id}>
                      <tr
                        id={`order-row-${o.id}`}
                        style={{
                          borderBottom: "1px solid hsl(220,15%,11%)",
                          ...(highlightId === o.id ? { background: "hsl(258,70%,55%,0.15)", outline: "1px solid hsl(258,80%,60%)" } : {}),
                        }}
                      >
                        <td style={tdStyle}>
                          <div style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 600, color: "hsl(var(--primary))" }}>{o.orderNumber}</div>
                          {o.utr && (
                            <div style={{ fontSize: "10px", fontFamily: "monospace", color: "hsl(var(--muted-foreground))", marginTop: "2px" }}>UTR: {o.utr}</div>
                          )}
                        </td>
                        <td style={tdStyle}>
                          {firstItem ? (
                            <div>
                              <div style={{ fontWeight: 500, color: "hsl(var(--foreground))", fontSize: "12px", display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                                <span>{firstItem.productTitle ?? "—"}</span>
                                {attempts.length > 0 && (
                                  <ItemDeliveryPill status={firstItemDelivery.state} provider={firstItemDelivery.provider} message={firstItemDelivery.message} />
                                )}
                              </div>
                              <div style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginTop: "1px" }}>{firstItem.packageName ?? ""}{firstItem.quantity && firstItem.quantity > 1 ? ` ×${firstItem.quantity}` : ""}</div>
                              {items.length > 1 && (
                                <button onClick={() => setExpandedOrder(isExpanded ? null : o.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", color: "hsl(258,80%,65%)", padding: 0, marginTop: "2px" }}>
                                  {isExpanded ? "− hide items" : `+${items.length - 1} more`}
                                </button>
                              )}
                              {hasMixedDelivery && !isExpanded && (
                                <div style={{ fontSize: "10px", color: "hsl(38,95%,62%)", marginTop: "2px" }}>
                                  {pendingItems.length} of {items.length} items pending delivery
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "hsl(var(--muted-foreground))", fontSize: "12px" }}>—</span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          {firstItem ? (
                            <div>
                              {firstItem.userId && <div style={{ fontSize: "11px", fontFamily: "monospace", color: "hsl(var(--muted-foreground))" }}>ID: {firstItem.userId}</div>}
                              {firstItem.zoneId && <div style={{ fontSize: "11px", fontFamily: "monospace", color: "hsl(var(--muted-foreground))" }}>Zone: {firstItem.zoneId}</div>}
                              {o.userId && <div style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))", marginTop: "2px" }}>User: {o.userId}</div>}
                            </div>
                          ) : (
                            <span style={{ color: "hsl(var(--muted-foreground))", fontSize: "12px" }}>{o.userId ?? "Guest"}</span>
                          )}
                        </td>
                        <td style={tdStyle}><StatusBadge value={o.status} /></td>
                        <td style={tdStyle}>
                          <DeliveryBadge status={o.deliveryStatus} note={o.deliveryNote} />
                        </td>
                        <td style={{ ...tdStyle, fontSize: "11px", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap" }}>{formatDate(o.createdAt, siteTimezone)}</td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {o.status === "pending" && (
                              <>
                                <button
                                  style={btnSuccess}
                                  onClick={() => statusMut.mutate({ id: o.id, status: "completed" })}
                                  disabled={statusMut.isPending}
                                  data-testid={`button-confirm-payment-${o.id}`}
                                >
                                  Confirm Payment
                                </button>
                                <button
                                  style={btnDanger}
                                  onClick={() => {
                                    if (confirm("Cancel this order? This will mark it as cancelled.")) {
                                      statusMut.mutate({ id: o.id, status: "cancelled" });
                                    }
                                  }}
                                  disabled={statusMut.isPending}
                                  data-testid={`button-cancel-order-${o.id}`}
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            {o.status === "completed" && (o.deliveryStatus === "pending" || o.deliveryStatus === "failed" || !o.deliveryStatus) && (
                              <button
                                style={btnNeutral}
                                onClick={() => deliverMut.mutate(o.id)}
                                disabled={deliverMut.isPending}
                                title={hasMixedDelivery ? `Retries only the ${pendingItems.length} undelivered item(s)` : "Trigger delivery for this order"}
                                data-testid={`button-deliver-order-${o.id}`}
                              >
                                {deliverMut.isPending
                                  ? "Delivering…"
                                  : hasMixedDelivery
                                    ? `Deliver Pending (${pendingItems.length})`
                                    : "Deliver Order"}
                              </button>
                            )}
                            {o.status === "completed" && (o.deliveryStatus === "pending" || o.deliveryStatus === "failed" || !o.deliveryStatus) && (
                              <button
                                style={btnSuccess}
                                onClick={() => {
                                  if (confirm("Mark this order as delivered? Use this only after verifying fulfillment with the provider.")) {
                                    markDeliveredMut.mutate(o.id);
                                  }
                                }}
                                disabled={markDeliveredMut.isPending}
                                title="Manually close out this order after verifying delivery with the provider"
                                data-testid={`button-mark-delivered-${o.id}`}
                              >
                                {markDeliveredMut.isPending ? "Marking…" : "Mark Delivered"}
                              </button>
                            )}
                            {o.status === "completed" && (o.deliveryStatus === "pending" || o.deliveryStatus === "failed" || !o.deliveryStatus) && (
                              <button
                                style={btnDanger}
                                onClick={() => {
                                  if (confirm("Refund this order? Payment will be marked as refunded.")) {
                                    statusMut.mutate({ id: o.id, status: "refunded" });
                                  }
                                }}
                                disabled={statusMut.isPending}
                                data-testid={`button-refund-order-${o.id}`}
                              >
                                Refund
                              </button>
                            )}
                            {o.status === "completed" && o.deliveryStatus === "delivered" && (
                              <span style={{ fontSize: "11px", color: "hsl(142,71%,45%)" }}>Delivered</span>
                            )}
                            {o.status === "completed" && o.deliveryStatus === "not_applicable" && (
                              <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>—</span>
                            )}
                            {(o.status === "failed" || o.status === "refunded" || o.status === "cancelled") && (
                              <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>—</span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && items.slice(1).map((item, idx) => {
                        const cms = item.packageId || item.productId;
                        const d = itemDeliveryStatus(cms, attempts);
                        return (
                          <tr key={`${o.id}-item-${idx}`} style={{ background: "hsl(220,20%,7%)", borderBottom: "1px solid hsl(220,15%,10%)" }}>
                            <td style={{ ...tdStyle, color: "hsl(var(--muted-foreground))", fontSize: "11px" }} colSpan={2}>
                              <div style={{ paddingLeft: "12px" }}>
                                <div style={{ color: "hsl(var(--muted-foreground))", fontWeight: 500, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                                  <span>{item.productTitle ?? "—"}</span>
                                  {attempts.length > 0 && (
                                    <ItemDeliveryPill status={d.state} provider={d.provider} message={d.message} />
                                  )}
                                </div>
                                <div style={{ color: "hsl(var(--muted-foreground))", fontSize: "10px" }}>{item.packageName ?? ""}</div>
                              </div>
                            </td>
                            <td style={{ ...tdStyle, fontSize: "11px" }}>
                              {item.userId && <div style={{ fontFamily: "monospace", color: "hsl(var(--muted-foreground))" }}>ID: {item.userId}</div>}
                              {item.zoneId && <div style={{ fontFamily: "monospace", color: "hsl(var(--muted-foreground))" }}>Zone: {item.zoneId}</div>}
                            </td>
                            <td colSpan={4} style={tdStyle} />
                          </tr>
                        );
                      })}
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
