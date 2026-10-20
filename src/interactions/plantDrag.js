import * as THREE from "three";
import { SLOTS, SPECIES } from "../simulation/species.js";
import {
  SOIL_RADIUS,
  surfaceHeight,
  clampToSoil,
} from "../simulation/environment.js";
import { conditionsFor } from "../simulation/simulation.js";
export function createInteractions(
  world,
  ui,
  { getState, isBusy, onPlace, onLamp, onWater },
) {
  const canvas = world.renderer.domElement,
    raycaster = new THREE.Raycaster(),
    lampPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -2.95),
    controller = new AbortController(),
    { signal } = controller;
  let selected = null,
    tool = null,
    drag = null,
    currentSlot = -1,
    keyboardWaterPoint = { x: 0, z: 0 };
  const cursor = ui.$("#drag-cursor");
  canvas.tabIndex = 0;
  canvas.setAttribute(
    "aria-label",
    "Terrarium. Water tool: arrow keys aim, Enter pours, Escape cancels.",
  );
  function ray(event) {
    const r = canvas.getBoundingClientRect();
    raycaster.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - r.left) / r.width) * 2 - 1,
        (-(event.clientY - r.top) / r.height) * 2 + 1,
      ),
      world.camera,
    );
    return (
      event.clientX >= r.left &&
      event.clientX <= r.right &&
      event.clientY >= r.top &&
      event.clientY <= r.bottom
    );
  }
  function soilPoint(event) {
    if (!ray(event)) return null;
    const hit = raycaster.intersectObject(world.terrarium.soilSurface)[0];
    if (!hit || Math.hypot(hit.point.x, hit.point.z) > SOIL_RADIUS - 0.005)
      return null;
    return { x: hit.point.x, z: hit.point.z };
  }
  function slotUnder(event, moving = false) {
    const p = soilPoint(event);
    if (!p) return -1;
    let slot = -1,
      distance = 0.68;
    for (let i = 0; i < SLOTS.length; i++) {
      if (!moving && getState().plants.some((p) => p.slot === i)) continue;
      const d = Math.hypot(p.x - SLOTS[i].x, p.z - SLOTS[i].z);
      if (d < distance) {
        distance = d;
        slot = i;
      }
    }
    return slot;
  }
  function pick(event) {
    if (!ray(event)) return null;
    const hit = raycaster.intersectObjects(
      [
        ...world.plants.values(),
        world.lamp.head,
        world.wateringCan.group,
        world.lamp.aimHandle,
      ],
      true,
    )[0];
    if (!hit) return null;
    let o = hit.object;
    while (o) {
      if (o.userData.species)
        return { kind: "plant", species: o.userData.species };
      if (o.userData.kind) return { kind: o.userData.kind };
      o = o.parent;
    }
    return null;
  }
  function redraw() {
    ui.render(getState(), isBusy());
  }
  function select(id) {
    selected = id;
    ui.select(id);
    world.highlight(-1, !!id);
    redraw();
  }
  function setTool(value, toggle = true) {
    if (drag) return;
    tool = toggle && tool === value ? null : value;
    select(null);
    ui.tool(tool);
    world.setTool(tool);
    if (tool === "water") canvas.focus({ preventScroll: true });
    redraw();
  }
  function clear() {
    world.clearPreview();
    ui.hidePreview();
    cursor.hidden = true;
    world.controls.enabled = true;
    currentSlot = -1;
    canvas.style.cursor = "grab";
  }
  function cancel(notify = false) {
    const had = drag || selected || tool;
    if (drag?.originalLamp) onLamp(drag.originalLamp, false);
    drag = null;
    clear();
    tool = null;
    ui.tool(null);
    world.setTool(null);
    select(null);
    if (notify && had) ui.toast("Cancelled. Nothing planted or watered.");
  }
  function begin(event, kind, extra = {}) {
    drag = {
      kind,
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      ...extra,
    };
    world.controls.enabled = false;
    canvas.style.cursor = "grabbing";
  }
  function plantPreview(event) {
    currentSlot = slotUnder(event, drag.moving);
    world.highlight(currentSlot, true);
    const p = getState().plants.find((p) => p.species === drag.species);
    world.preview(drag.species, currentSlot, p?.health, p?.growth);
    if (currentSlot >= 0) {
      const s = SLOTS[currentSlot],
        c = conditionsFor(getState(), {
          species: drag.species,
          slot: currentSlot,
        });
      ui.preview(
        drag.species,
        currentSlot,
        c.percent,
        world.project(
          new THREE.Vector3(s.x, surfaceHeight(s.x, s.z) + 0.3, s.z),
        ),
      );
      cursor.hidden = true;
    } else {
      ui.hidePreview();
      cursor.hidden = false;
      cursor.querySelector("img").src = world.thumbnails[drag.species];
      cursor.querySelector("span").textContent = SPECIES[drag.species].name;
      cursor.style.transform = `translate(${event.clientX + 12}px,${event.clientY - 55}px)`;
    }
  }
  function waterPreview(event) {
    const p = soilPoint(event);
    drag.point = p;
    world.waterPreview(p);
    if (p)
      ui.waterPreview(
        true,
        world.project(
          new THREE.Vector3(p.x, surfaceHeight(p.x, p.z) + 0.15, p.z),
        ),
      );
    else ui.hidePreview();
  }
  for (const card of document.querySelectorAll("[data-species]")) {
    card.addEventListener(
      "pointerdown",
      (event) => {
        if (event.button !== 0 || isBusy() || card.disabled) return;
        event.preventDefault();
        setTool(null, false);
        select(card.dataset.species);
        begin(event, "plant", {
          species: card.dataset.species,
          moving: getState().plants.some(
            (p) => p.species === card.dataset.species,
          ),
        });
      },
      { signal },
    );
    card.addEventListener(
      "click",
      (event) => {
        if (event.detail === 0 && !isBusy()) {
          setTool(null, false);
          select(card.dataset.species);
        }
      },
      { signal },
    );
  }
  canvas.addEventListener(
    "pointerdown",
    (event) => {
      if (event.button !== 0) return;
      if (isBusy()) {
        event.stopImmediatePropagation();
        return;
      }
      const hit = pick(event),
        p = soilPoint(event);
      function own() {
        event.stopImmediatePropagation();
        event.preventDefault();
      }
      if (hit?.kind === "water") {
        own();
        setTool("water", false);
        begin(event, "water", { fromCan: true });
        return;
      }
      if (hit?.kind === "lamp") {
        own();
        setTool("lamp", false);
        begin(event, "lamp", {
          originalLamp: structuredClone(getState().lamp),
        });
        return;
      }
      if (tool === "water" && p) {
        own();
        begin(event, "water", { fromCan: false });
        waterPreview(event);
        return;
      }
      if (tool === "lamp" && p) {
        own();
        begin(event, "aim", { originalLamp: structuredClone(getState().lamp) });
        onLamp({ target: p }, false);
        return;
      }
      if (selected) {
        own();
        const slot = slotUnder(
          event,
          getState().plants.some((p) => p.species === selected),
        );
        if (slot >= 0) {
          const id = selected;
          cancel();
          onPlace(id, slot);
        } else ui.toast("Choose a planting spot.");
        return;
      }
      if (hit?.kind === "plant") {
        own();
        begin(event, "plant", { species: hit.species, moving: true });
      }
    },
    { capture: true, signal },
  );
  window.addEventListener(
    "pointermove",
    (event) => {
      if (!drag) {
        if (event.target === canvas && !isBusy())
          canvas.style.cursor =
            tool === "water" || tool === "lamp"
              ? "crosshair"
              : "grab";
        return;
      }
      if (event.pointerId !== drag.id) return;
      if (
        !drag.active &&
        Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 5
      )
        drag.active = true;
      if (drag.kind === "water") {
        if (drag.active || !drag.fromCan) waterPreview(event);
        return;
      }
      if (!drag.active) return;
      if (drag.kind === "lamp") {
        if (ray(event)) {
          const p = raycaster.ray.intersectPlane(
            lampPlane,
            new THREE.Vector3(),
          );
          if (p)
            onLamp(
              {
                azimuth: (Math.atan2(p.x, p.z) * 180) / Math.PI,
                reach: 2.02 - Math.hypot(p.x, p.z),
              },
              false,
            );
        }
      } else if (drag.kind === "aim") {
        const p = soilPoint(event);
        if (p) onLamp({ target: p }, false);
      } else {
        if (drag.moving) world.hideSpecies(drag.species);
        plantPreview(event);
      }
    },
    { signal },
  );
  window.addEventListener(
    "pointerup",
    (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const d = drag;
      const slot =
          d.active && d.kind === "plant" ? slotUnder(event, d.moving) : -1,
        point =
          d.kind === "water" && (d.active || !d.fromCan)
            ? soilPoint(event)
            : null;
      drag = null;
      clear();
      if (d.kind === "water") {
        select(null);
        if (point) onWater(point);
        else if (d.active)
          ui.toast("Water stays in the jar. Try a soil patch.");
        return;
      }
      if (d.kind === "lamp" || d.kind === "aim") {
        onLamp({}, true);
        return;
      }
      if (d.active) {
        select(null);
        if (slot >= 0) onPlace(d.species, slot);
        else ui.toast("Drop onto a planting spot.");
      } else select(d.species);
    },
    { signal },
  );
  window.addEventListener("pointercancel", () => cancel(true), { signal });
  window.addEventListener("blur", () => cancel(), { signal });
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Escape") cancel(true);
      if (tool !== "water" || e.target !== canvas || drag || isBusy()) return;
      const steps = {
        ArrowLeft: [-0.12, 0],
        ArrowRight: [0.12, 0],
        ArrowUp: [0, -0.12],
        ArrowDown: [0, 0.12],
      };
      if (steps[e.key]) {
        e.preventDefault();
        const [x, z] = steps[e.key];
        keyboardWaterPoint = clampToSoil({
          x: keyboardWaterPoint.x + x,
          z: keyboardWaterPoint.z + z,
        });
        world.waterPreview(keyboardWaterPoint);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        world.waterPreview(null);
        onWater(keyboardWaterPoint);
      }
    },
    { signal },
  );
  for (const button of document.querySelectorAll("[data-slot]"))
    button.addEventListener(
      "click",
      () => {
        if (isBusy()) return;
        const slot = Number(button.dataset.slot),
          point = SLOTS[slot];
        if (tool === "water") return;
        if (tool === "lamp") {
          onLamp({ target: { x: point.x, z: point.z } }, true);
          return;
        }
        if (selected) {
          const id = selected;
          cancel();
          onPlace(id, slot);
        } else {
          const p = getState().plants.find((p) => p.slot === slot);
          if (p) select(p.species);
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
    },
  };
}
