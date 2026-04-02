import { createHash } from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SmileOneProduct {
  product_id: string;
  name: string;
  price: number;
  original_price?: number;
  currency: string;
  region: string;
}

export interface SmileOnePlayerInfo {
  valid: boolean;
  username?: string;
  user_id?: string;
  zone_id?: string;
  message?: string;
}

export interface SmileOnePurchaseResult {
  transaction_id?: string;
  status: "success" | "failed" | "pending";
  message: string;
  raw?: Record<string, unknown>;
}

export interface SmileOneError {
  success: false;
  message: string;
  code?: string | number;
}

// ─── Game Slug → Smile.one Product Name Mapping ───────────────────────────────

const GAME_SLUG_MAP: Record<string, string> = {
  "mobile-legends": "mobilelegends",
  "mobilelegends": "mobilelegends",
  "free-fire": "freefire",
  "freefire": "freefire",
  "pubg-mobile": "pubgm",
  "pubgmobile": "pubgm",
  "pubg": "pubgm",
  "genshin-impact": "genshin",
  "genshin": "genshin",
  "call-of-duty-mobile": "codmobile",
  "codmobile": "codmobile",
  "valorant": "valorant",
  "league-of-legends": "lol",
  "lol": "lol",
  "honkai-star-rail": "hsr",
  "hsr": "hsr",
  "apex-legends": "apex",
  "apex": "apex",
  "point-blank": "pointblank",
  "pointblank": "pointblank",
  "ragnarok": "ragnarok",
  "ragnarokonline": "ragnarok",
};

// ─── Region → Base URL Mapping ────────────────────────────────────────────────

const REGION_BASE_URL_MAP: Record<string, string> = {
  "global": "https://www.smile.one/merchant/",
  "ph":     "https://www.smile.one/ph/merchant/",
  "br":     "https://www.smile.one/br/merchant/",
  "sg":     "https://www.smile.one/sg/merchant/",
  "my":     "https://www.smile.one/my/merchant/",
  "id":     "https://www.smile.one/id/merchant/",
  "th":     "https://www.smile.one/th/merchant/",
  "vn":     "https://www.smile.one/vn/merchant/",
  "tw":     "https://www.smile.one/tw/merchant/",
  "hk":     "https://www.smile.one/hk/merchant/",
  "sa":     "https://www.smile.one/sa/merchant/",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getConfig() {
  const uid = process.env.SMILEONE_UID;
  const key = process.env.SMILEONE_KEY;
  const email = process.env.SMILEONE_EMAIL;
  const defaultRegion = process.env.SMILEONE_REGION || "global";

  if (!uid || !key || !email) {
    throw new Error(
      "Smile.one credentials not configured. Set SMILEONE_UID, SMILEONE_KEY, and SMILEONE_EMAIL environment variables."
    );
  }

  return { uid, key, email, defaultRegion };
}

function buildSignature(uid: string, key: string, time: number): string {
  return createHash("md5").update(`${uid}${key}${time}`).digest("hex");
}

function resolveBaseUrl(region: string): string {
  const normalized = region.toLowerCase().trim();
  return REGION_BASE_URL_MAP[normalized] ?? REGION_BASE_URL_MAP["global"];
}

function resolveProductName(gameSlug: string): string {
  const normalized = gameSlug.toLowerCase().trim();
  const name = GAME_SLUG_MAP[normalized];
  if (!name) {
    throw new Error(
      `Unsupported game slug: "${gameSlug}". Add it to the GAME_SLUG_MAP in smileoneService.ts.`
    );
  }
  return name;
}

function buildAuthPayload(uid: string, key: string, email: string): Record<string, string | number> {
  const time = Math.floor(Date.now() / 1000);
  const sign = buildSignature(uid, key, time);
  return { uid, email, time, sign };
}

async function smilePost<T = Record<string, unknown>>(
  url: string,
  payload: Record<string, unknown>
): Promise<T> {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(payload)) {
    body.set(k, String(v));
  }

  console.log(`[SmileOne] POST ${url}`, { ...payload, sign: "***" });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const text = await res.text();

  let data: T;
  try {
    data = JSON.parse(text) as T;
  } catch {
    console.error(`[SmileOne] Non-JSON response from ${url}:`, text);
    throw new Error(`Smile.one API returned unexpected response: ${text.slice(0, 200)}`);
  }

  console.log(`[SmileOne] Response from ${url}:`, data);
  return data;
}

function parseErrorMessage(data: Record<string, unknown>): string {
  if (typeof data.msg === "string" && data.msg) return data.msg;
  if (typeof data.message === "string" && data.message) return data.message;
  if (typeof data.error === "string" && data.error) return data.error;
  const code = data.code ?? data.status;
  if (code === 6001 || code === "6001") return "Invalid user ID or zone ID";
  if (code === 6002 || code === "6002") return "Product unavailable";
  if (code === 6003 || code === "6003") return "Insufficient balance";
  if (code === 6004 || code === "6004") return "Duplicate order";
  if (code === 6006 || code === "6006") return "Invalid API credentials";
  return `API error (code: ${code ?? "unknown"})`;
}

function isSuccess(data: Record<string, unknown>): boolean {
  const code = Number(data.code ?? data.status ?? -1);
  return code === 200 || code === 0 || data.success === true;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch the product/top-up list for a game from Smile.one.
 */
export async function getProductList(
  gameSlug: string,
  region?: string
): Promise<SmileOneProduct[] | SmileOneError> {
  try {
    const { uid, key, email, defaultRegion } = getConfig();
    const productName = resolveProductName(gameSlug);
    const resolvedRegion = region || defaultRegion;
    const baseUrl = resolveBaseUrl(resolvedRegion);
    const url = `${baseUrl}${productName}/product`;

    const payload = {
      ...buildAuthPayload(uid, key, email),
      product: productName,
    };

    const data = await smilePost<Record<string, unknown>>(url, payload);

    if (!isSuccess(data)) {
      const message = parseErrorMessage(data);
      console.warn(`[SmileOne] getProductList failed for ${gameSlug}:`, message);
      return { success: false, message };
    }

    // Normalize the product list — the API returns different shapes per product
    const rawList = (data.product_list ?? data.products ?? data.data ?? []) as Record<string, unknown>[];

    const products: SmileOneProduct[] = rawList.map((item) => ({
      product_id: String(item.product ?? item.id ?? item.product_id ?? ""),
      name: String(item.product_name ?? item.name ?? ""),
      price: Number(item.price ?? 0),
      original_price: item.original_price != null ? Number(item.original_price) : undefined,
      currency: String(item.currency ?? "USD"),
      region: resolvedRegion,
    }));

    return products;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[SmileOne] getProductList error:", err);
    return { success: false, message };
  }
}

/**
 * Validate a player's user ID (and optional zone ID) for a game.
 */
export async function validatePlayer(
  gameSlug: string,
  userInput: Record<string, string>,
  region?: string
): Promise<SmileOnePlayerInfo | SmileOneError> {
  try {
    const { uid, key, email, defaultRegion } = getConfig();
    const productName = resolveProductName(gameSlug);
    const resolvedRegion = region || defaultRegion;
    const baseUrl = resolveBaseUrl(resolvedRegion);
    const url = `${baseUrl}${productName}/role`;

    const userId = userInput.user_id ?? userInput.userId ?? userInput.userid ?? "";
    const zoneId = userInput.zone_id ?? userInput.zoneId ?? userInput.zoneid ?? "";

    if (!userId) {
      return { success: false, message: "user_id is required for player validation" };
    }

    const payload: Record<string, unknown> = {
      ...buildAuthPayload(uid, key, email),
      product: productName,
      userid: userId,
    };

    if (zoneId) payload.zoneid = zoneId;

    // Forward additional dynamic fields (e.g. server_id for some games)
    const knownAliases = new Set([
      "user_id", "userId", "userid",
      "zone_id", "zoneId", "zoneid",
    ]);
    for (const [k, v] of Object.entries(userInput)) {
      if (!knownAliases.has(k) && v) {
        payload[k] = v;
      }
    }

    const data = await smilePost<Record<string, unknown>>(url, payload);

    if (!isSuccess(data)) {
      const message = parseErrorMessage(data);
      console.warn(`[SmileOne] validatePlayer failed for ${gameSlug} uid=${userId}:`, message);
      return { success: false, valid: false, message };
    }

    const username =
      String(data.username ?? data.role_name ?? data.nickname ?? data.name ?? "").trim() || undefined;

    return {
      valid: true,
      username,
      user_id: userId,
      zone_id: zoneId || undefined,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[SmileOne] validatePlayer error:", err);
    return { success: false, message };
  }
}

/**
 * Create a purchase/top-up order via Smile.one.
 */
export async function createPurchase(
  gameSlug: string,
  productId: string,
  userInput: Record<string, string>,
  region?: string
): Promise<SmileOnePurchaseResult | SmileOneError> {
  try {
    const { uid, key, email, defaultRegion } = getConfig();
    const productName = resolveProductName(gameSlug);
    const resolvedRegion = region || defaultRegion;
    const baseUrl = resolveBaseUrl(resolvedRegion);
    const url = `${baseUrl}${productName}/purchase`;

    const userId = userInput.user_id ?? userInput.userId ?? userInput.userid ?? "";
    const zoneId = userInput.zone_id ?? userInput.zoneId ?? userInput.zoneid ?? "";

    if (!userId) {
      return { success: false, message: "user_id is required for purchase" };
    }
    if (!productId) {
      return { success: false, message: "product_id is required for purchase" };
    }

    const payload: Record<string, unknown> = {
      ...buildAuthPayload(uid, key, email),
      product: productName,
      productid: productId,
      userid: userId,
    };

    if (zoneId) payload.zoneid = zoneId;

    // Forward any additional dynamic fields the caller provides
    const knownFields = new Set([
      "user_id", "userId", "userid",
      "zone_id", "zoneId", "zoneid",
    ]);
    for (const [k, v] of Object.entries(userInput)) {
      if (!knownFields.has(k) && v) {
        payload[k] = v;
      }
    }

    const data = await smilePost<Record<string, unknown>>(url, payload);

    if (!isSuccess(data)) {
      const message = parseErrorMessage(data);
      console.error(`[SmileOne] createPurchase failed for ${gameSlug} product=${productId}:`, message, data);
      return { success: false, message };
    }

    const transactionId = String(
      data.order_id ?? data.transaction_id ?? data.trade_no ?? data.id ?? ""
    ).trim() || undefined;

    const status: SmileOnePurchaseResult["status"] =
      data.status === "pending" ? "pending" : "success";

    const message =
      typeof data.msg === "string" ? data.msg :
      typeof data.message === "string" ? data.message :
      "Purchase successful";

    console.log(
      `[SmileOne] createPurchase success for ${gameSlug} product=${productId} tx=${transactionId}`
    );

    return {
      transaction_id: transactionId,
      status,
      message,
      raw: data,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[SmileOne] createPurchase error:", err);
    return { success: false, message };
  }
}
