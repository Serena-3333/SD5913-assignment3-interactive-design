import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const label = process.argv[2] || "current";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await page.goto(process.env.TERRARIUM_TEST_URL || "http://127.0.0.1:5174");
  await page.waitForSelector("#scene-loading[hidden]", { state: "attached" });
  for (const [id, slot] of [
    ["moss", 0],
    ["fittonia", 1],
    ["fern", 2],
  ]) {
    if (await page.locator("#collection-open").isVisible())
      await page.locator("#collection-open").click();
    await page.locator(`[data-species="${id}"]`).click();
    await page.locator(`[data-slot="${slot}"]`).click();
    await page.waitForTimeout(800);
  }
  await page.waitForTimeout(1800);
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
    assert.ok(
      report.drawCalls < 150,
      "Plant batching keeps the representative scene below 150 draws",
    );
    assert.ok(
      report.triangles > 10000,
      "The detailed plant and jar geometry remains present",
    );
  }
  await mkdir("test-results", { recursive: true });
  await writeFile(
    `test-results/performance-${label}.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(label, report);
} finally {
  await browser.close();
}
