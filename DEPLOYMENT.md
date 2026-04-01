# cPanel Deployment Guide

This project is ready for direct cPanel Node.js deployment. No code edits needed after download.

## Prerequisites

- cPanel hosting with Node.js support (v20+)
- MySQL database
- SSH/SFTP access

## Deployment Steps

### Step 1: Build the Project
```bash
npm run build
```

This creates:
- `client/dist/` — compiled React frontend
- `dist/server/index.js` — compiled Express server
- `dist/index.cjs` — wrapper for legacy startup

### Step 2: Download & Upload
1. Download the project as a ZIP file from Replit
2. Extract it
3. Upload to cPanel:
   - Create folder: `public_html/nexcoin` (or your project name)
   - Upload all files **except** `node_modules`

### Step 3: Setup Database
1. Create MySQL database in cPanel (e.g., `username_nexcoin`)
2. Open **phpMyAdmin** in cPanel
3. Select your database
4. Click **Import** tab
5. Upload `setup.sql` file
6. Click **Go** to import all tables

### Step 4: Create Node.js App
1. In cPanel, go to **Node.js Selector**
2. Click **Create Application**
3. Configure:
   - **Node.js Version:** 20+ (auto or highest available)
   - **App Name:** `nexcoin` (or your choice)
   - **App Domain:** Select your domain/subdomain
   - **Application Root:** `public_html/nexcoin`
   - **Application Startup File:** `dist/server/index.js`
   - **Application URL:** auto-detected

### Step 5: Set Environment Variable
1. In Node.js app details, click **Edit Environment Variables**
2. Add:
   ```
   DATABASE_URL=mysql://DB_USER:DB_PASSWORD@localhost:3306/DB_NAME
   ```
   
   **Example:**
   ```
   DATABASE_URL=mysql://user_admin:mypassword123@localhost:3306/user_nexcoin
   ```

3. Click **Save**

### Step 6: Install Dependencies
```bash
npm install
```

cPanel will run this automatically when you create the app.

### Step 7: Start the Application
1. In Node.js Selector, find your app
2. Click **Run** button (or it auto-starts)
3. Check logs for: `serving on port XXXX`

## Verification

Visit your app URL. You should see:
- ✅ Frontend loads (Nexcoin storefront)
- ✅ Admin panel accessible at `/admin`
- ✅ API endpoints responding (no 503 or blank page)

## Troubleshooting

### Blank Page / 503 Error
- Check cPanel logs: **Node.js Selector → Logs**
- Verify `DATABASE_URL` is set correctly
- Ensure database was imported (check phpMyAdmin)
- MySQL credentials must match exactly

### Cannot Find client/dist
- Confirm `npm run build` was run in Replit **before** downloading
- `client/dist/` folder must exist in uploaded files
- If missing, re-download after running build

### Database Connection Error
- Check DATABASE_URL syntax: `mysql://USER:PASS@HOST:3306/DB`
- Verify MySQL database was created
- Verify `setup.sql` was imported successfully
- Test MySQL credentials in phpMyAdmin

### Node.js App Won't Start
- Check **Application Startup File** = `dist/server/index.js`
- Verify **Application Root** points to correct folder
- Check cPanel logs for error messages

## Port Information

cPanel assigns a random port (typically 3000-9999). The app automatically serves:
- **Frontend:** React SPA via your domain
- **Backend:** Express API via `/api/*` routes
- All on the **same port** (cPanel proxy handles routing)

## File Structure

```
public_html/nexcoin/
  ├── dist/
  │   ├── server/
  │   │   └── index.js           (compiled backend)
  │   └── index.cjs               (legacy wrapper)
  ├── client/
  │   └── dist/                   (compiled frontend)
  ├── package.json
  ├── setup.sql                   (database schema)
  ├── migrations/
  ├── shared/
  └── ...
```

## Environment Variables

**Required:**
- `DATABASE_URL` — MySQL connection string (format: `mysql://USER:PASS@HOST:PORT/DB`)

**Optional:**
- `NODE_ENV` — Set to `production` by cPanel automatically
- `PORT` — cPanel assigns automatically, app listens on all interfaces

## Database

All 23 tables are created by `setup.sql`:
- `users` — User accounts & authentication
- `sessions` — Server-side sessions
- `audit_logs` — Admin action logs
- `games` — Game catalogue
- `services` — Top-up denominations
- `products` — Vouchers & gift cards
- `orders` — Customer orders
- `transactions` — Payment records
- `coupons` — Discount codes
- `tickets` — Support tickets
- `campaigns` — Promotions
- `hero_sliders` — Homepage banners
- And 11 more...

## First Admin User

Run in cPanel Terminal or via API:
```javascript
// Via /api/auth/register
POST /api/auth/register
{
  "username": "admin",
  "email": "admin@example.com",
  "password": "strongpassword"
}
```

Then manually update in phpMyAdmin:
```sql
UPDATE users SET role = 'super_admin' WHERE username = 'admin';
```

## Rollback

If something breaks:
1. Keep a backup of `setup.sql` before any changes
2. In phpMyAdmin, delete all tables
3. Re-import `setup.sql`
4. Restart the Node.js app

## Support

- Check `DEPLOYMENT.md` in project root
- Logs available in cPanel → Node.js Selector
- Database logs in phpMyAdmin

---

**Your Nexcoin marketplace is ready for production!**
