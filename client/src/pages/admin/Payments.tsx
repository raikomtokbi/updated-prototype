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
  { value: "pending", label: "Pending" },
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

function formatDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function Payments() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/admin/transactions"],
    queryFn: () => adminApi.get("/transactions?limit=200"),
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

  return (
    <AdminLayout title="Payment Transactions">
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
    </AdminLayout>
  );
}
