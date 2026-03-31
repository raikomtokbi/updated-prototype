import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seedAdmin() {
  const userId = "000001";

  const existing = await db.select().from(users).where(eq(users.id, userId));
  if (existing.length > 0) {
    console.log(`User with ID ${userId} found. Updating role to super_admin...`);
    await db.update(users).set({ role: "super_admin" }).where(eq(users.id, userId));
    console.log("Done. User is now super_admin.");
    process.exit(0);
  }

  console.log(`No user found with ID ${userId}.`);
  process.exit(1);
}

seedAdmin().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
