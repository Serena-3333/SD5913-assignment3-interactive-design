import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import {
  DEV_URL,
  snapshot,
  point,
  put,
  settle,
  closeTool,
} from "./browserHelpers.mjs";
import { POINTS } from "./fixtures.mjs";
const browser = await chromium.launch({
  headless: true,
  args: process.env.TERRARIUM_GPU === "metal" ? ["--use-angle=metal"] : [],
});
const errors = [],
  results = [];
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
  assert.match(
    await page.locator("#terrarium-title").innerText(),
    /Drag a plant into the jar/,
  );
  assert.ok(await page.locator("#planting-guide").isVisible());
  assert.equal(await page.locator("#soil-overview").count(), 0);
  assert.match(await page.locator(".environment").innerText(), /starts at 60%/);
  assert.match(
    await page.locator(".conditions-empty").innerText(),
    /Plant something/,
  );
  const card = page.locator('[data-species="moss"]');
  assert.equal(await card.evaluate((e) => getComputedStyle(e).cursor), "grab");
  await page.screenshot({ path: "test-results/feedback-empty.png" });
  await card.click();
  assert.match(
    await page.locator("#terrarium-title").innerText(),
    /Place your Moss/,
  );
  const q = await point(page, POINTS[0]);
  await page.mouse.click(q.x, q.y);
  await settle(page, 700);
  assert.ok(await page.locator("#planting-guide").isHidden());
  assert.equal(await page.locator("#soil-overview").count(), 0);
  const row = page.locator(".condition-card").first();
  for (const label of [
    "Comfort now",
    "Health",
    "Growth",
  ])
    assert.ok((await row.innerText()).includes(label));
  assert.ok(await row.locator(".comfort-value > span").isVisible());
  await page.locator("#metrics-guide summary").click();
  assert.match(
    await page.locator("#metrics-guide").innerText(),
    /not a forecast/,
  );
  await page.locator("#metrics-guide summary").click();
  results.push(
    "Empty state explains starting moisture; no overview or local water/light numbers remain",
  );
  await page.locator("#next-day").click();
  await settle(page, 1000);
  const recorded = await row.locator(".daily-change").innerText();
  assert.match(recorded, /Last day · Day 02: Health/);
  const s = await snapshot(page);
  await page.locator("#lamp-button").click();
  await page.locator("#lamp-power").fill("0");
  await page.locator("#lamp-power").dispatchEvent("input");
  await settle(page);
  assert.ok(await row.locator('[data-cause="dry"]').isVisible());
  assert.ok(await row.locator('[data-cause="dim"]').isVisible());
  assert.equal(await row.locator(".live-advice span").count(), 0);
  assert.equal(await row.locator(".water-value, .light-value").count(), 0);
  assert.equal(await row.locator(".daily-change").innerText(), recorded);
  assert.equal((await snapshot(page)).plants[0].health, s.plants[0].health);
  await page.screenshot({ path: "test-results/feedback-now-vs-last-day.png" });
  await page.locator("#water-button").click();
  const waterPoint = await point(page, POINTS[0]);
  await page.mouse.click(waterPoint.x, waterPoint.y);
  await settle(page);
  assert.equal(await row.locator('[data-cause="dry"]').count(), 0);
  assert.ok(await row.locator('[data-cause="dim"]').isVisible());
  assert.equal(await row.locator(".daily-change").innerText(), recorded);
  results.push(
    "Live actions resolve local issues without rewriting historical health or its cause",
  );
  await closeTool(page);
  for (const [i, species] of [
    [1, "succulent"],
    [2, "fern"],
    [3, "fittonia"],
    [4, "fern"],
  ])
    await put(page, species, POINTS[i]);
  await settle(page, 600);
  assert.equal(await page.locator(".condition-card").count(), 5);
  for (const el of await page.locator(".comfort-value > span").all())
    assert.ok(await el.isVisible());
  const fit = await page.evaluate(() => ({
    h: document.documentElement.scrollHeight,
    w: document.documentElement.scrollWidth,
    height: innerHeight,
    width: innerWidth,
  }));
  assert.ok(fit.h <= fit.height && fit.w <= fit.width);
  await page.screenshot({ path: "test-results/feedback-five.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await settle(page, 500);
  assert.ok(await row.locator(".comfort-value > span").isVisible());
  assert.ok(await page.locator("#next-day").isVisible());
  await page.screenshot({ path: "test-results/feedback-mobile.png" });
  results.push(
    "Five-plant and mobile notes retain current-state labels and fit the page",
  );
  const reduced = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  await reduced.goto(DEV_URL);
  await reduced.waitForSelector("#scene-loading[hidden]", {
    state: "attached",
  });
  assert.equal(
    await reduced
      .locator(".guide-arrow")
      .evaluate((e) => getComputedStyle(e).animationName),
    "none",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    "test-results/feedback-report.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(results.join("\n"));
} finally {
  await browser.close();
}
