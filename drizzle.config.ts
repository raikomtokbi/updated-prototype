import { defineConfig } from "drizzle-kit";

if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER) {
  throw new Error("MySQL credentials must be set: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? "3306", 10),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? "",
  },
});
