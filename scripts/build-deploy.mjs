/**
 * Nexcoin cPanel Deployment Bundle Builder
 * Run: node scripts/build-deploy.mjs
 * Output: nexcoin-cpanel.zip
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import AdmZip from "adm-zip";
import * as esbuild from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const deployDir = path.join(root, "deploy_tmp");

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyDir(src, dest) {
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ── Step 1: Clean deploy_tmp ─────────────────────────────────
console.log("\n=== Step 1: Cleaning previous build ===");
if (fs.existsSync(deployDir)) fs.rmSync(deployDir, { recursive: true });
ensureDir(deployDir);

// ── Step 2: Build Vite frontend ──────────────────────────────
console.log("\n=== Step 2: Building frontend ===");
run("npx vite build --config vite.config.deploy.ts");

// ── Step 3: Bundle server with esbuild (JS API) ──────────────
console.log("\n=== Step 3: Bundling server ===");
const result = await esbuild.build({
  entryPoints: [path.join(root, "server", "index.ts")],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "cjs",
  outfile: path.join(deployDir, "app.js"),
  define: {
    "process.env.NODE_ENV": '"production"',
  },
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
    "@shared": path.join(root, "shared"),
    "@assets": path.join(root, "attached_assets"),
  },
  tsconfig: path.join(root, "tsconfig.json"),
  logLevel: "warning",
});

if (result.errors && result.errors.length > 0) {
  console.error("esbuild errors:", result.errors);
  process.exit(1);
}
console.log("Server bundle created: deploy_tmp/app.js");

// ── Step 4: Copy frontend build ──────────────────────────────
console.log("\n=== Step 4: Copying frontend assets ===");
const frontendSrc = path.join(root, "client", "dist");
const frontendDest = path.join(deployDir, "client", "dist");
if (!fs.existsSync(frontendSrc)) {
  console.error("ERROR: client/dist not found. Frontend build may have failed.");
  process.exit(1);
}
copyDir(frontendSrc, frontendDest);

// ── Step 5: Create required empty directories ─────────────────
console.log("\n=== Step 5: Creating required directories ===");
ensureDir(path.join(deployDir, "public", "uploads"));
ensureDir(path.join(deployDir, "uploads", "plugins"));
fs.writeFileSync(path.join(deployDir, "public", "uploads", ".gitkeep"), "");
fs.writeFileSync(path.join(deployDir, "uploads", "plugins", ".gitkeep"), "");

// ── Step 6: Copy setup SQL ────────────────────────────────────
console.log("\n=== Step 6: Copying setup SQL ===");
const sqlSrc = path.join(root, "nexcoin-setup.sql");
if (fs.existsSync(sqlSrc)) {
  fs.copyFileSync(sqlSrc, path.join(deployDir, "nexcoin-setup.sql"));
}

// ── Step 7: Write deployment readme ──────────────────────────
console.log("\n=== Step 7: Writing deployment guide ===");
const readme = `# Nexcoin — cPanel Deployment Guide

## Requirements
- Node.js 18+ (set in cPanel Node.js App)
- MySQL 5.7+ or MariaDB 10.3+

## Steps

### 1. Create MySQL Database
In cPanel > MySQL Databases, create a database and user with all privileges.

### 2. Import SQL Schema
In phpMyAdmin, select your database and run (import): nexcoin-setup.sql

### 3. Upload Files
Extract this zip and upload all contents to your application directory
(e.g. /home/youraccount/nexcoin/).

Directory structure after upload:
  nexcoin/
    app.js            <- startup file
    client/dist/      <- frontend assets
    public/uploads/   <- uploaded images (auto-created)
    uploads/plugins/  <- plugins (auto-created)
    nexcoin-setup.sql <- SQL (you can delete after import)
    README.txt        <- this file

### 4. Create Node.js Application in cPanel
- cPanel > Setup Node.js App > Create Application
- Node.js version: 18 (or 20)
- Application mode: Production
- Application root: /home/youraccount/nexcoin
- Application URL: your domain or subdomain
- Application startup file: app.js
- Click Create

### 5. Set Environment Variables (in the Node.js App settings)
Click "+" to add each variable:

  Variable Name    | Value
  -----------------|-----------------------------------------
  DATABASE_URL     | mysql://dbuser:dbpass@localhost:3306/dbname
  NODE_ENV         | production
  SESSION_SECRET   | (any 32+ character random string)

Example DATABASE_URL:
  mysql://nexcoin_user:MyPass123@localhost:3306/nexcoin_db

### 6. Start / Restart the Application
Click the Restart button in the Node.js App panel.

## Default Admin Credentials
  URL:      https://yourdomain.com/admin
  Username: admin
  Password: admin123456

IMPORTANT: Change the admin password immediately after first login!

## Troubleshooting

Problem: App shows "Internal Server Error"
Solution: Check the app log in cPanel Node.js App panel. Usually means
          DATABASE_URL is wrong or the SQL hasn't been imported.

Problem: Images not loading
Solution: Make sure public/uploads/ directory exists and is writable (chmod 755).

Problem: "Cannot connect to database"
Solution: Verify DATABASE_URL format. Use 127.0.0.1 instead of localhost if needed.
          Format: mysql://user:password@127.0.0.1:3306/database

Problem: Port error
Solution: Do NOT set the PORT variable — cPanel sets this automatically.
`;

fs.writeFileSync(path.join(deployDir, "README.txt"), readme);

// ── Step 8: Create the zip ────────────────────────────────────
console.log("\n=== Step 8: Creating deployment zip ===");
const zipPath = path.join(root, "nexcoin-cpanel.zip");
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);

const zip = new AdmZip();
zip.addLocalFolder(deployDir, "nexcoin");
zip.writeZip(zipPath);

// ── Done ──────────────────────────────────────────────────────
const stats = fs.statSync(zipPath);
const sizeMb = (stats.size / 1024 / 1024).toFixed(1);

console.log(`
=== BUILD COMPLETE ===
Output: nexcoin-cpanel.zip (${sizeMb} MB)

Contents:
  nexcoin/app.js             - bundled Node.js server (startup file for cPanel)
  nexcoin/client/dist/       - built frontend
  nexcoin/public/uploads/    - file upload directory
  nexcoin/nexcoin-setup.sql  - MySQL schema (import this first)
  nexcoin/README.txt         - deployment guide

Upload nexcoin-cpanel.zip to your server and follow README.txt.
`);

// Cleanup temp dir
fs.rmSync(deployDir, { recursive: true });
