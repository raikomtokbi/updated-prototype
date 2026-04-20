import * as schema from "@shared/schema";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured.");
}

// Force UTC end-to-end so MySQL TIMESTAMP/DATETIME columns round-trip
// without the driver applying the host's local timezone offset. Without
// this, dates inserted from Node get re-interpreted by the cPanel MySQL
// server's local timezone on read-back, producing visible offsets in the
// admin panel (e.g. an IST 1pm order showing as 7pm). The frontend then
// converts this UTC value to the admin's chosen Site Timezone for display.
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  timezone: "Z",
  dateStrings: false,
});
export const db = drizzle(pool, { schema, mode: "default" });
