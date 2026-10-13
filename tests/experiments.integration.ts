import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { db } from "../server/db";
import { visitorEvents, visitorSessions } from "../shared/schema";

const base = process.env.TEST_BASE_URL;
if (!base || !(new URL(base).hostname.endsWith(".replit.dev") || ["127.0.0.1", "localhost"].includes(new URL(base).hostname))) {
  throw new Error("Set TEST_BASE_URL to the development app, never production.");
}
const createdPages: string[] = [];
const createdOffers: string[] = [];
const createdExperiments: string[] = [];
const createdSessions: string[] = [];
const suffix = randomUUID().slice(0, 8);

async function api(method: string, path: string, body?: unknown, expectedStatus = 200) {
  const res = await fetch(`${base}${path}`, {
    method, headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  assert.equal(res.status, expectedStatus, `${method} ${path}: ${JSON.stringify(data)}`);
  return data;
}

try {
  const { creator } = await api("GET", "/api/demo");
  const pages = [];
  for (const arm of ["a", "b", "c"]) {
    const { page } = await api("POST", "/api/pages", {
      creatorId: creator.id, title: `Temporary split test ${arm}`, slug: `test-${suffix}-${arm}`,
    });
    pages.push(page);
    createdPages.push(page.id);
    const { offer } = await api("POST", "/api/offers", {
      pageId: page.id, title: `Offer ${arm}`, type: "custom",
      cta: "Learn more", href: "https://example.com", funnelStage: "entry",
    });
    createdOffers.push(offer.id);
  }
  const config = {
    creatorId: creator.id, name: "Temporary AB verification",
    variantAPageId: pages[0].id, variantBPageId: pages[1].id, variantCPageId: pages[1].id,
    trafficSplit: { a: 50, b: 50, c: 0 }, targetVisitors: 10,
  };
  await api("POST", "/api/experiments", { ...config, variantBPageId: pages[0].id }, 400);
  await api("POST", "/api/experiments", { ...config, trafficSplit: { a: 20, b: 20, c: 0 } }, 400);
  await api("POST", "/api/experiments", { ...config, creatorId: randomUUID() }, 403);
  const { experiment } = await api("POST", "/api/experiments", config);
  createdExperiments.push(experiment.id);
  const resolve = (id: string, key: string) => api("GET", `/api/experiments/${id}/resolve?visitorKey=${key}`);
  assert.equal((await resolve(experiment.id, "repeat-browser-1")).experimentId, null);
  const { experiment: running } = await api("PUT", `/api/experiments/${experiment.id}`, { status: "running" });
  assert.ok(running.startedAt);
  await api("PUT", `/api/experiments/${experiment.id}`, { trafficSplit: { a: 20, b: 80, c: 0 } }, 400);
  const first = await resolve(experiment.id, "repeat-browser-1");
  assert.deepEqual(await resolve(experiment.id, "repeat-browser-1"), first);

  const visit = async (id: string, key: string) => {
    const assignment = await resolve(id, key);
    const { sessionId } = await api("POST", "/api/track/session", {
      pageSlug: assignment.pageSlug, fingerprint: key, device: "desktop",
      ...(assignment.experimentId ? { experimentId: assignment.experimentId, variantIndex: assignment.variantIndex } : {}),
    });
    createdSessions.push(sessionId);
    return { assignment, sessionId };
  };
  const one = await visit(experiment.id, "repeat-browser-1");
  const repeat = await visit(experiment.id, "repeat-browser-1");
  for (const sessionId of [one.sessionId, repeat.sessionId, repeat.sessionId]) {
    await api("POST", "/api/track/event", {
      sessionId, eventType: "offer_click", meta: { offerId: createdOffers[first.variantIndex] },
    });
  }
  let metrics = await api("GET", `/api/experiments/${experiment.id}/metrics`);
  assert.equal(metrics.experiment.totalVisitors, 1);
  const arm = ["a", "b", "c"][first.variantIndex];
  assert.equal(metrics.variants[arm].visitors, 1);
  assert.equal(metrics.variants[arm].conversions, 1);
  assert.equal(metrics.variants[arm].conversionRate, 100);

  await api("PUT", `/api/experiments/${experiment.id}`, { status: "paused" });
  assert.equal((await resolve(experiment.id, "repeat-browser-1")).pageSlug, pages[0].slug);
  await visit(experiment.id, "paused-browser");
  metrics = await api("GET", `/api/experiments/${experiment.id}/metrics`);
  assert.equal(metrics.experiment.totalVisitors, 1);
  await api("PUT", `/api/experiments/${experiment.id}`, { status: "running" });
  assert.deepEqual(await resolve(experiment.id, "repeat-browser-1"), first);
  await api("PUT", `/api/experiments/${experiment.id}`, { winnerId: pages[1].id });
  const finished = await resolve(experiment.id, "new-browser-key");
  assert.equal(finished.pageSlug, pages[1].slug);
  assert.equal(finished.experimentId, null);
  await api("PUT", `/api/experiments/${experiment.id}`, { status: "running" }, 400);

  const { experiment: abc } = await api("POST", "/api/experiments", {
    ...config, name: "Temporary ABC verification", variantCPageId: pages[2].id,
    trafficSplit: { a: 33, b: 33, c: 34 },
  });
  createdExperiments.push(abc.id);
  await api("PUT", `/api/experiments/${abc.id}`, { status: "running" });
  for (let i = 0; i < 10; i++) await visit(abc.id, `sample-browser-${i}`);
  metrics = await api("GET", `/api/experiments/${abc.id}/metrics`);
  assert.equal(metrics.experiment.status, "completed");
  assert.equal(metrics.experiment.totalVisitors, 10);
  assert.equal((await resolve(abc.id, "extra-browser-key")).experimentId, null);
  console.log("PASS: AB/ABC creation, validation, start/pause/resume, stable routing, unique click attribution, winner serving, automatic target completion.");
} finally {
  if (createdSessions.length) {
    await db.delete(visitorEvents).where(inArray(visitorEvents.sessionId, createdSessions));
    await db.delete(visitorSessions).where(inArray(visitorSessions.id, createdSessions));
  }
  for (const id of createdExperiments) await api("DELETE", `/api/experiments/${id}`);
  for (const id of createdOffers) await api("DELETE", `/api/offers/${id}`);
  for (const id of createdPages) await api("DELETE", `/api/pages/${id}`);
  console.log("Temporary verification data removed.");
}
