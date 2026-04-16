import { GoogleAuth } from "google-auth-library";

interface GA4Row {
  dimensionValues?: { value: string }[];
  metricValues?: { value: string }[];
}

interface GA4Response {
  rows?: GA4Row[];
  totals?: GA4Row[];
  error?: { message: string; code: number };
}

async function getAccessToken(credentialsJson: string): Promise<string> {
  const credentials = JSON.parse(credentialsJson);
  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("Failed to get GA4 access token");
  return token.token;
}

async function runReport(
  propertyId: string,
  accessToken: string,
  body: object,
): Promise<GA4Response> {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = (await resp.json()) as GA4Response;
  if (data.error) throw new Error(`GA4 API error: ${data.error.message}`);
  return data;
}

async function runRealtimeReport(
  propertyId: string,
  accessToken: string,
): Promise<GA4Response> {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      metrics: [{ name: "activeUsers" }],
    }),
  });
  const data = (await resp.json()) as GA4Response;
  if (data.error) throw new Error(`GA4 Realtime API error: ${data.error.message}`);
  return data;
}

function ga4DateRange(range: string): { startDate: string; endDate: string } {
  if (range === "7days") return { startDate: "7daysAgo", endDate: "today" };
  if (range === "90days") return { startDate: "90daysAgo", endDate: "today" };
  return { startDate: "30daysAgo", endDate: "today" };
}

function rowVal(row: GA4Row, metricIndex: number): number {
  const v = row.metricValues?.[metricIndex]?.value ?? "0";
  return parseFloat(v) || 0;
}

export async function getGA4Analytics(
  propertyId: string,
  credentialsJson: string,
  range: string,
): Promise<Record<string, unknown>> {
  const token = await getAccessToken(credentialsJson);
  const dateRange = ga4DateRange(range);

  const [summaryRes, trafficRes, pagesRes, devicesRes, engRes, hourlyRes, realtimeRes] =
    await Promise.all([
      // Summary totals
      runReport(propertyId, token, {
        dateRanges: [dateRange],
        metrics: [
          { name: "screenPageViews" },
          { name: "sessions" },
          { name: "bounceRate" },
          { name: "averageSessionDuration" },
        ],
      }),
      // Traffic sources
      runReport(propertyId, token, {
        dateRanges: [dateRange],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 6,
      }),
      // Top pages
      runReport(propertyId, token, {
        dateRanges: [dateRange],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 10,
      }),
      // Devices
      runReport(propertyId, token, {
        dateRanges: [dateRange],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "sessions" }],
      }),
      // Engagement by day (for charts)
      runReport(propertyId, token, {
        dateRanges: [dateRange],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "averageSessionDuration" }, { name: "bounceRate" }],
        orderBys: [{ dimension: { dimensionName: "date" }, desc: false }],
      }),
      // Hourly for today (liveTraffic)
      runReport(propertyId, token, {
        dateRanges: [{ startDate: "today", endDate: "today" }],
        dimensions: [{ name: "hour" }],
        metrics: [{ name: "screenPageViews" }],
      }),
      // Active users right now
      runRealtimeReport(propertyId, token),
    ]);

  // ── Parse summary ──
  const summaryRow = summaryRes.rows?.[0];
  const totalViews = summaryRow ? rowVal(summaryRow, 0) : 0;
  const uniqueSessions = summaryRow ? rowVal(summaryRow, 1) : 0;
  const bounceRate = summaryRow ? Math.round(rowVal(summaryRow, 2) * 100) : 0;
  const avgDurationSec = summaryRow ? Math.round(rowVal(summaryRow, 3)) : 0;

  // ── Parse traffic sources ──
  const sourceMap: Record<string, string> = {
    "Organic Search": "Organic",
    "Direct": "Direct",
    "Referral": "Referral",
    "Organic Social": "Social",
    "Paid Search": "Paid",
    "Email": "Email",
    "Unassigned": "Other",
  };
  const trafficSources = (trafficRes.rows ?? []).map((r) => ({
    name: sourceMap[r.dimensionValues?.[0]?.value ?? ""] ?? r.dimensionValues?.[0]?.value ?? "Other",
    value: Math.round(rowVal(r, 0)),
  }));

  // ── Parse top pages ──
  const topPages = (pagesRes.rows ?? []).map((r) => ({
    path: r.dimensionValues?.[0]?.value ?? "/",
    views: Math.round(rowVal(r, 0)),
  }));

  // ── Parse devices ──
  const devices = (devicesRes.rows ?? []).map((r) => ({
    name: r.dimensionValues?.[0]?.value ?? "unknown",
    value: Math.round(rowVal(r, 0)),
  }));

  // ── Parse daily engagement ──
  const engagementByDay = (engRes.rows ?? []).map((r) => {
    const dateStr = r.dimensionValues?.[0]?.value ?? "";
    const label = dateStr.length === 8
      ? new Date(`${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : dateStr;
    return { day: label, avgSec: Math.round(rowVal(r, 0)) };
  });

  const bounceByDay = (engRes.rows ?? []).map((r) => {
    const dateStr = r.dimensionValues?.[0]?.value ?? "";
    const label = dateStr.length === 8
      ? new Date(`${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      : dateStr;
    return { day: label, rate: Math.round(rowVal(r, 1) * 100) };
  });

  // ── Parse hourly (liveTraffic) ──
  const hourlyMap: Record<string, number> = {};
  for (const row of hourlyRes.rows ?? []) {
    const h = parseInt(row.dimensionValues?.[0]?.value ?? "0");
    hourlyMap[h] = Math.round(rowVal(row, 0));
  }
  const liveTraffic = Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, "0")}:00`,
    views: hourlyMap[i] ?? 0,
  }));

  // ── Active now ──
  const activeNow = Math.round(
    (realtimeRes.rows ?? []).reduce((sum, r) => sum + rowVal(r, 0), 0),
  );

  return {
    totalViews,
    uniqueSessions,
    bounceRate,
    avgDurationSec,
    liveTraffic,
    trafficSources,
    topPages,
    devices,
    engagementByDay,
    bounceByDay,
    activeNow,
    _source: "google_analytics",
  };
}
