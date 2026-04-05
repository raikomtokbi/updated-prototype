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
