# Nexcoin — Game Top-Up Marketplace

A full-stack web CMS and e-commerce platform for selling digital products (game top-ups, gift cards, vouchers, subscriptions).

## Architecture

- **Frontend**: React 19, Tailwind CSS 4, TanStack Query, Wouter (routing), Zustand (state), Radix UI / shadcn
- **Backend**: Node.js + Express 5
- **Database**: PostgreSQL via `pg` + Drizzle ORM (pg-core) — provisioned by Replit
- **Build**: Vite (frontend), tsx (dev server), esbuild (production build)

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
  db.ts         PostgreSQL connection via pg Pool
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

## Features

- Role-based access control (super_admin, admin, staff, user)
- Digital product storefront with packages/pricing tiers
- Order and transaction management
- Support ticket system
- Hero sliders, campaigns, coupons
- Email templates, plugins system
- Site settings / control panel (stored in `site_settings` table)
- Forgot password with OTP flow
- Multi-identifier login (username, email, or phone)
- Customisable themes (stored in settings)
- Admin notifications
