import assert from "node:assert/strict";
import test from "node:test";
import { getImageObjectName, isSafeImageFilename } from "./app-storage";

test("App Storage image keys preserve existing upload URL filenames", () => {
  const filename = "1793651831795-283746334.png";
  assert.equal(isSafeImageFilename(filename), true);
  assert.equal(getImageObjectName(filename), `uploads/images/${filename}`);
});

test("App Storage image keys reject traversal and unsupported names", () => {
  assert.equal(isSafeImageFilename("../private.png"), false);
  assert.equal(isSafeImageFilename("avatar.svg"), false);
  assert.throws(() => getImageObjectName("../private.png"));
});
