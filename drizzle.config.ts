import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql2",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "mysql://root:password@localhost:3306/nexcoin",
  },
});
