import { conditionsFor } from '../simulation/simulation.js';
import { SPECIES } from '../simulation/species.js';

export function dailyObservation(state, previous) {
  const driest = [...state.plants].sort((a,b)=>conditionsFor(state,a).comfort-conditionsFor(state,b).comfort)[0];
  const condition = conditionsFor(state,driest);
  const name = SPECIES[driest.species].name;
  const species = SPECIES[driest.species];
  const waterMessage = `Soil moisture fell by ${previous.soilMoisture-state.soilMoisture} points to ${state.soilMoisture}%.`;
  let observation;
  if (state.soilMoisture < species.water[0]) observation = `${name} needs more moisture. Try a little water and watch its comfort change.`;
  else if (state.soilMoisture > species.water[1]) observation = `${name} prefers drier soil. Let time pass before watering again.`;
  else if (condition.light < species.light[0]) observation = `${name} could use more light. Bring the lamp closer or try another spot.`;
  else if (condition.light > species.light[1]) observation = `${name} prefers softer light. Try moving it further from the lamp.`;
  else observation = `All your plants are comfortable. Their new growth is a response to the world you made.`;
  return `${waterMessage} ${observation}`;
}

export function movementObservation(before, after, species, swapped) {
  const previous = before.plants.find(p=>p.species===species);
  const current = after.plants.find(p=>p.species===species);
  const delta = conditionsFor(after,current).light-conditionsFor(before,previous).light;
  const light = Math.abs(delta)<0.05 ? 'receives the same amount of light' : delta>0 ? 'receives more light' : 'receives less light';
  return `${SPECIES[species].name} ${light} after being ${swapped?'swapped':'moved'}. Health and growth will respond after Next Day.`;
}
