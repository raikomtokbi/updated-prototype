import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout, { useMobile } from "@/components/admin/AdminLayout";
import { Loader2, DollarSign, ShoppingBag, Users, LifeBuoy, Calendar, ChevronDown, Mail, Send, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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

  // ── Email composer state ───────────────────────────────────────────────────
  const { toast } = useToast();
  const [emailForm, setEmailForm] = useState({ fromName: "", replyTo: "", cc: "", to: "", subject: "", body: "" });
  const [emailSent, setEmailSent] = useState(false);
  const [showReplyTo, setShowReplyTo] = useState(false);
  const [showCC, setShowCC] = useState(false);

  const sendEmailMutation = useMutation({
    mutationFn: async (data: typeof emailForm) => {
      const res = await apiRequest("POST", "/api/admin/send-email", data);
      if (!res.ok) { const j = await res.json(); throw new Error(j.error || "Failed to send"); }
      return res.json();
    },
    onSuccess: () => {
      setEmailSent(true);
      setEmailForm({ fromName: "", replyTo: "", to: "", subject: "", body: "" });
      toast({ title: "Email sent", description: "Your email was delivered successfully." });
      setTimeout(() => setEmailSent(false), 4000);
    },
    onError: (e: any) => {
      toast({ title: "Send failed", description: e.message, variant: "destructive" });
    },
  });

  const statsQueryKey = statsRangeKey === "custom" && statsCustomRange?.from
    ? ["/api/admin/stats", statsRangeKey, statsCustomRange.from?.toISOString(), statsCustomRange.to?.toISOString()]
    : ["/api/admin/stats", statsRangeKey];

  const statsUrl = statsRangeKey === "custom" && statsCustomRange?.from
    ? `/stats?range=custom&from=${statsCustomRange.from.toISOString()}&to=${(statsCustomRange.to ?? statsCustomRange.from).toISOString()}`
    : `/stats?range=${statsRangeKey}`;

  const { data: stats } = useQuery<{ totalUsers: number; totalOrders: number; totalRevenue: number; openTickets: number }>({
    queryKey: statsQueryKey,
    queryFn: () => adminApi.get(statsUrl),
    refetchInterval: false,
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
    salesTrend: { label: string; sales: number; successSales: number }[];
    orderStatus: { name: string; value: number }[];
  }>({
    queryKey: salesQueryKey,
    queryFn: () => adminApi.get(salesUrl),
    staleTime: 60000,
    refetchInterval: false,
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
    refetchInterval: false,
  });

  const placeholderSalesData = salesRangeKey === "today"
    ? Array.from({ length: 24 }, (_, i) => {
        const h = i % 12 === 0 ? 12 : i % 12;
        const ampm = i < 12 ? "AM" : "PM";
        return { label: `${String(h).padStart(2, "0")}:00 ${ampm}`, sales: 0, successSales: 0 };
      })
    : salesRangeKey === "7days" || salesRangeKey === "30days"
    ? Array.from({ length: salesRangeKey === "7days" ? 7 : 10 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (salesRangeKey === "7days" ? 6 : 29) + i);
        return { label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), sales: 0, successSales: 0 };
      })
    : [
        { label: "Jan", sales: 0, successSales: 0 }, { label: "Feb", sales: 0, successSales: 0 }, { label: "Mar", sales: 0, successSales: 0 },
        { label: "Apr", sales: 0, successSales: 0 }, { label: "May", sales: 0, successSales: 0 }, { label: "Jun", sales: 0, successSales: 0 },
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
      label: "New Tickets",
      value: stats ? stats.openTickets.toLocaleString() : "—",
      icon: <LifeBuoy size={18} />,
      color: "hsl(38, 92%, 55%)",
      sub: statsLabel,
      testId: "stat-open-tickets",
    },
    {
      label: "New Users",
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
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="successGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${getCurrencySymbol(currency)}${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", color: "hsl(var(--foreground))", fontSize: "12px" }}
                    formatter={(value: number, name: string) => [`${getCurrencySymbol(currency)}${value.toLocaleString()}`, name === "sales" ? "Total" : "Successful"]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: "10px", paddingTop: "4px" }}
                    formatter={(value) => value === "sales" ? "Total" : "Successful"}
                  />
                  <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#salesGrad)" dot={false} />
                  <Area type="monotone" dataKey="successSales" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fill="url(#successGrad)" dot={false} />
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

        {/* ── Email Composer ─────────────────────────────────────────────── */}
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "14px 20px", borderBottom: "1px solid hsl(var(--border))" }}>
            <Mail size={15} style={{ color: "hsl(var(--primary))", flexShrink: 0 }} />
            <span style={{ fontSize: "13px", fontWeight: 700, color: "hsl(var(--foreground))" }}>Compose Email</span>
            <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginLeft: "4px" }}>Send a message to any recipient via SMTP</span>
          </div>

          <div style={{ padding: "20px", display: "grid", gap: "12px" }}>
            {/* Row 1: From Name */}
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "hsl(var(--muted-foreground))", marginBottom: "5px" }}>From Name</label>
              <input
                type="text"
                value={emailForm.fromName}
                onChange={(e) => setEmailForm((f) => ({ ...f, fromName: e.target.value }))}
                placeholder="e.g. Nexcoin Support"
                data-testid="input-email-from-name"
                style={{ width: "100%", background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "6px", padding: "8px 10px", fontSize: "12px", color: "hsl(var(--foreground))", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {/* Row 2: To + Subject */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "hsl(var(--muted-foreground))", marginBottom: "5px" }}>To <span style={{ color: "hsl(0,72%,60%)" }}>*</span></label>
                <input
                  type="email"
                  value={emailForm.to}
                  onChange={(e) => setEmailForm((f) => ({ ...f, to: e.target.value }))}
                  placeholder="recipient@example.com"
                  data-testid="input-email-to"
                  style={{ width: "100%", background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "6px", padding: "8px 10px", fontSize: "12px", color: "hsl(var(--foreground))", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "hsl(var(--muted-foreground))", marginBottom: "5px" }}>Subject <span style={{ color: "hsl(0,72%,60%)" }}>*</span></label>
                <input
                  type="text"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Email subject line"
                  data-testid="input-email-subject"
                  style={{ width: "100%", background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "6px", padding: "8px 10px", fontSize: "12px", color: "hsl(var(--foreground))", outline: "none", boxSizing: "border-box" }}
                />
              </div>
            </div>

            {/* Optional field toggles */}
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              {!showCC && (
                <button
                  type="button"
                  onClick={() => setShowCC(true)}
                  data-testid="button-add-cc"
                  style={{ background: "none", border: "none", padding: 0, fontSize: "11px", color: "hsl(var(--primary))", cursor: "pointer", fontWeight: 500 }}
                >
                  + Add CC
                </button>
              )}
              {!showReplyTo && (
                <button
                  type="button"
                  onClick={() => setShowReplyTo(true)}
                  data-testid="button-add-reply-to"
                  style={{ background: "none", border: "none", padding: 0, fontSize: "11px", color: "hsl(var(--primary))", cursor: "pointer", fontWeight: 500 }}
                >
                  + Add Reply-To
                </button>
              )}
            </div>

            {/* CC (conditionally shown) */}
            {showCC && (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 600, color: "hsl(var(--muted-foreground))" }}>CC</label>
                    <button type="button" onClick={() => { setShowCC(false); setEmailForm((f) => ({ ...f, cc: "" })); }} style={{ background: "none", border: "none", padding: 0, fontSize: "10px", color: "hsl(var(--muted-foreground))", cursor: "pointer" }}>Remove</button>
                  </div>
                  <input
                    type="email"
                    value={emailForm.cc}
                    onChange={(e) => setEmailForm((f) => ({ ...f, cc: e.target.value }))}
                    placeholder="cc@example.com"
                    data-testid="input-email-cc"
                    style={{ width: "100%", background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "6px", padding: "8px 10px", fontSize: "12px", color: "hsl(var(--foreground))", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>
            )}

            {/* Reply-To (conditionally shown) */}
            {showReplyTo && (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "12px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "5px" }}>
                    <label style={{ fontSize: "11px", fontWeight: 600, color: "hsl(var(--muted-foreground))" }}>Reply-To</label>
                    <button type="button" onClick={() => { setShowReplyTo(false); setEmailForm((f) => ({ ...f, replyTo: "" })); }} style={{ background: "none", border: "none", padding: 0, fontSize: "10px", color: "hsl(var(--muted-foreground))", cursor: "pointer" }}>Remove</button>
                  </div>
                  <input
                    type="email"
                    value={emailForm.replyTo}
                    onChange={(e) => setEmailForm((f) => ({ ...f, replyTo: e.target.value }))}
                    placeholder="replies@yourdomain.com"
                    data-testid="input-email-reply-to"
                    style={{ width: "100%", background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "6px", padding: "8px 10px", fontSize: "12px", color: "hsl(var(--foreground))", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>
            )}

            {/* Body */}
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "hsl(var(--muted-foreground))", marginBottom: "5px" }}>Message <span style={{ color: "hsl(0,72%,60%)" }}>*</span></label>
              <textarea
                value={emailForm.body}
                onChange={(e) => setEmailForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Write your message here..."
                rows={6}
                data-testid="input-email-body"
                style={{ width: "100%", background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "6px", padding: "8px 10px", fontSize: "12px", color: "hsl(var(--foreground))", outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.6 }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              {(emailForm.fromName || emailForm.replyTo || emailForm.cc || emailForm.to || emailForm.subject || emailForm.body) && (
                <button
                  onClick={() => { setEmailForm({ fromName: "", replyTo: "", cc: "", to: "", subject: "", body: "" }); setShowReplyTo(false); setShowCC(false); }}
                  data-testid="button-clear-email"
                  style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 12px", background: "transparent", color: "hsl(var(--muted-foreground))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px", cursor: "pointer" }}
                >
                  <X size={12} />
                  Clear
                </button>
              )}
              {emailSent && (
                <span style={{ fontSize: "12px", color: "hsl(142,71%,45%)", fontWeight: 500 }}>Email sent successfully!</span>
              )}
              <button
                onClick={() => sendEmailMutation.mutate(emailForm)}
                disabled={sendEmailMutation.isPending || !emailForm.to || !emailForm.subject || !emailForm.body}
                data-testid="button-send-email"
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))", border: "none", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: sendEmailMutation.isPending || !emailForm.to || !emailForm.subject || !emailForm.body ? "not-allowed" : "pointer", opacity: sendEmailMutation.isPending || !emailForm.to || !emailForm.subject || !emailForm.body ? 0.55 : 1, transition: "opacity 0.15s", marginLeft: "auto" }}
              >
                {sendEmailMutation.isPending ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <Send size={13} />}
                {sendEmailMutation.isPending ? "Sending…" : "Send Email"}
              </button>
            </div>
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}

