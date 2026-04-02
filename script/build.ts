import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// Packages bundled into the server output for self-contained deployment.
// mysql2 and bcrypt are intentionally excluded so their native bindings
// load from node_modules at runtime (run `npm install` on the server).
const bundleList = [
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "passport",
  "passport-local",
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

  console.log("\nBuild complete!");
  console.log("  Frontend  →  client/dist/");
  console.log("  Server    →  dist/index.cjs");
  console.log("\nStartup:  node dist/index.cjs");
  console.log("cPanel:   Set startup file to dist/index.cjs");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
