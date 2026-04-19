# Nexcoin — cPanel Deployment Guide
Generated: 2026-04-19T05:01:57.772Z

## Requirements
- Node.js 18+ (managed via cPanel Node.js App)
- MySQL 5.7+  or  MariaDB 10.3+
- NO npm install needed — all dependencies are bundled into dist/index.cjs

## Folder Contents
  dist/index.cjs   ← startup file for cPanel (all server code bundled here)
  client/dist/     ← compiled frontend (HTML, JS, CSS, images)
  public/uploads/  ← user-uploaded images (must be writable, chmod 755)
  uploads/plugins/ ← plugin uploads (must be writable, chmod 755)
  setup.sql        ← MySQL schema (import ONCE in phpMyAdmin then delete)
  .env.example     ← template for environment variables
  README.txt       ← this file

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STEP-BY-STEP DEPLOYMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. CREATE DATABASE
   cPanel → MySQL Databases
   • Create database:  nexcoin_db
   • Create user:      nexcoin_user  (strong password)
   • Assign user to DB with ALL PRIVILEGES

2. IMPORT SQL SCHEMA
   cPanel → phpMyAdmin → select nexcoin_db → Import tab
   • Upload setup.sql and click Go
   • (You can delete setup.sql from the server afterwards)

3. UPLOAD FILES
   cPanel → File Manager → navigate to public_html (or a subdomain folder)
   • Upload everything inside nexcoin-deploy/ to that folder
   • Set public/uploads/ and uploads/plugins/ to chmod 755

4. CREATE NODE.JS APPLICATION
   cPanel → Setup Node.js App → Create Application
   • Node.js version : 18 (or 20)
   • Application mode: Production
   • Application root : /home/<cpanel_user>/public_html  (or your subfolder)
   • Application URL  : yourdomain.com  (or subdomain)
   • Startup file     : dist/index.cjs
   • Click CREATE

5. SET ENVIRONMENT VARIABLES
   In the Node.js App settings click + to add each variable:

   DATABASE_URL   → mysql://nexcoin_user:PASSWORD@localhost:3306/nexcoin_db
   NODE_ENV       → production
   SESSION_SECRET → (any 40+ character random string)

   TIP: If localhost fails try 127.0.0.1

6. START / RESTART
   Click Restart in the Node.js App panel.
   Visit your domain — you should see the storefront.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DEFAULT ADMIN LOGIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  URL      : https://yourdomain.com/admin
  Username : admin
  Password : admin123456

⚠  Change the password IMMEDIATELY after first login.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TROUBLESHOOTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Blank page / 500 error
  → Check error log in cPanel Node.js App panel
  → Verify DATABASE_URL is correct and DB exists

"Cannot connect to database"
  → Try 127.0.0.1 instead of localhost
  → Confirm user has ALL PRIVILEGES on the database

Images not uploading
  → chmod 755 on public/uploads/ and uploads/plugins/

PWA manifest / icons
  → /manifest.json is served dynamically by the app
  → Icons update when you change Site Logo or App Icon in Admin → Control Panel

Push notifications
  → VAPID keys are auto-generated on first boot and stored in DB
  → No manual configuration needed
