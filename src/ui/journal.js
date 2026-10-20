import { conditionsFor } from "../simulation/simulation.js";
import { SPECIES } from "../simulation/species.js";
export function dailyObservation(state) {
  const p = [...state.plants].sort(
      (a, b) =>
        conditionsFor(state, a).comfort - conditionsFor(state, b).comfort,
    )[0],
    c = conditionsFor(state, p),
    s = SPECIES[p.species];
  if (c.moisture < s.water[0])
    return `${s.name}’s patch is a little dry. A small shower here could help.`;
  if (c.moisture > s.water[1])
    return `${s.name} prefers a drier patch. Give it a little time.`;
  if (c.light < s.light[0])
    return `${s.name} wants a brighter spot. Try aiming the lamp closer.`;
  if (c.light > s.light[1])
    return `${s.name} prefers softer light. Try a gentler beam.`;
  return "Everyone has found a happy place. A little growth, one day at a time.";
}
export function movementObservation(before, after, species, swapped) {
  const p = after.plants.find((p) => p.species === species),
    c = conditionsFor(after, p);
  return `${SPECIES[species].name} ${swapped ? "swapped spots" : "found a new spot"}. Water ${Math.round(c.moisture)}%, light ${Math.round(c.light)}.`;
}
