export const SPECIES = Object.freeze({
  moss: {
    name: "Moss",
    water: [60, 85],
    light: [25, 55],
    waterLabel: "High",
    lightLabel: "Soft",
    color: "#78a643",
  },
  fern: {
    name: "Fern",
    water: [45, 70],
    light: [40, 75],
    waterLabel: "Medium",
    lightLabel: "Medium",
    color: "#43864c",
  },
  succulent: {
    name: "Succulent",
    water: [20, 45],
    light: [60, 85],
    waterLabel: "Low",
    lightLabel: "Bright",
    color: "#6aa995",
  },
  fittonia: {
    name: "Fittonia",
    water: [55, 80],
    light: [35, 65],
    waterLabel: "High",
    lightLabel: "Soft",
    color: "#557d47",
  },
});

export const SLOTS = Object.freeze([
  { name: "Front Left", x: -0.55, z: 0.43 },
  { name: "Front Right", x: 0.54, z: 0.32 },
  { name: "Back Center", x: -0.04, z: -0.52 },
]);
export { INITIAL_LAMP } from "./environment.js";
