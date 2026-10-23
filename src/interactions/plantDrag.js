import * as THREE from "three";
import { SPECIES } from "../simulation/species.js";
import {
  SOIL_RADIUS,
  surfaceHeight,
  clampToSoil,
} from "../simulation/environment.js";
import {
  conditionsFor,
  placementError,
  PLANT_RADIUS,
} from "../simulation/simulation.js";

export function createInteractions(
  world,
  ui,
  { getState, isBusy, onPlace, onLamp, onWater },
) {
  const canvas = world.renderer.domElement,
    raycaster = new THREE.Raycaster();
  const controller = new AbortController(),
    { signal } = controller;
  let selected = null,
    tool = null,
    drag = null,
    keyboardPoint = { x: 0, z: 0 },
    hoverFrame = 0,
    hoverEvent = null;
  const lightHandle = ui.$("#light-handle");
  const cursor = ui.$("#drag-cursor");
  const conditionsList = ui.$("#plant-conditions");
  canvas.tabIndex = 0;
  canvas.setAttribute(
    "aria-label",
    "Terrarium. Right-drag to rotate. Select a plant or tool, use arrow keys to aim and Enter to apply. Escape cancels.",
  );
  canvas.addEventListener("contextmenu", (e) => e.preventDefault(), { signal });
  function ray(e) {
    const r = canvas.getBoundingClientRect();
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - r.left) / r.width) * 2 - 1,
        (-(e.clientY - r.top) / r.height) * 2 + 1,
      ),
      world.camera,
    );
    return (
      e.clientX >= r.left &&
      e.clientX <= r.right &&
      e.clientY >= r.top &&
      e.clientY <= r.bottom
    );
  }
  function soilPoint(e) {
    if (!ray(e)) return null;
    const hit = raycaster.intersectObject(world.terrarium.soilSurface)[0];
    return hit && Math.hypot(hit.point.x, hit.point.z) < SOIL_RADIUS - 0.005
      ? { x: hit.point.x, z: hit.point.z }
      : null;
  }
  function pick(e) {
    if (!ray(e)) return null;
    const hits = raycaster.intersectObjects(
      [
        ...world.plants.values(),
        world.lamp.group,
        world.wateringCan.group,
        world.lamp.aimHandle,
      ],
      true,
    );
    for (const hit of hits) {
      let o = hit.object;
      while (o) {
        if (o.userData.plantId)
          return { kind: "plant", id: o.userData.plantId };
        if (o.userData.kind) return { kind: o.userData.kind };
        o = o.parent;
      }
    }
    return null;
  }
  const redraw = () => ui.render(getState(), isBusy());
  function select(species) {
    selected = species;
    ui.select(species);
    redraw();
  }
  function setTool(value, toggle = true) {
    if (drag) return;
    tool = toggle && tool === value ? null : value;
    select(null);
    ui.tool(tool);
    world.setTool(tool);
    ui.hidePreview();
    world.highlight(null);
    if (tool) {
      keyboardPoint =
        tool === "lamp" ? { ...getState().lamp.target } : { x: 0, z: 0 };
      canvas.focus({ preventScroll: true });
    }
    redraw();
  }
  function clearHover() {
    cancelAnimationFrame(hoverFrame);
    hoverFrame = 0;
    world.setHover(null);
    ui.hover(null);
    linkPlant(null);
  }
  function linkPlant(id, reveal = false) {
    if (drag || selected || isBusy()) id = null;
    world.setPlantHover(id);
    ui.highlightPlant(id, reveal);
  }
  function toolAnchor(kind) {
    const anchor = new THREE.Vector3();
    if (kind === "water") {
      world.wateringCan.group.getWorldPosition(anchor);
      anchor.y += 0.35;
    } else if (kind === "lamp") {
      world.lamp.head.getWorldPosition(anchor);
    } else {
      world.lamp.aimHandle.getWorldPosition(anchor);
    }
    const p = world.project(anchor);
    return { x: p.x, y: p.y - 20 };
  }
  function showHover(e) {
    hoverFrame = 0;
    if (drag || isBusy() || !world.controls.enabled) return;
    if (e.buttons & 2) {
      clearHover();
      return;
    }
    if (lightHandle.contains(e.target)) {
      linkPlant(null);
      world.setHover("aim");
      ui.hover("Drag to move the light spot", toolAnchor("aim"));
      return;
    }
    if (e.target !== canvas) {
      const row = e.target.closest?.("[data-condition]");
      if (row) {
        world.setHover(null);
        ui.hover(null);
        linkPlant(row.dataset.condition);
        return;
      }
      clearHover();
      return;
    }
    let kind = null;
    let plantId = null;
    if (selected) canvas.style.cursor = "crosshair";
    else {
      const hit = pick(e),
        point = soilPoint(e);
      if (hit?.kind === "plant") plantId = hit.id;
      kind =
        hit?.kind === "water" || hit?.kind === "lamp"
          ? hit.kind
          : hit?.kind === "aim" ||
              (!hit &&
                point &&
                getState().lamp.power > 0 &&
                world.lamp.containsPoint(point))
            ? "aim"
            : null;
      if (tool === "water" && point) kind = null;
      canvas.style.cursor =
        kind === "water" || kind === "aim" || hit?.kind === "plant"
          ? "grab"
          : kind === "lamp"
            ? "pointer"
            : tool
              ? "crosshair"
              : "default";
    }
    world.setHover(kind);
    linkPlant(plantId, true);
    ui.hover(
      kind === "water"
        ? "Drag the can onto a soil patch"
        : kind === "lamp"
          ? "Drag the light spot to aim. Click for controls."
          : kind === "aim"
            ? "Drag the light spot to aim"
            : null,
      kind ? toolAnchor(kind) : null,
    );
  }
  function queueHover(e) {
    hoverEvent = e;
    if (!hoverFrame)
      hoverFrame = requestAnimationFrame(() => showHover(hoverEvent));
  }
  for (const event of ["pointerover", "focusin"])
    conditionsList.addEventListener(event, (e) => {
      const row = e.target.closest("[data-condition]");
      if (row) linkPlant(row.dataset.condition);
    }, { signal });
  for (const event of ["pointerout", "focusout"])
    conditionsList.addEventListener(event, (e) => {
      const row = e.target.closest("[data-condition]");
      if (row && !row.contains(e.relatedTarget)) linkPlant(null);
    }, { signal });
  canvas.addEventListener(
    "pointerleave",
    () => {
      if (!drag) clearHover();
    },
    { signal },
  );
  lightHandle.addEventListener(
    "pointerleave",
    () => {
      if (!drag) clearHover();
    },
    { signal },
  );
  world.controls.addEventListener("start", clearHover);
  function clear() {
    clearHover();
    world.clearPreview();
    ui.hidePreview();
    cursor.hidden = true;
    world.controls.enabled = true;
    lightHandle.classList.remove("dragging");
    canvas.style.cursor = "default";
  }
  function cancel(notify = false) {
    const had = drag || selected || tool;
    if (drag?.originalLamp) onLamp(drag.originalLamp);
    drag = null;
    clear();
    tool = null;
    ui.tool(null);
    world.setTool(null);
    select(null);
    if (notify && had) ui.toast("Cancelled. Your garden is unchanged.");
  }
  function begin(e, kind, extra = {}) {
    drag = {
      kind,
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      active: false,
      ...extra,
    };
    clearHover();
    world.controls.enabled = false;
    lightHandle.classList.add("dragging");
    canvas.style.cursor = "grabbing";
  }
  function plantPreview(species, point, movingId = null) {
    const error = placementError(getState(), point, movingId);
    const plant = getState().plants.find((p) => p.id === movingId);
    world.highlight(point, !error);
    world.preview(species, point, plant?.health, plant?.growth, plant?.dead);
    if (point) {
      const c = conditionsFor(getState(), { species, position: point });
      ui.preview(
        species,
        point,
        c.percent,
        world.project(
          new THREE.Vector3(
            point.x,
            surfaceHeight(point.x, point.z) + 0.3,
            point.z,
          ),
        ),
        error || (plant?.dead ? "Dried out" : null),
      );
    } else ui.hidePreview();
    return error;
  }
  function showWater(point) {
    world.waterPreview(point);
    if (point)
      ui.waterPreview(
        true,
        world.project(
          new THREE.Vector3(
            point.x,
            surfaceHeight(point.x, point.z) + 0.15,
            point.z,
          ),
        ),
      );
    else ui.hidePreview();
  }
  for (const card of document.querySelectorAll("[data-species]")) {
    card.addEventListener(
      "pointerdown",
      (e) => {
        if (e.button !== 0 || isBusy() || card.disabled) return;
        e.preventDefault();
        setTool(null, false);
        select(card.dataset.species);
        begin(e, "plant", { species: card.dataset.species });
      },
      { signal },
    );
    card.addEventListener(
      "click",
      (e) => {
        if (e.detail === 0 && !isBusy() && !card.disabled) {
          setTool(null, false);
          select(card.dataset.species);
          keyboardPoint = { x: 0, z: 0 };
          canvas.focus({ preventScroll: true });
          plantPreview(selected, keyboardPoint);
          if (matchMedia("(max-width:680px)").matches)
            ui.setCollectionOpen(false, false);
        }
      },
      { signal },
    );
  }
  function onSceneDown(e) {
    if (e.button !== 0) return;
    if (isBusy()) {
      e.stopImmediatePropagation();
      return;
    }
    const point = soilPoint(e),
      hit = e.currentTarget === lightHandle ? { kind: "aim" } : pick(e);
    const own = () => {
      e.stopImmediatePropagation();
      e.preventDefault();
    };
    // A selected tool/species owns the soil, including points over existing leaves.
    if (selected) {
      own();
      const species = selected;
      const error = placementError(getState(), point);
      if (error) {
        ui.toast(error);
        return;
      }
      cancel();
      onPlace(species, point);
      return;
    }
    if (tool === "water" && point) {
      own();
      begin(e, "water", { fromCan: false });
      showWater(point);
      return;
    }
    if (
      tool === "lamp" &&
      point &&
      hit?.kind !== "aim" &&
      hit?.kind !== "lamp"
    ) {
      own();
      begin(e, "aim", { originalLamp: structuredClone(getState().lamp) });
      onLamp({ target: point });
      return;
    }
    if (hit?.kind === "water") {
      own();
      setTool("water", false);
      begin(e, "water", { fromCan: true });
      return;
    }
    if (hit?.kind === "lamp") {
      own();
      setTool("lamp", false);
      return;
    }
    if (
      hit?.kind === "aim" ||
      (!hit &&
        point &&
        getState().lamp.power > 0 &&
        world.lamp.containsPoint(point))
    ) {
      own();
      setTool("lamp", false);
      begin(e, "aim", {
        originalLamp: structuredClone(getState().lamp),
        aimOffset: point
          ? {
              x: getState().lamp.target.x - point.x,
              z: getState().lamp.target.z - point.z,
            }
          : { x: 0, z: 0 },
      });
      return;
    }
    if (hit?.kind === "plant") {
      const p = getState().plants.find((p) => p.id === hit.id);
      own();
      begin(e, "plant", { species: p.species, movingId: p.id });
    }
  }
  canvas.addEventListener("pointerdown", onSceneDown, {
    capture: true,
    signal,
  });
  lightHandle.addEventListener("pointerdown", onSceneDown, {
    capture: true,
    signal,
  });
  lightHandle.addEventListener(
    "click",
    (e) => {
      if (e.detail === 0 && !isBusy()) setTool("lamp", false);
    },
    { signal },
  );
  window.addEventListener(
    "pointermove",
    (e) => {
      if (!drag) {
        queueHover(e);
        if (e.target === canvas && selected && !isBusy())
          plantPreview(selected, soilPoint(e));
        return;
      }
      if (e.pointerId !== drag.id) return;
      if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 5)
        drag.active = true;
      if (drag.kind === "water") {
        if (drag.active || !drag.fromCan) showWater(soilPoint(e));
        return;
      }
      if (!drag.active) return;
      if (drag.kind === "aim") {
        const point = soilPoint(e);
        if (point)
          onLamp({
            target: {
              x: point.x + (drag.aimOffset?.x || 0),
              z: point.z + (drag.aimOffset?.z || 0),
            },
          });
      } else {
        if (drag.movingId) world.hidePlant(drag.movingId);
        const point = soilPoint(e);
        plantPreview(drag.species, point, drag.movingId);
        cursor.hidden = !!point;
        if (!point) {
          cursor.querySelector("img").src = world.thumbnails[drag.species];
          cursor.querySelector("span").textContent = SPECIES[drag.species].name;
          cursor.style.transform = `translate(${e.clientX + 12}px,${e.clientY - 55}px)`;
        }
      }
    },
    { signal },
  );
  window.addEventListener(
    "pointerup",
    (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag,
        point = soilPoint(e);
      drag = null;
      clear();
      if (d.kind === "water") {
        select(null);
        if (point && (d.active || !d.fromCan)) {
          onWater(point);
          setTool(null, false);
        } else if (d.active) ui.toast("Choose a soil patch inside the jar.");
      } else if (d.kind === "aim") {
        if (!point && d.active) onLamp(d.originalLamp);
        else onLamp({});
      } else if (d.active) {
        select(null);
        const error = placementError(getState(), point, d.movingId);
        if (error) ui.toast(error);
        else onPlace(d.species, point, d.movingId);
      } else if (!d.movingId) {
        select(d.species);
        ((keyboardPoint = { x: 0, z: 0 }),
          (hoverFrame = 0),
          (hoverEvent = null));
        const lightHandle = ui.$("#light-handle");
        canvas.focus({ preventScroll: true });
        if (matchMedia("(max-width:680px)").matches)
          ui.setCollectionOpen(false, false);
      }
    },
    { signal },
  );
  window.addEventListener("pointercancel", () => cancel(true), { signal });
  window.addEventListener("blur", () => cancel(), { signal });
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") {
        cancel(true);
        return;
      }
      if (e.target !== canvas || drag || isBusy() || (!tool && !selected))
        return;
      const steps = {
        ArrowLeft: [-0.1, 0],
        ArrowRight: [0.1, 0],
        ArrowUp: [0, -0.1],
        ArrowDown: [0, 0.1],
      };
      if (steps[e.key]) {
        e.preventDefault();
        const [x, z] = steps[e.key];
        keyboardPoint = clampToSoil(
          { x: keyboardPoint.x + x, z: keyboardPoint.z + z },
          selected ? SOIL_RADIUS - PLANT_RADIUS : 0.02,
        );
        if (selected) plantPreview(selected, keyboardPoint);
        else if (tool === "water") showWater(keyboardPoint);
        else onLamp({ target: keyboardPoint });
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (selected) {
          const error = placementError(getState(), keyboardPoint);
          if (error) {
            ui.toast(error);
            return;
          }
          const species = selected;
          cancel();
          onPlace(species, keyboardPoint);
        } else if (tool === "water") {
          world.waterPreview(null);
          ui.hidePreview();
          onWater(keyboardPoint);
        } else onLamp({ target: keyboardPoint });
      }
    },
    { signal },
  );
  return {
    cancel,
    setTool,
    getTool: () => tool,
    dispose() {
      cancel();
      controller.abort();
      world.controls.removeEventListener("start", clearHover);
    },
  };
}
