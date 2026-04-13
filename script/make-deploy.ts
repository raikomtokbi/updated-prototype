/**
 * Nexcoin — cPanel Deployment Packager
 * Creates nexcoin-cpanel.zip ready to upload and extract in cPanel File Manager.
 *
 * Run:  npx tsx script/make-deploy.ts
 */

import { build } from "esbuild";
import { execSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import AdmZip from "adm-zip";

const ROOT = process.cwd();
const STAGING = path.join(ROOT, ".deploy-staging");
const ZIP_OUT = path.join(ROOT, "nexcoin-cpanel.zip");

function copyDirSync(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

function step(msg: string) {
  console.log(`\n\x1b[36m▶ ${msg}\x1b[0m`);
}

function addDirToZip(zip: AdmZip, dirPath: string, zipBase: string) {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    const zipPath = path.join(zipBase, entry.name);
    if (entry.isDirectory()) {
      addDirToZip(zip, fullPath, zipPath);
    } else {
      zip.addLocalFile(fullPath, zipBase === "" ? "" : zipBase + path.sep);
    }
  }
}

async function main() {
  console.log("\n\x1b[1m=== Nexcoin — cPanel Deploy Builder ===\x1b[0m");

  // ── 1. Build frontend ────────────────────────────────────────────────────
  step("Building frontend (Vite)…");
  execSync("npx vite build --config vite.config.prod.ts", {
    stdio: "inherit",
    cwd: ROOT,
  });

  // ── 2. Build backend ─────────────────────────────────────────────────────
  step("Building backend (esbuild)…");
  await build({
    entryPoints: ["server/index.ts"],
    bundle: true,
    platform: "node",
    target: "node18",
    outfile: "dist/index.cjs",
    format: "cjs",
    packages: "external",
    alias: {
      "@shared": path.resolve(ROOT, "shared"),
      "@": path.resolve(ROOT, "client/src"),
      "@assets": path.resolve(ROOT, "attached_assets"),
    },
    define: {
      "process.env.NODE_ENV": '"production"',
    },
  });

  // ── 3. Prepare staging dir ───────────────────────────────────────────────
  step("Preparing staging directory…");
  if (fs.existsSync(STAGING)) fs.rmSync(STAGING, { recursive: true, force: true });
  fs.mkdirSync(STAGING, { recursive: true });

  // dist/index.cjs
  fs.mkdirSync(path.join(STAGING, "dist"), { recursive: true });
  fs.copyFileSync(
    path.join(ROOT, "dist/index.cjs"),
    path.join(STAGING, "dist/index.cjs")
  );

  // client/dist/
  step("Copying frontend build…");
  copyDirSync(path.join(ROOT, "client/dist"), path.join(STAGING, "client/dist"));

  // uploads/ (empty placeholder for user-uploaded files)
  fs.mkdirSync(path.join(STAGING, "uploads"), { recursive: true });
  fs.writeFileSync(path.join(STAGING, "uploads", ".gitkeep"), "");

  // package.json — production only (no devDependencies)
  step("Writing package.json…");
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf-8"));
  const prodPkg = {
    name: pkg.name,
    version: pkg.version,
    type: pkg.type,
    scripts: { start: "NODE_ENV=production node dist/index.cjs" },
    dependencies: pkg.dependencies,
  };
  fs.writeFileSync(
    path.join(STAGING, "package.json"),
    JSON.stringify(prodPkg, null, 2)
  );

  // migrations/setup.sql
  fs.mkdirSync(path.join(STAGING, "migrations"), { recursive: true });
  fs.copyFileSync(
    path.join(ROOT, "migrations/setup.sql"),
    path.join(STAGING, "migrations/setup.sql")
  );

  // .env.example
  fs.writeFileSync(
    path.join(STAGING, ".env.example"),
    `# ─── Nexcoin Environment Variables ───────────────────────────────────────────
# Enter these in cPanel > Node.js App > Environment Variables section.

# MySQL connection — replace with your actual cPanel DB credentials
DATABASE_URL=mysql://cpanel_dbuser:YourPasswordHere@localhost:3306/cpanel_dbname

# Session secret — any long random string (keep it secret)
SESSION_SECRET=change-me-to-a-long-random-string-abc123

# Always production on cPanel
NODE_ENV=production

# PORT is set automatically by cPanel — do NOT add it manually
`
  );

  // README
  fs.writeFileSync(
    path.join(STAGING, "README.txt"),
    `============================
 Nexcoin — cPanel Deployment
============================

STEP 1 — Database (phpMyAdmin)
  Open phpMyAdmin > select your database > Import tab
  Import the file:  migrations/setup.sql

STEP 2 — Upload files (File Manager)
  Upload nexcoin-cpanel.zip to your app root
  Extract it there (all files should be at root level)

STEP 3 — Node.js App setup (cPanel)
  a. Create / open your Node.js App
  b. Set "Application startup file" to:  dist/index.cjs
  c. Add these Environment Variables:
       DATABASE_URL   = mysql://cpanel_dbuser:password@localhost:3306/cpanel_dbname
       SESSION_SECRET = some-long-random-secret-string
       NODE_ENV       = production
  d. Click Save  →  then Restart

STEP 4 — First login
  URL:   https://yourdomain.com/admin
  User:  admin
  Pass:  admin123456
  *** CHANGE YOUR PASSWORD IMMEDIATELY ***

SUPPORT
  Upload directory: /uploads  (writable by Node.js, used for images/files)
`
  );

  // ── 4. Install production node_modules ──────────────────────────────────
  step("Installing production node_modules (this may take a few minutes)…");
  const npmResult = spawnSync(
    "npm",
    ["install", "--omit=dev", "--no-audit", "--no-fund"],
    {
      cwd: STAGING,
      stdio: "inherit",
      shell: true,
    }
  );
  if (npmResult.status !== 0) {
    console.error("\x1b[31mError: npm install failed.\x1b[0m");
    process.exit(1);
  }

  // ── 5. Create zip via adm-zip ────────────────────────────────────────────
  step("Creating zip archive (adm-zip)…");
  if (fs.existsSync(ZIP_OUT)) fs.unlinkSync(ZIP_OUT);

  const zip = new AdmZip();
  zip.addLocalFolder(STAGING, "");
  zip.writeZip(ZIP_OUT);

  // ── 6. Cleanup staging ───────────────────────────────────────────────────
  step("Cleaning up staging directory…");
  fs.rmSync(STAGING, { recursive: true, force: true });

  const zipMB = (fs.statSync(ZIP_OUT).size / 1024 / 1024).toFixed(1);

  console.log(`
\x1b[32m✓ Done!\x1b[0m

  nexcoin-cpanel.zip  (${zipMB} MB)  ← download this from Replit Files panel

\x1b[1mcPanel deployment steps:\x1b[0m
  1. phpMyAdmin  →  import  migrations/setup.sql
  2. File Manager →  upload & extract  nexcoin-cpanel.zip  at app root
  3. Node.js App  →  startup file: dist/index.cjs
  4. Node.js App  →  add env vars:
       DATABASE_URL   = mysql://user:pass@localhost:3306/dbname
       SESSION_SECRET = any-long-random-string
       NODE_ENV       = production
  5. Save & Restart

  Admin login: admin / admin123456  (change immediately!)
`);
}

main().catch((err) => {
  console.error("\x1b[31m" + err.message + "\x1b[0m");
  process.exit(1);
});
