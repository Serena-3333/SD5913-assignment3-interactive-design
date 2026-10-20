import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { DEV_URL, put, settle } from "./browserHelpers.mjs";
import { POINTS } from "./fixtures.mjs";
const label = process.argv[2] || "current";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await page.goto(DEV_URL);
  await page.waitForSelector("#scene-loading[hidden]", { state: "attached" });
  for (const [id, index] of [
    ["moss", 0],
    ["fittonia", 1],
    ["fern", 2],
  ])
    await put(page, id, POINTS[index]);
  await page.locator("#collection-close").click();
  await page.waitForSelector("#plant-collection[hidden]", {
    state: "attached",
  });
  await settle(page, 1800);
  const report = await page.evaluate(async () => {
    const app = await import(
      document.querySelector('script[src*="/src/main.js"]').src
    );
    const w = app.inspectScene();
    let meshes = 0,
      casters = 0;
    w.scene.traverse((o) => {
      if (o.isMesh) {
        meshes++;
        if (o.castShadow) casters++;
      }
    });
    w.invalidate(10000);
    const frames = [];
    let last = performance.now();
    for (let i = 0; i < 24; i++)
      await new Promise((resolve) =>
        requestAnimationFrame((now) => {
          frames.push(now - last);
          last = now;
          resolve();
        }),
      );
    frames.sort((a, b) => a - b);
    return {
      pixelRatio: w.renderer.getPixelRatio(),
      expectedPixelRatio: Math.min(devicePixelRatio, 2),
      drawCalls: w.renderer.info.render.calls,
      triangles: w.renderer.info.render.triangles,
      meshes,
      casters,
      medianFrameMs: frames[12],
      p95FrameMs: frames[22],
      drawingPixels: w.renderer.domElement.width * w.renderer.domElement.height,
    };
  });
  if (label !== "before") {
    assert.equal(
      report.pixelRatio,
      report.expectedPixelRatio,
      "Slow frames must not reduce image clarity",
    );
    assert.ok(
      report.drawCalls < 150,
      "Plant batching keeps the representative scene below 150 draws",
    );
    assert.ok(
      report.triangles >= 5000 && report.triangles < 10000,
      "Simplified models retain the miniature scene within its geometry budget",
    );
  }
  await mkdir("test-results", { recursive: true });
  await writeFile(
    `test-results/performance-${label}.json`,
    JSON.stringify(report, null, 2),
  );
  await page.screenshot({ path: `test-results/clarity-${label}.png` });
  console.log(label, report);
} finally {
  await browser.close();
}
