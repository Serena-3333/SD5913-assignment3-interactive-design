import { SPECIES, SLOTS } from "../simulation/species.js";
import { conditionsFor } from "../simulation/simulation.js";
import { icon } from "./icons.js";
const flower =
  '<svg viewBox="0 0 60 60" fill="none" aria-hidden="true"><path d="M30 21C18 1 2 20 20 30 0 43 20 59 30 40c12 20 29 0 10-10 20-12 1-30-10-9Z" fill="currentColor"/><circle cx="30" cy="30" r="7" fill="#fff4c9"/></svg>';
export function createUI(root) {
  root.innerHTML = `
 <header class="masthead"><a class="brand" href="./" aria-label="Pocket Terrarium home"><span class="brand-sticker">${icon("jar")}</span><div><h1>Pocket Terrarium<span class="title-spark">✳</span></h1><p>A tiny world shaped by your choices.</p></div></a><details class="help-menu"><summary>${icon("hand")}A little help</summary><div><strong>Make yourself a little garden.</strong><p>Drag a plant into the jar. Drag the can to water a patch. Move the lamp and aim its light. Add two plants, then try Next Day.</p><p>Click a tool, then a spot for an alternative to dragging. Esc cancels.</p></div></details></header>
 <main class="workspace">
 <div class="collection-shell"><aside id="plant-collection" class="collection paper-panel"><div class="panel-title"><span class="title-leaf">${icon("leaf")}</span><h2>Pick a plant</h2><button id="collection-close" class="icon-button" type="button" aria-label="Collapse plant collection" title="Collapse plant collection">${icon("close")}</button></div><p class="section-note">A little of this. A little of that.</p><div class="plant-grid">${Object.entries(
   SPECIES,
 )
   .map(
     ([id, s], i) =>
       `<button type="button" data-species="${id}" class="plant-card plant-${id}" aria-label="Select ${s.name}" aria-pressed="false"><span class="card-check" aria-hidden="true">✓</span><img class="plant-thumbnail" alt="3D ${s.name}" draggable="false"/><strong>${s.name}</strong><span class="preferences"><span title="Preferred moisture">${icon("drop")}${s.water.join("–")}</span><span title="Preferred light">${icon("sun")}${s.light.join("–")}</span></span><span class="plant-availability" hidden>Available</span></button>`,
   )
   .join(
     "",
   )}</div><div class="collection-bottom"><span class="doodle-flower">${flower}</span><span>One of each.<br>Room for three.</span><span class="little-sprout">${icon("leaf")}</span></div></aside><button id="collection-open" class="collection-open" type="button" aria-label="Open plants and preferences" aria-controls="plant-collection" aria-expanded="true" hidden>${icon("leaf")}Plants</button></div>
 <section class="terrarium-column" aria-labelledby="terrarium-title"><div class="scene-heading"><div><span class="small-kicker">YOUR LITTLE WORLD</span><h2 id="terrarium-title">Room to grow<span>!</span></h2></div><span id="plant-count" class="count-sticker">0 / 3</span></div>
 <div id="scene-container" class="scene-container"><span class="scene-spark spark-one" aria-hidden="true">✧</span><span class="scene-spark spark-two" aria-hidden="true">✳</span><div id="placement-preview" class="placement-preview" role="status" hidden></div><button id="camera-reset" class="camera-reset icon-button" type="button" title="Reset view" aria-label="Reset view">${icon("rotate")}</button><span class="orbit-hint">${icon("rotate")}Drag the view</span><div id="scene-loading" class="scene-loading">Making a little room for nature…</div></div>
 <div class="tool-dock"><div class="tool-buttons"><button id="water-button" type="button" class="tool-button water-tool" aria-pressed="false">${icon("can")}Water</button><button id="lamp-button" type="button" class="tool-button lamp-tool" aria-pressed="false">${icon("lamp")}Light</button></div><p id="tool-hint">Drag the can or lamp to experiment.</p><button id="tool-close" class="icon-button" type="button" title="Put tool away" aria-label="Put tool away" hidden>${icon("close")}</button></div>
 <div id="lamp-controls" class="lamp-controls" hidden>${[
   ["azimuth", "Orbit", -180, 180, 1],
   ["reach", "Reach", 0, 1.45, 0.01],
   ["radius", "Beam", 0.3, 1.15, 0.01],
   ["power", "Power", 0, 100, 1],
 ]
   .map(
     ([key, label, min, max, step]) =>
       `<label for="lamp-${key}"><span>${label}<output id="lamp-${key}-value"></output></span><input id="lamp-${key}" type="range" min="${min}" max="${max}" step="${step}" data-lamp="${key}" aria-label="Lamp ${label.toLowerCase()}"/></label>`,
   )
   .join("")}</div>
 <div class="slot-picker" aria-label="Planting and tool spots" hidden>${SLOTS.map((s, i) => `<button type="button" data-slot="${i}" class="slot-button" aria-label="${s.name}"><span>${i + 1}</span>${["Front left", "Front right", "Back"][i]}</button>`).join("")}</div><p id="selection-help" class="selection-help" role="status" hidden></p>
</section>
 <aside class="environment-column"><section class="environment paper-panel" aria-labelledby="environment-title"><div class="panel-title"><span class="title-sun">${icon("sun")}</span><h2 id="environment-title">Feeling good?</h2></div><div class="moisture-section"><div class="moisture-heading"><span>${icon("drop")}Soil average</span><strong><span id="moisture-number">60</span><small>%</small></strong></div><div class="meter moisture-meter" role="meter" aria-label="Average soil moisture" aria-valuemin="0" aria-valuemax="100" aria-valuenow="60"><div id="moisture-fill" style="width:60%"></div></div></div><div id="plant-conditions"></div><span class="health-note">${icon("heart")}Health changes with the days.</span></section> <div class="day-controls"><div class="day-counter"><span>Little by little</span><strong id="day-number">Day 01</strong></div><button id="next-day" type="button" class="primary-button" disabled><span>Next Day</span>${icon("arrow")}</button><div class="reset-actions"><button id="reset-button" type="button" class="icon-button" aria-label="Reset experiment" title="Reset experiment">${icon("reset")}</button><button id="clear-button" type="button" class="icon-button" aria-label="Clear jar" title="Clear jar">${icon("trash")}</button></div></div></aside>
 </main><div id="toast" class="toast" role="status" aria-live="polite" hidden></div><div id="drag-cursor" class="drag-cursor" hidden><img alt=""/><span></span></div><dialog id="confirm-dialog"><form method="dialog"><span class="dialog-flower">${flower}</span><h2 id="confirm-title"></h2><p id="confirm-description"></p><div class="dialog-actions"><button type="submit" class="secondary-button" value="cancel">Keep growing</button><button id="confirm-action" type="submit" class="primary-button" value="confirm">Reset</button></div></form></dialog>`;
  const $ = (selector) => root.querySelector(selector);
  let selected = null,
    tool = null,
    toastTimer,
    pendingConfirmation,
    numberFrame = 0,
    collectionTimer,
    collectionDelay,
    collectionFrame,
    collectionOpen = true;
  for (const event of ["pointerenter", "keydown"])
    $(".collection").addEventListener(event, () =>
      clearTimeout(collectionDelay),
    );
  const observed = new WeakMap(),
    animations = new Map();
  function animateNumber(element, value) {
    value = Math.round(value);
    if (observed.get(element) === value) return;
    observed.set(element, value);
    animations.set(element, {
      from: Number(element.textContent) || 0,
      to: value,
      start: performance.now(),
    });
    if (!numberFrame) numberFrame = requestAnimationFrame(tick);
  }
  function tick(now) {
    for (const [e, a] of animations) {
      const t = Math.min((now - a.start) / 220, 1);
      e.textContent = Math.round(a.from + (a.to - a.from) * (1 - (1 - t) ** 3));
      if (t === 1) animations.delete(e);
    }
    numberFrame = animations.size ? requestAnimationFrame(tick) : 0;
  }
  function render(state, busy = false) {
    $("#day-number").textContent = `Day ${String(state.day).padStart(2, "0")}`;
    $("#plant-count").textContent = `${state.plants.length} / 3`;
    animateNumber($("#moisture-number"), state.soilMoisture);
    $("#moisture-fill").style.width = `${state.soilMoisture}%`;
    $(".moisture-meter").setAttribute(
      "aria-valuenow",
      Math.round(state.soilMoisture),
    );
    $("#next-day").disabled = state.plants.length < 2 || busy;
    $("#next-day").title =
      state.plants.length < 2 ? "Add two plants to begin" : "";
    $("#next-day span").textContent = busy ? "Growing…" : "Next Day";
    for (const id of [
      "reset-button",
      "clear-button",
      "water-button",
      "lamp-button",
    ])
      $("#" + id).disabled = busy;
    $(".workspace").classList.toggle("advancing", busy);
    for (const [id, s] of Object.entries(SPECIES)) {
      const card = $(`[data-species="${id}"]`),
        planted = state.plants.some((p) => p.species === id);
      card.classList.toggle("planted", planted);
      card.classList.toggle("selected", selected === id);
      card.setAttribute("aria-pressed", String(selected === id));
      card.disabled = busy;
      card.querySelector(".plant-availability").textContent = planted
        ? "Planted"
        : selected === id
          ? "Placing"
          : "Available";
    }
    for (const key of ["azimuth", "reach", "radius", "power"]) {
      const input = $("#lamp-" + key);
      input.value = state.lamp[key];
      input.disabled = busy;
      $("#lamp-" + key + "-value").textContent =
        key === "azimuth"
          ? `${Math.round(state.lamp[key])}°`
          : key === "reach"
            ? `${Math.round((state.lamp[key] / 1.45) * 100)}%`
            : key === "radius"
              ? state.lamp[key].toFixed(2)
              : `${Math.round(state.lamp[key])}%`;
    }
    const conditions = $("#plant-conditions");
    for (const e of [...conditions.querySelectorAll(".condition-card")])
      if (!state.plants.some((p) => p.species === e.dataset.condition))
        e.remove();
    conditions.querySelector(".conditions-empty")?.remove();
    if (!state.plants.length)
      conditions.innerHTML = `<div class="conditions-empty"><span class="empty-sprout">${icon("leaf")}</span><strong>A little life goes a long way.</strong><p>Your plants’ feelings appear here.</p></div>`;
    for (const plant of state.plants) {
      const c = conditionsFor(state, plant);
      let card = conditions.querySelector(
        `[data-condition="${plant.species}"]`,
      );
      if (!card) {
        card = document.createElement("article");
        card.className = "condition-card";
        card.dataset.condition = plant.species;
        card.innerHTML = `<div class="condition-top"><h4>${SPECIES[plant.species].name}</h4><div class="comfort-value"><span>Comfort</span><strong><b>0</b>%</strong></div></div><div class="meter"><div></div></div><div class="condition-middle"><span class="status-badge"></span><span class="health-value" title="Health updates after Next Day">${icon("heart")}<strong>70</strong></span></div><div class="local-values"><span class="water-value" title="Moisture here">${icon("drop")}<b></b><small>%</small></span><span class="light-value" title="Light here">${icon("sun")}<b></b></span><span class="growth-value" title="Growth">${icon("leaf")}<b></b><small>%</small></span></div>`;
        conditions.append(card);
      }
      card.dataset.status =
        c.comfort >= 0.8
          ? "comfortable"
          : c.comfort >= 0.55
            ? "adjust"
            : "stressed";
      animateNumber(card.querySelector(".comfort-value b"), c.percent);
      card.querySelector(".meter div").style.width = `${c.percent}%`;
      card.querySelector(".status-badge").textContent =
        c.comfort >= 0.8
          ? "Happy here"
          : c.comfort >= 0.55
            ? "A little adjustment"
            : "Feeling stressed";
      card.querySelector(".health-value strong").textContent = plant.health;
      card.querySelector(".water-value b").textContent = Math.round(c.moisture);
      card.querySelector(".light-value b").textContent = Math.round(c.light);
      card.querySelector(".growth-value b").textContent = plant.growth;
    }
    for (const b of root.querySelectorAll("[data-slot]")) {
      const p = state.plants.find((p) => p.slot === Number(b.dataset.slot));
      b.title = p
        ? `${SPECIES[p.species].name} · ${SLOTS[p.slot].name}`
        : SLOTS[b.dataset.slot].name;
      b.classList.toggle("occupied", !!p);
      b.disabled = busy;
      b.setAttribute(
        "aria-label",
        `${SLOTS[b.dataset.slot].name}${p ? `, ${SPECIES[p.species].name}` : ", empty"}`,
      );
    }
    $(".slot-picker").hidden = !selected && tool !== "lamp";
  }
  $("#confirm-dialog").addEventListener("close", () => {
    if ($("#confirm-dialog").returnValue === "confirm") pendingConfirmation?.();
    pendingConfirmation = null;
  });
  return {
    $,
    render,
    thumbnails(images) {
      for (const [id, url] of Object.entries(images))
        $(`[data-species="${id}"] img`).src = url;
    },
    select(id) {
      selected = id;
      $("#selection-help").hidden = !id;
      $("#selection-help").textContent = id
        ? `${SPECIES[id].name} · choose a spot`
        : "";
    },
    tool(value) {
      tool = value;
      $("#water-button").classList.toggle("active", value === "water");
      $("#lamp-button").classList.toggle("active", value === "lamp");
      $("#water-button").setAttribute(
        "aria-pressed",
        String(value === "water"),
      );
      $("#lamp-button").setAttribute("aria-pressed", String(value === "lamp"));
      $("#lamp-controls").hidden = value !== "lamp";
      $("#tool-close").hidden = !value;
      $("#tool-hint").textContent =
        value === "water"
          ? "Choose any patch. Arrow keys + Enter also work."
          : value === "lamp"
            ? "Drag the lamp. Drag the light spot to aim."
            : "Drag the can or lamp to experiment.";
    },
    toast(message) {
      clearTimeout(toastTimer);
      $("#toast").textContent = message;
      $("#toast").hidden = false;
      toastTimer = setTimeout(() => ($("#toast").hidden = true), 2300);
    },
    scheduleCollectionClose() {
      clearTimeout(collectionDelay);
      collectionDelay = setTimeout(
        () => this.setCollectionOpen(false, false),
        1400,
      );
    },
    setCollectionOpen(open, focus = true) {
      clearTimeout(collectionDelay);
      clearTimeout(collectionTimer);
      cancelAnimationFrame(collectionFrame);
      const collection = $(".collection"),
        workspace = $(".workspace"),
        tab = $("#collection-open");
      const duration = matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 420;
      const wasOpen = collectionOpen;
      collectionOpen = open;
      tab.hidden = open;
      tab.setAttribute("aria-expanded", String(open));
      collection.inert = !open;
      workspace.classList.remove("collection-closing", "collection-opening");
      if (open) {
        collection.hidden = false;
        workspace.classList.remove("collection-collapsed");
        if (!wasOpen && duration) {
          workspace.classList.add("collection-opening");
          void collection.offsetWidth;
          collectionFrame = requestAnimationFrame(() =>
            workspace.classList.remove("collection-opening"),
          );
        }
        if (focus) $("#collection-close").focus({ preventScroll: true });
      } else {
        if (focus) tab.focus({ preventScroll: true });
        workspace.classList.add("collection-closing");
        collectionTimer = setTimeout(() => {
          collection.hidden = true;
          workspace.classList.add("collection-collapsed");
          workspace.classList.remove("collection-closing");
        }, duration);
      }
    },
    preview(species, slot, percent, position) {
      const e = $("#placement-preview");
      e.hidden = slot < 0;
      if (slot >= 0) {
        e.innerHTML = `<strong>${SPECIES[species].name}<span>${percent}% comfort</span></strong>`;
        e.style.left = `${Math.max(95, Math.min($("#scene-container").clientWidth - 100, position.x))}px`;
        e.style.top = `${Math.max(70, position.y - 100)}px`;
      }
    },
    waterPreview(valid, position) {
      const e = $("#placement-preview");
      e.hidden = !valid;
      if (valid) {
        e.innerHTML = "<strong>A little rain, right here.</strong>";
        e.style.left = `${Math.max(100, Math.min($("#scene-container").clientWidth - 110, position.x))}px`;
        e.style.top = `${Math.max(55, position.y - 60)}px`;
      }
    },
    hidePreview() {
      $("#placement-preview").hidden = true;
    },
    confirm(kind, action) {
      pendingConfirmation = action;
      $("#confirm-title").textContent =
        kind === "clear" ? "A whole new garden?" : "Back to day one?";
      $("#confirm-description").textContent =
        kind === "clear"
          ? "All plants, water and light will reset."
          : "Keep your plants and their spots. Reset water, light, health and growth.";
      $("#confirm-action").textContent =
        kind === "clear" ? "Clear jar" : "Start again";
      $("#confirm-dialog").returnValue = "";
      $("#confirm-dialog").showModal();
    },
    dispose() {
      clearTimeout(toastTimer);
      clearTimeout(collectionTimer);
      clearTimeout(collectionDelay);
      cancelAnimationFrame(collectionFrame);
      cancelAnimationFrame(numberFrame);
    },
  };
}
