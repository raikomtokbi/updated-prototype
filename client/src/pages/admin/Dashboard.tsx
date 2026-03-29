import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { Loader2, Database, DollarSign, ShoppingBag, CheckCircle, RotateCcw, Calendar, ChevronDown } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { adminApi } from "@/lib/store/useAdmin";

const COLORS = ["hsl(258, 90%, 66%)", "hsl(196, 100%, 50%)", "hsl(0, 72%, 51%)", "hsl(38, 92%, 55%)", "hsl(142, 71%, 45%)"];

const rangeOptions = [
  { key: "today", label: "Today" },
  { key: "7days", label: "Last 7 days" },
  { key: "30days", label: "Last 30 days" },
  { key: "6months", label: "Last 6 months" },
  { key: "12months", label: "Last 12 months" },
  { key: "custom", label: "Custom range" },
];

const card: React.CSSProperties = {
  background: "hsl(220, 20%, 9%)",
  border: "1px solid hsl(220, 15%, 13%)",
  borderRadius: "8px",
  padding: "20px",
};

function formatDateShort(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Date Range Filter ────────────────────────────────────────────────────────
function DateRangeFilter({ selected, onSelect, customRange, onCustomRange }: {
  selected: string;
  onSelect: (k: string) => void;
  customRange: DateRange | undefined;
  onCustomRange: (r: DateRange | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showCal, setShowCal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setShowCal(false); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const label = selected === "custom" && customRange?.from
    ? customRange.to ? `${formatDateShort(customRange.from)} – ${formatDateShort(customRange.to)}` : formatDateShort(customRange.from)
    : rangeOptions.find((o) => o.key === selected)?.label ?? "Last 12 months";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => { setOpen(!open); setShowCal(false); }} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "hsl(220, 20%, 12%)", border: "1px solid hsl(220, 15%, 18%)", borderRadius: "6px", cursor: "pointer", color: "hsl(210, 40%, 88%)", fontSize: "12px", fontWeight: 500, whiteSpace: "nowrap" }}>
        <Calendar size={12} style={{ color: "hsl(258, 90%, 66%)" }} />
        {label}
        <ChevronDown size={11} style={{ opacity: 0.5 }} />
      </button>
      {open && !showCal && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: "160px", background: "hsl(220, 20%, 10%)", border: "1px solid hsl(220, 15%, 18%)", borderRadius: "8px", overflow: "hidden", zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
          {rangeOptions.map((opt) => (
            <button key={opt.key} onClick={() => { opt.key === "custom" ? setShowCal(true) : (onSelect(opt.key), setOpen(false)); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "8px 14px", background: selected === opt.key ? "rgba(139,92,246,0.1)" : "transparent", border: "none", cursor: "pointer", color: selected === opt.key ? "hsl(258,90%,75%)" : "hsl(220,10%,65%)", fontSize: "12px", textAlign: "left" }}>
              {opt.label}
              {selected === opt.key && <span style={{ fontSize: "10px", color: "hsl(258,90%,66%)" }}>✓</span>}
            </button>
          ))}
        </div>
      )}
      {open && showCal && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "hsl(220, 20%, 10%)", border: "1px solid hsl(220, 15%, 18%)", borderRadius: "8px", zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", padding: "8px" }}>
          <style>{`.rdp{--rdp-accent-color:hsl(258,90%,66%);--rdp-background-color:hsl(258,90%,20%);color:hsl(210,40%,85%);font-size:12px}.rdp-day_button:hover{background:hsl(220,20%,16%)!important}.rdp-month_caption{color:hsl(210,40%,85%)}.rdp-weekday{color:hsl(220,10%,42%)}.rdp-nav button{color:hsl(220,10%,52%)}`}</style>
          <DayPicker mode="range" selected={customRange} onSelect={(r) => { onCustomRange(r); if (r?.from && r?.to) { onSelect("custom"); setOpen(false); setShowCal(false); } }} />
          <div style={{ display: "flex", gap: "8px", padding: "0 8px 4px" }}>
            <button onClick={() => { setShowCal(false); setOpen(false); }} style={{ flex: 1, padding: "6px", background: "hsl(220,20%,14%)", border: "1px solid hsl(220,15%,20%)", borderRadius: "5px", color: "hsl(220,10%,55%)", fontSize: "11px", cursor: "pointer" }}>Cancel</button>
            {customRange?.from && <button onClick={() => { onSelect("custom"); setOpen(false); setShowCal(false); }} style={{ flex: 1, padding: "6px", background: "hsl(258,90%,30%)", border: "1px solid hsl(258,90%,40%)", borderRadius: "5px", color: "hsl(258,90%,85%)", fontSize: "11px", cursor: "pointer" }}>Apply</button>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const qc = useQueryClient();
  const [rangeKey, setRangeKey] = useState("12months");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [seedDone, setSeedDone] = useState(false);

  const { data: stats } = useQuery<{ totalUsers: number; totalOrders: number; totalRevenue: number; openTickets: number }>({
    queryKey: ["/api/admin/stats"],
    queryFn: () => adminApi.get("/stats"),
  });

  const { data: gameList = [] } = useQuery<{ id: string }[]>({
    queryKey: ["/api/admin/games"],
    queryFn: () => adminApi.get("/games"),
  });

  const seedMut = useMutation({
    mutationFn: () => adminApi.post("/seed", {}),
    onSuccess: () => {
      setSeedDone(true);
      qc.invalidateQueries({ queryKey: ["/api/admin/games"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/hero-sliders"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/analytics"] });
    },
  });

  const analyticsQueryKey = rangeKey === "custom" && customRange?.from
    ? ["/api/admin/analytics", rangeKey, customRange.from?.toISOString(), customRange.to?.toISOString()]
    : ["/api/admin/analytics", rangeKey];

  const analyticsUrl = rangeKey === "custom" && customRange?.from
    ? `/analytics?range=custom&from=${customRange.from.toISOString()}&to=${(customRange.to ?? customRange.from).toISOString()}`
    : `/analytics?range=${rangeKey}`;

  const { data: analytics, isLoading: analyticsLoading } = useQuery<{
    salesTrend: { label: string; sales: number }[];
    orderStatus: { name: string; value: number }[];
  }>({
    queryKey: analyticsQueryKey,
    queryFn: () => adminApi.get(analyticsUrl),
    staleTime: 60000,
  });

  const chartData = analytics?.salesTrend ?? [];
  const pieData = analytics?.orderStatus ?? [];

  const statCards = [
    {
      label: "Total Revenue",
      value: stats ? `$${Number(stats.totalRevenue).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—",
      icon: <DollarSign size={17} />,
      color: "hsl(258, 90%, 66%)",
      sub: "All time",
      testId: "stat-total-sales",
    },
    {
      label: "Total Orders",
      value: stats ? stats.totalOrders.toLocaleString() : "—",
      icon: <ShoppingBag size={17} />,
      color: "hsl(196, 100%, 50%)",
      sub: "All time",
      testId: "stat-total-orders",
    },
    {
      label: "Total Users",
      value: stats ? stats.totalUsers.toLocaleString() : "—",
      icon: <CheckCircle size={17} />,
      color: "hsl(142, 71%, 45%)",
      sub: "Registered accounts",
      testId: "stat-successful-orders",
    },
    {
      label: "Open Tickets",
      value: stats ? stats.openTickets.toLocaleString() : "—",
      icon: <RotateCcw size={17} />,
      color: "hsl(0, 72%, 51%)",
      sub: "Awaiting response",
      testId: "stat-refund-orders",
    },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          {statCards.map((sc) => (
            <div key={sc.label} data-testid={sc.testId} style={card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", color: "hsl(220, 10%, 50%)" }}>{sc.label}</span>
                <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: `${sc.color}20`, color: sc.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {sc.icon}
                </div>
              </div>
              <div style={{ fontSize: "22px", fontWeight: 700, color: "hsl(210, 40%, 95%)", marginBottom: "4px" }}>{sc.value}</div>
              <div style={{ fontSize: "11px", color: "hsl(220, 10%, 42%)" }}>{sc.sub}</div>
            </div>
          ))}
        </div>

        {/* Setup / Seed demo data */}
        {gameList.length === 0 && !seedDone && (
          <div style={{ background: "hsl(258,70%,10%)", border: "1px solid rgba(124,58,237,0.3)", borderRadius: "8px", padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "38px", height: "38px", borderRadius: "8px", background: "rgba(124,58,237,0.15)", color: "hsl(258,90%,66%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Database size={18} />
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210,40%,95%)" }}>No data yet — Load sample data to get started</div>
                <div style={{ fontSize: "11px", color: "hsl(220,10%,50%)", marginTop: "2px" }}>Adds 4 games, pricing options, 3 hero sliders, and 2 campaigns for testing</div>
              </div>
            </div>
            <button
              onClick={() => seedMut.mutate()}
              disabled={seedMut.isPending}
              style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "6px", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", color: "white", fontSize: "12px", fontWeight: 600, cursor: seedMut.isPending ? "not-allowed" : "pointer", border: "none", whiteSpace: "nowrap", flexShrink: 0 }}
              data-testid="button-seed-data"
            >
              {seedMut.isPending ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Database size={13} />}
              {seedMut.isPending ? "Loading sample data..." : "Load Sample Data"}
            </button>
          </div>
        )}
        {seedDone && (
          <div style={{ background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: "8px", padding: "12px 18px", fontSize: "13px", color: "hsl(142,71%,48%)" }}>
            Sample data loaded successfully. Refresh the page to see it on the storefront.
          </div>
        )}

        {/* Date range filter row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px" }}>
          <span style={{ fontSize: "12px", color: "hsl(220, 10%, 42%)" }}>Showing data for:</span>
          <DateRangeFilter
            selected={rangeKey}
            onSelect={setRangeKey}
            customRange={customRange}
            onCustomRange={setCustomRange}
          />
        </div>

        {/* Charts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "16px" }}>
          <div style={{ ...card, padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>Revenue Trend</span>
              <span style={{ fontSize: "11px", color: "hsl(220, 10%, 42%)" }}>{rangeOptions.find((r) => r.key === rangeKey)?.label ?? "Custom range"}</span>
            </div>
            {analyticsLoading ? (
              <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(220,10%,38%)", fontSize: "13px" }}>Loading...</div>
            ) : chartData.length === 0 ? (
              <div style={{ height: 240, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "hsl(220,10%,38%)", fontSize: "13px", gap: "6px" }}>
                <span style={{ fontSize: "24px", opacity: 0.3 }}>📊</span>
                No data available for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(258, 90%, 66%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(258, 90%, 66%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 13%)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(220, 10%, 42%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(220, 10%, 42%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                  <Tooltip contentStyle={{ background: "hsl(220, 20%, 10%)", border: "1px solid hsl(220, 15%, 18%)", borderRadius: "6px", color: "hsl(210, 40%, 95%)", fontSize: "12px" }} formatter={(value: number) => [`$${value.toLocaleString()}`, "Revenue"]} />
                  <Area type="monotone" dataKey="sales" stroke="hsl(258, 90%, 66%)" strokeWidth={2} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={{ ...card, padding: "20px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)", marginBottom: "8px" }}>Order Status</div>
            {analyticsLoading ? (
              <div style={{ height: 190, display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(220,10%,38%)", fontSize: "13px" }}>Loading...</div>
            ) : pieData.length === 0 ? (
              <div style={{ height: 190, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "hsl(220,10%,38%)", fontSize: "13px", gap: "6px" }}>
                <span style={{ fontSize: "20px", opacity: 0.3 }}>🥧</span>
                No orders yet.
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(220, 20%, 10%)", border: "1px solid hsl(220, 15%, 18%)", borderRadius: "6px", color: "hsl(210, 40%, 95%)", fontSize: "12px" }} formatter={(value: number) => [`${value}%`, ""]} />
                    <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ fontSize: "11px", color: "hsl(220, 10%, 52%)" }}>{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {pieData.map((item, i) => (
                    <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                        <span style={{ fontSize: "12px", color: "hsl(220, 10%, 52%)" }}>{item.name}</span>
                      </div>
                      <span style={{ fontSize: "12px", fontWeight: 500, color: "hsl(210, 40%, 95%)" }}>{item.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

