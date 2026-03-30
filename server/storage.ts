import { randomUUID } from "crypto";
import {
  type User, type InsertUser,
  type Game, type InsertGame,
  type Service, type InsertService,
  type Product, type InsertProduct,
  type ProductPackage,
  type Order,
  type Transaction,
  type Coupon, type InsertCoupon,
  type Ticket, type InsertTicket,
  type TicketReply,
  type Campaign,
  type HeroSlider,
  type Review,
  type PaymentMethod,
  type Plugin,
  type Notification,
  type SiteSetting,
  users, games, services, products, productPackages, orders, orderItems,
  transactions, coupons, tickets, ticketReplies,
  campaigns, heroSliders, reviews, paymentMethods, plugins,
  notifications, siteSettings,
} from "@shared/schema";
import { eq, desc, asc, count, sum, and, gte, lte, sql } from "drizzle-orm";
import { db } from "./db";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(limit?: number, offset?: number): Promise<User[]>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  countUsers(): Promise<number>;
  getSubscribedUsers(): Promise<User[]>;

  // Games
  getAllGames(): Promise<Game[]>;
  getTrendingGames(): Promise<Game[]>;
  getGame(id: string): Promise<Game | undefined>;
  getGameBySlug(slug: string): Promise<Game | undefined>;
  createGame(data: InsertGame): Promise<Game>;
  updateGame(id: string, data: Partial<Game>): Promise<Game | undefined>;
  deleteGame(id: string): Promise<void>;

  // Services
  getAllServices(gameId?: string): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  createService(data: InsertService): Promise<Service>;
  updateService(id: string, data: Partial<Service>): Promise<Service | undefined>;
  deleteService(id: string): Promise<void>;

  // Products
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(data: InsertProduct): Promise<Product>;
  updateProduct(id: string, data: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;

  // Product Packages
  getProductPackages(productId: string): Promise<ProductPackage[]>;
  createProductPackage(data: { productId: string; label: string; price: string; originalPrice?: string; isActive?: boolean }): Promise<ProductPackage>;
  deleteProductPackage(id: string): Promise<void>;

  // Orders
  getAllOrders(limit?: number, offset?: number): Promise<Order[]>;
  getOrdersByUser(userId: string): Promise<Order[]>;
  getOrderItemsByOrder(orderId: string): Promise<any[]>;
  countOrders(): Promise<number>;
  getTotalRevenue(): Promise<number>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;

  // Transactions
  getAllTransactions(limit?: number, offset?: number): Promise<Transaction[]>;
  getRefunds(): Promise<Transaction[]>;

  // Coupons
  getAllCoupons(): Promise<Coupon[]>;
  createCoupon(data: InsertCoupon): Promise<Coupon>;
  updateCoupon(id: string, data: Partial<Coupon>): Promise<Coupon | undefined>;
  deleteCoupon(id: string): Promise<void>;

  // Tickets
  getAllTickets(limit?: number, offset?: number): Promise<Ticket[]>;
  getTicket(id: string): Promise<Ticket | undefined>;
  createTicket(data: InsertTicket): Promise<Ticket>;
  updateTicketStatus(id: string, status: string): Promise<Ticket | undefined>;
  replyToTicket(ticketId: string, userId: string, message: string, isStaff?: boolean): Promise<TicketReply>;
  getTicketReplies(ticketId: string): Promise<TicketReply[]>;

  // Campaigns
  getAllCampaigns(): Promise<Campaign[]>;
  getActiveCampaigns(): Promise<Campaign[]>;
  createCampaign(data: Partial<Campaign>): Promise<Campaign>;
  updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: string): Promise<void>;

  // Hero Sliders
  getAllHeroSliders(): Promise<HeroSlider[]>;
  getActiveHeroSliders(): Promise<HeroSlider[]>;
  getHeroSlider(id: string): Promise<HeroSlider | undefined>;
  createHeroSlider(data: Partial<HeroSlider>): Promise<HeroSlider>;
  updateHeroSlider(id: string, data: Partial<HeroSlider>): Promise<HeroSlider | undefined>;
  deleteHeroSlider(id: string): Promise<void>;

  // Reviews
  getAllReviews(): Promise<Review[]>;
  updateReviewApproval(id: string, approved: boolean): Promise<Review | undefined>;
  deleteReview(id: string): Promise<void>;

  // Payment Methods
  getAllPaymentMethods(): Promise<PaymentMethod[]>;
  createPaymentMethod(data: Partial<PaymentMethod>): Promise<PaymentMethod>;
  updatePaymentMethod(id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod | undefined>;
  deletePaymentMethod(id: string): Promise<void>;

  // Plugins
  getAllPlugins(): Promise<Plugin[]>;
  getPlugin(slug: string): Promise<Plugin | undefined>;
  upsertPlugin(slug: string, data: Partial<Plugin>): Promise<Plugin>;
  deletePlugin(slug: string): Promise<void>;

  // Notifications
  getAllNotifications(limit?: number): Promise<Notification[]>;
  createNotification(data: Partial<Notification>): Promise<Notification>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
  getUnreadNotificationCount(): Promise<number>;

  // Site Settings
  getAllSiteSettings(): Promise<SiteSetting[]>;
  getSiteSetting(key: string): Promise<SiteSetting | undefined>;
  upsertSiteSetting(key: string, value: string): Promise<SiteSetting>;
  upsertSiteSettings(settings: Record<string, string>): Promise<void>;

  // Dashboard
  getDashboardStats(): Promise<{
    totalUsers: number;
    totalOrders: number;
    totalRevenue: number;
    openTickets: number;
  }>;
  getAnalytics(from: Date, to: Date, groupBy: "hour" | "day" | "week" | "month"): Promise<{
    salesTrend: { label: string; sales: number }[];
    orderStatus: { name: string; value: number }[];
  }>;
}

// ─── Helper: fetch-after-write (no RETURNING needed) ─────────────────────────
async function fetchAfter<T>(
  table: any,
  id: string,
  idCol: any,
): Promise<T> {
  const [row] = await db.select().from(table).where(eq(idCol, id));
  return row as T;
}

export class DatabaseStorage implements IStorage {
  // ── Users ──────────────────────────────────────────────────────────────────
  async getUser(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByUsername(username: string) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  async getUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  async createUser(insertUser: InsertUser) {
    const id = randomUUID();
    await db.insert(users).values({ ...insertUser, id });
    return fetchAfter<User>(users, id, users.id);
  }
  async getAllUsers(limit = 50, offset = 0) {
    return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
  }
  async updateUser(id: string, data: Partial<User>) {
    await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id));
    return fetchAfter<User>(users, id, users.id);
  }
  async deleteUser(id: string) {
    await db.delete(users).where(eq(users.id, id));
  }
  async countUsers() {
    const [r] = await db.select({ count: count() }).from(users);
    return r.count;
  }
  async getSubscribedUsers() {
    return db.select().from(users).where(eq(users.isSubscribed, true)).orderBy(desc(users.createdAt));
  }

  // ── Games ──────────────────────────────────────────────────────────────────
  async getAllGames() {
    return db.select().from(games).orderBy(games.sortOrder, desc(games.createdAt));
  }
  async getTrendingGames() {
    return db.select().from(games)
      .where(eq(games.isTrending, true))
      .orderBy(games.sortOrder, desc(games.createdAt));
  }
  async getGame(id: string) {
    const [g] = await db.select().from(games).where(eq(games.id, id));
    return g;
  }
  async createGame(data: InsertGame) {
    const id = randomUUID();
    await db.insert(games).values({ ...data, id });
    return fetchAfter<Game>(games, id, games.id);
  }
  async updateGame(id: string, data: Partial<Game>) {
    await db.update(games).set({ ...data, updatedAt: new Date() }).where(eq(games.id, id));
    return fetchAfter<Game>(games, id, games.id);
  }
  async deleteGame(id: string) {
    await db.delete(games).where(eq(games.id, id));
  }
  async getGameBySlug(slug: string) {
    const [g] = await db.select().from(games).where(eq(games.slug, slug));
    return g;
  }

  // ── Services ───────────────────────────────────────────────────────────────
  async getAllServices(gameId?: string) {
    if (gameId) {
      return db.select().from(services)
        .where(eq(services.gameId, gameId))
        .orderBy(services.sortOrder, desc(services.createdAt));
    }
    return db.select().from(services).orderBy(services.sortOrder, desc(services.createdAt));
  }
  async getService(id: string) {
    const [s] = await db.select().from(services).where(eq(services.id, id));
    return s;
  }
  async createService(data: InsertService) {
    const id = randomUUID();
    await db.insert(services).values({ ...data, id });
    return fetchAfter<Service>(services, id, services.id);
  }
  async updateService(id: string, data: Partial<Service>) {
    await db.update(services).set(data).where(eq(services.id, id));
    return fetchAfter<Service>(services, id, services.id);
  }
  async deleteService(id: string) {
    await db.delete(services).where(eq(services.id, id));
  }

  // ── Products ───────────────────────────────────────────────────────────────
  async getAllProducts() {
    return db.select().from(products).orderBy(products.sortOrder);
  }
  async getProduct(id: string) {
    const [p] = await db.select().from(products).where(eq(products.id, id));
    return p;
  }
  async createProduct(data: InsertProduct) {
    const id = randomUUID();
    await db.insert(products).values({ ...data, id });
    return fetchAfter<Product>(products, id, products.id);
  }
  async updateProduct(id: string, data: Partial<Product>) {
    await db.update(products).set({ ...data, updatedAt: new Date() }).where(eq(products.id, id));
    return fetchAfter<Product>(products, id, products.id);
  }
  async deleteProduct(id: string) {
    await db.delete(products).where(eq(products.id, id));
  }

  // ── Product Packages ───────────────────────────────────────────────────────
  async getProductPackages(productId: string) {
    return db.select().from(productPackages)
      .where(eq(productPackages.productId, productId))
      .orderBy(productPackages.createdAt);
  }
  async createProductPackage(data: { productId: string; label: string; price: string; originalPrice?: string; isActive?: boolean }) {
    const id = randomUUID();
    await db.insert(productPackages).values({ id, ...data, isActive: data.isActive ?? true });
    return fetchAfter<ProductPackage>(productPackages, id, productPackages.id);
  }
  async deleteProductPackage(id: string) {
    await db.delete(productPackages).where(eq(productPackages.id, id));
  }

  // ── Orders ─────────────────────────────────────────────────────────────────
  async getAllOrders(limit = 50, offset = 0) {
    return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit).offset(offset);
  }
  async getOrdersByUser(userId: string) {
    return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  }
  async getOrderItemsByOrder(orderId: string) {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }
  async countOrders() {
    const [r] = await db.select({ count: count() }).from(orders);
    return r.count;
  }
  async getTotalRevenue() {
    const [r] = await db.select({ total: sum(orders.totalAmount) }).from(orders).where(eq(orders.status, "completed"));
    return parseFloat((r.total as string | null) ?? "0");
  }
  async updateOrderStatus(id: string, status: string) {
    await db.update(orders).set({ status: status as any, updatedAt: new Date() }).where(eq(orders.id, id));
    return fetchAfter<Order>(orders, id, orders.id);
  }

  // ── Transactions ───────────────────────────────────────────────────────────
  async getAllTransactions(limit = 50, offset = 0) {
    return db.select().from(transactions).orderBy(desc(transactions.createdAt)).limit(limit).offset(offset);
  }
  async getRefunds() {
    return db.select().from(transactions).where(eq(transactions.isRefund, true)).orderBy(desc(transactions.createdAt));
  }

  // ── Coupons ────────────────────────────────────────────────────────────────
  async getAllCoupons() {
    return db.select().from(coupons).orderBy(desc(coupons.createdAt));
  }
  async createCoupon(data: InsertCoupon) {
    const id = randomUUID();
    await db.insert(coupons).values({ ...data, id });
    return fetchAfter<Coupon>(coupons, id, coupons.id);
  }
  async updateCoupon(id: string, data: Partial<Coupon>) {
    await db.update(coupons).set(data).where(eq(coupons.id, id));
    return fetchAfter<Coupon>(coupons, id, coupons.id);
  }
  async deleteCoupon(id: string) {
    await db.delete(coupons).where(eq(coupons.id, id));
  }

  // ── Tickets ────────────────────────────────────────────────────────────────
  async getAllTickets(limit = 50, offset = 0) {
    return db.select().from(tickets).orderBy(desc(tickets.createdAt)).limit(limit).offset(offset);
  }
  async getTicket(id: string) {
    const [t] = await db.select().from(tickets).where(eq(tickets.id, id));
    return t;
  }
  async createTicket(data: InsertTicket) {
    const id = randomUUID();
    await db.insert(tickets).values({ ...data, id });
    return fetchAfter<Ticket>(tickets, id, tickets.id);
  }
  async updateTicketStatus(id: string, status: string) {
    await db.update(tickets).set({ status: status as any, updatedAt: new Date() }).where(eq(tickets.id, id));
    return fetchAfter<Ticket>(tickets, id, tickets.id);
  }
  async replyToTicket(ticketId: string, userId: string, message: string, isStaff = false) {
    const id = randomUUID();
    await db.insert(ticketReplies).values({ id, ticketId, userId, message, isStaff });
    return fetchAfter<TicketReply>(ticketReplies, id, ticketReplies.id);
  }
  async getTicketReplies(ticketId: string) {
    return db.select().from(ticketReplies).where(eq(ticketReplies.ticketId, ticketId)).orderBy(ticketReplies.createdAt);
  }

  // ── Campaigns ──────────────────────────────────────────────────────────────
  async getAllCampaigns() {
    return db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }
  async getActiveCampaigns() {
    const now = new Date();
    const all = await db.select().from(campaigns).where(eq(campaigns.isActive, true)).orderBy(desc(campaigns.createdAt));
    return all.filter((c) => {
      if (c.startsAt && c.startsAt > now) return false;
      if (c.endsAt && c.endsAt < now) return false;
      return true;
    });
  }
  async createCampaign(data: Partial<Campaign>) {
    const id = randomUUID();
    await db.insert(campaigns).values({ ...(data as any), id });
    return fetchAfter<Campaign>(campaigns, id, campaigns.id);
  }
  async updateCampaign(id: string, data: Partial<Campaign>) {
    await db.update(campaigns).set(data).where(eq(campaigns.id, id));
    return fetchAfter<Campaign>(campaigns, id, campaigns.id);
  }
  async deleteCampaign(id: string) {
    await db.delete(campaigns).where(eq(campaigns.id, id));
  }

  // ── Hero Sliders ───────────────────────────────────────────────────────────
  async getAllHeroSliders() {
    return db.select().from(heroSliders).orderBy(asc(heroSliders.sortOrder));
  }
  async getActiveHeroSliders() {
    const now = new Date();
    const all = await db.select().from(heroSliders).where(eq(heroSliders.isActive, true)).orderBy(asc(heroSliders.sortOrder));
    return all.filter((s) => {
      if (s.startsAt && s.startsAt > now) return false;
      if (s.endsAt && s.endsAt < now) return false;
      return true;
    });
  }
  async getHeroSlider(id: string) {
    const [s] = await db.select().from(heroSliders).where(eq(heroSliders.id, id));
    return s;
  }
  async createHeroSlider(data: Partial<HeroSlider>) {
    const id = randomUUID();
    await db.insert(heroSliders).values({ ...(data as any), id });
    return fetchAfter<HeroSlider>(heroSliders, id, heroSliders.id);
  }
  async updateHeroSlider(id: string, data: Partial<HeroSlider>) {
    await db.update(heroSliders).set(data as any).where(eq(heroSliders.id, id));
    return fetchAfter<HeroSlider>(heroSliders, id, heroSliders.id);
  }
  async deleteHeroSlider(id: string) {
    await db.delete(heroSliders).where(eq(heroSliders.id, id));
  }

  // ── Reviews ────────────────────────────────────────────────────────────────
  async getAllReviews() {
    return db.select().from(reviews).orderBy(desc(reviews.createdAt));
  }
  async updateReviewApproval(id: string, approved: boolean) {
    await db.update(reviews).set({ isApproved: approved }).where(eq(reviews.id, id));
    return fetchAfter<Review>(reviews, id, reviews.id);
  }
  async deleteReview(id: string) {
    await db.delete(reviews).where(eq(reviews.id, id));
  }

  // ── Payment Methods ────────────────────────────────────────────────────────
  async getAllPaymentMethods() {
    return db.select().from(paymentMethods).orderBy(paymentMethods.sortOrder);
  }
  async createPaymentMethod(data: Partial<PaymentMethod>) {
    const id = randomUUID();
    await db.insert(paymentMethods).values({ ...(data as any), id });
    return fetchAfter<PaymentMethod>(paymentMethods, id, paymentMethods.id);
  }
  async updatePaymentMethod(id: string, data: Partial<PaymentMethod>) {
    await db.update(paymentMethods).set(data).where(eq(paymentMethods.id, id));
    return fetchAfter<PaymentMethod>(paymentMethods, id, paymentMethods.id);
  }
  async deletePaymentMethod(id: string) {
    await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
  }

  // ── Plugins ────────────────────────────────────────────────────────────────
  async getAllPlugins() {
    return db.select().from(plugins).orderBy(plugins.name);
  }
  async getPlugin(slug: string) {
    const [p] = await db.select().from(plugins).where(eq(plugins.slug, slug));
    return p;
  }
  async upsertPlugin(slug: string, data: Partial<Plugin>) {
    const existing = await this.getPlugin(slug);
    if (existing) {
      await db.update(plugins).set({ ...data, updatedAt: new Date() }).where(eq(plugins.slug, slug));
      return fetchAfter<Plugin>(plugins, existing.id, plugins.id);
    } else {
      const id = randomUUID();
      await db.insert(plugins).values({ id, slug, name: data.name ?? slug, ...data });
      return fetchAfter<Plugin>(plugins, id, plugins.id);
    }
  }
  async deletePlugin(slug: string) {
    await db.delete(plugins).where(eq(plugins.slug, slug));
  }

  // ── Notifications ──────────────────────────────────────────────────────────
  async getAllNotifications(limit = 30) {
    return db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(limit);
  }
  async createNotification(data: Partial<Notification>) {
    const id = randomUUID();
    await db.insert(notifications).values({ id, type: "info", title: "Notification", message: "", ...data } as any);
    return fetchAfter<Notification>(notifications, id, notifications.id);
  }
  async markNotificationRead(id: string) {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }
  async markAllNotificationsRead() {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.isRead, false));
  }
  async getUnreadNotificationCount() {
    const [r] = await db.select({ count: count() }).from(notifications).where(eq(notifications.isRead, false));
    return r.count;
  }

  // ── Site Settings ──────────────────────────────────────────────────────────
  async getAllSiteSettings() {
    return db.select().from(siteSettings);
  }
  async getSiteSetting(key: string) {
    const [s] = await db.select().from(siteSettings).where(eq(siteSettings.key, key));
    return s;
  }
  async upsertSiteSetting(key: string, value: string) {
    const existing = await this.getSiteSetting(key);
    if (existing) {
      await db.update(siteSettings).set({ value, updatedAt: new Date() }).where(eq(siteSettings.key, key));
      return fetchAfter<SiteSetting>(siteSettings, existing.id, siteSettings.id);
    } else {
      const id = randomUUID();
      await db.insert(siteSettings).values({ id, key, value });
      return fetchAfter<SiteSetting>(siteSettings, id, siteSettings.id);
    }
  }
  async upsertSiteSettings(settings: Record<string, string>) {
    await Promise.all(Object.entries(settings).map(([k, v]) => this.upsertSiteSetting(k, v)));
  }

  // ── Dashboard Stats ────────────────────────────────────────────────────────
  async getDashboardStats() {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [orderCount] = await db.select({ count: count() }).from(orders);
    const [revenueRow] = await db.select({ total: sum(orders.totalAmount) }).from(orders).where(eq(orders.status, "completed"));
    const [ticketCount] = await db.select({ count: count() }).from(tickets).where(eq(tickets.status, "open"));
    return {
      totalUsers: userCount.count,
      totalOrders: orderCount.count,
      totalRevenue: parseFloat((revenueRow.total as string | null) ?? "0"),
      openTickets: ticketCount.count,
    };
  }

  // ── Analytics ──────────────────────────────────────────────────────────────
  async getAnalytics(from: Date, to: Date, groupBy: "hour" | "day" | "week" | "month") {
    const trunc =
      groupBy === "hour" ? sql`date_trunc('hour', ${orders.createdAt})`
      : groupBy === "day" ? sql`date_trunc('day', ${orders.createdAt})`
      : groupBy === "week" ? sql`date_trunc('week', ${orders.createdAt})`
      : sql`date_trunc('month', ${orders.createdAt})`;

    const trendRows = await db
      .select({
        period: trunc.as("period"),
        revenue: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)`.as("revenue"),
      })
      .from(orders)
      .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to)))
      .groupBy(trunc)
      .orderBy(trunc);

    function fmtLabel(period: unknown, gb: string) {
      const d = new Date(period as string);
      if (gb === "hour") return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
      if (gb === "day") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (gb === "week") return `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleDateString("en-US", { month: "short" })}`;
      return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    }

    const salesTrend = trendRows.map((r) => ({
      label: fmtLabel(r.period, groupBy),
      sales: parseFloat(String(r.revenue)),
    }));

    const statusRows = await db
      .select({ status: orders.status, cnt: count() })
      .from(orders)
      .where(and(gte(orders.createdAt, from), lte(orders.createdAt, to)))
      .groupBy(orders.status);

    const totalOrds = statusRows.reduce((s, r) => s + r.cnt, 0);
    const statusMap: Record<string, string> = {
      completed: "Successful",
      refunded: "Refunded",
      failed: "Failed",
      pending: "Pending",
      processing: "Processing",
    };
    const orderStatus = statusRows.map((r) => ({
      name: statusMap[r.status] ?? r.status,
      value: totalOrds > 0 ? Math.round((r.cnt / totalOrds) * 100) : 0,
    }));

    return { salesTrend, orderStatus };
  }
}

export const storage = new DatabaseStorage();
