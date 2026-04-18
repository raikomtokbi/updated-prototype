/**
 * Nexcoin cPanel Deployment Bundle Builder
 * Run:    node scripts/build-deploy.mjs
 * Output: nexcoin-deploy/   (download this folder from the file tree)
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root      = path.resolve(__dirname, "..");
const deployDir = path.join(root, "nexcoin-deploy");

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function copyDir(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

// ── Step 1: Clean output folder ───────────────────────────────
console.log("\n=== Step 1: Cleaning previous build ===");
if (fs.existsSync(deployDir)) fs.rmSync(deployDir, { recursive: true });
ensureDir(deployDir);

// ── Step 2: Build Vite frontend ───────────────────────────────
console.log("\n=== Step 2: Building frontend ===");
run("npx vite build --config vite.config.deploy.ts");

// ── Step 3: Bundle server with esbuild ────────────────────────
console.log("\n=== Step 3: Bundling server ===");
ensureDir(path.join(deployDir, "dist"));
const result = await esbuild.build({
  entryPoints: [path.join(root, "server", "index.ts")],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "cjs",
  outfile: path.join(deployDir, "dist", "index.cjs"),
  define: { "process.env.NODE_ENV": '"production"' },
  external: [
    "fsevents",
    "vite",
    "lightningcss",
    "@tailwindcss/oxide",
    "@tailwindcss/vite",
    "@babel/core",
    "@babel/preset-typescript",
    "@replit/vite-plugin-runtime-error-modal",
    "@replit/vite-plugin-cartographer",
    "@replit/vite-plugin-dev-banner",
  ],
  alias: {
    "@shared":  path.join(root, "shared"),
    "@assets":  path.join(root, "attached_assets"),
  },
  tsconfig: path.join(root, "tsconfig.json"),
  logLevel: "warning",
});

if (result.errors?.length) {
  console.error("esbuild errors:", result.errors);
  process.exit(1);
}
console.log("Server bundle: nexcoin-deploy/dist/index.cjs");

// ── Step 4: Copy built frontend ───────────────────────────────
console.log("\n=== Step 4: Copying frontend assets ===");
const frontendSrc  = path.join(root, "client", "dist");
const frontendDest = path.join(deployDir, "client", "dist");
if (!fs.existsSync(frontendSrc)) {
  console.error("ERROR: client/dist not found — frontend build may have failed.");
  process.exit(1);
}
copyDir(frontendSrc, frontendDest);

// ── Step 5: Create upload directories ────────────────────────
console.log("\n=== Step 5: Creating required directories ===");
ensureDir(path.join(deployDir, "public", "uploads"));
ensureDir(path.join(deployDir, "uploads", "plugins"));
fs.writeFileSync(path.join(deployDir, "public", "uploads", ".gitkeep"), "");
fs.writeFileSync(path.join(deployDir, "uploads", "plugins", ".gitkeep"), "");

// ── Step 6: Copy MySQL setup SQL ─────────────────────────────
console.log("\n=== Step 6: Copying MySQL setup SQL ===");
const sqlSrc = path.join(root, "migrations", "setup.sql");
if (fs.existsSync(sqlSrc)) {
  fs.copyFileSync(sqlSrc, path.join(deployDir, "setup.sql"));
  console.log("Copied migrations/setup.sql → nexcoin-deploy/setup.sql");
} else {
  console.warn("WARNING: migrations/setup.sql not found — SQL not included.");
}

// ── Step 7: Write .env.example ────────────────────────────────
console.log("\n=== Step 7: Writing .env.example ===");
const envExample = `# Nexcoin — Environment Variables
# Copy this file to .env and fill in your values
# (Or set directly in cPanel Node.js App > Environment Variables)

# MySQL database connection string
DATABASE_URL=mysql://db_user:db_password@localhost:3306/db_name

# Runtime mode — keep as production
NODE_ENV=production

# Any 32+ character random string — used to sign session cookies
SESSION_SECRET=change-me-to-a-long-random-secret-string

# Optional: port override (cPanel manages this automatically — leave blank)
# PORT=3000
`;
fs.writeFileSync(path.join(deployDir, ".env.example"), envExample);

// ── Step 8: Write README ──────────────────────────────────────
console.log("\n=== Step 8: Writing README ===");
const readme = `# Nexcoin — cPanel Deployment Guide
Generated: ${new Date().toISOString()}

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
`;
fs.writeFileSync(path.join(deployDir, "README.txt"), readme);

// ── Done ──────────────────────────────────────────────────────
const countFiles = (dir) => {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    n += e.isDirectory() ? countFiles(path.join(dir, e.name)) : 1;
  }
  return n;
};

console.log(`
╔══════════════════════════════════════════════╗
║           BUILD COMPLETE                     ║
╠══════════════════════════════════════════════╣
║  Folder : nexcoin-deploy/                    ║
║  Files  : ${String(countFiles(deployDir)).padEnd(35)}║
╚══════════════════════════════════════════════╝

Next steps:
  1. Download the nexcoin-deploy/ folder from the file tree
  2. Import setup.sql into your MySQL database
  3. Upload all files to your cPanel hosting
  4. Set DATABASE_URL, NODE_ENV, SESSION_SECRET in cPanel
  5. Set startup file to dist/index.cjs and start the app
  6. See README.txt for full instructions
`);
