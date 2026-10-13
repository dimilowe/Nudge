import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { users, type User } from "@shared/schema";

export async function ensureClerkIdentitySchema() {
  // Additive, idempotent startup migration; existing demo data is untouched.
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id text`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS users_clerk_id_unique ON users (clerk_id)`);
}

export async function getClerkLocalUser(clerkId: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
  return user;
}

export async function createClerkLocalUser(
  clerkId: string,
  profile: { name: string; email?: string },
) {
  const existing = await getClerkLocalUser(clerkId);
  if (existing) return existing;
  // A single atomic statement creates both records. Only the request that
  // inserts the identity can insert its creator; concurrent requests do nothing.
  await db.execute(sql`
    WITH inserted AS (
      INSERT INTO users (clerk_id, username, password, email)
      VALUES (${clerkId}, ${`clerk_${randomUUID()}`}, '', ${profile.email || null})
      ON CONFLICT (clerk_id) DO NOTHING
      RETURNING id
    )
    INSERT INTO creators (user_id, name)
    SELECT id, ${profile.name.slice(0, 100) || "Creator"} FROM inserted
  `);
  const user = await getClerkLocalUser(clerkId);
  if (!user) throw new Error("Clerk account provisioning did not create an account.");
  return user;
}
