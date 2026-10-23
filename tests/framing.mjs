import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { DEV_URL, appCall, snapshot, put, settle } from "./browserHelpers.mjs";
import { POINTS } from "./fixtures.mjs";

const browser = await chromium.launch({
  args: process.env.TERRARIUM_GPU === "metal" ? ["--use-angle=metal"] : [],
});
const errors = [], results = [];
async function bounds(page) {
  return page.evaluate(async () => {
    const app = await import(document.querySelector('script[src*="/src/main.js"]').src);
    const T = await import("/node_modules/three/build/three.module.js");
    const w=app.inspectScene(), points=[];
    w.scene.updateMatrixWorld(true);
    for(const o of [w.terrarium.group,w.lamp.group,w.wateringCan.group]) {
      const b=new T.Box3().setFromObject(o);
      for(const x of [b.min.x,b.max.x]) for(const y of [b.min.y,b.max.y]) for(const z of [b.min.z,b.max.z]) points.push(new T.Vector3(x,y,z));
    }
    for(let i=0;i<24;i++) points.push(new T.Vector3(Math.cos(i*Math.PI/12)*2.5,-.02,Math.sin(i*Math.PI/12)*2.5*.78));
    return points.map(p=>p.project(w.camera).toArray());
  });
}
try {
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto(DEV_URL);
  await page.waitForSelector("#scene-loading[hidden]",{state:"attached"});
  await put(page,"moss",POINTS[0]);
  await put(page,"succulent",POINTS[1]);
  await page.locator(".masthead").click({position:{x:600,y:20}});
  const state=await snapshot(page);
  await mkdir("test-results",{recursive:true});
  for(const [name,polar,azimuth] of [["default",null,null],["high",.4,0],["front",1.4,0],["back",.9,Math.PI],["side",.9,-Math.PI/2]]) {
    if(polar!==null) await appCall(page,`const w=app.inspectScene();w.camera.position.copy(w.controls.target).add(w.camera.position.clone().setFromSphericalCoords(6,arg.polar,arg.azimuth));w.controls.update();w.invalidate();`,{polar,azimuth});
    await settle(page,500);
    const projected=await bounds(page);
    assert.ok(projected.every(([x,y,z])=>Math.abs(x)<.94&&Math.abs(y)<.94&&z<1&&z>-1),name+" keeps the full composition inside the viewport");
    assert.deepEqual(await snapshot(page),state);
    results.push(name);
    await page.screenshot({path:`test-results/framing-${name}.png`});
  }
  await page.locator("#camera-reset").click();
  await page.locator("#collection-close").click();
  await settle(page,550);
  assert.ok((await bounds(page)).every(([x,y])=>Math.abs(x)<.94&&Math.abs(y)<.94));
  await page.screenshot({path:"test-results/framing-expanded.png"});
  assert.deepEqual(errors,[]);
  await writeFile("test-results/framing-report.json",JSON.stringify({results,errors},null,2));
  console.log("Default, high, front, back, side and expanded views fit without changing ecology.");
} finally {await browser.close();}
