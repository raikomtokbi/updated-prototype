import { db } from "../db";
import { siteSettings } from "@shared/schema";

const CACHE_TTL_MS = 60_000;

interface SeoCache {
  at: number;
  values: Record<string, string>;
}

let cache: SeoCache | null = null;

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function getSeoValues(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.values;

  const rows = await db.select().from(siteSettings);
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value ?? "";

  const siteName = map.site_name || "Nexcoin";
  const seoTitle = map.seo_title || `${siteName} — Game Top-Ups, Vouchers & Subscriptions`;
  const seoDescription =
    map.seo_description ||
    "Buy game credits, vouchers, and subscriptions instantly. Fast, secure & affordable.";
  const seoKeywords =
    map.seo_keywords || "game top-up, game credits, voucher, gift card";
  const ogImage = map.site_logo || "";

  const values: Record<string, string> = {
    __SEO_TITLE__: seoTitle,
    __SEO_DESCRIPTION__: seoDescription,
    __SEO_KEYWORDS__: seoKeywords,
    __OG_TITLE__: seoTitle,
    __OG_DESCRIPTION__: seoDescription,
    __OG_IMAGE__: ogImage,
  };

  cache = { at: now, values };
  return values;
}

export async function injectSeo(html: string): Promise<string> {
  try {
    const vals = await getSeoValues();
    for (const [token, raw] of Object.entries(vals)) {
      html = html.replaceAll(token, escHtml(raw));
    }
  } catch {
  }
  return html;
}

export function invalidateSeoCache(): void {
  cache = null;
}
