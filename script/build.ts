import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, writeFile, mkdir, readdir, stat } from "fs/promises";
import path from "path";

// All pure-JS packages bundled into dist/index.cjs for zero-install deployment.
// Only packages with compiled native bindings need to be excluded.
const bundleList = [
  "bcryptjs",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "imap-simple",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "mysql2",
  "nanoid",
  "nodemailer",
  "passport",
  "passport-local",
  "razorpay",
  "adm-zip",
  "zod",
  "zod-validation-error",
];

// Recursively collect all files in a directory
async function collectFiles(dir: string): Promise<{ abs: string; rel: string }[]> {
  const results: { abs: string; rel: string }[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    const rel = path.relative(process.cwd(), abs);
    if (e.isDirectory()) {
      results.push(...(await collectFiles(abs)));
    } else {
      results.push({ abs, rel });
    }
  }
  return results;
}

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("Building client  →  client/dist ...");
  await viteBuild();

  console.log("Building server  →  dist/index.cjs ...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !bundleList.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  // Ensure uploads dir exists in dist
  await mkdir("dist/uploads", { recursive: true });

  // Write a .gitkeep so the uploads folder is included in the zip
  await writeFile("dist/uploads/.gitkeep", "");

  // ─── Create minimal production package.json ────────────────────────────────
  // cPanel Node.js app manager requires package.json.
  // No dependencies listed → npm install is a no-op (everything is bundled).
  const prodPkg = {
    name: "nexcoin",
    version: "1.0.0",
    description: "Nexcoin Gaming Top-up & Digital Products Store",
    main: "dist/index.cjs",
    scripts: {
      start: "node dist/index.cjs",
    },
    engines: {
      node: ">=18.0.0",
    },
  };
  await writeFile("dist/package.json.prod", JSON.stringify(prodPkg, null, 2));

  // ─── Build deployment zip ──────────────────────────────────────────────────
  console.log("\nBuilding deployment zip  →  nexcoin-deploy.zip ...");

  // Dynamic import of adm-zip (it's a CJS module)
  const AdmZip = (await import("adm-zip")).default;
  const zip = new AdmZip();

  // Add production package.json at root
  zip.addFile("package.json", Buffer.from(JSON.stringify(prodPkg, null, 2)));

  // Add dist/index.cjs
  zip.addLocalFile("dist/index.cjs", "dist");

  // Add uploads placeholder
  zip.addFile("uploads/.gitkeep", Buffer.from(""));

  // Add client/dist recursively
  const clientFiles = await collectFiles("client/dist");
  for (const { abs, rel } of clientFiles) {
    const dir = path.dirname(rel);
    zip.addLocalFile(abs, dir);
  }

  // Add mysql_setup.sql and .env.example
  zip.addLocalFile("mysql_setup.sql");
  zip.addLocalFile(".env.example");

  zip.writeZip("nexcoin-deploy.zip");

  const { size } = await stat("nexcoin-deploy.zip");
  const sizeMB = (size / 1024 / 1024).toFixed(2);

  console.log("\n✓ Build complete!");
  console.log("  Frontend    →  client/dist/");
  console.log("  Server      →  dist/index.cjs");
  console.log(`  Deploy zip  →  nexcoin-deploy.zip (${sizeMB} MB)`);
  console.log("\n─────────────────────────────────────────────────────");
  console.log("cPanel deployment steps:");
  console.log("  1. Upload nexcoin-deploy.zip and extract to your app root");
  console.log("  2. In cPanel Node.js Selector:");
  console.log("       Node.js version : 18 or higher");
  console.log("       Application mode: Production");
  console.log("       Application root: /home/<user>/<app-folder>");
  console.log("       Startup file    : dist/index.cjs");
  console.log("  3. Set environment variables in cPanel:");
  console.log("       DATABASE_URL=mysql://user:pass@localhost:3306/dbname");
  console.log("       SESSION_SECRET=<random-string>");
  console.log("       NODE_ENV=production");
  console.log("  4. Run mysql_setup.sql in phpMyAdmin");
  console.log("  5. Click 'Run NPM Install' (installs nothing, but required by cPanel)");
  console.log("  6. Restart the app");
  console.log("─────────────────────────────────────────────────────");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
