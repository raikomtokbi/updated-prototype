# Nexcoin — Game Top-Up Marketplace

A full-stack web CMS and e-commerce platform for selling digital products (game top-ups, gift cards, vouchers, subscriptions).

## Architecture

- **Frontend**: React 19, Tailwind CSS 4, TanStack Query, Wouter (routing), Zustand (state), Radix UI / shadcn
- **Backend**: Node.js + Express 5
- **Database**: MySQL via mysql2 + Drizzle ORM (mysql-core)
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
  db.ts         MySQL connection (mysql2 pool, lazy — no crash without credentials)
shared/
  schema.ts     Drizzle ORM schema (MySQL / mysql-core)
migrations/
  mysql-schema.sql  Full DDL for cPanel phpMyAdmin import
```

## Key Scripts

- `npm run dev` — Start development server (port 5000)
- `npm run build` — Production build
- `npm run db:push` — Push schema to MySQL (requires DB credentials)

## Database

Uses **MySQL** via `mysql2` + Drizzle ORM (`drizzle-orm/mysql2`).

**The server starts without credentials.** API calls return 500 until credentials are set.

### Configuration with DATABASE_URL

Set a single secret in Replit:

| Secret | Format |
|---|---|
| `DATABASE_URL` | `mysql://USER:PASSWORD@HOST:3306/DATABASE` |

**Example:**
```
DATABASE_URL=mysql://root:mypassword@localhost:3306/nexcoin
```

For cPanel Node.js hosting:
```
DATABASE_URL=mysql://cpaneluser:cpanelpass@cpanelhost.com:3306/cpaneldb
```

The `DATABASE_URL` variable is parsed in:
- `server/db.ts` — MySQL pool connection
- `drizzle.config.ts` — Schema migration tool

If `DATABASE_URL` is not set or invalid, defaults to `localhost` with empty credentials (useful for build/dev without DB connection).

### Deploying to cPanel

1. Import `migrations/mysql-schema.sql` via phpMyAdmin
2. Add `DATABASE_URL` secret in Replit with cPanel credentials
3. Restart the app

## Authentication

- Admin routes use `X-Admin-Role` header (demo mode — not JWT/session)
- Routes protected via `requireAdmin` middleware (roles: `super_admin`, `admin`, `staff`)
- Super admin: user `raikom` (ID `#000001`)

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
- About page stats override
- Admin notifications
