import { randomUUID } from "crypto";
import { generateTicketNumber, generateTransactionNumber, generateOrderNumber } from "./lib/idGenerator";
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
  type EmailTemplate,
  type PasswordResetToken,
  type Fee, type InsertFee,
  type SmileOneConfig,
  type SmileOneMapping, type InsertSmileOneMapping,
  type BusanConfig,
  type BusanMapping, type InsertBusanMapping,
  users, games, services, products, productPackages, orders, orderItems,
  transactions, coupons, tickets, ticketReplies,
  campaigns, heroSliders, reviews, paymentMethods, plugins,
  notifications, siteSettings, emailTemplates, passwordResetTokens, fees,
  smileOneConfigs, smileOneMappings,
  busanConfigs, busanMappings,
  upiPaymentSettings, unmatchedPayments,
  rolePermissions,
  type UpiPaymentSettings, type InsertUpiPaymentSettings,
  type UnmatchedPayment, type InsertUnmatchedPayment,
  type RolePermission,
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
  createProductPackage(data: { productId: string; label: string; price: string; originalPrice?: string; isActive?: boolean; stock?: number | null }): Promise<ProductPackage>;
  updateProductPackage(id: string, data: Partial<ProductPackage>): Promise<ProductPackage | undefined>;
  deleteProductPackage(id: string): Promise<void>;
  decrementServiceStock(serviceId: string, qty: number): Promise<void>;
  decrementPackageStock(packageId: string, qty: number): Promise<void>;

  // Orders
  getAllOrders(limit?: number, offset?: number): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | undefined>;
  getOrdersByUser(userId: string): Promise<Order[]>;
  getOrderItemsByOrder(orderId: string): Promise<any[]>;
  countOrders(): Promise<number>;
  getTotalRevenue(): Promise<number>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  updateOrderAmount(id: string, amount: string): Promise<void>;
  updateOrderDelivery(id: string, deliveryStatus: string, deliveryNote?: string): Promise<void>;

  // Transactions
  getAllTransactions(limit?: number, offset?: number): Promise<Transaction[]>;
  getRefunds(): Promise<Transaction[]>;

  // Coupons
  getAllCoupons(): Promise<Coupon[]>;
  getCouponByCode(code: string): Promise<Coupon | undefined>;
  createCoupon(data: InsertCoupon): Promise<Coupon>;
  updateCoupon(id: string, data: Partial<Coupon>): Promise<Coupon | undefined>;
  deleteCoupon(id: string): Promise<void>;
  incrementCouponUsage(id: string): Promise<void>;

  // Tickets
  getAllTickets(limit?: number, offset?: number): Promise<Ticket[]>;
  getUserTickets(userId: string): Promise<Ticket[]>;
  getTicket(id: string): Promise<Ticket | undefined>;
  createTicket(data: InsertTicket): Promise<Ticket>;
  updateTicketStatus(id: string, status: string): Promise<Ticket | undefined>;
  replyToTicket(ticketId: string, userId: string, message: string, isStaff?: boolean, attachmentUrl?: string): Promise<TicketReply>;
  getTicketReplies(ticketId: string): Promise<TicketReply[]>;
  clearTicketAttachments(ticketId: string): Promise<string[]>;

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
  getActivePaymentMethods(): Promise<PaymentMethod[]>;
  getPaymentMethodByType(type: string): Promise<PaymentMethod | undefined>;
  createPaymentMethod(data: Partial<PaymentMethod>): Promise<PaymentMethod>;
  updatePaymentMethod(id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod | undefined>;
  deletePaymentMethod(id: string): Promise<void>;

  // Plugins
  getAllPlugins(): Promise<Plugin[]>;
  getPlugin(slug: string): Promise<Plugin | undefined>;
  upsertPlugin(slug: string, data: Partial<Plugin>): Promise<Plugin>;
  deletePlugin(slug: string): Promise<void>;

  // Email Templates
  getAllEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplate(type: string): Promise<EmailTemplate | undefined>;
  upsertEmailTemplate(type: string, data: Partial<EmailTemplate>): Promise<EmailTemplate>;

  // Notifications
  getAllNotifications(limit?: number): Promise<Notification[]>;
  createNotification(data: Partial<Notification>): Promise<Notification>;
  markNotificationRead(id: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
  clearAllNotifications(): Promise<void>;
  getUnreadNotificationCount(): Promise<number>;

  // Site Settings
  getAllSiteSettings(): Promise<SiteSetting[]>;
  getSiteSetting(key: string): Promise<SiteSetting | undefined>;
  upsertSiteSetting(key: string, value: string): Promise<SiteSetting>;
  upsertSiteSettings(settings: Record<string, string>): Promise<void>;

  // Fees
  getAllFees(): Promise<Fee[]>;
  getActiveFees(): Promise<Fee[]>;
  getFee(id: string): Promise<Fee | undefined>;
  createFee(data: InsertFee): Promise<Fee>;
  updateFee(id: string, data: Partial<Fee>): Promise<Fee | undefined>;
  deleteFee(id: string): Promise<void>;

  // Smile.one Config
  getSmileOneConfig(): Promise<SmileOneConfig | undefined>;
  upsertSmileOneConfig(data: Partial<SmileOneConfig>): Promise<SmileOneConfig>;

  // Smile.one Mappings
  getAllSmileOneMappings(): Promise<SmileOneMapping[]>;
  getSmileOneMappingsByGame(gameSlug: string): Promise<SmileOneMapping[]>;
  createSmileOneMapping(data: InsertSmileOneMapping): Promise<SmileOneMapping>;
  updateSmileOneMapping(id: string, data: Partial<SmileOneMapping>): Promise<SmileOneMapping | undefined>;
  deleteSmileOneMapping(id: string): Promise<void>;

  // Busan Config
  getBusanConfig(): Promise<BusanConfig | undefined>;
  upsertBusanConfig(data: Partial<BusanConfig>): Promise<BusanConfig>;

  // Busan Mappings
  getAllBusanMappings(): Promise<BusanMapping[]>;
  getBusanMappingByCmsProductId(cmsProductId: string): Promise<BusanMapping | undefined>;
  createBusanMapping(data: InsertBusanMapping): Promise<BusanMapping>;
  deleteBusanMapping(id: string): Promise<void>;

  // Orders (create)
  createOrder(data: { id: string; orderNumber: string; userId?: string; totalAmount: string; currency: string; notes?: string; status?: string; paymentMethod?: string }): Promise<Order>;
  createOrderItem(data: { orderId: string; productId?: string; packageId?: string; productTitle: string; packageLabel?: string; quantity: number; unitPrice: string; totalPrice: string }): Promise<void>;

  // UPI Payment Settings
  getUpiSettings(): Promise<UpiPaymentSettings | undefined>;
  upsertUpiSettings(data: Partial<InsertUpiPaymentSettings>): Promise<UpiPaymentSettings>;

  // Unmatched Payments
  getUnmatchedPayments(): Promise<UnmatchedPayment[]>;
  createUnmatchedPayment(data: Omit<InsertUnmatchedPayment, "assignedToOrderId">): Promise<UnmatchedPayment>;
  assignUnmatchedPayment(id: string, orderId: string): Promise<void>;

  // UPI Order Matching
  getPendingUpiOrders(amount: string): Promise<Order[]>;
  updateOrderPaymentVerified(orderId: string, utr: string): Promise<void>;
  updateOrderUtrSubmitted(orderId: string, utr: string): Promise<void>;

  // Password Reset Tokens
  createPasswordResetToken(userId: string, otpHash: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(id: string): Promise<PasswordResetToken | undefined>;
  getLatestPasswordResetTokenByUserId(userId: string): Promise<PasswordResetToken | undefined>;
  updatePasswordResetToken(id: string, data: Partial<PasswordResetToken>): Promise<void>;
  deletePasswordResetTokensByUserId(userId: string): Promise<void>;

  // Dashboard
  getDashboardStats(): Promise<{
    totalUsers: number;
    totalOrders: number;
    totalRevenue: number;
    openTickets: number;
  }>;
  getAnalytics(from: Date, to: Date, groupBy: "hour" | "day" | "week" | "month", timezone?: string): Promise<{
    salesTrend: { label: string; sales: number }[];
    orderStatus: { name: string; value: number }[];
  }>;

  // Role Permissions
  getAllRolePermissions(): Promise<RolePermission[]>;
  getRolePermission(role: string): Promise<RolePermission | undefined>;
  upsertRolePermission(role: string, label: string, permissions: string[], isSystem?: boolean): Promise<RolePermission>;
  deleteRolePermission(role: string): Promise<void>;
  updateRolePermissionOrders(orders: { role: string; sortOrder: number }[]): Promise<void>;
  seedDefaultRolePermissions(): Promise<void>;
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
    // Generate sequential numeric ID padded to minimum 6 digits
    const allIds = await db.select({ id: users.id }).from(users);
    const maxNum = allIds
      .filter((u) => /^\d+$/.test(u.id))
      .map((u) => parseInt(u.id, 10))
      .reduce((max, n) => Math.max(max, n), 0);
    const nextNum = maxNum + 1;
    const id = String(nextNum).padStart(6, "0");
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
  async createProductPackage(data: { productId: string; label: string; price: string; originalPrice?: string; isActive?: boolean; stock?: number | null }) {
    const id = randomUUID();
    await db.insert(productPackages).values({ id, ...data, isActive: data.isActive ?? true });
    return fetchAfter<ProductPackage>(productPackages, id, productPackages.id);
  }
  async updateProductPackage(id: string, data: Partial<ProductPackage>) {
    await db.update(productPackages).set(data).where(eq(productPackages.id, id));
    return fetchAfter<ProductPackage>(productPackages, id, productPackages.id);
  }
  async deleteProductPackage(id: string) {
    await db.delete(productPackages).where(eq(productPackages.id, id));
  }
  async decrementServiceStock(serviceId: string, qty: number) {
    const [svc] = await db.select({ stock: services.stock }).from(services).where(eq(services.id, serviceId));
    if (svc && svc.stock !== null) {
      const next = Math.max(0, (svc.stock ?? 0) - qty);
      await db.update(services).set({ stock: next }).where(eq(services.id, serviceId));
    }
  }
  async decrementPackageStock(packageId: string, qty: number) {
    const [pkg] = await db.select({ stock: productPackages.stock }).from(productPackages).where(eq(productPackages.id, packageId));
    if (pkg && pkg.stock !== null) {
      const next = Math.max(0, (pkg.stock ?? 0) - qty);
      await db.update(productPackages).set({ stock: next }).where(eq(productPackages.id, packageId));
    }
  }

  // ── Orders ─────────────────────────────────────────────────────────────────
  async getAllOrders(limit = 50, offset = 0) {
    return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit).offset(offset);
  }
  async getOrderById(id: string) {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
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
  async updateOrderAmount(id: string, amount: string): Promise<void> {
    await db.update(orders).set({ totalAmount: amount, updatedAt: new Date() }).where(eq(orders.id, id));
  }
  async updateOrderDelivery(id: string, deliveryStatus: string, deliveryNote?: string): Promise<void> {
    await db.update(orders).set({ deliveryStatus, deliveryNote: deliveryNote ?? null, updatedAt: new Date() }).where(eq(orders.id, id));
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
  async getCouponByCode(code: string) {
    const upper = code.trim().toUpperCase();
    const [row] = await db.select().from(coupons)
      .where(eq(sql`UPPER(${coupons.code})`, upper))
      .limit(1);
    return row;
  }

  async deleteCoupon(id: string) {
    await db.delete(coupons).where(eq(coupons.id, id));
  }

  async incrementCouponUsage(id: string) {
    await db.update(coupons).set({ usedCount: sql`${coupons.usedCount} + 1` }).where(eq(coupons.id, id));
  }

  // ── Tickets ────────────────────────────────────────────────────────────────
  async getAllTickets(limit = 50, offset = 0) {
    return db.select().from(tickets).orderBy(desc(tickets.createdAt)).limit(limit).offset(offset);
  }
  async getUserTickets(userId: string) {
    return db.select().from(tickets).where(eq(tickets.userId, userId)).orderBy(desc(tickets.createdAt));
  }
  async getTicket(id: string) {
    const [t] = await db.select().from(tickets).where(eq(tickets.id, id));
    return t;
  }
  async createTicket(data: InsertTicket) {
    const id = randomUUID();
    const ticketNumber = generateTicketNumber();
    await db.insert(tickets).values({ ...data, id, ticketNumber });
    return fetchAfter<Ticket>(tickets, id, tickets.id);
  }
  async updateTicketStatus(id: string, status: string) {
    await db.update(tickets).set({ status: status as any, updatedAt: new Date() }).where(eq(tickets.id, id));
    return fetchAfter<Ticket>(tickets, id, tickets.id);
  }
  async replyToTicket(ticketId: string, userId: string, message: string, isStaff = false, attachmentUrl?: string) {
    const id = randomUUID();
    await db.insert(ticketReplies).values({ id, ticketId, userId, message, isStaff, attachmentUrl });
    return fetchAfter<TicketReply>(ticketReplies, id, ticketReplies.id);
  }
  async getTicketReplies(ticketId: string) {
    return db.select().from(ticketReplies).where(eq(ticketReplies.ticketId, ticketId)).orderBy(ticketReplies.createdAt);
  }
  async clearTicketAttachments(ticketId: string): Promise<string[]> {
    const replies = await db.select({ id: ticketReplies.id, attachmentUrl: ticketReplies.attachmentUrl })
      .from(ticketReplies)
      .where(eq(ticketReplies.ticketId, ticketId));
    const urls: string[] = replies.filter((r) => r.attachmentUrl).map((r) => r.attachmentUrl as string);
    if (urls.length > 0) {
      await db.update(ticketReplies)
        .set({ attachmentUrl: null })
        .where(eq(ticketReplies.ticketId, ticketId));
    }
    return urls;
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
    const cleanData = {
      ...(data as any),
      linkedGameId: data.linkedGameId || null,
      linkedProductId: data.linkedProductId || null,
      id,
    };
    await db.insert(heroSliders).values(cleanData);
    return fetchAfter<HeroSlider>(heroSliders, id, heroSliders.id);
  }
  async updateHeroSlider(id: string, data: Partial<HeroSlider>) {
    const cleanData = {
      ...data,
      linkedGameId: data.linkedGameId || null,
      linkedProductId: data.linkedProductId || null,
    };
    await db.update(heroSliders).set(cleanData as any).where(eq(heroSliders.id, id));
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
  async getActivePaymentMethods() {
    return db.select().from(paymentMethods).where(eq(paymentMethods.isActive, true)).orderBy(paymentMethods.sortOrder);
  }
  async getPaymentMethodByName(name: string) {
    return db.select().from(paymentMethods).where(eq(paymentMethods.name, name)).then(rows => rows[0]);
  }
  async getPaymentMethodByType(type: string) {
    return db.select().from(paymentMethods).where(eq(paymentMethods.type, type)).then(rows => rows[0]);
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

  // ── Email Templates ─────────────────────────────────────────────────────────
  async getAllEmailTemplates() {
    return db.select().from(emailTemplates).orderBy(emailTemplates.type);
  }
  async getEmailTemplate(type: string) {
    const [t] = await db.select().from(emailTemplates).where(eq(emailTemplates.type, type));
    return t;
  }
  async upsertEmailTemplate(type: string, data: Partial<EmailTemplate>) {
    const existing = await this.getEmailTemplate(type);
    if (existing) {
      await db.update(emailTemplates).set({ ...data, updatedAt: new Date() }).where(eq(emailTemplates.type, type));
      return fetchAfter<EmailTemplate>(emailTemplates, existing.id, emailTemplates.id);
    } else {
      const id = randomUUID();
      await db.insert(emailTemplates).values({ id, type, name: data.name ?? type, subject: "", title: "", body: "", ...data } as any);
      return fetchAfter<EmailTemplate>(emailTemplates, id, emailTemplates.id);
    }
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
  async clearAllNotifications() {
    await db.delete(notifications);
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

  // ── Fees ────────────────────────────────────────────────────────────────────
  async getAllFees() {
    return db.select().from(fees).orderBy(asc(fees.sortOrder));
  }
  async getActiveFees() {
    return db.select().from(fees).where(eq(fees.isActive, true)).orderBy(asc(fees.sortOrder));
  }
  async getFee(id: string) {
    const [f] = await db.select().from(fees).where(eq(fees.id, id));
    return f;
  }
  async createFee(data: InsertFee) {
    const id = randomUUID();
    await db.insert(fees).values({ ...data, id });
    return fetchAfter<Fee>(fees, id, fees.id);
  }
  async updateFee(id: string, data: Partial<Fee>) {
    const existing = await this.getFee(id);
    if (!existing) return undefined;
    await db.update(fees).set({ ...data, updatedAt: new Date() }).where(eq(fees.id, id));
    return fetchAfter<Fee>(fees, id, fees.id);
  }
  async deleteFee(id: string) {
    await db.delete(fees).where(eq(fees.id, id));
  }

  // ── Password Reset Tokens ──────────────────────────────────────────────────
  async createPasswordResetToken(userId: string, otpHash: string, expiresAt: Date) {
    const id = randomUUID();
    await db.insert(passwordResetTokens).values({ id, userId, otpHash, expiresAt });
    return fetchAfter<PasswordResetToken>(passwordResetTokens, id, passwordResetTokens.id);
  }
  async getPasswordResetToken(id: string) {
    const [row] = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.id, id));
    return row;
  }
  async getLatestPasswordResetTokenByUserId(userId: string) {
    const [row] = await db.select().from(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId))
      .orderBy(desc(passwordResetTokens.createdAt))
      .limit(1);
    return row;
  }
  async updatePasswordResetToken(id: string, data: Partial<PasswordResetToken>) {
    await db.update(passwordResetTokens).set(data).where(eq(passwordResetTokens.id, id));
  }
  async deletePasswordResetTokensByUserId(userId: string) {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
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
  async getAnalytics(from: Date, to: Date, groupBy: "hour" | "day" | "week" | "month", timezone = "UTC") {
    const trunc =
      groupBy === "hour" ? sql`to_char(${orders.createdAt}, 'YYYY-MM-DD HH24:00:00')`
      : groupBy === "day" ? sql`to_char(${orders.createdAt}, 'YYYY-MM-DD')`
      : groupBy === "week" ? sql`to_char(date_trunc('week', ${orders.createdAt}), 'YYYY-MM-DD')`
      : sql`to_char(date_trunc('month', ${orders.createdAt}), 'YYYY-MM-DD')`;

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
      // PostgreSQL to_char returns plain strings like "2026-04-08 14:00:00" (no timezone marker).
      // Append "Z" so JavaScript parses them as UTC, then format using the site timezone
      // so hourly labels appear in the admin's local time, not UTC.
      const raw = (period as string).trim();
      const iso = raw.includes("T") ? raw : raw.replace(" ", "T") + "Z";
      const d = new Date(iso);
      const tz = timezone || "UTC";
      if (gb === "hour") return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: tz });
      if (gb === "day") return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: tz });
      if (gb === "week") {
        // Compute the day-of-month in the target timezone to derive week number
        const dayInTz = parseInt(d.toLocaleDateString("en-US", { day: "numeric", timeZone: tz }), 10);
        return `W${Math.ceil(dayInTz / 7)} ${d.toLocaleDateString("en-US", { month: "short", timeZone: tz })}`;
      }
      return d.toLocaleDateString("en-US", { month: "short", year: "2-digit", timeZone: tz });
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

  // ── Smile.one Config ────────────────────────────────────────────────────────
  async getSmileOneConfig(): Promise<SmileOneConfig | undefined> {
    const rows = await db.select().from(smileOneConfigs).limit(1);
    return rows[0];
  }

  async upsertSmileOneConfig(data: Partial<SmileOneConfig>): Promise<SmileOneConfig> {
    const existing = await this.getSmileOneConfig();
    if (existing) {
      await db
        .update(smileOneConfigs)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(smileOneConfigs.id, existing.id));
      return (await this.getSmileOneConfig())!;
    }
    const id = randomUUID();
    await db
      .insert(smileOneConfigs)
      .values({ id, ...data, updatedAt: new Date() } as SmileOneConfig);
    const [created] = await db.select().from(smileOneConfigs).where(eq(smileOneConfigs.id, id));
    return created;
  }

  // ── Smile.one Mappings ───────────────────────────────────────────────────────
  async getAllSmileOneMappings(): Promise<SmileOneMapping[]> {
    return db.select().from(smileOneMappings).orderBy(desc(smileOneMappings.createdAt));
  }

  async getSmileOneMappingsByGame(gameSlug: string): Promise<SmileOneMapping[]> {
    return db.select().from(smileOneMappings).where(eq(smileOneMappings.gameSlug, gameSlug));
  }

  async createSmileOneMapping(data: InsertSmileOneMapping): Promise<SmileOneMapping> {
    const id = randomUUID();
    await db.insert(smileOneMappings).values({ id, ...data });
    const [created] = await db.select().from(smileOneMappings).where(eq(smileOneMappings.id, id));
    return created;
  }

  async updateSmileOneMapping(id: string, data: Partial<SmileOneMapping>): Promise<SmileOneMapping | undefined> {
    await db
      .update(smileOneMappings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(smileOneMappings.id, id));
    const [updated] = await db.select().from(smileOneMappings).where(eq(smileOneMappings.id, id));
    return updated;
  }

  async deleteSmileOneMapping(id: string): Promise<void> {
    await db.delete(smileOneMappings).where(eq(smileOneMappings.id, id));
  }

  // ── Busan Config ─────────────────────────────────────────────────────────────
  async getBusanConfig(): Promise<BusanConfig | undefined> {
    const rows = await db.select().from(busanConfigs).limit(1);
    return rows[0];
  }

  async upsertBusanConfig(data: Partial<BusanConfig>): Promise<BusanConfig> {
    const existing = await this.getBusanConfig();
    if (existing) {
      await db
        .update(busanConfigs)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(busanConfigs.id, existing.id));
      return (await this.getBusanConfig())!;
    }
    const id = randomUUID();
    await db
      .insert(busanConfigs)
      .values({ id, ...data, updatedAt: new Date() } as BusanConfig);
    const [created] = await db.select().from(busanConfigs).where(eq(busanConfigs.id, id));
    return created;
  }

  // ── Busan Mappings ───────────────────────────────────────────────────────────
  async getAllBusanMappings(): Promise<BusanMapping[]> {
    return db.select().from(busanMappings).orderBy(desc(busanMappings.createdAt));
  }

  async getBusanMappingByCmsProductId(cmsProductId: string): Promise<BusanMapping | undefined> {
    const [row] = await db.select().from(busanMappings).where(eq(busanMappings.cmsProductId, cmsProductId));
    return row;
  }

  async createBusanMapping(data: InsertBusanMapping): Promise<BusanMapping> {
    const id = randomUUID();
    await db.insert(busanMappings).values({ id, ...data });
    const [created] = await db.select().from(busanMappings).where(eq(busanMappings.id, id));
    return created;
  }

  async deleteBusanMapping(id: string): Promise<void> {
    await db.delete(busanMappings).where(eq(busanMappings.id, id));
  }

  // ── Orders (create) ──────────────────────────────────────────────────────────
  async createOrder(data: { id: string; orderNumber: string; userId?: string; totalAmount: string; currency: string; notes?: string; status?: string; paymentMethod?: string }): Promise<Order> {
    await db
      .insert(orders)
      .values({
        id: data.id,
        orderNumber: data.orderNumber,
        userId: data.userId,
        totalAmount: data.totalAmount,
        currency: data.currency,
        notes: data.notes,
        status: (data.status as any) ?? "pending",
        paymentMethod: data.paymentMethod,
      });
    const [created] = await db.select().from(orders).where(eq(orders.id, data.id));
    return created;
  }

  async createOrderItem(data: { orderId: string; productId?: string; packageId?: string; productTitle: string; packageLabel?: string; quantity: number; unitPrice: string; totalPrice: string }): Promise<void> {
    await db.insert(orderItems).values({
      id: randomUUID(),
      orderId: data.orderId,
      productId: data.productId,
      packageId: data.packageId,
      productTitle: data.productTitle,
      packageLabel: data.packageLabel,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      totalPrice: data.totalPrice,
    });
  }

  // ── UPI Payment Settings ──────────────────────────────────────────────────────
  async getUpiSettings(): Promise<UpiPaymentSettings | undefined> {
    const [row] = await db.select().from(upiPaymentSettings).limit(1);
    return row;
  }

  async upsertUpiSettings(data: Partial<InsertUpiPaymentSettings>): Promise<UpiPaymentSettings> {
    const existing = await this.getUpiSettings();
    if (existing) {
      await db.update(upiPaymentSettings)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(upiPaymentSettings.id, existing.id));
      return (await this.getUpiSettings())!;
    } else {
      const id = randomUUID();
      await db.insert(upiPaymentSettings).values({ id, ...data } as any);
      return (await this.getUpiSettings())!;
    }
  }

  // ── Unmatched Payments ────────────────────────────────────────────────────────
  async getUnmatchedPayments(): Promise<UnmatchedPayment[]> {
    return db.select().from(unmatchedPayments).orderBy(desc(unmatchedPayments.detectedAt));
  }

  async createUnmatchedPayment(data: Omit<InsertUnmatchedPayment, "assignedToOrderId">): Promise<UnmatchedPayment> {
    const id = randomUUID();
    await db.insert(unmatchedPayments).values({ id, ...data } as any);
    const [row] = await db.select().from(unmatchedPayments).where(eq(unmatchedPayments.id, id));
    return row;
  }

  async assignUnmatchedPayment(id: string, orderId: string): Promise<void> {
    await db.update(unmatchedPayments)
      .set({ assignedToOrderId: orderId })
      .where(eq(unmatchedPayments.id, id));
  }

  // ── UPI Order Matching ────────────────────────────────────────────────────────
  async getPendingUpiOrders(amount: string): Promise<Order[]> {
    const windowStart = new Date(Date.now() - 2 * 60 * 60 * 1000);
    return db.select().from(orders).where(
      and(
        eq(orders.status, "pending"),
        eq(orders.paymentMethod as any, "manual_upi"),
        eq(orders.totalAmount, amount),
        gte(orders.createdAt, windowStart),
      )
    );
  }

  async updateOrderPaymentVerified(orderId: string, utr: string): Promise<void> {
    await db.update(orders)
      .set({
        status: "completed",
        utr,
        paymentVerifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));
  }

  async updateOrderUtrSubmitted(orderId: string, utr: string): Promise<void> {
    await db.update(orders)
      .set({
        utr,
        status: "payment_review",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));
  }

  // ── Role Permissions ──────────────────────────────────────────────────────────
  async getAllRolePermissions(): Promise<RolePermission[]> {
    return db.select().from(rolePermissions).orderBy(asc(rolePermissions.createdAt));
  }

  async getRolePermission(role: string): Promise<RolePermission | undefined> {
    const [row] = await db.select().from(rolePermissions).where(eq(rolePermissions.role, role));
    return row;
  }

  async upsertRolePermission(role: string, label: string, permissions: string[], isSystem = false): Promise<RolePermission> {
    const existing = await this.getRolePermission(role);
    if (existing) {
      await db.update(rolePermissions)
        .set({ label, permissions: JSON.stringify(permissions), isSystem, updatedAt: new Date() })
        .where(eq(rolePermissions.role, role));
    } else {
      const id = randomUUID();
      await db.insert(rolePermissions).values({ id, role, label, permissions: JSON.stringify(permissions), isSystem });
    }
    return (await this.getRolePermission(role))!;
  }

  async deleteRolePermission(role: string): Promise<void> {
    await db.delete(rolePermissions).where(eq(rolePermissions.role, role));
  }

  async updateRolePermissionOrders(orders: { role: string; sortOrder: number }[]): Promise<void> {
    for (const { role, sortOrder } of orders) {
      await db.update(rolePermissions)
        .set({ sortOrder, updatedAt: new Date() })
        .where(eq(rolePermissions.role, role));
    }
  }

  async seedDefaultRolePermissions(): Promise<void> {
    const ALL_PERMS = [
      "dashboard","topup_orders","voucher_orders","payments","refunds",
      "contact_submissions","support_tickets","games","gift_cards","vouchers",
      "subscriptions","users","subscribers","campaigns","coupons",
      "control_panel","payment_method","api_integration","email_templates",
      "theme","content","roles_permissions"
    ];
    // sortOrder: higher = higher authority (super_admin=4, admin=3, staff=2, user=1)
    const defaults: Array<{ role: string; label: string; isSystem: boolean; permissions: string[]; sortOrder: number }> = [
      { role: "super_admin", label: "Super Admin", isSystem: true, sortOrder: 4, permissions: ALL_PERMS },
      { role: "admin", label: "Admin", isSystem: true, sortOrder: 3, permissions: ALL_PERMS.filter(p => p !== "roles_permissions") },
      { role: "staff", label: "Staff", isSystem: true, sortOrder: 2, permissions: ["dashboard","topup_orders","voucher_orders","contact_submissions","support_tickets","users"] },
      { role: "user", label: "User", isSystem: true, sortOrder: 1, permissions: [] },
    ];
    for (const d of defaults) {
      const existing = await this.getRolePermission(d.role);
      if (!existing) {
        const id = randomUUID();
        await db.insert(rolePermissions).values({ id, role: d.role, label: d.label, isSystem: d.isSystem, sortOrder: d.sortOrder, permissions: JSON.stringify(d.permissions) });
      } else {
        // Update sortOrder if it's still 0 (first time migration)
        if (existing.sortOrder === 0) {
          await db.update(rolePermissions).set({ sortOrder: d.sortOrder }).where(eq(rolePermissions.role, d.role));
        }
      }
    }
  }
}

export const storage = new DatabaseStorage();
