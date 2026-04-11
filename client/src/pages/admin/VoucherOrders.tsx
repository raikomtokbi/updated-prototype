import { useState, useMemo, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import type { Order } from "@shared/schema";
import {
  card, thStyle, tdStyle, btnSuccess, btnDanger,
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

const VOUCHER_CATEGORIES = ["voucher", "gift_card", "subscription"];

function formatDate(d: string | Date | null | undefined) {
  return d ? new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

function parseNotesItems(notes: string | null | undefined): Array<Record<string, any>> {
  if (!notes) return [];
  try {
    const parsed = JSON.parse(notes);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed?.items)) return parsed.items;
  } catch {}
  return [];
}

function categoryLabel(cat: string) {
  const map: Record<string, string> = {
    voucher: "Voucher",
    gift_card: "Gift Card",
    subscription: "Subscription",
  };
  return map[cat] ?? cat;
}

type AnyOrder = Order & { utr?: string | null };

export default function VoucherOrders() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((o) => {
      const items = parseNotesItems(o.notes);
      // Only show non-game-currency orders (voucher, gift_card, subscription)
      const firstCat = items[0]?.productCategory;
      const isVoucher = firstCat && VOUCHER_CATEGORIES.includes(firstCat);
      if (!isVoucher) return false;

      const productStr = items.map(i => `${i.productTitle ?? ""} ${i.packageName ?? ""}`).join(" ").toLowerCase();
      const matchSearch = !q
        || (o.orderNumber ?? "").toLowerCase().includes(q)
        || (o.userId ?? "").toLowerCase().includes(q)
        || productStr.includes(q)
        || (o.utr ?? "").toLowerCase().includes(q);
      const matchStatus = !statusFilter || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

  return (
    <AdminLayout title="Voucher Orders">
      <div style={card}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search order #, user, product, UTR..." />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>
            {filtered.length} order{filtered.length !== 1 ? "s" : ""}
          </span>
        </Toolbar>

        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "hsl(220,10%,42%)", fontSize: "13px" }}>Loading orders...</div>
          ) : filtered.length === 0 ? (
            <EmptyState message={orders.length === 0 ? "No voucher orders yet." : "No orders match your filters."} />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["Order #", "Product", "Type", "Customer", "Payment", "Date", "Actions"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => {
                  const items = parseNotesItems(o.notes);
                  const firstItem = items[0];
                  const isExpanded = expandedOrder === o.id;

                  return (
                    <Fragment key={o.id}>
                      <tr style={{ borderBottom: "1px solid hsl(220,15%,11%)" }}>
                        <td style={tdStyle}>
                          <div style={{ fontFamily: "monospace", fontSize: "12px", fontWeight: 600, color: "hsl(258,90%,70%)" }}>{o.orderNumber}</div>
                          {o.utr && (
                            <div style={{ fontSize: "10px", fontFamily: "monospace", color: "hsl(220,10%,38%)", marginTop: "2px" }}>UTR: {o.utr}</div>
                          )}
                        </td>
                        <td style={tdStyle}>
                          {firstItem ? (
                            <div>
                              <div style={{ fontWeight: 500, color: "hsl(210,40%,85%)", fontSize: "12px" }}>{firstItem.productTitle ?? "—"}</div>
                              <div style={{ fontSize: "11px", color: "hsl(220,10%,50%)", marginTop: "1px" }}>
                                {firstItem.packageName ?? ""}
                                {firstItem.quantity && firstItem.quantity > 1 ? ` ×${firstItem.quantity}` : ""}
                              </div>
                              {items.length > 1 && (
                                <button
                                  onClick={() => setExpandedOrder(isExpanded ? null : o.id)}
                                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", color: "hsl(258,80%,65%)", padding: 0, marginTop: "2px" }}
                                >
                                  +{items.length - 1} more
                                </button>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: "hsl(220,10%,38%)", fontSize: "12px" }}>—</span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          {firstItem?.productCategory ? (
                            <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 500, background: "rgba(124,58,237,0.1)", color: "hsl(258,80%,70%)" }}>
                              {categoryLabel(firstItem.productCategory)}
                            </span>
                          ) : (
                            <span style={{ fontSize: "11px", color: "hsl(220,10%,38%)" }}>—</span>
                          )}
                        </td>
                        <td style={tdStyle}>
                          {firstItem?.email ? (
                            <div style={{ fontSize: "11px", fontFamily: "monospace", color: "hsl(210,40%,70%)" }}>{firstItem.email}</div>
                          ) : o.userId ? (
                            <div style={{ fontSize: "11px", fontFamily: "monospace", color: "hsl(220,10%,50%)" }}>{o.userId.slice(0, 14)}…</div>
                          ) : (
                            <span style={{ fontSize: "11px", color: "hsl(220,10%,38%)" }}>Guest</span>
                          )}
                        </td>
                        <td style={tdStyle}><StatusBadge value={o.status} /></td>
                        <td style={{ ...tdStyle, fontSize: "11px", color: "hsl(220,10%,46%)", whiteSpace: "nowrap" }}>{formatDate(o.createdAt)}</td>
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
                                  onClick={() => statusMut.mutate({ id: o.id, status: "failed" })}
                                  disabled={statusMut.isPending}
                                  data-testid={`button-reject-order-${o.id}`}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {(o.status === "completed" || o.status === "failed" || o.status === "refunded") && (
                              <span style={{ fontSize: "11px", color: "hsl(220,10%,38%)" }}>—</span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {isExpanded && items.slice(1).map((item, idx) => (
                        <tr key={`${o.id}-item-${idx}`} style={{ background: "hsl(220,20%,7%)", borderBottom: "1px solid hsl(220,15%,10%)" }}>
                          <td colSpan={2} style={{ ...tdStyle, fontSize: "11px" }}>
                            <div style={{ paddingLeft: "12px" }}>
                              <div style={{ color: "hsl(210,40%,75%)", fontWeight: 500 }}>{item.productTitle ?? "—"}</div>
                              <div style={{ color: "hsl(220,10%,45%)", fontSize: "10px" }}>{item.packageName ?? ""}</div>
                            </div>
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
