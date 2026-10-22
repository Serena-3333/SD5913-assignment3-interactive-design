import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import {
  conditionsFor,
  nextDay,
  moistureAt,
} from "../src/simulation/simulation.js";
import {
  INITIAL_LAMP,
  SOIL_POINTS,
  WATER_RADIUS,
} from "../src/simulation/environment.js";
import {
  DEV_URL,
  appCall,
  snapshot,
  settle,
  point,
  drag,
  put,
  dragCard,
  openCollection,
  confirm,
  closeTool,
  waitCan,
} from "./browserHelpers.mjs";
const browser = await chromium.launch({
    headless: true,
    args: process.env.TERRARIUM_GPU === "metal" ? ["--use-angle=metal"] : [],
  }),
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [],
  results = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
const check = async (name, fn) => {
  await fn();
  results.push({ name, status: "passed" });
  console.log("✓ " + name);
};
const camera = () =>
  appCall(page, "return app.inspectScene().camera.position.toArray();");
async function assertUI(s) {
  await settle(page);
  for (const p of s.plants) {
    const c = conditionsFor(s, p),
      row = page.locator(`[data-condition="${p.id}"]`);
    assert.equal(
      Number(await row.locator(".comfort-value b").innerText()),
      c.percent,
    );
    assert.equal(
      Number(await row.locator(".health-value strong").innerText()),
      p.health,
    );
    assert.equal(
      Number(await row.locator(".growth-value b").innerText()),
      p.growth,
    );
  }
}
let first, second;
await mkdir("test-results", { recursive: true });
await mkdir("docs/screenshots", { recursive: true });
try {
  await page.goto(DEV_URL);
  await page.waitForSelector("#scene-loading[hidden]", { state: "attached" });
  await page.evaluate(() => document.fonts.ready);
  await settle(page, 1300);
  await check(
    "four model thumbnails, qualitative preferences, no fixed slots and an explained empty state",
    async () => {
      assert.equal(await page.locator("canvas").count(), 1);
      const src = await page
        .locator(".plant-thumbnail")
        .evaluateAll((es) => es.map((e) => (e.naturalWidth ? e.src : "")));
      assert.equal(new Set(src).size, 4);
      assert.ok(src.every((s) => s.startsWith("data:image/png")));
      assert.equal(await page.locator("[data-slot]").count(), 0);
      assert.equal(await page.locator("#scene-empty").count(), 0);
      assert.ok(
        !/\d/.test(
          await page
            .locator(".preferences")
            .allInnerTexts()
            .then((a) => a.join("")),
        ),
      );
      assert.ok(await page.locator("#next-day").isDisabled());
      assert.ok(await page.locator("#next-day-hint").isVisible());
    },
  );
  await page.screenshot({ path: "docs/screenshots/empty-terrarium.png" });
  await check(
    "left-dragging blank space does not rotate the camera",
    async () => {
      const c = await camera(),
        s = await snapshot(page),
        r = await page.locator("canvas").boundingBox();
      await drag(
        page,
        { x: r.x + 12, y: r.y + 30 },
        { x: r.x + 110, y: r.y + 75 },
      );
      await settle(page);
      assert.deepEqual(await camera(), c);
      assert.deepEqual(await snapshot(page), s);
    },
  );
  await check(
    "right-drag rotates the real view without changing environmental data",
    async () => {
      const c = await camera(),
        s = await snapshot(page),
        r = await page.locator("canvas").boundingBox();
      await drag(
        page,
        { x: r.x + 25, y: r.y + 40 },
        { x: r.x + 180, y: r.y + 90 },
        { button: "right" },
      );
      await settle(page, 600);
      assert.notDeepEqual(await camera(), c);
      assert.deepEqual(await snapshot(page), s);
      await page.locator("#camera-reset").click();
      await settle(page, 600);
    },
  );
  await check(
    "a card drag previews comfort and commits an arbitrary free coordinate only on release",
    async () => {
      const target = { x: -0.61, z: 0.32 };
      await dragCard(page, "moss", await point(page, target), false);
      assert.ok(await page.locator("#placement-preview").isVisible());
      assert.equal((await snapshot(page)).plants.length, 0);
      await page.mouse.up();
      await settle(page, 700);
      const s = await snapshot(page);
      first = s.plants[0].id;
      assert.ok(
        Math.hypot(
          s.plants[0].position.x - target.x,
          s.plants[0].position.z - target.z,
        ) < 0.04,
      );
      assert.equal(s.plants[0].health, 70);
    },
  );
  await check(
    "one plant can advance time and receives a truthful cause with its actual health change",
    async () => {
      const s = await snapshot(page),
        expected = nextDay(s);
      assert.ok(await page.locator("#next-day").isEnabled());
      assert.ok(await page.locator("#next-day-hint").isHidden());
      await page.locator("#next-day").click();
      assert.ok(await page.locator("#next-day").isDisabled());
      await page.locator("#next-day").evaluate((e) => {
        e.click();
        e.click();
      });
      await settle(page, 900);
      assert.deepEqual(await snapshot(page), expected);
      const note = await page
        .locator(`[data-condition="${first}"] .daily-change`)
        .innerText();
      assert.ok(
        (
          await page
            .locator(`[data-condition="${first}"] .daily-change`)
            .getAttribute("data-tooltip")
        ).includes(expected.plants[0].lastChange.reason),
      );
      assert.ok(
        note.includes(String(Math.abs(expected.plants[0].lastChange.health))),
      );
      await assertUI(expected);
    },
  );
  await check(
    "the same card adds a second independently tracked plant of that species",
    async () => {
      await put(page, "moss", { x: 0.51, z: 0.3 });
      const s = await snapshot(page);
      second = s.plants[1].id;
      assert.notEqual(first, second);
      assert.deepEqual(
        s.plants.map((p) => p.species),
        ["moss", "moss"],
      );
      assert.equal(
        await appCall(page, "return app.inspectScene().plants.size;"),
        2,
      );
      await assertUI(s);
    },
  );
  await check(
    "dragging one repeated plant hides/moves only that instance and keeps health/growth",
    async () => {
      const s = await snapshot(page),
        p = s.plants[0],
        c = await camera();
      await drag(
        page,
        await point(page, p.position, 0.13),
        await point(page, { x: -0.46, z: -0.57 }),
        { release: false },
      );
      await settle(page, 100);
      assert.deepEqual(await snapshot(page), s);
      assert.equal(
        await appCall(
          page,
          "return app.inspectScene().plants.get(arg).visible;",
          first,
        ),
        false,
      );
      assert.equal(
        await appCall(
          page,
          "return app.inspectScene().plants.get(arg).visible;",
          second,
        ),
        true,
      );
      await page.mouse.up();
      await settle(page, 650);
      const after = await snapshot(page);
      assert.ok(
        Math.hypot(
          after.plants[0].position.x + 0.46,
          after.plants[0].position.z + 0.57,
        ) < 0.05,
      );
      assert.deepEqual(after.plants[1], s.plants[1]);
      assert.equal(after.plants[0].health, p.health);
      assert.deepEqual(await camera(), c);
    },
  );
  await check(
    "overlap, outside drops, Escape and pointercancel leave formal plant state unchanged",
    async () => {
      const s = await snapshot(page);
      await drag(
        page,
        await point(page, s.plants[0].position, 0.13),
        await point(page, s.plants[1].position),
      );
      await settle(page);
      assert.deepEqual(await snapshot(page), s);
      await dragCard(page, "fern", { x: 500, y: 55 });
      assert.deepEqual(await snapshot(page), s);
      await dragCard(page, "fern", await point(page, { x: 0, z: 0 }), false);
      await page.keyboard.press("Escape");
      await page.mouse.up();
      assert.deepEqual(await snapshot(page), s);
      await dragCard(page, "fern", await point(page, { x: 0, z: 0 }), false);
      await page
        .locator("canvas")
        .dispatchEvent("pointercancel", { pointerId: 1 });
      await page.mouse.up();
      assert.deepEqual(await snapshot(page), s);
    },
  );
  await check(
    "drag watering stays local and covers both neighbouring roots at a free midpoint",
    async () => {
      const s = await snapshot(page),
        target = {
          x: (s.plants[0].position.x + s.plants[1].position.x) / 2,
          z: (s.plants[0].position.z + s.plants[1].position.z) / 2,
        };
      await drag(
        page,
        await point(page, { x: -1.89, z: 1.03 }, -0.32),
        await point(page, target),
        { release: false },
      );
      await settle(page, 650);
      assert.deepEqual((await snapshot(page)).moisture, s.moisture);
      assert.ok(
        await appCall(
          page,
          "return app.inspectScene().wateringCan.footprint.mesh.visible;",
        ),
      );
      await page.screenshot({
        path: "docs/screenshots/local-water-preview.png",
      });
      await page.mouse.up();
      await settle(page);
      const after = await snapshot(page);
      assert.ok(after.moisture.some((v, i) => v > s.moisture[i]));
      for (const p of s.plants)
        assert.ok(
          moistureAt(after, p.position) > moistureAt(s, p.position) + 5,
        );
      SOIL_POINTS.forEach((p, i) => {
        if (Math.hypot(p.x - target.x, p.z - target.z) > WATER_RADIUS + 0.05)
          assert.equal(after.moisture[i], s.moisture[i]);
      });
      assert.deepEqual(after.plants, s.plants);
      await waitCan(page);
      await closeTool(page);
    },
  );
  await check(
    "water cancellation preserves the soil field and returns the can",
    async () => {
      const s = await snapshot(page);
      await page.locator("#water-button").focus();
      await page.keyboard.press("Enter");
      const q = await point(page, { x: 0.4, z: -0.4 });
      await page.mouse.move(q.x, q.y);
      await page.mouse.down();
      await page.mouse.move(q.x + 12, q.y + 5);
      await page.keyboard.press("Escape");
      await page.mouse.up();
      assert.deepEqual((await snapshot(page)).moisture, s.moisture);
      await waitCan(page);
    },
  );
  await check(
    "range changes the light footprint while lamp body and aim stay fixed; intensity stays synchronized",
    async () => {
      await page.locator("#lamp-button").focus();
      await page.keyboard.press("Enter");
      await page.locator("#lamp-radius").focus();
      await page.keyboard.press("Home");
      const from = await snapshot(page);
      const initialEdge = await appCall(
        page,
        "return Array.from(app.inspectScene().lamp.footprint.mesh.geometry.attributes.position.array);",
      );
      await page.keyboard.press("End");
      const end = await snapshot(page);
      assert.deepEqual(end.lamp.target, from.lamp.target);
      assert.equal(end.lamp.azimuth, from.lamp.azimuth);
      assert.equal(end.lamp.reach, from.lamp.reach);
      const finalEdge = await appCall(
        page,
        "return Array.from(app.inspectScene().lamp.footprint.mesh.geometry.attributes.position.array);",
      );
      assert.ok(finalEdge.some((n, i) => Math.abs(n - initialEdge[i]) > 0.1));
      const v = await appCall(
        page,
        "const l=app.inspectScene().lamp,a=l.footprint.mesh.geometry.attributes.position;return {x:a.getX(0),z:a.getZ(0),target:l.light.target.position.toArray()};",
      );
      assert.ok(Math.abs(v.x - end.lamp.target.x) < 1e-6);
      assert.equal(v.target[2], end.lamp.target.z);
      await page.locator("#lamp-power").focus();
      await page.keyboard.press("Home");
      const off = await snapshot(page);
      assert.ok(off.plants.every((p) => conditionsFor(off, p).light === 20));
      assert.equal(
        await appCall(page, "return app.inspectScene().lamp.light.intensity;"),
        0,
      );
      assert.equal(
        await appCall(
          page,
          "return app.inspectScene().lamp.footprint.mesh.visible;",
        ),
        false,
      );
      await page.keyboard.press("End");
      assert.deepEqual((await snapshot(page)).plants, from.plants);
      await assertUI(await snapshot(page));
    },
  );
  await check(
    "aiming the lamp changes local light without changing health or the historical day explanation",
    async () => {
      const before = await snapshot(page),
        target = { x: 0.42, z: -0.39 };
      await drag(
        page,
        await point(page, before.lamp.target),
        await point(page, target),
      );
      await settle(page);
      const after = await snapshot(page);
      assert.ok(
        Math.hypot(
          after.lamp.target.x - target.x,
          after.lamp.target.z - target.z,
        ) < 0.05,
      );
      assert.deepEqual(after.plants, before.plants);
      await assertUI(after);
    },
  );
  await check(
    "Escape restores the whole uncommitted lamp pose and aim",
    async () => {
      const before = await snapshot(page);
      await drag(
        page,
        await point(page, before.lamp.target),
        await point(page, { x: -0.6, z: 0.3 }),
        { release: false },
      );
      await page.keyboard.press("Escape");
      await page.mouse.up();
      assert.deepEqual((await snapshot(page)).lamp, before.lamp);
      await closeTool(page);
    },
  );
  await check(
    "free placement supports five mixed/repeated plants and a delayed sliding drawer",
    async () => {
      await put(page, "fern", { x: -0.6, z: 0.38 });
      await put(page, "succulent", { x: 0, z: 0.05 });
      await openCollection(page);
      await page.locator('[data-species="moss"]').click();
      const q = await point(page, { x: 0.56, z: -0.48 });
      await page.mouse.click(q.x, q.y);
      assert.ok(await page.locator(".collection").isVisible());
      await page.waitForSelector("#plant-collection[hidden]", {
        state: "attached",
      });
      const s = await snapshot(page);
      assert.equal(s.plants.length, 5);
      assert.equal(
        await appCall(page, "return app.inspectScene().plants.size;"),
        5,
      );
      assert.equal(await page.locator(".condition-card").count(), 5);
      await openCollection(page);
      assert.ok(await page.locator('[data-species="fern"]').isDisabled());
      await page.locator("#collection-close").click();
      await page.waitForSelector("#plant-collection[hidden]", {
        state: "attached",
      });
      await assertUI(s);
    },
  );
  await check(
    "five-plant daily explanations match each actual delta and the right panel fits",
    async () => {
      const before = await snapshot(page),
        expected = nextDay(before);
      await page.locator("#next-day").click();
      await settle(page, 900);
      assert.deepEqual(await snapshot(page), expected);
      for (const p of expected.plants) {
        const note = await page
          .locator(`[data-condition="${p.id}"] .daily-change`)
          .innerText();
        assert.ok(
          (
            await page
              .locator(`[data-condition="${p.id}"] .daily-change`)
              .getAttribute("data-tooltip")
          ).includes(p.lastChange.reason),
        );
        assert.ok(
          note.includes(
            p.lastChange.health > 0
              ? "+" + p.lastChange.health
              : p.lastChange.health < 0
                ? "−" + Math.abs(p.lastChange.health)
                : "steady",
          ),
        );
      }
      const rect = await page.locator(".day-controls").boundingBox();
      assert.ok(rect.y + rect.height <= 900);
      await assertUI(expected);
      await page.screenshot({ path: "docs/screenshots/five-plants.png" });
    },
  );
  await check(
    "removing one instance preserves the other four and restores planting capacity",
    async () => {
      const before = await snapshot(page),
        remove = before.plants[0];
      await page.locator(`[data-remove="${remove.id}"]`).click();
      const after = await snapshot(page);
      assert.equal(after.plants.length, 4);
      assert.deepEqual(after.plants, before.plants.slice(1));
      assert.equal(
        await appCall(page, "return app.inspectScene().plants.size;"),
        4,
      );
      await openCollection(page);
      assert.ok(await page.locator('[data-species="moss"]').isEnabled());
    },
  );
  await check(
    "Reset preserves arbitrary positions and IDs, clears explanations and reopens the drawer",
    async () => {
      const before = await snapshot(page);
      await page.locator("#collection-close").click();
      await page.waitForSelector("#plant-collection[hidden]", {
        state: "attached",
      });
      await page.locator("#reset-button").click();
      await page.keyboard.press("Escape");
      assert.deepEqual(await snapshot(page), before);
      await confirm(page, "reset");
      const s = await snapshot(page);
      assert.equal(s.day, 1);
      assert.deepEqual(s.lamp, INITIAL_LAMP);
      assert.deepEqual(
        s.plants.map((p) => [p.id, p.species, p.position]),
        before.plants.map((p) => [p.id, p.species, p.position]),
      );
      assert.ok(
        s.plants.every(
          (p) => p.health === 70 && p.growth === 20 && p.lastChange === null,
        ),
      );
      assert.ok(s.moisture.every((v) => v === 60));
      assert.ok(await page.locator(".collection").isVisible());
      assert.equal(await page.locator(".daily-change:visible").count(), 0);
    },
  );
  await check(
    "Clear resets the ID sequence and experiment without keeping phantom models",
    async () => {
      await confirm(page, "clear");
      const s = await snapshot(page);
      assert.equal(s.plants.length, 0);
      assert.equal(s.nextPlantId, 1);
      assert.equal(
        await appCall(page, "return app.inspectScene().plants.size;"),
        0,
      );
      assert.ok(await page.locator("#next-day").isDisabled());
      assert.ok(await page.locator("#next-day-hint").isVisible());
    },
  );
  await check(
    "keyboard placement and keyboard tool aiming use continuous free positions",
    async () => {
      await page.locator('[data-species="fittonia"]').focus();
      await page.keyboard.press("Enter");
      for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Enter");
      let s = await snapshot(page);
      assert.ok(Math.abs(s.plants[0].position.x - 0.4) < 1e-6);
      await page.locator('[data-species="fittonia"]').focus();
      await page.keyboard.press("Enter");
      for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowLeft");
      await page.keyboard.press("Enter");
      s = await snapshot(page);
      assert.equal(s.plants.length, 2);
      assert.ok(Math.abs(s.plants[1].position.x + 0.4) < 1e-6);
      await page.locator("#water-button").focus();
      await page.keyboard.press("Enter");
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");
      await settle(page);
      assert.ok((await snapshot(page)).soilMoisture > 60);
      await waitCan(page);
      await closeTool(page);
    },
  );
  await check(
    "idle rendering parks and right-drag wakes it without modifying plant data",
    async () => {
      await settle(page, 2300);
      const n = await appCall(
        page,
        "return app.inspectScene().renderer.info.render.frame;",
      );
      await settle(page, 350);
      assert.equal(
        await appCall(
          page,
          "return app.inspectScene().renderer.info.render.frame;",
        ),
        n,
      );
      const before = await snapshot(page),
        r = await page.locator("canvas").boundingBox();
      await drag(
        page,
        { x: r.x + 15, y: r.y + 30 },
        { x: r.x + 110, y: r.y + 55 },
        { button: "right" },
      );
      assert.deepEqual(await snapshot(page), before);
      assert.ok(
        (await appCall(
          page,
          "return app.inspectScene().renderer.info.render.frame;",
        )) > n,
      );
      await page.locator("#camera-reset").click();
      await settle(page, 650);
    },
  );
  await check(
    "mobile can choose repeated plants, plant freely and advance without page scrolling",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await confirm(page, "clear");
      await put(page, "moss", { x: -0.4, z: 0.2 });
      await put(page, "moss", { x: 0.4, z: 0.2 });
      assert.equal((await snapshot(page)).plants.length, 2);
      await page.locator("#next-day").click();
      await settle(page, 900);
      assert.equal((await snapshot(page)).day, 2);
      assert.ok(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth <= innerWidth &&
            document.documentElement.scrollHeight <= innerHeight,
        ),
      );
      await page.screenshot({ path: "test-results/mobile.png" });
    },
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await page.waitForSelector("#scene-loading[hidden]", { state: "attached" });
  await put(page, "moss", { x: -0.55, z: 0.43 });
  await put(page, "succulent", { x: 0.54, z: 0.32 });
  await put(page, "fern", { x: -0.04, z: -0.52 });
  await settle(page, 1300);
  await page.screenshot({ path: "docs/screenshots/three-species.png" });
  await page.locator("#collection-close").click();
  await page.waitForSelector("#plant-collection[hidden]", {
    state: "attached",
  });
  await settle(page, 400);
  await page.screenshot({ path: "docs/screenshots/planted-terrarium.png" });
  await check(
    "the complete workflow reports no JavaScript or WebGL console errors",
    async () => assert.deepEqual(errors, []),
  );
  await writeFile(
    "test-results/browser-report.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(`${results.length} browser checks passed.`);
} catch (e) {
  await page.screenshot({ path: "test-results/failure.png" });
  await writeFile(
    "test-results/browser-report.json",
    JSON.stringify({ results, errors, failure: e.message }, null, 2),
  );
  throw e;
} finally {
  await browser.close();
}
