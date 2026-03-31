import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "@shared/schema";

function parseDatabaseURL(url: string) {
  // Format: mysql://USER:PASSWORD@HOST:PORT/DATABASE
  const match = url.match(/^mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)$/);
  if (!match) {
    return null;
  }
  const [, user, password, host, port, database] = match;
  return { user, password, host, port: parseInt(port, 10), database };
}

let creds = {
  user: "root",
  password: "",
  host: "localhost",
  port: 3306,
  database: "nexcoin",
};

if (process.env.DATABASE_URL) {
  const parsed = parseDatabaseURL(process.env.DATABASE_URL);
  if (parsed) {
    creds = parsed;
  } else {
    console.warn(
      "\n[DB] WARNING: DATABASE_URL is set but not in valid MySQL format." +
      "\n  Expected: DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DATABASE" +
      "\n  Using default credentials.\n"
    );
  }
} else {
  console.warn(
    "\n[DB] WARNING: DATABASE_URL is not configured." +
    "\n  Set DATABASE_URL in Replit Secrets with format:" +
    "\n  DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DATABASE" +
    "\n  Using default credentials. Database queries will fail until configured.\n"
  );
}

const pool = mysql.createPool({
  host: creds.host,
  port: creds.port,
  database: creds.database,
  user: creds.user,
  password: creds.password,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export const db = drizzle(pool, { schema, mode: "default" });
