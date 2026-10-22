import test from "node:test";
import assert from "node:assert/strict";
import { liveAdvice, dayRecord } from "../src/ui/plantFeedback.js";

test("current advice distinguishes dry, wet, dim and bright with concrete actions", () => {
  const cases = [
    ["moss", 20, 40, "dry", "Water this patch."],
    ["succulent", 80, 70, "wet", "Skip watering; let it dry."],
    ["fern", 55, 20, "dim", "Aim light here or raise power."],
    ["fittonia", 65, 85, "bright", "Aim light away or lower power."],
  ];
  for (const [species, water, light, key, action] of cases) {
    const advice = liveAdvice(species, water, light);
    assert.equal(advice[0].key, key);
    assert.equal(advice[0].action, action);
  }
});
test("advice includes both environmental issues and prioritizes weighted impact", () => {
  assert.deepEqual(
    liveAdvice("moss", 0, 85).map((a) => a.key),
    ["dry", "bright"],
  );
  assert.deepEqual(
    liveAdvice("moss", 59, 85).map((a) => a.key),
    ["bright", "dry"],
  );
});
test("preferred boundaries suggest observation, not unnecessary water or light", () => {
  for (const [water, light] of [
    [60, 25],
    [85, 55],
    [70, 40],
  ])
    assert.deepEqual(
      liveAdvice("moss", water, light).map((a) => a.key),
      ["happy"],
    );
});
test("daily outcome is explicitly historical and separate from current advice", () => {
  const change = { day: 3, health: 4, growth: 8, reason: "happy conditions" };
  const before = dayRecord(change);
  assert.equal(before, "Last day · Day 03: Health +4");
  liveAdvice("moss", 0, 85);
  assert.equal(dayRecord(change), before);
  assert.match(dayRecord({ ...change, health: -1 }), /Health −1/);
  assert.match(dayRecord({ ...change, health: 0 }), /Health unchanged/);
  assert.equal(dayRecord(null), "");
});
