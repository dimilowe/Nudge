import { test } from "node:test";
import assert from "node:assert/strict";
import { billingRequestOrigin } from "../server/services/billing-origin";
import { pricingAuthReturn, pricingSignInUrl } from "../client/src/lib/billing-navigation";

const env = {
  REPLIT_DOMAINS: "nudg.replit.app",
  REPLIT_DEV_DOMAIN: "workspace.replit.dev",
  BILLING_ALLOWED_ORIGINS: "https://nudg.bio,https://nudg.replit.app",
};

test("billing returns to the custom domain where checkout began, not the first configured domain", () => {
  assert.equal(billingRequestOrigin({ host: "nudg.bio", origin: "https://nudg.bio" }, env), "https://nudg.bio");
});
test("billing also preserves the replit.app host", () => {
  assert.equal(billingRequestOrigin({ host: "nudg.replit.app", origin: "https://nudg.replit.app" }, env), "https://nudg.replit.app");
});
test("billing and Clerk agree on the public host behind the deployment proxy", () => {
  assert.equal(billingRequestOrigin({
    host: "internal-service", "x-forwarded-host": "nudg.bio, internal-proxy", origin: "https://nudg.bio",
  }, env), "https://nudg.bio");
});
test("preview billing returns to the preview host", () => {
  assert.equal(billingRequestOrigin({ host: "workspace.replit.dev" }, env), "https://workspace.replit.dev");
});
test("unrecognized hosts and cross-origin requests cannot control Stripe return URLs", () => {
  for (const headers of [
    { host: "evil.example", origin: "https://evil.example" },
    { host: "nudg.bio", origin: "https://evil.example" },
    { host: "nudg.bio@evil.example" }, { host: "nudg.bio/path" }, {},
  ]) assert.throws(() => billingRequestOrigin(headers, env));
});
test("signed-out checkout recovery resumes the existing confirmation after sign-in", () => {
  const signInUrl = pricingSignInUrl();
  assert.equal(signInUrl.split("?")[0], "/sign-in");
  assert.equal(pricingAuthReturn(`?${signInUrl.split("?")[1]}`), "/pricing?checkout=success");
});
test("sign-in recovery supports a mounted app base path", () => {
  const signInUrl = pricingSignInUrl("/app");
  assert.equal(signInUrl.split("?")[0], "/app/sign-in");
  assert.equal(pricingAuthReturn(`?${signInUrl.split("?")[1]}`, "/app"), "/app/pricing?checkout=success");
});
test("ordinary pricing signup and canceled returns keep their destination", () => {
  assert.equal(pricingAuthReturn("?redirect_url=%2Fpricing"), "/pricing");
  assert.equal(pricingAuthReturn("?redirect_url=%2Fpricing%3Fcheckout%3Dcanceled"), "/pricing?checkout=canceled");
});
test("auth redirects cannot be sent to external hosts or unrelated app paths", () => {
  for (const url of ["https://evil.example/pricing", "//evil.example/pricing", "/dashboard", "/sign-out"]) {
    assert.equal(pricingAuthReturn(`?redirect_url=${encodeURIComponent(url)}`), undefined);
  }
  assert.equal(pricingAuthReturn("?redirect_url=%2Fpricing%3Fcheckout%3Dsuccess%26next%3Dhttps%3A%2F%2Fevil.example"), "/pricing?checkout=success");
});
