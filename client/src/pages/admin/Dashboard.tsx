import AdminLayout from "@/components/admin/AdminLayout";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { DollarSign, ShoppingBag, CheckCircle, RotateCcw } from "lucide-react";

const salesData = [
  { month: "Jan", sales: 4200 },
  { month: "Feb", sales: 5800 },
  { month: "Mar", sales: 4900 },
  { month: "Apr", sales: 7200 },
  { month: "May", sales: 6100 },
  { month: "Jun", sales: 8400 },
  { month: "Jul", sales: 9100 },
  { month: "Aug", sales: 7800 },
  { month: "Sep", sales: 10200 },
  { month: "Oct", sales: 9500 },
  { month: "Nov", sales: 11400 },
  { month: "Dec", sales: 13200 },
];

const orderStatusData = [
  { name: "Successful", value: 68 },
  { name: "Refunded", value: 12 },
  { name: "Unsuccessful", value: 20 },
];

const COLORS = ["hsl(258, 90%, 66%)", "hsl(196, 100%, 50%)", "hsl(220, 15%, 30%)"];

const statCards = [
  {
    label: "Total Sales",
    value: "$128,420",
    icon: <DollarSign size={17} />,
    color: "hsl(258, 90%, 66%)",
    sub: "+12.4% this month",
    testId: "stat-total-sales",
  },
  {
    label: "Total Orders",
    value: "3,842",
    icon: <ShoppingBag size={17} />,
    color: "hsl(196, 100%, 50%)",
    sub: "+8.1% this month",
    testId: "stat-total-orders",
  },
  {
    label: "Successful Orders",
    value: "2,612",
    icon: <CheckCircle size={17} />,
    color: "hsl(142, 71%, 45%)",
    sub: "68% success rate",
    testId: "stat-successful-orders",
  },
  {
    label: "Refund Orders",
    value: "461",
    icon: <RotateCcw size={17} />,
    color: "hsl(0, 72%, 51%)",
    sub: "12% refund rate",
    testId: "stat-refund-orders",
  },
];

const card: React.CSSProperties = {
  background: "hsl(220, 20%, 9%)",
  border: "1px solid hsl(220, 15%, 13%)",
  borderRadius: "8px",
  padding: "20px",
};

export default function Dashboard() {
  return (
    <AdminLayout title="Dashboard">
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          {statCards.map((sc) => (
            <div key={sc.label} data-testid={sc.testId} style={card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", color: "hsl(220, 10%, 50%)" }}>{sc.label}</span>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "6px",
                    background: `${sc.color}20`,
                    color: sc.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {sc.icon}
                </div>
              </div>
              <div style={{ fontSize: "22px", fontWeight: 700, color: "hsl(210, 40%, 95%)", marginBottom: "4px" }}>{sc.value}</div>
              <div style={{ fontSize: "11px", color: "hsl(220, 10%, 42%)" }}>{sc.sub}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "16px" }}>
          <div style={{ ...card, padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)" }}>Sales Trend</span>
              <span style={{ fontSize: "11px", color: "hsl(220, 10%, 42%)" }}>2024 — Monthly Revenue</span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={salesData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(258, 90%, 66%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(258, 90%, 66%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 13%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(220, 10%, 42%)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(220, 10%, 42%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(220, 20%, 10%)", border: "1px solid hsl(220, 15%, 18%)", borderRadius: "6px", color: "hsl(210, 40%, 95%)", fontSize: "12px" }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, "Sales"]}
                />
                <Area type="monotone" dataKey="sales" stroke="hsl(258, 90%, 66%)" strokeWidth={2} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ ...card, padding: "20px" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(210, 40%, 95%)", marginBottom: "8px" }}>Order Status</div>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={orderStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                  {orderStatusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "hsl(220, 20%, 10%)", border: "1px solid hsl(220, 15%, 18%)", borderRadius: "6px", color: "hsl(210, 40%, 95%)", fontSize: "12px" }}
                  formatter={(value: number) => [`${value}%`, ""]}
                />
                <Legend iconType="circle" iconSize={8} formatter={(value) => <span style={{ fontSize: "11px", color: "hsl(220, 10%, 52%)" }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {orderStatusData.map((item, i) => (
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
