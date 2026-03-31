import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@shared/schema";

if (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER) {
  console.error(
    "[DB] ERROR: MySQL credentials not configured.\n" +
    "  Please set the following environment variables (Replit Secrets):\n" +
    "  DB_HOST, DB_PORT (default: 3306), DB_NAME, DB_USER, DB_PASSWORD"
  );
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? "3306", 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? "",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export const db = drizzle(pool, { schema, mode: "default" });
