import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { DollarSign, ShoppingBag, CheckCircle, RotateCcw, Calendar, ChevronDown } from "lucide-react";
import { DayPicker } from "react-day-picker";
import type { DateRange } from "react-day-picker";
import "react-day-picker/style.css";
import { adminApi } from "@/lib/store/useAdmin";

// ─── Data per range ───────────────────────────────────────────────────────────
const salesByRange: Record<string, { label: string; sales: number }[]> = {
  today: [
    { label: "12am", sales: 320 }, { label: "2am", sales: 180 }, { label: "4am", sales: 90 },
    { label: "6am", sales: 410 }, { label: "8am", sales: 860 }, { label: "10am", sales: 1240 },
    { label: "12pm", sales: 1580 }, { label: "2pm", sales: 1320 }, { label: "4pm", sales: 1750 },
    { label: "6pm", sales: 2100 }, { label: "8pm", sales: 1890 }, { label: "10pm", sales: 1200 },
  ],
  "7days": [
    { label: "Mon", sales: 2400 }, { label: "Tue", sales: 3100 }, { label: "Wed", sales: 2800 },
    { label: "Thu", sales: 3900 }, { label: "Fri", sales: 4500 }, { label: "Sat", sales: 5200 }, { label: "Sun", sales: 4100 },
  ],
  "30days": [
    { label: "W1", sales: 12400 }, { label: "W2", sales: 15800 }, { label: "W3", sales: 13200 }, { label: "W4", sales: 18600 },
  ],
  "6months": [
    { label: "Aug", sales: 38000 }, { label: "Sep", sales: 42000 }, { label: "Oct", sales: 39500 },
    { label: "Nov", sales: 51000 }, { label: "Dec", sales: 68000 }, { label: "Jan", sales: 55000 },
  ],
  "12months": [
    { label: "Jan", sales: 4200 }, { label: "Feb", sales: 5800 }, { label: "Mar", sales: 4900 },
    { label: "Apr", sales: 7200 }, { label: "May", sales: 6100 }, { label: "Jun", sales: 8400 },
    { label: "Jul", sales: 9100 }, { label: "Aug", sales: 7800 }, { label: "Sep", sales: 10200 },
    { label: "Oct", sales: 9500 }, { label: "Nov", sales: 11400 }, { label: "Dec", sales: 13200 },
  ],
};

const pieByRange: Record<string, { name: string; value: number }[]> = {
  today: [{ name: "Successful", value: 72 }, { name: "Refunded", value: 8 }, { name: "Unsuccessful", value: 20 }],
  "7days": [{ name: "Successful", value: 65 }, { name: "Refunded", value: 15 }, { name: "Unsuccessful", value: 20 }],
  "30days": [{ name: "Successful", value: 68 }, { name: "Refunded", value: 12 }, { name: "Unsuccessful", value: 20 }],
  "6months": [{ name: "Successful", value: 71 }, { name: "Refunded", value: 10 }, { name: "Unsuccessful", value: 19 }],
  "12months": [{ name: "Successful", value: 68 }, { name: "Refunded", value: 12 }, { name: "Unsuccessful", value: 20 }],
};

const COLORS = ["hsl(258, 90%, 66%)", "hsl(196, 100%, 50%)", "hsl(220, 15%, 30%)"];

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
function generateCustomData(range: DateRange) {
  if (!range.from) return [];
  const from = range.from;
  const to = range.to ?? range.from;
  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
  return Array.from({ length: Math.min(days, 12) }, (_, i) => {
    const d = new Date(from);
    d.setDate(from.getDate() + Math.floor((i / Math.min(days, 12)) * days));
    return { label: formatDateShort(d), sales: Math.floor(1000 + Math.random() * 8000) };
  });
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
  const [rangeKey, setRangeKey] = useState("12months");
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);

  const { data: stats } = useQuery<{ totalUsers: number; totalOrders: number; totalRevenue: number; openTickets: number }>({
    queryKey: ["/api/admin/stats"],
    queryFn: () => adminApi.get("/stats"),
  });

  const chartData = rangeKey === "custom" && customRange?.from
    ? generateCustomData(customRange)
    : (salesByRange[rangeKey] ?? salesByRange["12months"]);

  const pieData = pieByRange[rangeKey] ?? pieByRange["12months"];

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

        {/* Date range filter row — affects all charts below */}
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
              <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>Sales Trend</span>
              <span style={{ fontSize: "11px", color: "hsl(220, 10%, 42%)" }}>{rangeOptions.find((r) => r.key === rangeKey)?.label ?? "Custom range"}</span>
            </div>
            {chartData.length === 0 ? (
              <div style={{ height: 240, display: "flex", alignItems: "center", justifyContent: "center", color: "hsl(220,10%,38%)", fontSize: "13px" }}>No data available yet.</div>
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
                  <Tooltip contentStyle={{ background: "hsl(220, 20%, 10%)", border: "1px solid hsl(220, 15%, 18%)", borderRadius: "6px", color: "hsl(210, 40%, 95%)", fontSize: "12px" }} formatter={(value: number) => [`$${value.toLocaleString()}`, "Sales"]} />
                  <Area type="monotone" dataKey="sales" stroke="hsl(258, 90%, 66%)" strokeWidth={2} fill="url(#salesGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div style={{ ...card, padding: "20px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)", marginBottom: "8px" }}>Order Status</div>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(220, 20%, 10%)", border: "1px solid hsl(220, 15%, 18%)", borderRadius: "6px", color: "hsl(210, 40%, 95%)", fontSize: "12px" }} formatter={(value: number) => [`${value}%`, ""]} />
                <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ fontSize: "11px", color: "hsl(220, 10%, 52%)" }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {pieData.map((item, i) => (
                <div key={item.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: COLORS[i] }} />
                    <span style={{ fontSize: "12px", color: "hsl(220, 10%, 52%)" }}>{item.name}</span>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: "hsl(210, 40%, 95%)" }}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
