import { SPECIES, SLOTS, INITIAL_LAMP } from "./species.js";

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const distanceToRange = (value, min, max) =>
  Math.max(min - value, 0, value - max);
export const suitability = (value, range) =>
  clamp(1 - distanceToRange(value, ...range) / 25, 0, 1);
export const lightAt = (lamp, position) =>
  clamp(85 - 22 * Math.hypot(lamp.x - position.x, lamp.z - position.z), 20, 85);
export const comfortFor = (species, moisture, light) =>
  suitability(moisture, SPECIES[species].water) * 0.55 +
  suitability(light, SPECIES[species].light) * 0.45;
export const comfortStatus = (comfort) =>
  comfort >= 0.8
    ? "Comfortable"
    : comfort >= 0.55
      ? "Needs Adjustment"
      : "Stressed";
export const conditionsFor = (state, plant) => {
  const light = lightAt(state.lampPosition, SLOTS[plant.slot]);
  const comfort = comfortFor(plant.species, state.soilMoisture, light);
  return {
    light,
    comfort,
    percent: Math.round(comfort * 100),
    status: comfortStatus(comfort),
  };
};
export const createInitialState = () => ({
  day: 1,
  soilMoisture: 60,
  lampPosition: { ...INITIAL_LAMP },
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

export const waterSoil = (state) => ({
  ...state,
  soilMoisture: Math.min(100, state.soilMoisture + 18),
});
export const setLamp = (state, x) =>
  Number.isFinite(x)
    ? { ...state, lampPosition: { x: clamp(x, -1.8, 1.8), z: INITIAL_LAMP.z } }
    : state;
export const resetExperiment = (state) => ({
  ...createInitialState(),
  plants: state.plants.map((p) => ({ ...p, health: 70, growth: 20 })),
});

export function nextDay(state) {
  if (state.plants.length < 2) return state;
  const averageLight =
    state.plants.reduce(
      (sum, p) => sum + lightAt(state.lampPosition, SLOTS[p.slot]),
      0,
    ) / state.plants.length;
  const evaporation = Math.round(4 + averageLight / 25);
  const soilMoisture = clamp(
    state.soilMoisture - evaporation - state.plants.length * 2,
    0,
    100,
  );
  const next = { ...state, day: state.day + 1, soilMoisture };
  next.plants = state.plants.map((plant) => {
    const { comfort } = conditionsFor(next, plant);
    const health = clamp(
      plant.health + Math.round(20 * (comfort - 0.75)),
      15,
      100,
    );
    const growthChange =
      health < 40 ? 0 : comfort >= 0.8 ? 8 : comfort >= 0.55 ? 3 : 0;
    return {
      ...plant,
      health,
      growth: clamp(plant.growth + growthChange, 0, 100),
    };
  });
  return next;
}
