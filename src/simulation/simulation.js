import { SPECIES, MAX_PLANTS } from "./species.js";
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
export const CRITICAL_HEALTH = 25;
export const DEATH_AFTER_DAYS = 3;
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
  const position = plant.position;
  const light = lightAt(state.lamp, position),
    moisture = moistureAt(state, position);
  const comfort = plant.dead ? 0 : comfortFor(plant.species, moisture, light);
  return {
    moisture,
    light,
    comfort,
    percent: Math.round(comfort * 100),
    status: plant.dead ? "Dead" : comfortStatus(comfort),
  };
}
export const createInitialState = () => ({
  day: 1,
  soilMoisture: 60,
  moisture: SOIL_POINTS.map(() => 60),
  lamp: { ...INITIAL_LAMP, target: { ...INITIAL_LAMP.target } },
  plants: [],
  nextPlantId: 1,
});
export const PLANT_RADIUS = SOIL_RADIUS - 0.27;
export const ROOT_SPACING = 0.34;
export function placementError(state, point, movingId = null) {
  if (
    !point ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.z) ||
    Math.hypot(point.x, point.z) > PLANT_RADIUS
  )
    return "Keep the roots inside the soil.";
  if (!movingId && state.plants.length >= MAX_PLANTS)
    return "Five plants for this little world.";
  if (
    state.plants.some(
      (p) =>
        p.id !== movingId &&
        Math.hypot(p.position.x - point.x, p.position.z - point.z) <
          ROOT_SPACING,
    )
  )
    return "Leave a little room between roots.";
  return null;
}
export function plantAt(state, species, point) {
  if (!SPECIES[species] || placementError(state, point)) return state;
  const id = `plant-${state.nextPlantId}`;
  return {
    ...state,
    nextPlantId: state.nextPlantId + 1,
    plants: [
      ...state.plants,
      {
        id,
        species,
        position: { x: point.x, z: point.z },
        health: 70,
        growth: 20,
        lastChange: null,
        criticalDays: 0,
        dead: false,
        diedOnDay: null,
      },
    ],
  };
}
export function movePlant(state, id, point) {
  const plant = state.plants.find((p) => p.id === id);
  if (!plant || placementError(state, point, id)) return state;
  if (plant.position.x === point.x && plant.position.z === point.z)
    return state;
  return {
    ...state,
    plants: state.plants.map((p) =>
      p.id === id ? { ...p, position: { x: point.x, z: point.z } } : p,
    ),
  };
}
export function removePlant(state, id) {
  if (!state.plants.some((p) => p.id === id)) return state;
  return { ...state, plants: state.plants.filter((p) => p.id !== id) };
}
export function environmentalReason(species, moisture, light) {
  const s = SPECIES[species];
  const waterDistance = distanceToRange(moisture, ...s.water);
  const lightDistance = distanceToRange(light, ...s.light);
  if (waterDistance === 0 && lightDistance === 0) return "happy conditions";
  if (
    (1 - suitability(moisture, s.water)) * 0.55 >=
    (1 - suitability(light, s.light)) * 0.45
  )
    return moisture < s.water[0] ? "soil too dry" : "soil too wet";
  return light < s.light[0] ? "light too low" : "light too strong";
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
    // Compact support: nothing beyond the shared visible footprint radius changes.
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
  // Extension translates the aimed patch along the arm, preserving manual aim.
  // A supplied target (including gesture cancellation) is an absolute override.
  if (Number.isFinite(patch.reach) && !patch.target) {
    const angle = (lamp.azimuth * Math.PI) / 180;
    const delta = lamp.reach - state.lamp.reach;
    lamp.target = clampToSoil(
      {
        x: lamp.target.x - Math.sin(angle) * delta,
        z: lamp.target.z - Math.cos(angle) * delta,
      },
      0.08,
    );
  }
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
  nextPlantId: state.nextPlantId,
  plants: state.plants.map((p) => ({
    ...p,
    position: { ...p.position },
    health: 70,
    growth: 20,
    lastChange: null,
    criticalDays: 0,
    dead: false,
    diedOnDay: null,
  })),
});
export function nextDay(state) {
  if (state.plants.length === 0) return state;
  const moisture = state.moisture.map((value, i) => {
    const point = SOIL_POINTS[i];
    const evaporation = Math.round(4 + lightAt(state.lamp, point) / 25);
    const uptake = state.plants.reduce((sum, p) => {
      if (p.dead) return sum;
      const d = Math.hypot(point.x - p.position.x, point.z - p.position.z);
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
    if (plant.dead) return plant;
    const { comfort, moisture, light } = conditionsFor(next, plant);
    const health = clamp(
      plant.health + Math.round(20 * (comfort - 0.75)),
      15,
      100,
    );
    const increment =
      health < 40 ? 0 : comfort >= 0.8 ? 8 : comfort >= 0.55 ? 3 : 0;
    const criticalDays =
      health < CRITICAL_HEALTH ? (plant.criticalDays || 0) + 1 : 0;
    const dead = criticalDays >= DEATH_AFTER_DAYS;
    const finalHealth = dead ? 0 : health;
    return {
      ...plant,
      health: finalHealth,
      criticalDays,
      dead,
      diedOnDay: dead ? next.day : null,
      growth: clamp(plant.growth + increment, 0, 100),
      lastChange: {
        day: next.day,
        health: finalHealth - plant.health,
        growth: Math.min(100 - plant.growth, increment),
        reason: environmentalReason(plant.species, moisture, light),
      },
    };
  });
  return next;
}
