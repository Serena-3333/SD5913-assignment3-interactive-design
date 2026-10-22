import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { DEV_URL, put, point, appCall, snapshot, confirm, waitCan } from "./browserHelpers.mjs";

const browser = await chromium.launch({ headless: true,
  args: process.env.TERRARIUM_GPU === "metal" ? ["--use-angle=metal"] : [] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", e => { if (e.type() === "error") errors.push(e.text()); });
  await page.goto(DEV_URL);
  await page.waitForSelector("#scene-loading[hidden]", { state: "attached" });
  await mkdir("test-results", { recursive: true });
  assert.equal(await page.locator(".brand-sticker .icon").count(), 1, "Original logo restored");
  await put(page, "moss", { x: -0.55, z: 0.4 });
  await put(page, "fern", { x: 0.15, z: -0.4 });
  await put(page, "succulent", { x: 0.55, z: 0.4 });
  assert.equal(await page.locator(".health-value[data-tooltip]").count(), 0);
  await page.locator(".health-value").first().hover();
  assert.ok(await page.locator("#interface-tooltip").isHidden());
  const colors = () => appCall(page, "return [...app.inspectScene().terrarium.soilSurface.geometry.attributes.color.array];");
  const before = await colors();
  await page.locator("#water-button").focus();
  await page.keyboard.press("Enter");
  const spot = await point(page, { x: 0, z: 0.3 });
  await page.mouse.click(spot.x, spot.y);
  await waitCan(page);
  const wet = await colors();
  assert.ok(wet.some((v, i) => v < before[i] - 0.01), "A real shower darkens local soil");
  assert.ok(wet.some((v, i) => v === before[i]), "Distant soil remains unchanged");
  await page.screenshot({ path: "test-results/lifecycle-watered.png" });
  await page.locator("#reset-button").hover();
  assert.ok(await page.locator("#interface-tooltip").isVisible());
  for (const selector of ["#interface-tooltip", "#tool-hover", "#placement-preview"]) {
    const background = await page.locator(selector).evaluate(e => getComputedStyle(e).backgroundColor);
    assert.match(background, /rgba\(.*0\.72\)/);
  }
  assert.equal(await page.locator("[title]").count(), 0, "Native opaque hover hints replaced");
  await page.mouse.move(30, 30);
  let warned = false, state;
  for (let i = 0; i < 30; i++) {
    await page.locator("#next-day").click();
    await page.waitForFunction(() => !document.querySelector("#next-day").disabled);
    state = await snapshot(page);
    if (state.plants.some(p => !p.dead && p.criticalDays > 0)) {
      warned = true;
      assert.match(await page.locator("#plant-conditions").innerText(), /Critical/);
      const row = page.locator('[data-critical="true"]').first();
      assert.equal(await row.locator('[data-cause="critical"]').innerText(), "Critical");
      assert.equal(await row.locator('[data-cause="critical"][data-tooltip]').count(), 0);
      for (const selector of [".health-value > span", ".health-value strong"])
        assert.equal(await row.locator(selector).evaluate(e => getComputedStyle(e).fontWeight), "700");
    }
    if (state.plants.every(p => p.dead)) break;
  }
  assert.ok(warned, "A critical warning appears before death");
  assert.ok(state.plants.every(p => p.dead), "Neglected plants eventually die");
  await page.waitForTimeout(450);
  assert.equal(await page.locator('[data-status="dead"]').count(), 3);
  assert.equal(await page.locator(".death-label:visible").count(), 3);
  assert.match(await page.locator("#plant-conditions").innerText(), /Dried out · Day/);
  assert.ok(await appCall(page, "return app.inspectScene().terrarium.cracks.mesh.visible;"));
  assert.ok(await appCall(page, "return [...app.inspectScene().plants.values()].every(m => m.userData.visualDead === 1);"));
  await page.screenshot({ path: "test-results/lifecycle-dried.png" });
  await page.locator("#next-day").click();
  await page.waitForFunction(() => !document.querySelector("#next-day").disabled);
  assert.deepEqual((await snapshot(page)).plants, state.plants, "Corpses remain without growth or healing");
  await confirm(page, "reset");
  await page.waitForTimeout(1200);
  const reset = await snapshot(page);
  assert.ok(reset.plants.every(p => !p.dead && p.criticalDays === 0 && p.health === 70));
  assert.equal(await page.locator('[data-status="dead"]').count(), 0);
  assert.equal(await appCall(page, "return app.inspectScene().terrarium.cracks.mesh.visible;"), false);
  assert.deepEqual(errors, []);
  console.log("PASS: restored icon, real local wetting, translucent hints, critical warning, death/corpses/cracks, and reset; no JS/WebGL errors.");
} finally { await browser.close(); }
