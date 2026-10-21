import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { DEV_URL, put, settle } from "./browserHelpers.mjs";
import { POINTS } from "./fixtures.mjs";
const label = process.argv[2] || "current";
const browser = await chromium.launch({
  headless: true,
  args: process.env.TERRARIUM_GPU === "metal" ? ["--use-angle=metal"] : [],
});
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
      gpu: (() => {
        const gl = w.renderer.getContext(),
          ext = gl.getExtension("WEBGL_debug_renderer_info");
        return ext
          ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
          : "unavailable";
      })(),
      antialias: w.renderer.getContextAttributes().antialias,
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
  const bounds = await page.locator("canvas").boundingBox();
  await page.mouse.move(bounds.x + 30, bounds.y + 40);
  await page.mouse.down({ button: "right" });
  await page.evaluate(async () => {
    const app = await import(
      document.querySelector('script[src*="/src/main.js"]').src
    );
    const w = app.inspectScene();
    window.rotationSample = {
      running: true,
      frames: [],
      ratios: [],
      shadowFrames: 0,
      renders: 0,
      bursts: [],
      lastRenders: 0,
    };
    let last = performance.now();
    const render = w.renderer.render.bind(w.renderer);
    w.renderer.render = (...args) => {
      if (window.rotationSample.running) {
        window.rotationSample.renders++;
        if (w.renderer.shadowMap.needsUpdate)
          window.rotationSample.shadowFrames++;
      }
      return render(...args);
    };
    function sample(now) {
      const data = window.rotationSample;
      if (!data.running) return;
      data.bursts.push(data.renders - data.lastRenders);
      data.lastRenders = data.renders;
      data.frames.push(now - last);
      data.ratios.push(w.renderer.getPixelRatio());
      last = now;
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  });
  for (let i = 1; i <= 36; i++) {
    await page.mouse.move(
      bounds.x + 30 + i * 5,
      bounds.y + 40 + Math.sin(i / 12) * 30,
    );
    await page.waitForTimeout(16);
  }
  report.rotation = await page.evaluate(() => {
    const sample = window.rotationSample;
    sample.running = false;
    const frames = sample.frames.slice(2).sort((a, b) => a - b);
    return {
      medianFrameMs: frames[Math.floor(frames.length / 2)],
      p95FrameMs: frames[Math.floor(frames.length * 0.95)],
      frames: frames.length,
      pixelRatios: [...new Set(sample.ratios)],
      shadowFrames: sample.shadowFrames,
      renders: sample.renders,
      maximumRendersPerFrame: Math.max(...sample.bursts.slice(2)),
    };
  });
  if (label !== "before") {
    assert.equal(
      report.rotation.maximumRendersPerFrame,
      1,
      "OrbitControls invalidation must not fork parallel render loops",
    );
    assert.deepEqual(
      report.rotation.pixelRatios,
      [report.expectedPixelRatio],
      "Rotation retains full image clarity",
    );
    assert.equal(
      report.antialias,
      false,
      "Retina avoids redundant multisampling",
    );
    assert.equal(
      report.rotation.shadowFrames,
      0,
      "Rotation reuses world-space shadows",
    );
  }
  await page.screenshot({ path: `test-results/rotation-${label}.png` });
  await page.mouse.up({ button: "right" });
  await settle(page, 1500);
  report.restoredPixelRatio = await page.evaluate(async () => {
    const app = await import(
      document.querySelector('script[src*="/src/main.js"]').src
    );
    return app.inspectScene().renderer.getPixelRatio();
  });
  assert.equal(
    report.restoredPixelRatio,
    report.expectedPixelRatio,
    "Full clarity returns after camera motion settles",
  );
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
