import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createTerrarium } from "../src/scene/terrarium.js";
import { soilDryness } from "../src/simulation/environment.js";
import { createInitialState, waterSoil } from "../src/simulation/simulation.js";

test("soil visibly darkens locally after watering, cracks below 20, and closes when rewatered", () => {
  assert.equal(soilDryness(20), 0);
  assert.equal(soilDryness(10), 0.5);
  assert.equal(soilDryness(0), 1);
  const jar = createTerrarium(new THREE.Scene());
  const state = createInitialState();
  jar.updateSoil(state);
  const before = [...jar.soilSurface.geometry.attributes.color.array];
  assert.equal(jar.cracks.mesh.visible, false);
  const watered = waterSoil(state, { x: 0.4, z: 0.3 });
  jar.updateSoil(watered);
  const after = [...jar.soilSurface.geometry.attributes.color.array];
  assert.ok(after.some((v, i) => v < before[i] - 0.01));
  assert.ok(after.some((v, i) => v === before[i]), "Watering leaves distant soil unchanged");
  jar.updateSoil({ ...state, moisture: state.moisture.map(() => 8), soilMoisture: 8 });
  assert.equal(jar.cracks.mesh.visible, true);
  assert.ok([...jar.cracks.mesh.geometry.attributes.position.array].every(Number.isFinite));
  assert.ok([...jar.cracks.mesh.geometry.attributes.visibility.array].some(v => v > 0.5));
  jar.updateSoil(state);
  assert.equal(jar.cracks.mesh.visible, false);
});
