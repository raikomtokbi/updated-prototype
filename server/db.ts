import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured.");
}

const url = process.env.DATABASE_URL;

function buildDb() {
  if (url.startsWith("mysql://") || url.startsWith("mysql2://")) {
    // Production: MySQL / MariaDB (cPanel)
    const { createPool } = require("mysql2/promise");
    const { drizzle } = require("drizzle-orm/mysql2");
    const pool = createPool(url);
    return drizzle(pool, { schema, mode: "default" });
  } else {
    // Development fallback: PostgreSQL (Replit built-in)
    const { Pool } = require("pg");
    const { drizzle } = require("drizzle-orm/node-postgres");
    const pool = new Pool({ connectionString: url });
    return drizzle(pool, { schema });
  }
}

export const db = buildDb();
