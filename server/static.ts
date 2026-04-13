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

  const htmlPath = path.join(clientPath, "index.html");
  let cachedTemplate: string | null = null;

  async function getTemplate(): Promise<string> {
    if (!cachedTemplate) {
      cachedTemplate = await fs.promises.readFile(htmlPath, "utf-8");
    }
    return cachedTemplate;
  }

  app.use(express.static(clientPath, { index: false }));

  app.use("/{*path}", async (_req, res) => {
    try {
      const template = await getTemplate();
      const html = await injectSeo(template);
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (err) {
      console.error("[serveStatic] Failed to serve index.html:", err);
      cachedTemplate = null;
      res.status(500).send("Internal Server Error");
    }
  });
}
