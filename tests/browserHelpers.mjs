import { surfaceHeight } from "../src/simulation/environment.js";
export const DEV_URL =
  process.env.TERRARIUM_TEST_URL || "http://127.0.0.1:5173/";
export const appCall = (page, source, arg) =>
  page.evaluate(
    async ({ source, arg }) => {
      const app = await import(
        document.querySelector('script[src*="/src/main.js"]').src
      );
      return new Function("app", "arg", source)(app, arg);
    },
    { source, arg },
  );
export const snapshot = (page) => appCall(page, "return app.getSnapshot();");
export const settle = (page, ms = 380) => page.waitForTimeout(ms);
export const point = (page, p, dy = 0) =>
  page.evaluate(
    async ({ p, y }) => {
      const app = await import(
          document.querySelector('script[src*="/src/main.js"]').src
        ),
        THREE = await import("/node_modules/three/build/three.module.js");
      const w = app.inspectScene(),
        r = w.renderer.domElement.getBoundingClientRect(),
        q = w.project(new THREE.Vector3(p.x, y, p.z));
      return { x: q.x + r.x, y: q.y + r.y };
    },
    { p, y: surfaceHeight(p.x, p.z) + dy },
  );
export async function drag(
  page,
  from,
  to,
  { button = "left", release = true } = {},
) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down({ button });
  await page.mouse.move(to.x, to.y, { steps: 14 });
  if (release) await page.mouse.up({ button });
}
export async function openCollection(page) {
  if (await page.locator("#collection-open").isVisible()) {
    await page.locator("#collection-open").click();
    await settle(page, 480);
  }
}
export async function put(page, species, p) {
  await openCollection(page);
  await page.locator(`[data-species="${species}"]`).click();
  if ((await page.viewportSize()).width <= 680)
    await page.waitForSelector("#plant-collection[hidden]", {
      state: "attached",
    });
  const q = await point(page, p);
  await page.mouse.click(q.x, q.y);
  await settle(page);
  if ((await snapshot(page)).plants.length === 5)
    await page.waitForSelector("#plant-collection[hidden]", {
      state: "attached",
    });
}
export async function dragCard(page, species, p, release = true) {
  await openCollection(page);
  const r = await page.locator(`[data-species="${species}"]`).boundingBox();
  await drag(page, { x: r.x + r.width / 2, y: r.y + r.height / 3 }, p, {
    release,
  });
}
export async function confirm(page, kind) {
  await page.locator(`#${kind}-button`).click();
  await page.locator("#confirm-action").click();
  await settle(page, 480);
}
export async function closeTool(page) {
  if (await page.locator("#tool-close").isVisible())
    await page.locator("#tool-close").click();
}
export async function waitCan(page) {
  await page.waitForFunction(
    async () => {
      const a = await import(
          document.querySelector('script[src*="/src/main.js"]').src
        ),
        c = a.inspectScene().wateringCan;
      return !c.pouring && !c.moving;
    },
    {},
    { timeout: 9000 },
  );
}
