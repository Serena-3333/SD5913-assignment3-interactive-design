import test from "node:test";
import assert from "node:assert/strict";
import { createPlant, animatePlant, disposePlant } from "../src/scene/plantFactory.js";
import { createHoverOutline } from "../src/scene/hoverOutline.js";

for (const species of ["moss", "fern", "succulent", "fittonia"]) {
  test(`${species}: linked outline follows instanced growth without recoloring or changing picking`, () => {
    const plant = createPlant(species);
    animatePlant(plant, { health: 70, growth: 20 }, 0, { instant: true });
    const colors = plant.userData.materials.map(m => m.color.getHex());
    const outline = createHoverOutline(plant);
    try {
      outline.resize(600, 400);
      outline.setVisible(true);
      const shells = [];
      plant.traverse(o => { if (o.userData.hoverOutline) shells.push(o); });
      assert.ok(shells.length > 0);
      assert.ok(shells.every(s => s.visible && s.parent.visible));
      assert.ok(shells.every(s => s.material.uniforms.viewport.value.x === 600));
      assert.deepEqual(plant.userData.materials.map(m => m.color.getHex()), colors);
      const sources = shells.filter(s => s.isInstancedMesh);
      assert.ok(sources.length > 0);
      for (const shell of sources) {
        assert.notEqual(shell.instanceMatrix, shell.parent.instanceMatrix);
        assert.deepEqual(shell.instanceMatrix.array, shell.parent.instanceMatrix.array);
        const hits = [];
        shell.raycast({}, hits);
        assert.equal(hits.length, 0);
      }
      animatePlant(plant, { health: 40, growth: 80 }, 0, { instant: true });
      outline.sync();
      for (const shell of sources)
        assert.deepEqual(shell.instanceMatrix.array, shell.parent.instanceMatrix.array);
      outline.setVisible(false);
      assert.ok(shells.every(s => !s.visible));
    } finally {
      outline.dispose();
      let left = 0;
      plant.traverse(o => { if (o.userData.hoverOutline) left++; });
      assert.equal(left, 0);
      disposePlant(plant);
    }
  });
}
