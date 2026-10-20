import { test } from "node:test";
import assert from "node:assert/strict";
import { SPECIES, SLOTS } from "../src/simulation/species.js";
import {
  SOIL_POINTS,
  SOIL_RADIUS,
  WATER_RADIUS,
  AMBIENT_LIGHT,
  INITIAL_LAMP,
  lampFrame,
  surfaceHeight,
} from "../src/simulation/environment.js";
import {
  clamp,
  distanceToRange,
  suitability,
  comfortFor,
  comfortStatus,
  lightAt,
  moistureAt,
  averageMoisture,
  conditionsFor,
  createInitialState,
  plantAt,
  movePlant,
  waterSoil,
  setLamp,
  nextDay,
  resetExperiment,
} from "../src/simulation/simulation.js";
const two = () => plantAt(plantAt(createInitialState(), "moss", 0), "fern", 2);
const near = (a, b, epsilon = 1e-8) =>
  assert.ok(Math.abs(a - b) < epsilon, `${a} ≠ ${b}`);
test("preference boundaries and 55/45 comfort weighting remain exact", () => {
  assert.equal(distanceToRange(60, 60, 85), 0);
  assert.equal(distanceToRange(85, 60, 85), 0);
  assert.equal(distanceToRange(50, 60, 85), 10);
  assert.equal(distanceToRange(95, 60, 85), 10);
  assert.equal(suitability(35, [60, 85]), 0);
  assert.equal(comfortFor("moss", 70, 40), 1);
  assert.equal(comfortFor("moss", 35, 40), 0.45);
  assert.equal(comfortFor("moss", 70, 80), 0.55);
  assert.equal(comfortStatus(0.8), "Comfortable");
  assert.equal(comfortStatus(0.55), "Needs Adjustment");
  assert.equal(comfortStatus(0.549), "Stressed");
});
test("initial soil samples cover only the small jar and each experiment is independent", () => {
  const a = createInitialState(),
    b = createInitialState();
  assert.equal(a.moisture.length, SOIL_POINTS.length);
  assert.ok(a.moisture.length > 150);
  assert.ok(SOIL_POINTS.every((p) => Math.hypot(p.x, p.z) <= SOIL_RADIUS));
  assert.ok(a.moisture.every((v) => v === 60));
  assert.equal(a.day, 1);
  assert.notEqual(a.moisture, b.moisture);
  assert.notEqual(a.lamp.target, b.lamp.target);
  near(moistureAt(a, SLOTS[0]), 60);
});
test("localized watering changes exactly samples inside its visible footprint", () => {
  const s = two(),
    point = SLOTS[0],
    w = waterSoil(s, point);
  let changed = 0;
  SOIL_POINTS.forEach((p, i) => {
    if (Math.hypot(p.x - point.x, p.z - point.z) >= WATER_RADIUS)
      assert.equal(w.moisture[i], 60);
    else {
      assert.ok(w.moisture[i] > 60);
      changed++;
    }
  });
  assert.ok(changed > 15 && changed < SOIL_POINTS.length / 3);
  assert.equal(s.soilMoisture, 60);
  assert.ok(s.moisture.every((v) => v === 60));
  near(w.soilMoisture, averageMoisture(w.moisture));
});
test("water reaches the selected roots without changing a distant plant, health, or day", () => {
  const s = two(),
    w = waterSoil(s, SLOTS[0]);
  assert.ok(conditionsFor(w, w.plants[0]).moisture > 82);
  near(conditionsFor(w, w.plants[1]).moisture, 60);
  assert.deepEqual(w.plants, s.plants);
  assert.equal(w.day, 1);
  assert.ok(w.soilMoisture < 65);
});
test("repeated local watering caps samples at 100 while unwatered areas stay at 60", () => {
  let s = two();
  for (let i = 0; i < 12; i++) s = waterSoil(s, SLOTS[0]);
  assert.ok(s.moisture.every((v) => v <= 100 && v >= 60));
  near(moistureAt(s, SLOTS[0]), 100);
  near(moistureAt(s, SLOTS[2]), 60);
  assert.equal(s.plants[0].health, 70);
});
test("invalid water locations have no side effects and no implicit full-jar watering", () => {
  const s = two();
  for (const p of [
    undefined,
    null,
    { x: NaN, z: 0 },
    { x: 0, z: Infinity },
    { x: SOIL_RADIUS + 0.01, z: 0 },
  ])
    assert.equal(waterSoil(s, p), s);
});
test("lamp cone has a real aim, compact beam support, ambient baseline and bounded output", () => {
  const s = setLamp(two(), {
    radius: 0.3,
    target: { x: -0.55, z: 0.43 },
    power: 100,
  });
  assert.ok(lightAt(s.lamp, SLOTS[0]) > 75);
  assert.equal(lightAt(s.lamp, SLOTS[2]), AMBIENT_LIGHT);
  assert.equal(lightAt({ ...s.lamp, power: 0 }, SLOTS[0]), AMBIENT_LIGHT);
  for (const p of SOIL_POINTS) {
    const l = lightAt(s.lamp, p);
    assert.ok(l >= 20 && l <= 85);
  }
});
test("beam size and power independently control the illuminated patch", () => {
  const base = two(),
    wide = setLamp(base, { radius: 1.15, target: SLOTS[0], power: 100 }),
    narrow = setLamp(wide, { radius: 0.3 }),
    dim = setLamp(narrow, { power: 35 });
  assert.ok(lightAt(wide.lamp, SLOTS[2]) > lightAt(narrow.lamp, SLOTS[2]));
  assert.ok(lightAt(narrow.lamp, SLOTS[0]) > lightAt(dim.lamp, SLOTS[0]));
  assert.equal(narrow.lamp.power, 100);
  assert.equal(dim.lamp.radius, 0.3);
});
test("lamp orbit and reach alter a coherent fixture frame without mutating health or water", () => {
  const s = two(),
    a = setLamp(s, { azimuth: -120, reach: 1.4 }),
    f = lampFrame(a.lamp),
    original = lampFrame(s.lamp);
  assert.notDeepEqual(f.head, original.head);
  assert.notDeepEqual(f.base, original.base);
  near(Math.hypot(f.base.x, f.base.z), 2.02);
  near(Math.hypot(f.head.x, f.head.z), 0.62);
  near(Math.hypot(f.direction.x, f.direction.y, f.direction.z), 1);
  near(f.aim.y, surfaceHeight(f.aim.x, f.aim.z));
  assert.deepEqual(a.plants, s.plants);
  assert.deepEqual(a.moisture, s.moisture);
  assert.notDeepEqual(
    SLOTS.map((p) => lightAt(s.lamp, p)),
    SLOTS.map((p) => lightAt(a.lamp, p)),
  );
});
test("lamp clamps all controls and aims inside soil, ignoring nonfinite values", () => {
  const s = two(),
    a = setLamp(s, {
      power: 999,
      radius: -1,
      reach: 9,
      azimuth: -999,
      target: { x: 99, z: 0 },
    });
  assert.equal(a.lamp.power, 100);
  assert.equal(a.lamp.radius, 0.3);
  assert.equal(a.lamp.reach, 1.45);
  assert.equal(a.lamp.azimuth, -180);
  assert.ok(Math.hypot(a.lamp.target.x, a.lamp.target.z) < SOIL_RADIUS);
  const b = setLamp(s, { power: NaN, radius: Infinity });
  assert.deepEqual(b.lamp, s.lamp);
  assert.equal(setLamp(s, null), s);
});
test("plant uniqueness, fixed-slot capacity, invalid operations and immutable swapping", () => {
  const s = two();
  assert.equal(plantAt(s, "moss", 1), s);
  assert.equal(plantAt(s, "succulent", 0), s);
  assert.equal(plantAt(s, "unknown", 1), s);
  assert.equal(plantAt(s, "succulent", 9), s);
  const full = plantAt(s, "succulent", 1);
  assert.equal(plantAt(full, "fittonia", 0), full);
  const moved = movePlant(s, "moss", 2);
  assert.equal(moved.plants[0].slot, 2);
  assert.equal(moved.plants[1].slot, 0);
  assert.ok(moved.plants.every((p) => p.health === 70 && p.growth === 20));
  assert.equal(s.plants[0].slot, 0);
  assert.equal(movePlant(s, "moss", -1), s);
});
test("water belongs to terrain rather than following a moved plant", () => {
  const wet = waterSoil(two(), SLOTS[0]),
    moved = movePlant(wet, "moss", 2);
  assert.equal(moved.moisture, wet.moisture);
  assert.ok(conditionsFor(wet, wet.plants[0]).moisture > 82);
  near(conditionsFor(moved, moved.plants[0]).moisture, 60);
  assert.equal(moved.plants[0].health, 70);
});
test("daily drying is spatial: lit cells and occupied roots consume water locally", () => {
  const s = setLamp(two(), { target: SLOTS[0], radius: 0.3, power: 100 }),
    n = nextDay(s);
  assert.equal(n.day, 2);
  assert.ok(n.soilMoisture < 60 && n.soilMoisture > 49);
  assert.ok(new Set(n.moisture.map((v) => v.toFixed(2))).size > 3);
  const far = SOIL_POINTS.findIndex(
    (p) =>
      Math.hypot(p.x - SLOTS[0].x, p.z - SLOTS[0].z) > 0.5 &&
      Math.hypot(p.x - SLOTS[2].x, p.z - SLOTS[2].z) > 0.5 &&
      lightAt(s.lamp, p) === 20,
  );
  assert.ok(far >= 0);
  assert.equal(n.moisture[far], 55);
  near(n.soilMoisture, averageMoisture(n.moisture));
  assert.equal(s.day, 1);
  assert.equal(nextDay(createInitialState()).day, 1);
});
test("health and growth use post-drying local comfort, with exact healthy-fern growth", () => {
  const s = two(),
    n = nextDay(s),
    fern = n.plants.find((p) => p.species === "fern");
  assert.equal(fern.health, 75);
  assert.equal(fern.growth, 28);
  for (const p of n.plants) {
    const c = conditionsFor(n, p).comfort;
    assert.equal(p.health, clamp(70 + Math.round(20 * (c - 0.75)), 15, 100));
    assert.equal(p.growth, 20 + (c >= 0.8 ? 8 : c >= 0.55 ? 3 : 0));
  }
  const low = nextDay({
    ...s,
    plants: s.plants.map((p) => ({ ...p, health: 15 })),
  });
  assert.ok(low.plants.every((p) => p.health >= 15 && p.growth === 20));
});
test("reset restores every cell and lamp parameter but keeps plant species and arrangement", () => {
  const s = movePlant(
      setLamp(nextDay(waterSoil(two(), SLOTS[0])), {
        azimuth: 0,
        reach: 1.3,
        power: 35,
        radius: 0.4,
        target: SLOTS[1],
      }),
      "moss",
      1,
    ),
    r = resetExperiment(s),
    initial = createInitialState();
  assert.equal(r.day, 1);
  assert.equal(r.soilMoisture, 60);
  assert.deepEqual(r.moisture, initial.moisture);
  assert.deepEqual(r.lamp, initial.lamp);
  assert.deepEqual(
    r.plants.map((p) => [p.species, p.slot]),
    s.plants.map((p) => [p.species, p.slot]),
  );
  assert.ok(r.plants.every((p) => p.health === 70 && p.growth === 20));
});
test("long drought remains bounded and repeated experiments remain deterministic", () => {
  const run = () => {
    let s = two();
    for (let i = 0; i < 40; i++) s = nextDay(s);
    return s;
  };
  const a = run(),
    b = run();
  assert.deepEqual(a, b);
  assert.ok(a.moisture.every((v) => v === 0));
  assert.ok(
    a.plants.every((p) => p.health >= 15 && p.health <= 100 && p.growth <= 100),
  );
  assert.notEqual(comfortFor("moss", 78, 45), comfortFor("succulent", 78, 45));
  assert.equal(Object.keys(SPECIES).length, 4);
});
