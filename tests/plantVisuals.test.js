import test from "node:test";
import assert from "node:assert/strict";
import {
  createPlant,
  animatePlant,
  disposePlant,
} from "../src/scene/plantFactory.js";
const instant = (model, health, growth) =>
  animatePlant(model, { health, growth }, 0, { instant: true });
const stages = (model) => [
  ...model.userData.growthParts.map(({ object, threshold }) => ({
    object,
    threshold,
  })),
  ...model.userData.leaves
    .filter((l) => l.unfurlAt > 0)
    .map((l) => ({ object: l.pivot, threshold: l.unfurlAt })),
];
for (const species of ["moss", "fern", "succulent", "fittonia"]) {
  test(`${species}: visibly distinct seedling, staged foliage and mature size`, () => {
    const model = createPlant(species);
    try {
      instant(model, 85, 20);
      const small = model.scale.x,
        parts = stages(model),
        counts = [];
      assert.ok(
        parts.some((p) => p.threshold === 80),
        "New structure remains available late in growth",
      );
      for (const growth of [20, 40, 60, 80, 100]) {
        instant(model, 85, growth);
        counts.push(parts.filter((p) => p.object.scale.x > 0.99).length);
      }
      assert.ok(
        model.scale.x / small > 2,
        "Maturity is over twice seedling scale",
      );
      assert.ok(
        counts.every((n, i) => i === 0 || n > counts[i - 1]),
        "Each growth band unfolds additional structure",
      );
      assert.ok(parts.every((p) => p.object.scale.x === 1));
    } finally {
      disposePlant(model);
    }
  });
}
test("daily growth eases for 1.1 seconds, cues actual growth and then parks", () => {
  const model = createPlant("fern");
  try {
    instant(model, 70, 20);
    const small = model.scale.x,
      halo = model.userData.halo,
      materials = model.userData.materials.slice(),
      batches = model.children.filter((o) => o.isInstancedMesh);
    const health = 74,
      growth = 28;
    animatePlant(model, { health, growth }, 0.3);
    assert.ok(
      model.userData.visualGrowth > 20 && model.userData.visualGrowth < 28,
    );
    assert.ok(halo.visible);
    animatePlant(model, { health, growth }, 0.3);
    assert.ok(
      model.userData.visualGrowth < 28,
      "Transition is still active after 600ms",
    );
    animatePlant(model, { health, growth }, 0.5);
    assert.equal(model.userData.visualGrowth, 28);
    assert.equal(model.userData.visualHealth, 74);
    assert.ok(
      model.scale.x / small > 1.1,
      "A good first day has a visible permanent size increase",
    );
    assert.equal(halo.visible, false);
    assert.equal(
      animatePlant(model, { health, growth }, 0.2),
      false,
      "Settled plant does no pose work",
    );
    assert.deepEqual(model.userData.materials, materials);
    assert.deepEqual(
      model.children.filter((o) => o.isInstancedMesh),
      batches,
    );
  } finally {
    disposePlant(model);
  }
});
test("poor health shrinks vigor, droops and yellows without deleting growth or moving the roots", () => {
  const model = createPlant("fittonia");
  try {
    model.position.set(0.3, 0.7, -0.2);
    instant(model, 100, 80);
    const healthy = model.scale.x,
      color = model.userData.materials[0].color.clone(),
      angle = model.userData.leaves[0].pivot.rotation.z,
      position = model.position.clone();
    instant(model, 15, 80);
    assert.ok(model.scale.x / healthy < 0.85);
    assert.equal(model.userData.visualGrowth, 80);
    assert.ok(model.userData.leaves[0].pivot.rotation.z < angle);
    assert.ok(!model.userData.materials[0].color.equals(color));
    assert.ok(model.position.equals(position));
    instant(model, 100, 80);
    assert.equal(
      model.scale.x,
      healthy,
      "Vigor recovers from the same structural growth",
    );
  } finally {
    disposePlant(model);
  }
});
test("reduced motion snaps to the authoritative state without a growth pulse", () => {
  const model = createPlant("succulent");
  try {
    instant(model, 70, 20);
    instant(model, 90, 68);
    assert.equal(model.userData.visualGrowth, 68);
    assert.equal(model.userData.appear, 1);
    assert.equal(model.userData.halo.visible, false);
  } finally {
    disposePlant(model);
  }
});
