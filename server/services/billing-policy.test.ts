import { test } from "node:test";
import assert from "node:assert/strict";
import { isCreatorBillingRoute, summarizeBilling, type SubscriptionSummary } from "./billing-policy";

const subscription = (status: string, overrides: Partial<SubscriptionSummary> = {}): SubscriptionSummary => ({
  id: "sub_fixture", status, created: 100, trial_start: 100, trial_end: 1300,
  cancel_at_period_end: false, items: { data: [{ current_period_end: 2000 }] }, ...overrides,
});

test("new accounts have no access and are eligible for one trial", () => {
  const state = summarizeBilling([], null, 1000);
  assert.equal(state.hasAccess, false);
  assert.equal(state.trialEligible, true);
});
test("a valid Stripe trial unlocks the complete workspace", () => {
  const state = summarizeBilling([subscription("trialing")], "cus_fixture", 1000);
  assert.equal(state.hasAccess, true);
  assert.equal(state.trialEligible, false);
  assert.equal(state.trialEnd, 1300);
});
test("trial is denied at its precise expiry, even before Stripe changes status", () => {
  const state = summarizeBilling([subscription("trialing")], "cus_fixture", 1300);
  assert.equal(state.hasAccess, false);
  assert.equal(state.status, "trial_expired");
});
test("trial with missing end timestamp fails closed", () => {
  assert.equal(summarizeBilling([subscription("trialing", { trial_end: null })], "cus_fixture", 1000).hasAccess, false);
});
test("paid active access remains available through scheduled cancellation", () => {
  const state = summarizeBilling([subscription("active", { cancel_at_period_end: true })], "cus_fixture", 1500);
  assert.equal(state.hasAccess, true);
  assert.equal(state.cancelAtPeriodEnd, true);
  assert.equal(state.periodEnd, 2000);
});
test("expired, canceled and delinquent subscriptions cannot edit or restart a free trial", () => {
  for (const status of ["canceled", "past_due", "unpaid", "paused", "incomplete", "incomplete_expired"]) {
    const state = summarizeBilling([subscription(status)], "cus_fixture", 1000);
    assert.equal(state.hasAccess, false, status);
    assert.equal(state.trialEligible, false, status);
  }
});
test("existing active subscription wins over a newer canceled record", () => {
  const state = summarizeBilling([subscription("active"), subscription("canceled", { created: 200 })], "cus_fixture", 1000);
  assert.equal(state.status, "active");
});
test("all management API paths require access including direct requests", () => {
  for (const [path, method, query] of [
    ["/creator", "GET", {}], ["/demo", "GET", {}], ["/pages", "GET", {}],
    ["/pages", "POST", {}], ["/pages/page/content", "PATCH", {}],
    ["/pages/page", "DELETE", {}], ["/offers", "GET", { includeHidden: "true" }],
    ["/offers", "POST", {}], ["/offers/reorder", "PUT", {}],
    ["/routing-rules", "GET", {}], ["/automations/automation", "DELETE", {}],
    ["/experiments", "POST", {}], ["/experiments/id/metrics", "GET", {}],
    ["/analytics/page/page", "GET", {}], ["/upload/image", "POST", {}],
    ["/profile/username", "PUT", {}],
  ] as const) assert.equal(isCreatorBillingRoute(path, method, query), true, `${method} ${path}`);
});
test("public pages, offers, tracking, routing and experiment delivery remain live", () => {
  for (const [path, method] of [
    ["/pages/my-page", "GET"], ["/offers", "GET"], ["/route", "POST"],
    ["/experiments/id/resolve", "GET"], ["/track/session", "POST"],
    ["/track/event", "POST"], ["/track/offer-view", "GET"],
  ]) assert.equal(isCreatorBillingRoute(path, method), false, `${method} ${path}`);
});
test("billing and sign-in stay available to locked accounts", () => {
  for (const path of ["/auth/me", "/stripe/subscription", "/stripe/create-checkout", "/stripe/portal"]) {
    assert.equal(isCreatorBillingRoute(path, "POST"), false);
  }
});
