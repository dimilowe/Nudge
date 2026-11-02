import { test } from "node:test";
import assert from "node:assert/strict";
import { heroSectionSchema, isSafePageCtaHref } from "../shared/schema";

test("hero CTA accepts HTTPS, HTTP, and same-site paths", () => {
  for (const href of [
    "https://qrsocial.io/",
    "http://example.com/start",
    "/my-offer",
  ]) {
    assert.equal(isSafePageCtaHref(href), true);
  }
});

test("hero CTA rejects empty, script, and protocol-relative links", () => {
  for (const href of ["", "javascript:alert(1)", "//evil.example/path", "\\\\evil.example"]) {
    assert.equal(isSafePageCtaHref(href), false);
  }
  assert.throws(() => heroSectionSchema.parse({ type: "hero", ctaHref: "javascript:alert(1)" }));
});
