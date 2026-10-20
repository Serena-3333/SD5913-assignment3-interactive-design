import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import {
  createInitialState,
  plantAt,
  movePlant,
  waterSoil,
  setLamp,
  nextDay,
  conditionsFor,
} from "../src/simulation/simulation.js";

// Start npm run dev first. These checks exercise the real UI and raycast interactions.
const baseURL = process.env.TERRARIUM_TEST_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});
const errors = [];
const results = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
const read = () =>
  page.evaluate(() => ({
    day: document.querySelector("#day-number").textContent,
    moisture: Number(document.querySelector("#moisture-number").textContent),
    plants: [...document.querySelectorAll(".condition-card")].map((e) => ({
      species: e.dataset.condition,
      health: Number(e.querySelector(".health-value strong").textContent),
      comfort: Number(e.querySelector(".comfort-value b").textContent),
      light: Number(
        e.querySelector(".light-value").textContent.replace("Light ", ""),
      ),
      growth: Number(
        e.querySelector(".growth-value").textContent.replace(/Growth |%/g, ""),
      ),
    })),
    slots: [...document.querySelectorAll("[data-slot]")].map((e) => e.title),
  }));
const settle = () => page.waitForTimeout(420);
async function check(name, fn) {
  await fn();
  results.push({ name, status: "passed" });
  console.log(`✓ ${name}`);
}
async function point(x, y, z) {
  return page.evaluate(
    async ({ x, y, z }) => {
      const THREE = await import("/node_modules/three/build/three.module.js");
      const rect = document.querySelector("canvas").getBoundingClientRect();
      const camera = new THREE.PerspectiveCamera(
        33,
        rect.width / rect.height,
        0.1,
        80,
      );
      camera.position.set(2.4, 4.4, 7.5);
      camera.lookAt(0.15, 1.65, 0);
      camera.updateMatrixWorld();
      const p = new THREE.Vector3(x, y, z).project(camera);
      return {
        x: rect.x + ((p.x + 1) / 2) * rect.width,
        y: rect.y + ((1 - p.y) / 2) * rect.height,
      };
    },
    { x, y, z },
  );
}
async function dragCard(species, destination, release = true) {
  const rect = await page.locator(`[data-species="${species}"]`).boundingBox();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 3);
  await page.mouse.down();
  await page.mouse.move(destination.x, destination.y, { steps: 14 });
  if (release) await page.mouse.up();
}
async function confirm(action) {
  await page.locator(`#${action}-button`).click();
  await page.locator("#confirm-action").click();
  await settle();
}
let expected = createInitialState();
await mkdir("test-results", { recursive: true });
await mkdir("docs/screenshots", { recursive: true });
try {
  await page.goto(baseURL);
  await page.waitForSelector("#scene-loading[hidden]", { state: "attached" });
  await page.evaluate(() => document.fonts.ready);
  await settle();
  await check(
    "initial UI, four distinct model thumbnails, empty jar, and day gate",
    async () => {
      assert.equal(await page.locator("canvas").count(), 1);
      const images = await page
        .locator(".plant-thumbnail")
        .evaluateAll((list) =>
          list.map((e) => ({ loaded: e.naturalWidth > 0, src: e.src })),
        );
      assert.ok(
        images.every((i) => i.loaded && i.src.startsWith("data:image/png")),
      );
      assert.equal(new Set(images.map((i) => i.src)).size, 4);
      assert.equal((await read()).plants.length, 0);
      assert.equal((await read()).moisture, 60);
      assert.ok(await page.locator("#next-day").isDisabled());
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    },
  );
  await page.screenshot({
    path: "docs/screenshots/empty-terrarium.png",
    fullPage: true,
  });
  await check(
    "raycast drag planting shows ghost preview and commits only after release",
    async () => {
      await dragCard("moss", await point(-1, 0.66, 0.6), false);
      assert.ok(await page.locator("#placement-preview").isVisible());
      assert.equal((await read()).plants.length, 0);
      await page.mouse.up();
      await settle();
      expected = plantAt(expected, "moss", 0);
      assert.equal((await read()).plants[0].species, "moss");
      assert.ok(await page.locator("#next-day").isDisabled());
    },
  );
  await check("outside drop does not create a plant", async () => {
    await dragCard("fern", { x: 520, y: 60 });
    await settle();
    assert.equal((await read()).plants.length, 1);
    assert.ok(await page.locator("#placement-preview").isHidden());
  });
  await check(
    "Escape cancels a valid pending drop without mutations",
    async () => {
      await dragCard("fittonia", await point(1, 0.66, 0.6), false);
      await page.keyboard.press("Escape");
      await page.mouse.up();
      await settle();
      assert.equal((await read()).plants.length, 1);
      assert.ok(await page.locator("#placement-preview").isHidden());
    },
  );
  await check(
    "pointercancel clears preview without creating duplicates",
    async () => {
      await dragCard("fittonia", await point(1, 0.66, 0.6), false);
      await page
        .locator("canvas")
        .dispatchEvent("pointercancel", { pointerId: 1 });
      await page.mouse.up();
      await settle();
      assert.equal((await read()).plants.length, 1);
    },
  );
  await check(
    "keyboard selection and planting enable Next Day at two plants",
    async () => {
      await page.locator('[data-species="fern"]').focus();
      await page.keyboard.press("Enter");
      await page.locator('[data-slot="2"]').focus();
      await page.keyboard.press("Enter");
      await settle();
      expected = plantAt(expected, "fern", 2);
      assert.equal((await read()).plants.length, 2);
      assert.ok(await page.locator("#next-day").isEnabled());
      assert.ok(await page.locator('[data-species="moss"]').isDisabled());
    },
  );
  await check(
    "dragging an existing plant exchanges occupied slots and preserves health/growth",
    async () => {
      const start = await point(-1, 0.92, 0.6),
        end = await point(0, 0.66, -0.9);
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(end.x, end.y, { steps: 15 });
      await page.mouse.up();
      await settle();
      expected = movePlant(expected, "moss", 2);
      const actual = await read();
      assert.ok(actual.slots[2].startsWith("Moss"));
      assert.ok(actual.slots[0].startsWith("Fern"));
      assert.ok(actual.plants.every((p) => p.health === 70 && p.growth === 20));
      assert.equal(
        actual.plants[1].comfort,
        conditionsFor(expected, expected.plants[1]).percent,
      );
    },
  );
  await check(
    "click selection moves an existing plant to an empty slot",
    async () => {
      await page.locator('[data-slot="0"]').click();
      await page.locator('[data-slot="1"]').click();
      await settle();
      expected = movePlant(expected, "fern", 1);
      assert.ok((await read()).slots[1].startsWith("Fern"));
    },
  );
  await check(
    "3D lamp head follows its world track and updates light without changing health",
    async () => {
      const start = await point(1.7, 3.35, -1.8),
        end = await point(-1.6, 3.35, -1.8);
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      await page.mouse.move(end.x, end.y, { steps: 15 });
      await page.mouse.up();
      await settle();
      const x = Number(await page.locator("#lamp-slider").inputValue());
      assert.ok(x < -0.8, `lamp should move left; x=${x}`);
      expected = setLamp(expected, x);
      const actual = await read();
      assert.ok(actual.plants.every((p) => p.health === 70 && p.growth === 20));
      for (const plant of expected.plants)
        assert.equal(
          actual.plants.find((p) => p.species === plant.species).light,
          Math.round(conditionsFor(expected, plant).light),
        );
    },
  );
  await check(
    "clicking the actual 3D watering can raises moisture by 18 and preserves health",
    async () => {
      const p = await point(-2.3, 0.5, 1.25);
      await page.mouse.click(p.x, p.y);
      await settle();
      expected = waterSoil(expected);
      const actual = await read();
      assert.equal(actual.moisture, 78);
      assert.ok(actual.plants.every((p) => p.health === 70));
    },
  );
  await check("watering caps at 100 and reports the limit", async () => {
    await page.locator("#water-button").click();
    await page.locator("#water-button").click();
    await settle();
    expected = waterSoil(waterSoil(expected));
    assert.equal((await read()).moisture, 100);
    await page.locator("#water-button").click();
    assert.match(await page.locator("#toast").innerText(), /fully watered/);
  });
  await check(
    "Next Day applies correct drying, health, growth, and an 800 ms repeat gate",
    async () => {
      await page.locator("#next-day").click();
      assert.ok(await page.locator("#next-day").isDisabled());
      // Even programmatic repeated clicks must not advance a second day.
      await page.locator("#next-day").evaluate((e) => {
        e.click();
        e.click();
      });
      await page.waitForTimeout(900);
      expected = nextDay(expected);
      const actual = await read();
      assert.equal(actual.day, "Day 02");
      assert.equal(actual.moisture, expected.soilMoisture);
      for (const plant of expected.plants) {
        const p = actual.plants.find((p) => p.species === plant.species);
        assert.equal(p.health, plant.health);
        assert.equal(p.growth, plant.growth);
        assert.equal(p.comfort, conditionsFor(expected, plant).percent);
      }
      assert.match(
        await page.locator("#journal-entry").innerText(),
        /Soil moisture fell/,
      );
    },
  );
  await check(
    "camera orbit changes only the rendered view, with no environment mutation",
    async () => {
      const before = await read();
      const rect = await page.locator("canvas").boundingBox();
      await page.mouse.move(
        rect.x + rect.width * 0.15,
        rect.y + rect.height * 0.18,
      );
      await page.mouse.down();
      await page.mouse.move(
        rect.x + rect.width * 0.45,
        rect.y + rect.height * 0.22,
        { steps: 18 },
      );
      await page.mouse.up();
      await settle();
      assert.deepEqual(await read(), before);
      await page.screenshot({ path: "test-results/orbited.png" });
      await page.locator("#camera-reset").click();
      await settle();
    },
  );
  await check(
    "reset cancellation is safe; confirmation restores values and keeps arrangement",
    async () => {
      const before = await read();
      await page.locator("#reset-button").click();
      await page.keyboard.press("Escape");
      assert.deepEqual(await read(), before);
      await confirm("reset");
      const actual = await read();
      assert.equal(actual.day, "Day 01");
      assert.equal(actual.moisture, 60);
      assert.deepEqual(actual.slots, before.slots);
      assert.ok(actual.plants.every((p) => p.health === 70 && p.growth === 20));
    },
  );
  await check(
    "capacity stays at three; all four procedural species can be planted",
    async () => {
      await page.locator('[data-species="succulent"]').click();
      await page.locator('[data-slot="0"]').click();
      await settle();
      assert.equal((await read()).plants.length, 3);
      await page.locator('[data-species="fittonia"]').click();
      await page.locator('[data-slot="0"]').click();
      assert.equal((await read()).plants.length, 3);
      await confirm("clear");
      assert.equal((await read()).plants.length, 0);
      await page.locator('[data-species="fittonia"]').click();
      await page.locator('[data-slot="0"]').click();
      await settle();
      assert.equal((await read()).plants[0].species, "fittonia");
      await page.locator('[data-species="succulent"]').click();
      await page.locator('[data-slot="1"]').click();
      await page.locator('[data-species="fern"]').click();
      await page.locator('[data-slot="2"]').click();
      await settle();
      await page.screenshot({
        path: "docs/screenshots/three-species.png",
        fullPage: true,
      });
    },
  );
  await check(
    "Clear Jar confirmation restores complete initial state",
    async () => {
      await confirm("clear");
      const actual = await read();
      assert.equal(actual.day, "Day 01");
      assert.equal(actual.moisture, 60);
      assert.equal(actual.plants.length, 0);
      assert.equal(
        Number(await page.locator("#lamp-slider").inputValue()),
        1.7,
      );
      assert.ok(await page.locator("#next-day").isDisabled());
    },
  );
  await check(
    "mobile layout stays within viewport and fallback planting remains usable",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await settle();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.locator('[data-species="moss"]').click();
      await page.locator('[data-slot="0"]').click();
      await settle();
      assert.equal((await read()).plants.length, 1);
      await page.screenshot({
        path: "test-results/mobile.png",
        fullPage: true,
      });
    },
  );
  // Capture a reproducible two-species Day 2 example, matching the reference's information hierarchy.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.reload();
  await page.waitForSelector('#scene-loading[hidden]', { state: 'attached' });
  await page.locator('[data-species="moss"]').click();
  await page.locator('[data-slot="0"]').click();
  await page.locator('[data-species="fern"]').click();
  await page.locator('[data-slot="2"]').click();
  await page.locator('#next-day').click();
  await page.waitForSelector('#toast[hidden]', { state: 'attached' });
  await page.screenshot({ path: 'docs/screenshots/planted-terrarium.png', fullPage: true });
  await check("no JavaScript or WebGL console errors", async () =>
    assert.deepEqual(errors, []),
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
