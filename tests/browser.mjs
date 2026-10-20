import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import { SLOTS } from "../src/simulation/species.js";
import {
  surfaceHeight,
  INITIAL_LAMP,
  SOIL_POINTS,
  WATER_RADIUS,
} from "../src/simulation/environment.js";
import {
  conditionsFor,
  nextDay,
  moistureAt,
} from "../src/simulation/simulation.js";
const url = process.env.TERRARIUM_TEST_URL || "http://127.0.0.1:5174";
const browser = await chromium.launch({ headless: true }),
  page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
const errors = [],
  results = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const appCall = (fn, arg) =>
  page.evaluate(
    async ({ source, arg }) => {
      const app = await import(
        document.querySelector('script[src*="/src/main.js"]').src
      );
      return new Function("app", "arg", source)(app, arg);
    },
    { source: fn, arg },
  );
const read = () => appCall("return app.getSnapshot();");
const point = (x, y, z) =>
  page.evaluate(
    async ({ x, y, z }) => {
      const app = await import(
        document.querySelector('script[src*="/src/main.js"]').src
      );
      const THREE = await import("/node_modules/three/build/three.module.js");
      const w = app.inspectScene(),
        r = w.renderer.domElement.getBoundingClientRect(),
        p = w.project(new THREE.Vector3(x, y, z));
      return { x: r.x + p.x, y: r.y + p.y };
    },
    { x, y, z },
  );
const sameCamera = (actual, expected) =>
  actual.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) < 1e-5));
// Projection uses the live camera; interaction still goes through real pointer events and Raycaster.
const ground = (i) =>
  point(SLOTS[i].x, surfaceHeight(SLOTS[i].x, SLOTS[i].z), SLOTS[i].z);
const settle = () => page.waitForTimeout(350);
async function check(name, fn) {
  await fn();
  results.push({ name, status: "passed" });
  console.log("✓ " + name);
}
async function drag(from, to, release = true) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 16 });
  if (release) await page.mouse.up();
}
async function dragCard(species, to, release = true) {
  const r = await page.locator(`[data-species="${species}"]`).boundingBox();
  await drag({ x: r.x + r.width / 2, y: r.y + r.height / 3 }, to, release);
}
async function openCollection() {
  if (await page.locator("#collection-open").isVisible()) {
    await page.locator("#collection-open").click();
    await settle();
  }
}
async function put(species, slot) {
  await openCollection();
  await page.locator(`[data-species="${species}"]`).click();
  await page.locator(`[data-slot="${slot}"]`).click();
  await settle();
}
async function closeTool() {
  if (await page.locator("#tool-close").isVisible())
    await page.locator("#tool-close").click();
}
async function waitCan() {
  await page.waitForFunction(
    async () => {
      const a = await import(
          document.querySelector('script[src*="/src/main.js"]').src
        ),
        c = a.inspectScene().wateringCan;
      return !c.pouring && !c.moving;
    },
    {},
    { timeout: 8000 },
  );
}
async function confirm(kind) {
  await page.locator("#" + kind + "-button").click();
  await page.locator("#confirm-action").click();
  await settle();
}
async function assertUI(s) {
  await settle();
  for (const p of s.plants) {
    const c = conditionsFor(s, p),
      card = page.locator(`[data-condition="${p.species}"]`);
    assert.equal(
      Number(await card.locator(".water-value b").innerText()),
      Math.round(c.moisture),
    );
    assert.equal(
      Number(await card.locator(".light-value b").innerText()),
      Math.round(c.light),
    );
    assert.equal(
      Number(await card.locator(".comfort-value b").innerText()),
      c.percent,
    );
    assert.equal(
      Number(await card.locator(".health-value strong").innerText()),
      p.health,
    );
    assert.equal(
      Number(await card.locator(".growth-value b").innerText()),
      p.growth,
    );
  }
  assert.equal(
    Number(await page.locator("#moisture-number").innerText()),
    Math.round(s.soilMoisture),
  );
}
await mkdir("test-results", { recursive: true });
await mkdir("docs/screenshots", { recursive: true });
try {
  await page.goto(url);
  await page.waitForSelector("#scene-loading[hidden]", { state: "attached" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1300);
  await check(
    "illustrated UI, four unique live-model thumbnails and empty experiment",
    async () => {
      assert.equal(await page.locator("canvas").count(), 1);
      const src = await page
        .locator(".plant-thumbnail")
        .evaluateAll((imgs) => imgs.map((i) => (i.naturalWidth ? i.src : "")));
      assert.equal(src.length, 4);
      assert.ok(src.every((s) => s.startsWith("data:image/png")));
      assert.equal(new Set(src).size, 4);
      assert.equal((await read()).plants.length, 0);
      assert.ok(await page.locator("#next-day").isDisabled());
      assert.ok(await page.locator(".slot-picker").isHidden());
      assert.ok(await page.locator("#lamp-controls").isHidden());
    },
  );
  await page.screenshot({
    path: "docs/screenshots/empty-terrarium.png",
    fullPage: true,
  });
  await check(
    "actual plant drag previews local comfort and only commits on release",
    async () => {
      await dragCard("moss", await ground(0), false);
      assert.ok(await page.locator("#placement-preview").isVisible());
      assert.equal((await read()).plants.length, 0);
      await page.mouse.up();
      await settle();
      assert.equal((await read()).plants[0].slot, 0);
      assert.equal((await read()).plants[0].health, 70);
    },
  );
  await check(
    "outside drop, Escape and pointercancel do not plant or duplicate",
    async () => {
      await dragCard("fern", { x: 510, y: 75 });
      assert.equal((await read()).plants.length, 1);
      await dragCard("fittonia", await ground(1), false);
      await page.keyboard.press("Escape");
      await page.mouse.up();
      assert.equal((await read()).plants.length, 1);
      await dragCard("fittonia", await ground(1), false);
      await page
        .locator("canvas")
        .dispatchEvent("pointercancel", { pointerId: 1 });
      await page.mouse.up();
      assert.equal((await read()).plants.length, 1);
      assert.ok(await page.locator("#placement-preview").isHidden());
    },
  );
  await check(
    "keyboard planting, three-species capacity and per-plant numeric readouts",
    async () => {
      await page.locator('[data-species="fern"]').focus();
      await page.keyboard.press("Enter");
      await page.locator('[data-slot="2"]').focus();
      await page.keyboard.press("Enter");
      await put("succulent", 1);
      assert.equal((await read()).plants.length, 3);
      assert.ok(await page.locator(".collection").isHidden());
      const wide = await page.locator("canvas").boundingBox();
      await openCollection();
      const narrow = await page.locator("canvas").boundingBox();
      assert.ok(wide.width > narrow.width + 200);
      const saved = await read();
      await page.locator("#collection-close").click();
      assert.ok(await page.locator(".collection").isHidden());
      await openCollection();
      assert.deepEqual(await read(), saved);
      assert.equal(await page.locator("#journal-title").count(), 0);
      await page.locator('[data-species="fittonia"]').click();
      await page.locator('[data-slot="0"]').click();
      assert.equal((await read()).plants.length, 3);
      assert.ok(await page.locator("#next-day").isEnabled());
      await assertUI(await read());
      await page.keyboard.press("Escape");
    },
  );
  await check(
    "dragged water can shows a bounded target and keeps state unchanged before release",
    async () => {
      const before = await read();
      await drag(await point(-1.89, 0.32, 1.03), await ground(0), false);
      await page.waitForTimeout(650);
      assert.deepEqual((await read()).moisture, before.moisture);
      assert.ok(await page.locator("#placement-preview").isVisible());
      assert.ok(
        await appCall(
          "return app.inspectScene().wateringCan.footprint.mesh.visible;",
        ),
      );
      await page.screenshot({
        path: "docs/screenshots/local-water-preview.png",
      });
      await page.mouse.up();
      await settle();
      const after = await read();
      assert.ok(moistureAt(after, SLOTS[0]) > 82);
      assert.equal(Math.round(moistureAt(after, SLOTS[1])), 60);
      assert.equal(Math.round(moistureAt(after, SLOTS[2])), 60);
      assert.deepEqual(after.plants, before.plants);
      assert.equal(after.day, 1);
      SOIL_POINTS.forEach((p, i) => {
        if (
          Math.hypot(p.x - SLOTS[0].x, p.z - SLOTS[0].z) >
          WATER_RADIUS + 0.04
        )
          assert.equal(after.moisture[i], before.moisture[i]);
      });
      await assertUI(after);
      await waitCan();
    },
  );
  await check(
    "water cancellation and off-jar drops preserve every soil sample",
    async () => {
      await closeTool();
      const before = await read();
      await drag(await point(-1.89, 0.32, 1.03), await ground(1), false);
      await page.keyboard.press("Escape");
      await page.mouse.up();
      assert.deepEqual((await read()).moisture, before.moisture);
      await waitCan();
      await drag(await point(-1.89, 0.32, 1.03), { x: 450, y: 75 });
      assert.deepEqual((await read()).moisture, before.moisture);
      await closeTool();
      await waitCan();
    },
  );
  await check(
    "free watering between plants covers both roots and has no fixed-slot picker",
    async () => {
      await page.locator("#water-button").click();
      assert.ok(await page.locator(".slot-picker").isHidden());
      const before = await read();
      const x = (SLOTS[0].x + SLOTS[1].x) / 2;
      const z = (SLOTS[0].z + SLOTS[1].z) / 2;
      const p = await point(x, surfaceHeight(x, z), z);
      await page.mouse.click(p.x, p.y);
      await settle();
      const after = await read();
      assert.ok(
        moistureAt(after, SLOTS[0]) > moistureAt(before, SLOTS[0]) + 10,
      );
      assert.ok(
        moistureAt(after, SLOTS[1]) > moistureAt(before, SLOTS[1]) + 10,
      );
      assert.ok(after.moisture.some((v) => v === 60));
      assert.ok(after.plants.every((p) => p.health === 70));
      await waitCan();
      await closeTool();
    },
  );
  await check(
    "existing plants exchange actual 3D slots while moisture stays in the terrain",
    async () => {
      const before = await read(),
        camera = await appCall(
          "return app.inspectScene().camera.position.toArray();",
        );
      const a = SLOTS[0],
        from = await point(a.x, surfaceHeight(a.x, a.z) + 0.17, a.z);
      await drag(from, await ground(2));
      await settle();
      const after = await read();
      assert.equal(after.plants.find((p) => p.species === "moss").slot, 2);
      assert.equal(after.plants.find((p) => p.species === "fern").slot, 0);
      assert.deepEqual(after.moisture, before.moisture);
      assert.deepEqual(
        after.plants.map((p) => [p.health, p.growth]),
        before.plants.map((p) => [p.health, p.growth]),
      );
      assert.equal(
        Math.round(
          conditionsFor(
            after,
            after.plants.find((p) => p.species === "moss"),
          ).moisture,
        ),
        Math.round(moistureAt(before, SLOTS[2])),
      );
      sameCamera(
        await appCall("return app.inspectScene().camera.position.toArray();"),
        camera,
      );
      await assertUI(after);
    },
  );
  await check(
    "planted collection cards can select and move a plant without duplication",
    async () => {
      await openCollection();
      await page.locator('[data-species="moss"]').focus();
      await page.keyboard.press("Enter");
      await page.locator('[data-slot="0"]').click();
      assert.equal((await read()).plants.length, 3);
      assert.equal(
        (await read()).plants.find((p) => p.species === "moss").slot,
        0,
      );
    },
  );
  await check(
    "lamp aim follows a real pointer drag across the soil",
    async () => {
      await page.locator("#lamp-button").click();
      const before = await read(),
        from = await point(
          before.lamp.target.x,
          surfaceHeight(before.lamp.target.x, before.lamp.target.z),
          before.lamp.target.z,
        );
      await drag(from, await ground(1));
      const after = await read();
      assert.ok(
        Math.hypot(
          after.lamp.target.x - SLOTS[1].x,
          after.lamp.target.z - SLOTS[1].z,
        ) < 0.04,
      );
      assert.deepEqual(after.moisture, before.moisture);
      assert.deepEqual(after.plants, before.plants);
      await assertUI(after);
    },
  );
  await check(
    "narrow beam isolates a plant; zero/max power update both the real source and all readouts",
    async () => {
      await page.locator("#lamp-radius").focus();
      await page.keyboard.press("Home");
      await page.locator("#lamp-power").focus();
      await page.keyboard.press("End");
      await settle();
      let s = await read();
      assert.equal(s.lamp.radius, 0.3);
      assert.equal(s.lamp.power, 100);
      assert.ok(
        conditionsFor(
          s,
          s.plants.find((p) => p.species === "succulent"),
        ).light > 75,
      );
      assert.equal(
        conditionsFor(
          s,
          s.plants.find((p) => p.species === "moss"),
        ).light,
        20,
      );
      await page.locator("#lamp-power").focus();
      await page.keyboard.press("Home");
      await settle();
      s = await read();
      assert.equal(s.lamp.power, 0);
      assert.equal(
        await appCall("return app.inspectScene().lamp.light.intensity;"),
        0,
      );
      assert.equal(
        await appCall("return app.inspectScene().lamp.footprint.mesh.visible;"),
        false,
      );
      assert.ok(s.plants.every((p) => conditionsFor(s, p).light === 20));
      await assertUI(s);
      await page.screenshot({ path: "test-results/lamp-off.png" });
      await page.keyboard.press("End");
      await page.locator("#lamp-radius").focus();
      await page.keyboard.press("End");
      await settle();
      assert.equal((await read()).lamp.radius, 1.15);
    },
  );
  await check(
    "lamp orbit and extension controls keep fixture, source and camera synchronized",
    async () => {
      const cam = await appCall(
        "return app.inspectScene().camera.position.toArray();",
      );
      await page.locator("#lamp-azimuth").focus();
      await page.keyboard.press("Home");
      await settle();
      assert.equal((await read()).lamp.azimuth, -180);
      await page.keyboard.press("ArrowRight");
      assert.equal((await read()).lamp.azimuth, -179);
      await page.locator("#lamp-reach").focus();
      await page.keyboard.press("Home");
      assert.equal((await read()).lamp.reach, 0);
      const startTarget = (await read()).lamp.target;
      await page.keyboard.press("End");
      const end = await read();
      assert.equal(end.lamp.reach, 1.45);
      assert.ok(
        Math.hypot(
          end.lamp.target.x - startTarget.x,
          end.lamp.target.z - startTarget.z,
        ) > 0.5,
      );
      const aim = await appCall(
        "const l=app.inspectScene().lamp,p=l.footprint.mesh.geometry.attributes.position;return {x:p.getX(0),z:p.getZ(0),target:l.light.target.position.toArray()};",
      );
      assert.ok(Math.abs(aim.x - end.lamp.target.x) < 1e-6);
      assert.ok(Math.abs(aim.z - end.lamp.target.z) < 1e-6);
      assert.equal(aim.target[0], end.lamp.target.x);
      assert.equal(aim.target[2], end.lamp.target.z);
      sameCamera(
        await appCall("return app.inspectScene().camera.position.toArray();"),
        cam,
      );
      const source = await appCall(
        "const w=app.inspectScene(),f=w.lamp.frame,p=w.lamp.light.position;return {actual:p.toArray(),expected:[f.emitter.x,f.emitter.y,f.emitter.z]};",
      );
      source.actual.forEach((v, i) =>
        assert.ok(Math.abs(v - source.expected[i]) < 1e-8),
      );
      await assertUI(await read());
    },
  );
  await check(
    "dragging the 3D lamp head changes its world orbit and reach",
    async () => {
      const from = await appCall(
        "const w=app.inspectScene(),h=w.lamp.head;const p=h.position.clone().addScaledVector({x:w.lamp.frame.direction.x,y:w.lamp.frame.direction.y,z:w.lamp.frame.direction.z},.17);const q=w.project(p),r=w.renderer.domElement.getBoundingClientRect();return {x:q.x+r.x,y:q.y+r.y};",
      );
      const before = await read();
      await drag(from, await point(1.4, 2.95, 0.45));
      await settle();
      const s = await read();
      assert.ok(
        Math.abs(s.lamp.azimuth - 72.18) < 4,
        `azimuth ${s.lamp.azimuth}`,
      );
      assert.ok(Math.abs(s.lamp.reach - 0.55) < 0.08);
      assert.deepEqual(s.plants, before.plants);
      await assertUI(s);
    },
  );
  await check(
    "Escape restores a lamp gesture that has not been committed",
    async () => {
      const before = await read();
      const from = await point(
        before.lamp.target.x,
        surfaceHeight(before.lamp.target.x, before.lamp.target.z),
        before.lamp.target.z,
      );
      await drag(from, await ground(2), false);
      await page.keyboard.press("Escape");
      await page.mouse.up();
      assert.deepEqual((await read()).lamp, before.lamp);
    },
  );
  await check(
    "Next Day applies spatial drying and growth once during its repeat-click guard",
    async () => {
      await closeTool();
      const before = await read(),
        expected = nextDay(before);
      await page.locator("#next-day").click();
      assert.ok(await page.locator("#next-day").isDisabled());
      await page.locator("#next-day").evaluate((e) => {
        e.click();
        e.click();
      });
      await page.waitForTimeout(850);
      const after = await read();
      assert.deepEqual(after, expected);
      await assertUI(after);
      assert.ok(after.soilMoisture < before.soilMoisture);
    },
  );
  await check(
    "orbit changes the camera and visible view without changing the environment",
    async () => {
      const before = await read(),
        cam = await appCall(
          "return app.inspectScene().camera.position.toArray();",
        ),
        r = await page.locator("canvas").boundingBox();
      await drag(
        { x: r.x + r.width * 0.12, y: r.y + r.height * 0.15 },
        { x: r.x + r.width * 0.39, y: r.y + r.height * 0.24 },
      );
      await page.waitForTimeout(600);
      assert.deepEqual(await read(), before);
      assert.notDeepEqual(
        await appCall("return app.inspectScene().camera.position.toArray();"),
        cam,
      );
      await page.screenshot({ path: "test-results/orbited.png" });
      await page.locator("#camera-reset").click();
      await settle();
    },
  );
  await check(
    "reset confirmation preserves arrangement but resets all local fields and lamp controls",
    async () => {
      const before = await read();
      await page.locator("#collection-close").click();
      await page.locator("#reset-button").click();
      await page.keyboard.press("Escape");
      assert.deepEqual(await read(), before);
      assert.ok(await page.locator(".collection").isHidden());
      await confirm("reset");
      assert.ok(await page.locator(".collection").isVisible());
      const s = await read();
      assert.equal(s.day, 1);
      assert.ok(s.moisture.every((v) => v === 60));
      assert.deepEqual(s.lamp, INITIAL_LAMP);
      assert.deepEqual(
        s.plants.map((p) => [p.species, p.slot]),
        before.plants.map((p) => [p.species, p.slot]),
      );
      assert.ok(s.plants.every((p) => p.health === 70 && p.growth === 20));
      await assertUI(s);
    },
  );
  await check(
    "real lamp-only lighting reaches receivers and returns safely to studio lighting",
    async () => {
      await page.locator("#lamp-button").click();
      await page.locator('[data-slot="1"]').click();
      await page.locator("#lamp-radius").focus();
      await page.keyboard.press("Home");
      await page.locator("#lamp-power").focus();
      await page.keyboard.press("End");
      const before = await read();
      await appCall(
        "const w=app.inspectScene();w.studioLights.forEach(l=>l.visible=false);w.invalidate();",
      );
      await settle();
      await page.screenshot({ path: "test-results/lamp-only.png" });
      await page.locator("#lamp-power").focus();
      await page.keyboard.press("Home");
      await settle();
      await page.screenshot({ path: "test-results/all-sources-off.png" });
      await page.keyboard.press("End");
      await appCall(
        "const w=app.inspectScene();w.studioLights.forEach(l=>l.visible=true);w.invalidate();",
      );
      assert.deepEqual((await read()).lamp, before.lamp);
      await closeTool();
    },
  );
  await check(
    "idle scene stops submitting frames and resumes after a control change",
    async () => {
      await page.waitForTimeout(2300);
      const a = await appCall(
        "return app.inspectScene().renderer.info.render.frame;",
      );
      await page.waitForTimeout(300);
      const b = await appCall(
        "return app.inspectScene().renderer.info.render.frame;",
      );
      assert.equal(a, b);
      await page.locator("#camera-reset").click();
      await settle();
      assert.ok(
        (await appCall(
          "return app.inspectScene().renderer.info.render.frame;",
        )) > b,
      );
    },
  );
  await check(
    "clear resets everything and the fourth species can be planted",
    async () => {
      await page.locator("#collection-close").click();
      await confirm("clear");
      assert.ok(await page.locator(".collection").isVisible());
      const s = await read();
      assert.equal(s.plants.length, 0);
      assert.equal(s.day, 1);
      assert.ok(s.moisture.every((v) => v === 60));
      assert.deepEqual(s.lamp, INITIAL_LAMP);
      await put("fittonia", 0);
      await put("moss", 1);
      await put("fern", 2);
      await page.waitForTimeout(1400);
      await page.screenshot({
        path: "docs/screenshots/three-species.png",
        fullPage: true,
      });
    },
  );
  await check(
    "mobile layout and contextual keyboard/tap alternatives remain usable",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await settle();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await confirm("clear");
      await put("moss", 0);
      await put("fern", 2);
      await page.locator("#water-button").click();
      await page.locator("canvas").focus();
      await page.keyboard.press("ArrowLeft");
      await page.keyboard.press("Enter");
      await settle();
      assert.ok(moistureAt(await read(), { x: -0.12, z: 0 }) > 82);
      await page.screenshot({
        path: "test-results/mobile.png",
        fullPage: true,
      });
      await waitCan();
    },
  );
  // A fresh controlled demonstration for the user-facing screenshot.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await page.waitForSelector("#scene-loading[hidden]", { state: "attached" });
  await put("moss", 0);
  await put("succulent", 1);
  await put("fern", 2);
  await page.waitForTimeout(1400);
  await page.screenshot({
    path: "docs/screenshots/planted-terrarium.png",
    fullPage: true,
  });
  await check(
    "no JavaScript or WebGL shader/console errors during the complete workflow",
    async () => assert.deepEqual(errors, []),
  );
  await writeFile(
    "test-results/browser-report.json",
    JSON.stringify(
      { date: new Date().toISOString(), results, errors },
      null,
      2,
    ),
  );
  console.log(`\n${results.length} browser acceptance checks passed.`);
} catch (error) {
  await page.screenshot({ path: "test-results/failure.png", fullPage: true });
  await writeFile(
    "test-results/browser-report.json",
    JSON.stringify({ results, errors, failure: error.message }, null, 2),
  );
  throw error;
} finally {
  await browser.close();
}
