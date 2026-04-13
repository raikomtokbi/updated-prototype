import { build } from "esbuild";
import { execSync } from "child_process";
import * as path from "path";

async function main() {
  console.log("Building frontend...");
  execSync("npx vite build --config vite.config.prod.ts", { stdio: "inherit" });

  console.log("Building backend...");
  await build({
    entryPoints: ["server/index.ts"],
    bundle: true,
    platform: "node",
    target: "node18",
    outfile: "dist/index.cjs",
    format: "cjs",
    packages: "external",
    alias: {
      "@shared": path.resolve("shared"),
      "@": path.resolve("client/src"),
      "@assets": path.resolve("attached_assets"),
    },
    define: {
      "process.env.NODE_ENV": '"production"',
    },
  });

  console.log("\nBuild complete!");
  console.log("Deploy the following to cPanel:");
  console.log("  dist/index.cjs      (server bundle)");
  console.log("  client/dist/        (frontend static files)");
  console.log("  package.json");
  console.log("  node_modules/       (or run: npm install --production)");
  console.log("\ncPanel startup file: dist/index.cjs");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
