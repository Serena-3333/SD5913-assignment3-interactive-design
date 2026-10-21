import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { DEV_URL, put, appCall, snapshot, settle } from "./browserHelpers.mjs";
import { POINTS } from "./fixtures.mjs";
const browser = await chromium.launch({
  headless: true,
  args: process.env.TERRARIUM_GPU === "metal" ? ["--use-angle=metal"] : [],
});
const results = [],
  errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto(DEV_URL);
  await page.waitForSelector("#scene-loading[hidden]", { state: "attached" });
  for (const [i, species] of [
    "moss",
    "succulent",
    "fern",
    "fittonia",
  ].entries())
    await put(page, species, POINTS[i]);
  await page.locator("#collection-close").click();
  await page.waitForSelector("#plant-collection[hidden]", {
    state: "attached",
  });
  await settle(page, 1700);
  await mkdir("test-results", { recursive: true });
  const seedling = await appCall(
    page,
    `return [...app.inspectScene().plants].map(([id,m])=>({id,scale:m.scale.x,growth:m.userData.visualGrowth}));`,
  );
  await page.screenshot({ path: "test-results/growth-seedlings.png" });
  // Actual button, state transition and live model, with no injected ecological state.
  const before = await snapshot(page);
  await page.locator("#next-day").click();
  const after = await snapshot(page);
  const growing = after.plants.filter(
    (p, i) => p.growth > before.plants[i].growth,
  );
  assert.ok(
    growing.length > 0,
    "The default scene includes a plant that actually grows",
  );
  const live = await appCall(
    page,
    `return [...app.inspectScene().plants].map(([id,m])=>({id,growth:m.userData.visualGrowth,halo:m.userData.halo.visible}));`,
  );
  assert.ok(
    growing.some((p) => live.find((m) => m.id === p.id).growth < p.growth),
    "A Next Day change is animated, not an instant replacement",
  );
  await settle(page, 160);
  const halo = await appCall(
    page,
    `return [...app.inspectScene().plants.values()].some(m=>m.userData.halo.visible);`,
  );
  assert.ok(halo, "Only actual growth triggers the short-lived visual cue");
  await page.screenshot({ path: "test-results/growth-next-day-motion.png" });
  await settle(page, 1400);
  const settled = await appCall(
    page,
    `return [...app.inspectScene().plants].map(([id,m])=>({id,growth:m.userData.visualGrowth,halo:m.userData.halo.visible}));`,
  );
  for (const p of after.plants) {
    const m = settled.find((m) => m.id === p.id);
    assert.equal(m.growth, p.growth);
    assert.equal(m.halo, false);
  }
  results.push(
    "Actual Next Day animates authoritative growth, then settles without persistent effects",
  );
  // Visual-only extremes in the existing render rig. These are not fabricated day outcomes.
  const frozenState = await snapshot(page);
  for (const [name, health, growth] of [
    ["young", 85, 20],
    ["middle", 85, 60],
    ["mature", 85, 100],
    ["wilted", 15, 100],
  ]) {
    const models = await page.evaluate(
      async ({ health, growth }) => {
        const app = await import(
            document.querySelector('script[src*="/src/main.js"]').src
          ),
          { animatePlant } = await import("/src/scene/plantFactory.js"),
          w = app.inspectScene();
        for (const m of w.plants.values())
          animatePlant(m, { health, growth }, 0, { instant: true });
        w.renderer.shadowMap.needsUpdate = true;
        w.renderer.render(w.scene, w.camera);
        return [...w.plants].map(([id, m]) => ({
          id,
          scale: m.scale.x,
          health: m.userData.visualHealth,
          growth: m.userData.visualGrowth,
        }));
      },
      { health, growth },
    );
    assert.ok(models.every((m) => m.growth === growth && m.health === health));
    await page.screenshot({ path: `test-results/growth-${name}.png` });
    results.push({ name, models });
  }
  assert.deepEqual(
    await snapshot(page),
    frozenState,
    "Visual projection never changes simulation data",
  );
  const mature = results.find((r) => r.name === "mature").models,
    young = results.find((r) => r.name === "young").models;
  for (let i = 0; i < mature.length; i++)
    assert.ok(mature[i].scale / young[i].scale > 2);
  assert.deepEqual(errors, []);
  await writeFile(
    "test-results/growth-report.json",
    JSON.stringify({ results, seedling, errors }, null, 2),
  );
  console.log(
    "Next Day animation, four-species growth extremes and immutable simulation passed",
  );
} finally {
  await browser.close();
}
