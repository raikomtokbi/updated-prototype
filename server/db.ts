import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@shared/schema";

if (!process.env.DB_HOST) {
  console.warn(
    "\n[DB] WARNING: MySQL credentials are not yet configured." +
    "\n  Set DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD in Replit Secrets." +
    "\n  The server will start, but database queries will fail until credentials are provided.\n"
  );
}

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "localhost",
  port: parseInt(process.env.DB_PORT ?? "3306", 10),
  database: process.env.DB_NAME ?? "nexcoin",
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export const db = drizzle(pool, { schema, mode: "default" });
