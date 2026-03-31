import { randomUUID } from "crypto";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seedAdmin() {
  const email = "admin@raikom.com";
  const username = "admin";
  const password = "admin123";

  const existing = await db.select().from(users).where(eq(users.email, email));
  if (existing.length > 0) {
    console.log("Admin user already exists, updating role to super_admin...");
    await db.update(users).set({ role: "super_admin" }).where(eq(users.email, email));
    console.log("Done. Super admin role confirmed.");
    process.exit(0);
  }

  const id = randomUUID();
  await db.insert(users).values({
    id,
    username,
    email,
    password,
    role: "super_admin",
    fullName: "Admin",
    isActive: true,
    isEmailVerified: true,
  });

  console.log("Admin user created successfully:");
  console.log("  Username : admin");
  console.log("  Email    : admin@raikom.com");
  console.log("  Password : admin123");
  console.log("  Role     : super_admin");
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
