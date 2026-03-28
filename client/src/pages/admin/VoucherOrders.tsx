import { useState, useMemo } from "react";
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

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function VoucherOrders() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/admin/orders"],
    queryFn: () => adminApi.get("/orders?limit=200"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/orders"] }),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((o) => {
      const matchSearch =
        !q ||
        o.orderNumber.toLowerCase().includes(q) ||
        (o.userId ?? "").toLowerCase().includes(q) ||
        o.productTitle.toLowerCase().includes(q);
      const matchStatus = !statusFilter || o.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

  return (
    <AdminLayout title="Voucher Orders">
      <div style={card}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search order #, user, or product..." />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>
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
                  {["Order #", "User ID", "Product", "Amount", "Status", "Date", "Actions"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id}>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: "monospace", fontSize: "12px", color: "hsl(258, 90%, 70%)" }}>{o.orderNumber}</span>
                    </td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(210, 40%, 80%)" }}>{o.userId ?? "—"}</td>
                    <td style={{ ...tdStyle, color: "hsl(220, 10%, 60%)", maxWidth: "180px" }}>
                      <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.productTitle}</span>
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 500, color: "hsl(210, 40%, 95%)" }}>${Number(o.totalAmount).toFixed(2)}</td>
                    <td style={tdStyle}><StatusBadge value={o.status} /></td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(220, 10%, 46%)" }}>{formatDate(o.createdAt)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "6px" }}>
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
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
