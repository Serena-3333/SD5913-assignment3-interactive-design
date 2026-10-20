import { test } from "node:test";
import assert from "node:assert/strict";
import { SPECIES, SLOTS } from "../src/simulation/species.js";
import {
  clamp,
  distanceToRange,
  suitability,
  lightAt,
  comfortFor,
  comfortStatus,
  conditionsFor,
  createInitialState,
  plantAt,
  movePlant,
  waterSoil,
  setLamp,
  nextDay,
  resetExperiment,
} from "../src/simulation/simulation.js";

const twoPlants = () =>
  plantAt(plantAt(createInitialState(), "moss", 0), "fern", 2);

test("light uses world XZ distance and clamps to 20–85", () => {
  assert.equal(lightAt({ x: 0, z: 0 }, { x: 0, z: 0 }), 85);
  assert.equal(lightAt({ x: 0, z: 0 }, { x: 3, z: 4 }), 20);
  assert.equal(lightAt({ x: 1, z: 2 }, { x: 2, z: 2 }), 63);
  assert.equal(lightAt({ x: 0, z: 0 }, { x: 1, z: 1 }), 85 - 22 * Math.sqrt(2));
});
test("ranges and weighted comfort include boundaries", () => {
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
test("water adds 18, caps at 100, and does not advance plants", () => {
  const initial = twoPlants();
  assert.equal(waterSoil(initial).soilMoisture, 78);
  assert.equal(waterSoil({ ...initial, soilMoisture: 94 }).soilMoisture, 100);
  assert.equal(waterSoil({ ...initial, soilMoisture: 100 }).soilMoisture, 100);
  assert.deepEqual(waterSoil(initial).plants, initial.plants);
  assert.equal(initial.soilMoisture, 60);
});
test("daily moisture subtracts rounded evaporation plus two per plant", () => {
  const state = twoPlants();
  const average =
    state.plants.reduce(
      (s, p) => s + lightAt(state.lampPosition, SLOTS[p.slot]),
      0,
    ) / 2;
  const next = nextDay(state);
  assert.equal(next.soilMoisture, 60 - Math.round(4 + average / 25) - 4);
  assert.equal(next.day, 2);
  assert.equal(state.day, 1);
  assert.equal(nextDay({ ...state, soilMoisture: 1 }).soilMoisture, 0);
  assert.equal(nextDay(createInitialState()).day, 1);
});
test("health and growth use comfort after drying, with bounds and poor-health inhibition", () => {
  const state = twoPlants();
  const next = nextDay(state);
  for (const plant of next.plants) {
    const comfort = conditionsFor(next, plant).comfort;
    assert.equal(
      plant.health,
      clamp(70 + Math.round(20 * (comfort - 0.75)), 15, 100),
    );
    assert.equal(
      plant.growth,
      20 + (comfort >= 0.8 ? 8 : comfort >= 0.55 ? 3 : 0),
    );
  }
  const unhealthy = nextDay({
    ...state,
    plants: state.plants.map((p) => ({ ...p, health: 15 })),
  });
  assert.ok(unhealthy.plants.every((p) => p.growth === 20 && p.health >= 15));
  const capped = nextDay({
    ...state,
    plants: state.plants.map((p) => ({ ...p, health: 100, growth: 100 })),
  });
  assert.ok(capped.plants.every((p) => p.health <= 100 && p.growth <= 100));
});
test("reset preserves species and slots while restoring every initial parameter", () => {
  const changed = setLamp(nextDay(waterSoil(twoPlants())), -1.2);
  const reset = resetExperiment(changed);
  assert.equal(reset.day, 1);
  assert.equal(reset.soilMoisture, 60);
  assert.deepEqual(reset.lampPosition, createInitialState().lampPosition);
  assert.deepEqual(
    reset.plants.map((p) => [p.species, p.slot]),
    changed.plants.map((p) => [p.species, p.slot]),
  );
  assert.ok(reset.plants.every((p) => p.health === 70 && p.growth === 20));
  assert.equal(createInitialState().plants.length, 0);
});
test("planting enforces slots, uniqueness, and capacity; moving swaps without changing health/growth", () => {
  const state = twoPlants();
  assert.equal(plantAt(state, "moss", 1), state);
  assert.equal(plantAt(state, "succulent", 0), state);
  assert.equal(plantAt(state, "unknown", 1), state);
  assert.equal(plantAt(state, "succulent", 4), state);
  const full = plantAt(state, "succulent", 1);
  assert.equal(plantAt(full, "fittonia", 0), full);
  const swapped = movePlant(state, "moss", 2);
  assert.equal(swapped.plants[0].slot, 2);
  assert.equal(swapped.plants[1].slot, 0);
  assert.ok(swapped.plants.every((p) => p.health === 70 && p.growth === 20));
  assert.equal(state.plants[0].slot, 0);
  assert.equal(movePlant(state, "moss", -1), state);
});
test("lamp changes comfort but never health/growth, remains on fixed world track", () => {
  const state = twoPlants();
  const moved = setLamp(state, -1.8);
  assert.notEqual(
    conditionsFor(state, state.plants[1]).light,
    conditionsFor(moved, moved.plants[1]).light,
  );
  assert.deepEqual(moved.plants, state.plants);
  assert.equal(setLamp(state, 99).lampPosition.x, 1.8);
  assert.equal(moved.lampPosition.z, -1.8);
  assert.equal(setLamp(state, NaN), state);
});
test("species differ in the same environment and repeated simulations are deterministic", () => {
  assert.notEqual(comfortFor("moss", 78, 45), comfortFor("succulent", 78, 45));
  assert.deepEqual(nextDay(twoPlants()), nextDay(twoPlants()));
  assert.equal(Object.keys(SPECIES).length, 4);
});
