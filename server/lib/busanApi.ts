export interface BusanProduct {
  id: string;
  name: string;
  price: number;
  currency: string;
  category?: string;
}

export interface BusanBalance {
  balance: number;
  currency: string;
}

export interface BusanOrderPayload {
  product_id: string;
  player_id: string;
  zone_id?: string;
  quantity?: number;
  ref_id: string;
}

export interface BusanOrderResult {
  success: boolean;
  order_id?: string;
  message?: string;
  status?: string;
}

function makeHeaders(apiToken: string): Record<string, string> {
  return {
    "Authorization": `Bearer ${apiToken}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
}

function cleanBase(url: string): string {
  return url.replace(/\/+$/, "");
}

export async function getBusanBalance(apiToken: string, apiBaseUrl: string): Promise<BusanBalance> {
  const base = cleanBase(apiBaseUrl);
  const res = await fetch(`${base}/balance`, {
    method: "GET",
    headers: makeHeaders(apiToken),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Busan balance check failed (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Busan API returned non-JSON response. Check your API Base URL. Response: ${text.slice(0, 200)}`);
  }

  return {
    balance: parseFloat(data.balance ?? data.data?.balance ?? "0"),
    currency: data.currency ?? data.data?.currency ?? "IDR",
  };
}

export async function getBusanProducts(apiToken: string, apiBaseUrl: string, currency?: string): Promise<BusanProduct[]> {
  const base = cleanBase(apiBaseUrl);
  const url = new URL(`${base}/products`);
  if (currency) url.searchParams.set("currency", currency);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: makeHeaders(apiToken),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Busan products fetch failed (HTTP ${res.status}): ${text.slice(0, 300)}`);
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Busan API returned non-JSON response. Check your API Base URL. Response: ${text.slice(0, 200)}`);
  }

  const list: any[] = data.data ?? data.products ?? (Array.isArray(data) ? data : []);
  return list.map((p: any) => ({
    id: String(p.id ?? p.product_id ?? ""),
    name: String(p.name ?? p.product_name ?? ""),
    price: parseFloat(p.price ?? p.amount ?? "0"),
    currency: String(p.currency ?? currency ?? "IDR"),
    category: p.category ?? p.type ?? undefined,
  }));
}

export async function createBusanOrder(apiToken: string, apiBaseUrl: string, payload: BusanOrderPayload): Promise<BusanOrderResult> {
  const base = cleanBase(apiBaseUrl);
  const body: Record<string, any> = {
    product_id: payload.product_id,
    player_id: payload.player_id,
    ref_id: payload.ref_id,
    quantity: payload.quantity ?? 1,
  };
  if (payload.zone_id) body.zone_id = payload.zone_id;

  const res = await fetch(`${base}/order`, {
    method: "POST",
    headers: makeHeaders(apiToken),
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data: any = {};
  try { data = JSON.parse(text); } catch { /* ignore */ }

  if (!res.ok) {
    return {
      success: false,
      message: data.message ?? data.error ?? `HTTP ${res.status}: ${text.slice(0, 200)}`,
    };
  }

  return {
    success: true,
    order_id: String(data.order_id ?? data.data?.order_id ?? ""),
    message: data.message ?? "Order created",
    status: data.status ?? data.data?.status ?? "processing",
  };
}
