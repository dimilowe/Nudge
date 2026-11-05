import assert from "node:assert/strict";
import test from "node:test";
import { getPublicPagePath, getPublicPageUrl } from "../client/src/lib/page-url";
import { nudgPageFormSchema, reservedRootPageSlugs } from "../shared/schema";

test("public page links use a root-level slug", () => {
  assert.equal(getPublicPagePath("dimi-lowe-finds"), "/dimi-lowe-finds");
  assert.equal(getPublicPageUrl("dimi-lowe-finds", "https://nudg.bio"), "https://nudg.bio/dimi-lowe-finds");
});

test("new root-level page slugs cannot take over Nudg routes", () => {
  for (const slug of reservedRootPageSlugs) {
    assert.equal(
      nudgPageFormSchema.safeParse({ creatorId: "creator", title: "Page", slug }).success,
      false,
      `Expected ${slug} to be reserved`,
    );
  }
  assert.equal(
    nudgPageFormSchema.safeParse({
      creatorId: "creator",
      title: "Page",
      slug: "dimi-lowe-finds",
    }).success,
    true,
  );
});
