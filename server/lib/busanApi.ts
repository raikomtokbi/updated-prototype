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
  if (typeof raw === "number") return isNaN(raw) ? 0 : raw;
  const str = String(raw).trim();
  if (!str || str === "null" || str === "undefined") return 0;
  // Remove currency symbols, commas, and whitespace, then keep only digits and dots
  const cleaned = str.replace(/[₹$,\s]/g, "").replace(/[^0-9.]/g, "");
  if (!cleaned) return 0;
  // Handle multiple dots (e.g. ".9.00") — take the first valid float segment
  const match = cleaned.match(/\d+\.?\d*/);
  return match ? parseFloat(match[0]) : 0;
}

function parseBalanceString(raw: string | number | undefined): { balance: number; currency: string } {
  if (raw === undefined || raw === null) return { balance: 0, currency: "INR" };
  const str = String(raw).trim();
  const currency = str.includes("USD") ? "USD" : "INR";
  const num = parsePriceString(str);
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

  // Try multiple possible paths for the balance value
  const rawValue =
    data.data?.balance ??
    data.balance ??
    (typeof data.data === "string" ? data.data : undefined);

  const balanceRaw = rawValue !== undefined && rawValue !== null ? String(rawValue) : "0";
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

/**
 * Validate a player against the Busan API.
 * Uses the documented endpoint: POST /api-service/validate
 * Body: { productId, playerId, zoneId? }
 * Success response: { status: true, data: { username: "...", valid: true } }
 */
export async function validateBusanPlayer(
  apiKey: string,
  apiBaseUrl: string,
  playerId: string,
  zoneId?: string,
  productId?: string
): Promise<BusanPlayerResult> {
  const base = cleanBase(apiBaseUrl);
  const headers = makeHeaders(apiKey);

  const body: Record<string, any> = { playerId };
  if (productId) body.productId = productId;
  if (zoneId) body.zoneId = zoneId;

  try {
    const res = await fetch(`${base}/api-service/validate`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) {
      return {
        success: false,
        message: "Validation service returned a non-JSON response. Check your API Base URL.",
      };
    }

    const data = await safeJson(res);

    // Busan docs: success response has status:true and data.valid:true
    const isStatusOk = data.status === true || data.success === true || data.success !== false;

    if (!res.ok || !isStatusOk) {
      return {
        success: false,
        message: data.message ?? data.error ?? `Validation failed (HTTP ${res.status})`,
      };
    }

    // If data.data.valid is explicitly false, the player was not found
    if (data.data?.valid === false) {
      return {
        success: false,
        message: data.message ?? data.data?.message ?? "Invalid player ID or server ID. Please double-check.",
      };
    }

    const username = extractPlayerName(data);
    return { success: true, username };
  } catch (err: any) {
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      return { success: false, message: "Validation request timed out. Please try again." };
    }
    if (err.message?.includes("non-JSON") || err.message?.includes("Check your API Base URL")) {
      return { success: false, message: err.message };
    }
    return { success: false, message: "Validation service unavailable. Please try again." };
  }
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
