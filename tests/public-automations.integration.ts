import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db, pool } from "../server/db";
import { storage } from "../server/storage";
import { automations, nudgPages, offers, visitorEvents, visitorSessions } from "../shared/schema";

test("hidden targets reach automations, tracking works, and published status persists behind protected writes", async () => {
  assert.notEqual(process.env.NODE_ENV, "production", "Run this test against development only.");
  assert.ok(process.env.REPLIT_DEV_DOMAIN, "The development app must be running.");
  const origin = `https://${process.env.REPLIT_DEV_DOMAIN}`;
  const creator = await storage.getCreatorByUserId("user-demo");
  assert.ok(creator, "The development demo creator must exist.");
  const fixture = await storage.createNudgPage({
    creatorId: creator.id,
    slug: `automation-check-${randomUUID()}`,
    title: "Automation regression check",
  });

  const request = async (path: string, method = "GET", body?: unknown) => {
    const response = await fetch(`${origin}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    assert.equal(response.status, 200, `${method} ${path}: ${await response.clone().text()}`);
    return response.json();
  };

  try {
    const hidden = await storage.createOffer({
      pageId: fixture.id,
      type: "custom",
      title: "Trigger-only offer",
      cta: "View offer",
      href: "https://example.com/offer",
      funnelStage: "core",
      isHidden: true,
    });
    await storage.createAutomation({
      pageId: fixture.id,
      name: "Halfway down",
      triggerType: "scroll_depth",
      triggerConfig: { scrollPercent: 50 },
      offerId: hidden.id,
      overlayTemplate: "popup",
    });

    const publicList = await request(`/api/offers?pageId=${fixture.id}`);
    assert.ok(!publicList.offers.some((offer: any) => offer.id === hidden.id));

    const session = await request("/api/track/session", "POST", {
      pageSlug: fixture.slug,
      fingerprint: `regression-${randomUUID()}`,
      device: "mobile",
    });
    const route = await request("/api/route", "POST", {
      sessionId: session.sessionId,
      pageSlug: fixture.slug,
    });
    assert.ok(route.automationOffers.some((offer: any) => offer.id === hidden.id));
    assert.equal(route.automations[0].triggerConfig.scrollPercent, 50);

    const tracked = await request("/api/track/event", "POST", {
      sessionId: session.sessionId,
      eventType: "scroll",
      meta: { scrollDepth: 50 },
    });
    assert.equal(tracked.success, true);

    const signedOutPublish = await fetch(`${origin}/api/pages/${fixture.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: true }),
    });
    assert.equal(signedOutPublish.status, 401, "Publishing must still require sign-in.");

    // Check the handler's persistence operation without bypassing sign-in on HTTP routes.
    const published = await storage.updateNudgPage(fixture.id, { isPublished: true });
    assert.equal(published?.isPublished, true);
    const savedPage = await request(`/api/pages/${fixture.slug}`);
    assert.equal(savedPage.page.isPublished, true);
  } finally {
    const sessions = await db.select({ id: visitorSessions.id }).from(visitorSessions)
      .where(eq(visitorSessions.pageId, fixture.id));
    if (sessions.length) {
      await db.delete(visitorEvents).where(inArray(visitorEvents.sessionId, sessions.map(item => item.id)));
    }
    await db.delete(visitorSessions).where(eq(visitorSessions.pageId, fixture.id));
    await db.delete(automations).where(eq(automations.pageId, fixture.id));
    await db.delete(offers).where(eq(offers.pageId, fixture.id));
    await db.delete(nudgPages).where(eq(nudgPages.id, fixture.id));
    await pool.end();
  }
});
