import { SPECIES } from "../simulation/species.js";
import { suitability } from "../simulation/simulation.js";

// Present current local conditions, independently of yesterday's recorded outcome.
export function liveAdvice(species, moisture, light) {
  const s = SPECIES[species],
    issues = [];
  if (moisture < s.water[0])
    issues.push({
      key: "dry",
      cause: "Soil too dry",
      action: "Water this patch.",
      weight: (1 - suitability(moisture, s.water)) * 0.55,
    });
  else if (moisture > s.water[1])
    issues.push({
      key: "wet",
      cause: "Soil too wet",
      action: "Skip watering; let it dry.",
      weight: (1 - suitability(moisture, s.water)) * 0.55,
    });
  if (light < s.light[0])
    issues.push({
      key: "dim",
      cause: "Too little light",
      action: "Aim light here or raise power.",
      weight: (1 - suitability(light, s.light)) * 0.45,
    });
  else if (light > s.light[1])
    issues.push({
      key: "bright",
      cause: "Light too strong",
      action: "Aim light away or lower power.",
      weight: (1 - suitability(light, s.light)) * 0.45,
    });
  return issues.length
    ? issues.sort((a, b) => b.weight - a.weight)
    : [
        {
          key: "happy",
          cause: "Water & light feel right",
          action: "Try Next Day to observe.",
          weight: 0,
        },
      ];
}
export function dayRecord(change) {
  if (!change) return "";
  const delta = change.health;
  const health =
    delta > 0 ? `+${delta}` : delta < 0 ? `−${Math.abs(delta)}` : "unchanged";
  return `Last day · Day ${String(change.day).padStart(2, "0")}: Health ${health}`;
}
