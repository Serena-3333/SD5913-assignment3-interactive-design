import "./styles/main.css";
import { createUI } from "./ui/uiController.js";
import { createScene } from "./scene/createScene.js";
import { createInteractions } from "./interactions/plantDrag.js";
import {
  createInitialState,
  plantAt,
  movePlant,
  waterSoil,
  setLamp,
  nextDay,
  resetExperiment,
  conditionsFor,
  moistureAt,
} from "./simulation/simulation.js";
import { SPECIES, SLOTS } from "./simulation/species.js";
import { dailyObservation, movementObservation } from "./ui/journal.js";
const ui = createUI(document.querySelector("#app"));
let state = createInitialState(),
  busy = false,
  dayTimer,
  world,
  interactions;
const controller = new AbortController();
const getState = () => state,
  isBusy = () => busy;
function update(next, message) {
  state = next;
  world.sync();
  ui.render(state, busy);
  if (message) ui.journal(state, message);
}
function onPlace(species, slot) {
  if (busy) return;
  const existing = state.plants.find((p) => p.species === species),
    before = state;
  if (existing) {
    const swapped = state.plants.some((p) => p.slot === slot && p !== existing),
      next = movePlant(state, species, slot);
    if (next !== state)
      update(next, movementObservation(before, next, species, swapped));
  } else {
    const next = plantAt(state, species, slot);
    if (next === state) {
      ui.toast(
        state.plants.length >= 3
          ? "Room for three. Clear the jar to try a new mix."
          : "That spot is already taken.",
      );
      return;
    }
    update(
      next,
      `${SPECIES[species].name} is settling in. Find the water and light it likes.`,
    );
  }
}
function onLamp(patch, commit = true) {
  if (busy) return;
  update(setLamp(state, patch));
  if (commit)
    ui.journal(
      state,
      "A new angle, a different little pool of light. Watch each plant’s comfort.",
    );
}
function onWater(point) {
  if (busy || world.wateringCan.pouring) return;
  const next = waterSoil(state, point);
  if (next === state) return;
  const before = moistureAt(state, point),
    after = moistureAt(next, point);
  if (after - before < 0.05) {
    ui.toast("This patch is fully watered.");
    return;
  }
  update(
    next,
    `A small shower in one patch. Moisture here: ${Math.round(before)}% → ${Math.round(after)}%.`,
  );
  world.pour(point);
}
try {
  world = createScene(ui.$("#scene-container"), getState);
  ui.thumbnails(world.thumbnails);
  interactions = createInteractions(world, ui, {
    getState,
    isBusy,
    onPlace,
    onLamp,
    onWater,
  });
  ui.$("#scene-loading").hidden = true;
  ui.render(state, busy);
  const listen = (id, type, fn) =>
    ui.$(id).addEventListener(type, fn, { signal: controller.signal });
  listen("#water-button", "click", () => interactions.setTool("water"));
  listen("#lamp-button", "click", () => interactions.setTool("lamp"));
  listen("#tool-close", "click", () => interactions.cancel());
  for (const input of document.querySelectorAll("[data-lamp]")) {
    input.addEventListener(
      "input",
      () => onLamp({ [input.dataset.lamp]: Number(input.value) }, false),
      { signal: controller.signal },
    );
    input.addEventListener("change", () => onLamp({}, true), {
      signal: controller.signal,
    });
  }
  listen("#camera-reset", "click", () => world.resetCamera());
  listen("#next-day", "click", () => {
    if (busy || state.plants.length < 2) return;
    interactions.cancel();
    busy = true;
    state = nextDay(state);
    world.sync();
    ui.render(state, busy);
    ui.journal(state, dailyObservation(state));
    dayTimer = setTimeout(() => {
      busy = false;
      ui.render(state, busy);
    }, 800);
  });
  for (const kind of ["reset", "clear"])
    listen("#" + kind + "-button", "click", () => {
      if (busy) return;
      interactions.cancel();
      ui.confirm(kind, () => {
        update(
          kind === "reset" ? resetExperiment(state) : createInitialState(),
          kind === "reset"
            ? "A fresh start, with familiar little plants."
            : "Choose a plant. Find its happy place.",
        );
        world.resetCamera();
      });
    });
  world.renderer.domElement.addEventListener(
    "webglcontextlost",
    (event) => {
      event.preventDefault();
      ui.$("#scene-loading").hidden = false;
      ui.$("#scene-loading").textContent =
        "The 3D view paused. Reload to start again.";
    },
    { signal: controller.signal },
  );
} catch (error) {
  console.error("Terrarium could not start:", error);
  ui.$("#scene-loading").textContent =
    "The 3D view needs WebGL. Please enable hardware acceleration and reload.";
}
function dispose() {
  clearTimeout(dayTimer);
  controller.abort();
  interactions?.dispose();
  world?.dispose();
  ui.dispose();
}
window.addEventListener("pagehide", dispose, { once: true });
if (import.meta.hot) import.meta.hot.dispose(dispose);
// Read-only application state for automated acceptance checks.
export const getSnapshot = () => structuredClone(state);
export function inspectScene() {
  if (import.meta.env.DEV) return world;
}
