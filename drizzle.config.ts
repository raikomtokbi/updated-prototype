import { defineConfig } from "drizzle-kit";

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
  }
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    host: creds.host,
    port: creds.port,
    database: creds.database,
    user: creds.user,
    password: creds.password,
  },
});
