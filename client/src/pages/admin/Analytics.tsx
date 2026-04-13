import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { Users, Eye, Clock, TrendingDown, Wifi, Info } from "lucide-react";

// ─── Styles ──────────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(220,15%,13%)",
  borderRadius: "10px",
  padding: "20px",
};

const COLORS = [
  "hsl(258,90%,70%)",
  "hsl(196,100%,50%)",
  "hsl(142,71%,45%)",
  "hsl(38,92%,55%)",
  "hsl(0,72%,55%)",
];

const RANGE_OPTIONS = [
  { key: "7days", label: "7 days" },
  { key: "30days", label: "30 days" },
  { key: "90days", label: "90 days" },
];

const tooltipStyle = {
  contentStyle: {
    background: "hsl(var(--card))", border: "1px solid hsl(220,15%,15%)",
    borderRadius: "8px", fontSize: "12px", color: "hsl(var(--foreground))",
  },
};

// ─── Info Definitions ────────────────────────────────────────────────────────
const INFO: Record<string, { title: string; desc: string; formula?: string }> = {
  pageViews: {
    title: "Page Views",
    desc: "Total number of individual pages loaded by visitors in the selected period. Each navigation to a new page counts as one view.",
    formula: "Count of all tracked page loads",
  },
  sessions: {
    title: "Unique Sessions",
    desc: "Number of distinct browsing sessions. A session starts when a visitor opens the site and ends when they close the tab or are inactive. One person visiting multiple pages = one session.",
    formula: "COUNT(DISTINCT session_id)",
  },
  bounceRate: {
    title: "Bounce Rate",
    desc: "Percentage of sessions where the visitor viewed only one page before leaving. A high bounce rate can indicate the landing page isn't relevant or engaging enough.",
    formula: "Single-page sessions ÷ Total sessions × 100",
  },
  avgDuration: {
    title: "Avg Engagement Time",
    desc: "Average time visitors actively spend on your pages. Measured from when the page loads to when they navigate away or close the tab.",
    formula: "Total time on pages ÷ Number of page views with recorded duration",
  },
  activeNow: {
    title: "Active Now",
    desc: "Number of unique sessions that have recorded activity in the last 5 minutes. Gives a real-time snapshot of who is currently on your site.",
    formula: "Distinct sessions with events in the last 5 minutes",
  },
  liveTraffic: {
    title: "Live Traffic",
    desc: "Page views plotted by hour over the last 24 hours. Helps you identify peak traffic hours and see how traffic changes throughout the day.",
    formula: "COUNT(page views) grouped by hour",
  },
  trafficSources: {
    title: "Traffic Sources",
    desc: "Where your visitors come from, classified by the referring URL.\n• Direct — no referrer (typed URL, bookmark, or app)\n• Organic — search engines (Google, Bing)\n• Social — social media platforms\n• Referral — other websites",
    formula: "Classified from the HTTP Referer header on first page of session",
  },
  engagementTime: {
    title: "Engagement Time",
    desc: "Average seconds visitors spend per page, grouped by day. Higher values mean visitors are reading and interacting more with your content.",
    formula: "AVG(duration_ms) per day ÷ 1000",
  },
  bounceByDay: {
    title: "Bounce Rate Trend",
    desc: "How your bounce rate changes day by day. A downward trend is positive — it means more visitors are exploring multiple pages per visit.",
    formula: "Bounced sessions ÷ Total sessions per day × 100",
  },
  topPages: {
    title: "Navigation Paths",
    desc: "The most visited pages ranked by view count. The bar shows each page's traffic relative to the top page. Useful for understanding which content drives the most interest.",
    formula: "COUNT(page views) grouped by path, top 8",
  },
  devices: {
    title: "Device Breakdown",
    desc: "The split of visitors across device types. Detected from the User-Agent header sent by the browser.\n• Desktop — PCs and laptops\n• Mobile — phones\n• Tablet — tablets and iPads",
    formula: "User-Agent classification on page load",
  },
  siteSpeed: {
    title: "Site Speed",
    desc: "Indicative server-side response times based on observed API performance. Full page-load speed depends on CDN, assets, and the visitor's network — check browser DevTools Network tab for accurate load times.",
    formula: "Express middleware request timing (logged server-side)",
  },
};

// ─── InfoPopover ─────────────────────────────────────────────────────────────
function InfoPopover({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const info = INFO[id];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!info) return null;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        onClick={() => setOpen(v => !v)}
        title="More info"
        style={{
          background: "none", border: "none", cursor: "pointer", padding: "2px",
          color: open ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
          display: "flex", alignItems: "center",
          transition: "color 0.15s",
        }}
      >
        <Info size={14} />
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50,
          width: 280, background: "hsl(var(--card))",
          border: "1px solid hsl(220,15%,18%)",
          borderRadius: "10px", boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
          padding: "14px 16px",
        }}>
          {/* Arrow */}
          <div style={{
            position: "absolute", top: -6, right: 10,
            width: 12, height: 12, background: "hsl(var(--card))",
            border: "1px solid hsl(220,15%,18%)", borderBottom: "none", borderRight: "none",
            transform: "rotate(45deg)",
          }} />
          <div style={{ fontSize: "13px", fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 8 }}>
            {info.title}
          </div>
          <div style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", lineHeight: 1.65, whiteSpace: "pre-line" }}>
            {info.desc}
          </div>
          {info.formula && (
            <div style={{
              marginTop: 10, padding: "7px 10px",
              background: "hsl(220,15%,10%)", borderRadius: "6px",
              fontSize: "11px", fontFamily: "monospace",
              color: "hsl(var(--primary))", lineHeight: 1.5,
            }}>
              {info.formula}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, infoId }: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; color?: string; infoId: string;
}) {
  return (
    <div style={{ ...card, display: "flex", alignItems: "center", gap: "14px", position: "relative" }}>
      <div style={{
        width: 42, height: 42, borderRadius: "10px", flexShrink: 0,
        background: color ? `${color}22` : "hsl(var(--primary) / 0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: color ?? "hsl(var(--primary))",
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", color: "hsl(var(--muted-foreground))", marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: "22px", fontWeight: 700, color: "hsl(var(--foreground))", lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ position: "absolute", top: 12, right: 12 }}>
        <InfoPopover id={infoId} />
      </div>
    </div>
  );
}

// ─── ChartCard ───────────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, infoId, children }: {
  title: string; subtitle?: string; infoId: string; children: React.ReactNode;
}) {
  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "hsl(var(--foreground))" }}>{title}</div>
          {subtitle && <div style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", marginTop: 2 }}>{subtitle}</div>}
        </div>
        <InfoPopover id={infoId} />
      </div>
      {children}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyChart({ message = "No data yet — data appears as visitors browse your site." }: { message?: string }) {
  return (
    <div style={{
      height: 180, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", color: "hsl(var(--muted-foreground))", gap: 8,
    }}>
      <div style={{ fontSize: "28px", opacity: 0.3 }}>📊</div>
      <div style={{ fontSize: "12px", textAlign: "center", maxWidth: 240 }}>{message}</div>
    </div>
  );
}

function fmtTime(sec: number) {
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const [range, setRange] = useState("30days");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/analytics/site", range],
    queryFn: () => adminApi.get(`/analytics/site?range=${range}`),
    refetchInterval: 30000,
  });

  const totalViews: number = data?.totalViews ?? 0;
  const uniqueSessions: number = data?.uniqueSessions ?? 0;
  const bounceRate: number = data?.bounceRate ?? 0;
  const avgDuration: number = data?.avgDurationSec ?? 0;
  const activeNow: number = data?.activeNow ?? 0;
  const liveTraffic: any[] = data?.liveTraffic ?? [];
  const trafficSources: any[] = data?.trafficSources ?? [];
  const topPages: any[] = data?.topPages ?? [];
  const devices: any[] = data?.devices ?? [];
  const engagementByDay: any[] = data?.engagementByDay ?? [];
  const bounceByDay: any[] = data?.bounceByDay ?? [];

  const hasData = totalViews > 0;

  return (
    <AdminLayout title="Analytics">
      {/* Range selector + live indicator */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, alignItems: "center" }}>
        {RANGE_OPTIONS.map(o => (
          <button key={o.key} onClick={() => setRange(o.key)} style={{
            padding: "6px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
            cursor: "pointer", border: "1px solid",
            background: range === o.key ? "hsl(var(--primary))" : "transparent",
            borderColor: range === o.key ? "hsl(var(--primary))" : "hsl(220,15%,20%)",
            color: range === o.key ? "white" : "hsl(var(--muted-foreground))",
          }}>{o.label}</button>
        ))}
        <div style={{
          marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
          fontSize: "12px",
          color: activeNow > 0 ? "hsl(142,71%,45%)" : "hsl(var(--muted-foreground))",
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%", display: "inline-block",
            background: activeNow > 0 ? "hsl(142,71%,45%)" : "hsl(220,15%,30%)",
            boxShadow: activeNow > 0 ? "0 0 6px hsl(142,71%,45%)" : "none",
          }} />
          {isLoading ? "Loading…" : activeNow > 0 ? `${activeNow} active now` : "No active visitors"}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, marginBottom: 22 }}>
        <StatCard infoId="pageViews" icon={<Eye size={18} />} label="Page Views" value={totalViews.toLocaleString()} />
        <StatCard infoId="sessions" icon={<Users size={18} />} label="Unique Sessions" value={uniqueSessions.toLocaleString()} />
        <StatCard infoId="bounceRate" icon={<TrendingDown size={18} />} label="Bounce Rate" value={`${bounceRate}%`}
          color={bounceRate > 60 ? "hsl(0,72%,55%)" : bounceRate > 40 ? "hsl(38,92%,55%)" : "hsl(142,71%,45%)"} />
        <StatCard infoId="avgDuration" icon={<Clock size={18} />} label="Avg Engagement" value={fmtTime(avgDuration)} />
        <StatCard infoId="activeNow" icon={<Wifi size={18} />} label="Active Now" value={activeNow}
          color={activeNow > 0 ? "hsl(142,71%,45%)" : undefined} />
      </div>

      {/* Row 1: Live Traffic + Traffic Sources */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 14, marginBottom: 14 }}>
        <ChartCard title="Live Traffic" subtitle="Page views per hour over the last 24 hours" infoId="liveTraffic">
          {!hasData ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={liveTraffic}>
                <defs>
                  <linearGradient id="cgLive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(258,90%,70%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(258,90%,70%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,12%)" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Area type="monotone" dataKey="views" stroke="hsl(258,90%,70%)" fill="url(#cgLive)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Traffic Sources" subtitle="Where visitors come from" infoId="trafficSources">
          {!hasData || trafficSources.every(s => s.value === 0) ? <EmptyChart /> : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={trafficSources} cx="50%" cy="50%" innerRadius={42} outerRadius={65}
                    dataKey="value" paddingAngle={3}>
                    {trafficSources.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", justifyContent: "center", marginTop: 8 }}>
                {trafficSources.map((s, i) => (
                  <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "11px" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ color: "hsl(var(--muted-foreground))" }}>{s.name}</span>
                    <span style={{ color: "hsl(var(--foreground))", fontWeight: 600 }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>
      </div>

      {/* Row 2: Engagement + Bounce Rate */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        <ChartCard title="Engagement Time" subtitle="Average seconds per page by day" infoId="engagementTime">
          {engagementByDay.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={engagementByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,12%)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} unit="s" />
                <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v}s`, "Avg time"]} />
                <Bar dataKey="avgSec" fill="hsl(196,100%,50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Bounce Rate" subtitle="% of single-page sessions by day" infoId="bounceByDay">
          {bounceByDay.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={bounceByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,12%)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} unit="%" domain={[0, 100]} />
                <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v}%`, "Bounce rate"]} />
                <Line type="monotone" dataKey="rate" stroke="hsl(0,72%,55%)" strokeWidth={2}
                  dot={{ r: 3, fill: "hsl(0,72%,55%)" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Row 3: Top Pages + Device + Site Speed */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 14 }}>
        <ChartCard title="Navigation Paths" subtitle="Most visited pages in selected period" infoId="topPages">
          {topPages.length === 0 ? <EmptyChart /> : (
            <div>
              {topPages.map((p, i) => {
                const pct = topPages[0].views > 0 ? Math.round((p.views / topPages[0].views) * 100) : 0;
                return (
                  <div key={p.path} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "7px 0",
                    borderBottom: i < topPages.length - 1 ? "1px solid hsl(220,15%,10%)" : "none",
                  }}>
                    <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", width: 18, textAlign: "right", flexShrink: 0 }}>
                      {i + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{
                          fontSize: "12px", color: "hsl(var(--foreground))", fontFamily: "monospace",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "72%",
                        }}>{p.path}</span>
                        <span style={{ fontSize: "12px", fontWeight: 600, color: "hsl(var(--foreground))" }}>{p.views}</span>
                      </div>
                      <div style={{ height: 4, background: "hsl(220,15%,12%)", borderRadius: 2 }}>
                        <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: `hsl(${258 - i * 18},80%,65%)` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <ChartCard title="Devices" subtitle="Visitor device types" infoId="devices">
            {!hasData || devices.every(d => d.value === 0) ? <EmptyChart message="No device data yet." /> : (
              <>
                <ResponsiveContainer width="100%" height={110}>
                  <PieChart>
                    <Pie data={devices} cx="50%" cy="50%" outerRadius={48} dataKey="value" paddingAngle={2}>
                      {devices.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
                  {devices.map((d, i) => (
                    <div key={d.name} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6, color: "hsl(var(--muted-foreground))", textTransform: "capitalize" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                        {d.name}
                      </span>
                      <span style={{ fontWeight: 600, color: "hsl(var(--foreground))" }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </ChartCard>

          {/* Site Speed */}
          <div style={{ ...card, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: "14px", fontWeight: 600, color: "hsl(var(--foreground))" }}>Site Speed</div>
              <InfoPopover id="siteSpeed" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {[
                { label: "API response", value: "~5–20ms", color: "hsl(142,71%,45%)" },
                { label: "DB queries", value: "~2–10ms", color: "hsl(142,71%,45%)" },
                { label: "Page load", value: "CDN-dependent", color: "hsl(38,92%,55%)" },
              ].map((s, i, arr) => (
                <div key={s.label} style={{
                  display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "12px",
                  borderBottom: i < arr.length - 1 ? "1px solid hsl(220,15%,10%)" : "none",
                }}>
                  <span style={{ color: "hsl(var(--muted-foreground))" }}>{s.label}</span>
                  <span style={{ fontWeight: 600, color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginTop: 12, lineHeight: 1.6 }}>
              Check browser DevTools → Network for real page-load times.
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
