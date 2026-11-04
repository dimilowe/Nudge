import assert from "node:assert/strict";
import test from "node:test";
import { calculateScrollDepth, getCrossedScrollMilestones } from "../client/src/lib/scroll-depth";

test("calculates and clamps scroll depth against the document's scrollable height", () => {
  assert.equal(calculateScrollDepth(500, 2000, 1000), 50);
  assert.equal(calculateScrollDepth(-20, 2000, 1000), 0);
  assert.equal(calculateScrollDepth(1500, 2000, 1000), 100);
  assert.equal(calculateScrollDepth(0, 800, 800), 0);
});

test("reports every milestone crossed by a fast scroll without reporting old milestones again", () => {
  assert.deepEqual(getCrossedScrollMilestones(20, 55), [25, 50]);
  assert.deepEqual(getCrossedScrollMilestones(55, 91), [75, 90]);
  assert.deepEqual(getCrossedScrollMilestones(91, 100), []);
});
