import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout, { useMobile } from "@/components/admin/AdminLayout";
import { Loader2, DollarSign, ShoppingBag, Users, LifeBuoy, Calendar, ChevronDown } from "lucide-react";
import { useAuthStore } from "@/lib/store/authstore";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { adminApi } from "@/lib/store/useAdmin";
import { getCurrencySymbol } from "@/lib/currency";

const COLORS = ["hsl(var(--primary))", "hsl(196, 100%, 50%)", "hsl(0, 72%, 51%)", "hsl(38, 92%, 55%)", "hsl(142, 71%, 45%)"];

const rangeOptions = [
  { key: "today", label: "Today" },
  { key: "7days", label: "Last 7 days" },
  { key: "30days", label: "Last 30 days" },
  { key: "6months", label: "Last 6 months" },
  { key: "12months", label: "Last 12 months" },
  { key: "custom", label: "Custom range" },
];

const card: React.CSSProperties = {
  background: "hsl(var(--card))",
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
      <button onClick={() => { setOpen(!open); setShowCal(false); }} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", cursor: "pointer", color: "hsl(var(--foreground))", fontSize: "12px", fontWeight: 500, whiteSpace: "nowrap" }}>
        <Calendar size={12} style={{ color: "hsl(var(--primary))" }} />
        {label}
        <ChevronDown size={11} style={{ opacity: 0.5 }} />
      </button>
      {open && !showCal && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: "160px", background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", overflow: "hidden", zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
          {rangeOptions.map((opt) => (
            <button key={opt.key} onClick={() => { opt.key === "custom" ? setShowCal(true) : (onSelect(opt.key), setOpen(false)); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "8px 14px", background: selected === opt.key ? "rgba(139,92,246,0.1)" : "transparent", border: "none", cursor: "pointer", color: selected === opt.key ? "hsl(258,90%,75%)" : "hsl(220,10%,65%)", fontSize: "12px", textAlign: "left" }}>
              {opt.label}
              {selected === opt.key && <span style={{ fontSize: "10px", color: "hsl(var(--primary))" }}>✓</span>}
            </button>
          ))}
        </div>
      )}
      {open && showCal && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", padding: "8px" }}>
          <style>{`.rdp{--rdp-accent-color:hsl(var(--primary));--rdp-background-color:hsl(258,90%,20%);color:hsl(var(--foreground));font-size:12px}.rdp-day_button:hover{background:hsl(220,20%,16%)!important}.rdp-month_caption{color:hsl(var(--foreground))}.rdp-weekday{color:hsl(var(--muted-foreground))}.rdp-nav button{color:hsl(var(--muted-foreground))}`}</style>
          <DayPicker mode="range" selected={customRange} onSelect={(r) => { onCustomRange(r); if (r?.from && r?.to) { onSelect("custom"); setOpen(false); setShowCal(false); } }} />
          <div style={{ display: "flex", gap: "8px", padding: "0 8px 4px" }}>
            <button onClick={() => { setShowCal(false); setOpen(false); }} style={{ flex: 1, padding: "6px", background: "hsl(var(--card))", border: "1px solid hsl(220,15%,20%)", borderRadius: "5px", color: "hsl(var(--muted-foreground))", fontSize: "11px", cursor: "pointer" }}>Cancel</button>
            {customRange?.from && <button onClick={() => { onSelect("custom"); setOpen(false); setShowCal(false); }} style={{ flex: 1, padding: "6px", background: "hsl(258,90%,30%)", border: "1px solid hsl(258,90%,40%)", borderRadius: "5px", color: "hsl(258,90%,85%)", fontSize: "11px", cursor: "pointer" }}>Apply</button>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [statsRangeKey, setStatsRangeKey] = useState("today");
  const [statsCustomRange, setStatsCustomRange] = useState<DateRange | undefined>(undefined);
  const [salesRangeKey, setSalesRangeKey] = useState("today");
  const [salesCustomRange, setSalesCustomRange] = useState<DateRange | undefined>(undefined);
  const [orderRangeKey, setOrderRangeKey] = useState("today");
  const [orderCustomRange, setOrderCustomRange] = useState<DateRange | undefined>(undefined);
  const statsQueryKey = statsRangeKey === "custom" && statsCustomRange?.from
    ? ["/api/admin/stats", statsRangeKey, statsCustomRange.from?.toISOString(), statsCustomRange.to?.toISOString()]
    : ["/api/admin/stats", statsRangeKey];

  const statsUrl = statsRangeKey === "custom" && statsCustomRange?.from
    ? `/stats?range=custom&from=${statsCustomRange.from.toISOString()}&to=${(statsCustomRange.to ?? statsCustomRange.from).toISOString()}`
    : `/stats?range=${statsRangeKey}`;

  const { data: stats } = useQuery<{ totalUsers: number; totalOrders: number; totalRevenue: number; openTickets: number }>({
    queryKey: statsQueryKey,
    queryFn: () => adminApi.get(statsUrl),
    refetchInterval: 1000,
  });

  const { data: siteSettings } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/settings"],
    queryFn: () => adminApi.get("/settings"),
    refetchInterval: 5000,
  });

  const currency = siteSettings?.default_currency ?? "USD";

  const salesQueryKey = salesRangeKey === "custom" && salesCustomRange?.from
    ? ["/api/admin/analytics", "sales", salesRangeKey, salesCustomRange.from?.toISOString(), salesCustomRange.to?.toISOString()]
    : ["/api/admin/analytics", "sales", salesRangeKey];

  const salesUrl = salesRangeKey === "custom" && salesCustomRange?.from
    ? `/analytics?range=custom&from=${salesCustomRange.from.toISOString()}&to=${(salesCustomRange.to ?? salesCustomRange.from).toISOString()}`
    : `/analytics?range=${salesRangeKey}`;

  const { data: salesAnalytics, isLoading: salesLoading } = useQuery<{
    salesTrend: { label: string; sales: number }[];
    orderStatus: { name: string; value: number }[];
  }>({
    queryKey: salesQueryKey,
    queryFn: () => adminApi.get(salesUrl),
    staleTime: 60000,
    refetchInterval: 2000,
  });

  const orderQueryKey = orderRangeKey === "custom" && orderCustomRange?.from
    ? ["/api/admin/analytics", "orders", orderRangeKey, orderCustomRange.from?.toISOString(), orderCustomRange.to?.toISOString()]
    : ["/api/admin/analytics", "orders", orderRangeKey];

  const orderUrl = orderRangeKey === "custom" && orderCustomRange?.from
    ? `/analytics?range=custom&from=${orderCustomRange.from.toISOString()}&to=${(orderCustomRange.to ?? orderCustomRange.from).toISOString()}`
    : `/analytics?range=${orderRangeKey}`;

  const { data: orderAnalytics, isLoading: orderLoading } = useQuery<{
    salesTrend: { label: string; sales: number }[];
    orderStatus: { name: string; value: number }[];
  }>({
    queryKey: orderQueryKey,
    queryFn: () => adminApi.get(orderUrl),
    staleTime: 60000,
    refetchInterval: 2000,
  });

  const placeholderSalesData = salesRangeKey === "today"
    ? Array.from({ length: 24 }, (_, i) => {
        const h = i % 12 === 0 ? 12 : i % 12;
        const ampm = i < 12 ? "AM" : "PM";
        return { label: `${String(h).padStart(2, "0")}:00 ${ampm}`, sales: 0 };
      })
    : salesRangeKey === "7days" || salesRangeKey === "30days"
    ? Array.from({ length: salesRangeKey === "7days" ? 7 : 10 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (salesRangeKey === "7days" ? 6 : 29) + i);
        return { label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), sales: 0 };
      })
    : [
        { label: "Jan", sales: 0 }, { label: "Feb", sales: 0 }, { label: "Mar", sales: 0 },
        { label: "Apr", sales: 0 }, { label: "May", sales: 0 }, { label: "Jun", sales: 0 },
      ];

  const placeholderPieData = [
    { name: "Pending", value: 0 },
    { name: "Completed", value: 0 },
    { name: "Cancelled", value: 0 },
  ];

  const chartData = salesAnalytics?.salesTrend && salesAnalytics.salesTrend.length > 0 ? salesAnalytics.salesTrend : placeholderSalesData;
  const pieData = orderAnalytics?.orderStatus && orderAnalytics.orderStatus.length > 0 ? orderAnalytics.orderStatus : placeholderPieData;

  const isMobile = useMobile();
  const { user } = useAuthStore();
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();
  const displayName = user?.fullName || user?.username || "Admin";

  const statsLabel = statsRangeKey === "custom" && statsCustomRange?.from
    ? statsCustomRange.to ? `${formatDateShort(statsCustomRange.from)} – ${formatDateShort(statsCustomRange.to)}` : formatDateShort(statsCustomRange.from)
    : rangeOptions.find((o) => o.key === statsRangeKey)?.label ?? "Today";

  const statCards = [
    {
      label: "Sales",
      value: stats ? `${getCurrencySymbol(currency)} ${Number(stats.totalRevenue).toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—",
      icon: <DollarSign size={18} />,
      color: "hsl(var(--primary))",
      sub: statsLabel,
      testId: "stat-total-sales",
    },
    {
      label: "Orders",
      value: stats ? stats.totalOrders.toLocaleString() : "—",
      icon: <ShoppingBag size={18} />,
      color: "hsl(196, 100%, 50%)",
      sub: statsLabel,
      testId: "stat-total-orders",
    },
    {
      label: "Tickets",
      value: stats ? stats.openTickets.toLocaleString() : "—",
      icon: <LifeBuoy size={18} />,
      color: "hsl(38, 92%, 55%)",
      sub: statsLabel,
      testId: "stat-open-tickets",
    },
    {
      label: "Users",
      value: stats ? stats.totalUsers.toLocaleString() : "—",
      icon: <Users size={18} />,
      color: "hsl(142, 71%, 45%)",
      sub: statsLabel,
      testId: "stat-total-users",
    },
  ];

  return (
    <AdminLayout title="Dashboard">
      <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? "10px" : "12px" }}>

        {/* ── Greeting + filter on same row ─────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          {!isMobile && (
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "hsl(var(--foreground))", margin: 0, lineHeight: 1.3 }}>
                {greeting}, {displayName}
              </h2>
              <p style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginTop: "2px", margin: 0 }}>
                Here's what's happening with your store today.
              </p>
            </div>
          )}
          <div style={{ marginLeft: "auto" }}>
            <DateRangeFilter
              selected={statsRangeKey}
              onSelect={setStatsRangeKey}
              customRange={statsCustomRange}
              onCustomRange={setStatsCustomRange}
            />
          </div>
        </div>

        {/* ── Stat cards ─────────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: isMobile ? "8px" : "10px",
          }}
        >
          {statCards.map((sc) => (
            <div key={sc.label} data-testid={sc.testId} style={{ ...card, padding: isMobile ? "10px" : "12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "10px", fontWeight: 600, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.06em" }}>{sc.label}</span>
                <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: `${sc.color}18`, color: sc.color, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${sc.color}28`, flexShrink: 0 }}>
                  {sc.icon}
                </div>
              </div>
              <div style={{ fontSize: isMobile ? "18px" : "20px", fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: "2px", lineHeight: 1.1 }}>{sc.value}</div>
              <div style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))" }}>{sc.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Charts ─────────────────────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 300px",
            gap: isMobile ? "10px" : "12px",
          }}
        >
          {/* Sales Trend */}
          <div style={{ ...card, padding: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", gap: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "hsl(var(--foreground))" }}>Sales Trend</span>
              <DateRangeFilter
                selected={salesRangeKey}
                onSelect={setSalesRangeKey}
                customRange={salesCustomRange}
                onCustomRange={setSalesCustomRange}
              />
            </div>
            {salesLoading ? (
              <div style={{ height: 170, display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(var(--muted-foreground))", gap: "8px" }}>
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: "13px" }}>Loading...</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={170}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${getCurrencySymbol(currency)}${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", color: "hsl(var(--foreground))", fontSize: "12px" }} formatter={(value: number) => [`${getCurrencySymbol(currency)}${value.toLocaleString()}`, "Revenue"]} />
                  <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Order Status */}
          <div style={{ ...card, padding: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", gap: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "hsl(var(--foreground))" }}>Order Status</span>
              <DateRangeFilter
                selected={orderRangeKey}
                onSelect={setOrderRangeKey}
                customRange={orderCustomRange}
                onCustomRange={setOrderCustomRange}
              />
            </div>
            {orderLoading ? (
              <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(var(--muted-foreground))", gap: "8px" }}>
                <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: "13px" }}>Loading...</span>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={36} outerRadius={56} paddingAngle={3} dataKey="value">
                      {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", color: "hsl(var(--foreground))", fontSize: "12px" }} formatter={(value: number) => [`${value}%`, ""]} />
                    <Legend iconType="circle" iconSize={7} formatter={(value) => <span style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))" }}>{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "5px" }}>
                  {pieData.map((item, i) => (
                    <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }}>{item.name}</span>
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "hsl(var(--foreground))" }}>{item.value}%</span>
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

