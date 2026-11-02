import { test } from "node:test";
import assert from "node:assert/strict";
import { offerFormSchema } from "../shared/schema";

const validOffer = {
  pageId: "page-1",
  type: "digital_product",
  title: "QR Social",
  cta: "Check It Out",
  href: "https://qrsocial.io/",
  funnelStage: "core",
};

test("offer creation accepts an uploaded same-origin image path", () => {
  const parsed = offerFormSchema.parse({
    ...validOffer,
    imageUrl: "/uploads/images/1793651831795-283746334.png",
  });
  assert.equal(parsed.imageUrl, "/uploads/images/1793651831795-283746334.png");
});

test("offer creation accepts a normal external HTTPS image URL", () => {
  const parsed = offerFormSchema.parse({
    ...validOffer,
    imageUrl: "https://cdn.example.com/offer.webp",
  });
  assert.equal(parsed.imageUrl, "https://cdn.example.com/offer.webp");
});

test("offer creation permits an omitted or empty optional image", () => {
  assert.equal(offerFormSchema.parse(validOffer).imageUrl, undefined);
  assert.equal(offerFormSchema.parse({ ...validOffer, imageUrl: "" }).imageUrl, "");
});

test("offer creation rejects unsafe image schemes and untrusted relative paths", () => {
  for (const imageUrl of [
    "javascript:alert(1)",
    "data:image/png;base64,AAAA",
    "//cdn.example.com/image.png",
    "/uploads/images/../../private.png",
  ]) {
    assert.throws(() => offerFormSchema.parse({ ...validOffer, imageUrl }));
  }
});
