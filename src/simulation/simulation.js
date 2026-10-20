import { SPECIES, SLOTS } from "./species.js";
import {
  SOIL_POINTS,
  SOIL_RADIUS,
  WATER_RADIUS,
  WATER_AMOUNT,
  INITIAL_LAMP,
  AMBIENT_LIGHT,
  surfaceHeight,
  lampFrame,
  clampToSoil,
} from "./environment.js";
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const distanceToRange = (value, min, max) =>
  Math.max(min - value, 0, value - max);
export const suitability = (value, range) =>
  clamp(1 - distanceToRange(value, ...range) / 25, 0, 1);
export const comfortFor = (species, moisture, light) =>
  suitability(moisture, SPECIES[species].water) * 0.55 +
  suitability(light, SPECIES[species].light) * 0.45;
export const comfortStatus = (comfort) =>
  comfort >= 0.8
    ? "Comfortable"
    : comfort >= 0.55
      ? "Needs Adjustment"
      : "Stressed";
export const averageMoisture = (moisture) =>
  moisture.reduce((a, b) => a + b, 0) / moisture.length;
export function moistureAt(state, point) {
  let weighted = 0,
    total = 0;
  for (let i = 0; i < SOIL_POINTS.length; i++) {
    const d = Math.hypot(
      point.x - SOIL_POINTS[i].x,
      point.z - SOIL_POINTS[i].z,
    );
    if (d < 1e-8) return state.moisture[i];
    if (d < 0.245) {
      const weight = (1 - d / 0.245) ** 2;
      weighted += state.moisture[i] * weight;
      total += weight;
    }
  }
  return total ? weighted / total : state.soilMoisture;
}
export function lightAt(lamp, point) {
  if (lamp.power === 0) return AMBIENT_LIGHT;
  const { emitter, direction, halfAngle } = lampFrame(lamp);
  const v = {
    x: point.x - emitter.x,
    y: surfaceHeight(point.x, point.z) - emitter.y,
    z: point.z - emitter.z,
  };
  const distance = Math.hypot(v.x, v.y, v.z);
  const cosine =
    (v.x * direction.x + v.y * direction.y + v.z * direction.z) / distance;
  const outer = Math.cos(halfAngle),
    inner = Math.cos(halfAngle * 0.7);
  const t = clamp((cosine - outer) / (inner - outer), 0, 1);
  const cone = t * t * (3 - 2 * t);
  const falloff = clamp(1.12 - 0.075 * distance, 0.6, 1);
  return clamp(
    AMBIENT_LIGHT + 65 * (lamp.power / 100) * cone * falloff,
    AMBIENT_LIGHT,
    85,
  );
}
export function conditionsFor(state, plant) {
  const position = SLOTS[plant.slot];
  const light = lightAt(state.lamp, position),
    moisture = moistureAt(state, position);
  const comfort = comfortFor(plant.species, moisture, light);
  return {
    moisture,
    light,
    comfort,
    percent: Math.round(comfort * 100),
    status: comfortStatus(comfort),
  };
}
export const createInitialState = () => ({
  day: 1,
  soilMoisture: 60,
  moisture: SOIL_POINTS.map(() => 60),
  lamp: { ...INITIAL_LAMP, target: { ...INITIAL_LAMP.target } },
  plants: [],
});
export function plantAt(state, species, slot) {
  if (
    !SPECIES[species] ||
    !SLOTS[slot] ||
    state.plants.length >= 3 ||
    state.plants.some((p) => p.species === species || p.slot === slot)
  )
    return state;
  return {
    ...state,
    plants: [...state.plants, { species, slot, health: 70, growth: 20 }],
  };
}
export function movePlant(state, species, slot) {
  const plant = state.plants.find((p) => p.species === species);
  if (!plant || !SLOTS[slot] || plant.slot === slot) return state;
  const other = state.plants.find((p) => p.slot === slot);
  return {
    ...state,
    plants: state.plants.map((p) =>
      p === plant
        ? { ...p, slot }
        : p === other
          ? { ...p, slot: plant.slot }
          : p,
    ),
  };
}
export function waterSoil(state, point) {
  if (
    !point ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.z) ||
    Math.hypot(point.x, point.z) > SOIL_RADIUS
  )
    return state;
  const moisture = state.moisture.map((value, i) => {
    const d = Math.hypot(
      point.x - SOIL_POINTS[i].x,
      point.z - SOIL_POINTS[i].z,
    );
    // Compact support: nothing beyond the visible 0.55-unit footprint changes.
    const weight = d < WATER_RADIUS ? (1 - (d / WATER_RADIUS) ** 2) ** 0.65 : 0;
    return clamp(value + WATER_AMOUNT * weight, 0, 100);
  });
  return { ...state, moisture, soilMoisture: averageMoisture(moisture) };
}
export function setLamp(state, patch) {
  if (!patch || typeof patch !== "object") return state;
  const lamp = { ...state.lamp, target: { ...state.lamp.target } };
  for (const [key, min, max] of [
    ["azimuth", -180, 180],
    ["reach", 0, 1.45],
    ["radius", 0.3, 1.15],
    ["power", 0, 100],
  ])
    if (Number.isFinite(patch[key])) lamp[key] = clamp(patch[key], min, max);
  if (
    patch.target &&
    Number.isFinite(patch.target.x) &&
    Number.isFinite(patch.target.z)
  )
    lamp.target = clampToSoil(patch.target, 0.08);
  return { ...state, lamp };
}
export const resetExperiment = (state) => ({
  ...createInitialState(),
  plants: state.plants.map((p) => ({ ...p, health: 70, growth: 20 })),
});
export function nextDay(state) {
  if (state.plants.length < 2) return state;
  const moisture = state.moisture.map((value, i) => {
    const point = SOIL_POINTS[i];
    const evaporation = Math.round(4 + lightAt(state.lamp, point) / 25);
    const uptake = state.plants.reduce((sum, p) => {
      const slot = SLOTS[p.slot],
        d = Math.hypot(point.x - slot.x, point.z - slot.z);
      return sum + (d < 0.5 ? 2 * (1 - d / 0.5) : 0);
    }, 0);
    return clamp(value - evaporation - uptake, 0, 100);
  });
  const next = {
    ...state,
    day: state.day + 1,
    moisture,
    soilMoisture: averageMoisture(moisture),
  };
  next.plants = state.plants.map((plant) => {
    const { comfort } = conditionsFor(next, plant);
    const health = clamp(
      plant.health + Math.round(20 * (comfort - 0.75)),
      15,
      100,
    );
    const increment =
      health < 40 ? 0 : comfort >= 0.8 ? 8 : comfort >= 0.55 ? 3 : 0;
    return {
      ...plant,
      health,
      growth: clamp(plant.growth + increment, 0, 100),
    };
  });
  return next;
}
