import { test } from "node:test";
import assert from "node:assert/strict";
import { assignExperimentVariant, countExperimentVisitors, summarizeExperimentVariant } from "../server/services/experiment-utils";

test("assignment is stable for a browser within an experiment", () => {
  const split = { a: 33, b: 33, c: 34 };
  const first = assignExperimentVariant("example-test", "anonymous-browser-key", split);
  for (let i = 0; i < 100; i++) {
    assert.equal(assignExperimentVariant("example-test", "anonymous-browser-key", split), first);
  }
});

test("weighted allocation follows the requested shares, including zero-share arms", () => {
  for (const split of [{ a: 50, b: 50, c: 0 }, { a: 20, b: 30, c: 50 }, { a: 0, b: 50, c: 50 }]) {
    const counts = [0, 0, 0];
    for (let i = 0; i < 10000; i++) {
      counts[assignExperimentVariant("example-test", `browser-${i}`, split)]++;
    }
    [split.a, split.b, split.c].forEach((share, index) => {
      if (share === 0) assert.equal(counts[index], 0);
      else assert.ok(Math.abs(counts[index] / 100 - share) < 3, `${index}: ${counts[index]}`);
    });
  }
});

test("repeat visits and multiple clicked sessions do not inflate visitor click rate", () => {
  const sessions = [
    { id: "visit1", fingerprint: "browser1" },
    { id: "visit2", fingerprint: "browser1" },
    { id: "visit3", fingerprint: "browser2" },
  ];
  assert.equal(countExperimentVisitors(sessions), 2);
  assert.deepEqual(summarizeExperimentVariant(sessions, new Set(["visit1", "visit2"])), {
    visitors: 2, conversions: 1, conversionRate: 50,
  });
  assert.deepEqual(summarizeExperimentVariant([], new Set()), {
    visitors: 0, conversions: 0, conversionRate: 0,
  });
});

test("legacy sessions without a visitor key remain countable", () => {
  assert.equal(countExperimentVisitors([
    { id: "legacy1", fingerprint: null },
    { id: "legacy2", fingerprint: null },
  ]), 2);
});
