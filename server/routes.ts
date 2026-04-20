import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import type { Server } from "http";
import path from "path";
import fs from "fs";
import { createHash, randomBytes, createHmac, randomUUID } from "crypto";
import { signUserToken, verifyUserToken, extractBearerToken } from "./lib/jwt";
import webpush from "web-push";
import { generateOrderNumber } from "./lib/idGenerator";
import { startEmailPaymentPoller } from "./services/emailPaymentService";
import bcrypt from "bcryptjs";
import multer from "multer";
import Razorpay from "razorpay";
import { storage } from "./storage";
import { invalidateSeoCache } from "./lib/seoInjector";
import { getGatewayHandler } from "./lib/paymentGateways/index";
import {
  sendTemplatedEmail,
  sendRawEmail,
  buildEmailHtml,
  processTemplate,
  DEFAULT_EMAIL_TEMPLATES,
} from "./lib/emailService";
import { insertFeeSchema, insertSmileOneMappingSchema, insertBusanMappingSchema, insertLioGamesMappingSchema } from "@shared/schema";
import {
  getLiogamesBalance,
  getLiogamesProductVariations,
  getLiogamesProductSchema,
  getLiogamesInputProfiles,
  getLiogamesProducts,
  createLiogamesOrder,
  getLiogamesOrderStatus,
} from "./lib/liogamesApi";
import {
  getProductList as smileGetProductList,
  validatePlayer as smileValidatePlayer,
  createPurchase as smileCreatePurchase,
  makeSign as smileMakeSign,
  type SmileOneCredentials,
} from "./lib/smileone/smileoneService";
import {
  getBusanBalance,
  getBusanProducts,
  createBusanOrder,
  validateBusanPlayer,
} from "./lib/busanApi";

// ─── Multer setup ─────────────────────────────────────────────────────────────
const uploadsDir = path.resolve(process.cwd(), "public/uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Branding assets (site logo, favicon, PWA icon) live in their own folder so
// they're easy to back up, audit, and exclude from generic /uploads cleanup.
const brandingDir = path.resolve(process.cwd(), "public/branding");
if (!fs.existsSync(brandingDir)) fs.mkdirSync(brandingDir, { recursive: true });

const ALLOWED_BRANDING_KINDS = [
  "logo",
  "favicon",
  "pwa_icon",
  "pwa_icon_192",
  "pwa_icon_512",
] as const;
type BrandingKind = (typeof ALLOWED_BRANDING_KINDS)[number];

const brandingUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, brandingDir),
    filename: (req, file, cb) => {
      const kind = String((req.query?.kind ?? req.body?.kind ?? "asset")).toLowerCase();
      const ext = path.extname(file.originalname).toLowerCase() || ".png";
      // Preserve the user's original filename (sanitized) so the saved file
      // is recognisable, then append a short cache-buster suffix so each
      // upload produces a unique URL the browser won't serve from cache.
      const rawBase = path.basename(file.originalname, path.extname(file.originalname));
      const safeBase = rawBase
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_-]/g, "")
        .slice(0, 40) || "image";
      const stamp = Date.now().toString(36);
      cb(null, `${kind}-${safeBase}-${stamp}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext)
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_-]/g, "");
      cb(null, `${base || "file"}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

// ─── Ticket Attachment Multer ──────────────────────────────────────────────────
const attachmentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext)
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_-]/g, "");
      cb(null, `${base || "attach"}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/", "video/", "application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain"];
    const ok = allowed.some((t) => file.mimetype.startsWith(t) || file.mimetype === t);
    if (!ok) return cb(new Error("File type not allowed"));
    cb(null, true);
  },
});

// ─── Middleware helpers ───────────────────────────────────────────────────────

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const role = (req as any).adminRole as string | undefined;
  if (!role || !["super_admin", "admin", "staff"].includes(role)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
}

// Resolve the caller's role from the signed JWT in Authorization: Bearer.
// Uses the role embedded in the token (verified server-side at sign time) so
// the client cannot spoof admin access via a header. Falls back to no role if
// the token is missing/invalid — `requireAdmin` will then 403.
async function injectAdminRole(req: Request, _res: Response, next: NextFunction) {
  const token = extractBearerToken(req.headers["authorization"] as string | undefined);
  const claims = token ? verifyUserToken(token) : null;
  let role: string | null = null;
  if (claims?.uid) {
    // Re-read role from DB so a demoted/banned admin loses access immediately,
    // even if their (still-valid) JWT was minted while they were an admin.
    const user = await storage.getUser(claims.uid);
    if (user && !(user as any).isBanned) role = user.role ?? null;
  }
  (req as any).adminRole = role;
  next();
}

// ─── In-memory login attempt tracker ─────────────────────────────────────────
const loginAttempts = new Map<string, { count: number; lockedUntil: number | null }>();

function recordFailedLogin(username: string) {
  const rec = loginAttempts.get(username) ?? { count: 0, lockedUntil: null };
  rec.count += 1;
  loginAttempts.set(username, rec);
}

function resetLoginAttempts(username: string) {
  loginAttempts.delete(username);
}

async function isLoginLocked(username: string): Promise<{ locked: boolean; remaining: number }> {
  const rec = loginAttempts.get(username);
  if (!rec) return { locked: false, remaining: 0 };
  if (rec.lockedUntil && Date.now() < rec.lockedUntil) {
    return { locked: true, remaining: Math.ceil((rec.lockedUntil - Date.now()) / 1000) };
  }
  if (rec.lockedUntil && Date.now() >= rec.lockedUntil) {
    loginAttempts.delete(username);
    return { locked: false, remaining: 0 };
  }
  const maxSetting = await storage.getSiteSetting("max_login_attempts");
  const maxAttempts = parseInt(maxSetting?.value ?? "5") || 5;
  if (rec.count >= maxAttempts) {
    rec.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 min lockout
    loginAttempts.set(username, rec);
    return { locked: true, remaining: 900 };
  }
  return { locked: false, remaining: 0 };
}

// ─── Helper: get a single site setting value ──────────────────────────────────
async function getSetting(key: string, fallback = ""): Promise<string> {
  const s = await storage.getSiteSetting(key);
  return s?.value ?? fallback;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.use("/api/admin", injectAdminRole);

  // ── Seed default admin on first run ──────────────────────────────────────
  try {
    const existingUsers = await storage.getAllUsers(1, 0);
    if (existingUsers.length === 0) {
      const defaultPassword = "admin123456";
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      await storage.createUser({
        username: "admin",
        email: "admin@example.com",
        password: hashedPassword,
        fullName: "Admin",
        role: "super_admin",
        isActive: true,
      });
      console.log("[Seed] Default admin created — username: admin | password: admin123456");
      console.log("[Seed] Please change the default password after logging in.");
    }
  } catch (err) {
    console.warn("[Seed] Could not seed default admin:", err);
  }

  // ── Dynamic PWA manifest (reads site settings so icon/name stay in sync) ──
  app.get("/manifest.json", async (_req, res) => {
    try {
      const settings = await storage.getAllSiteSettings();
      const obj: Record<string, string> = {};
      settings.forEach((s) => { obj[s.key] = s.value ?? ""; });

      const siteName = obj.site_name || "Nexcoin";
      // PWA icons are uploaded manually via cPanel to fixed file paths so
      // hosts that block multipart uploads still work. Replace the files
      // at /icons/icon-192.png and /icons/icon-512.png to update them.
      const icon192 = "/icons/icon-192.png";
      const icon512 = "/icons/icon-512.png";
      const icons = [
        { src: icon512, sizes: "512x512", type: "image/png", purpose: "any" },
        { src: icon192, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: icon512, sizes: "512x512", type: "image/png", purpose: "maskable" },
        { src: icon192, sizes: "192x192", type: "image/png", purpose: "maskable" },
      ];

      const manifest = {
        name: `${siteName} — Game Top-Ups`,
        short_name: siteName,
        description: obj.site_description || "Buy game credits, vouchers, and subscriptions instantly.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait-primary",
        background_color: "#0d1117",
        theme_color: "#6d48e5",
        categories: ["games", "shopping"],
        icons,
        shortcuts: [
          { name: "Browse Games", short_name: "Games", url: "/products", description: "Browse all top-up games" },
          { name: "Offers", short_name: "Offers", url: "/offers", description: "Current promotions" },
        ],
      };

      res.setHeader("Content-Type", "application/manifest+json");
      res.setHeader("Cache-Control", "no-cache, no-store");
      res.json(manifest);
    } catch {
      res.status(500).json({ error: "Failed to generate manifest" });
    }
  });

  // ── Public site settings (read-only for storefront) ───────────────────────
  app.get("/api/site-settings", async (_req, res) => {
    const settings = await storage.getAllSiteSettings();
    const obj: Record<string, string> = {};
    settings.forEach((s) => { obj[s.key] = s.value; });
    res.json(obj);
  });

  // ── Exchange rate proxy (avoids browser CORS restrictions) ────────────────
  app.get("/api/exchange-rate", async (req, res) => {
    const from = (req.query.from as string) || "USD";
    const to = (req.query.to as string) || "INR";
    try {
      const r = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
      const data = await r.json() as any;
      res.json({ rate: data?.rates?.[to] ?? null });
    } catch {
      res.json({ rate: null });
    }
  });

  // Get active fees (public endpoint for checkout/cart)
  app.get("/api/fees", async (_req, res) => {
    const fees = await storage.getActiveFees();
    res.json(fees);
  });

  // ── Sitemap & robots ──────────────────────────────────────────────────────
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const base = `${req.protocol}://${req.get("host")}`;
      const now = new Date().toISOString().split("T")[0];

      const [allGames, allProducts] = await Promise.all([
        storage.getAllGames(),
        storage.getAllProducts(),
      ]);

      const staticPages = [
        { url: "/", priority: "1.0", changefreq: "daily" },
        { url: "/products", priority: "0.9", changefreq: "daily" },
        { url: "/offers", priority: "0.8", changefreq: "weekly" },
        { url: "/about", priority: "0.6", changefreq: "monthly" },
        { url: "/support", priority: "0.5", changefreq: "monthly" },
      ];

      const gameUrls = allGames
        .filter((g: any) => g.isActive !== false)
        .map((g: any) => ({ url: `/products/${g.slug}`, priority: "0.8", changefreq: "weekly" }));

      const productUrls = allProducts
        .filter((p: any) => p.isActive !== false)
        .map((p: any) => ({ url: `/products/${p.id}`, priority: "0.7", changefreq: "weekly" }));

      const entries = [...staticPages, ...gameUrls, ...productUrls];

      const xml = [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
        ...entries.map(e => [
          `  <url>`,
          `    <loc>${base}${e.url}</loc>`,
          `    <lastmod>${now}</lastmod>`,
          `    <changefreq>${e.changefreq}</changefreq>`,
          `    <priority>${e.priority}</priority>`,
          `  </url>`,
        ].join("\n")),
        `</urlset>`,
      ].join("\n");

      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.send(xml);
    } catch (err) {
      res.status(500).send("Error generating sitemap");
    }
  });

  app.get("/robots.txt", async (req, res) => {
    const base = `${req.protocol}://${req.get("host")}`;
    const txt = [
      "User-agent: *",
      "Allow: /",
      "Disallow: /admin/",
      "Disallow: /api/",
      "Disallow: /cart",
      "Disallow: /checkout",
      "Disallow: /account",
      "Disallow: /login",
      "Disallow: /register",
      "",
      `Sitemap: ${base}/sitemap.xml`,
    ].join("\n");
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(txt);
  });

  // ── Public product routes ──────────────────────────────────────────────────
  app.get("/api/products", async (_req, res) => {
    const prods = await storage.getAllProducts();
    res.json(prods);
  });

  app.get("/api/products/:id/packages", async (req, res) => {
    const pkgs = await storage.getProductPackages(req.params.id);
    res.json(pkgs);
  });

  app.get("/api/products/:id", async (req, res) => {
    const p = await storage.getProduct(req.params.id);
    if (!p) return res.status(404).json({ message: "Not found" });
    res.json(p);
  });

  // ── About page public stats ───────────────────────────────────────────────
  app.get("/api/about-stats", async (_req, res) => {
    const [prods, allGames, userCount, orderCount, allSettings] = await Promise.all([
      storage.getAllProducts(),
      storage.getAllGames(),
      storage.countUsers(),
      storage.countOrders(),
      storage.getAllSiteSettings(),
    ]);

    const settingsMap: Record<string, string> = Object.fromEntries(allSettings.map((s) => [s.key, s.value]));

    const override = (key: string, realVal: number) => {
      const v = parseInt(settingsMap[key] ?? "0", 10);
      return Number.isFinite(v) && v > 0 ? v : realVal;
    };

    res.json({
      productsCount: override("about_stat_products", prods.length),
      gamesCount: override("about_stat_games", allGames.filter((g) => g.status === "active").length),
      ordersCount: override("about_stat_orders", orderCount),
      usersCount: override("about_stat_users", userCount),
    });
  });

  // ── Public games routes ────────────────────────────────────────────────────
  app.get("/api/games", async (_req, res) => {
    const all = await storage.getAllGames();
    res.json(all.filter((g) => g.status === "active"));
  });

  app.get("/api/games/trending", async (_req, res) => {
    const all = await storage.getTrendingGames();
    res.json(all.filter((g) => g.status === "active"));
  });

  app.get("/api/games/by-slug/:slug", async (req, res) => {
    const g = await storage.getGameBySlug(req.params.slug);
    if (!g) return res.status(404).json({ message: "Not found" });
    res.json(g);
  });

  // ── Plugin player validation ───────────────────────────────────────────────
  app.get("/api/games/:slug/validate", async (req, res) => {
    const g = await storage.getGameBySlug(req.params.slug);
    if (!g) return res.status(404).json({ message: "Game not found" });

    const userId = req.query.userId as string | undefined;
    const serviceId = req.query.serviceId as string | undefined;

    // Derive required fields from the game configuration
    const gameRequiredFields = (g.requiredFields ?? "userId").split(",").map((f: string) => f.trim()).filter(Boolean);
    const gameNeedsZone = gameRequiredFields.includes("zoneId");

    // Only use zoneId if the game is configured to require it
    const zoneId = gameNeedsZone ? (req.query.zoneId as string | undefined) : undefined;

    if (!userId) return res.status(400).json({ message: "userId is required" });
    if (gameNeedsZone && !zoneId) return res.status(400).json({ message: "Zone / Server ID is required for this game" });

    // ── 1. Smile One validation (DB config or env vars) ───────────────────────
    {
      const smileConfig = await storage.getSmileOneConfig();
      const credentials: { uid: string; key: string; email: string; defaultRegion: string } | undefined =
        (smileConfig?.uid && smileConfig?.apiKey && smileConfig?.isActive)
          ? { uid: smileConfig.uid, key: smileConfig.apiKey, email: smileConfig.email ?? "", defaultRegion: smileConfig.region ?? "ph" }
          : undefined; // will fall back to env vars inside the function

      const result = await smileValidatePlayer(
        g.slug,
        { userId, ...(zoneId ? { zoneId } : {}) },
        smileConfig?.region ?? undefined,
        credentials
      );
      if (result.success && "username" in result) {
        const playerName = result.username ?? "";
        if (!playerName) return res.status(400).json({ message: "Player not found. Check your User ID and Zone ID." });
        return res.json({ playerName });
      }
      // Only return the error if it's a real player validation failure (not a config/setup issue)
      const errMsg = (result as any).message ?? "";
      const isConfigError = !errMsg || ["credentials", "not configured", "unsupported game", "unsupported slug", "add it to"].some((kw) => errMsg.toLowerCase().includes(kw));
      if (!isConfigError) {
        return res.status(400).json({ message: errMsg });
      }
      // Config/setup issue — fall through to Busan
    }

    // ── 3. Busan validation ───────────────────────────────────────────────────
    const busanConfig = await storage.getBusanConfig();
    if (busanConfig?.apiToken && busanConfig.isActive) {
      const allBusanMappings = await storage.getAllBusanMappings();

      // Try to find the specific mapping for the selected service first
      let busanProductId: string | undefined;
      if (serviceId) {
        const specificMapping = allBusanMappings.find((m) => m.cmsProductId === serviceId);
        busanProductId = specificMapping?.busanProductId;
      }

      // Fall back to any mapping for this game's services
      if (!busanProductId) {
        const services = await storage.getAllServices(g.id);
        const serviceIds = new Set(services.map((s) => s.id));
        const busanMapping = allBusanMappings.find((m) => serviceIds.has(m.cmsProductId));
        busanProductId = busanMapping?.busanProductId;
      }

      const result = await validateBusanPlayer(
        busanConfig.apiToken,
        busanConfig.apiBaseUrl ?? "https://1gamestopup.com/api/v1",
        userId,
        zoneId,
        busanProductId
      );
      if (result.success) {
        // Return the player's name, or fall back to their userId so the UI can confirm it
        const playerName = result.username || userId;
        return res.json({ playerName });
      }
      // If Busan returned a real player error, surface it
      const busanMsg = result.message ?? "";
      const isBusanConfigIssue =
        busanMsg.toLowerCase().includes("does not support") ||
        busanMsg.toLowerCase().includes("not available") ||
        busanMsg.toLowerCase().includes("timed out") ||
        busanMsg.toLowerCase().includes("unavailable") ||
        busanMsg.toLowerCase().includes("non-json");
      if (!isBusanConfigIssue) {
        return res.status(400).json({ message: busanMsg || "Player not found. Check your User ID and Zone ID." });
      }
      // Fall through to NO_VALIDATOR
    }

    return res.status(400).json({
      message: "Player validation is not configured. Please set up the Busan or Smile.one API in Admin → API Integration.",
      code: "NO_VALIDATOR",
    });
  });

  app.get("/api/games/:id", async (req, res) => {
    const g = await storage.getGame(req.params.id);
    if (!g) return res.status(404).json({ message: "Not found" });
    res.json(g);
  });

  // ── Public services routes ─────────────────────────────────────────────────
  app.get("/api/services", async (req, res) => {
    const gameId = req.query.gameId as string | undefined;
    const all = await storage.getAllServices(gameId);
    res.json(all.filter((s) => s.status === "active"));
  });

  // ── Public campaigns ──────────────────────────────────────────────────────
  app.get("/api/campaigns/active", async (_req, res) => {
    res.json(await storage.getActiveCampaigns());
  });

  // ── Public hero sliders ────────────────────────────────────────────────────
  app.get("/api/hero-sliders/active", async (_req, res) => {
    res.json(await storage.getActiveHeroSliders());
  });

  // ── Helper: Strip sensitive fields from payment methods ────────────────────
  function sanitizePaymentMethod(pm: any) {
    const { secretKey: _sk, webhookSecret: _ws, publicKey: _pk, ...safe } = pm;
    return safe;
  }

  // ── Public payment methods ─────────────────────────────────────────────────
  app.get("/api/payment-methods", async (_req, res) => {
    const all = await storage.getAllPaymentMethods();
    // Return only safe public fields (no keys)
    res.json(
      all
        .filter((p) => p.isActive)
        .map(sanitizePaymentMethod),
    );
  });

  // ── File upload ────────────────────────────────────────────────────────────
  app.use("/uploads", express.static(uploadsDir));
  app.use("/branding", express.static(brandingDir));

  // Dedicated upload for site branding (logo / favicon / pwa_icon). Saves
  // into /public/branding so generic /uploads stays free of brand assets and
  // each new upload replaces the previous file for that kind. Returns a
  // cache-busted URL so the navbar swaps to the new logo right away.
  app.post(
    "/api/admin/upload/branding",
    injectAdminRole,
    requireAdmin,
    brandingUpload.single("file"),
    (req: any, res) => {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const kind = String((req.query?.kind ?? req.body?.kind ?? "")).toLowerCase() as BrandingKind;
      if (!ALLOWED_BRANDING_KINDS.includes(kind)) {
        // Roll back the saved file — kind is required for the cleanup logic.
        try { fs.unlinkSync(req.file.path); } catch {}
        return res.status(400).json({ message: "Invalid branding kind" });
      }
      // Sweep older files for the same kind so we don't accumulate orphans.
      try {
        for (const name of fs.readdirSync(brandingDir)) {
          if (name === req.file.filename) continue;
          if (name.startsWith(`${kind}-`) || name.startsWith(`${kind}.`)) {
            try { fs.unlinkSync(path.join(brandingDir, name)); } catch {}
          }
        }
      } catch {}
      // Bust the SEO HTML cache so the next page load injects the new asset.
      try { invalidateSeoCache(); } catch {}
      const url = `/branding/${req.file.filename}`;
      res.json({ url, kind });
    },
  );

  app.post("/api/admin/upload", injectAdminRole, requireAdmin, upload.single("file"), (req: any, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
  });

  app.delete("/api/admin/upload", injectAdminRole, requireAdmin, (req, res) => {
    const fileUrl = req.body?.url as string | undefined;
    if (!fileUrl) return res.status(400).json({ message: "No url provided" });
    const filename = path.basename(fileUrl);
    const filePath = path.join(uploadsDir, filename);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // ── Auth / login ───────────────────────────────────────────────────────────
  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body ?? {};
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }

    // Check if account is locked due to too many failed attempts
    const lockStatus = await isLoginLocked(username);
    if (lockStatus.locked) {
      return res.status(429).json({
        message: `Too many failed login attempts. Account locked for ${Math.ceil(lockStatus.remaining / 60)} more minute(s).`,
      });
    }

    // Try to find user by username, email, or user ID
    let user = await storage.getUserByUsername(username);
    if (!user) user = await storage.getUserByEmail(username);
    if (!user) user = await storage.getUser(username);

    if (!user) {
      recordFailedLogin(username);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Verify password with bcrypt
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      recordFailedLogin(username);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if ((user as any).isBanned) {
      return res.status(403).json({ message: "Your account has been banned. Please contact support." });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Your account is pending approval. Please wait for an administrator to approve it." });
    }

    resetLoginAttempts(username);
    const { password: _pw, ...safeUser } = user;
    const token = signUserToken({ uid: user.id, role: user.role });
    return res.json({ user: safeUser, token });
  });

  // ── Social OAuth ──────────────────────────────────────────────────────────
  const oauthStates = new Map<string, { provider: string; expiresAt: number }>();
  const socialTokens = new Map<string, { user: Record<string, unknown>; expiresAt: number }>();

  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of oauthStates) { if (now > v.expiresAt) oauthStates.delete(k); }
    for (const [k, v] of socialTokens) { if (now > v.expiresAt) socialTokens.delete(k); }
  }, 60_000);

  async function getSocialPluginConfig(slug: string): Promise<Record<string, string>> {
    try {
      const p = await storage.getPlugin(slug);
      if (!p) return {};
      return JSON.parse(p.config ?? "{}");
    } catch { return {}; }
  }

  function getBaseUrl(req: Request) {
    return `${req.protocol}://${req.get("host")}`;
  }

  app.get("/api/auth/social-providers", async (_req, res) => {
    try {
      const socialLoginSetting = await storage.getSiteSetting("social_login");
      const enabled = socialLoginSetting?.value === "true";
      const [g, fb, dc] = await Promise.all([
        getSocialPluginConfig("social-auth-google"),
        getSocialPluginConfig("social-auth-facebook"),
        getSocialPluginConfig("social-auth-discord"),
      ]);
      return res.json({
        enabled,
        google: enabled && Boolean(g.GOOGLE_CLIENT_ID) && g.ENABLED !== "false",
        facebook: enabled && Boolean(fb.FACEBOOK_APP_ID) && fb.ENABLED !== "false",
        discord: enabled && Boolean(dc.DISCORD_CLIENT_ID) && dc.ENABLED !== "false",
      });
    } catch {
      return res.json({ enabled: false, google: false, facebook: false, discord: false });
    }
  });

  app.get("/api/auth/oauth/:provider", async (req, res) => {
    const { provider } = req.params;
    const baseUrl = getBaseUrl(req);
    const state = randomBytes(16).toString("hex");
    oauthStates.set(state, { provider, expiresAt: Date.now() + 600_000 });

    let authUrl = "";
    if (provider === "google") {
      const cfg = await getSocialPluginConfig("social-auth-google");
      if (!cfg.GOOGLE_CLIENT_ID) return res.status(400).json({ message: "Google OAuth not configured" });
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
        client_id: cfg.GOOGLE_CLIENT_ID,
        redirect_uri: `${baseUrl}/api/auth/oauth/google/callback`,
        response_type: "code",
        scope: "openid email profile",
        state,
      });
    } else if (provider === "facebook") {
      const cfg = await getSocialPluginConfig("social-auth-facebook");
      if (!cfg.FACEBOOK_APP_ID) return res.status(400).json({ message: "Facebook OAuth not configured" });
      authUrl = `https://www.facebook.com/v25.0/dialog/oauth?` + new URLSearchParams({
        client_id: cfg.FACEBOOK_APP_ID,
        redirect_uri: `${baseUrl}/api/auth/oauth/facebook/callback`,
        scope: "email",
        state,
      });
    } else if (provider === "discord") {
      const cfg = await getSocialPluginConfig("social-auth-discord");
      if (!cfg.DISCORD_CLIENT_ID) return res.status(400).json({ message: "Discord OAuth not configured" });
      authUrl = `https://discord.com/oauth2/authorize?` + new URLSearchParams({
        client_id: cfg.DISCORD_CLIENT_ID,
        redirect_uri: `${baseUrl}/api/auth/oauth/discord/callback`,
        response_type: "code",
        scope: "identify email",
        state,
      });
    } else {
      return res.status(400).json({ message: "Unknown provider" });
    }
    return res.redirect(authUrl);
  });

  app.get("/api/auth/oauth/:provider/callback", async (req, res) => {
    const { provider } = req.params;
    const { code, state, error: oauthError } = req.query as Record<string, string>;
    const baseUrl = getBaseUrl(req);

    if (oauthError) return res.redirect(`/login?error=${encodeURIComponent("OAuth sign-in was cancelled")}`);

    const stateEntry = oauthStates.get(state);
    if (!stateEntry || stateEntry.provider !== provider || Date.now() > stateEntry.expiresAt) {
      return res.redirect(`/login?error=${encodeURIComponent("Invalid or expired OAuth state. Please try again.")}`);
    }
    oauthStates.delete(state);

    try {
      let email = "", name = "";

      if (provider === "google") {
        const cfg = await getSocialPluginConfig("social-auth-google");
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code, client_id: cfg.GOOGLE_CLIENT_ID, client_secret: cfg.GOOGLE_CLIENT_SECRET,
            redirect_uri: `${baseUrl}/api/auth/oauth/google/callback`, grant_type: "authorization_code",
          }),
        });
        const td = await tokenRes.json() as any;
        if (!tokenRes.ok) throw new Error(td.error_description || "Google token exchange failed");
        const ud = await (await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${td.access_token}` } })).json() as any;
        email = ud.email; name = ud.name;
      } else if (provider === "facebook") {
        const cfg = await getSocialPluginConfig("social-auth-facebook");
        const tokenRes = await fetch(`https://graph.facebook.com/v25.0/oauth/access_token?` + new URLSearchParams({ client_id: cfg.FACEBOOK_APP_ID, client_secret: cfg.FACEBOOK_APP_SECRET, redirect_uri: `${baseUrl}/api/auth/oauth/facebook/callback`, code }));
        const td = await tokenRes.json() as any;
        if (!tokenRes.ok) throw new Error(td.error?.message || "Facebook token exchange failed");
        const ud = await (await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${td.access_token}`)).json() as any;
        email = ud.email; name = ud.name;
      } else if (provider === "discord") {
        const cfg = await getSocialPluginConfig("social-auth-discord");
        const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code, client_id: cfg.DISCORD_CLIENT_ID, client_secret: cfg.DISCORD_CLIENT_SECRET,
            redirect_uri: `${baseUrl}/api/auth/oauth/discord/callback`, grant_type: "authorization_code",
          }),
        });
        const td = await tokenRes.json() as any;
        if (!tokenRes.ok) throw new Error(td.error_description || "Discord token exchange failed");
        const ud = await (await fetch("https://discord.com/api/users/@me", { headers: { Authorization: `Bearer ${td.access_token}` } })).json() as any;
        email = ud.email; name = ud.global_name || ud.username;
      }

      if (!email) throw new Error("No email returned by provider. Make sure your account has an email address.");

      let user = await storage.getUserByEmail(email);
      if (!user) {
        const emailPrefix = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() || "user";
        let username = emailPrefix;
        const existingByUsername = await storage.getUserByUsername(username);
        if (existingByUsername) username = `${emailPrefix}_${randomBytes(3).toString("hex")}`;

        const randomPassword = randomBytes(16).toString("hex");
        const hashedPassword = await bcrypt.hash(randomPassword, 12);
        const approvalSetting = await storage.getSiteSetting("account_approval");
        const isActive = (approvalSetting?.value ?? "auto") !== "manual";

        user = await storage.createUser({
          username, email, password: hashedPassword,
          fullName: name || emailPrefix,
          isActive, isEmailVerified: true, role: "user",
        } as any);
      } else if (!user.isActive) {
        return res.redirect(`/login?error=${encodeURIComponent("Your account is pending approval by an administrator.")}`);
      }

      const { password: _pw, ...safeUser } = user;
      const token = randomBytes(32).toString("hex");
      socialTokens.set(token, { user: safeUser as any, expiresAt: Date.now() + 60_000 });
      return res.redirect(`/auth/callback?token=${token}`);
    } catch (err: any) {
      return res.redirect(`/login?error=${encodeURIComponent(err.message || "OAuth login failed")}`);
    }
  });

  app.get("/api/auth/social-token", (req, res) => {
    const { token } = req.query as { token: string };
    if (!token) return res.status(400).json({ message: "Token required" });
    const entry = socialTokens.get(token);
    if (!entry || Date.now() > entry.expiresAt) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    socialTokens.delete(token);
    const u = entry.user as { id?: string; role?: string };
    const jwtToken = u?.id ? signUserToken({ uid: u.id, role: u.role }) : undefined;
    return res.json({ user: entry.user, token: jwtToken });
  });

  // ── Forgot password / OTP reset ────────────────────────────────────────────
  const resetRequestTimes = new Map<string, number>(); // userId → last request ms

  function hashOtp(otp: string, userId: string) {
    return createHash("sha256").update(`${otp}:${userId}`).digest("hex");
  }

  app.post("/api/auth/forgot-password", async (req, res) => {
    const { identifier } = req.body ?? {};
    if (!identifier || typeof identifier !== "string" || !identifier.trim()) {
      return res.status(400).json({ message: "Identifier is required" });
    }
    const id = identifier.trim();

    // Find user by username, email, or user ID
    let user = await storage.getUserByUsername(id);
    if (!user) user = await storage.getUserByEmail(id);
    if (!user) user = await storage.getUser(id);

    // Generic response — never reveal if account exists
    const GENERIC = "If an account with that identifier exists, an OTP has been sent to the registered email.";

    if (!user || !user.email) {
      return res.json({ message: GENERIC });
    }

    // Rate limit: max 1 request per 60 seconds per user
    const lastRequest = resetRequestTimes.get(user.id);
    if (lastRequest && Date.now() - lastRequest < 60_000) {
      return res.status(429).json({ message: "Please wait a minute before requesting another OTP." });
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = hashOtp(otp, user.id);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete old tokens for this user and create a new one
    await storage.deletePasswordResetTokensByUserId(user.id);
    const token = await storage.createPasswordResetToken(user.id, otpHash, expiresAt);
    resetRequestTimes.set(user.id, Date.now());

    // Send OTP via email (best-effort)
    (async () => {
      try {
        const [smtpPlugin, template, settings] = await Promise.all([
          storage.getPlugin("smtp-email"),
          storage.getEmailTemplate("otp"),
          storage.getAllSiteSettings(),
        ]);
        const smtpConfig = smtpPlugin?.config ? JSON.parse(smtpPlugin.config) : null;
        const siteObj: Record<string, string> = {};
        settings.forEach((s) => { siteObj[s.key] = s.value ?? ""; });
        const siteName = siteObj.site_name || "Nexcoin";
        const tpl = template ?? DEFAULT_EMAIL_TEMPLATES.find((t) => t.type === "otp");
        if (smtpConfig && tpl) {
          await sendTemplatedEmail({
            to: user!.email!,
            template: tpl as any,
            vars: {
              user_name: user!.fullName || user!.username,
              otp_code: otp,
              site_name: siteName,
              site_url: "",
            },
            siteName,
            smtpConfig,
          });
        } else {
          // Dev fallback: log OTP to console
          console.log(`[ForgotPassword] OTP for ${user!.username} (${user!.email}): ${otp}`);
        }
      } catch (e) {
        console.error("[ForgotPassword] Email send error:", e);
      }
    })();

    return res.json({ message: GENERIC, token_id: token.id });
  });

  app.post("/api/auth/verify-reset-otp", async (req, res) => {
    const { token_id, otp } = req.body ?? {};
    if (!token_id || !otp) {
      return res.status(400).json({ message: "Token ID and OTP are required" });
    }

    const token = await storage.getPasswordResetToken(token_id);
    if (!token) return res.status(400).json({ message: "Invalid or expired OTP" });

    // Check expiry
    if (new Date() > token.expiresAt) {
      await storage.deletePasswordResetTokensByUserId(token.userId);
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    // Check max attempts
    if (token.attempts >= 5) {
      await storage.deletePasswordResetTokensByUserId(token.userId);
      return res.status(400).json({ message: "Too many failed attempts. Please request a new OTP." });
    }

    // Verify OTP
    const inputHash = hashOtp(String(otp).trim(), token.userId);
    if (inputHash !== token.otpHash) {
      await storage.updatePasswordResetToken(token.id, { attempts: token.attempts + 1 });
      const remaining = 5 - (token.attempts + 1);
      return res.status(400).json({ message: `Invalid OTP. ${remaining} attempt(s) remaining.` });
    }

    // OTP valid — generate a one-time reset token
    const resetToken = randomBytes(32).toString("hex");
    const newExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min
    await storage.updatePasswordResetToken(token.id, { resetToken, expiresAt: newExpiry, attempts: 0 });

    return res.json({ reset_token: resetToken });
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    const { reset_token, new_password } = req.body ?? {};
    if (!reset_token || !new_password) {
      return res.status(400).json({ message: "Reset token and new password are required" });
    }
    if (typeof new_password !== "string" || new_password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    // Find token record by resetToken value
    const [tokenRow] = await (async () => {
      // We need a custom query since there's no direct index by resetToken
      // Use the storage layer — query by reset_token via a helper we'll build inline
      const { db } = await import("./db");
      const { passwordResetTokens } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      return db.select().from(passwordResetTokens).where(eq(passwordResetTokens.resetToken, reset_token)).limit(1);
    })();

    if (!tokenRow) return res.status(400).json({ message: "Invalid or expired reset token" });

    // Check expiry
    if (new Date() > tokenRow.expiresAt) {
      await storage.deletePasswordResetTokensByUserId(tokenRow.userId);
      return res.status(400).json({ message: "Reset token has expired. Please request a new OTP." });
    }

    // Hash password and update
    const hashedPassword = await bcrypt.hash(new_password, 10);
    await storage.updateUser(tokenRow.userId, { password: hashedPassword });
    await storage.deletePasswordResetTokensByUserId(tokenRow.userId);
    resetRequestTimes.delete(tokenRow.userId);

    return res.json({ message: "Password updated successfully. You can now log in with your new password." });
  });

  app.post("/api/auth/register", async (req, res) => {
    const regSetting = await storage.getSiteSetting("user_registration");
    if (regSetting?.value === "false") {
      return res.status(403).json({ message: "Registration is currently disabled." });
    }
    const { username, email, password, fullName } = req.body ?? {};
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password required" });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }
    const existing = await storage.getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ message: "Username already taken" });
    }
    try {
      // Account approval setting: 'manual' means new users start inactive until admin approves
      const approvalSetting = await getSetting("account_approval", "auto");
      const isActive = approvalSetting !== "manual";

      // Hash password with bcrypt
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ username, email, password: hashedPassword, fullName, role: "user", isActive });
      const { password: _pw, ...safeUser } = user;

      // Create admin notification only if notif_new_user is enabled
      const notifNewUser = await getSetting("notif_new_user", "true");
      if (notifNewUser !== "false") {
        storage.createNotification({ type: "user", title: "New User Registered", message: `${username} just created an account.` }).catch(() => {});
      }

      // Send welcome email only if email_notifications is enabled
      const emailNotifEnabled = await getSetting("email_notifications", "true");
      if (email && emailNotifEnabled !== "false") {
        (async () => {
          try {
            const [smtpPlugin, template, settings] = await Promise.all([
              storage.getPlugin("smtp-email"),
              storage.getEmailTemplate("welcome"),
              storage.getAllSiteSettings(),
            ]);
            const smtpConfig = smtpPlugin?.config ? JSON.parse(smtpPlugin.config) : null;
            const siteObj: Record<string, string> = {};
            settings.forEach((s) => { siteObj[s.key] = s.value ?? ""; });
            const siteName = siteObj.site_name || "WebCMS";
            const tpl = template ?? DEFAULT_EMAIL_TEMPLATES.find((t) => t.type === "welcome");
            if (smtpConfig && tpl) {
              await sendTemplatedEmail({
                to: email,
                template: tpl as any,
                vars: { user_name: fullName || username, user_email: email, site_name: siteName, site_url: "" },
                siteName,
                smtpConfig,
              });
            }
          } catch {}
        })();
      }

      if (!isActive) {
        return res.status(201).json({ user: safeUser, pending: true, message: "Account created. Awaiting admin approval before you can log in." });
      }
      const token = signUserToken({ uid: user.id, role: user.role });
      return res.status(201).json({ user: safeUser, token });
    } catch (e: any) {
      return res.status(400).json({ message: e.message });
    }
  });

  // ── User middleware ─────────────────────────────────────────────────────────
  // Identity is verified from a signed JWT in the Authorization header.
  // Falls back to nothing — clients without a valid token receive 401 and the
  // global query handler redirects to login.
  async function requireUser(req: any, res: any, next: any) {
    const token = extractBearerToken(req.headers["authorization"] as string | undefined);
    const claims = token ? verifyUserToken(token) : null;
    if (!claims) {
      return res.status(401).json({ message: "Unauthorized — please sign in again" });
    }
    const user = await storage.getUser(claims.uid);
    if (!user) return res.status(401).json({ message: "User not found" });
    if ((user as any).isBanned) {
      return res.status(403).json({ message: "Your account has been banned." });
    }
    req.currentUser = user;
    next();
  }

  // ── User profile & orders ───────────────────────────────────────────────────
  // Return the current user record (without password). Used by the account page
  // to detect a pending deletion and show the cancel banner.
  app.get("/api/user", requireUser, async (req: any, res) => {
    const { password: _pw, ...safeUser } = req.currentUser;
    res.json(safeUser);
  });

  app.get("/api/user/orders", requireUser, async (req: any, res) => {
    try {
      const userOrders = await storage.getOrdersByUser(req.currentUser.id);
      const ordersWithItems = await Promise.all(
        userOrders.map(async (order) => {
          const items = await storage.getOrderItemsByOrder(order.id);
          return { ...order, items };
        })
      );
      res.json(ordersWithItems);
    } catch (err: any) {
      console.error("[user/orders]", err?.message);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.patch("/api/user/profile", requireUser, async (req: any, res) => {
    try {
      const { fullName, email, phone } = req.body ?? {};
      const updated = await storage.updateUser(req.currentUser.id, { fullName, email, phone });
      if (!updated) return res.status(404).json({ message: "User not found" });
      const { password: _pw, ...safeUser } = updated;
      res.json({ user: safeUser });
    } catch (err: any) {
      console.error("[user/profile]", err?.message);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post("/api/user/change-password", requireUser, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body ?? {};
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password required" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "New password must be at least 8 characters" });
      }
      const passwordMatch = await bcrypt.compare(currentPassword, req.currentUser.password);
      if (!passwordMatch) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(req.currentUser.id, { password: hashedPassword });
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[user/change-password]", err?.message);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // Soft-delete: schedules the account for permanent deletion in 72h.
  // The user can log back in within that window and cancel via /api/user/cancel-deletion.
  app.delete("/api/user/delete", requireUser, async (req: any, res) => {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: "Password is required to delete account" });
    }
    if (!(await bcrypt.compare(password, req.currentUser.password))) {
      return res.status(401).json({ message: "Invalid password" });
    }
    const scheduledAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    await storage.updateUser(req.currentUser.id, { deletionScheduledAt: scheduledAt } as any);
    res.json({
      ok: true,
      deletionScheduledAt: scheduledAt.toISOString(),
      message: "Your account is scheduled for permanent deletion in 72 hours. Log back in within that window to cancel.",
    });
  });

  // Cancel a pending account deletion (only allowed by the account owner).
  app.post("/api/user/cancel-deletion", requireUser, async (req: any, res) => {
    if (!req.currentUser?.deletionScheduledAt) {
      return res.status(400).json({ message: "No pending deletion to cancel" });
    }
    await storage.updateUser(req.currentUser.id, { deletionScheduledAt: null } as any);
    res.json({ ok: true, message: "Account deletion cancelled" });
  });

  // ── User-facing Support Tickets ────────────────────────────────────────────
  app.post("/api/tickets", async (req: any, res) => {
    const { subject, message, category, priority } = req.body;
    if (!subject?.trim() || !message?.trim()) {
      return res.status(400).json({ message: "Subject and message are required" });
    }
    const userId = req.currentUser?.id ?? req.body.userId ?? null;
    const ticket = await storage.createTicket({
      userId,
      subject: subject.trim(),
      message: message.trim(),
      category: category?.trim() || null,
      priority: priority || "medium",
    } as any);
    res.status(201).json(ticket);
  });

  app.get("/api/tickets", requireUser, async (req: any, res) => {
    const userTickets = await storage.getUserTickets(req.currentUser.id);
    res.json(userTickets);
  });

  app.get("/api/tickets/:id", requireUser, async (req: any, res) => {
    const ticket = await storage.getTicket(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    const isOwner = ticket.userId === req.currentUser.id;
    const isAdminOrStaff = ["super_admin", "admin", "staff"].includes(req.currentUser.role);
    if (!isOwner && !isAdminOrStaff) return res.status(403).json({ message: "Forbidden" });
    if (ticket.status === "closed" && !isAdminOrStaff) return res.status(403).json({ message: "This ticket is closed" });
    const replies = await storage.getTicketReplies(req.params.id);
    res.json({ ...ticket, replies });
  });

  app.post("/api/tickets/:id/reply", requireUser, attachmentUpload.single("attachment"), async (req: any, res) => {
    const ticket = await storage.getTicket(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    const isOwner = ticket.userId === req.currentUser.id;
    const isAdminOrStaff = ["super_admin", "admin", "staff"].includes(req.currentUser.role);
    if (!isOwner && !isAdminOrStaff) return res.status(403).json({ message: "Forbidden" });
    if (!req.body.message?.trim()) return res.status(400).json({ message: "Message is required" });
    const attachmentUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const reply = await storage.replyToTicket(
      req.params.id,
      req.currentUser.id,
      req.body.message.trim(),
      isAdminOrStaff,
      attachmentUrl,
    );
    if (ticket.status === "closed" || ticket.status === "resolved") {
      await storage.updateTicketStatus(req.params.id, "open");
    }
    res.status(201).json(reply);
  });

  app.patch("/api/tickets/:id/status", requireUser, async (req: any, res) => {
    const ticket = await storage.getTicket(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    const isAdminOrStaff = ["super_admin", "admin", "staff"].includes(req.currentUser.role);
    if (!isAdminOrStaff) return res.status(403).json({ message: "Forbidden" });
    const updated = await storage.updateTicketStatus(req.params.id, req.body.status);
    res.json(updated);
  });

  // ── Dashboard stats ────────────────────────────────────────────────────────
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const range = (req.query.range as string) || "all";
      const now = new Date();
      let from: Date | undefined;
      let to: Date | undefined;

      if (range !== "all") {
        const allSettings = await storage.getAllSiteSettings();
        const tz = (allSettings.find(s => s.key === "site_timezone")?.value) || "UTC";

        function boundaryInTz(timezone: string, endOfDay: boolean): Date {
          const parts = new Intl.DateTimeFormat("en-US", {
            timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
          }).formatToParts(now);
          const get = (t: string) => parseInt(parts.find((p) => p.type === t)!.value);
          const y = get("year"), mo = get("month") - 1, d = get("day");
          const h = get("hour") % 24, mi = get("minute"), s = get("second");
          const tzOffsetMs = Date.UTC(y, mo, d, h, mi, s) - now.getTime();
          return endOfDay
            ? new Date(Date.UTC(y, mo, d, 23, 59, 59, 999) - tzOffsetMs)
            : new Date(Date.UTC(y, mo, d, 0, 0, 0) - tzOffsetMs);
        }

        to = boundaryInTz(tz, true);

        if (range === "today") {
          from = boundaryInTz(tz, false);
        } else if (range === "7days") {
          from = new Date(now); from.setDate(now.getDate() - 6); from.setHours(0, 0, 0, 0);
        } else if (range === "30days") {
          from = new Date(now); from.setDate(now.getDate() - 29); from.setHours(0, 0, 0, 0);
        } else if (range === "6months") {
          from = new Date(now); from.setMonth(now.getMonth() - 5); from.setDate(1); from.setHours(0, 0, 0, 0);
        } else if (range === "12months") {
          from = new Date(now); from.setFullYear(now.getFullYear() - 1); from.setDate(1); from.setHours(0, 0, 0, 0);
        } else if (range === "custom" && req.query.from && req.query.to) {
          from = new Date(req.query.from as string);
          to = new Date(req.query.to as string); to.setHours(23, 59, 59, 999);
        }
      }

      const stats = await storage.getDashboardStats(from, to);
      res.json(stats);
    } catch (err: any) {
      console.error("[Stats] Error:", err?.message ?? err);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // ── Page View Tracking ─────────────────────────────────────────────────────
  app.post("/api/analytics/track", async (req: any, res) => {
    const { id, sessionId, path: pagePath, referrer, deviceType } = req.body;
    if (!id || !sessionId || !pagePath) return res.status(400).json({ ok: false });
    if (pagePath.startsWith("/admin")) return res.json({ ok: true });
    await storage.trackPageView({ id, sessionId, path: pagePath, referrer, deviceType }).catch(() => {});
    res.json({ ok: true });
  });

  app.post("/api/analytics/duration", async (req: any, res) => {
    const { id, durationMs, isBounce } = req.body;
    if (!id || durationMs == null) return res.status(400).json({ ok: false });
    await storage.updatePageViewDuration(id, durationMs, !!isBounce).catch(() => {});
    res.json({ ok: true });
  });

  app.get("/api/admin/analytics/site", requireAdmin, async (req, res) => {
    const range = (req.query.range as string) || "30days";
    const allSettings = await storage.getAllSiteSettings();
    const settingsMap: Record<string, string> = {};
    allSettings.forEach(s => { settingsMap[s.key] = s.value ?? ""; });

    // Try GA4 if credentials are configured
    const gaPropertyId = settingsMap.ga_property_id?.trim();
    const gaCredentials = settingsMap.ga_service_account_json?.trim();
    if (gaPropertyId && gaCredentials) {
      try {
        const { getGA4Analytics } = await import("./services/googleAnalytics");
        const data = await getGA4Analytics(gaPropertyId, gaCredentials, range);
        return res.json(data);
      } catch (err: any) {
        console.error("[GA4] Error fetching analytics:", err.message);
        // Fall through to built-in analytics
      }
    }

    // Built-in fallback
    const now = new Date();
    let fromDate: Date;
    if (range === "today") { fromDate = new Date(now); fromDate.setHours(0, 0, 0, 0); }
    else if (range === "7days") fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    else if (range === "90days") fromDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    else fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const siteTimezone = settingsMap.site_timezone || "UTC";
    const [data, live] = await Promise.all([
      storage.getAnalyticsOverview(fromDate, now, siteTimezone),
      storage.getLiveTraffic(),
    ]);
    res.json({ ...data, ...live, _source: "built_in" });
  });

  // ── Analytics (time-series for charts) ────────────────────────────────────
  app.get("/api/admin/analytics", requireAdmin, async (req, res) => {
    try {
      const range = (req.query.range as string) || "12months";
      const now = new Date();
      let from: Date;
      let groupBy: "hour" | "day" | "week" | "month" = "month";

      // Fetch the configured site timezone so chart labels display in the admin's timezone
      const allSettings = await storage.getAllSiteSettings();
      const settingsMap: Record<string, string> = {};
      allSettings.forEach(s => { settingsMap[s.key] = s.value ?? ""; });
      const siteTimezone = settingsMap.site_timezone || "UTC";

      // Returns the start of today (midnight) in the given IANA timezone, as a UTC Date
      function startOfDayInTz(tz: string): Date {
        const parts = new Intl.DateTimeFormat("en-US", {
          timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
        }).formatToParts(now);
        const get = (t: string) => parseInt(parts.find((p) => p.type === t)!.value);
        const y = get("year"), mo = get("month") - 1, d = get("day");
        const h = get("hour") % 24, mi = get("minute"), s = get("second");
        const tzOffsetMs = Date.UTC(y, mo, d, h, mi, s) - now.getTime();
        return new Date(Date.UTC(y, mo, d, 0, 0, 0) - tzOffsetMs);
      }

      // Returns end of day in the site timezone (23:59:59.999 local → UTC)
      function endOfDayInTz(tz: string): Date {
        const parts = new Intl.DateTimeFormat("en-US", {
          timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
        }).formatToParts(now);
        const get = (t: string) => parseInt(parts.find((p) => p.type === t)!.value);
        const y = get("year"), mo = get("month") - 1, d = get("day");
        const h = get("hour") % 24, mi = get("minute"), s = get("second");
        const tzOffsetMs = Date.UTC(y, mo, d, h, mi, s) - now.getTime();
        return new Date(Date.UTC(y, mo, d, 23, 59, 59, 999) - tzOffsetMs);
      }

      if (range === "custom" && req.query.from && req.query.to) {
        from = new Date(req.query.from as string);
        const to = new Date(req.query.to as string);
        to.setHours(23, 59, 59, 999);
        const days = Math.round((to.getTime() - from.getTime()) / 86400000);
        groupBy = days <= 1 ? "hour" : days <= 60 ? "day" : days <= 180 ? "week" : "month";
        const data = await storage.getAnalytics(from, to, groupBy, siteTimezone);
        return res.json(data);
      }

      if (range === "today") {
        from = startOfDayInTz(siteTimezone); groupBy = "hour";
      } else if (range === "7days") {
        from = new Date(now); from.setDate(now.getDate() - 6); from.setHours(0, 0, 0, 0); groupBy = "day";
      } else if (range === "30days") {
        from = new Date(now); from.setDate(now.getDate() - 29); from.setHours(0, 0, 0, 0); groupBy = "day";
      } else if (range === "6months") {
        from = new Date(now); from.setMonth(now.getMonth() - 5); from.setDate(1); from.setHours(0, 0, 0, 0); groupBy = "month";
      } else {
        from = new Date(now); from.setFullYear(now.getFullYear() - 1); from.setDate(1); from.setHours(0, 0, 0, 0); groupBy = "month";
      }

      const to = endOfDayInTz(siteTimezone);
      const data = await storage.getAnalytics(from, to, groupBy, siteTimezone);
      res.json(data);
    } catch (err: any) {
      console.error("[Analytics] Error:", err?.message ?? err);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // ── Admin Games ────────────────────────────────────────────────────────────
  app.get("/api/admin/games", requireAdmin, async (_req, res) => {
    res.json(await storage.getAllGames());
  });

  app.post("/api/admin/games", requireAdmin, async (req, res) => {
    try {
      const g = await storage.createGame(req.body);
      res.status(201).json(g);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/admin/games/:id", requireAdmin, async (req, res) => {
    const g = await storage.updateGame(req.params.id, req.body);
    if (!g) return res.status(404).json({ message: "Not found" });
    res.json(g);
  });

  app.patch("/api/admin/games/:id", requireAdmin, async (req, res) => {
    const g = await storage.updateGame(req.params.id, req.body);
    if (!g) return res.status(404).json({ message: "Not found" });
    res.json(g);
  });

  app.delete("/api/admin/games/:id", requireAdmin, async (req, res) => {
    await storage.deleteGame(req.params.id);
    res.json({ ok: true });
  });

  // ── Admin Services ─────────────────────────────────────────────────────────
  app.get("/api/admin/services", requireAdmin, async (req, res) => {
    const gameId = req.query.gameId as string | undefined;
    res.json(await storage.getAllServices(gameId));
  });

  app.post("/api/admin/services", requireAdmin, async (req, res) => {
    try {
      const s = await storage.createService(req.body);
      res.status(201).json(s);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.put("/api/admin/services/:id", requireAdmin, async (req, res) => {
    const s = await storage.updateService(req.params.id, req.body);
    if (!s) return res.status(404).json({ message: "Not found" });
    res.json(s);
  });

  app.patch("/api/admin/services/:id", requireAdmin, async (req, res) => {
    const s = await storage.updateService(req.params.id, req.body);
    if (!s) return res.status(404).json({ message: "Not found" });
    res.json(s);
  });

  app.delete("/api/admin/services/:id", requireAdmin, async (req, res) => {
    await storage.deleteService(req.params.id);
    res.json({ ok: true });
  });

  // ── Users ──────────────────────────────────────────────────────────────────
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const result = await storage.getAllUsers(limit, offset);
    res.json(result.map(({ password: _p, ...u }) => u));
  });

  app.post("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const user = await storage.createUser(req.body);
      const { password: _p, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/admin/users/:id", requireAdmin, async (req, res) => {
    const user = await storage.updateUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ message: "Not found" });
    const { password: _p, ...safeUser } = user;
    res.json(safeUser);
  });

  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    await storage.deleteUser(req.params.id);
    res.json({ ok: true });
  });

  // ── Products ───────────────────────────────────────────────────────────────
  app.get("/api/admin/products", requireAdmin, async (_req, res) => {
    res.json(await storage.getAllProducts());
  });

  app.post("/api/admin/products", requireAdmin, async (req, res) => {
    try {
      const p = await storage.createProduct(req.body);
      res.status(201).json(p);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/admin/products/:id", requireAdmin, async (req, res) => {
    const p = await storage.updateProduct(req.params.id, req.body);
    if (!p) return res.status(404).json({ message: "Not found" });
    res.json(p);
  });

  app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
    await storage.deleteProduct(req.params.id);
    res.json({ ok: true });
  });

  app.get("/api/admin/products/:id/packages", requireAdmin, async (req, res) => {
    res.json(await storage.getProductPackages(req.params.id));
  });

  app.post("/api/admin/products/:id/packages", requireAdmin, async (req, res) => {
    try {
      const pkg = await storage.createProductPackage({ ...req.body, productId: req.params.id });
      res.status(201).json(pkg);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/admin/products/:id/packages/:pkgId", requireAdmin, async (req, res) => {
    const pkg = await storage.updateProductPackage(req.params.pkgId, req.body);
    if (!pkg) return res.status(404).json({ message: "Not found" });
    res.json(pkg);
  });

  app.delete("/api/admin/products/:id/packages/:pkgId", requireAdmin, async (req, res) => {
    await storage.deleteProductPackage(req.params.pkgId);
    res.json({ ok: true });
  });

  // ── Orders ─────────────────────────────────────────────────────────────────
  app.get("/api/admin/orders", requireAdmin, async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    res.json(await storage.getAllOrders(limit, offset));
  });

  app.patch("/api/admin/orders/:id/status", requireAdmin, async (req, res) => {
    const newStatus: string = req.body.status;
    const existing = await storage.getOrderById(req.params.id);
    const o = await storage.updateOrderStatus(req.params.id, newStatus);
    if (!o) return res.status(404).json({ message: "Not found" });
    res.json(o);

    // After responding, trigger fulfillment + confirmation email for completed orders
    if (newStatus === "completed") {
      handleOrderCompleted(req.params.id).catch((err) =>
        console.error("[admin/orders/status] handleOrderCompleted error:", err)
      );
    }

    // Record a refund transaction when order is marked as refunded
    if (newStatus === "refunded" && existing) {
      storage.createRefundTransaction(existing).catch((err) =>
        console.error("[admin/orders/status] createRefundTransaction error:", err)
      );
    }
  });

  app.patch("/api/admin/orders/:id/delivery", requireAdmin, async (req, res) => {
    const { deliveryStatus, deliveryNote } = req.body;
    await storage.updateOrderDelivery(req.params.id, deliveryStatus, deliveryNote);
    res.json({ ok: true });
  });

  // Admin "Mark Delivered" — manually closes out an order after verifying
  // fulfillment with the provider (e.g. Liogames orders that come back with a
  // pending/processing state). Does not re-trigger any provider call.
  app.post("/api/admin/orders/:id/mark-delivered", requireAdmin, async (req, res) => {
    const { note } = (req.body ?? {}) as { note?: string };
    const order = await storage.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "completed") {
      return res.status(400).json({
        message: "Payment must be completed before the order can be marked delivered.",
      });
    }
    const stamp = `Manually marked delivered by admin at ${new Date().toISOString()}${note ? ` — ${note}` : ""}`;
    const combinedNote = order.deliveryNote ? `${order.deliveryNote}\n${stamp}` : stamp;
    await storage.updateOrderDelivery(req.params.id, "delivered", combinedNote);
    sendOrderSuccessEmail(req.params.id).catch((e) =>
      console.error("[mark-delivered] order_success email error:", e)
    );
    res.json({ ok: true, deliveryStatus: "delivered" });
  });

  // Manual fulfillment trigger — used by the admin "Deliver order" button.
  // Only allowed when payment is completed; auto-delivery never runs on
  // pending/cancelled/failed/refunded orders.
  app.post("/api/admin/orders/:id/deliver", requireAdmin, async (req, res) => {
    const order = await storage.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "completed") {
      return res.status(400).json({
        message: "Order payment must be completed before delivery can be attempted.",
      });
    }
    try {
      await fulfillBusanOrder(req.params.id);
      const updated = await storage.getOrderById(req.params.id);
      res.json({ ok: true, deliveryStatus: updated?.deliveryStatus ?? null });
    } catch (err: any) {
      console.error("[admin/orders/deliver] error:", err);
      res.status(500).json({ message: err?.message || "Delivery failed" });
    }
  });

  // ── Transactions ───────────────────────────────────────────────────────────
  app.get("/api/admin/transactions", requireAdmin, async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    res.json(await storage.getAllTransactions(limit, offset));
  });

  app.get("/api/admin/transactions/refunds", requireAdmin, async (_req, res) => {
    res.json(await storage.getRefundedOrders());
  });


  // ── Coupons ────────────────────────────────────────────────────────────────
  app.get("/api/admin/coupons", requireAdmin, async (_req, res) => {
    res.json(await storage.getAllCoupons());
  });

  app.post("/api/admin/coupons", requireAdmin, async (req, res) => {
    try {
      const c = await storage.createCoupon(req.body);
      res.status(201).json(c);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/admin/coupons/:id", requireAdmin, async (req, res) => {
    const c = await storage.updateCoupon(req.params.id, req.body);
    if (!c) return res.status(404).json({ message: "Not found" });
    res.json(c);
  });

  app.delete("/api/admin/coupons/:id", requireAdmin, async (req, res) => {
    await storage.deleteCoupon(req.params.id);
    res.json({ ok: true });
  });

  // ── Coupon Validation (public) ─────────────────────────────────────────────
  app.post("/api/coupons/validate", async (req, res) => {
    try {
      const { code, amount } = req.body;
      if (!code || typeof code !== "string") {
        return res.status(400).json({ valid: false, message: "Coupon code is required" });
      }

      const coupon = await storage.getCouponByCode(code.trim());

      if (!coupon) {
        return res.status(404).json({ valid: false, message: "Coupon code not found" });
      }

      if (!coupon.isActive) {
        return res.status(400).json({ valid: false, message: "This coupon is no longer active" });
      }

      // Expiry check
      if (coupon.expiresAt && new Date() > new Date(coupon.expiresAt)) {
        return res.status(400).json({ valid: false, message: "This coupon has expired" });
      }

      // Usage limit check
      if (coupon.maxUses !== null && coupon.maxUses !== undefined && coupon.usedCount >= coupon.maxUses) {
        return res.status(400).json({ valid: false, message: `Usage limit reached — this coupon has been used ${coupon.usedCount} time(s) and is no longer available` });
      }

      // Minimum order amount check
      const orderAmount = parseFloat(String(amount || 0));
      const minAmount = coupon.minOrderAmount ? parseFloat(String(coupon.minOrderAmount)) : 0;
      if (minAmount > 0 && orderAmount < minAmount) {
        return res.status(400).json({
          valid: false,
          message: `Minimum order amount of ₹${minAmount.toFixed(2)} required to use this coupon (your cart: ₹${orderAmount.toFixed(2)})`,
        });
      }

      // Calculate discount
      const discountValue = parseFloat(String(coupon.discountValue));
      let discountAmount = 0;
      if (coupon.discountType === "percentage") {
        discountAmount = Math.min(orderAmount, (orderAmount * discountValue) / 100);
      } else {
        discountAmount = Math.min(orderAmount, discountValue);
      }
      discountAmount = Math.round(discountAmount * 100) / 100;

      return res.json({
        valid: true,
        couponId: coupon.id,
        discountType: coupon.discountType,
        discountValue,
        discountAmount,
        description: coupon.description || null,
        message: coupon.discountType === "percentage"
          ? `${discountValue}% off applied`
          : `₹${discountAmount.toFixed(2)} off applied`,
      });
    } catch (err: any) {
      console.error("Coupon validate error:", err);
      res.status(500).json({ valid: false, message: "Could not validate coupon. Try again." });
    }
  });

  // ── Tickets ────────────────────────────────────────────────────────────────
  app.get("/api/admin/tickets", requireAdmin, async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    res.json(await storage.getAllTickets(limit, offset));
  });

  app.get("/api/admin/tickets/:id", requireAdmin, async (req, res) => {
    const t = await storage.getTicket(req.params.id);
    if (!t) return res.status(404).json({ message: "Not found" });
    const replies = await storage.getTicketReplies(req.params.id);
    res.json({ ...t, replies });
  });

  app.patch("/api/admin/tickets/:id/status", requireAdmin, async (req, res) => {
    const t = await storage.updateTicketStatus(req.params.id, req.body.status);
    if (!t) return res.status(404).json({ message: "Not found" });
    if (req.body.status === "closed") {
      try {
        const attachmentUrls = await storage.clearTicketAttachments(req.params.id);
        for (const url of attachmentUrls) {
          const filename = path.basename(url);
          const filePath = path.join(uploadsDir, filename);
          fs.unlink(filePath, () => {});
        }
      } catch (_) {}
    }
    res.json(t);
  });

  app.post("/api/admin/tickets/:id/reply", requireAdmin, attachmentUpload.single("attachment"), async (req: any, res) => {
    const ticket = await storage.getTicket(req.params.id);
    const attachmentUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
    const reply = await storage.replyToTicket(req.params.id, req.body.userId, req.body.message, true, attachmentUrl);
    res.status(201).json(reply);
    // Send email notification only if email_notifications is enabled
    if (ticket) {
      (async () => {
        try {
          const emailNotifEnabled = await getSetting("email_notifications", "true");
          if (emailNotifEnabled === "false") return;
          const ticketUser = ticket.userId ? await storage.getUser(ticket.userId) : null;
          if (!ticketUser?.email) return;
          const [smtpPlugin, template, settings] = await Promise.all([
            storage.getPlugin("smtp-email"),
            storage.getEmailTemplate("support_ticket_reply"),
            storage.getAllSiteSettings(),
          ]);
          const smtpConfig = smtpPlugin?.config ? JSON.parse(smtpPlugin.config) : null;
          const siteObj: Record<string, string> = {};
          settings.forEach((s) => { siteObj[s.key] = s.value ?? ""; });
          const siteName = siteObj.site_name || "WebCMS";
          const tpl = template ?? DEFAULT_EMAIL_TEMPLATES.find((t) => t.type === "support_ticket_reply");
          if (smtpConfig && tpl) {
            await sendTemplatedEmail({
              to: ticketUser.email,
              template: tpl as any,
              vars: {
                user_name: ticketUser.fullName || ticketUser.username,
                user_email: ticketUser.email,
                ticket_id: ticket.ticketNumber || ticket.id.slice(0, 8),
                ticket_subject: ticket.subject,
                reply_message: req.body.message,
                site_name: siteName,
                site_url: "",
                support_email: siteObj.contact_email || "",
              },
              siteName,
              smtpConfig,
            });
          }
        } catch {}
      })();
    }
  });

  // ── Admin Hero Sliders ─────────────────────────────────────────────────────
  app.get("/api/admin/hero-sliders", requireAdmin, async (_req, res) => {
    res.json(await storage.getAllHeroSliders());
  });

  app.post("/api/admin/hero-sliders", requireAdmin, async (req, res) => {
    const s = await storage.createHeroSlider(req.body);
    res.status(201).json(s);
  });

  app.patch("/api/admin/hero-sliders/:id", requireAdmin, async (req, res) => {
    const s = await storage.updateHeroSlider(req.params.id, req.body);
    if (!s) return res.status(404).json({ message: "Not found" });
    res.json(s);
  });

  app.delete("/api/admin/hero-sliders/:id", requireAdmin, async (req, res) => {
    await storage.deleteHeroSlider(req.params.id);
    res.json({ ok: true });
  });

  // ── Campaigns ──────────────────────────────────────────────────────────────
  app.get("/api/admin/campaigns", requireAdmin, async (_req, res) => {
    res.json(await storage.getAllCampaigns());
  });

  app.post("/api/admin/campaigns", requireAdmin, async (req, res) => {
    const c = await storage.createCampaign(req.body);
    res.status(201).json(c);
  });

  app.patch("/api/admin/campaigns/:id", requireAdmin, async (req, res) => {
    const c = await storage.updateCampaign(req.params.id, req.body);
    if (!c) return res.status(404).json({ message: "Not found" });
    res.json(c);
  });

  app.delete("/api/admin/campaigns/:id", requireAdmin, async (req, res) => {
    await storage.deleteCampaign(req.params.id);
    res.json({ ok: true });
  });

  // ── Reviews ────────────────────────────────────────────────────────────────
  app.get("/api/admin/reviews", requireAdmin, async (_req, res) => {
    res.json(await storage.getAllReviews());
  });

  app.patch("/api/admin/reviews/:id/approve", requireAdmin, async (req, res) => {
    const r = await storage.updateReviewApproval(req.params.id, req.body.approved);
    if (!r) return res.status(404).json({ message: "Not found" });
    res.json(r);
  });

  app.delete("/api/admin/reviews/:id", requireAdmin, async (req, res) => {
    await storage.deleteReview(req.params.id);
    res.json({ ok: true });
  });

  // ── Available payment types (public) ──────────────────────────────────────
  app.get("/api/payment-types", async (_req, res) => {
    try {
      const all = await storage.getActivePaymentMethods();
      const typeMap: Record<string, { label: string; providers: string[] }> = {
        UPI: { label: "UPI", providers: [] },
        CARD: { label: "Card", providers: [] },
        NETBANKING: { label: "Net Banking", providers: [] },
        WALLET: { label: "Wallet", providers: [] },
      };
      for (const m of all) {
        const pt = (m as any).paymentType || "CARD";
        if (typeMap[pt]) typeMap[pt].providers.push(m.type);
      }
      const available = Object.entries(typeMap)
        .filter(([, v]) => v.providers.length > 0)
        .map(([key, v]) => ({ key, label: v.label, providerCount: v.providers.length }));
      res.json(available);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Payment Methods ────────────────────────────────────────────────────────
  app.get("/api/admin/payment-methods", requireAdmin, async (_req, res) => {
    const all = await storage.getAllPaymentMethods();
    // Return sanitized data (no actual secret values) for admin
    res.json(all.map(sanitizePaymentMethod));
  });

  app.post("/api/admin/payment-methods", requireAdmin, async (req, res) => {
    const p = await storage.createPaymentMethod(req.body);
    // Sync manual_upi config into upi_settings table for the email poller
    if (req.body.type === "manual_upi") {
      try {
        const cfg = typeof req.body.config === "string" ? JSON.parse(req.body.config) : (req.body.config || {});
        await storage.upsertUpiSettings({
          upiId: cfg.upiId || undefined,
          qrCodeUrl: cfg.qrCodeUrl || undefined,
          emailAddress: cfg.emailAddress || undefined,
          emailPassword: cfg.emailPassword || undefined,
          imapHost: cfg.imapHost || "imap.gmail.com",
          imapPort: cfg.imapPort ? parseInt(cfg.imapPort) : 993,
          imapLabel: cfg.imapLabel || "INBOX",
          isActive: req.body.isActive !== false,
        });
      } catch {}
    }
    res.status(201).json(sanitizePaymentMethod(p));
  });

  app.patch("/api/admin/payment-methods/:id", requireAdmin, async (req, res) => {
    const p = await storage.updatePaymentMethod(req.params.id, req.body);
    if (!p) return res.status(404).json({ message: "Not found" });
    // Sync manual_upi config into upi_settings table for the email poller
    if (p.type === "manual_upi") {
      try {
        const cfg = typeof p.config === "string" ? JSON.parse(p.config) : (p.config || {});
        await storage.upsertUpiSettings({
          upiId: (cfg as any).upiId || undefined,
          qrCodeUrl: (cfg as any).qrCodeUrl || undefined,
          emailAddress: (cfg as any).emailAddress || undefined,
          emailPassword: (cfg as any).emailPassword || undefined,
          imapHost: (cfg as any).imapHost || "imap.gmail.com",
          imapPort: (cfg as any).imapPort ? parseInt((cfg as any).imapPort) : 993,
          imapLabel: (cfg as any).imapLabel || "INBOX",
          isActive: p.isActive,
        });
      } catch {}
    }
    res.json(sanitizePaymentMethod(p));
  });

  app.put("/api/admin/payment-methods/:id", requireAdmin, async (req, res) => {
    const p = await storage.updatePaymentMethod(req.params.id, req.body);
    if (!p) return res.status(404).json({ message: "Not found" });
    // Sync manual_upi config into upi_settings table for the email poller
    if (p.type === "manual_upi") {
      try {
        const cfg = typeof p.config === "string" ? JSON.parse(p.config) : (p.config || {});
        await storage.upsertUpiSettings({
          upiId: (cfg as any).upiId || undefined,
          qrCodeUrl: (cfg as any).qrCodeUrl || undefined,
          emailAddress: (cfg as any).emailAddress || undefined,
          emailPassword: (cfg as any).emailPassword || undefined,
          imapHost: (cfg as any).imapHost || "imap.gmail.com",
          imapPort: (cfg as any).imapPort ? parseInt((cfg as any).imapPort) : 993,
          imapLabel: (cfg as any).imapLabel || "INBOX",
          isActive: p.isActive,
        });
      } catch {}
    }
    res.json(sanitizePaymentMethod(p));
  });

  app.delete("/api/admin/payment-methods/:id", requireAdmin, async (req, res) => {
    await storage.deletePaymentMethod(req.params.id);
    res.json({ ok: true });
  });

  // ── Admin Plugins ──────────────────────────────────────────────────────────

  // List all plugins
  app.get("/api/admin/plugins", requireAdmin, async (_req, res) => {
    res.json(await storage.getAllPlugins());
  });

  // Update plugin metadata (upsert) — used by ControlPanel/ApiIntegration for SMTP/social auth config
  app.put("/api/admin/plugins/:slug", requireAdmin, async (req, res) => {
    const p = await storage.upsertPlugin(req.params.slug, req.body);
    res.json(p);
  });

  // ── Admin Games trending toggle ────────────────────────────────────────────
  app.patch("/api/admin/games/:id/trending", requireAdmin, async (req, res) => {
    const g = await storage.getGame(req.params.id);
    if (!g) return res.status(404).json({ message: "Not found" });
    const updated = await storage.updateGame(req.params.id, { isTrending: !g.isTrending });
    res.json(updated);
  });

  // ── Notifications ──────────────────────────────────────────────────────────
  app.get("/api/admin/notifications", requireAdmin, async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 30;
    res.json(await storage.getAllNotifications(limit));
  });

  app.get("/api/admin/notifications/unread-count", requireAdmin, async (_req, res) => {
    const count = await storage.getUnreadNotificationCount();
    res.json({ count });
  });

  app.post("/api/admin/notifications", requireAdmin, async (req, res) => {
    const n = await storage.createNotification(req.body);
    res.status(201).json(n);
  });

  app.patch("/api/admin/notifications/:id/read", requireAdmin, async (req, res) => {
    await storage.markNotificationRead(req.params.id);
    res.json({ ok: true });
  });

  app.patch("/api/admin/notifications/read-all", requireAdmin, async (_req, res) => {
    await storage.markAllNotificationsRead();
    res.json({ ok: true });
  });

  app.delete("/api/admin/notifications/clear-all", requireAdmin, async (_req, res) => {
    await storage.clearAllNotifications();
    res.json({ ok: true });
  });

  // ── Email Templates ────────────────────────────────────────────────────────

  // Helper: get SMTP config from plugins
  async function getSmtpConfig() {
    const plugin = await storage.getPlugin("smtp-email");
    if (!plugin || !plugin.config) return null;
    try { return JSON.parse(plugin.config) as Record<string, string>; } catch { return null; }
  }

  // Helper: get email template with defaults
  async function getEmailTemplateWithDefault(type: string) {
    const stored = await storage.getEmailTemplate(type);
    if (stored) return stored;
    const def = DEFAULT_EMAIL_TEMPLATES.find((t) => t.type === type);
    return def ?? null;
  }

  // List all templates (return stored + defaults for missing ones)
  app.get("/api/admin/email-templates", requireAdmin, async (_req, res) => {
    const stored = await storage.getAllEmailTemplates();
    const storedByType = Object.fromEntries(stored.map((t) => [t.type, t]));
    const all = DEFAULT_EMAIL_TEMPLATES.map((def) => storedByType[def.type] ?? { ...def, id: "", createdAt: new Date(), updatedAt: new Date() });
    res.json(all);
  });

  // Get single template
  app.get("/api/admin/email-templates/:type", requireAdmin, async (req, res) => {
    const template = await getEmailTemplateWithDefault(req.params.type);
    if (!template) return res.status(404).json({ message: "Template not found" });
    res.json(template);
  });

  // Save (upsert) template
  app.put("/api/admin/email-templates/:type", requireAdmin, async (req: Request, res: Response) => {
    try {
      const { type } = req.params;
      const allowed = DEFAULT_EMAIL_TEMPLATES.map((t) => t.type);
      if (!allowed.includes(type)) return res.status(400).json({ message: "Unknown template type" });
      const template = await storage.upsertEmailTemplate(type, { ...req.body, type });
      res.json(template);
    } catch (err: any) {
      console.error("[EmailTemplates] Save failed:", err);
      res.status(500).json({ message: err?.message || "Failed to save template" });
    }
  });

  // Preview template HTML
  app.post("/api/admin/email-templates/:type/preview", requireAdmin, async (req: Request, res: Response) => {
    const { type } = req.params;
    const templateData = req.body;
    const siteSettings = await storage.getAllSiteSettings();
    const siteObj: Record<string, string> = {};
    siteSettings.forEach((s) => { siteObj[s.key] = s.value ?? ""; });
    const siteName = siteObj.site_name || "WebCMS";
    const vars: Record<string, string> = {
      user_name: "John Doe",
      user_email: "john@example.com",
      user_id: "USR-000123",
      otp_code: "123456",
      order_id: "ORD-20260401",
      order_amount: "25.00",
      order_currency: "$",
      order_date: new Date().toLocaleDateString(),
      order_time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      order_status: "Confirmed",
      payment_method: "Online Payment",
      product_name: "Mobile Legends Diamonds",
      product_quantity: "1",
      game_name: "Mobile Legends: Bang Bang",
      player_id: "262918936",
      zone_id: "9398",
      site_name: siteName,
      site_url: "https://yoursite.com",
      support_email: siteObj.contact_email || "support@example.com",
      ticket_id: "TKT-00042",
      ticket_subject: "Issue with my order",
      reply_message: "Thank you for contacting us. We have resolved your issue.",
    };
    const html = buildEmailHtml(templateData, vars, siteName);
    res.send(html);
  });

  // Send test email
  app.post("/api/admin/email-templates/:type/test", requireAdmin, async (req: Request, res: Response) => {
    const { type } = req.params;
    const { to } = req.body;
    if (!to) return res.status(400).json({ message: "Recipient email required" });

    const smtpConfig = await getSmtpConfig();
    if (!smtpConfig) return res.status(400).json({ message: "SMTP not configured. Go to API Integration and configure SMTP Email Service first." });

    // Validate SMTP config has required fields
    if (!smtpConfig.SMTP_HOST || !smtpConfig.SMTP_PORT || !smtpConfig.SMTP_USER || !smtpConfig.SMTP_PASS) {
      return res.status(400).json({ message: "SMTP configuration incomplete. All fields are required: Host, Port, Username, Password." });
    }

    const template = await getEmailTemplateWithDefault(type);
    if (!template) return res.status(404).json({ message: "Template not found" });

    const siteSettings = await storage.getAllSiteSettings();
    const siteObj: Record<string, string> = {};
    siteSettings.forEach((s) => { siteObj[s.key] = s.value ?? ""; });
    const siteName = siteObj.site_name || "WebCMS";

    console.log(`[EmailTest] Sending test email to ${to} using SMTP at ${smtpConfig.SMTP_HOST}:${smtpConfig.SMTP_PORT}`);
    
    const result = await sendTemplatedEmail({
      to,
      template: template as any,
      vars: {
        user_name: "Test User",
        user_email: to,
        user_id: "USR-000123",
        otp_code: "123456",
        order_id: "ORD-20260401",
        order_amount: "25.00",
        order_currency: "$",
        order_date: new Date().toLocaleDateString(),
        order_time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        order_status: "Confirmed",
        payment_method: "Online Payment",
        product_name: "Mobile Legends Diamonds",
        product_quantity: "1",
        game_name: "Mobile Legends: Bang Bang",
        player_id: "262918936",
        zone_id: "9398",
        site_name: siteName,
        site_url: "",
        support_email: siteObj.contact_email || "support@example.com",
        ticket_id: "TKT-00042",
        ticket_subject: "Test Ticket",
        reply_message: "This is a test reply from the admin.",
      },
      siteName,
      smtpConfig: smtpConfig as any,
    });

    if (!result.ok) {
      console.error(`[EmailTest] Failed:`, result.error);
      return res.status(500).json({ message: result.error || "Failed to send test email. Check server logs for details." });
    }
    console.log(`[EmailTest] Success: Email sent to ${to}`);
    res.json({ ok: true, message: `Test email sent to ${to}` });
  });

  // ── Fees Management ────────────────────────────────────────────────────────
  app.get("/api/admin/fees", requireAdmin, async (_req, res) => {
    const allFees = await storage.getAllFees();
    res.json(allFees);
  });

  app.post("/api/admin/fees", requireAdmin, async (req, res) => {
    const result = insertFeeSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: "Invalid fee data" });
    const fee = await storage.createFee(result.data);
    res.status(201).json(fee);
  });

  app.patch("/api/admin/fees/:id", requireAdmin, async (req, res) => {
    const fee = await storage.updateFee(req.params.id, req.body);
    if (!fee) return res.status(404).json({ message: "Fee not found" });
    res.json(fee);
  });

  app.delete("/api/admin/fees/:id", requireAdmin, async (req, res) => {
    await storage.deleteFee(req.params.id);
    res.json({ ok: true });
  });

  // ── Site Settings ──────────────────────────────────────────────────────────
  app.get("/api/admin/settings", requireAdmin, async (_req, res) => {
    const rows = await storage.getAllSiteSettings();
    const obj: Record<string, string> = {};
    rows.forEach((r) => { obj[r.key] = r.value ?? ""; });
    res.json(obj);
  });

  app.put("/api/admin/settings", requireAdmin, async (req, res) => {
    await storage.upsertSiteSettings(req.body);
    invalidateSeoCache();
    res.json({ ok: true });
  });

  // ── Multi-Gateway Payment System ──────────────────────────────────────────

  function getBaseUrl(req: Request): string {
    const proto = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.get("host");
    return `${proto}://${host}`;
  }

  // Initiate payment for any gateway (supports paymentType-based routing + failover)
  app.post("/api/payment/initiate", async (req, res) => {
    try {
      const { gatewayId, paymentType, amount, currency = "INR", email = "guest@checkout.com", name, phone, productInfo, cartItems, couponCode } = req.body;

      if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

      const activePaymentMethods = await storage.getActivePaymentMethods();

      // Build ordered list of methods to try
      let methodsToTry: typeof activePaymentMethods = [];
      if (gatewayId) {
        const m = activePaymentMethods.find(m => m.id === gatewayId);
        if (m) methodsToTry = [m];
      } else if (paymentType) {
        methodsToTry = activePaymentMethods
          .filter(m => ((m as any).paymentType || "CARD") === paymentType)
          .sort((a, b) => a.sortOrder - b.sortOrder);
      } else {
        methodsToTry = activePaymentMethods.slice(0, 1);
      }

      if (methodsToTry.length === 0) return res.status(400).json({ error: "No active payment gateway found for the selected method" });

      const baseUrl = getBaseUrl(req);
      const orderId = randomUUID();

      // Persist order to DB once (before trying gateways)
      try {
        await storage.createOrder({
          id: orderId,
          orderNumber: generateOrderNumber(),
          totalAmount: String(amount),
          currency,
          notes: cartItems ? JSON.stringify(cartItems) : undefined,
          status: "pending",
        });
        if (Array.isArray(cartItems)) {
          for (const item of cartItems) {
            await storage.createOrderItem({
              orderId,
              productId: item.productId,
              packageId: item.packageId,
              productTitle: item.productTitle || item.packageName || "Order",
              packageLabel: item.packageName,
              quantity: item.quantity || 1,
              unitPrice: String(item.price || 0),
              totalPrice: String((item.price || 0) * (item.quantity || 1)),
            });
          }
        }
        // Increment coupon usage count if a valid coupon was applied
        if (couponCode) {
          const coupon = await storage.getCouponByCode(couponCode).catch(() => null);
          if (coupon) {
            await storage.incrementCouponUsage(coupon.id).catch(() => {});
          }
        }
      } catch (dbErr) {
        console.warn("Order DB persist warning:", dbErr);
      }

      // Try each method in priority order (failover)
      let lastError = "No gateway succeeded";
      for (const method of methodsToTry) {
        try {
          // manual_upi is handled via /api/upi/initiate — inline the same logic here so the
          // generic initiate route works when the frontend falls through to it.
          if (method.type === "manual_upi") {
            const upiSettings = await storage.getUpiSettings();
            if (!upiSettings?.isActive || !upiSettings.upiId) {
              lastError = "UPI payment is not configured or inactive"; continue;
            }
            const orderNumber = generateOrderNumber();
            return res.json({
              success: true,
              type: "upi",
              orderId,
              internalOrderId: orderId,
              orderNumber,
              upiId: upiSettings.upiId,
              amount,
              currency,
              expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
              gatewayType: "manual_upi",
              gatewayId: method.id,
            });
          }

          const handler = getGatewayHandler(method.type);
          if (!handler) { lastError = `Unsupported gateway: ${method.type}`; continue; }

          const result = await handler.initiatePayment(
            {
              orderId,
              amount,
              currency,
              name: name || email,
              email,
              phone,
              productInfo: productInfo || "Nexcoin Order",
              callbackUrl: `${baseUrl}/api/payment/callback/${method.type}`,
              returnUrl: `${baseUrl}/payment-return`,
            },
            method
          );

          // Keep gateway-specific orderId (e.g. Razorpay's order_id) as gatewayOrderId,
          // and expose our internal UUID as internalOrderId so the frontend can pass it back to verify.
          const { orderId: gatewayOrderId, ...restResult } = result as any;
          return res.json({
            ...restResult,
            orderId: gatewayOrderId,       // gateway's own order ID (used by Razorpay modal)
            internalOrderId: orderId,       // our internal UUID (sent back in verify for fulfillment)
            gatewayType: method.type,
            gatewayId: method.id,
          });
        } catch (err: any) {
          lastError = err.message || `Gateway ${method.type} failed`;
          console.warn(`Gateway ${method.type} failed, trying next:`, lastError);
        }
      }

      res.status(500).json({ error: lastError });
    } catch (error: any) {
      console.error("Payment initiate error:", error);
      res.status(500).json({ error: error.message || "Failed to initiate payment" });
    }
  });

  // ── Helper: fulfill an order across all top-up providers ────────────────────
  // Per-item provider routing: look up which mapping table contains the
  // CMS package id and dispatch to the matching upstream (Busan / Liogames /
  // Smile.one). One order may mix providers across items.
  async function fulfillOrder(orderId: string): Promise<void> {
    try {
      const order = await storage.getOrderById(orderId);
      if (!order) return;

      // Parse notes — stored as { payerName, items: [...] } since the UPI initiate refactor
      let cartItems: any[] = [];
      if (order.notes) {
        try {
          const parsed = JSON.parse(order.notes);
          cartItems = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.items) ? parsed.items : []);
        } catch { cartItems = []; }
      }

      if (cartItems.length === 0) {
        await storage.updateOrderDelivery(orderId, "not_applicable");
        return;
      }

      // Parse previous delivery responses (if any) so a re-run only retries
      // items that haven't succeeded yet. Successful entries are preserved.
      let priorResponses: any[] = [];
      if (order.deliveryNote) {
        try {
          const parsed = JSON.parse(order.deliveryNote);
          if (Array.isArray(parsed)) priorResponses = parsed;
        } catch { /* note wasn't JSON — ignore */ }
      }
      const alreadyDelivered = new Set(
        priorResponses.filter((r) => r && r.success).map((r) => String(r.cmsProduct))
      );

      // Load all provider configs once
      const [busanConfig, lioConfig, smileConfig] = await Promise.all([
        storage.getBusanConfig().catch(() => undefined),
        storage.getLioGamesConfig().catch(() => undefined),
        storage.getSmileOneConfig().catch(() => undefined),
      ]);

      let lastError = "";
      let anyMappingFound = false;
      // Start with the previously-successful responses so per-item history is preserved
      const deliveryResponses: any[] = priorResponses.filter((r) => r && r.success);

      for (const item of cartItems) {
        const cmsId = item.packageId || item.productId;
        if (!cmsId) continue;
        if (alreadyDelivered.has(String(cmsId))) {
          // Skip — this item was already delivered in a previous attempt
          anyMappingFound = true;
          continue;
        }

        // Look up all three mappings in parallel; first hit wins. Wrap each
        // call in an async IIFE so a SYNCHRONOUS throw (e.g. the storage
        // method being missing on an older deploy) is caught by the inner
        // catch instead of rejecting the whole Promise.all and crashing
        // every other provider's delivery.
        const safeLookup = <T>(fn: () => Promise<T>): Promise<T | undefined> =>
          (async () => {
            try { return await fn(); } catch { return undefined; }
          })();
        const [busanMap, lioMap, smileMap] = await Promise.all([
          safeLookup(() => storage.getBusanMappingByCmsProductId(cmsId)),
          safeLookup(() => storage.getLioGamesMappingByCmsProductId(cmsId)),
          safeLookup(() => storage.getSmileOneMappingByCmsProductId(cmsId)),
        ]);

        const playerId = item.playerId || item.userId || "";
        const zoneId = item.zoneId || "";
        const qty = Number(item.quantity) || 1;

        // ── Busan ────────────────────────────────────────────────────────
        if (busanMap) {
          anyMappingFound = true;
          if (!busanConfig?.apiToken || !busanConfig.isActive) {
            lastError = "Busan provider not configured/active";
            deliveryResponses.push({ cmsProduct: cmsId, provider: "busan", success: false, message: lastError });
            continue;
          }
          const result = await createBusanOrder(
            busanConfig.apiToken!,
            busanConfig.apiBaseUrl ?? "https://1gamestopup.com/api/v1",
            {
              productId: busanMap.busanProductId,
              playerId,
              zoneId: zoneId || undefined,
              currency: busanConfig.currency ?? "INR",
            }
          );
          console.log(`[Busan] order ${orderId} product ${busanMap.busanProductId}:`, result);
          deliveryResponses.push({
            cmsProduct: cmsId,
            provider: "busan",
            busanProduct: busanMap.busanProductId,
            playerId, zoneId: zoneId || null,
            ...result,
          });
          if (!result.success)
          lastError = result.message ?? "Busan top-up failed";
          continue;
        }

        // ── Liogames ─────────────────────────────────────────────────────
        if (lioMap) {
          anyMappingFound = true;
          if (!lioConfig?.memberCode || !lioConfig?.secret || !lioConfig.isActive) {
            lastError = "Liogames provider not configured/active";
            deliveryResponses.push({ cmsProduct: cmsId, provider: "liogames", success: false, message: lastError });
            continue;
          }
          const partnerRef = `${order.orderNumber || orderId}-${cmsId}`.slice(0, 64);
          const payload: Record<string, unknown> = {
            member_code: lioConfig.memberCode,
            partner_ref: partnerRef,
            product_id: lioMap.lioProductId,
            qty,
            player: {
              player_id: playerId,
              ...(zoneId ? { server_id: zoneId } : {}),
            },
          };
          if (lioMap.lioVariationId) payload.variation_id = lioMap.lioVariationId;
          const result = await createLiogamesOrder(payload, {
            memberCode: lioConfig.memberCode,
            secret: lioConfig.secret,
            baseUrl: lioConfig.baseUrl ?? undefined,
          });
          console.log(`[Liogames] order ${orderId} product ${lioMap.lioProductId}:`, result);
          // Liogames returns a `result` field that can be "success", "pending",
          // "processing", "failed", etc. Only treat an explicit "success" as a
          // delivered item; treat ambiguous/in-progress states as PENDING so the
          // admin can verify with the provider and use "Mark Delivered" or
          // "Mark Failed" rather than auto-completing prematurely.
          const lioResult = String(result.data?.result ?? "").toLowerCase();
          const lioStatus = String(result.data?.status ?? "").toLowerCase();
          const isSuccess = !!result.ok && lioResult === "success";
          const isFailed = !result.ok || lioResult === "failed" || lioStatus === "failed";
          const isPending = !isSuccess && !isFailed;
          deliveryResponses.push({
            cmsProduct: cmsId,
            provider: "liogames",
            lioProduct: lioMap.lioProductId,
            lioVariation: lioMap.lioVariationId ?? null,
            playerId, zoneId: zoneId || null,
            partnerRef,
            success: isSuccess,
            pending: isPending,
            message: result.message,
            data: result.data,
          });
          if (isFailed) lastError = result.message ?? "Liogames order failed";
          continue;
        }

        // ── Smile.one ────────────────────────────────────────────────────
        if (smileMap) {
          anyMappingFound = true;
          const smileCreds = await resolveSmileCredentials();
          if (!smileConfig?.isActive || !smileCreds) {
            lastError = "Smile.one provider not configured/active";
            deliveryResponses.push({ cmsProduct: cmsId, provider: "smileone", success: false, message: lastError });
            continue;
          }
          const userInput: Record<string, string> = { user_id: playerId };
          if (zoneId) userInput.zone_id = zoneId;
          const result = await smileCreatePurchase(
            smileMap.gameSlug,
            smileMap.smileProductId,
            userInput,
            smileMap.region || smileConfig.region,
            smileCreds,
          );
          console.log(`[Smile.one] order ${orderId} product ${smileMap.smileProductId}:`, result);
          deliveryResponses.push({
            cmsProduct: cmsId,
            provider: "smileone",
            smileProduct: smileMap.smileProductId,
            gameSlug: smileMap.gameSlug,
            region: smileMap.region || smileConfig.region,
            playerId, zoneId: zoneId || null,
            ...result,
          });
          if (!result.success)
          lastError = (result as any).message ?? "Smile.one purchase failed";
          continue;
        }

        console.log(`[fulfillOrder] No provider mapping for package ${cmsId} in order ${orderId}`);
      }

      const noteJson = deliveryResponses.length > 0 ? JSON.stringify(deliveryResponses) : undefined;

      // Build the set of cmsProductIds that need delivery (had a mapping for some provider)
      // and the set that ended up successful after this run. If all needed items succeeded
      // → delivered. Otherwise → failed (so the admin can retry just the missing ones).
      const successIds = new Set(
        deliveryResponses.filter((r) => r && r.success).map((r) => String(r.cmsProduct))
      );
      const itemsNeedingDelivery = new Set<string>();
      // Re-walk cart to know which items had any provider mapping at all
      // (we already collected anyMappingFound above; here we recount to drive status).
      // Items skipped via alreadyDelivered are also "needing delivery" historically.
      for (const item of cartItems) {
        const cmsId = item.packageId || item.productId;
        if (!cmsId) continue;
        if (alreadyDelivered.has(String(cmsId)) || deliveryResponses.some((r) => String(r.cmsProduct) === String(cmsId))) {
          itemsNeedingDelivery.add(String(cmsId));
        }
      }

      if (!anyMappingFound) {
        await storage.updateOrderDelivery(orderId, "not_applicable");
      } else {
        const pendingIds = new Set(
          deliveryResponses.filter((r) => r && (r as any).pending).map((r) => String(r.cmsProduct))
        );
        const allDelivered = [...itemsNeedingDelivery].every((id) => successIds.has(id));
        const anyFailed = [...itemsNeedingDelivery].some(
          (id) => !successIds.has(id) && !pendingIds.has(id)
        );
        if (allDelivered) {
          await storage.updateOrderDelivery(orderId, "delivered", noteJson);
          sendOrderSuccessEmail(orderId).catch((e) =>
            console.error("[fulfillOrder] order_success email error:", e)
          );
        } else if (!anyFailed) {
          // No outright failures — provider hasn't given a terminal answer yet.
          // Leave the order in pending so the admin can verify and either
          // "Mark Delivered" or "Mark Failed" from the orders dashboard.
          await storage.updateOrderDelivery(
            orderId,
            "pending",
            noteJson ?? "Awaiting provider confirmation",
          );
        } else {
          await storage.updateOrderDelivery(orderId, "failed", noteJson ?? (lastError || "Some items failed to deliver"));
        }
      }
    } catch (err) {
      console.error("[fulfillOrder] error:", err);
      await storage.updateOrderDelivery(orderId, "failed", String(err));
    }
  }

  // Backwards-compat alias — older callers still reference fulfillBusanOrder
  const fulfillBusanOrder = fulfillOrder;

  // ── Shared order-completion handler ──────────────────────────────────────────
  // Called from every payment confirmation path. Runs Busan fulfillment then
  // fires the customer confirmation email. Always non-blocking at call sites.
  async function sendOrderConfirmationEmail(orderId: string): Promise<void> {
    try {
      const o = await storage.getOrderById(orderId);
      if (!o?.userId) return; // guest orders — no email address available

      const [user, smtpConfig, template, settings] = await Promise.all([
        storage.getUser(o.userId),
        getSmtpConfig(),
        getEmailTemplateWithDefault("order_confirmation"),
        storage.getAllSiteSettings(),
      ]);
      if (!user?.email || !smtpConfig || !template) return;

      const siteObj: Record<string, string> = {};
      settings.forEach((s) => { siteObj[s.key] = s.value ?? ""; });
      const siteName = siteObj.site_name || "Nexcoin";

      let cartItems: any[] = [];
      try {
        const parsed = o.notes ? JSON.parse(o.notes) : null;
        cartItems = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.items) ? parsed.items : []);
      } catch {}
      const firstItem = cartItems[0];
      const now = new Date();

      await sendTemplatedEmail({
        to: user.email,
        template: template as any,
        cc: (template as any).copyEmail ?? undefined,
        vars: {
          user_name: user.fullName || user.username,
          user_email: user.email,
          user_id: user.id,
          order_id: o.orderNumber,
          order_amount: `${o.currency === "INR" ? "₹" : "$"}${Number(o.totalAmount).toFixed(2)}`,
          order_currency: o.currency,
          order_date: now.toLocaleDateString(),
          order_time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          order_status: "Confirmed",
          payment_method: o.paymentMethod ?? "Manual",
          game_name: firstItem?.productTitle ?? "",
          product_name: firstItem?.packageName ?? firstItem?.productTitle ?? "",
          product_quantity: String(firstItem?.quantity ?? 1),
          player_id: firstItem?.userId ?? firstItem?.playerId ?? "",
          zone_id: firstItem?.zoneId ?? "",
          site_name: siteName,
          site_url: siteObj.site_url || "",
          support_email: siteObj.contact_email || "",
        },
        siteName,
        smtpConfig,
      });
    } catch (emailErr) {
      console.error("[handleOrderCompleted] Confirmation email error:", emailErr);
    }
  }

  // Sends the "Order Success" email after delivery is confirmed (auto or manual).
  async function sendOrderSuccessEmail(orderId: string): Promise<void> {
    try {
      const o = await storage.getOrderById(orderId);
      if (!o?.userId) return;

      const [user, smtpConfig, template, settings] = await Promise.all([
        storage.getUser(o.userId),
        getSmtpConfig(),
        getEmailTemplateWithDefault("order_success"),
        storage.getAllSiteSettings(),
      ]);
      if (!user?.email || !smtpConfig || !template) return;
      if (!(template as any).isEnabled) return;

      const siteObj: Record<string, string> = {};
      settings.forEach((s) => { siteObj[s.key] = s.value ?? ""; });
      const siteName = siteObj.site_name || "Nexcoin";

      let cartItems: any[] = [];
      try {
        const parsed = o.notes ? JSON.parse(o.notes) : null;
        cartItems = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.items) ? parsed.items : []);
      } catch {}
      const firstItem = cartItems[0];
      const now = new Date();

      await sendTemplatedEmail({
        to: user.email,
        template: template as any,
        cc: (template as any).copyEmail ?? undefined,
        vars: {
          user_name: user.fullName || user.username,
          user_email: user.email,
          user_id: user.id,
          order_id: o.orderNumber,
          order_amount: `${o.currency === "INR" ? "₹" : "$"}${Number(o.totalAmount).toFixed(2)}`,
          order_currency: o.currency,
          order_date: now.toLocaleDateString(),
          order_time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          order_status: "Delivered",
          payment_method: o.paymentMethod ?? "Manual",
          game_name: firstItem?.productTitle ?? "",
          product_name: firstItem?.packageName ?? firstItem?.productTitle ?? "",
          product_quantity: String(firstItem?.quantity ?? 1),
          player_id: firstItem?.userId ?? firstItem?.playerId ?? "",
          zone_id: firstItem?.zoneId ?? "",
          site_name: siteName,
          site_url: siteObj.site_url || "",
          support_email: siteObj.contact_email || "",
        },
        siteName,
        smtpConfig,
      });
    } catch (emailErr) {
      console.error("[sendOrderSuccessEmail] error:", emailErr);
    }
  }

  async function decrementOrderStock(orderId: string): Promise<void> {
    try {
      const order = await storage.getOrderById(orderId);
      if (!order) return;

      let cartItems: any[] = [];
      if (order.notes) {
        try {
          const parsed = JSON.parse(order.notes);
          cartItems = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.items) ? parsed.items : []);
        } catch { cartItems = []; }
      }

      for (const item of cartItems) {
        const qty = item.quantity || 1;
        try {
          if (item.serviceId) {
            await storage.decrementServiceStock(item.serviceId, qty);
          } else if (item.packageId) {
            await storage.decrementPackageStock(item.packageId, qty);
          }
        } catch (_e) { /* non-fatal per item */ }
      }
    } catch (err) {
      console.error("[handleOrderCompleted] Stock decrement error:", err);
    }
  }

  async function handleOrderCompleted(orderId: string): Promise<void> {
    await fulfillBusanOrder(orderId);
    await decrementOrderStock(orderId);
    await sendOrderConfirmationEmail(orderId);
  }

  // Verify payment (used by modal gateways like Razorpay and for polling)
  app.post("/api/payment/verify", async (req, res) => {
    try {
      const { gatewayId, internalOrderId, ...params } = req.body;

      const activePaymentMethods = await storage.getActivePaymentMethods();
      let method = gatewayId
        ? activePaymentMethods.find(m => m.id === gatewayId)
        : activePaymentMethods.find(m => m.type === "razorpay");

      // Backward compat: if Razorpay fields present and no gatewayId
      if (!method && params.razorpay_payment_id) {
        method = activePaymentMethods.find(m => m.type === "razorpay");
      }

      if (!method) {
        // Try env-based Razorpay fallback
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = params;
        if (razorpay_order_id && razorpay_payment_id && razorpay_signature) {
          const keySecret = process.env.RAZORPAY_KEY_SECRET;
          if (!keySecret) return res.status(400).json({ success: false, error: "No gateway configured" });
          const body = razorpay_order_id + "|" + razorpay_payment_id;
          const expected = createHmac("sha256", keySecret).update(body).digest("hex");
          if (expected === razorpay_signature) {
            if (internalOrderId) {
              await storage.updateOrderStatus(internalOrderId, "completed").catch(() => {});
              handleOrderCompleted(internalOrderId).catch(() => {});
            }
            return res.json({ success: true });
          }
          return res.status(400).json({ success: false, error: "Signature mismatch" });
        }
        return res.status(400).json({ success: false, error: "No matching gateway found" });
      }

      const handler = getGatewayHandler(method.type);
      if (!handler) return res.status(400).json({ success: false, error: "Unsupported gateway" });

      const result = await handler.verifyPayment(params, method);

      // After successful verification, mark order complete and trigger fulfillment + email
      if (result.success && internalOrderId) {
        await storage.updateOrderStatus(internalOrderId, "completed").catch(() => {});
        handleOrderCompleted(internalOrderId).catch(() => {});
      }

      res.json(result);
    } catch (error: any) {
      console.error("Payment verify error:", error);
      res.status(500).json({ success: false, error: error.message || "Verification failed" });
    }
  });

  // Callback endpoint for redirect gateways (POST from gateway server)
  app.post("/api/payment/callback/:gatewayType", async (req, res) => {
    try {
      const { gatewayType } = req.params;
      const activePaymentMethods = await storage.getActivePaymentMethods();
      const method = activePaymentMethods.find(m => m.type === gatewayType);

      if (!method) return res.status(400).send("Gateway not found");

      const handler = getGatewayHandler(gatewayType);
      if (!handler) return res.status(400).send("Unsupported gateway");

      const result = await handler.verifyPayment(req.body, method);
      console.log(`Payment callback [${gatewayType}]:`, result);

      if (result.success) {
        // Try to extract orderId from the result or from common callback body fields
        const callbackOrderId =
          result.orderId ||
          req.body.order_id ||
          req.body.txnid ||
          req.body.merchantOrderId ||
          req.body.udf1 ||
          null;

        if (callbackOrderId) {
          await storage.updateOrderStatus(callbackOrderId, "completed").catch(() => {});
          handleOrderCompleted(callbackOrderId).catch(() => {});
        }
      }

      res.status(200).send("OK");
    } catch (error: any) {
      console.error("Payment callback error:", error);
      res.status(500).send("Error");
    }
  });

  // ── XYZPay Webhook Handler ────────────────────────────────────────────────────
  app.post("/api/xyzpay/webhook", async (req, res) => {
    try {
      const { order_id, status } = req.body;
      
      if (!order_id) {
        return res.status(400).json({ error: "Missing order_id" });
      }

      // Fetch the order to verify amount
      const order = await storage.getOrderById(order_id);
      if (!order) {
        console.error(`XYZPay webhook: Order not found - ${order_id}`);
        return res.status(404).json({ error: "Order not found" });
      }

      // Get XYZPay payment method for status verification
      const xyzpayMethod = await storage.getPaymentMethodByType("xyzpay");
      if (xyzpayMethod && xyzpayMethod.secretKey) {
        // Verify payment status with XYZPay API
        const formData = new URLSearchParams();
        formData.append("user_token", xyzpayMethod.secretKey);
        formData.append("order_id", order_id);

        const response = await fetch("https://www.xyzpay.site/api/check-order-status", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString(),
        });

        const data = await response.json();
        
        if (data.result?.txnStatus === "COMPLETED") {
          await storage.updateOrderStatus(order_id, "completed");
          console.log(`XYZPay payment confirmed for order: ${order_id}`);
          handleOrderCompleted(order_id).catch((err) =>
            console.error("[XYZPay] handleOrderCompleted error:", err)
          );
          return res.json({ success: true, message: "Payment verified and order updated" });
        }
      }

      return res.json({ success: false, message: "Payment verification failed" });
    } catch (error: any) {
      console.error("XYZPay webhook error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ── Smile.one Admin Config & Mappings ─────────────────────────────────────────

  app.get("/api/admin/smileone/config", requireAdmin, async (_req, res) => {
    try {
      const config = await storage.getSmileOneConfig();
      return res.json(config ?? null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  });

  app.post("/api/admin/smileone/config", requireAdmin, async (req, res) => {
    try {
      const { uid, apiKey, licenseKey, region, email, isActive } = req.body as Record<string, any>;
      const config = await storage.upsertSmileOneConfig({ 
        uid, 
        apiKey, 
        licenseKey, 
        region: region || "global", 
        email,
        isActive: isActive !== false,
      });
      return res.json(config);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  });

  app.post("/api/admin/smileone/test-connection", requireAdmin, async (req, res) => {
    try {
      const { uid, apiKey, email, region } = req.body as Record<string, string>;
      if (!uid || !apiKey || !email) {
        return res.status(400).json({ success: false, message: "uid, apiKey and email are required" });
      }
      const ts = Math.floor(Date.now() / 1000);
      const baseUrl = region === "global" || !region
        ? "https://www.smile.one/merchant/"
        : `https://www.smile.one/${region}/merchant/`;
      const signParams: Record<string, unknown> = { uid, email, time: ts };
      const sign = smileMakeSign(signParams, apiKey);
      const body = new URLSearchParams({ uid, email, time: String(ts), sign });
      const apiRes = await fetch(`${baseUrl}getbalance`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: AbortSignal.timeout(10000),
      });
      const text = await apiRes.text();
      let data: Record<string, unknown>;
      try { data = JSON.parse(text); } catch { return res.status(502).json({ success: false, message: "Invalid response from Smile.one API", raw: text.slice(0, 200) }); }
      const code = Number(data.code ?? data.status ?? -1);
      if (code === 200 || code === 0 || data.success === true) {
        const balance = data.balance ?? data.amount ?? data.data ?? null;
        return res.json({ success: true, message: "Connection successful", balance });
      }
      const errMsg = typeof data.msg === "string" ? data.msg : typeof data.message === "string" ? data.message : `Error code: ${data.code ?? data.status}`;
      return res.status(422).json({ success: false, message: errMsg });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return res.status(502).json({ success: false, message: `Connection failed: ${message}` });
    }
  });

  app.get("/api/admin/smileone/mappings", requireAdmin, async (_req, res) => {
    try {
      const mappings = await storage.getAllSmileOneMappings();
      return res.json(mappings);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  });

  app.post("/api/admin/smileone/mappings", requireAdmin, async (req, res) => {
    try {
      const parsed = insertSmileOneMappingSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid mapping data", errors: parsed.error.flatten() });
      const mapping = await storage.createSmileOneMapping(parsed.data);
      return res.status(201).json(mapping);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  });

  app.put("/api/admin/smileone/mappings/:id", requireAdmin, async (req, res) => {
    try {
      const updated = await storage.updateSmileOneMapping(req.params.id, req.body);
      if (!updated) return res.status(404).json({ success: false, message: "Mapping not found" });
      return res.json(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  });

  app.delete("/api/admin/smileone/mappings/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteSmileOneMapping(req.params.id);
      return res.json({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  });

  // ── Busan Admin Config & Mappings ─────────────────────────────────────────────

  app.get("/api/admin/busan/config", requireAdmin, async (_req, res) => {
    try {
      const config = await storage.getBusanConfig();
      return res.json(config ?? null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  });

  app.post("/api/admin/busan/config", requireAdmin, async (req, res) => {
    try {
      const { apiToken, apiBaseUrl, currency, isActive } = req.body as Record<string, any>;
      const config = await storage.upsertBusanConfig({
        apiToken,
        apiBaseUrl: apiBaseUrl || null,
        currency: currency || "IDR",
        isActive: isActive !== false,
      });
      return res.json(config);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  });

  app.get("/api/admin/busan/balance", requireAdmin, async (_req, res) => {
    try {
      const config = await storage.getBusanConfig();
      if (!config?.apiToken) return res.status(400).json({ success: false, message: "Busan API token not configured" });
      const balance = await getBusanBalance(config.apiToken, config.apiBaseUrl ?? "https://1gamestopup.com/api/v1", config.currency ?? "INR");
      return res.json({ success: true, ...balance });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return res.status(502).json({ success: false, message });
    }
  });

  app.get("/api/admin/busan/products", requireAdmin, async (req, res) => {
    try {
      const config = await storage.getBusanConfig();
      if (!config?.apiToken) return res.status(400).json({ success: false, message: "Busan API token not configured" });
      const products = await getBusanProducts(config.apiToken, config.apiBaseUrl ?? "https://1gamestopup.com/api/v1", config.currency ?? "INR");
      return res.json(products);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return res.status(502).json({ success: false, message });
    }
  });

  app.get("/api/admin/busan/mappings", requireAdmin, async (_req, res) => {
    try {
      const mappings = await storage.getAllBusanMappings();
      return res.json(mappings);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  });

  app.post("/api/admin/busan/mappings", requireAdmin, async (req, res) => {
    try {
      const parsed = insertBusanMappingSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid mapping data", errors: parsed.error.flatten() });
      const mapping = await storage.createBusanMapping(parsed.data);
      return res.status(201).json(mapping);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  });

  app.delete("/api/admin/busan/mappings/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteBusanMapping(req.params.id);
      return res.json({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal server error";
      return res.status(500).json({ success: false, message });
    }
  });

  // ── Liogames Admin ────────────────────────────────────────────────────────────

  app.get("/api/admin/liogames/config", requireAdmin, async (_req, res) => {
    try {
      const config = await storage.getLioGamesConfig();
      return res.json(config ?? null);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  app.post("/api/admin/liogames/config", requireAdmin, async (req, res) => {
    try {
      const { memberCode, secret, baseUrl, isActive } = req.body as Record<string, any>;
      const config = await storage.upsertLioGamesConfig({
        memberCode: memberCode ?? "",
        secret: secret ?? "",
        baseUrl: baseUrl || "https://api.liogames.com/wp-json/liogames/v1",
        isActive: isActive !== false,
      });
      return res.json(config);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  app.post("/api/admin/liogames/test-connection", requireAdmin, async (req, res) => {
    try {
      const { memberCode, secret, baseUrl } = req.body as Record<string, string>;
      if (!memberCode || !secret) return res.status(400).json({ success: false, message: "Member code and secret are required" });
      const result = await getLiogamesBalance({ memberCode, secret, baseUrl });
      if (result.ok && result.data) {
        return res.json({ success: true, message: `Connected! Balance: ${result.data.balance} ${result.data.currency}`, balance: result.data.balance, currency: result.data.currency });
      }
      return res.json({ success: false, message: result.message ?? "Connection failed" });
    } catch (err: unknown) {
      return res.status(502).json({ success: false, message: err instanceof Error ? err.message : "Connection error" });
    }
  });

  app.get("/api/admin/liogames/balance", requireAdmin, async (_req, res) => {
    try {
      const config = await storage.getLioGamesConfig();
      if (!config?.memberCode || !config?.secret) return res.status(400).json({ success: false, message: "Liogames not configured" });
      const result = await getLiogamesBalance({ memberCode: config.memberCode, secret: config.secret, baseUrl: config.baseUrl ?? undefined });
      return res.json(result.ok ? { success: true, ...result.data } : { success: false, message: result.message });
    } catch (err: unknown) {
      return res.status(502).json({ success: false, message: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  app.get("/api/admin/liogames/product-variations", requireAdmin, async (req, res) => {
    try {
      const productId = parseInt(req.query.product_id as string, 10);
      if (!productId) return res.status(400).json({ success: false, message: "product_id is required" });
      const config = await storage.getLioGamesConfig();
      const result = await getLiogamesProductVariations(productId, config?.baseUrl ?? undefined);
      return res.json(result);
    } catch (err: unknown) {
      return res.status(502).json({ success: false, message: err instanceof Error ? err.message : "Error fetching variations" });
    }
  });

  app.get("/api/admin/liogames/product-schema", requireAdmin, async (req, res) => {
    try {
      const productId = parseInt(req.query.product_id as string, 10);
      const variationId = parseInt(req.query.variation_id as string, 10);
      if (!productId || !variationId) return res.status(400).json({ success: false, message: "product_id and variation_id are required" });
      const config = await storage.getLioGamesConfig();
      const result = await getLiogamesProductSchema(productId, variationId, config?.baseUrl ?? undefined);
      return res.json(result);
    } catch (err: unknown) {
      return res.status(502).json({ success: false, message: err instanceof Error ? err.message : "Error fetching schema" });
    }
  });

  app.get("/api/admin/liogames/input-profiles", requireAdmin, async (_req, res) => {
    try {
      const config = await storage.getLioGamesConfig();
      const result = await getLiogamesInputProfiles(config?.baseUrl ?? undefined);
      return res.json(result);
    } catch (err: unknown) {
      return res.status(502).json({ success: false, message: err instanceof Error ? err.message : "Error fetching profiles" });
    }
  });

  app.get("/api/admin/liogames/products", requireAdmin, async (_req, res) => {
    try {
      const config = await storage.getLioGamesConfig();
      const products = await getLiogamesProducts(config?.baseUrl ?? undefined);
      return res.json({ success: true, products });
    } catch (err: unknown) {
      return res.status(502).json({ success: false, message: err instanceof Error ? err.message : "Error fetching products" });
    }
  });

  app.get("/api/admin/liogames/mappings", requireAdmin, async (_req, res) => {
    try {
      const mappings = await storage.getAllLioGamesMappings();
      return res.json(mappings);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  app.post("/api/admin/liogames/mappings", requireAdmin, async (req, res) => {
    try {
      const parsed = insertLioGamesMappingSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid mapping data", errors: parsed.error.flatten() });
      const mapping = await storage.createLioGamesMapping(parsed.data);
      return res.status(201).json(mapping);
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  app.delete("/api/admin/liogames/mappings/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteLioGamesMapping(req.params.id);
      return res.json({ success: true });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, message: err instanceof Error ? err.message : "Internal server error" });
    }
  });

  // ── Smile.one API ─────────────────────────────────────────────────────────────
  // Helper: pick HTTP status for Smile.one service errors.
  // When the error object has a `code` field, it came from the Smile.one API
  // (business/input error → 422). Otherwise it is a transport/upstream failure → 502.
  function smileErrorStatus(err: { code?: string | number }): number {
    return err.code != null ? 422 : 502;
  }

  // Load credentials from DB, fallback to env vars if DB has nothing.
  async function resolveSmileCredentials(): Promise<SmileOneCredentials | undefined> {
    try {
      const cfg = await storage.getSmileOneConfig();
      if (cfg?.uid && cfg?.apiKey && cfg?.email) {
        return { uid: cfg.uid, key: cfg.apiKey, email: cfg.email, defaultRegion: cfg.region ?? "global" };
      }
    } catch { /* fall through to env vars */ }
    return undefined;
  }

  // Build the userInput map for a game, only including fields the game requires.
  // Accepts a flat request-body and a comma-separated requiredFields string.
  function buildUserInput(body: Record<string, string>, requiredFields: string): Record<string, string> {
    const fields = requiredFields.split(",").map((f) => f.trim()).filter(Boolean);
    const input: Record<string, string> = {};
    for (const field of fields) {
      // Support both camelCase and snake_case variants from request
      const value =
        body[field] ??
        body[field.replace(/([A-Z])/g, "_$1").toLowerCase()] ?? // camelCase → snake_case
        body[field.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] ?? // snake_case → camelCase
        "";
      if (value) input[field] = value;
    }
    return input;
  }

  app.get("/api/smileone/products", requireUser, async (req, res) => {
    const { game, region } = req.query as Record<string, string>;
    if (!game) {
      return res.status(400).json({ success: false, message: "game query parameter is required" });
    }
    try {
      const config = await storage.getSmileOneConfig();
      if (!config?.isActive) {
        return res.status(400).json({ success: false, message: "Smile.one is currently disabled" });
      }
      const credentials = await resolveSmileCredentials();
      const result = await smileGetProductList(game, region, credentials);
      if (Array.isArray(result)) {
        return res.json({ success: true, products: result });
      }
      return res.status(smileErrorStatus(result)).json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal server error";
      console.error("[smileone/products] unexpected error:", err);
      return res.status(500).json({ success: false, message });
    }
  });

  app.post("/api/smileone/validate-player", requireUser, async (req, res) => {
    const { game, region, ...rawInput } = req.body as Record<string, string>;
    if (!game) {
      return res.status(400).json({ success: false, message: "game is required" });
    }
    try {
      const config = await storage.getSmileOneConfig();
      if (!config?.isActive) {
        return res.status(400).json({ success: false, message: "Smile.one is currently disabled" });
      }
      // Look up the game to get its configured required fields
      const games = await storage.getAllGames();
      const gameRecord = games.find((g) => g.slug === game || g.id === game);
      const requiredFields = gameRecord?.requiredFields ?? "userId";

      // Build player input from only the configured fields
      const userInput = buildUserInput(rawInput, requiredFields);

      // userId is always needed for validation; check under any alias
      const hasUserId = userInput.userId ?? userInput.user_id ?? userInput.userid;
      if (!hasUserId) {
        return res.status(400).json({ success: false, message: `userId is required (game requires: ${requiredFields})` });
      }

      const credentials = await resolveSmileCredentials();
      const result = await smileValidatePlayer(game, userInput, region, credentials);
      if (result.success === false) {
        return res.status(smileErrorStatus(result)).json(result);
      }
      return res.json({ ...result, requiredFields });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal server error";
      console.error("[smileone/validate-player] unexpected error:", err);
      return res.status(500).json({ success: false, message });
    }
  });

  app.post("/api/smileone/purchase", requireUser, async (req, res) => {
    const { game, product_id, region, ...rawInput } = req.body as Record<string, string>;
    if (!game) {
      return res.status(400).json({ success: false, message: "game is required" });
    }
    if (!product_id) {
      return res.status(400).json({ success: false, message: "product_id is required" });
    }
    try {
      const config = await storage.getSmileOneConfig();
      if (!config?.isActive) {
        return res.status(400).json({ success: false, message: "Smile.one is currently disabled" });
      }
      // Look up game to get required fields for this top-up
      const games = await storage.getAllGames();
      const gameRecord = games.find((g) => g.slug === game || g.id === game);
      const requiredFields = gameRecord?.requiredFields ?? "userId";

      // Build player input from only the configured fields
      const userInput = buildUserInput(rawInput, requiredFields);

      const hasUserId = userInput.userId ?? userInput.user_id ?? userInput.userid;
      if (!hasUserId) {
        return res.status(400).json({ success: false, message: `userId is required (game requires: ${requiredFields})` });
      }

      const credentials = await resolveSmileCredentials();
      const result = await smileCreatePurchase(game, product_id, userInput, region, credentials);
      if (result.success === false) {
        return res.status(smileErrorStatus(result)).json(result);
      }

      // Send order confirmation email on successful purchase
      try {
        const userEmail = (req as any).user?.email;
        if (userEmail && result.success) {
          const template = await storage.getEmailTemplate("order_confirmation");
          const smtpConfig = await storage.getSmtpConfig();
          const settings = await storage.getAllSiteSettings();
          if (template && smtpConfig && smtpConfig.SMTP_HOST) {
            const siteObj: Record<string, string> = {};
            settings.forEach((s) => { siteObj[s.key] = s.value ?? ""; });
            const siteName = siteObj.site_name || "WebCMS";
            
            const now = new Date();
            await sendTemplatedEmail({
              to: userEmail,
              template: template as any,
              cc: template.copyEmail ?? undefined,
              vars: {
                user_name: (req as any).user?.fullName || (req as any).user?.username || userEmail,
                user_email: userEmail,
                user_id: (req as any).user?.id || "",
                order_id: `SMS_${Date.now()}`,
                order_amount: "0.00",
                order_currency: siteObj.currency || "₹",
                order_date: now.toLocaleDateString(),
                order_time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                order_status: "Confirmed",
                payment_method: "Smile.one",
                game_name: gameRecord?.name || game,
                product_name: product_id,
                product_quantity: "1",
                player_id: String(userInput.userId ?? userInput.user_id ?? userInput.userid ?? ""),
                zone_id: String(userInput.zoneId ?? userInput.zone_id ?? userInput.zoneid ?? ""),
                site_name: siteName,
                site_url: siteObj.site_url || "",
                support_email: siteObj.contact_email || "",
              },
              siteName,
              smtpConfig,
            });
          }
        }
      } catch (emailErr) {
        console.error("[smileone/purchase] Email send error (non-blocking):", emailErr);
      }

      return res.json(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal server error";
      console.error("[smileone/purchase] unexpected error:", err);
      return res.status(500).json({ success: false, message });
    }
  });

  // ── Smile.one Merchant Callback Endpoints ─────────────────────────────────────
  // These are called BY Smile.one's platform when Nexcoin is registered as a merchant.
  // Nexcoin must configure these URLs in its Smile.one merchant dashboard.

  // Helper: verify an incoming Smile.one callback signature
  function verifySmileCallback(body: Record<string, unknown>, apiKey: string): boolean {
    if (!apiKey) return false;
    const { sign, ...rest } = body;
    if (typeof sign !== "string") return false;
    const expected = smileMakeSign(rest, apiKey);
    return sign === expected;
  }

  // POST /api/smileone/callback/products
  // Smile.one calls this to get the list of products Nexcoin sells.
  app.post("/api/smileone/callback/products", async (req, res) => {
    try {
      const cfg = await storage.getSmileOneConfig();
      if (!cfg?.apiKey || !verifySmileCallback(req.body ?? {}, cfg.apiKey)) {
        return res.json({ status: 205, product_list: [], error: "Sign error" });
      }
      // Return active products from the CMS
      const products = await storage.getAllProducts();
      const productList = products
        .filter((p) => p.isActive)
        .map((p) => ({
          pid: String(p.id),
          product_name: p.name,
          price: String(p.price ?? "0"),
          original_price: String(p.originalPrice ?? p.price ?? "0"),
        }));
      return res.json({ status: 200, product_list: productList, error: "" });
    } catch (err) {
      console.error("[smileone/callback/products] error:", err);
      return res.json({ status: 500, product_list: [], error: "System error" });
    }
  });

  // POST /api/smileone/callback/role
  // Smile.one calls this to check if a player (uid/sid) exists before purchase.
  app.post("/api/smileone/callback/role", async (req, res) => {
    try {
      const cfg = await storage.getSmileOneConfig();
      if (!cfg?.apiKey || !verifySmileCallback(req.body ?? {}, cfg.apiKey)) {
        return res.json({ status: 205, nickname: "", error: "Sign error" });
      }
      const { uid, sid } = req.body as Record<string, string>;
      if (!uid) {
        return res.json({ status: 202, nickname: "", error: "Uid non-existent" });
      }
      // Accept any non-empty uid — actual game-level validation happens at delivery
      return res.json({ status: 200, nickname: uid, error: "" });
    } catch (err) {
      console.error("[smileone/callback/role] error:", err);
      return res.json({ status: 500, nickname: "", error: "System error" });
    }
  });

  // POST /api/smileone/callback/order
  // Smile.one calls this to create an in-game order after the user selects an item.
  app.post("/api/smileone/callback/order", async (req, res) => {
    try {
      const cfg = await storage.getSmileOneConfig();
      if (!cfg?.apiKey || !verifySmileCallback(req.body ?? {}, cfg.apiKey)) {
        return res.json({ status: 205, game_order: "", error: "Sign error" });
      }
      const { uid, sid, productid } = req.body as Record<string, string>;
      if (!uid || !productid) {
        return res.json({ status: 206, game_order: "", error: "Order initialisation failed" });
      }
      // Generate a unique order reference
      const gameOrder = `NXC_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      console.log(`[smileone/callback/order] Created order ${gameOrder} for uid=${uid} sid=${sid ?? ""} product=${productid}`);
      return res.json({ status: 200, game_order: gameOrder, error: "" });
    } catch (err) {
      console.error("[smileone/callback/order] error:", err);
      return res.json({ status: 500, game_order: "", error: "System error" });
    }
  });

  // POST /api/smileone/callback/notify
  // Smile.one calls this after payment is confirmed to trigger item delivery.
  app.post("/api/smileone/callback/notify", async (req, res) => {
    try {
      const cfg = await storage.getSmileOneConfig();
      if (!cfg?.apiKey || !verifySmileCallback(req.body ?? {}, cfg.apiKey)) {
        return res.json({ status: 205, game_order: req.body?.game_order ?? "", game_status: "FAILED", error: "Sign error" });
      }
      const body = req.body as Record<string, string>;
      const { game_order, uid, productid, trade_no, trade_status } = body;
      console.log(`[smileone/callback/notify] Payment ${trade_status} for order ${game_order} uid=${uid} product=${productid} trade=${trade_no}`);
      // TODO: Mark the order as paid and trigger delivery logic here
      return res.json({ status: 200, game_order, game_status: "SUCCESS", error: "" });
    } catch (err) {
      console.error("[smileone/callback/notify] error:", err);
      return res.json({ status: 500, game_order: req.body?.game_order ?? "", game_status: "FAILED", error: "System error" });
    }
  });

  // Legacy Razorpay create-order endpoint (backward compat)
  app.post("/api/payment/create-order", async (req, res) => {
    try {
      const { amount, currency = "INR", receipt } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

      const activePaymentMethods = await storage.getActivePaymentMethods();
      const razorpayMethod = activePaymentMethods.find(m => m.type === "razorpay");

      let keyId = razorpayMethod?.publicKey || process.env.RAZORPAY_KEY_ID;
      let keySecret = razorpayMethod?.secretKey || process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) return res.status(500).json({ error: "Razorpay not configured" });

      const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
      });
      res.json(order);
    } catch (error: any) {
      console.error("Razorpay order error:", error);
      res.status(500).json({ error: error.message || "Failed to create order" });
    }
  });

  // ── UPI / Manual Payment Routes ───────────────────────────────────────────────

  // Initiate UPI manual payment — create order + return UPI payment details
  app.post("/api/upi/initiate", async (req, res) => {
    try {
      const { amount, currency = "INR", email, name, phone, productInfo, cartItems, payerName, userId, couponCode } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

      const settings = await storage.getUpiSettings();
      if (!settings?.isActive || !settings.upiId) {
        return res.status(400).json({ error: "UPI payment is not configured or inactive" });
      }

      const orderId = randomUUID();
      const orderNumber = generateOrderNumber();

      // Store payerName alongside cart items so the IMAP matcher can use it for name scoring
      const notesPayload = { payerName: (payerName || "").trim(), items: cartItems || [] };

      await storage.createOrder({
        id: orderId,
        orderNumber,
        userId: userId || null,
        totalAmount: String(amount),
        currency,
        notes: JSON.stringify(notesPayload),
        status: "pending",
        paymentMethod: "manual_upi",
      });

      if (Array.isArray(cartItems)) {
        for (const item of cartItems) {
          try {
            await storage.createOrderItem({
              orderId,
              productId: item.productId,
              packageId: item.packageId,
              productTitle: item.productTitle || item.packageName || "Order",
              packageLabel: item.packageName,
              quantity: item.quantity || 1,
              unitPrice: String(item.price || 0),
              totalPrice: String((item.price || 0) * (item.quantity || 1)),
            });
          } catch (_itemErr) {
            // productId may reference a game/service row — ignore FK errors; cart data is in order.notes
          }
        }
      }

      // Increment coupon usage count if a valid coupon was applied
      if (couponCode) {
        const coupon = await storage.getCouponByCode(couponCode).catch(() => null);
        if (coupon) {
          await storage.incrementCouponUsage(coupon.id).catch(() => {});
        }
      }

      return res.json({
        success: true,
        orderId,
        orderNumber,
        upiId: settings.upiId,
        amount,
        currency,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      });
    } catch (err: any) {
      console.error("UPI initiate error:", err);
      res.status(500).json({ error: err.message || "Failed to initiate UPI payment" });
    }
  });

  // Customer submits UTR after paying — sets order to payment_review for admin verification
  app.post("/api/upi/submit-utr", async (req, res) => {
    try {
      const { orderId, utr } = req.body;
      if (!orderId) return res.status(400).json({ error: "orderId required" });
      if (!utr || typeof utr !== "string" || utr.trim().length < 6) {
        return res.status(400).json({ error: "Valid UTR reference required" });
      }
      const order = await storage.getOrderById(orderId);
      if (!order) return res.status(404).json({ error: "Order not found" });
      if (order.status === "completed") {
        return res.json({ success: true, status: "completed", message: "Order already completed" });
      }
      await storage.updateOrderUtrSubmitted(orderId, utr.trim());
      return res.json({ success: true, status: "payment_review", message: "UTR submitted. Admin will verify shortly." });
    } catch (err: any) {
      console.error("UTR submit error:", err);
      res.status(500).json({ error: err.message || "Failed to submit UTR" });
    }
  });

  // Poll order payment status
  app.get("/api/orders/:id/status", async (req, res) => {
    try {
      const order = await storage.getOrderById(req.params.id);
      if (!order) return res.status(404).json({ error: "Order not found" });
      return res.json({
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentMethod: order.paymentMethod,
        utr: order.utr,
        paymentVerifiedAt: order.paymentVerifiedAt,
        totalAmount: order.totalAmount,
        currency: order.currency,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch order status" });
    }
  });

  // Admin: Get UPI settings
  app.get("/api/admin/upi-settings", requireAdmin, async (_req, res) => {
    try {
      const settings = await storage.getUpiSettings();
      return res.json(settings ?? null);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Save UPI settings
  app.post("/api/admin/upi-settings", requireAdmin, async (req, res) => {
    try {
      const { upiId, qrCodeUrl, emailAddress, emailPassword, imapHost, imapPort, imapLabel, isActive } = req.body;
      const updated = await storage.upsertUpiSettings({
        upiId: upiId || undefined,
        qrCodeUrl: qrCodeUrl || undefined,
        emailAddress: emailAddress || undefined,
        emailPassword: emailPassword || undefined,
        imapHost: imapHost || "imap.gmail.com",
        imapPort: imapPort ? parseInt(imapPort) : 993,
        imapLabel: imapLabel || "INBOX",
        isActive: isActive !== false,
      });
      return res.json({ success: true, settings: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Get unmatched payments
  app.get("/api/admin/unmatched-payments", requireAdmin, async (_req, res) => {
    try {
      const payments = await storage.getUnmatchedPayments();
      return res.json(payments);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Assign unmatched payment to an order
  app.post("/api/admin/unmatched-payments/:id/assign", requireAdmin, async (req, res) => {
    try {
      const { orderId } = req.body;
      if (!orderId) return res.status(400).json({ error: "orderId required" });
      const order = await storage.getOrderById(orderId);
      if (!order) return res.status(404).json({ error: "Order not found" });

      await storage.assignUnmatchedPayment(req.params.id, orderId);
      // Also mark the order as verified
      await storage.updateOrderPaymentVerified(orderId, `MANUAL_${Date.now()}`);

      return res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Role Permissions ────────────────────────────────────────────────────────
  // Seed defaults (safe: only inserts if row doesn't exist)
  storage.seedDefaultRolePermissions().catch(console.error);

  // GET all role permission entries (super_admin only)
  app.get("/api/admin/role-permissions", requireAdmin, async (req, res) => {
    try {
      const adminRole = (req as any).adminRole as string;
      if (adminRole !== "super_admin") return res.status(403).json({ error: "Forbidden" });
      const rows = await storage.getAllRolePermissions();
      res.json(rows.map(r => ({ ...r, permissions: JSON.parse(r.permissions as string || "[]") })));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // GET single role permission
  app.get("/api/admin/role-permissions/:role", requireAdmin, async (req, res) => {
    try {
      const adminRole = (req as any).adminRole as string;
      if (adminRole !== "super_admin") return res.status(403).json({ error: "Forbidden" });
      const row = await storage.getRolePermission(req.params.role);
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json({ ...row, permissions: JSON.parse(row.permissions as string || "[]") });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/admin/role-permissions — create or update
  app.post("/api/admin/role-permissions", requireAdmin, async (req, res) => {
    try {
      const adminRole = (req as any).adminRole as string;
      if (adminRole !== "super_admin") return res.status(403).json({ error: "Forbidden" });
      const { role, label, permissions, isSystem } = req.body;
      if (!role || !label) return res.status(400).json({ error: "role and label are required" });
      if (!Array.isArray(permissions)) return res.status(400).json({ error: "permissions must be an array" });
      const row = await storage.upsertRolePermission(role, label, permissions, !!isSystem);
      res.json({ ...row, permissions: JSON.parse(row.permissions as string || "[]") });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/admin/role-permissions/order — update hierarchy sort order
  app.post("/api/admin/role-permissions/order", requireAdmin, async (req, res) => {
    try {
      const adminRole = (req as any).adminRole as string;
      if (adminRole !== "super_admin") return res.status(403).json({ error: "Forbidden" });
      const { orders } = req.body;
      if (!Array.isArray(orders)) return res.status(400).json({ error: "orders must be an array" });
      await storage.updateRolePermissionOrders(orders);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // DELETE /api/admin/role-permissions/:role (non-system roles only)
  app.delete("/api/admin/role-permissions/:role", requireAdmin, async (req, res) => {
    try {
      const adminRole = (req as any).adminRole as string;
      if (adminRole !== "super_admin") return res.status(403).json({ error: "Forbidden" });
      const row = await storage.getRolePermission(req.params.role);
      if (!row) return res.status(404).json({ error: "Not found" });
      if (row.isSystem) return res.status(400).json({ error: "Cannot delete system roles" });
      await storage.deleteRolePermission(req.params.role);
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Public endpoint — get permissions for a specific role (used by admin UI)
  app.get("/api/admin/my-permissions", requireAdmin, async (req, res) => {
    try {
      const adminRole = (req as any).adminRole as string;
      const row = await storage.getRolePermission(adminRole);
      const permissions = row ? JSON.parse(row.permissions as string || "[]") : [];
      res.json({ role: adminRole, permissions });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Admin: Compose & send email ───────────────────────────────────────────
  app.post("/api/admin/send-email", requireAdmin, async (req, res) => {
    try {
      const { fromName, replyTo, cc, to, subject, body } = req.body;
      if (!to || !subject || !body) {
        return res.status(400).json({ error: "to, subject, and body are required" });
      }

      const smtpPlugin = await storage.getPlugin("smtp-email");
      const smtpConfig = smtpPlugin?.config ? JSON.parse(smtpPlugin.config as string) : null;
      if (!smtpConfig?.SMTP_HOST) {
        return res.status(400).json({ error: "SMTP is not configured. Please set it up in API Integrations → SMTP Email." });
      }

      const result = await sendRawEmail({ fromName, replyTo, cc, to, subject, body, smtpConfig });
      if (!result.ok) return res.status(500).json({ error: result.error });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Auto-expire pending orders older than 5 hours
  const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
  const TEN_MIN_MS = 10 * 60 * 1000;
  setInterval(async () => {
    try {
      const expired = await storage.expirePendingOrders(FIVE_HOURS_MS);
      if (expired > 0) console.log(`[auto-expire] Marked ${expired} pending order(s) as failed (>5 h old)`);
    } catch (err) {
      console.error("[auto-expire] Error expiring pending orders:", err);
    }
  }, TEN_MIN_MS);

  // ── VAPID key init ────────────────────────────────────────────────────────
  (async () => {
    try {
      let pub = await storage.getSiteSetting("vapid_public_key");
      let priv = await storage.getSiteSetting("vapid_private_key");
      if (!pub?.value || !priv?.value) {
        const keys = webpush.generateVAPIDKeys();
        await storage.upsertSiteSetting("vapid_public_key", keys.publicKey);
        await storage.upsertSiteSetting("vapid_private_key", keys.privateKey);
        pub = { value: keys.publicKey } as any;
        priv = { value: keys.privateKey } as any;
        console.log("[Push] Generated new VAPID keys");
      }
      webpush.setVapidDetails("mailto:admin@nexcoin.app", pub!.value!, priv!.value!);
    } catch (err) {
      console.error("[Push] VAPID init error:", err);
    }
  })();

  // ── Push: return public VAPID key ─────────────────────────────────────────
  app.get("/api/push/vapid-key", async (_req, res) => {
    try {
      const key = await storage.getSiteSetting("vapid_public_key");
      if (!key?.value) return res.status(503).json({ error: "Push not ready" });
      res.json({ publicKey: key.value });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Push: save subscription ───────────────────────────────────────────────
  app.post("/api/push/subscribe", async (req, res) => {
    try {
      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.p256dh || !keys?.auth)
        return res.status(400).json({ error: "Invalid subscription" });
      await storage.savePushSubscription({ endpoint, p256dh: keys.p256dh, auth: keys.auth });
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Push: remove subscription ─────────────────────────────────────────────
  app.post("/api/push/unsubscribe", async (req, res) => {
    try {
      const { endpoint } = req.body;
      if (endpoint) await storage.deletePushSubscription(endpoint);
      res.json({ ok: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Push: subscriber count (admin) ────────────────────────────────────────
  app.get("/api/admin/push/stats", requireAdmin, async (_req, res) => {
    try {
      const total = await storage.countPushSubscriptions();
      res.json({ total });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ── Push: send notification (admin) ───────────────────────────────────────
  app.post("/api/admin/push/send", requireAdmin, async (req, res) => {
    try {
      const { title, body, url, icon } = req.body;
      if (!title || !body) return res.status(400).json({ error: "title and body are required" });
      const subs = await storage.getAllPushSubscriptions();
      if (subs.length === 0) return res.json({ sent: 0, failed: 0 });
      const payload = JSON.stringify({ title, body, url: url || "/", icon: icon || "/favicon.ico" });
      let sent = 0; let failed = 0;
      await Promise.all(subs.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
          sent++;
        } catch (err: any) {
          failed++;
          // Remove expired/invalid subscriptions
          if (err.statusCode === 404 || err.statusCode === 410) {
            await storage.deletePushSubscription(sub.endpoint).catch(() => {});
          }
        }
      }));
      res.json({ sent, failed });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Start UPI email payment poller — pass handleOrderCompleted so auto-matched
  // payments also trigger Busan fulfillment + confirmation email.
  startEmailPaymentPoller((orderId) => handleOrderCompleted(orderId));

  // Hourly purge of accounts whose 72-hour deletion grace window has elapsed.
  // Runs once at startup (after a short delay) and every hour thereafter.
  const purgeExpiredAccounts = async () => {
    try {
      const now = Date.now();
      let offset = 0;
      const pageSize = 100;
      // Stream through users in pages so we don't hold the whole table in memory.
      while (true) {
        const page = await storage.getAllUsers(pageSize, offset);
        if (!page.length) break;
        for (const u of page) {
          const ts = (u as any).deletionScheduledAt;
          if (ts && new Date(ts).getTime() <= now) {
            await storage.deleteUser(u.id).catch((e) =>
              console.error(`[purge] failed to delete user ${u.id}:`, e)
            );
            console.log(`[purge] removed user ${u.id} after grace period`);
          }
        }
        if (page.length < pageSize) break;
        offset += pageSize;
      }
    } catch (e) {
      console.error("[purge] account purge job failed:", e);
    }
  };
  setTimeout(purgeExpiredAccounts, 60_000);
  setInterval(purgeExpiredAccounts, 60 * 60 * 1000);

  return httpServer;
}
