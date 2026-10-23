import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { DEV_URL, appCall, snapshot, put, settle, drag } from "./browserHelpers.mjs";
import { POINTS } from "./fixtures.mjs";

const browser = await chromium.launch({
  args: process.env.TERRARIUM_GPU === "metal" ? ["--use-angle=metal"] : [],
});
const errors = [], results = [];
async function highlighted(page) {
  return appCall(page, `const ids=[];for(const [id,plant] of app.inspectScene().plants){let visible=false;plant.traverse(o=>{if(o.userData.hoverOutline&&o.visible)visible=true});if(visible)ids.push(id)}return ids;`);
}
// Find an actual raycastable leaf/branch, including batched leaves, rather than
// assuming that the transparent centre of a plant's bounding box is pickable.
async function leafPoint(page, id) {
  return page.evaluate(async (id) => {
    const app = await import(document.querySelector('script[src*="/src/main.js"]').src);
    const T = await import("/node_modules/three/build/three.module.js");
    const w = app.inspectScene(), r = w.renderer.domElement.getBoundingClientRect();
    const box = new T.Box3().setFromObject(w.plants.get(id));
    const corners = [];
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z]) corners.push(w.project(new T.Vector3(x,y,z)));
    const ray = new T.Raycaster(), roots = [...w.plants.values(), w.lamp.group, w.wateringCan.group];
    for (let y = Math.max(0, Math.min(...corners.map(p=>p.y))); y < Math.min(r.height, Math.max(...corners.map(p=>p.y))); y += 2)
      for (let x = Math.max(0, Math.min(...corners.map(p=>p.x))); x < Math.min(r.width, Math.max(...corners.map(p=>p.x))); x += 2) {
        ray.setFromCamera(new T.Vector2(x/r.width*2-1, 1-y/r.height*2), w.camera);
        for (const hit of ray.intersectObjects(roots, true)) {
          let o = hit.object, found = null;
          while(o) { if(o.userData.plantId || o.userData.kind) { found=o.userData.plantId || o.userData.kind; break; } o=o.parent; }
          if (found === id) return {x:r.x+x,y:r.y+y};
          if (found) break;
        }
      }
    throw new Error("No exposed leaf found for "+id);
  }, id);
}
try {
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => {if(m.type()==="error")errors.push(m.text());});
  await page.goto(DEV_URL);
  await page.waitForSelector("#scene-loading[hidden]", {state:"attached"});
  for(const [i,species] of ["moss","succulent","fern","moss","fittonia"].entries()) await put(page,species,POINTS[i]);
  await settle(page,800);
  await page.locator(".masthead").click({position:{x:600,y:20}});
  const initial = await snapshot(page);
  for (const plant of initial.plants) {
    const row = page.locator(`[data-condition="${plant.id}"]`);
    await row.hover();
    await settle(page,130);
    assert.deepEqual(await highlighted(page),[plant.id],"One note links to exactly its own plant");
    assert.equal(await page.locator(".condition-card.is-linked").getAttribute("data-condition"),plant.id);
    await row.locator("h4").hover();
    await settle(page,50);
    assert.deepEqual(await highlighted(page),[plant.id],"Moving inside a note preserves the link");
    const p = await leafPoint(page,plant.id);
    await page.mouse.move(p.x,p.y);
    await settle(page,100);
    assert.equal(await page.locator(".condition-card.is-linked").getAttribute("data-condition"),plant.id,"An actual 3D leaf identifies the correct note");
  }
  assert.deepEqual(await snapshot(page),initial,"Both hover directions preserve ecological state");
  results.push("Both hover directions identify all four species and distinguish repeated Moss IDs without mutating data");
  await page.mouse.move(600,30);
  await settle(page,150);
  assert.deepEqual(await highlighted(page),[]);
  await page.locator('[data-condition="plant-3"]').focus();
  assert.deepEqual(await highlighted(page),["plant-3"]);
  await page.keyboard.press("Escape");
  assert.deepEqual(await highlighted(page),[]);
  const p = await leafPoint(page,"plant-1");
  await page.mouse.move(p.x,p.y);
  await page.mouse.down();
  await page.mouse.move(p.x+15,p.y+10);
  assert.deepEqual(await highlighted(page),[],"Dragging clears highlight");
  await page.keyboard.press("Escape");
  await page.mouse.up();
  assert.deepEqual(await snapshot(page),initial);
  const canvas=await page.locator("canvas").boundingBox();
  await drag(page,{x:canvas.x+20,y:canvas.y+30},{x:canvas.x+65,y:canvas.y+35},{button:"right"});
  assert.deepEqual(await highlighted(page),[]);
  assert.deepEqual(await snapshot(page),initial);
  await page.locator("#camera-reset").click();
  await settle(page,600);
  results.push("Pointer departure, keyboard focus, Escape, cancelled plant drag and right-drag rotation cleanly manage the link");
  await page.locator('[data-condition="plant-5"]').hover();
  await page.locator('[data-remove="plant-5"]').click();
  await settle(page,100);
  assert.equal(await page.locator('[data-condition="plant-5"]').count(),0);
  assert.deepEqual(await highlighted(page),[]);
  assert.equal(await appCall(page,'return app.inspectScene().plants.has("plant-5");'),false);
  results.push("Removing a highlighted individual releases its note, model and outline");
  await page.locator("#collection-open").click();
  await settle(page,500);
  await page.locator(".masthead").click({position:{x:600,y:20}});
  await page.mouse.move(600,30);
  const typography=await page.evaluate(()=>({
    brand:parseFloat(getComputedStyle(document.querySelector(".brand h1")).fontSize),
    scene:parseFloat(getComputedStyle(document.querySelector("#terrarium-title")).fontSize),
    panels:document.querySelectorAll(".paper-panel").length,
    binding:document.querySelectorAll(".notebook-binding").length,
    slips:document.querySelectorAll(".condition-card").length,
  }));
  assert.ok(typography.brand > typography.scene,JSON.stringify(typography));
  assert.equal(typography.panels,2);
  assert.equal(typography.binding,0);
  assert.equal(typography.slips,4);
  await mkdir("test-results",{recursive:true});
  await page.screenshot({path:"test-results/plant-link-final.png"});
  await page.locator('[data-condition="plant-3"]').hover();
  await settle(page,200);
  await page.screenshot({path:"test-results/plant-link-linked.png"});
  await page.mouse.move(600,30);
  await settle(page,1000);
  const frame=await appCall(page,'return app.inspectScene().renderer.info.render.frame;');
  await settle(page,450);
  assert.equal(await appCall(page,'return app.inspectScene().renderer.info.render.frame;'),frame,"Idle rendering parks after hover ends");
  assert.deepEqual(errors,[]);
  results.push("Paper-note hierarchy renders without JS/WebGL errors and the renderer returns to idle");
  await writeFile("test-results/plant-link-report.json",JSON.stringify({results,typography,errors},null,2));
  console.log(results.join("\n"));
} finally {await browser.close();}
