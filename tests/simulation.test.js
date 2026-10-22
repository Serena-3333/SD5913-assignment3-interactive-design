import { test } from "node:test";
import assert from "node:assert/strict";
import { SPECIES, MAX_PLANTS } from "../src/simulation/species.js";
import {
  SOIL_POINTS,
  SOIL_RADIUS,
  WATER_RADIUS,
  INITIAL_LAMP,
  lampFrame,
  surfaceHeight,
} from "../src/simulation/environment.js";
import { POINTS } from "./fixtures.mjs";
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
  removePlant,
  placementError,
  PLANT_RADIUS,
  waterSoil,
  setLamp,
  nextDay,
  resetExperiment,
  environmentalReason,
  CRITICAL_HEALTH,
  DEATH_AFTER_DAYS,
} from "../src/simulation/simulation.js";
const near = (a, b, e = 1e-8) => assert.ok(Math.abs(a - b) < e, `${a} != ${b}`);
const two = () =>
  plantAt(plantAt(createInitialState(), "moss", POINTS[0]), "fern", POINTS[2]);
test("preference ranges, boundaries, statuses and comfort weighting", () => {
  assert.equal(distanceToRange(60, 60, 85), 0);
  assert.equal(distanceToRange(95, 60, 85), 10);
  assert.equal(suitability(35, [60, 85]), 0);
  assert.equal(comfortFor("moss", 70, 40), 1);
  assert.equal(comfortFor("moss", 35, 40), 0.45);
  assert.equal(comfortStatus(0.8), "Comfortable");
  assert.equal(comfortStatus(0.55), "Needs Adjustment");
  assert.equal(comfortStatus(0.549), "Stressed");
});
test("initial state has independent water samples, lamp target and ID sequence", () => {
  const a = createInitialState(),
    b = createInitialState();
  assert.notEqual(a.moisture, b.moisture);
  assert.notEqual(a.lamp.target, b.lamp.target);
  assert.ok(SOIL_POINTS.length > 150);
  assert.ok(SOIL_POINTS.every((p) => Math.hypot(p.x, p.z) <= SOIL_RADIUS));
  assert.ok(a.moisture.every((v) => v === 60));
  assert.equal(a.nextPlantId, 1);
});
test("five free positions allow repeated species with independent identities", () => {
  let s = createInitialState();
  for (const point of POINTS) s = plantAt(s, "moss", point);
  assert.equal(s.plants.length, MAX_PLANTS);
  assert.equal(new Set(s.plants.map((p) => p.id)).size, 5);
  assert.ok(
    s.plants.every(
      (p) => p.species === "moss" && p.health === 70 && p.growth === 20,
    ),
  );
  assert.deepEqual(
    s.plants.map((p) => p.position),
    POINTS,
  );
  assert.equal(plantAt(s, "fern", { x: 0, z: 0 }), s);
});
test("free placement rejects overlap, invalid coordinates and roots outside the jar atomically", () => {
  const s = plantAt(createInitialState(), "fern", { x: 0.123, z: -0.217 });
  for (const p of [
    null,
    undefined,
    { x: NaN, z: 0 },
    { x: 0, z: Infinity },
    { x: PLANT_RADIUS + 0.001, z: 0 },
    { x: 0.123, z: -0.217 },
    { x: 0.2, z: -0.2 },
  ])
    assert.equal(plantAt(s, "moss", p), s);
  assert.equal(plantAt(s, "unknown", POINTS[0]), s);
  assert.equal(s.nextPlantId, 2);
  assert.ok(placementError(s, s.plants[0].position));
});
test("moving one repeated species changes only that individual and preserves health/growth", () => {
  const s = plantAt(
    plantAt(createInitialState(), "moss", POINTS[0]),
    "moss",
    POINTS[1],
  );
  const moved = movePlant(s, s.plants[0].id, POINTS[2]);
  assert.deepEqual(moved.plants[0].position, POINTS[2]);
  assert.deepEqual(moved.plants[1], s.plants[1]);
  assert.equal(moved.plants[0].health, 70);
  assert.equal(moved.plants[0].growth, 20);
  assert.deepEqual(s.plants[0].position, POINTS[0]);
  assert.equal(movePlant(s, s.plants[0].id, POINTS[1]), s);
});
test("removing a plant frees capacity and IDs are not reused", () => {
  let s = createInitialState();
  for (const p of POINTS) s = plantAt(s, "fern", p);
  const removed = removePlant(s, s.plants[2].id);
  assert.equal(removed.plants.length, 4);
  assert.equal(removePlant(removed, "missing"), removed);
  const added = plantAt(removed, "fern", POINTS[2]);
  assert.equal(added.plants.at(-1).id, "plant-6");
  assert.equal(s.plants.length, 5);
});
test("a local shower changes precisely its visible soil footprint", () => {
  const s = two(),
    wet = waterSoil(s, POINTS[0]);
  let count = 0;
  SOIL_POINTS.forEach((p, i) => {
    if (Math.hypot(p.x - POINTS[0].x, p.z - POINTS[0].z) >= WATER_RADIUS)
      assert.equal(wet.moisture[i], 60);
    else {
      assert.ok(wet.moisture[i] > 60);
      count++;
    }
  });
  assert.ok(count > 15 && count < SOIL_POINTS.length * 0.6);
  near(wet.soilMoisture, averageMoisture(wet.moisture));
  assert.ok(s.moisture.every((v) => v === 60));
});
test("a freely chosen midpoint waters neighbouring roots without watering the entire jar", () => {
  const s = createInitialState(),
    point = {
      x: (POINTS[0].x + POINTS[1].x) / 2,
      z: (POINTS[0].z + POINTS[1].z) / 2,
    },
    wet = waterSoil(s, point);
  assert.ok(moistureAt(wet, POINTS[0]) > 73);
  assert.ok(moistureAt(wet, POINTS[1]) > 73);
  assert.ok(wet.moisture.some((v) => v === 60));
});
test("repeated showers saturate at 100, not above, and invalid targets do nothing", () => {
  let s = two();
  for (let i = 0; i < 12; i++) s = waterSoil(s, POINTS[0]);
  assert.ok(s.moisture.every((v) => v <= 100));
  near(moistureAt(s, POINTS[0]), 100);
  near(moistureAt(s, POINTS[2]), 60);
  for (const p of [undefined, null, { x: NaN, z: 0 }, { x: 9, z: 0 }])
    assert.equal(waterSoil(s, p), s);
});
test("water belongs to soil; moving repeated species changes only their local response", () => {
  const s = waterSoil(
    plantAt(
      plantAt(createInitialState(), "moss", POINTS[0]),
      "moss",
      POINTS[1],
    ),
    POINTS[0],
  );
  assert.ok(
    conditionsFor(s, s.plants[0]).moisture >
      conditionsFor(s, s.plants[1]).moisture + 15,
  );
  const moved = movePlant(s, s.plants[0].id, POINTS[2]);
  assert.deepEqual(moved.moisture, s.moisture);
  near(conditionsFor(moved, moved.plants[0]).moisture, 60);
});
test("lamp cone remains local, bounded and controllable by size and power", () => {
  const s = setLamp(two(), { radius: 0.3, target: POINTS[0], power: 100 });
  assert.ok(lightAt(s.lamp, POINTS[0]) > 75);
  assert.equal(lightAt(s.lamp, POINTS[2]), 20);
  assert.equal(lightAt({ ...s.lamp, power: 0 }, POINTS[0]), 20);
  assert.ok(lightAt({ ...s.lamp, radius: 1.15 }, POINTS[2]) > 20);
  for (const p of SOIL_POINTS)
    assert.ok(lightAt(s.lamp, p) >= 20 && lightAt(s.lamp, p) <= 85);
});
test("reach translates the actual aim while absolute aiming and cancellation remain exact", () => {
  const s = setLamp(two(), { target: { x: 0, z: 0 }, radius: 0.3 }),
    a = setLamp(s, { reach: s.lamp.reach + 0.4 }),
    angle = (s.lamp.azimuth * Math.PI) / 180;
  near(a.lamp.target.x, -Math.sin(angle) * 0.4);
  near(a.lamp.target.z, -Math.cos(angle) * 0.4);
  const f = lampFrame(a.lamp);
  near(f.aim.y, surfaceHeight(f.aim.x, f.aim.z));
  assert.deepEqual(setLamp(a, s.lamp).lamp, s.lamp);
  assert.deepEqual(a.plants, s.plants);
});
test("lamp clamps controls and ignores nonfinite inputs", () => {
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
  assert.deepEqual(setLamp(s, { power: NaN, radius: Infinity }).lamp, s.lamp);
  assert.equal(setLamp(s, null), s);
});
test("a single plant can advance a day, while an empty jar cannot", () => {
  const empty = createInitialState();
  assert.equal(nextDay(empty), empty);
  const s = plantAt(empty, "moss", POINTS[0]),
    a = nextDay(s);
  assert.equal(a.day, 2);
  assert.equal(a.plants.length, 1);
  assert.equal(a.plants[0].id, s.plants[0].id);
});
test("daily moisture consumption follows light and every nearby root exactly", () => {
  const s = setLamp(two(), { target: POINTS[0], radius: 0.3, power: 100 }),
    a = nextDay(s);
  SOIL_POINTS.forEach((p, i) => {
    const evaporation = Math.round(4 + lightAt(s.lamp, p) / 25);
    const uptake = s.plants.reduce((sum, plant) => {
      const d = Math.hypot(p.x - plant.position.x, p.z - plant.position.z);
      return sum + (d < 0.5 ? 2 * (1 - d / 0.5) : 0);
    }, 0);
    near(a.moisture[i], clamp(60 - evaporation - uptake, 0, 100));
  });
});
test("health and growth use post-drying comfort and daily feedback reports actual deltas", () => {
  const s = two(),
    a = nextDay(s);
  for (let i = 0; i < a.plants.length; i++) {
    const p = a.plants[i],
      old = s.plants[i],
      c = conditionsFor(a, p);
    const expected = clamp(
      old.health + Math.round(20 * (c.comfort - 0.75)),
      15,
      100,
    );
    assert.equal(p.health, expected);
    const growth =
      expected < 40 ? 0 : c.comfort >= 0.8 ? 8 : c.comfort >= 0.55 ? 3 : 0;
    assert.equal(p.growth, old.growth + growth);
    assert.equal(p.lastChange.health, p.health - old.health);
    assert.equal(p.lastChange.growth, p.growth - old.growth);
    assert.equal(
      p.lastChange.reason,
      environmentalReason(p.species, c.moisture, c.light),
    );
  }
});
test("daily cause distinguishes dry, wet, dim, bright and happy conditions", () => {
  assert.equal(environmentalReason("moss", 20, 40), "soil too dry");
  assert.equal(environmentalReason("succulent", 75, 20), "soil too wet");
  assert.equal(environmentalReason("succulent", 95, 70), "soil too wet");
  assert.equal(environmentalReason("fern", 60, 20), "light too low");
  assert.equal(environmentalReason("moss", 70, 85), "light too strong");
  assert.equal(environmentalReason("fern", 60, 60), "happy conditions");
});
test("environment adjustments preserve yesterday's truthful change until the next day", () => {
  const day = nextDay(two()),
    change = day.plants[0].lastChange;
  const watered = waterSoil(day, POINTS[0]);
  const moved = movePlant(watered, day.plants[0].id, POINTS[1]);
  assert.deepEqual(moved.plants[0].lastChange, change);
  assert.equal(moved.plants[0].health, day.plants[0].health);
});
test("reset restores all fields and feedback but preserves free positions, identities and next ID", () => {
  const s = nextDay(
      waterSoil(setLamp(two(), { power: 15, reach: 1.3 }), POINTS[0]),
    ),
    r = resetExperiment(s);
  assert.equal(r.day, 1);
  assert.equal(r.nextPlantId, s.nextPlantId);
  assert.deepEqual(r.lamp, INITIAL_LAMP);
  assert.ok(r.moisture.every((v) => v === 60));
  assert.deepEqual(
    r.plants.map((p) => [p.id, p.species, p.position]),
    s.plants.map((p) => [p.id, p.species, p.position]),
  );
  assert.ok(
    r.plants.every(
      (p) => p.health === 70 && p.growth === 20 && p.lastChange === null,
    ),
  );
});
test("long experiments are deterministic and all values remain bounded", () => {
  let a = two(),
    b = two();
  for (let i = 0; i < 80; i++) {
    a = nextDay(a);
    b = nextDay(b);
  }
  assert.deepEqual(a, b);
  assert.ok(a.moisture.every((v) => v >= 0 && v <= 100));
  assert.ok(
    a.plants.every((p) => (p.dead ? p.health === 0 : p.health >= 15) && p.health <= 100 && p.growth <= 100),
  );
});

test("death requires three consecutive completed days below 25, with warning days first", () => {
  assert.equal(CRITICAL_HEALTH, 25);
  assert.equal(DEATH_AFTER_DAYS, 3);
  let s = plantAt(createInitialState(), "moss", { x: 0, z: 0 });
  s = { ...s, moisture: s.moisture.map(() => 0), soilMoisture: 0,
    plants: s.plants.map(p => ({ ...p, health: 20 })) };
  const original = structuredClone(s);
  for (let day = 1; day <= 3; day++) {
    s = nextDay(s);
    assert.equal(s.plants[0].criticalDays, day);
    assert.equal(s.plants[0].dead, day === 3);
  }
  assert.equal(original.plants[0].criticalDays, 0);
  assert.equal(s.plants[0].health, 0);
  assert.equal(s.plants[0].diedOnDay, 4);
  assert.equal(conditionsFor(s, s.plants[0]).status, "Dead");
  assert.equal(s.plants[0].lastChange.health, -15);
});

test("recovery to the threshold or above breaks the low-health streak", () => {
  let s = plantAt(createInitialState(), "moss", { x: 0, z: 0 });
  s = setLamp({ ...s, moisture: s.moisture.map(() => 75), soilMoisture: 75,
    plants: s.plants.map(p => ({ ...p, health: 22, criticalDays: 2 })) }, { power: 0 });
  const next = nextDay(s);
  assert.equal(next.plants[0].health, 25);
  assert.equal(next.plants[0].criticalDays, 0);
  assert.equal(next.plants[0].dead, false);
});

test("dead plants persist, stop uptake and never revive from water or light; reset revives them", () => {
  let s = plantAt(createInitialState(), "fern", { x: 0.2, z: 0.1 });
  s = { ...s, plants: s.plants.map(p => ({ ...p, health: 0, dead: true,
    criticalDays: 3, diedOnDay: 2, growth: 60 })) };
  const watered = waterSoil(s, { x: 0.2, z: 0.1 });
  const next = nextDay(watered);
  assert.deepEqual(next.plants, s.plants);
  const withoutRoots = nextDay({ ...watered, plants: watered.plants.map(p => ({ ...p, position: { x: 100, z: 100 } })) });
  assert.deepEqual(next.moisture, withoutRoots.moisture);
  const reset = resetExperiment(next);
  assert.equal(reset.plants[0].dead, false);
  assert.equal(reset.plants[0].criticalDays, 0);
  assert.equal(reset.plants[0].diedOnDay, null);
  assert.equal(reset.plants[0].health, 70);
  assert.deepEqual(reset.plants[0].position, s.plants[0].position);
});
