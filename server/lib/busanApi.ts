export const BUSAN_DEFAULT_BASE_URL = "https://1gamestopup.com/api/v1";

export interface BusanProduct {
  id: string;
  name: string;
  price: number;
  priceRaw: string;
  currency: string;
  category?: string;
}

export interface BusanBalance {
  balance: number;
  balanceRaw: string;
  currency: string;
}

export interface BusanOrderPayload {
  productId: string;
  playerId: string;
  zoneId?: string;
  currency?: string;
}

export interface BusanOrderResult {
  success: boolean;
  orderId?: string;
  message?: string;
  status?: string;
  title?: string;
  price?: string;
}

function makeHeaders(apiKey: string): Record<string, string> {
  return {
    "x-api-key": apiKey,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
}

function cleanBase(url: string): string {
  return url.replace(/\/+$/, "");
}

function parsePriceString(raw: string | number | undefined): number {
  if (raw === undefined || raw === null) return 0;
  if (typeof raw === "number") return raw;
  const cleaned = String(raw).replace(/[₹$,\s]/g, "").replace(/[^0-9.]/g, "");
  return parseFloat(cleaned) || 0;
}

function parseBalanceString(raw: string | undefined): { balance: number; currency: string } {
  if (!raw) return { balance: 0, currency: "INR" };
  const str = String(raw).trim();
  const num = parsePriceString(str);
  const currency = str.includes("USD") ? "USD" : "INR";
  return { balance: num, currency };
}

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `API returned non-JSON response (HTTP ${res.status}). Check your API Base URL is correct. Got: ${text.slice(0, 200)}`
    );
  }
}

export async function getBusanBalance(apiKey: string, apiBaseUrl: string, currency = "INR"): Promise<BusanBalance> {
  const base = cleanBase(apiBaseUrl);
  const url = `${base}/api-service/balance?currency=${encodeURIComponent(currency)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: makeHeaders(apiKey),
  });

  const data = await safeJson(res);

  if (!res.ok || data.success === false) {
    throw new Error(data.error ?? data.message ?? `Balance check failed (HTTP ${res.status})`);
  }

  const balanceRaw = String(data.data?.balance ?? "0");
  const parsed = parseBalanceString(balanceRaw);

  return {
    balance: parsed.balance,
    balanceRaw,
    currency: parsed.currency,
  };
}

export async function getBusanProducts(apiKey: string, apiBaseUrl: string, currency = "INR"): Promise<BusanProduct[]> {
  const base = cleanBase(apiBaseUrl);
  const url = `${base}/api-service/products?currency=${encodeURIComponent(currency)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: makeHeaders(apiKey),
  });

  const data = await safeJson(res);

  if (!res.ok || data.success === false) {
    throw new Error(data.error ?? data.message ?? `Products fetch failed (HTTP ${res.status})`);
  }

  const list: any[] = Array.isArray(data.data) ? data.data : [];
  return list.map((p: any) => {
    const priceRaw = String(p.price ?? "0");
    return {
      id: String(p.productId ?? p.id ?? ""),
      name: String(p.productName ?? p.name ?? ""),
      price: parsePriceString(priceRaw),
      priceRaw,
      currency,
      category: p.category ?? p.type ?? undefined,
    };
  });
}

export interface BusanPlayerResult {
  success: boolean;
  username?: string;
  message?: string;
}

function extractPlayerName(data: any): string | undefined {
  return (
    String(
      data?.data?.playerName ?? data?.data?.username ?? data?.data?.name ??
      data?.data?.nickname ?? data?.data?.roleName ?? data?.data?.role_name ??
      data?.playerName ?? data?.username ?? data?.name ?? data?.nickname ?? ""
    ).trim() || undefined
  );
}

export async function validateBusanPlayer(
  apiKey: string,
  apiBaseUrl: string,
  playerId: string,
  zoneId?: string,
  productId?: string
): Promise<BusanPlayerResult> {
  const base = cleanBase(apiBaseUrl);
  const headers = makeHeaders(apiKey);

  // Build multiple body variants (different APIs use different param names)
  const bodies: Record<string, any>[] = [
    { playerId, ...(zoneId ? { zoneId } : {}), ...(productId ? { productId } : {}) },
    { userId: playerId, ...(zoneId ? { zoneId } : {}), ...(productId ? { productId } : {}) },
    { player_id: playerId, ...(zoneId ? { zone_id: zoneId } : {}), ...(productId ? { product_id: productId } : {}) },
  ];

  // ── Try POST patterns ────────────────────────────────────────────────────────
  const postEndpoints = [
    `${base}/api-service/validate`,
    `${base}/api-service/validate-user`,
    `${base}/api-service/validate-player`,
    `${base}/api-service/check-user`,
    `${base}/api-service/role`,
    `${base}/api-service/player`,
    `${base}/api-service/check`,
  ];

  for (const url of postEndpoints) {
    for (const body of bodies) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(5000),
        });
        // skip if HTML (404/500 page)
        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("json")) continue;
        const data = await safeJson(res);
        if (res.ok && data.success !== false) {
          const username = extractPlayerName(data);
          return { success: true, username };
        }
        // If we got a real JSON error (not just 404), stop trying other bodies for this endpoint
        if (res.ok === false && data.success === false && data.error) break;
      } catch {
        // try next
      }
    }
  }

  // ── Try GET pattern ──────────────────────────────────────────────────────────
  try {
    const params = new URLSearchParams({ playerId });
    if (zoneId) params.append("zoneId", zoneId);
    if (productId) params.append("productId", productId);

    const res = await fetch(`${base}/api-service/validate?${params}`, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(5000),
    });
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("json")) {
      const data = await safeJson(res);
      if (res.ok && data.success !== false) {
        const username = extractPlayerName(data);
        return { success: true, username };
      }
    }
  } catch {
    // fall through
  }

  return { success: false, message: "Busan API does not support player validation for this game." };
}

export async function createBusanOrder(
  apiKey: string,
  apiBaseUrl: string,
  payload: BusanOrderPayload
): Promise<BusanOrderResult> {
  const base = cleanBase(apiBaseUrl);
  const body: Record<string, any> = {
    playerId: payload.playerId,
    productId: payload.productId,
    currency: payload.currency ?? "INR",
  };
  if (payload.zoneId) body.zoneId = payload.zoneId;

  const res = await fetch(`${base}/api-service/order`, {
    method: "POST",
    headers: makeHeaders(apiKey),
    body: JSON.stringify(body),
  });

  const data = await safeJson(res);

  if (!res.ok || data.success === false) {
    return {
      success: false,
      message: data.error ?? data.message ?? `HTTP ${res.status}`,
    };
  }

  return {
    success: true,
    orderId: String(data.data?.orderId ?? ""),
    status: String(data.data?.status ?? "success"),
    title: data.data?.title ?? "",
    price: String(data.data?.price ?? ""),
    message: data.message ?? "Order created successfully",
  };
}
