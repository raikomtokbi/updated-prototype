import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { injectSeo } from "./lib/seoInjector";

export function serveStatic(app: Express) {
  const clientPath = path.resolve(process.cwd(), "client/dist");

  if (!fs.existsSync(clientPath)) {
    throw new Error(
      `Could not find the build directory: ${clientPath}. Run "npm run build" first.`,
    );
  }

  app.use(express.static(clientPath));

  app.use("/{*path}", async (_req, res) => {
    try {
      const htmlPath = path.join(clientPath, "index.html");
      let html = await fs.promises.readFile(htmlPath, "utf-8");
      html = await injectSeo(html);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (err) {
      res.status(500).send("Internal Server Error");
    }
  });
}
