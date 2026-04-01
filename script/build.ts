import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// Packages bundled into the server output for self-contained deployment
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
  "pg",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("Building client  →  client/dist ...");
  await viteBuild();

  console.log("Building server  →  dist/server/index.js ...");
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
    // Output to dist/server/index.js so __dirname = dist/server/ at runtime.
    // Express then resolves ../../client/dist → <root>/client/dist correctly.
    outfile: "dist/server/index.js",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  // Write a thin wrapper so the existing `node dist/index.cjs` start script
  // also works (Node keeps __dirname = dist/server inside the required bundle).
  const { writeFile } = await import("fs/promises");
  await writeFile("dist/index.cjs", "require('./server/index.js');\n");

  console.log("\nBuild complete!");
  console.log("  Frontend  →  client/dist");
  console.log("  Server    →  dist/server/index.js");
  console.log("  Wrapper   →  dist/index.cjs  (legacy compat)");
  console.log("\ncPanel:  node dist/server/index.js");
  console.log("Replit:  node dist/index.cjs");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
