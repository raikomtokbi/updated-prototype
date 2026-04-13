import crypto from "crypto";

const DEFAULT_BASE_URL = "https://api.liogames.com/wp-json/liogames/v1";

export type LiogamesConfig = {
  baseUrl?: string;
  memberCode: string;
  secret: string;
};

export type LiogamesResponse<T> = {
  ok: boolean;
  code?: string;
  message?: string;
  data?: T;
};

export type LiogamesBalanceData = {
  member_code: string;
  balance: number;
  currency: string;
};

export type LiogamesPriceCheckData = {
  member_code: string;
  user_level: string;
  product_id: number;
  variation_id: number;
  currency: string;
  price: {
    base: number;
    discounted: number;
    discount_amount: number;
    discount_percent: number;
    source: string;
  };
};

export type LiogamesProductVariation = {
  variation_id: number;
  name: string;
  price: number;
  currency: string;
  attributes_map?: Record<string, string>;
};

export type LiogamesProductVariationsData = {
  product_id: number;
  variations: LiogamesProductVariation[];
};

export type LiogamesProductSchemaField = {
  key: string;
  required: boolean;
  type: string;
  options?: { value: string; label: string }[];
};

export type LiogamesProductSchemaData = {
  product_id: number;
  variation_id: number;
  profile: string;
  strict_mode: number;
  schema: {
    label: string;
    server_mode?: string;
    fields: LiogamesProductSchemaField[];
  };
  example?: Record<string, unknown>;
};

export type LiogamesCreateOrderData = {
  order_id: number;
  partner_ref: string;
  status: string;
  status_label: string;
  result: string;
  amount?: { unit_price: number; total: number; currency: string };
  product?: { product_id: number; variation_id?: number };
  player?: { player_id?: string; server_id?: string };
  member_code: string;
};

export type LiogamesOrderStatusData = {
  order_id: number;
  partner_ref: string;
  status: string;
  status_label: string;
  result: string;
  updated_at: string;
  items?: Array<{
    product_id: number;
    variation_id?: number;
    qty?: number;
    meta?: Record<string, string>;
  }>;
};

function buildSignature(rawBody: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
}

async function liogamesRequest<T>(path: string, payload: unknown, config: LiogamesConfig): Promise<LiogamesResponse<T>> {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  const body = JSON.stringify(payload);
  const signature = buildSignature(body, config.secret);
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-liog-sign": signature,
    },
    body,
  });
  return res.json() as Promise<LiogamesResponse<T>>;
}

export async function getLiogamesBalance(config: LiogamesConfig) {
  return liogamesRequest<LiogamesBalanceData>("/balance", { member_code: config.memberCode }, config);
}

export async function getLiogamesPriceCheck(config: LiogamesConfig, productId: number, variationId: number) {
  return liogamesRequest<LiogamesPriceCheckData>("/price-check", {
    member_code: config.memberCode,
    product_id: productId,
    variation_id: variationId,
  }, config);
}

export async function getLiogamesProductVariations(productId: number, baseUrl = DEFAULT_BASE_URL) {
  const res = await fetch(`${baseUrl}/product-variations?product_id=${productId}`);
  return res.json() as Promise<LiogamesResponse<LiogamesProductVariationsData>>;
}

export async function getLiogamesProductSchema(productId: number, variationId: number, baseUrl = DEFAULT_BASE_URL) {
  const res = await fetch(`${baseUrl}/product-schema?product_id=${productId}&variation_id=${variationId}`);
  return res.json() as Promise<LiogamesResponse<LiogamesProductSchemaData>>;
}

export async function getLiogamesInputProfiles(baseUrl = DEFAULT_BASE_URL) {
  const res = await fetch(`${baseUrl}/input-profiles`);
  return res.json();
}

export async function createLiogamesOrder(payload: Record<string, unknown>, config: LiogamesConfig) {
  return liogamesRequest<LiogamesCreateOrderData>("/order-create", payload, config);
}

export async function getLiogamesOrderStatus(config: LiogamesConfig, orderId?: number, partnerRef?: string) {
  return liogamesRequest<LiogamesOrderStatusData>("/order-status", {
    member_code: config.memberCode,
    ...(orderId ? { order_id: orderId } : {}),
    ...(partnerRef ? { partner_ref: partnerRef } : {}),
  }, config);
}
