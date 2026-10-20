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
  moistureAt,
} from "./simulation/simulation.js";
const ui = createUI(document.querySelector("#app"));
let state = createInitialState(),
  busy = false,
  dayTimer,
  world,
  interactions;
const controller = new AbortController();
const getState = () => state,
  isBusy = () => busy;
function update(next) {
  state = next;
  world.sync();
  ui.render(state, busy);
}
function onPlace(species, slot) {
  if (busy) return;
  const existing = state.plants.find((p) => p.species === species);
  if (existing) {
    update(movePlant(state, species, slot));
    return;
  }
  const next = plantAt(state, species, slot);
  if (next === state) {
    ui.toast(
      state.plants.length >= 3
        ? "Room for three. Clear the jar to try a new mix."
        : "That spot is already taken.",
    );
    return;
  }
  update(next);
  if (next.plants.length === 3) ui.setCollectionOpen(false);
}
function onLamp(patch) {
  if (!busy) update(setLamp(state, patch));
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
  update(next);
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
  listen("#collection-close", "click", () => ui.setCollectionOpen(false));
  listen("#collection-open", "click", () => ui.setCollectionOpen(true));
  listen("#camera-reset", "click", () => world.resetCamera());
  listen("#next-day", "click", () => {
    if (busy || state.plants.length < 2) return;
    interactions.cancel();
    busy = true;
    state = nextDay(state);
    world.sync();
    ui.render(state, busy);
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
        );
        ui.setCollectionOpen(true);
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
