import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import type { Server } from "http";
import path from "path";
import fs from "fs";
import multer from "multer";
import { storage } from "./storage";

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

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.use("/api/admin", injectAdminRole);

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
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
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
      const user = await storage.createUser({ username, email, password, fullName, role: "user" });
      const { password: _pw, ...safeUser } = user;
      storage.createNotification({ type: "user", title: "New User Registered", message: `${username} just created an account.` }).catch(() => {});
      return res.status(201).json({ user: safeUser });
    } catch (e: any) {
      return res.status(400).json({ message: e.message });
    }
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
    const reply = await storage.replyToTicket(req.params.id, req.body.userId, req.body.message, true);
    res.status(201).json(reply);
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
  app.get("/api/admin/plugins", requireAdmin, async (_req, res) => {
    res.json(await storage.getAllPlugins());
  });

  app.put("/api/admin/plugins/:slug", requireAdmin, async (req, res) => {
    const p = await storage.upsertPlugin(req.params.slug, req.body);
    res.json(p);
  });

  app.patch("/api/admin/plugins/:slug/toggle", requireAdmin, async (req, res) => {
    const existing = await storage.getPlugin(req.params.slug);
    const current = existing?.isEnabled ?? false;
    const p = await storage.upsertPlugin(req.params.slug, { ...req.body, isEnabled: !current });
    res.json(p);
  });

  app.delete("/api/admin/plugins/:slug", requireAdmin, async (req, res) => {
    await storage.deletePlugin(req.params.slug);
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
