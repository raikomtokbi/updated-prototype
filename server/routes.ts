import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import type { Server } from "http";
import path from "path";
import fs from "fs";
import multer from "multer";
import AdmZip from "adm-zip";
import { storage } from "./storage";
import {
  activatePlugin,
  deactivatePlugin,
  getInstalledPluginDir,
  readPluginManifest,
  validateManifest,
  validatePluginFiles,
  loadAllActivePlugins,
  PLUGINS_BASE,
} from "./lib/pluginManager";
import {
  sendTemplatedEmail,
  buildEmailHtml,
  processTemplate,
  DEFAULT_EMAIL_TEMPLATES,
} from "./lib/emailService";

// ─── Multer setup ─────────────────────────────────────────────────────────────
const uploadsDir = path.resolve(process.cwd(), "public/uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
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

// ─── Plugin Upload Multer ─────────────────────────────────────────────────────
const pluginUploadsDir = path.resolve(process.cwd(), "uploads/plugins");
if (!fs.existsSync(pluginUploadsDir)) fs.mkdirSync(pluginUploadsDir, { recursive: true });
if (!fs.existsSync(PLUGINS_BASE)) fs.mkdirSync(PLUGINS_BASE, { recursive: true });

const pluginUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, pluginUploadsDir),
    filename: (_req, file, cb) => {
      const name = path.basename(file.originalname, ".zip").replace(/[^a-zA-Z0-9-_]/g, "_");
      cb(null, `${name}-${Date.now()}.zip`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.originalname.endsWith(".zip")) {
      return cb(new Error("Only .zip files are allowed"));
    }
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

// Client sends X-Admin-Role header for demo auth
// In production replace with real JWT/session verification
function injectAdminRole(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers["x-admin-role"] as string | undefined;
  (req as any).adminRole = header ?? null;
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

  // ── Initialize active plugins on startup ─────────────────────────────────
  try {
    const allPlugins = await storage.getAllPlugins();
    const activePlugins = allPlugins.filter((p) => p.isEnabled);
    if (activePlugins.length > 0) {
      await loadAllActivePlugins(app, activePlugins);
    }
  } catch (err) {
    console.warn("[PluginManager] Could not load plugins on startup:", err);
  }

  // ── Public site settings (read-only for storefront) ───────────────────────
  app.get("/api/site-settings", async (_req, res) => {
    const settings = await storage.getAllSiteSettings();
    const obj: Record<string, string> = {};
    settings.forEach((s) => { obj[s.key] = s.value; });
    res.json(obj);
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
    if (!g.pluginSlug) return res.status(400).json({ message: "This game does not have a validation plugin configured." });

    const userId = req.query.userId as string | undefined;
    const zoneId = req.query.zoneId as string | undefined;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    const plugin = await storage.getPlugin(g.pluginSlug);
    if (!plugin || !plugin.isEnabled) return res.status(400).json({ message: "Plugin not available for this game." });

    let config: Record<string, any> = {};
    try { config = plugin.config ? JSON.parse(plugin.config) : {}; } catch {}

    const validationUrl: string | undefined = config.validationUrl;
    if (!validationUrl) return res.status(400).json({ message: "Plugin validation URL not configured." });

    try {
      const params = new URLSearchParams({ userId });
      if (zoneId) params.append("zoneId", zoneId);
      const response = await fetch(`${validationUrl}?${params}`, { signal: AbortSignal.timeout(8000) });
      const data = await response.json();
      if (!response.ok) return res.status(400).json({ message: data.message ?? "Validation failed" });
      const playerName: string = data.playerName ?? data.username ?? data.name ?? data.nickname ?? "";
      if (!playerName) return res.status(400).json({ message: "Player not found" });
      return res.json({ playerName });
    } catch {
      return res.status(502).json({ message: "Could not reach validation service. Please try again." });
    }
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

  // ── Public payment methods ─────────────────────────────────────────────────
  app.get("/api/payment-methods", async (_req, res) => {
    const all = await storage.getAllPaymentMethods();
    // Return only safe public fields (no keys)
    res.json(
      all
        .filter((p) => p.isActive)
        .map(({ secretKey: _sk, webhookSecret: _ws, publicKey: _pk, ...safe }) => safe),
    );
  });

  // ── File upload ────────────────────────────────────────────────────────────
  app.use("/uploads", express.static(uploadsDir));

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

    const user = await storage.getUserByUsername(username);
    if (!user || user.password !== password) {
      recordFailedLogin(username);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Your account is pending approval. Please wait for an administrator to approve it." });
    }

    resetLoginAttempts(username);
    const { password: _pw, ...safeUser } = user;
    return res.json({ user: safeUser });
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
    const existing = await storage.getUserByUsername(username);
    if (existing) {
      return res.status(409).json({ message: "Username already taken" });
    }
    try {
      // Account approval setting: 'manual' means new users start inactive until admin approves
      const approvalSetting = await getSetting("account_approval", "auto");
      const isActive = approvalSetting !== "manual";

      const user = await storage.createUser({ username, email, password, fullName, role: "user", isActive });
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
      return res.status(201).json({ user: safeUser });
    } catch (e: any) {
      return res.status(400).json({ message: e.message });
    }
  });

  // ── User middleware ─────────────────────────────────────────────────────────
  async function requireUser(req: any, res: any, next: any) {
    const username = req.headers["x-username"] as string | undefined;
    if (!username) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUserByUsername(username);
    if (!user) return res.status(401).json({ message: "User not found" });
    req.currentUser = user;
    next();
  }

  // ── User profile & orders ───────────────────────────────────────────────────
  app.get("/api/user/orders", requireUser, async (req: any, res) => {
    const userOrders = await storage.getOrdersByUser(req.currentUser.id);
    const ordersWithItems = await Promise.all(
      userOrders.map(async (order) => {
        const items = await storage.getOrderItemsByOrder(order.id);
        return { ...order, items };
      })
    );
    res.json(ordersWithItems);
  });

  app.patch("/api/user/profile", requireUser, async (req: any, res) => {
    const { fullName, email, phone } = req.body ?? {};
    const updated = await storage.updateUser(req.currentUser.id, { fullName, email, phone });
    if (!updated) return res.status(404).json({ message: "User not found" });
    const { password: _pw, ...safeUser } = updated;
    res.json({ user: safeUser });
  });

  app.post("/api/user/change-password", requireUser, async (req: any, res) => {
    const { currentPassword, newPassword } = req.body ?? {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new password required" });
    }
    if (req.currentUser.password !== currentPassword) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }
    await storage.updateUser(req.currentUser.id, { password: newPassword });
    res.json({ ok: true });
  });

  // ── Dashboard stats ────────────────────────────────────────────────────────
  app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  // ── Analytics (time-series for charts) ────────────────────────────────────
  app.get("/api/admin/analytics", requireAdmin, async (req, res) => {
    const range = (req.query.range as string) || "12months";
    const now = new Date();
    let from: Date;
    let groupBy: "hour" | "day" | "week" | "month" = "month";

    if (range === "custom" && req.query.from && req.query.to) {
      from = new Date(req.query.from as string);
      const to = new Date(req.query.to as string);
      to.setHours(23, 59, 59, 999);
      const days = Math.round((to.getTime() - from.getTime()) / 86400000);
      groupBy = days <= 1 ? "hour" : days <= 60 ? "day" : days <= 180 ? "week" : "month";
      const data = await storage.getAnalytics(from, to, groupBy);
      return res.json(data);
    }

    if (range === "today") {
      from = new Date(now); from.setHours(0, 0, 0, 0); groupBy = "hour";
    } else if (range === "7days") {
      from = new Date(now); from.setDate(now.getDate() - 6); from.setHours(0, 0, 0, 0); groupBy = "day";
    } else if (range === "30days") {
      from = new Date(now); from.setDate(now.getDate() - 29); from.setHours(0, 0, 0, 0); groupBy = "day";
    } else if (range === "6months") {
      from = new Date(now); from.setMonth(now.getMonth() - 5); from.setDate(1); from.setHours(0, 0, 0, 0); groupBy = "month";
    } else {
      from = new Date(now); from.setFullYear(now.getFullYear() - 1); from.setDate(1); from.setHours(0, 0, 0, 0); groupBy = "month";
    }

    const to = new Date(now); to.setHours(23, 59, 59, 999);
    const data = await storage.getAnalytics(from, to, groupBy);
    res.json(data);
  });

  // ── Seed demo data ─────────────────────────────────────────────────────────
  app.post("/api/admin/seed", requireAdmin, async (_req, res) => {
    const existing = await storage.getAllGames();
    if (existing.length > 0) {
      return res.json({ ok: true, message: "Data already exists, skipping seed." });
    }

    // Seed games
    const gamesData = [
      { name: "Mobile Legends", slug: "mobile-legends", description: "The most popular MOBA game in Southeast Asia. Buy Diamonds instantly.", category: "game_currency", status: "active", isTrending: true, sortOrder: 1, logoUrl: "", bannerUrl: "" },
      { name: "PUBG Mobile", slug: "pubg-mobile", description: "Top-up Unknown Cash (UC) for PUBG Mobile. Fast delivery guaranteed.", category: "game_currency", status: "active", isTrending: true, sortOrder: 2, logoUrl: "", bannerUrl: "" },
      { name: "Free Fire", slug: "free-fire", description: "Buy Free Fire Diamonds at the best price. Instant top-up 24/7.", category: "game_currency", status: "active", isTrending: false, sortOrder: 3, logoUrl: "", bannerUrl: "" },
      { name: "Genshin Impact", slug: "genshin-impact", description: "Top-up Genesis Crystals & Primogems for Genshin Impact.", category: "game_currency", status: "active", isTrending: false, sortOrder: 4, logoUrl: "", bannerUrl: "" },
    ];

    const createdGames: any[] = [];
    for (const g of gamesData) {
      const game = await storage.createGame(g as any);
      createdGames.push(game);
    }

    // Seed services for each game
    const servicesByGame: Record<string, { name: string; price: string; discountPercent: string; finalPrice: string }[]> = {
      "mobile-legends": [
        { name: "100 Diamonds", price: "1.99", discountPercent: "0", finalPrice: "1.99" },
        { name: "257 Diamonds", price: "4.99", discountPercent: "5", finalPrice: "4.74" },
        { name: "520 Diamonds", price: "9.99", discountPercent: "10", finalPrice: "8.99" },
        { name: "1060 Diamonds", price: "19.99", discountPercent: "10", finalPrice: "17.99" },
      ],
      "pubg-mobile": [
        { name: "60 UC", price: "0.99", discountPercent: "0", finalPrice: "0.99" },
        { name: "325 UC", price: "4.99", discountPercent: "5", finalPrice: "4.74" },
        { name: "660 UC", price: "9.99", discountPercent: "8", finalPrice: "9.19" },
        { name: "1800 UC", price: "24.99", discountPercent: "12", finalPrice: "21.99" },
      ],
      "free-fire": [
        { name: "70 Diamonds", price: "0.99", discountPercent: "0", finalPrice: "0.99" },
        { name: "355 Diamonds", price: "4.99", discountPercent: "5", finalPrice: "4.74" },
        { name: "720 Diamonds", price: "9.99", discountPercent: "8", finalPrice: "9.19" },
      ],
      "genshin-impact": [
        { name: "60 Genesis Crystals", price: "0.99", discountPercent: "0", finalPrice: "0.99" },
        { name: "300 Genesis Crystals", price: "4.99", discountPercent: "0", finalPrice: "4.99" },
        { name: "980 Genesis Crystals", price: "14.99", discountPercent: "5", finalPrice: "14.24" },
        { name: "1980 Genesis Crystals", price: "29.99", discountPercent: "5", finalPrice: "28.49" },
      ],
    };

    for (const game of createdGames) {
      const svcs = servicesByGame[game.slug] ?? [];
      for (let i = 0; i < svcs.length; i++) {
        await storage.createService({ ...svcs[i], gameId: game.id, status: "active", currency: "USD", sortOrder: i + 1 } as any);
      }
    }

    // Seed hero sliders
    const sliders = [
      { title: "Top-Up Mobile Legends Diamonds", subtitle: "Fast, secure & affordable — instant delivery 24/7", imageUrl: "", isActive: true, sortOrder: 1, linkedGameId: createdGames[0]?.id ?? null },
      { title: "PUBG Mobile UC — Best Prices", subtitle: "The cheapest UC rates online. Buy now and dominate the battlefield!", imageUrl: "", isActive: true, sortOrder: 2, linkedGameId: createdGames[1]?.id ?? null },
      { title: "Year-End Sale — Up to 15% Off", subtitle: "Limited time offer on all top-ups. Don't miss out!", imageUrl: "", isActive: true, sortOrder: 3, linkedGameId: null },
    ];

    for (const s of sliders) {
      await storage.createHeroSlider(s as any);
    }

    // Seed campaigns
    const campaigns = [
      { name: "Year-End Mega Sale", description: "Get up to 15% off on all game top-ups during the year-end festive season.", type: "banner", isActive: true, bannerUrl: "", startsAt: new Date(), endsAt: new Date(Date.now() + 30 * 86400000) },
      { name: "New User Welcome Offer", description: "First-time users get an exclusive 10% bonus on their first top-up purchase.", type: "discount", isActive: true, bannerUrl: "", startsAt: new Date(), endsAt: new Date(Date.now() + 60 * 86400000) },
    ];

    for (const c of campaigns) {
      await storage.createCampaign(c as any);
    }

    res.json({ ok: true, message: "Demo data seeded successfully." });
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

  app.get("/api/admin/users/subscribers", requireAdmin, async (_req, res) => {
    const result = await storage.getSubscribedUsers();
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
    const o = await storage.updateOrderStatus(req.params.id, req.body.status);
    if (!o) return res.status(404).json({ message: "Not found" });
    res.json(o);
  });

  // ── Transactions ───────────────────────────────────────────────────────────
  app.get("/api/admin/transactions", requireAdmin, async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    res.json(await storage.getAllTransactions(limit, offset));
  });

  app.get("/api/admin/transactions/refunds", requireAdmin, async (_req, res) => {
    res.json(await storage.getRefunds());
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
    res.json(t);
  });

  app.post("/api/admin/tickets/:id/reply", requireAdmin, async (req, res) => {
    const ticket = await storage.getTicket(req.params.id);
    const reply = await storage.replyToTicket(req.params.id, req.body.userId, req.body.message, true);
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

  // ── Payment Methods ────────────────────────────────────────────────────────
  app.get("/api/admin/payment-methods", requireAdmin, async (_req, res) => {
    res.json(await storage.getAllPaymentMethods());
  });

  app.post("/api/admin/payment-methods", requireAdmin, async (req, res) => {
    const p = await storage.createPaymentMethod(req.body);
    res.status(201).json(p);
  });

  app.patch("/api/admin/payment-methods/:id", requireAdmin, async (req, res) => {
    const p = await storage.updatePaymentMethod(req.params.id, req.body);
    if (!p) return res.status(404).json({ message: "Not found" });
    res.json(p);
  });

  app.put("/api/admin/payment-methods/:id", requireAdmin, async (req, res) => {
    const p = await storage.updatePaymentMethod(req.params.id, req.body);
    if (!p) return res.status(404).json({ message: "Not found" });
    res.json(p);
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

  // Upload & validate plugin ZIP - returns manifest preview before install
  app.post("/api/admin/plugins/upload", requireAdmin, (req, res, next) => {
    pluginUpload.single("plugin")(req, res, (err) => {
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  }, async (req: Request, res: Response) => {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ message: "No file uploaded" });

    const tmpZipPath = file.path;
    try {
      // Extract to a temp directory for validation
      const tempExtractDir = path.join(pluginUploadsDir, `temp-${Date.now()}`);
      fs.mkdirSync(tempExtractDir, { recursive: true });

      const zip = new AdmZip(tmpZipPath);
      const entries = zip.getEntries();

      // Security: check for path traversal in zip entries
      for (const entry of entries) {
        const entryPath = path.resolve(tempExtractDir, entry.entryName);
        if (!entryPath.startsWith(path.resolve(tempExtractDir))) {
          fs.rmSync(tempExtractDir, { recursive: true, force: true });
          fs.unlinkSync(tmpZipPath);
          return res.status(400).json({ message: "Invalid plugin: path traversal detected in zip" });
        }
      }

      zip.extractAllTo(tempExtractDir, true);

      // Detect plugin root (might be inside a subdirectory)
      let pluginRoot = tempExtractDir;
      const rootItems = fs.readdirSync(tempExtractDir);
      if (rootItems.length === 1) {
        const single = path.join(tempExtractDir, rootItems[0]);
        if (fs.statSync(single).isDirectory()) {
          pluginRoot = single;
        }
      }

      // Read and validate manifest
      const manifestPath = path.join(pluginRoot, "plugin.json");
      if (!fs.existsSync(manifestPath)) {
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
        fs.unlinkSync(tmpZipPath);
        return res.status(400).json({ message: "Invalid plugin: plugin.json not found in archive" });
      }

      let manifest: unknown;
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      } catch {
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
        fs.unlinkSync(tmpZipPath);
        return res.status(400).json({ message: "Invalid plugin: plugin.json is not valid JSON" });
      }

      const validation = validateManifest(manifest);
      if (!validation.valid) {
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
        fs.unlinkSync(tmpZipPath);
        return res.status(400).json({ message: `Invalid plugin manifest: ${validation.errors.join(", ")}` });
      }

      const m = manifest as { slug: string; [key: string]: unknown };
      const fileValidation = validatePluginFiles(pluginRoot, m as any);
      if (!fileValidation.valid) {
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
        fs.unlinkSync(tmpZipPath);
        return res.status(400).json({ message: `Invalid plugin files: ${fileValidation.errors.join(", ")}` });
      }

      // Check if plugin already installed
      const existing = await storage.getPlugin(m.slug);
      if (existing) {
        fs.rmSync(tempExtractDir, { recursive: true, force: true });
        fs.unlinkSync(tmpZipPath);
        return res.status(409).json({
          message: `Plugin '${m.slug}' is already installed. Uninstall it first before reinstalling.`,
        });
      }

      // Store temp dir path for install step
      const uploadId = path.basename(tempExtractDir);
      // Store zip file path and temp dir in a metadata file for install step
      const metaPath = path.join(pluginUploadsDir, `${uploadId}.meta.json`);
      fs.writeFileSync(metaPath, JSON.stringify({
        uploadId,
        tempDir: tempExtractDir,
        pluginRoot,
        zipPath: tmpZipPath,
        fileSize: file.size,
      }));

      return res.json({
        uploadId,
        manifest,
        fileSize: file.size,
        fileName: file.originalname,
      });
    } catch (err) {
      try { fs.unlinkSync(tmpZipPath); } catch {}
      console.error("[Plugins] Upload error:", err);
      return res.status(500).json({ message: "Failed to process plugin archive" });
    }
  });

  // Install plugin from uploaded ZIP
  app.post("/api/admin/plugins/install", requireAdmin, async (req: Request, res: Response) => {
    const { uploadId } = req.body as { uploadId: string };
    if (!uploadId || typeof uploadId !== "string" || !/^[a-zA-Z0-9-]+$/.test(uploadId)) {
      return res.status(400).json({ message: "Invalid uploadId" });
    }

    const metaPath = path.join(pluginUploadsDir, `${uploadId}.meta.json`);
    if (!fs.existsSync(metaPath)) {
      return res.status(400).json({ message: "Upload session not found or expired. Please upload again." });
    }

    let meta: { uploadId: string; tempDir: string; pluginRoot: string; zipPath: string; fileSize: number };
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    } catch {
      return res.status(400).json({ message: "Invalid upload session" });
    }

    const { tempDir, pluginRoot, zipPath, fileSize } = meta;

    if (!fs.existsSync(pluginRoot)) {
      return res.status(400).json({ message: "Upload session expired. Please upload again." });
    }

    const manifest = readPluginManifest(pluginRoot);
    if (!manifest) {
      return res.status(400).json({ message: "plugin.json not found or invalid" });
    }

    // Final duplicate check
    const existing = await storage.getPlugin(manifest.slug);
    if (existing) {
      return res.status(409).json({ message: `Plugin '${manifest.slug}' is already installed.` });
    }

    // Move plugin to installed directory
    const installDir = getInstalledPluginDir(manifest.slug);
    try {
      if (fs.existsSync(installDir)) {
        fs.rmSync(installDir, { recursive: true, force: true });
      }
      fs.cpSync(pluginRoot, installDir, { recursive: true });
    } catch (err) {
      return res.status(500).json({ message: "Failed to install plugin files" });
    }

    // Cleanup temp files
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      fs.unlinkSync(zipPath);
      fs.unlinkSync(metaPath);
    } catch {}

    // Register in database
    const plugin = await storage.upsertPlugin(manifest.slug, {
      name: manifest.name,
      slug: manifest.slug,
      description: manifest.description ?? null,
      category: manifest.pluginType ?? "integration",
      pluginType: manifest.pluginType ?? "integration",
      version: manifest.version ?? "1.0.0",
      author: manifest.author ?? null,
      isEnabled: false,
      status: "inactive",
      installPath: installDir,
      installedAt: new Date(),
      fileSize: fileSize ?? null,
      settingsSchema: manifest.settings ? JSON.stringify(manifest.settings) : null,
      hooks: manifest.hooks ? JSON.stringify(manifest.hooks) : null,
      config: "{}",
    });

    return res.json({ ok: true, plugin });
  });

  // Toggle plugin enabled/disabled
  app.patch("/api/admin/plugins/:slug/toggle", requireAdmin, async (req: Request, res: Response) => {
    const existing = await storage.getPlugin(req.params.slug);
    if (!existing) return res.status(404).json({ message: "Plugin not found" });

    const willEnable = !existing.isEnabled;

    if (willEnable) {
      const installDir = existing.installPath ?? getInstalledPluginDir(existing.slug);
      const getConfig = () => {
        try { return existing.config ? JSON.parse(existing.config) : {}; } catch { return {}; }
      };
      const result = await activatePlugin(app, existing.slug, installDir, getConfig);
      if (!result.success) {
        return res.status(500).json({ message: `Failed to activate plugin: ${result.error}` });
      }
    } else {
      deactivatePlugin(existing.slug);
    }

    const p = await storage.upsertPlugin(existing.slug, {
      isEnabled: willEnable,
      status: willEnable ? "active" : "inactive",
    });
    res.json(p);
  });

  // Update plugin settings/config
  app.patch("/api/admin/plugins/:slug/settings", requireAdmin, async (req: Request, res: Response) => {
    const existing = await storage.getPlugin(req.params.slug);
    if (!existing) return res.status(404).json({ message: "Plugin not found" });
    const config = JSON.stringify(req.body.config ?? {});
    const p = await storage.upsertPlugin(existing.slug, { config });
    res.json(p);
  });

  // Get plugin by slug
  app.get("/api/admin/plugins/:slug", requireAdmin, async (req: Request, res: Response) => {
    const p = await storage.getPlugin(req.params.slug);
    if (!p) return res.status(404).json({ message: "Plugin not found" });
    res.json(p);
  });

  // Update plugin metadata (upsert)
  app.put("/api/admin/plugins/:slug", requireAdmin, async (req, res) => {
    const p = await storage.upsertPlugin(req.params.slug, req.body);
    res.json(p);
  });

  // Uninstall plugin
  app.delete("/api/admin/plugins/:slug", requireAdmin, async (req: Request, res: Response) => {
    const existing = await storage.getPlugin(req.params.slug);
    if (!existing) return res.status(404).json({ message: "Plugin not found" });

    // Deactivate first
    deactivatePlugin(existing.slug);

    // Remove plugin files
    const installDir = existing.installPath ?? getInstalledPluginDir(existing.slug);
    try {
      if (fs.existsSync(installDir)) {
        fs.rmSync(installDir, { recursive: true, force: true });
      }
    } catch (err) {
      console.warn(`[Plugins] Could not remove plugin files for '${existing.slug}':`, err);
    }

    // Remove from database
    await storage.deletePlugin(existing.slug);
    res.json({ ok: true });
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
    const { type } = req.params;
    const allowed = DEFAULT_EMAIL_TEMPLATES.map((t) => t.type);
    if (!allowed.includes(type)) return res.status(400).json({ message: "Unknown template type" });
    const template = await storage.upsertEmailTemplate(type, { ...req.body, type });
    res.json(template);
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
      otp_code: "123456",
      order_id: "Ord00001",
      order_amount: "25.00",
      order_currency: "$",
      order_date: new Date().toLocaleDateString(),
      site_name: siteName,
      site_url: "https://yoursite.com",
      support_email: siteObj.contact_email || "support@example.com",
      ticket_id: "Tkt00001",
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

    const template = await getEmailTemplateWithDefault(type);
    if (!template) return res.status(404).json({ message: "Template not found" });

    const siteSettings = await storage.getAllSiteSettings();
    const siteObj: Record<string, string> = {};
    siteSettings.forEach((s) => { siteObj[s.key] = s.value ?? ""; });
    const siteName = siteObj.site_name || "WebCMS";

    const result = await sendTemplatedEmail({
      to,
      template: template as any,
      vars: {
        user_name: "Test User",
        user_email: to,
        otp_code: "123456",
        order_id: "Ord00001",
        order_amount: "25.00",
        order_currency: "$",
        order_date: new Date().toLocaleDateString(),
        site_name: siteName,
        site_url: "",
        support_email: siteObj.contact_email || "support@example.com",
        ticket_id: "Tkt00001",
        ticket_subject: "Test Ticket",
        reply_message: "This is a test reply from the admin.",
      },
      siteName,
      smtpConfig: smtpConfig as any,
    });

    if (!result.ok) return res.status(500).json({ message: result.error });
    res.json({ ok: true, message: `Test email sent to ${to}` });
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
    res.json({ ok: true });
  });

  return httpServer;
}
