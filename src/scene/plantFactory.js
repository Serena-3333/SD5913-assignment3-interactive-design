import * as THREE from "three";
import { batchPlant } from "./meshBatching.js";
const palettes = {
  moss: [0x60962f, 0x87b93d, 0x477b32, 0xb5d659],
  fern: [0x287854, 0x459644, 0x8cbf43, 0x205f48],
  succulent: [0x55a995, 0x9bd3ab, 0x3c877e, 0xb6dfbd],
  fittonia: [0x3d8957, 0x70ad62, 0x9ac56b, 0x34704e],
};
const up = new THREE.Vector3(0, 1, 0),
  axis = new THREE.Vector3(1, 0, 0);
const sphere = new THREE.DodecahedronGeometry(1, 0),
  smallStone = new THREE.DodecahedronGeometry(1, 0),
  stemGeometry = new THREE.CylinderGeometry(1, 1, 1, 4);
// A closed, thick blade with a raised midrib. The root is at x=0, tip at x=1.
function bladeGeometry(wide = false) {
  const w = wide ? 0.35 : 0.21;
  const points = [
    [0, 0, 0],
    [0.25, 0.035, -w * 0.8],
    [0.58, 0.02, -w],
    [1, 0, 0],
    [0.58, 0.02, w],
    [0.25, 0.035, w * 0.8],
    [0.45, wide ? 0.105 : 0.15, 0],
    [0.45, -0.07, 0],
  ];
  // Thin fern blades need fewer outline vertices than broad Fittonia leaves.
  if (!wide) points.splice(1, 5, [0.5, 0.035, -w], [1, 0, 0], [0.5, 0.035, w]);
  const ring = points.length - 2;
  const faces = [];
  for (let i = 0; i < ring; i++) {
    faces.push(ring, (i + 1) % ring, i, ring + 1, i, (i + 1) % ring);
  }
  const positions = faces.flatMap((i) => points[i]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.computeVertexNormals();
  return geometry;
}
const lance = bladeGeometry(),
  oval = bladeGeometry(true);
function petalGeometry() {
  const p = [
      [0, 0, 0],
      [0.27, 0.025, -0.19],
      [0.65, 0.02, -0.23],
      [0.87, 0.01, -0.13],
      [1, 0, 0],
      [0.87, 0.01, 0.13],
      [0.65, 0.02, 0.23],
      [0.27, 0.025, 0.19],
      [0.47, 0.19, 0],
      [0.47, -0.095, 0],
    ],
    a = [];
  for (let i = 0; i < 8; i++) a.push(8, (i + 1) % 8, i, 9, i, (i + 1) % 8);
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      a.flatMap((i) => p[i]),
      3,
    ),
  );
  g.computeVertexNormals();
  return g;
}
const petal = petalGeometry();
export function stemBetween(a, b, radius, material) {
  const mesh = new THREE.Mesh(stemGeometry, material),
    direction = new THREE.Vector3().subVectors(b, a);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.scale.set(radius, direction.length(), radius);
  mesh.quaternion.setFromUnitVectors(up, direction.normalize());
  mesh.castShadow = true;
  return mesh;
}
export function createPlant(species, { ghost = false } = {}) {
  const root = new THREE.Group();
  root.userData.species = species;
  root.userData.leaves = [];
  root.userData.growthParts = [];
  function growthPart(object, threshold) {
    root.userData.growthParts.push({ object, threshold });
    return object;
  }
  const materials = palettes[species].map((color) => {
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.86,
      flatShading: true,
      transparent: ghost,
      opacity: ghost ? 0.46 : 1,
      depthWrite: !ghost,
    });
    mat.userData.healthy = new THREE.Color(color);
    return mat;
  });
  root.userData.materials = materials;
  const stemMat = materials[3];
  function mesh(geometry, material, parent = root) {
    const item = new THREE.Mesh(geometry, material);
    item.castShadow = !ghost;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  }
  function leaf(
    parent,
    position,
    length,
    width,
    thickness,
    angle,
    material,
    unfurlAt = 0,
    wide = false,
  ) {
    const pivot = new THREE.Group();
    pivot.position.copy(position);
    pivot.rotation.z = angle;
    parent.add(pivot);
    const item = mesh(
      wide === "petal" ? petal : wide ? oval : lance,
      materials[material % 4],
      pivot,
    );
    item.scale.set(length, thickness, width);
    root.userData.leaves.push({ pivot, angle, unfurlAt });
    return pivot;
  }
  if (species === "moss") {
    for (let i = 0; i < 11; i++) {
      const a = i * 2.39996,
        r = i === 0 ? 0 : 0.13 + (i % 3) * 0.15;
      const clump = growthPart(
        new THREE.Group(),
        [0, 0, 0, 0, 0, 20, 20, 40, 40, 60, 80][i],
      );
      root.add(clump);
      const item = mesh(sphere, materials[i % 4], clump);
      clump.position.set(
        Math.cos(a) * r,
        0.1 + (i % 3) * 0.017,
        Math.sin(a) * r,
      );
      item.scale.set(0.29 + (i % 2) * 0.03, 0.17 + (i % 3) * 0.018, 0.27);
      item.rotation.y = a;
      for (let j = 0; j < 3; j++) {
        const p = new THREE.Vector3(
          Math.cos(j * 2 + i) * 0.11,
          0.14 + (i % 3) * 0.012,
          Math.sin(j * 2 + i) * 0.12,
        );
        const tuft = leaf(clump, p, 0.1, 0.2, 0.15, 0.55, 1 + j);
        tuft.rotation.y = j * 2 + i;
      }
    }
  } else if (species === "fern") {
    for (let i = 0; i < 6; i++) {
      const frond = growthPart(new THREE.Group(), [0, 0, 20, 40, 60, 80][i]);
      frond.rotation.y = (i * Math.PI * 2) / 6 + 0.2;
      root.add(frond);
      const h = [1.1, 1.45, 1.25, 1.58, 1.28, 1.42, 1.1, 1.52][i],
        reach = [0.73, 0.57, 0.76, 0.45, 0.7, 0.62, 0.8, 0.5][i];
      const curve = new THREE.CubicBezierCurve3(
        new THREE.Vector3(),
        new THREE.Vector3(0.03, h * 0.58, 0),
        new THREE.Vector3(reach * 0.45, h * 1.04, 0),
        new THREE.Vector3(reach, h, 0),
      );
      mesh(new THREE.TubeGeometry(curve, 8, 0.012, 4, false), stemMat, frond);
      for (let j = 1; j <= 7; j++) {
        const t = j / 8,
          p = curve.getPoint(t),
          length = 0.27 * Math.sin(Math.PI * t) ** 0.7 + 0.025;
        for (const side of [-1, 1]) {
          const pivot = leaf(frond, p, length, 0.33, 0.23, 0, i + j, 0);
          pivot.quaternion.setFromUnitVectors(
            axis,
            new THREE.Vector3(0.34, 0.12, side).normalize(),
          );
          root.userData.leaves.at(-1).quaternion = pivot.quaternion.clone();
        }
      }
      const tip = leaf(frond, curve.getPoint(1), 0.16, 0.22, 0.17, 0.75, 2);
      tip.rotation.y = 0;
    }
  } else if (species === "succulent") {
    for (let ring = 0; ring < 3; ring++) {
      const count = [9, 7, 5][ring];
      for (let i = 0; i < count; i++) {
        const holder = new THREE.Group();
        holder.rotation.y = (i * Math.PI * 2) / count + ring * 0.42;
        root.add(holder);
        leaf(
          holder,
          new THREE.Vector3(0.015, 0.055 + ring * 0.12, 0),
          [0.57, 0.43, 0.26][ring],
          [0.95, 0.85, 0.64][ring],
          [1.25, 1.2, 1.0][ring],
          0.2 + ring * 0.32,
          i + ring,
          ring === 0 ? [0, 20, 0, 40, 0, 60, 20, 80, 40][i] : 0,
          "petal",
        );
      }
    }
    const center = mesh(smallStone, materials[1]);
    center.position.y = 0.48;
    center.scale.set(0.09, 0.14, 0.09);
  } else {
    const vein = new THREE.MeshStandardMaterial({
      color: 0xf2dca9,
      roughness: 1,
      transparent: ghost,
      opacity: ghost ? 0.46 : 1,
    });
    materials.push(vein);
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4,
        h = [0.43, 0.66, 0.78, 0.54, 0.7][i],
        top = new THREE.Vector3(Math.cos(a) * 0.2, h, Math.sin(a) * 0.2);
      const stalk = growthPart(new THREE.Group(), [0, 0, 20, 40, 60][i]);
      root.add(stalk);
      stalk.add(stemBetween(new THREE.Vector3(), top, 0.016, stemMat));
      for (let j = 0; j < 2; j++) {
        const p = top.clone().multiplyScalar(j === 0 ? 0.66 : 1),
          holder = new THREE.Group();
        holder.position.copy(p);
        holder.rotation.y = a + j * Math.PI;
        stalk.add(holder);
        const blade = leaf(
          holder,
          new THREE.Vector3(),
          0.48,
          0.75,
          0.55,
          0.16,
          i + j,
          i === 0 && j === 1 ? 80 : 0,
          true,
        );
        // Veins are children of the leaf pivot: they follow droop without detaching.
        const ridge = [
          new THREE.Vector3(0.02, 0.012, 0),
          new THREE.Vector3(0.21, 0.063, 0),
          new THREE.Vector3(0.46, 0.008, 0),
        ];
        mesh(
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(ridge),
            4,
            0.005,
            3,
            false,
          ),
          vein,
          blade,
        );
        for (let k = 1; k < 4; k++)
          for (const side of [-1, 1]) {
            const x = k * 0.095;
            blade.add(
              stemBetween(
                new THREE.Vector3(x, 0.057, 0),
                new THREE.Vector3(
                  x + 0.07,
                  0.027,
                  side * (0.15 - Math.abs(k - 2) * 0.026),
                ),
                0.0036,
                vein,
              ),
            );
          }
      }
    }
  }
  // One reusable, non-interactive cue per plant; it only appears after real growth.
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.43, 0.47, 28),
    new THREE.MeshBasicMaterial({
      color: 0xb6d67b,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.035;
  halo.visible = false;
  halo.raycast = () => {};
  root.add(halo);
  root.userData.halo = halo;
  root.userData.visualHealth = 70;
  root.userData.visualGrowth = 20;
  root.userData.appear = ghost ? 1 : 0.01;
  root.userData.speciesScale = {
    moss: 1.04,
    fern: 1.05,
    succulent: 0.9,
    fittonia: 1,
  }[species];
  root.userData.updateBatches = batchPlant(root, ghost);
  return root;
}
const yellow = new THREE.Color(0xb69c4f);
// Growth changes structure; health temporarily changes vigor and posture.
// Both are visual projections of the simulation, never inputs to its rules.
export function animatePlant(root, plant, dt, { instant = false } = {}) {
  const d = root.userData;
  if (d.targetHealth !== plant.health || d.targetGrowth !== plant.growth) {
    const growing =
      d.targetGrowth !== undefined && plant.growth > d.targetGrowth;
    d.transition = {
      health: d.visualHealth,
      growth: d.visualGrowth,
      elapsed: 0,
      growing,
    };
    d.targetHealth = plant.health;
    d.targetGrowth = plant.growth;
  }
  const beforeHealth = d.visualHealth,
    beforeGrowth = d.visualGrowth,
    beforeAppear = d.appear;
  const t = d.transition;
  t.elapsed = instant ? 1.1 : Math.min(1.1, t.elapsed + dt);
  const progress = t.elapsed / 1.1,
    eased = progress * progress * (3 - 2 * progress);
  d.visualHealth = THREE.MathUtils.lerp(t.health, plant.health, eased);
  d.visualGrowth = THREE.MathUtils.lerp(t.growth, plant.growth, eased);
  d.appear = instant
    ? 1
    : THREE.MathUtils.lerp(d.appear, 1, 1 - Math.exp(-dt * 10));
  if (1 - d.appear < 0.001) d.appear = 1;
  const growth = THREE.MathUtils.clamp((d.visualGrowth - 20) / 80, 0, 1),
    vigor = 0.8 + 0.2 * THREE.MathUtils.clamp(d.visualHealth / 100, 0, 1),
    pulse =
      !instant && t.growing && progress < 1 ? Math.sin(progress * Math.PI) : 0;
  root.scale.setScalar(
    d.speciesScale *
      (0.55 + 0.6 * growth) *
      vigor *
      d.appear *
      (1 + pulse * 0.035),
  );
  d.halo.visible = pulse > 0.001;
  d.halo.material.opacity = pulse * 0.55;
  d.halo.scale.setScalar(0.8 + progress * 0.65);
  const changed =
    Math.abs(beforeHealth - d.visualHealth) +
      Math.abs(beforeGrowth - d.visualGrowth) >
    0.00001;
  if (!changed && d.poseReady)
    return Math.abs(beforeAppear - d.appear) > 0.00001;
  d.poseReady = true;
  const stress = THREE.MathUtils.clamp((70 - d.visualHealth) / 65, 0, 1);
  for (const mat of d.materials)
    if (mat.userData.healthy)
      mat.color.copy(mat.userData.healthy).lerp(yellow, stress * 0.72);
  const unfold = (threshold) => {
    const p = THREE.MathUtils.clamp((d.visualGrowth - threshold) / 16, 0, 1);
    return Math.max(0.001, p * p * (3 - 2 * p));
  };
  for (const { object, threshold } of d.growthParts)
    object.scale.setScalar(unfold(threshold));
  for (const l of d.leaves) {
    if (l.quaternion) {
      l.pivot.quaternion.copy(l.quaternion);
      l.pivot.rotateZ(-stress * 0.4);
    } else l.pivot.rotation.z = l.angle - stress * 0.55;
    l.pivot.scale.setScalar(unfold(l.unfurlAt));
  }
  d.updateBatches();
  // Settled rigs reuse local matrices on camera frames. Poses refresh them here.
  root.traverse((o) => {
    if (o === root || o === d.halo) return;
    o.updateMatrix();
    o.matrixAutoUpdate = false;
  });
  return true;
}
export function disposePlant(root) {
  root.traverse((o) => {
    if (o.isInstancedMesh) o.dispose();
    if (o.geometry?.type === "TubeGeometry") o.geometry.dispose();
  });
  root.userData.halo.geometry.dispose();
  root.userData.halo.material.dispose();
  for (const mat of root.userData.materials) mat.dispose();
  root.removeFromParent();
}
export function createThumbnails(renderer) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfffcdf, 0x729675, 2.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.5);
  key.position.set(-3, 6, 5);
  scene.add(key);
  const camera = new THREE.PerspectiveCamera(32, 1.3, 0.1, 20),
    images = {};
  renderer.setSize(286, 220, false);
  for (const species of Object.keys(palettes)) {
    const model = createPlant(species);
    animatePlant(model, { health: 85, growth: 65 }, 0, { instant: true });
    model.rotation.y = -0.25;
    scene.add(model);
    const box = new THREE.Box3().setFromObject(model),
      size = box.getSize(new THREE.Vector3()),
      center = box.getCenter(new THREE.Vector3());
    const distance = Math.max(size.y, size.x / 1.3, size.z / 1.3) * 1.85 + 0.3;
    camera.position
      .copy(center)
      .add(
        new THREE.Vector3(1, 1.02, 1.7).normalize().multiplyScalar(distance),
      );
    camera.lookAt(center);
    renderer.render(scene, camera);
    images[species] = renderer.domElement.toDataURL("image/png");
    disposePlant(model);
  }
  return images;
}
