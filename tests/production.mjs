import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const url =
  process.env.TERRARIUM_PREVIEW_URL ||
  "http://127.0.0.1:4173/SD5913-assignment3-interactive-design/";
const browser = await chromium.launch({ headless: true }),
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [],
  bad = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("response", (r) => {
  if (r.status() >= 400) bad.push({ url: r.url(), status: r.status() });
});
try {
  const response = await page.goto(url);
  assert.equal(response.status(), 200);
  await page.waitForSelector("#scene-loading[hidden]", { state: "attached" });
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator("canvas").count(), 1);
  assert.ok(
    await page.evaluate(async () => {
      await document.fonts.load("600 16px Fredoka");
      await document.fonts.load('400 16px "DM Sans"');
      return (
        document.fonts.check("600 16px Fredoka") &&
        document.fonts.check('400 16px "DM Sans"')
      );
    }),
  );
  for (const path of [
    "favicon.svg",
    "fonts/fredoka-semibold.ttf",
    "fonts/dm-sans-regular.ttf",
    "fonts/libre-caslon-display.ttf",
  ]) {
    const r = await page.request.get(new URL(path, url).href);
    assert.equal(r.status(), 200, path);
    assert.ok((await r.body()).length > 100, path);
  }
  assert.ok(await page.locator("#next-day-hint").isVisible());
  for (const [species, keys] of [
    ["moss", []],
    [
      "moss",
      ["ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight", "ArrowRight"],
    ],
    ["fern", ["ArrowLeft", "ArrowLeft", "ArrowLeft", "ArrowLeft", "ArrowLeft"]],
  ]) {
    if (await page.locator("#collection-open").isVisible()) {
      await page.locator("#collection-open").click();
      await page.waitForTimeout(480);
    }
    await page.locator(`button[data-species="${species}"]`).focus();
    await page.keyboard.press("Enter");
    for (const key of keys) await page.keyboard.press(key);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(450);
  }
  assert.equal(await page.locator(".condition-card").count(), 3);
  assert.ok((await page.locator("#plant-count").innerText()).includes("3 / 5"));
  await page.locator("#next-day").click();
  await page.waitForTimeout(900);
  assert.equal(await page.locator("#day-number").innerText(), "Day 02");
  assert.equal(await page.locator(".daily-change:visible").count(), 3);
  const before = await page.locator("canvas").screenshot();
  const r = await page.locator("canvas").boundingBox();
  await page.mouse.move(r.x + 15, r.y + 30);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(r.x + 150, r.y + 60, { steps: 12 });
  await page.mouse.up({ button: "right" });
  await page.waitForTimeout(500);
  const after = await page.locator("canvas").screenshot();
  assert.notDeepEqual(before, after);
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/production.png" });
  assert.deepEqual(errors, []);
  assert.deepEqual(bad, []);
  await writeFile(
    "test-results/production-report.json",
    JSON.stringify(
      {
        url,
        status: "passed",
        checks: [
          "project-path HTML",
          "fonts",
          "favicon",
          "three live models",
          "repeat species",
          "single-plant availability",
          "daily explanations",
          "right-button rotation",
        ],
        errors,
        bad,
      },
      null,
      2,
    ),
  );
  console.log("Production path, assets and live interaction passed:", url);
} finally {
  await browser.close();
}
