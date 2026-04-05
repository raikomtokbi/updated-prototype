const BUSAN_BASE_URL = "https://busangame.com/api";

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

function headers(apiToken: string): Record<string, string> {
  return {
    "Authorization": `Bearer ${apiToken}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
  };
}

export async function getBusanBalance(apiToken: string): Promise<BusanBalance> {
  const res = await fetch(`${BUSAN_BASE_URL}/balance`, {
    method: "GET",
    headers: headers(apiToken),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Busan balance check failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return {
    balance: parseFloat(data.balance ?? data.data?.balance ?? "0"),
    currency: data.currency ?? data.data?.currency ?? "IDR",
  };
}

export async function getBusanProducts(apiToken: string, currency?: string): Promise<BusanProduct[]> {
  const url = new URL(`${BUSAN_BASE_URL}/products`);
  if (currency) url.searchParams.set("currency", currency);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: headers(apiToken),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Busan products fetch failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  const list: any[] = data.data ?? data.products ?? data ?? [];
  return list.map((p: any) => ({
    id: String(p.id ?? p.product_id ?? ""),
    name: String(p.name ?? p.product_name ?? ""),
    price: parseFloat(p.price ?? p.amount ?? "0"),
    currency: String(p.currency ?? currency ?? "IDR"),
    category: p.category ?? p.type ?? undefined,
  }));
}

export async function createBusanOrder(apiToken: string, payload: BusanOrderPayload): Promise<BusanOrderResult> {
  const body: Record<string, any> = {
    product_id: payload.product_id,
    player_id: payload.player_id,
    ref_id: payload.ref_id,
    quantity: payload.quantity ?? 1,
  };
  if (payload.zone_id) body.zone_id = payload.zone_id;

  const res = await fetch(`${BUSAN_BASE_URL}/order`, {
    method: "POST",
    headers: headers(apiToken),
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    return {
      success: false,
      message: data.message ?? data.error ?? `HTTP ${res.status}`,
    };
  }

  return {
    success: true,
    order_id: String(data.order_id ?? data.data?.order_id ?? ""),
    message: data.message ?? "Order created",
    status: data.status ?? data.data?.status ?? "processing",
  };
}
