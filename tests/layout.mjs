import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { DEV_URL, put, openCollection } from "./browserHelpers.mjs";
import { POINTS } from "./fixtures.mjs";
const browser = await chromium.launch({
  headless: true,
  args: process.env.TERRARIUM_GPU === "metal" ? ["--use-angle=metal"] : [],
});
const errors = [];
const results = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(DEV_URL);
  await page.waitForSelector("#scene-loading[hidden]", { state: "attached" });
  for (const [index, id] of [
    "moss",
    "succulent",
    "fern",
    "moss",
    "fern",
  ].entries())
    await put(page, id, POINTS[index]);
  await openCollection(page);
  await page.locator("#next-day").click();
  await page.waitForTimeout(900);
  await mkdir("test-results", { recursive: true });
  for (const [width, height] of [
    [1440, 900],
    [1366, 768],
    [1280, 720],
    [1024, 768],
    [1280, 600],
    [1024, 500],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(450);
    if (await page.locator("#lamp-controls").isHidden())
      await page.locator("#lamp-button").click({ force: true });
    await page.waitForTimeout(200);
    const layout = await page.evaluate(() => {
      const box = (s) => {
        const r = document.querySelector(s).getBoundingClientRect();
        return {
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          bottom: r.bottom,
          right: r.right,
        };
      };
      return {
        viewport: { width: innerWidth, height: innerHeight },
        scrollHeight: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth,
        collection: box(".collection"),
        environment: box(".environment"),
        day: box(".day-controls"),
        canvas: box("canvas"),
        next: box("#next-day"),
      };
    });
    console.log(width, height, layout);
    await page.screenshot({ path: `test-results/layout-${width}.png` });
    assert.ok(
      layout.scrollHeight <= height && layout.scrollWidth <= width,
      "page fits viewport",
    );
    assert.ok(
      layout.next.bottom <= height && layout.next.y >= 0,
      "Next Day stays visible",
    );
    assert.ok(layout.environment.bottom <= height, "status note stays visible");
    assert.ok(layout.collection.bottom <= height, "plant note stays visible");
    results.push(layout);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("#collection-close").click();
  await page.waitForTimeout(130);
  assert.ok(
    await page.locator(".collection").isVisible(),
    "note is still present during slide",
  );
  assert.notEqual(
    await page
      .locator(".collection")
      .evaluate((e) => getComputedStyle(e).opacity),
    "1",
  );
  await page.screenshot({ path: "test-results/drawer-sliding.png" });
  await page.waitForSelector("#plant-collection[hidden]", {
    state: "attached",
  });
  assert.ok(await page.locator("#collection-open").isVisible());
  await page.screenshot({ path: "test-results/desk-collapsed.png" });
  await page.locator("#collection-open").click();
  await page.waitForTimeout(460);
  await page.screenshot({ path: "test-results/desk-expanded.png" });
  assert.deepEqual(errors, []);
  await writeFile(
    "test-results/layout-report.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log("Fitted layouts and delayed sliding drawer passed.");
} finally {
  await browser.close();
}
