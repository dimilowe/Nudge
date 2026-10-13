import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "../server/db";
import { users, creators, nudgPages } from "../shared/schema";
import { createClerkLocalUser, getClerkLocalUser } from "../server/services/clerk-accounts";

// Development fixtures only. This tests the local identity bridge and real
// HTTP authorization, without a fake sign-in or any authentication bypass.
const baseUrl = process.env.TEST_BASE_URL;
if (!baseUrl || !new URL(baseUrl).hostname.endsWith(".replit.dev")) {
  throw new Error("Set TEST_BASE_URL to the running development preview URL.");
}
const marker = randomUUID();
const subjectA = `clerk-verification-a-${marker}`;
const subjectB = `clerk-verification-b-${marker}`;
const userIds: string[] = [];
const creatorIds: string[] = [];
let pageId = "";

async function request(path: string, method = "GET", body?: unknown) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

try {
  const accounts = await Promise.all(Array.from({ length: 4 }, () =>
    createClerkLocalUser(subjectA, { name: "Verification Creator A" }),
  ));
  assert(accounts.every((account) => account.id === accounts[0].id));
  const userA = accounts[0];
  userIds.push(userA.id);
  assert.equal(userA.password, "");
  assert.equal((await getClerkLocalUser(subjectA))?.id, userA.id);
  const creatorA = await db.select().from(creators).where(eq(creators.userId, userA.id));
  assert.equal(creatorA.length, 1, "Concurrent setup must create one profile");
  creatorIds.push(creatorA[0].id);

  const userB = await createClerkLocalUser(subjectB, { name: "Verification Creator B" });
  userIds.push(userB.id);
  assert.notEqual(userA.id, userB.id, "Different Clerk identities need separate workspaces");
  const [creatorB] = await db.select().from(creators).where(eq(creators.userId, userB.id));
  creatorIds.push(creatorB.id);
  const [page] = await db.insert(nudgPages).values({
    creatorId: creatorA[0].id,
    title: "Clerk verification page",
    slug: `clerk-verification-${marker}`,
  }).returning();
  pageId = page.id;

  assert.equal((await request("/api/auth/me")).status, 401);
  assert.equal((await request("/api/creator")).status, 401);
  assert.equal((await request("/api/auth/login", "POST", { username: userA.username, password: "" })).status, 410);
  assert.equal((await request("/api/auth/register", "POST", { username: marker, password: marker })).status, 410);
  assert.equal((await request(`/api/pages?creatorId=${creatorA[0].id}`)).status, 403);
  assert.equal((await request(`/api/pages/${page.id}`, "PUT", { title: "unauthorized change" })).status, 403);
  assert.equal((await request(`/api/pages/${page.id}`, "DELETE")).status, 403);
  assert.equal((await request(`/api/analytics/page/${page.id}`)).status, 403);
  assert.equal((await request("/api/pages", "POST", {
    creatorId: creatorA[0].id, title: "unauthorized", slug: marker,
  })).status, 403);
  assert.equal((await request(`/api/pages/${page.slug}`)).status, 200, "Landing pages remain public");
  assert.equal((await request("/api/demo")).status, 200, "Signed-out demo remains available");
  const [unchanged] = await db.select().from(nudgPages).where(eq(nudgPages.id, page.id));
  assert.equal(unchanged.title, page.title);
  console.log("PASS: Clerk workspace creation, concurrency, isolation, disabled old sign-in, and public demo/pages.");
} finally {
  if (pageId) await db.delete(nudgPages).where(eq(nudgPages.id, pageId));
  // Discover all fixture rows even if a prior assertion failed.
  const fixtureUsers = await db.select().from(users).where(inArray(users.clerkId, [subjectA, subjectB]));
  const ids = fixtureUsers.map((user) => user.id);
  if (ids.length) {
    await db.delete(creators).where(inArray(creators.userId, ids));
    await db.delete(users).where(inArray(users.id, ids));
  }
}
