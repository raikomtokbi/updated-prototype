# Nexcoin — Game Top-Up Marketplace

A full-stack web CMS and e-commerce platform for selling digital products (game top-ups, gift cards, vouchers, subscriptions).

## Architecture

- **Frontend**: React 19, Tailwind CSS 4, TanStack Query, Wouter (routing), Zustand (state), Radix UI / shadcn
- **Backend**: Node.js + Express 5
- **Database**: MySQL / MariaDB via `mysql2` + Drizzle ORM (mysql-core) for production (cPanel). Dev environment auto-detects `postgres://` URL and falls back to `pg` driver so Replit's built-in PostgreSQL still works during development.
- **Build**: Vite (frontend), tsx (dev server), esbuild (production build via `npm run build`)

## Project Structure

```
client/         React frontend
  src/
    components/ Reusable UI components (shadcn + Tailwind)
    pages/      Views: Home, Products, Admin panel, Auth
    lib/        Utilities, API client, Zustand stores
server/         Express backend
  index.ts      Entry point, middleware setup
  routes.ts     All API endpoints
  storage.ts    Data access layer (DatabaseStorage)
  db.ts         PostgreSQL connection via pg pool
  lib/
    paymentGateways/   Multi-gateway payment system
      index.ts         Gateway factory + registry
      types.ts         Shared types (InitiateParams, GatewayInitiateResult, etc.)
      razorpay.ts      Razorpay (modal/SDK flow)
      payu.ts          PayU (form redirect, SHA512 hash)
      cashfree.ts      Cashfree (REST API → redirect URL)
      instamojo.ts     Instamojo (REST API → redirect URL)
      ccavenue.ts      CCAvenue (AES-128-CBC form redirect)
      phonepe.ts       PhonePe (SHA256 base64 API → redirect URL)
      paytm.ts         Paytm PG (form redirect, HMAC-SHA256 checksum)
      easybuzz.ts      EasyBuzz (SHA512 hash → API access key → redirect)
      bharatpe.ts      BharatPe (API → redirect URL)
shared/
  schema.ts     Drizzle ORM schema (PostgreSQL / pg-core)
migrations/
  mysql-schema.sql  Legacy DDL reference only
```

## Key Scripts

- `npm run dev` — Start development server (port 5000)
- `npm run build` — Production build
- `npm run db:push` — Sync schema to PostgreSQL (uses DATABASE_URL from Replit env)

## Database

Uses **PostgreSQL** via `pg` + Drizzle ORM (`drizzle-orm/node-postgres`).

The `DATABASE_URL` environment variable is automatically set by Replit's built-in PostgreSQL service.

## Authentication

- Session-based auth via Passport.js + express-session
- Routes protected via `requireAdmin` middleware (roles: `super_admin`, `admin`, `staff`)
- Default admin account: username `admin`, password `admin123` (change after first login)

## Multi-Gateway Payment System

All gateways are configured via **Admin → Payment Gateways** and stored in the `payment_methods` table.

### Supported Gateways

| Gateway | Type | Flow | Key Fields |
|---|---|---|---|
| Razorpay | `razorpay` | SDK Modal | publicKey (Key ID), secretKey (Key Secret) |
| PayU | `payu` | Form Redirect | publicKey (Merchant Key), secretKey (Salt) |
| Cashfree | `cashfree` | Redirect URL | publicKey (App ID), secretKey (Secret Key) |
| Instamojo | `instamojo` | Redirect URL | publicKey (API Key), secretKey (Auth Token) |
| CCAvenue | `ccavenue` | Form Redirect | publicKey (Access Code), secretKey (Working Key), config.merchantId |
| PhonePe | `phonepe` | Redirect URL | publicKey (Merchant ID), secretKey (Salt Key), config.saltIndex |
| Paytm | `paytm` | Form Redirect | publicKey (MID), secretKey (Merchant Key), config.website |
| EasyBuzz | `easybuzz` | Redirect URL | publicKey (Key), secretKey (Salt) |
| BharatPe | `bharatpe` | Redirect URL | publicKey (Merchant ID), secretKey (Token) |
| Stripe | `stripe` | (planned) | publicKey, secretKey, webhookSecret |
| PayPal | `paypal` | (planned) | publicKey (Client ID), secretKey |
| Manual | `manual` | - | config.instructions |

### Payment API Endpoints

- `POST /api/payment/initiate` — Initiates payment for any gateway; returns `{type: "modal"|"redirect"|"redirect_url", ...}`
- `POST /api/payment/verify` — Verifies payment (used by Razorpay modal + post-redirect verification)
- `POST /api/payment/callback/:gatewayType` — Gateway server-side callback (for all redirect gateways)
- `POST /api/payment/create-order` — Legacy Razorpay-only endpoint (backward compat)

### Return URL

All redirect gateways return to `/payment-return` with query params that indicate status. The `PaymentReturn` page handles verification and shows success/failure UI.

## Busan Game Top-up API Integration

Automatically fulfilment of game top-up orders after XYZPay (or other) payment confirmation.

### How It Works

1. **Admin Setup**: Configure API token + currency in **Admin → API Integration → Game Top-up Integration**
2. **Product Mapping**: Map each CMS product to a Busan product ID (with optional "Requires Zone ID" flag)
3. **Checkout**: Cart items (including `playerId`, `zoneId`, `userId`) are sent with payment initiation and persisted in `orders.notes` as JSON
4. **Webhook**: `POST /api/xyzpay/webhook` — after XYZPay confirms `COMPLETED`, the Busan API is called for each mapped product in the order

### Key Files

- `server/lib/busanApi.ts` — Busan API client (`getBusanBalance`, `getBusanProducts`, `createBusanOrder`)
- `shared/schema.ts` — `busanConfigs` + `busanMappings` tables
- `server/storage.ts` — `getBusanConfig`, `upsertBusanConfig`, `getAllBusanMappings`, `createBusanMapping`, etc.
- `client/src/pages/admin/ApiIntegration.tsx` — Admin UI with dual config cards + product mapping table

### Admin API Endpoints

- `GET/POST /api/admin/busan/config` — Busan API token + currency
- `GET /api/admin/busan/balance` — Live balance check
- `GET /api/admin/busan/products` — Product list from Busan API
- `GET/POST/DELETE /api/admin/busan/mappings` — CMS ↔ Busan product mappings

## Smile.one Integration

Player lookup + automatic purchase via Smile.one API. Configured in **Admin → Smile.one**.

## Features

- Role-based access control (super_admin, admin, staff, user)
- Digital product storefront with packages/pricing tiers
- Order and transaction management (orders persisted in DB with player/zone IDs in notes)
- Support ticket system
- Hero sliders, campaigns, coupons
- Email templates, plugins system
- Site settings / control panel (stored in `site_settings` table)
- Forgot password with OTP flow
- Multi-identifier login (username, email, or phone)
- Customisable themes (stored in settings)
- Admin notifications
- Multi-gateway payment support (9 Indian + global gateways)
- Busan API game top-up automatic fulfilment
- Smile.one game top-up integration
- UPI manual payment with IMAP email auto-verification + auto-topup

## UPI / Manual Payment System

Email-based UPI payment verification with automatic order completion and Busan top-up trigger.

### How It Works

1. **Admin Setup**: Configure UPI ID, QR code URL, and IMAP credentials in **Admin → UPI Settings** (`/admin/upi-settings`)
2. **Checkout**: Customer selects "UPI" payment type → click "Pay" → creates pending order → inline UPI modal opens (no page redirect)
3. **UPI Modal**: Shows QR code, UPI ID, exact amount, countdown timer (10 min); polls `/api/orders/:id/status` every 5s; shows success/expired inline
4. **IMAP Polling**: Server polls configured email inbox every 60s for payment notification emails; parses amount + UTR
5. **Auto-Match**: Matches payment to oldest pending UPI order with same amount (within 30-min window) → marks order completed
6. **Auto-Topup**: Triggers Busan API for game top-up automatically after successful match
7. **Unmatched**: Payments that can't be matched are stored in `unmatched_payments` table for manual admin assignment

### Admin Pages

- `/admin/upi-settings` — Configure UPI ID, QR code URL, IMAP host/port/credentials
- `/admin/payment-logs` — View unmatched payments, manually assign to orders

### Key Files

- `server/services/emailPaymentService.ts` — IMAP polling + email parsing + order matching + Busan trigger
- `shared/schema.ts` — `upiPaymentSettings` + `unmatchedPayments` tables; `orders` extended with `paymentMethod`, `utr`, `paymentVerifiedAt`
- `client/src/pages/UpiPayment.tsx` — Customer-facing payment page with timer + polling
- `client/src/pages/admin/UpiSettings.tsx` — Admin IMAP + UPI configuration
- `client/src/pages/admin/PaymentLogs.tsx` — Admin unmatched payment review + manual assignment

### API Endpoints

- `POST /api/upi/initiate` — Create UPI order, return UPI details (upiId, qrCodeUrl, amount)
- `GET /api/orders/:id/status` — Poll order payment status
- `GET/POST /api/admin/upi-settings` — Get/save IMAP + UPI configuration
- `GET /api/admin/unmatched-payments` — List unmatched payments
- `POST /api/admin/unmatched-payments/:id/assign` — Manually assign unmatched payment to order
