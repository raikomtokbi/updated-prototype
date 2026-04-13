import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import {
  card, thStyle, tdStyle,
  SearchInput, EmptyState, Toolbar,
} from "@/components/admin/shared";

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatCurrency(amount: string | number | null | undefined, currency = "USD") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(amount));
}

export default function Refunds() {
  const [search, setSearch] = useState("");

  const { data: refunds = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/transactions/refunds"],
    queryFn: () => adminApi.get("/transactions/refunds"),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return refunds;
    return refunds.filter((r) =>
      r.transactionNumber?.toLowerCase().includes(q) ||
      (r.orderId ?? "").toLowerCase().includes(q) ||
      (r.userId ?? "").toLowerCase().includes(q) ||
      (r.paymentMethod ?? "").toLowerCase().includes(q)
    );
  }, [refunds, search]);

  return (
    <AdminLayout title="Refund Records">
      <div style={card}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search transaction #, order, user..." />
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </span>
        </Toolbar>

        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "hsl(var(--muted-foreground))", fontSize: "13px" }}>Loading refund records...</div>
          ) : filtered.length === 0 ? (
            <EmptyState message={refunds.length === 0 ? "No refunds have been processed yet." : "No records match your search."} />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr>
                  {["Transaction #", "Order ID", "User ID", "Method", "Amount", "Date"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid hsl(220,15%,11%)" }}>
                    <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "12px", fontWeight: 600, color: "hsl(258,90%,70%)" }}>
                      {r.transactionNumber}
                    </td>
                    <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>
                      {r.orderId ?? "—"}
                    </td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(var(--foreground))" }}>
                      {r.userId ?? <span style={{ color: "hsl(220,10%,40%)" }}>Guest</span>}
                    </td>
                    <td style={{ ...tdStyle, fontSize: "11px", textTransform: "uppercase", color: "hsl(var(--muted-foreground))" }}>
                      {r.paymentMethod?.replace(/_/g, " ") ?? "—"}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 600, color: "hsl(0,72%,60%)" }}>
                      -{formatCurrency(r.amount, r.currency)}
                    </td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>
                      {formatDate(r.createdAt)}
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
