import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import {
  DEV_URL,
  appCall,
  snapshot,
  point,
  drag,
  put,
  settle,
  closeTool,
} from "./browserHelpers.mjs";
import { POINTS } from "./fixtures.mjs";
const browser = await chromium.launch({
  headless: true,
  args: process.env.TERRARIUM_GPU === "metal" ? ["--use-angle=metal"] : [],
});
const results = [],
  errors = [];
async function modelPoint(page, kind) {
  return page.evaluate(async (kind) => {
    const app = await import(
        document.querySelector('script[src*="/src/main.js"]').src
      ),
      THREE = await import("/node_modules/three/build/three.module.js"),
      w = app.inspectScene(),
      p = new THREE.Vector3();
    if (kind === "water") {
      w.wateringCan.group.getWorldPosition(p);
      p.y += 0.25;
    } else w.lamp.head.children[0].getWorldPosition(p);
    const q = w.project(p),
      r = w.renderer.domElement.getBoundingClientRect();
    return { x: r.x + q.x, y: r.y + q.y };
  }, kind);
}
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(DEV_URL);
  await page.waitForSelector("#scene-loading[hidden]", { state: "attached" });
  await mkdir("test-results", { recursive: true });
  assert.equal(
    await page
      .locator("#planting-guide,.tool-dock,#tool-hint,.light-handle-label")
      .count(),
    0,
  );
  await put(page, "moss", POINTS[0]);
  await put(page, "fern", POINTS[2]);
  await settle(page, 1500);
  assert.equal(
    await page.locator("#plant-count").innerText(),
    "2 planted · max 5",
  );
  assert.match(
    await page.locator(".collection-bottom").innerText(),
    /One plant is enough/,
  );
  assert.ok(await page.locator("#camera-reset").isVisible());
  assert.match(
    await page.locator(".view-controls").innerText(),
    /Hold right mouse/,
  );
  const water = await modelPoint(page, "water");
  const initial = await snapshot(page);
  await page.mouse.move(water.x, water.y);
  await settle(page, 500);
  assert.equal(
    await page.locator("canvas").evaluate((e) => e.style.cursor),
    "grab",
  );
  assert.match(await page.locator("#tool-hover").innerText(), /Drag the can/);
  assert.deepEqual(
    await snapshot(page),
    initial,
    "Hover must not change ecological state",
  );
  const highlighted = await appCall(
    page,
    "const g=app.inspectScene().wateringCan.group;let shells=0,changed=0;g.traverse(o=>{if(o.userData.hoverOutline&&o.visible)shells++;if(o.material?.emissive?.getHex())changed++});return {shells,changed,y:g.position.y};",
  );
  assert.ok(highlighted.shells > 0);
  assert.equal(
    highlighted.changed,
    0,
    "Hover preserves original material colors",
  );
  assert.ok(
    highlighted.y > 0.015,
    "The can lifts a small distance: " + JSON.stringify(highlighted),
  );
  await page.screenshot({ path: "test-results/tools-water-hover.png" });
  const canvas = await page.locator("canvas").boundingBox();
  await page.mouse.move(canvas.x + 20, canvas.y + 15);
  await settle(page, 500);
  assert.ok(await page.locator("#tool-hover").isHidden());
  assert.ok(
    Math.abs(
      (await appCall(
        page,
        "return app.inspectScene().wateringCan.group.position.y;",
      )) + 0.025,
    ) < 0.006,
  );
  results.push(
    "Water hover highlights, grab cursor and a short tooltip leave data unchanged",
  );
  await drag(page, water, await point(page, { x: 0, z: 0.35 }));
  await settle(page, 250);
  assert.notDeepEqual((await snapshot(page)).moisture, initial.moisture);
  const lamp = await modelPoint(page, "lamp"),
    beforeLamp = await snapshot(page);
  await page.mouse.move(lamp.x, lamp.y);
  await settle(page, 120);
  assert.equal(
    await page.locator("canvas").evaluate((e) => e.style.cursor),
    "pointer",
  );
  await drag(page, lamp, { x: lamp.x + 45, y: lamp.y + 15 });
  assert.deepEqual(
    (await snapshot(page)).lamp,
    beforeLamp.lamp,
    "Lamp body selects controls; it does not move",
  );
  assert.ok(await page.locator("#lamp-controls").isVisible());
  assert.equal(await page.locator("[data-lamp]").count(), 2);
  assert.equal(await page.locator("#lamp-azimuth,#lamp-reach").count(), 0);
  results.push(
    "The fixed lamp is clickable, with only Range and Intensity exposed",
  );
  await page.screenshot({ path: "test-results/tools-lamp-hover.png" });
  let handle = await page.locator("#light-handle").boundingBox();
  const target = { x: 0.55, z: -0.22 };
  await drag(
    page,
    { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 },
    await point(page, target),
  );
  await settle(page, 180);
  let aimed = await snapshot(page);
  assert.ok(
    Math.hypot(aimed.lamp.target.x - target.x, aimed.lamp.target.z - target.z) <
      0.08,
    JSON.stringify({ target, actual: aimed.lamp.target }),
  );
  assert.equal(aimed.lamp.azimuth, initial.lamp.azimuth);
  assert.equal(aimed.lamp.reach, initial.lamp.reach);
  assert.deepEqual(
    aimed.plants.map((p) => p.health),
    initial.plants.map((p) => p.health),
  );
  const saved = structuredClone(aimed.lamp);
  handle = await page.locator("#light-handle").boundingBox();
  await drag(
    page,
    { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 },
    await point(page, { x: -0.5, z: 0.4 }),
    { release: false },
  );
  await page.keyboard.press("Escape");
  await page.mouse.up();
  assert.deepEqual((await snapshot(page)).lamp, saved);
  assert.equal(
    await appCall(page, "return app.inspectScene().controls.enabled;"),
    true,
  );
  results.push(
    "Direct light-handle dragging aims independently, preserves health and cancels exactly",
  );
  const previousCamera = await appCall(
    page,
    "return app.inspectScene().camera.position.toArray();",
  );
  const beforeOrbit = await snapshot(page);
  await drag(
    page,
    { x: canvas.x + 15, y: canvas.y + 30 },
    { x: canvas.x + 180, y: canvas.y + 60 },
    { button: "right" },
  );
  await settle(page, 500);
  assert.notDeepEqual(
    await appCall(page, "return app.inspectScene().camera.position.toArray();"),
    previousCamera,
  );
  assert.deepEqual(await snapshot(page), beforeOrbit);
  await page.locator("#lamp-button").focus();
  await page.keyboard.press("Enter");
  handle = await page.locator("#light-handle").boundingBox();
  const secondTarget = { x: -0.5, z: 0.25 };
  await drag(
    page,
    { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 },
    await point(page, secondTarget),
  );
  await settle(page, 120);
  aimed = await snapshot(page);
  assert.ok(
    Math.hypot(
      aimed.lamp.target.x - secondTarget.x,
      aimed.lamp.target.z - secondTarget.z,
    ) < 0.1,
    "Aim works from a rotated view",
  );
  await page.locator("#lamp-radius").fill("1.1");
  await page.locator("#lamp-radius").dispatchEvent("input");
  await page.locator("#lamp-power").fill("0");
  await page.locator("#lamp-power").dispatchEvent("input");
  assert.equal((await snapshot(page)).lamp.power, 0);
  assert.ok(await page.locator("#light-handle").isVisible());
  await page.locator("#light-handle").focus();
  await page.keyboard.press("Enter");
  const beforeKey = await snapshot(page);
  await page.keyboard.press("ArrowRight");
  assert.ok((await snapshot(page)).lamp.target.x > beforeKey.lamp.target.x);
  await page.locator("#camera-reset").click();
  await settle(page, 500);
  results.push(
    "Rotated views, power-off aiming, keyboard access and visible view reset work",
  );
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/tools-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await settle(page, 400);
  const fit = await page.evaluate(() => ({
    w: document.documentElement.scrollWidth,
    h: document.documentElement.scrollHeight,
    iw: innerWidth,
    ih: innerHeight,
    next: document.querySelector("#next-day").getBoundingClientRect().bottom,
  }));
  assert.ok(fit.w <= fit.iw && fit.h <= fit.ih && fit.next <= fit.ih);
  await page.screenshot({ path: "test-results/tools-mobile.png" });
  assert.deepEqual(errors, []);
  await writeFile(
    "test-results/tools-report.json",
    JSON.stringify({ results, fit, errors }, null, 2),
  );
  console.log(results.join("\n"));
} finally {
  await browser.close();
}
