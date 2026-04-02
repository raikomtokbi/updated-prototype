import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const clientPath = path.resolve(process.cwd(), "client/dist");

  if (!fs.existsSync(clientPath)) {
    throw new Error(
      `Could not find the build directory: ${clientPath}. Run "npm run build" first.`,
    );
  }

  app.use(express.static(clientPath));

  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
  });
}
