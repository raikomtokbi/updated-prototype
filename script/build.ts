import { build, type Plugin } from "esbuild";
import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

// ─── esbuild plugin: redirect server/db.ts → server/db.mysql.ts ──────────────
// and @shared/schema → shared/schema.mysql.ts during the MySQL production build.
function mysqlSwapPlugin(): Plugin {
  const dbPath = path.resolve("server/db.ts");
  const dbMysqlPath = path.resolve("server/db.mysql.ts");
  const schemaMysqlPath = path.resolve("shared/schema.mysql.ts");

  return {
    name: "mysql-swap",
    setup(build) {
      // Redirect any resolved import that points to server/db.ts → server/db.mysql.ts
      build.onResolve({ filter: /.*/ }, (args) => {
        const resolved = path.resolve(args.resolveDir, args.path);
        // Match server/db (with or without .ts extension)
        if (resolved === dbPath || resolved === dbPath.replace(/\.ts$/, "")) {
          return { path: dbMysqlPath };
        }
        return null;
      });

      // Override @shared/schema → shared/schema.mysql.ts
      build.onResolve({ filter: /^@shared\/schema$/ }, () => {
        return { path: schemaMysqlPath };
      });
    },
  };
}

async function main() {
  console.log("Building frontend...");
  execSync("npx vite build --config vite.config.prod.ts", { stdio: "inherit" });

  console.log("Building backend (MySQL, all dependencies bundled)...");
  await build({
    entryPoints: ["server/index.ts"],
    bundle: true,
    platform: "node",
    target: "node18",
    outfile: "dist/index.cjs",
    format: "cjs",
    // Bundle ALL dependencies inline — no npm install needed on the cPanel server.
    // Only truly optional native bindings are marked external (they degrade gracefully).
    external: ["bufferutil", "utf-8-validate", "fsevents"],
    plugins: [mysqlSwapPlugin()],
    alias: {
      "@shared": path.resolve("shared"),
      "@": path.resolve("client/src"),
      "@assets": path.resolve("attached_assets"),
    },
    define: {
      "process.env.NODE_ENV": '"production"',
      // Tells storage.ts to use MySQL date functions instead of PostgreSQL ones.
      "process.env.DB_DIALECT": '"mysql"',
    },
  });

  console.log("Assembling production build under  build/ ...");

  // Fresh build folder — wipe any previous output
  if (fs.existsSync("build")) fs.rmSync("build", { recursive: true, force: true });
  fs.mkdirSync("build", { recursive: true });
  fs.mkdirSync("build/dist", { recursive: true });
  fs.mkdirSync("build/migrations", { recursive: true });

  // Server bundle
  fs.copyFileSync("dist/index.cjs", "build/dist/index.cjs");

  // Built frontend (client/dist/ → build/public/ on server)
  copyDir("client/dist", "build/public");

  // MySQL setup SQL — run once in cPanel phpMyAdmin
  if (fs.existsSync("migrations/setup.sql")) {
    fs.copyFileSync("migrations/setup.sql", "build/migrations/setup.sql");
  }

  // Minimal package.json for cPanel Node.js Selector startup
  const minPkg = {
    name: "nexcoin",
    version: "1.0.0",
    type: "commonjs",
    scripts: { start: "node dist/index.cjs" },
  };
  fs.writeFileSync("build/package.json", JSON.stringify(minPkg, null, 2));

  // .env.example to guide the server setup
  const envExample = [
    "# ── Required ────────────────────────────────────────────────────",
    "# MySQL connection string (cPanel database → Connection Strings)",
    "DATABASE_URL=mysql://db_user:password@localhost:3306/db_name",
    "",
    "# Random secret for session cookies (generate with: openssl rand -hex 32)",
    "SESSION_SECRET=change-me-to-a-long-random-string",
    "",
    "# ── Optional ────────────────────────────────────────────────────",
    "# Absolute path on disk where uploaded images are stored",
    "# UPLOADS_DIR=/home/cpanelusername/nexcoin/uploads",
    "",
    "# Path that Express serves uploads from (default: /uploads)",
    "# UPLOADS_URL_PATH=/uploads",
  ].join("\n");
  fs.writeFileSync("build/.env.example", envExample);

  // Deployment README
  const readme = [
    "# Nexcoin — cPanel Deployment Guide",
    "",
    "Everything in this zip is production-ready. NO `npm install` is required —",
    "all Node.js dependencies are bundled inside  dist/index.cjs.",
    "",
    "──────────────────────────────────────────────────────────────────────",
    "STEP 1 — Upload",
    "──────────────────────────────────────────────────────────────────────",
    "  • In cPanel → File Manager, create a folder (e.g.  /home/youruser/nexcoin)",
    "  • Upload this zip into that folder and Extract it.",
    "",
    "──────────────────────────────────────────────────────────────────────",
    "STEP 2 — Create the MySQL database",
    "──────────────────────────────────────────────────────────────────────",
    "  • cPanel → MySQL Databases:",
    "      - Create a database (e.g.  youruser_nexcoin)",
    "      - Create a user with a strong password",
    "      - Add the user to the database with ALL PRIVILEGES",
    "  • cPanel → phpMyAdmin → select the database → Import:",
    "      - Choose  migrations/setup.sql  → Go.",
    "    This creates every table the app needs.",
    "",
    "──────────────────────────────────────────────────────────────────────",
    "STEP 3 — Setup the Node.js app (Setup Node.js App / Node.js Selector)",
    "──────────────────────────────────────────────────────────────────────",
    "  • Node.js version    : 18.x or higher",
    "  • Application root   : the folder where you extracted the zip",
    "  • Application URL    : your domain or subdomain",
    "  • Application startup file :  dist/index.cjs",
    "  • DO NOT click 'Run NPM Install'. It is not needed.",
    "",
    "  In the same panel, add these environment variables:",
    "      DATABASE_URL     mysql://user:password@localhost:3306/dbname",
    "      SESSION_SECRET   <a long random string — e.g. openssl rand -hex 32>",
    "      NODE_ENV         production",
    "      PORT             (leave empty — cPanel sets this automatically)",
    "",
    "──────────────────────────────────────────────────────────────────────",
    "STEP 4 — Save & Restart",
    "──────────────────────────────────────────────────────────────────────",
    "  • Click  Save, then  Restart.",
    "  • Visit your domain — the site is now live.",
    "",
    "──────────────────────────────────────────────────────────────────────",
    "Notes",
    "──────────────────────────────────────────────────────────────────────",
    "  • Static frontend lives in  public/  and is served automatically.",
    "  • User-uploaded images go in  uploads/  (created on first upload).",
    "  • To update the site: re-build, re-upload the new zip, and restart the",
    "    Node.js app from cPanel. The database is preserved.",
    "  • Default admin login (change it after first login!):",
    "      username: admin",
    "      password: admin123456",
  ].join("\n");
  fs.writeFileSync("build/DEPLOY.md", readme);

  const totalBytes = dirSize("build");
  const sizeMb = (totalBytes / 1024 / 1024).toFixed(1);
  console.log(`\nBuild complete!`);
  console.log(`  build/  (${sizeMb} MB)`);
  console.log(`\nDownload the  build/  folder from the file tree and upload its contents to cPanel.`);
  console.log(`See  build/DEPLOY.md  for step-by-step cPanel setup instructions.`);
}

function copyDir(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function dirSize(dir: string): number {
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) total += dirSize(full);
    else total += fs.statSync(full).size;
  }
  return total;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
