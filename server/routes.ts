import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";

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

  // ── Public product routes ──────────────────────────────────────────────────
  app.get("/api/products", async (_req, res) => {
    const prods = await storage.getAllProducts();
    res.json(prods);
  });

  app.get("/api/products/:id", async (req, res) => {
    const p = await storage.getProduct(req.params.id);
    if (!p) return res.status(404).json({ message: "Not found" });
    res.json(p);
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

  // ── Dashboard stats ────────────────────────────────────────────────────────
  app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
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

  app.delete("/api/admin/payment-methods/:id", requireAdmin, async (req, res) => {
    await storage.deletePaymentMethod(req.params.id);
    res.json({ ok: true });
  });

  return httpServer;
}