import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout, { useMobile } from "@/components/admin/AdminLayout";
import { adminApi } from "@/lib/store/useAdmin";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { Users, Eye, Clock, TrendingDown, Wifi, Info, ExternalLink, CheckCircle, AlertCircle, Loader2, Save } from "lucide-react";
import { SiGoogle } from "react-icons/si";

// ─── Styles ──────────────────────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(220,15%,13%)",
  borderRadius: "10px",
  padding: "16px",
};

const COLORS = [
  "hsl(var(--primary))",
  "hsl(196,100%,50%)",
  "hsl(142,71%,45%)",
  "hsl(38,92%,55%)",
  "hsl(0,72%,55%)",
];

const RANGE_OPTIONS = [
  { key: "7days", label: "7d" },
  { key: "30days", label: "30d" },
  { key: "90days", label: "90d" },
];

const tooltipStyle = {
  contentStyle: {
    background: "hsl(var(--card))", border: "1px solid hsl(220,15%,15%)",
    borderRadius: "8px", fontSize: "11px", color: "hsl(var(--foreground))",
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
    title: "Unique Visitors",
    desc: "Number of distinct visitors tracked by unique session ID. Each browser session (tab lifetime) counts as one visitor.",
    formula: "COUNT(DISTINCT session_id)",
  },
  bounceRate: {
    title: "Bounce Rate",
    desc: "Percentage of sessions where the visitor viewed only one page before leaving. A high bounce rate can indicate the landing page isn't relevant.",
    formula: "Single-page sessions ÷ Total sessions × 100",
  },
  avgDuration: {
    title: "Avg Engagement Time",
    desc: "Average time visitors actively spend on your pages. Measured from when the page loads to when they navigate away.",
    formula: "Total time on pages ÷ Page views with recorded duration",
  },
  activeNow: {
    title: "Active Now",
    desc: "Unique sessions that have recorded activity in the last 5 minutes.",
    formula: "Distinct sessions with events in the last 5 minutes",
  },
  liveTraffic: {
    title: "Live Traffic",
    desc: "Page views plotted by hour over the last 24 hours. Helps identify peak traffic hours.",
    formula: "COUNT(page views) grouped by hour",
  },
  trafficSources: {
    title: "Traffic Sources",
    desc: "Where visitors come from: Direct (no referrer), Organic (search), Social (social media), Referral (other sites).",
    formula: "Classified from HTTP Referer on first page of session",
  },
  engagementTime: {
    title: "Engagement Time",
    desc: "Average seconds visitors spend per page, grouped by day.",
    formula: "AVG(duration_ms) per day ÷ 1000",
  },
  bounceByDay: {
    title: "Bounce Rate Trend",
    desc: "How your bounce rate changes day by day. A downward trend means more visitors explore multiple pages.",
    formula: "Bounced sessions ÷ Total sessions per day × 100",
  },
  topPages: {
    title: "Navigation Paths",
    desc: "The most visited pages ranked by view count. Useful for understanding which content drives the most interest.",
    formula: "COUNT(page views) grouped by path, top 8",
  },
  devices: {
    title: "Device Breakdown",
    desc: "Split of visitors across device types — Desktop, Mobile, and Tablet — detected from the User-Agent header.",
    formula: "User-Agent classification on page load",
  },
  siteSpeed: {
    title: "Site Speed",
    desc: "Indicative server-side response times. Check browser DevTools → Network for real page-load times.",
    formula: "Express middleware request timing (server-side)",
  },
};

// ─── InfoPopover ─────────────────────────────────────────────────────────────
function InfoPopover({ id }: { id: string; alignLeft?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const info = INFO[id];

  const POPOVER_W = 270;

  const recalc = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const gap = 8;
    // start aligned to right edge of button, clamped so it doesn't overflow viewport
    let left = r.right - POPOVER_W;
    left = Math.max(8, Math.min(left, vw - POPOVER_W - 8));
    setPos({ top: r.bottom + gap, left });
  };

  useEffect(() => {
    if (!open) return;
    recalc();
    const close = (e: MouseEvent) => {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        popRef.current && !popRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
    };
  }, [open]);

  if (!info) return null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        aria-label="More info"
        style={{
          background: "none", border: "none", cursor: "pointer", padding: "2px",
          color: open ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
          display: "inline-flex", alignItems: "center", flexShrink: 0,
          transition: "color 0.15s",
        }}
      >
        <Info size={14} />
      </button>

      {open && pos && (
        <div
          ref={popRef}
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
            width: POPOVER_W,
            maxWidth: "calc(100vw - 16px)",
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "10px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            padding: "14px 16px",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: 6 }}>
            {info.title}
          </div>
          <div style={{ fontSize: "12px", color: "hsl(var(--muted-foreground))", lineHeight: 1.65, whiteSpace: "pre-line" }}>
            {info.desc}
          </div>
          {info.formula && (
            <div style={{
              marginTop: 10, padding: "7px 10px",
              background: "hsl(var(--muted))", borderRadius: "6px",
              fontSize: "11px", fontFamily: "monospace",
              color: "hsl(var(--foreground))", lineHeight: 1.5,
            }}>
              {info.formula}
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, infoId }: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; color?: string; infoId: string;
}) {
  return (
    <div style={{ ...card, display: "flex", alignItems: "center", gap: "12px", position: "relative" }}>
      <div style={{
        width: 38, height: 38, borderRadius: "9px", flexShrink: 0,
        background: color ? `${color}22` : "hsl(var(--primary) / 0.12)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: color ?? "hsl(var(--primary))",
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: "18px", fontWeight: 700, color: "hsl(var(--foreground))", lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))", marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ flexShrink: 0 }}>
        <InfoPopover id={infoId} />
      </div>
    </div>
  );
}

// ─── ChartCard ───────────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, infoId, alignInfoLeft, children }: {
  title: string; subtitle?: string; infoId: string; alignInfoLeft?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(var(--foreground))" }}>{title}</div>
          {subtitle && <div style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginTop: 2 }}>{subtitle}</div>}
        </div>
        <InfoPopover id={infoId} alignLeft={alignInfoLeft} />
      </div>
      {children}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyChart({ message = "No data yet — share your site link and visitor data will appear here as people browse." }: { message?: string }) {
  return (
    <div style={{
      height: 140, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", color: "hsl(var(--muted-foreground))", gap: 8,
    }}>
      <BarChart2Icon />
      <div style={{ fontSize: "11px", textAlign: "center", maxWidth: 220, lineHeight: 1.6 }}>{message}</div>
    </div>
  );
}

function BarChart2Icon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

function fmtTime(sec: number) {
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

// ─── Google Analytics Panel ───────────────────────────────────────────────────
function GoogleAnalyticsPanel() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["/api/admin/settings"],
    queryFn: () => adminApi.get("/settings"),
  });

  const measurementId = settings?.ga_measurement_id ?? "";
  const displayId = draft !== null ? draft : measurementId;
  const isConnected = !!measurementId.trim();

  const saveMutation = useMutation({
    mutationFn: () =>
      adminApi.put("/settings", { ga_measurement_id: (draft ?? "").trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      qc.invalidateQueries({ queryKey: ["/api/site-settings"] });
      setDraft(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const isDirty = draft !== null && draft.trim() !== measurementId.trim();

  return (
    <div style={{
      ...card,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      marginBottom: 16,
      border: isConnected ? "1px solid hsl(142,71%,45% / 0.3)" : "1px solid hsl(220,15%,13%)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: "8px", flexShrink: 0,
          background: "hsl(0,84%,60% / 0.12)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "hsl(0,84%,60%)",
        }}>
          <SiGoogle size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(var(--foreground))" }}>Google Analytics 4</div>
          <div style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginTop: 1 }}>
            Enter your Measurement ID to enable GA4 tracking on your storefront
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "11px", flexShrink: 0 }}>
          {isConnected
            ? <><CheckCircle size={13} style={{ color: "hsl(142,71%,45%)" }} /><span style={{ color: "hsl(142,71%,45%)" }}>Connected</span></>
            : <><AlertCircle size={13} style={{ color: "hsl(var(--muted-foreground))" }} /><span style={{ color: "hsl(var(--muted-foreground))" }}>Not configured</span></>}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={displayId}
          onChange={e => setDraft(e.target.value)}
          placeholder="G-XXXXXXXXXX"
          spellCheck={false}
          style={{
            flex: 1, minWidth: 160, padding: "7px 10px",
            background: "hsl(var(--background))",
            border: `1px solid ${isDirty ? "hsl(var(--primary) / 0.5)" : "hsl(var(--border))"}`,
            borderRadius: "6px", color: "hsl(var(--foreground))",
            fontSize: "13px", outline: "none", fontFamily: "monospace",
          }}
          data-testid="input-ga-measurement-id"
        />
        <button
          disabled={!isDirty || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "7px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
            cursor: !isDirty || saveMutation.isPending ? "not-allowed" : "pointer",
            background: "hsl(var(--primary))", color: "white", border: "none",
            opacity: !isDirty || saveMutation.isPending ? 0.6 : 1,
            transition: "opacity 0.15s",
          }}
          data-testid="button-save-ga-id"
        >
          {saveMutation.isPending
            ? <><Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> Saving...</>
            : saved
            ? <><CheckCircle size={12} /> Saved</>
            : <><Save size={12} /> Save</>}
        </button>
        {isConnected && (
          <a
            href={`https://analytics.google.com/analytics/web/#/p${measurementId.replace("G-", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              padding: "7px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600,
              color: "hsl(var(--primary))", textDecoration: "none",
              border: "1px solid hsl(var(--primary) / 0.3)",
              background: "hsl(var(--primary) / 0.08)",
            }}
          >
            Open GA Dashboard <ExternalLink size={11} />
          </a>
        )}
      </div>

      {isConnected && (
        <div style={{
          fontSize: "11px", color: "hsl(var(--muted-foreground))",
          padding: "8px 10px", borderRadius: "6px",
          background: "hsl(var(--primary) / 0.05)",
          border: "1px solid hsl(var(--primary) / 0.1)",
          lineHeight: 1.6,
        }}>
          GA4 tracking is active. Page views are sent to Google Analytics on every storefront navigation.
          Real-time visitor data appears in your{" "}
          <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" style={{ color: "hsl(var(--primary))" }}>
            GA dashboard
          </a>{" "}
          immediately. Historical reports take 24–48 hours to populate.
        </div>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const [range, setRange] = useState("30days");
  const isMobile = useMobile(768);

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
  const chartH = isMobile ? 170 : 200;
  const pieH = isMobile ? 120 : 150;

  return (
    <AdminLayout title="Analytics">
      {/* Google Analytics Settings */}
      <GoogleAnalyticsPanel />

      {/* Range selector + live indicator */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {RANGE_OPTIONS.map(o => (
            <button key={o.key} onClick={() => setRange(o.key)} style={{
              padding: isMobile ? "5px 11px" : "6px 14px",
              borderRadius: "6px", fontSize: "12px", fontWeight: 600,
              cursor: "pointer", border: "1px solid",
              background: range === o.key ? "hsl(var(--primary))" : "transparent",
              borderColor: range === o.key ? "hsl(var(--primary))" : "hsl(220,15%,20%)",
              color: range === o.key ? "white" : "hsl(var(--muted-foreground))",
            }}>{o.label}</button>
          ))}
        </div>
        <div style={{
          marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
          fontSize: "11px",
          color: activeNow > 0 ? "hsl(142,71%,45%)" : "hsl(var(--muted-foreground))",
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%", display: "inline-block",
            background: activeNow > 0 ? "hsl(142,71%,45%)" : "hsl(220,15%,30%)",
            boxShadow: activeNow > 0 ? "0 0 6px hsl(142,71%,45%)" : "none",
          }} />
          {isLoading ? "Loading…" : activeNow > 0 ? `${activeNow} active` : "No active visitors"}
        </div>
      </div>

      {/* Stat cards — 2 cols on mobile, auto-fit on desktop */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fit, minmax(170px, 1fr))",
        gap: 10, marginBottom: 16,
      }}>
        <StatCard infoId="pageViews" icon={<Eye size={16} />} label="Page Views" value={totalViews.toLocaleString()} />
        <StatCard infoId="sessions" icon={<Users size={16} />} label="Visitors" value={uniqueSessions.toLocaleString()} />
        <StatCard infoId="bounceRate" icon={<TrendingDown size={16} />} label="Bounce Rate" value={`${bounceRate}%`}
          color={bounceRate > 60 ? "hsl(0,72%,55%)" : bounceRate > 40 ? "hsl(38,92%,55%)" : "hsl(142,71%,45%)"} />
        <StatCard infoId="avgDuration" icon={<Clock size={16} />} label="Avg Engage" value={fmtTime(avgDuration)} />
        <StatCard infoId="activeNow" icon={<Wifi size={16} />} label="Active Now" value={activeNow}
          color={activeNow > 0 ? "hsl(142,71%,45%)" : undefined} />
      </div>

      {/* Row 1: Live Traffic (full width) + Traffic Sources */}
      {isMobile ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
          {/* Live Traffic – full width */}
          <ChartCard title="Live Traffic" subtitle="Page views per hour (last 24h)" infoId="liveTraffic">
            {!hasData ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={chartH}>
                <AreaChart data={liveTraffic}>
                  <defs>
                    <linearGradient id="cgLive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,12%)" />
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval={5} />
                  <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} width={24} />
                  <Tooltip {...tooltipStyle} />
                  <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="url(#cgLive)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Traffic Sources – compact horizontal pie */}
          <ChartCard title="Traffic Sources" subtitle="Where visitors come from" infoId="trafficSources">
            {!hasData || trafficSources.every(s => s.value === 0) ? <EmptyChart /> : (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <PieChart width={110} height={110}>
                  <Pie data={trafficSources} cx="50%" cy="50%" innerRadius={32} outerRadius={50}
                    dataKey="value" paddingAngle={3}>
                    {trafficSources.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
                  {trafficSources.map((s, i) => (
                    <div key={s.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 5, color: "hsl(var(--muted-foreground))" }}>
                        <span style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                        {s.name}
                      </span>
                      <span style={{ color: "hsl(var(--foreground))", fontWeight: 600 }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartCard>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 12, marginBottom: 12 }}>
          <ChartCard title="Live Traffic" subtitle="Page views per hour over the last 24 hours" infoId="liveTraffic">
            {!hasData ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height={chartH}>
                <AreaChart data={liveTraffic}>
                  <defs>
                    <linearGradient id="cgLive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,12%)" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} interval={3} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="url(#cgLive)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Traffic Sources" subtitle="Where visitors come from" infoId="trafficSources">
            {!hasData || trafficSources.every(s => s.value === 0) ? <EmptyChart /> : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={trafficSources} cx="50%" cy="50%" innerRadius={38} outerRadius={58}
                      dataKey="value" paddingAngle={3}>
                      {trafficSources.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 12px", justifyContent: "center", marginTop: 6 }}>
                  {trafficSources.map((s, i) => (
                    <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "11px" }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                      <span style={{ color: "hsl(var(--muted-foreground))" }}>{s.name}</span>
                      <span style={{ color: "hsl(var(--foreground))", fontWeight: 600 }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </ChartCard>
        </div>
      )}

      {/* Row 2: Engagement + Bounce Rate */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: 10, marginBottom: 10,
      }}>
        <ChartCard title="Engagement Time" subtitle="Avg seconds per page by day" infoId="engagementTime">
          {engagementByDay.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={chartH}>
              <BarChart data={engagementByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,12%)" />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} unit="s" width={28} />
                <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v}s`, "Avg time"]} />
                <Bar dataKey="avgSec" fill="hsl(196,100%,50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Bounce Rate" subtitle="% single-page sessions by day" infoId="bounceByDay">
          {bounceByDay.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={chartH}>
              <LineChart data={bounceByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,15%,12%)" />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} unit="%" domain={[0, 100]} width={28} />
                <Tooltip {...tooltipStyle} formatter={(v: any) => [`${v}%`, "Bounce rate"]} />
                <Line type="monotone" dataKey="rate" stroke="hsl(0,72%,55%)" strokeWidth={2}
                  dot={{ r: 3, fill: "hsl(0,72%,55%)" }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Row 3: Top Pages + (Device + Site Speed) */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 260px",
        gap: 10,
      }}>
        <ChartCard title="Navigation Paths" subtitle="Most visited pages in selected period" infoId="topPages" alignInfoLeft>
          {topPages.length === 0 ? <EmptyChart /> : (
            <div>
              {topPages.map((p, i) => {
                const pct = topPages[0].views > 0 ? Math.round((p.views / topPages[0].views) * 100) : 0;
                return (
                  <div key={p.path} style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
                    borderBottom: i < topPages.length - 1 ? "1px solid hsl(220,15%,10%)" : "none",
                  }}>
                    <span style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))", width: 16, textAlign: "right", flexShrink: 0 }}>
                      {i + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{
                          fontSize: "11px", color: "hsl(var(--foreground))", fontFamily: "monospace",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          maxWidth: isMobile ? "65%" : "72%",
                        }}>{p.path}</span>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: "hsl(var(--foreground))" }}>{p.views}</span>
                      </div>
                      <div style={{ height: 3, background: "hsl(220,15%,12%)", borderRadius: 2 }}>
                        <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: `hsl(${258 - i * 18},80%,65%)` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Devices */}
          <ChartCard title="Devices" subtitle="Visitor device types" infoId="devices">
            {!hasData || devices.every(d => d.value === 0) ? <EmptyChart message="No device data yet." /> : (
              isMobile ? (
                /* On mobile: horizontal layout */
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <PieChart width={90} height={90}>
                    <Pie data={devices} cx="50%" cy="50%" outerRadius={40} dataKey="value" paddingAngle={2}>
                      {devices.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    {devices.map((d, i) => (
                      <div key={d.name} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 5, color: "hsl(var(--muted-foreground))", textTransform: "capitalize" }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                          {d.name}
                        </span>
                        <span style={{ fontWeight: 600, color: "hsl(var(--foreground))" }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={pieH}>
                    <PieChart>
                      <Pie data={devices} cx="50%" cy="50%" outerRadius={48} dataKey="value" paddingAngle={2}>
                        {devices.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip {...tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
                    {devices.map((d, i) => (
                      <div key={d.name} style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 5, color: "hsl(var(--muted-foreground))", textTransform: "capitalize" }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: COLORS[i % COLORS.length] }} />
                          {d.name}
                        </span>
                        <span style={{ fontWeight: 600, color: "hsl(var(--foreground))" }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )
            )}
          </ChartCard>

          {/* Site Speed */}
          <div style={card}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "hsl(var(--foreground))" }}>Site Speed</div>
              <InfoPopover id="siteSpeed" />
            </div>
            {[
              { label: "API response", value: "~5–20ms", color: "hsl(142,71%,45%)" },
              { label: "DB queries", value: "~2–10ms", color: "hsl(142,71%,45%)" },
              { label: "Page load", value: "CDN-dependent", color: "hsl(38,92%,55%)" },
            ].map((s, i, arr) => (
              <div key={s.label} style={{
                display: "flex", justifyContent: "space-between", padding: "7px 0", fontSize: "12px",
                borderBottom: i < arr.length - 1 ? "1px solid hsl(220,15%,10%)" : "none",
              }}>
                <span style={{ color: "hsl(var(--muted-foreground))" }}>{s.label}</span>
                <span style={{ fontWeight: 600, color: s.color }}>{s.value}</span>
              </div>
            ))}
            <div style={{ fontSize: "10px", color: "hsl(var(--muted-foreground))", marginTop: 10, lineHeight: 1.6 }}>
              Check DevTools → Network for real load times.
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
