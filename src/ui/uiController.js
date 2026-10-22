import { SPECIES, MAX_PLANTS } from "../simulation/species.js";
import { conditionsFor } from "../simulation/simulation.js";
import { icon } from "./icons.js";
import { liveAdvice, dayRecord } from "./plantFeedback.js";
const flower =
  '<svg viewBox="0 0 60 60" fill="none" aria-hidden="true"><path d="M30 21C18 1 2 20 20 30 0 43 20 59 30 40c12 20 29 0 10-10 20-12 1-30-10-9Z" fill="currentColor"/><circle cx="30" cy="30" r="7" fill="#fff4c9"/></svg>';
export function createUI(root) {
  root.innerHTML = `
 <header class="masthead"><a class="brand" href="./" aria-label="Pocket Terrarium home"><span class="brand-sticker">${icon("jar")}</span><div><h1>Pocket Terrarium<span class="title-spark">✳</span></h1><p>A tiny world shaped by your choices.</p></div></a><details class="help-menu"><summary>${icon("hand")}A little help</summary><div><strong>Make yourself a little garden.</strong><p>Drag the can to water a patch. Drag the light spot on the soil; click the lamp for range and intensity. Plant one to five, including repeats. Then try Next Day. Hold the right mouse button and drag to rotate; two fingers on touch screens.</p><p>Click a tool, then a spot for an alternative to dragging. For keyboard planting, select a card, then use arrow keys and Enter. Esc cancels.</p></div></details></header>
 <main class="workspace">
 <div class="collection-shell"><aside id="plant-collection" class="collection paper-panel"><div class="panel-title"><span class="title-leaf">${icon("leaf")}</span><h2>Pick a plant</h2><button id="collection-close" class="icon-button" type="button" aria-label="Collapse plant collection" data-tooltip="Collapse plant collection">${icon("close")}</button></div><p id="collection-instruction" class="section-note">Drag a card onto the soil. Or click a card, then the soil.</p><div class="plant-grid">${Object.entries(
   SPECIES,
 )
   .map(
     ([id, s], i) =>
       `<button type="button" data-species="${id}" class="plant-card plant-${id}" aria-label="Choose ${s.name}; drag into the jar or click then choose soil" aria-describedby="collection-instruction" aria-pressed="false"><span class="card-check" aria-hidden="true">✓</span><img class="plant-thumbnail" alt="3D ${s.name}" draggable="false"/><strong>${s.name}</strong><span class="preferences"><span data-tooltip="Preferred moisture">${icon("drop")}${{ High: "More water", Medium: "Moderate water", Low: "Less water" }[s.waterLabel]}</span><span data-tooltip="Preferred light">${icon("sun")}${{ Soft: "Gentle light", Medium: "Filtered light", Bright: "Bright light" }[s.lightLabel]}</span></span><span class="plant-availability" hidden>Available</span></button>`,
   )
   .join(
     "",
   )}</div><div class="collection-bottom"><span class="doodle-flower">${flower}</span><span>One plant is enough.<br>Up to five, repeats welcome.</span><span class="little-sprout">${icon("leaf")}</span></div></aside><button id="collection-open" class="collection-open" type="button" aria-label="Open plants and preferences" aria-controls="plant-collection" aria-expanded="true" hidden>${icon("leaf")}Plants</button></div>
 <section class="terrarium-column" aria-labelledby="terrarium-title"><div class="scene-heading"><div><span class="small-kicker">YOUR LITTLE WORLD</span><h2 id="terrarium-title">Room to grow<span>!</span></h2><p id="plant-count" class="capacity-note" aria-label="Plant capacity">0 planted · max 5</p></div></div><div class="view-controls"><span class="view-instruction">${icon("rotate")}<span class="desktop-orbit">Hold right mouse + drag to rotate</span><span class="touch-orbit">Two fingers to rotate</span></span><button id="camera-reset" type="button" class="view-reset" aria-label="Reset view">${icon("reset")}Reset view</button></div>
 <div id="scene-container" class="scene-container"><span class="scene-spark spark-one" aria-hidden="true">✧</span><span class="scene-spark spark-two" aria-hidden="true">✳</span><div id="placement-preview" class="placement-preview" role="status" hidden></div><button id="light-handle" class="light-handle" type="button" aria-label="Drag light spot; click then use arrow keys to aim"></button><div id="tool-hover" class="tool-hover" role="tooltip" hidden></div><div class="keyboard-tools"><button id="water-button" type="button">Select watering can</button><button id="lamp-button" type="button">Select light</button></div> <div id="lamp-controls" class="lamp-controls" hidden>${[
   ["radius", "Range", 0.3, 1.15, 0.01],
   ["power", "Intensity", 0, 100, 1],
 ]
   .map(
     ([key, label, min, max, step]) =>
       `<label for="lamp-${key}"><span>${label}<output id="lamp-${key}-value"></output></span><input id="lamp-${key}" type="range" min="${min}" max="${max}" step="${step}" data-lamp="${key}" aria-label="Lamp ${label.toLowerCase()}"/></label>`,
   )
   .join(
     "",
   )}<button id="tool-close" class="icon-button" type="button" aria-label="Close light controls" data-tooltip="Close light controls">${icon("close")}</button></div>
<div id="scene-loading" class="scene-loading">Making a little room for nature…</div></div>
 <p id="placement-help" class="placement-help" role="status" hidden>Plant selected</p>
</section>
 <aside class="environment-column"><section class="environment paper-panel" aria-labelledby="environment-title"><div class="panel-title"><span class="title-sun">${icon("sun")}</span><h2 id="environment-title">Feeling good?</h2></div><details id="metrics-guide" class="metrics-guide" hidden><summary>What do the numbers mean?</summary><p><strong>Comfort now</strong> responds to water and light here. <strong>Health</strong> is the plant’s current condition. <strong>Growth</strong> is its accumulated development. Health and growth update after Next Day; “Last day” records what already happened, not a forecast.</p></details><div id="plant-conditions"></div></section> <div class="day-controls"><div class="day-counter"><span>Little by little</span><strong id="day-number">Day 01</strong></div><button id="next-day" type="button" class="primary-button" aria-describedby="next-day-hint" disabled><span>Next Day</span>${icon("arrow")}</button><div class="reset-actions"><button id="reset-button" type="button" class="icon-button" aria-label="Reset experiment" data-tooltip="Reset experiment">${icon("reset")}</button><button id="clear-button" type="button" class="icon-button" aria-label="Clear jar" data-tooltip="Clear jar">${icon("trash")}</button></div><p id="next-day-hint" class="next-day-hint">Plant at least one to begin.</p></div></aside>
 </main><div id="toast" class="toast" role="status" aria-live="polite" hidden></div><div id="drag-cursor" class="drag-cursor" hidden><img alt=""/><span></span></div><dialog id="confirm-dialog"><form method="dialog"><span class="dialog-flower">${flower}</span><h2 id="confirm-title"></h2><p id="confirm-description"></p><div class="dialog-actions"><button type="submit" class="secondary-button" value="cancel">Keep growing</button><button id="confirm-action" type="submit" class="primary-button" value="confirm">Reset</button></div></form></dialog>`;
  const $ = (selector) => root.querySelector(selector);
  const hintController = new AbortController();
  const hint = document.createElement("div");
  hint.className = "interface-tooltip";
  hint.id = "interface-tooltip";
  hint.setAttribute("role", "tooltip");
  hint.hidden = true;
  root.append(hint);
  let hintTarget = null;
  function hideHint() { hint.hidden = true; hintTarget = null; }
  function showHint(event) {
    const target = event.target.closest("[data-tooltip]");
    if (!target?.dataset.tooltip || target === hintTarget) return;
    hintTarget = target;
    hint.textContent = target.dataset.tooltip;
    hint.hidden = false;
    const rect = target.getBoundingClientRect();
    const x = Math.max(hint.offsetWidth / 2 + 8, Math.min(innerWidth - hint.offsetWidth / 2 - 8, rect.x + rect.width / 2));
    const y = rect.top >= hint.offsetHeight + 16 ? rect.top - hint.offsetHeight - 8 : rect.bottom + 8;
    hint.style.left = `${x}px`;
    hint.style.top = `${Math.max(8, Math.min(innerHeight - hint.offsetHeight - 8, y))}px`;
  }
  for (const type of ["pointerover", "focusin"])
    root.addEventListener(type, showHint, { signal: hintController.signal });
  for (const type of ["pointerout", "focusout"])
    root.addEventListener(type, (event) => {
      if (!hintTarget?.contains(event.relatedTarget)) hideHint();
    }, { signal: hintController.signal });
  root.addEventListener("pointerdown", hideHint, { signal: hintController.signal });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideHint();
  }, { signal: hintController.signal });
  root.addEventListener("scroll", hideHint, { capture: true, signal: hintController.signal });
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
    $("#plant-count").textContent =
      `${state.plants.length} planted · max ${MAX_PLANTS}`;
    const empty = state.plants.length === 0;
    $(".terrarium-column").dataset.empty = String(empty);
    $("#metrics-guide").hidden = empty;
    if (empty) {
      $("#metrics-guide").open = false;
    }
    $("#environment-title").textContent = empty
      ? "Ready to plant?"
      : state.plants.some((p) => p.dead) ? "Garden status" : "Feeling good?";
    const stressed = state.plants.filter(
      (p) => !p.dead && conditionsFor(state, p).comfort < 0.55,
    ).length;
    $("#terrarium-title").textContent =
      state.plants.length === 0
        ? selected
          ? `Place your ${SPECIES[selected].name}`
          : "Your little garden"
        : state.plants.every((p) => p.dead)
          ? "A fresh start?"
          : stressed && state.day > 1
          ? "A little care today"
          : state.day > 1
            ? "Growing together!"
            : state.plants.length === MAX_PLANTS
              ? "Your little jungle!"
              : "Make it your own!";
    $(".environment").dataset.density =
      state.plants.length >= 4 ? "compact" : "normal";
    $("#next-day-hint").hidden = state.plants.length > 0;
    $("#light-handle").disabled = busy;
    $("#next-day").disabled = state.plants.length === 0 || busy;
    $("#next-day").dataset.tooltip =
      state.plants.length === 0 ? "Plant at least one to begin" : "";
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
      card.disabled = busy || state.plants.length >= MAX_PLANTS;
      card.querySelector(".card-check").textContent = state.plants.filter(
        (p) => p.species === id,
      ).length;
      card.querySelector(".plant-availability").textContent = planted
        ? "Planted"
        : selected === id
          ? "Placing"
          : "Available";
    }
    for (const key of ["radius", "power"]) {
      const input = $("#lamp-" + key);
      input.value = state.lamp[key];
      input.disabled = busy;
      $("#lamp-" + key + "-value").textContent =
        key === "radius"
          ? `${Math.round(((state.lamp.radius - 0.3) / 0.85) * 100)}%`
          : `${Math.round(state.lamp.power)}%`;
    }
    const conditions = $("#plant-conditions");
    for (const e of [...conditions.querySelectorAll(".condition-card")])
      if (!state.plants.some((p) => p.id === e.dataset.condition)) e.remove();
    conditions.querySelector(".conditions-empty")?.remove();
    if (!state.plants.length)
      conditions.innerHTML = `<div class="conditions-empty"><span class="empty-sprout">${icon("leaf")}</span><p>The soil starts at 60% moisture.</p></div>`;
    for (const plant of state.plants) {
      const c = conditionsFor(state, plant);
      let card = conditions.querySelector(`[data-condition="${plant.id}"]`);
      if (!card) {
        card = document.createElement("article");
        card.className = "condition-card";
        card.dataset.condition = plant.id;
        card.innerHTML = `<div class="condition-top"><h4>${SPECIES[plant.species].name} <small>${plant.id.split("-")[1]}</small><button type="button" class="plant-remove" data-remove="${plant.id}" aria-label="Remove ${SPECIES[plant.species].name} ${plant.id.split("-")[1]}" data-tooltip="Remove plant">×</button></h4><div class="comfort-value"><span>Comfort now</span><strong><b>0</b>%</strong><em class="death-label" hidden>Dead</em></div></div><div class="meter" role="meter" aria-label="Current comfort of ${SPECIES[plant.species].name} ${plant.id.split("-")[1]}" aria-valuemin="0" aria-valuemax="100"><div></div></div><div class="condition-middle"><span class="status-badge"></span></div><div class="live-advice"></div><div class="local-values"><span class="health-value">${icon("heart")}<span>Health</span><strong>70</strong></span><span class="growth-value" data-tooltip="Accumulated growth; updates after Next Day">${icon("leaf")}<span>Growth</span><b></b><small>%</small></span></div><p class="daily-change" hidden></p>`;
        conditions.append(card);
      }
      card.dataset.status =
        plant.dead ? "dead" : c.comfort >= 0.8
          ? "comfortable"
          : c.comfort >= 0.55
            ? "adjust"
            : "stressed";
      card.dataset.critical = String(!plant.dead && plant.criticalDays > 0);
      const deadLabel = card.querySelector(".death-label");
      deadLabel.hidden = !plant.dead;
      deadLabel.dataset.tooltip = "This plant has dried out. Remove it or reset to start again.";
      card.querySelector(".comfort-value > span").hidden = !!plant.dead;
      card.querySelector(".comfort-value > strong").hidden = !!plant.dead;
      card.querySelector(".meter").hidden = !!plant.dead;
      card.querySelector(".local-values").hidden = !!plant.dead;
      animateNumber(card.querySelector(".comfort-value b"), c.percent);
      card
        .querySelector(".comfort-value")
        .setAttribute("aria-label", plant.dead ? `Dead; dried out on Day ${plant.diedOnDay}` : `Comfort now: ${c.percent} percent`);
      card.querySelector(".meter").setAttribute("aria-valuenow", c.percent);
      const advice = plant.dead
        ? [{ key: "dead", cause: `Dried out · Day ${String(plant.diedOnDay).padStart(2, "0")}` }]
        : liveAdvice(plant.species, c.moisture, c.light);
      if (!plant.dead && plant.criticalDays > 0)
        advice.unshift({ key: "critical", cause: "Critical" });
      const adviceHTML = advice
        .map((a) => `<p data-cause="${a.key}"><strong>${a.cause}</strong></p>`)
        .join("");
      const adviceElement = card.querySelector(".live-advice");
      if (adviceElement.innerHTML !== adviceHTML)
        adviceElement.innerHTML = adviceHTML;
      card.querySelector(".meter div").style.width = `${c.percent}%`;
      card.querySelector(".status-badge").textContent =
        c.comfort >= 0.8
          ? "Happy here"
          : c.comfort >= 0.55
            ? "A little adjustment"
            : "Feeling stressed";
      card.querySelector(".health-value strong").textContent = plant.health;
      card.querySelector(".growth-value b").textContent = plant.growth;
      card.querySelector("[data-remove]").disabled = busy;
      const note = card.querySelector(".daily-change");
      note.hidden = plant.dead || !plant.lastChange;
      if (plant.lastChange) {
        note.textContent = dayRecord(plant.lastChange);
        note.dataset.tooltip = `Recorded on Day ${plant.lastChange.day}: ${plant.lastChange.reason}; growth +${plant.lastChange.growth}. Not a forecast.`;
      }
    }
  }
  $("#confirm-dialog").addEventListener("close", () => {
    if ($("#confirm-dialog").returnValue === "confirm") pendingConfirmation?.();
    pendingConfirmation = null;
  });
  function positionPopup(element, anchor, beside = false) {
    const container = $("#scene-container");
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const margin = 8;
    let x = anchor.x;
    let y = anchor.y - height - 12;
    if (beside) {
      const roomRight = anchor.x + width + 18 <= container.clientWidth - margin;
      x += (roomRight ? 1 : -1) * (width / 2 + 18);
      y = anchor.y - height / 2;
    }
    element.style.left = `${Math.max(width / 2 + margin, Math.min(container.clientWidth - width / 2 - margin, x))}px`;
    element.style.top = `${Math.max(margin, Math.min(container.clientHeight - height - margin, y))}px`;
  }
  return {
    $,
    render,
    thumbnails(images) {
      for (const [id, url] of Object.entries(images))
        $(`[data-species="${id}"] img`).src = url;
    },
    select(id) {
      selected = id;
      $("#light-handle").style.pointerEvents =
        id || tool !== "lamp" ? "none" : "auto";
      $("#placement-help").hidden = !id;
      $("#placement-help").textContent = id
        ? `${SPECIES[id].name} selected`
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
      $("#light-handle").style.pointerEvents =
        value === "lamp" ? "auto" : "none";
      $("#light-handle").classList.toggle("active", value === "lamp");
    },
    hover(message, position) {
      const e = $("#tool-hover");
      const opening = e.hidden || e.textContent !== message;
      e.hidden = !message;
      if (message) {
        e.textContent = message;
        // Keep the popup still for the full hover, including the can's lift.
        if (opening) positionPopup(e, position, true);
      }
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
    preview(species, point, percent, position, error = null) {
      const e = $("#placement-preview");
      e.hidden = !point;
      if (point) {
        e.innerHTML = `<strong>${SPECIES[species].name}<span>${error || `${percent}% comfort`}</span></strong>`;
        positionPopup(e, { x: position.x, y: position.y - 28 });
      }
    },
    waterPreview(valid, position) {
      const e = $("#placement-preview");
      e.hidden = !valid;
      if (valid) {
        e.innerHTML = "<strong>A little rain, right here.</strong>";
        positionPopup(e, { x: position.x, y: position.y - 22 });
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
          : "Restore all plants, including dried ones, in their spots. Reset water, light, health and growth.";
      $("#confirm-action").textContent =
        kind === "clear" ? "Clear jar" : "Start again";
      $("#confirm-dialog").returnValue = "";
      $("#confirm-dialog").showModal();
    },
    dispose() {
      hintController.abort();
      hint.remove();
      clearTimeout(toastTimer);
      clearTimeout(collectionTimer);
      clearTimeout(collectionDelay);
      cancelAnimationFrame(collectionFrame);
      cancelAnimationFrame(numberFrame);
    },
  };
}
