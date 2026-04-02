import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import type { Server } from "http";
import path from "path";
import fs from "fs";
import { createHash, randomBytes, createHmac } from "crypto";
import bcrypt from "bcrypt";
import multer from "multer";
import AdmZip from "adm-zip";
import Razorpay from "razorpay";
import { storage } from "./storage";
import { getGatewayHandler } from "./lib/paymentGateways/index";
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
import { insertFeeSchema } from "@shared/schema";
import {
  getProductList as smileGetProductList,
  validatePlayer as smileValidatePlayer,
  createPurchase as smileCreatePurchase,
} from "./lib/smileone/smileoneService";

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

// ─── Ticket Attachment Multer ──────────────────────────────────────────────────
const attachmentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `attach-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
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

  // Get active fees (public endpoint for checkout/cart)
  app.get("/api/fees", async (_req, res) => {
    const fees = await storage.getActiveFees();
    res.json(fees);
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

    if (!user.isActive) {
      return res.status(403).json({ message: "Your account is pending approval. Please wait for an administrator to approve it." });
    }

    resetLoginAttempts(username);
    const { password: _pw, ...safeUser } = user;
    return res.json({ user: safeUser });
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
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters" });
    }

    // Verify current password with bcrypt
    const passwordMatch = await bcrypt.compare(currentPassword, req.currentUser.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await storage.updateUser(req.currentUser.id, { password: hashedPassword });
    res.json({ ok: true });
  });

  app.delete("/api/user/delete", requireUser, async (req: any, res) => {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ message: "Password is required to delete account" });
    }
    if (!(await bcrypt.compare(password, req.currentUser.password))) {
      return res.status(401).json({ message: "Invalid password" });
    }
    await storage.deleteUser(req.currentUser.id);
    res.json({ ok: true, message: "Account deleted successfully" });
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
    res.json({ ok: true });
  });

  // ── Multi-Gateway Payment System ──────────────────────────────────────────

  function getBaseUrl(req: Request): string {
    const proto = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.get("host");
    return `${proto}://${host}`;
  }

  // Initiate payment for any gateway
  app.post("/api/payment/initiate", async (req, res) => {
    try {
      const { gatewayId, amount, currency = "INR", email, name, phone, productInfo } = req.body;

      if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });
      if (!email) return res.status(400).json({ error: "Email is required" });

      const activePaymentMethods = await storage.getActivePaymentMethods();

      let method = gatewayId
        ? activePaymentMethods.find(m => m.id === gatewayId)
        : activePaymentMethods[0];

      if (!method) return res.status(400).json({ error: "No active payment gateway found" });

      const handler = getGatewayHandler(method.type);
      if (!handler) return res.status(400).json({ error: `Unsupported gateway type: ${method.type}` });

      const baseUrl = getBaseUrl(req);
      const orderId = `ORD_${Date.now()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

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

      res.json({ ...result, orderId, gatewayType: method.type });
    } catch (error: any) {
      console.error("Payment initiate error:", error);
      res.status(500).json({ error: error.message || "Failed to initiate payment" });
    }
  });

  // Verify payment (used by modal gateways like Razorpay and for polling)
  app.post("/api/payment/verify", async (req, res) => {
    try {
      const { gatewayId, ...params } = req.body;

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
          if (expected === razorpay_signature) return res.json({ success: true });
          return res.status(400).json({ success: false, error: "Signature mismatch" });
        }
        return res.status(400).json({ success: false, error: "No matching gateway found" });
      }

      const handler = getGatewayHandler(method.type);
      if (!handler) return res.status(400).json({ success: false, error: "Unsupported gateway" });

      const result = await handler.verifyPayment(params, method);
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
      res.status(200).send("OK");
    } catch (error: any) {
      console.error("Payment callback error:", error);
      res.status(500).send("Error");
    }
  });

  // ── Smile.one API ─────────────────────────────────────────────────────────────

  app.get("/api/smileone/products", requireUser, async (req, res) => {
    const { game, region } = req.query as Record<string, string>;
    if (!game) {
      return res.status(400).json({ success: false, message: "game query parameter is required" });
    }
    try {
      const result = await smileGetProductList(game, region);
      if ("success" in result && result.success === false) {
        return res.status(502).json(result);
      }
      return res.json({ success: true, products: result });
    } catch (err: any) {
      console.error("[smileone/products] unexpected error:", err);
      return res.status(500).json({ success: false, message: err.message || "Internal server error" });
    }
  });

  app.post("/api/smileone/validate-player", requireUser, async (req, res) => {
    const { game, region, ...userInput } = req.body as Record<string, string>;
    if (!game) {
      return res.status(400).json({ success: false, message: "game is required" });
    }
    const userId = userInput.user_id ?? userInput.userId ?? userInput.userid ?? "";
    if (!userId) {
      return res.status(400).json({ success: false, message: "user_id is required" });
    }
    try {
      const result = await smileValidatePlayer(game, userInput, region);
      if ("success" in result && result.success === false) {
        return res.status(502).json(result);
      }
      return res.json(result);
    } catch (err: any) {
      console.error("[smileone/validate-player] unexpected error:", err);
      return res.status(500).json({ success: false, message: err.message || "Internal server error" });
    }
  });

  app.post("/api/smileone/purchase", requireUser, async (req, res) => {
    const { game, product_id, region, ...userInput } = req.body as Record<string, string>;
    if (!game) {
      return res.status(400).json({ success: false, message: "game is required" });
    }
    if (!product_id) {
      return res.status(400).json({ success: false, message: "product_id is required" });
    }
    const userId = userInput.user_id ?? userInput.userId ?? userInput.userid ?? "";
    if (!userId) {
      return res.status(400).json({ success: false, message: "user_id is required" });
    }
    try {
      const result = await smileCreatePurchase(game, product_id, userInput, region);
      if ("success" in result && result.success === false) {
        return res.status(502).json(result);
      }
      return res.json(result);
    } catch (err: any) {
      console.error("[smileone/purchase] unexpected error:", err);
      return res.status(500).json({ success: false, message: err.message || "Internal server error" });
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

  return httpServer;
}
