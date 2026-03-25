import { randomUUID } from "crypto";
import {
  type User, type InsertUser,
  type Product, type InsertProduct,
  type Order,
  type Transaction,
  type Coupon, type InsertCoupon,
  type Ticket, type InsertTicket,
  type TicketReply,
  type Campaign,
  type Review,
  type PaymentMethod,
  users, products, productPackages, orders, orderItems,
  transactions, coupons, tickets, ticketReplies,
  campaigns, reviews, paymentMethods,
} from "@shared/schema";
import { eq, desc, count, sum, sql } from "drizzle-orm";
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

  // Products
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(data: InsertProduct): Promise<Product>;
  updateProduct(id: string, data: Partial<Product>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;

  // Orders
  getAllOrders(limit?: number, offset?: number): Promise<Order[]>;
  getOrdersByUser(userId: string): Promise<Order[]>;
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
  createCampaign(data: Partial<Campaign>): Promise<Campaign>;
  updateCampaign(id: string, data: Partial<Campaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: string): Promise<void>;

  // Reviews
  getAllReviews(): Promise<Review[]>;
  updateReviewApproval(id: string, approved: boolean): Promise<Review | undefined>;
  deleteReview(id: string): Promise<void>;

  // Payment Methods
  getAllPaymentMethods(): Promise<PaymentMethod[]>;
  createPaymentMethod(data: Partial<PaymentMethod>): Promise<PaymentMethod>;
  updatePaymentMethod(id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod | undefined>;
  deletePaymentMethod(id: string): Promise<void>;

  // Dashboard
  getDashboardStats(): Promise<{
    totalUsers: number;
    totalOrders: number;
    totalRevenue: number;
    openTickets: number;
  }>;
}

// ─── Helper: fetch-after-write (MySQL has no RETURNING) ──────────────────────
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

  // ── Orders ─────────────────────────────────────────────────────────────────
  async getAllOrders(limit = 50, offset = 0) {
    return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit).offset(offset);
  }
  async getOrdersByUser(userId: string) {
    return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
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
}

export const storage = new DatabaseStorage();
