import "./styles/main.css";
import "./styles/desk.css";
import "./styles/background.css";
import "./styles/uiRefinements.css";
import { createUI } from "./ui/uiController.js";
import { createScene } from "./scene/createScene.js";
import { createInteractions } from "./interactions/plantDrag.js";
import {
  createInitialState,
  plantAt,
  movePlant,
  removePlant,
  placementError,
  waterSoil,
  setLamp,
  nextDay,
  resetExperiment,
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
function onPlace(species, point, movingId = null) {
  if (busy) return;
  const next = movingId
    ? movePlant(state, movingId, point)
    : plantAt(state, species, point);
  if (next === state) {
    const error = placementError(state, point, movingId);
    if (error) ui.toast(error);
    return;
  }
  update(next);
  if (!movingId && next.plants.length === 5) ui.scheduleCollectionClose();
}
function onLamp(patch) {
  if (!busy) update(setLamp(state, patch));
}

function onWater(point) {
  if (busy || world.wateringCan.pouring) return;
  const next = waterSoil(state, point);
  if (next === state) return;
  if (!next.moisture.some((value, i) => value > state.moisture[i] + 0.001)) {
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
  listen("#plant-conditions", "click", (event) => {
    const button = event.target.closest("[data-remove]");
    if (!button || busy) return;
    interactions.cancel();
    update(removePlant(state, button.dataset.remove));
  });
  listen("#camera-reset", "click", () => world.resetCamera());
  listen("#next-day", "click", () => {
    if (busy || state.plants.length === 0) return;
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
