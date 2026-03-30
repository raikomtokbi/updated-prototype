# Digital Storefront CMS

A full-stack web CMS and e-commerce platform for selling digital products (game currency, gift cards, vouchers, subscriptions).

## Architecture

- **Frontend**: React 19, Tailwind CSS 4, TanStack Query, Wouter (routing), Zustand (state), Radix UI
- **Backend**: Node.js + Express 5, Passport.js (auth)
- **Database**: PostgreSQL (Replit built-in) via Drizzle ORM
- **Build**: Vite (frontend), tsx (dev server), esbuild (production build)

## Project Structure

```
client/         React frontend
  src/
    components/ Reusable UI components (Radix UI + Tailwind)
    pages/      Views: Home, Products, Cart, Login, Account
    lib/        Utilities, API client, Zustand stores
server/         Express backend
  index.ts      Entry point, middleware setup
  routes.ts     API endpoints
  storage.ts    Data access layer (DatabaseStorage)
  db.ts         PostgreSQL connection (node-postgres / pg)
shared/
  schema.ts     Drizzle ORM schema (PostgreSQL)
```

## Key Scripts

- `npm run dev` — Start development server (port 5000)
- `npm run build` — Production build
- `npm run db:push` — Push schema changes to PostgreSQL

## Database

Uses Replit's built-in PostgreSQL database. Connection via `DATABASE_URL` environment variable (set automatically by Replit).

Schema uses PostgreSQL enums for: user roles, product categories, order status, transaction status, ticket status/priority.

## Authentication

- Admin routes use `X-Admin-Role` header (demo mode)
- Routes are protected via `requireAdmin` middleware checking for `super_admin`, `admin`, or `staff` roles

## Features

- Role-based access control (super_admin, admin, staff, user)
- Digital product storefront with packages/pricing tiers
- Order and transaction management
- Support ticket system
- Coupon/discount management
- Campaign/banner management
- Customer reviews with approval workflow
- Payment method configuration
- Admin dashboard with stats
- Dynamic theme system (`client/src/lib/theme.ts`): preset + custom HSL color pickers, saved to site settings (`active_theme`, `theme_custom_primary`, `theme_custom_accent`), applied via CSS variable injection in App.tsx
- ImageUploadField always shows a preview area (placeholder when empty, image when set)
- Admin tables use `overflowX: "auto"` + `minWidth` for proper mobile scroll behavior
