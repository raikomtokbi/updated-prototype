import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, cp, mkdir } from "fs/promises";

// All pure-JS packages bundled into dist/index.cjs for zero-install deployment.
// Only packages with compiled native bindings need to be excluded.
const bundleList = [
  "bcryptjs",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
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

  // Copy uploads dir placeholder so the folder exists in deployment
  try {
    await mkdir("dist/uploads", { recursive: true });
  } catch {}

  console.log("\n✓ Build complete!");
  console.log("  Frontend  →  client/dist/");
  console.log("  Server    →  dist/index.cjs");
  console.log("\ncPanel startup file: dist/index.cjs");
  console.log("Environment variable required: DATABASE_URL=mysql://user:pass@localhost:3306/dbname");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
