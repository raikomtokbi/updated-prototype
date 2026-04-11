import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import type { Transaction } from "@shared/schema";
import {
  card, thStyle, tdStyle,
  SearchInput, FilterSelect, StatusBadge, EmptyState, Toolbar,
} from "@/components/admin/shared";

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "refunded", label: "Refunded" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
];

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function Refunds() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: refunds = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/admin/transactions/refunds"],
    queryFn: () => adminApi.get("/transactions/refunds"),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return refunds.filter((r) => {
      const matchSearch =
        !q ||
        r.id.toLowerCase().includes(q) ||
        (r.userId ?? "").toLowerCase().includes(q) ||
        (r.gatewayRef ?? "").toLowerCase().includes(q);
      const matchStatus = !statusFilter || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [refunds, search, statusFilter]);

  return (
    <AdminLayout title="Refund Requests">
      <div style={card}>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Search transaction or user..." />
          <FilterSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <span style={{ marginLeft: "auto", fontSize: "12px", color: "hsl(var(--muted-foreground))" }}>
            {filtered.length} request{filtered.length !== 1 ? "s" : ""}
          </span>
        </Toolbar>

        <div style={{ overflowX: "auto" }}>
          {isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "hsl(220,10%,42%)", fontSize: "13px" }}>Loading refund requests...</div>
          ) : filtered.length === 0 ? (
            <EmptyState message={refunds.length === 0 ? "No refund requests yet." : "No refunds match your filters."} />
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
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: "monospace", fontSize: "11px", color: "hsl(258, 90%, 70%)" }}>{r.id.slice(0, 16)}…</span>
                    </td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(var(--foreground))" }}>{r.userId ?? "—"}</td>
                    <td style={{ ...tdStyle, color: "hsl(var(--muted-foreground))" }}>{r.paymentMethod}</td>
                    <td style={{ ...tdStyle, fontSize: "11px", fontFamily: "monospace", color: "hsl(var(--muted-foreground))" }}>{r.gatewayRef ?? "—"}</td>
                    <td style={{ ...tdStyle, fontWeight: 500, color: "hsl(var(--foreground))" }}>${Number(r.amount).toFixed(2)}</td>
                    <td style={tdStyle}><StatusBadge value={r.status} /></td>
                    <td style={{ ...tdStyle, fontSize: "12px", color: "hsl(220, 10%, 46%)" }}>{formatDate(r.createdAt)}</td>
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
