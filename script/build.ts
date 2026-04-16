import { build, type Plugin } from "esbuild";
import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";
import AdmZip from "adm-zip";

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

  console.log("Creating deployment package: deploy.zip ...");
  const zip = new AdmZip();

  // Server bundle
  zip.addLocalFile("dist/index.cjs", "dist");

  // Built frontend (client/dist/ → public/ on server)
  addDirToZip(zip, "client/dist", "public");

  // MySQL setup SQL — run once in cPanel phpMyAdmin
  if (fs.existsSync("migrations/setup.sql")) {
    zip.addLocalFile("migrations/setup.sql", "migrations");
  }

  // Minimal package.json for cPanel Node.js Selector startup
  const minPkg = {
    name: "nexcoin",
    version: "1.0.0",
    type: "commonjs",
    scripts: { start: "node dist/index.cjs" },
  };
  zip.addFile("package.json", Buffer.from(JSON.stringify(minPkg, null, 2)));

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
  zip.addFile(".env.example", Buffer.from(envExample));

  // Deployment README
  const readme = [
    "# Nexcoin — cPanel Deployment Guide",
    "",
    "## 1. MySQL database",
    "   - Create a MySQL database + user in cPanel → MySQL Databases",
    "   - Import  migrations/setup.sql  via phpMyAdmin (run once)",
    "",
    "## 2. Environment variables",
    "   - Copy .env.example → .env",
    "   - Fill in DATABASE_URL and SESSION_SECRET",
    "",
    "## 3. Node.js Selector (cPanel)",
    "   - Application root : <upload directory>",
    "   - Application URL  : your domain",
    "   - Application startup file : dist/index.cjs",
    "   - Node.js version: 18 or higher",
    "   - Click  Create  then  Run NPM Install  (NOT needed — bundle is self-contained)",
    "   - Set environment variables in the Node.js Selector panel",
    "",
    "## 4. Static files",
    "   - The  public/  folder is served automatically by the Express server",
    "   - Uploaded images are stored in  uploads/  (created automatically)",
    "",
    "## 5. No npm install required",
    "   - dist/index.cjs contains ALL Node.js dependencies bundled inline",
  ].join("\n");
  zip.addFile("DEPLOY.md", Buffer.from(readme));

  zip.writeZip("deploy.zip");

  const sizeMb = (fs.statSync("deploy.zip").size / 1024 / 1024).toFixed(1);
  console.log(`\nBuild complete!`);
  console.log(`  deploy.zip  (${sizeMb} MB)`);
  console.log(`\nSee DEPLOY.md inside the zip for step-by-step cPanel setup instructions.`);
}

function addDirToZip(zip: AdmZip, dirPath: string, zipPath: string) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      addDirToZip(zip, fullPath, `${zipPath}/${entry.name}`);
    } else {
      zip.addLocalFile(fullPath, zipPath);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
