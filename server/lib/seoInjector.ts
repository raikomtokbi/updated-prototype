import { db } from "../db";
import { siteSettings } from "@shared/schema";

const CACHE_TTL_MS = 60_000;

interface SeoCache {
  at: number;
  values: Record<string, string>;
  siteBoot: Record<string, string>;
}

let cache: SeoCache | null = null;

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Safely embed a JSON value inside an inline `<script>` block. JSON itself
// escapes double-quotes/backslashes; the only remaining risk inside a script
// tag is a literal `</script>` sequence inside a string value, so we escape
// the leading slash. Also escape the unicode line/paragraph separators which
// some older JS parsers would otherwise treat as line terminators inside a
// string literal.
function safeJsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/<\//g, "<\\/")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

async function getSeoValues(): Promise<{ values: Record<string, string>; siteBoot: Record<string, string> }> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return { values: cache.values, siteBoot: cache.siteBoot };
  }

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
  const ogImage = map.og_image || map.site_logo || "";
  const siteUrl = map.site_url || process.env.SITE_URL || "";
  const faviconUrl = map.site_favicon || map.pwa_icon || "/favicon.png";
  const appleTouchIconUrl = map.pwa_icon || map.site_favicon || "/icons/icon-192.png";

  // Boot payload is read by the client on first paint (Navbar / AdminLayout)
  // so the user's logo and site name appear immediately without waiting for
  // /api/site-settings — eliminates the brief flash of the default branding.
  const siteBoot = {
    site_logo: map.site_logo || "",
    site_name: siteName,
    site_favicon: faviconUrl,
    pwa_icon: map.pwa_icon || "",
  };

  const values: Record<string, string> = {
    __SEO_TITLE__: seoTitle,
    __SEO_DESCRIPTION__: seoDescription,
    __SEO_KEYWORDS__: seoKeywords,
    __OG_TITLE__: seoTitle,
    __OG_DESCRIPTION__: seoDescription,
    __OG_IMAGE__: ogImage,
    __SITE_URL__: siteUrl,
    __FAVICON_URL__: faviconUrl,
    __APPLE_TOUCH_ICON_URL__: appleTouchIconUrl,
  };

  cache = { at: now, values, siteBoot };
  return { values, siteBoot };
}

export async function injectSeo(html: string): Promise<string> {
  try {
    const { values, siteBoot } = await getSeoValues();
    for (const [token, raw] of Object.entries(values)) {
      html = html.replaceAll(token, escHtml(raw));
    }
    html = html.replaceAll("__SITE_BOOT_JSON__", safeJsonForScript(siteBoot));
  } catch (err) {
    console.error("[seoInjector] Failed to inject SEO values:", err);
    // Always emit a valid empty boot payload so the client can read it safely
    html = html.replaceAll("__SITE_BOOT_JSON__", "{}");
  }
  return html;
}

export function invalidateSeoCache(): void {
  cache = null;
}
