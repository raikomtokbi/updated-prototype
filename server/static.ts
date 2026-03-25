import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // In production the compiled server lives at dist/server/index.js
  // so __dirname = <root>/dist/server — walk up two levels to reach client/dist
  const distPath = path.resolve(__dirname, "../../client/dist");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}. Run "npm run build" first.`,
    );
  }

  app.use(express.static(distPath));

  // SPA fallback — all non-API routes serve index.html
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
