import { relations, sql } from "drizzle-orm";
import {
  pgTable, text, varchar, boolean, integer, numeric,
  timestamp, pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────
export const userRoleEnum = pgEnum("user_role", ["super_admin", "admin", "staff", "user"]);
export const productCategoryEnum = pgEnum("product_category", ["game_currency", "gift_card", "voucher", "subscription"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "processing", "completed", "failed", "refunded"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "success", "failed", "refunded"]);
export const ticketStatusEnum = pgEnum("ticket_status", ["open", "in_progress", "resolved", "closed"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", ["low", "medium", "high", "urgent"]);

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  username: varchar("username", { length: 191 }).notNull().unique(),
  email: varchar("email", { length: 191 }).unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default("user"),
  fullName: varchar("full_name", { length: 191 }),
  phone: varchar("phone", { length: 50 }),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  isSubscribed: boolean("is_subscribed").notNull().default(false),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ─── Games ────────────────────────────────────────────────────────────────────
export const games = pgTable("games", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 191 }).notNull(),
  slug: varchar("slug", { length: 191 }).notNull().unique(),
  description: text("description"),
  logoUrl: text("logo_url"),
  bannerUrl: text("banner_url"),
  category: varchar("category", { length: 100 }).notNull().default("game_currency"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  isTrending: boolean("is_trending").notNull().default(false),
  instantDelivery: boolean("instant_delivery").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  pluginSlug: varchar("plugin_slug", { length: 100 }),
  requiredFields: varchar("required_fields", { length: 100 }).default("userId"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ─── Services (top-up options per game) ───────────────────────────────────────
export const services = pgTable("services", {
  id: varchar("id", { length: 36 }).primaryKey(),
  gameId: varchar("game_id", { length: 36 }).notNull().references(() => games.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 191 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  finalPrice: numeric("final_price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  sortOrder: integer("sort_order").notNull().default(0),
  pluginSlug: varchar("plugin_slug", { length: 100 }),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ─── Products ─────────────────────────────────────────────────────────────────
export const products = pgTable("products", {
  id: varchar("id", { length: 36 }).primaryKey(),
  title: varchar("title", { length: 191 }).notNull(),
  description: text("description"),
  category: productCategoryEnum("category").notNull().default("game_currency"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  instantDelivery: boolean("instant_delivery").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const productPackages = pgTable("product_packages", {
  id: varchar("id", { length: 36 }).primaryKey(),
  productId: varchar("product_id", { length: 36 }).notNull().references(() => products.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 191 }).notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  originalPrice: numeric("original_price", { precision: 10, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ─── Orders ───────────────────────────────────────────────────────────────────
export const orders = pgTable("orders", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  orderNumber: varchar("order_number", { length: 191 }).notNull().unique(),
  status: orderStatusEnum("status").notNull().default("pending"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const orderItems = pgTable("order_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  orderId: varchar("order_id", { length: 36 }).notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: varchar("product_id", { length: 36 }).references(() => products.id),
  packageId: varchar("package_id", { length: 36 }).references(() => productPackages.id),
  productTitle: varchar("product_title", { length: 191 }).notNull(),
  packageLabel: varchar("package_label", { length: 191 }),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
});

// ─── Transactions ─────────────────────────────────────────────────────────────
export const transactions = pgTable("transactions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  transactionNumber: varchar("transaction_number", { length: 50 }).notNull().unique(),
  orderId: varchar("order_id", { length: 36 }).references(() => orders.id),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  paymentMethod: varchar("payment_method", { length: 100 }).notNull(),
  gateway: varchar("gateway", { length: 100 }),
  gatewayRef: varchar("gateway_ref", { length: 191 }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).notNull().default("USD"),
  status: transactionStatusEnum("status").notNull().default("pending"),
  failureReason: text("failure_reason"),
  isRefund: boolean("is_refund").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ─── Coupons ──────────────────────────────────────────────────────────────────
export const coupons = pgTable("coupons", {
  id: varchar("id", { length: 36 }).primaryKey(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  description: text("description"),
  discountType: varchar("discount_type", { length: 50 }).notNull().default("percentage"),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }).notNull(),
  minOrderAmount: numeric("min_order_amount", { precision: 10, scale: 2 }),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ─── Support Tickets ──────────────────────────────────────────────────────────
export const tickets = pgTable("tickets", {
  id: varchar("id", { length: 36 }).primaryKey(),
  ticketNumber: varchar("ticket_number", { length: 50 }).notNull().unique(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  status: ticketStatusEnum("status").notNull().default("open"),
  priority: ticketPriorityEnum("priority").notNull().default("medium"),
  assignedTo: varchar("assigned_to", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const ticketReplies = pgTable("ticket_replies", {
  id: varchar("id", { length: 36 }).primaryKey(),
  ticketId: varchar("ticket_id", { length: 36 }).notNull().references(() => tickets.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  message: text("message").notNull(),
  isStaff: boolean("is_staff").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ─── Campaigns ────────────────────────────────────────────────────────────────
export const campaigns = pgTable("campaigns", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 191 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull().default("banner"),
  bannerUrl: text("banner_url"),
  isActive: boolean("is_active").notNull().default(true),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ─── Hero Sliders ─────────────────────────────────────────────────────────────
export const heroSliders = pgTable("hero_sliders", {
  id: varchar("id", { length: 36 }).primaryKey(),
  title: varchar("title", { length: 191 }).notNull(),
  subtitle: text("subtitle"),
  bannerUrl: text("banner_url"),
  buttonText: varchar("button_text", { length: 100 }),
  buttonLink: varchar("button_link", { length: 500 }),
  linkedGameId: varchar("linked_game_id", { length: 36 }).references(() => games.id, { onDelete: "set null" }),
  linkedProductId: varchar("linked_product_id", { length: 36 }).references(() => products.id, { onDelete: "set null" }),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ─── Reviews ──────────────────────────────────────────────────────────────────
export const reviews = pgTable("reviews", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  productId: varchar("product_id", { length: 36 }).references(() => products.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  isApproved: boolean("is_approved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ─── Payment Methods ──────────────────────────────────────────────────────────
export const paymentMethods = pgTable("payment_methods", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 191 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  provider: varchar("provider", { length: 100 }),
  publicKey: text("public_key"),
  secretKey: text("secret_key"),
  webhookSecret: text("webhook_secret"),
  mode: varchar("mode", { length: 20 }).notNull().default("test"),
  supportedCurrencies: text("supported_currencies"),
  isActive: boolean("is_active").notNull().default(true),
  config: text("config"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ─── Relations ────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  transactions: many(transactions),
  tickets: many(tickets),
  reviews: many(reviews),
}));

export const gamesRelations = relations(games, ({ many }) => ({
  services: many(services),
}));

export const servicesRelations = relations(services, ({ one }) => ({
  game: one(games, { fields: [services.gameId], references: [games.id] }),
}));

export const productsRelations = relations(products, ({ many }) => ({
  packages: many(productPackages),
  reviews: many(reviews),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
  transactions: many(transactions),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  user: one(users, { fields: [tickets.userId], references: [users.id] }),
  replies: many(ticketReplies),
}));

// ─── Insert schemas & Types ───────────────────────────────────────────────────
export const insertUserSchema = createInsertSchema(users).pick({
  username: true, email: true, password: true, role: true, fullName: true, isActive: true,
}).partial({ isActive: true });
export const insertGameSchema = createInsertSchema(games).omit({ id: true, createdAt: true, updatedAt: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCouponSchema = createInsertSchema(coupons).omit({ id: true, createdAt: true });
export const insertTicketSchema = createInsertSchema(tickets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCampaignSchema = createInsertSchema(campaigns).omit({ id: true, createdAt: true });
export const insertHeroSliderSchema = createInsertSchema(heroSliders).omit({ id: true, createdAt: true });
export const insertPaymentMethodSchema = createInsertSchema(paymentMethods).omit({ id: true, createdAt: true });

// ─── Plugins ──────────────────────────────────────────────────────────────────
export const plugins = pgTable("plugins", {
  id: varchar("id", { length: 36 }).primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 191 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).notNull().default("integration"),
  pluginType: varchar("plugin_type", { length: 50 }).default("integration"),
  version: varchar("version", { length: 20 }).default("1.0.0"),
  author: varchar("author", { length: 191 }),
  isEnabled: boolean("is_enabled").notNull().default(false),
  config: text("config"),
  settingsSchema: text("settings_schema"),
  installedAt: timestamp("installed_at"),
  fileSize: integer("file_size"),
  installPath: varchar("install_path", { length: 500 }),
  status: varchar("status", { length: 20 }).notNull().default("inactive"),
  hooks: text("hooks"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertPluginSchema = createInsertSchema(plugins).omit({ id: true, createdAt: true, updatedAt: true });

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: varchar("id", { length: 36 }).primaryKey(),
  type: varchar("type", { length: 50 }).notNull().default("info"),
  title: varchar("title", { length: 191 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  metadata: text("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });

// ─── Email Templates ──────────────────────────────────────────────────────────
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  type: varchar("type", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 191 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  body: text("body").notNull(),
  footerText: varchar("footer_text", { length: 500 }),
  buttonText: varchar("button_text", { length: 191 }),
  buttonLink: varchar("button_link", { length: 500 }),
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({ id: true, createdAt: true, updatedAt: true });

// ─── Site Settings ────────────────────────────────────────────────────────────
export const siteSettings = pgTable("site_settings", {
  id: varchar("id", { length: 36 }).primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Game = typeof games.$inferSelect;
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type ProductPackage = typeof productPackages.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type TicketReply = typeof ticketReplies.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type HeroSlider = typeof heroSliders.$inferSelect;
export type InsertHeroSlider = z.infer<typeof insertHeroSliderSchema>;
export type Review = typeof reviews.$inferSelect;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type Plugin = typeof plugins.$inferSelect;
export type InsertPlugin = z.infer<typeof insertPluginSchema>;
export type Notification = typeof notifications.$inferSelect;
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type SiteSetting = typeof siteSettings.$inferSelect;
