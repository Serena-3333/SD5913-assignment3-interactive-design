import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Keep the botanical pivots for growth/health, but draw repeated blades in batches.
export function batchPlant(root, ghost) {
  const groups = new Map();
  root.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const key = mesh.geometry.uuid + mesh.material.uuid;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(mesh);
  });
  const batches = [];
  for (const sources of groups.values()) {
    if (sources.length < 2) continue;
    const first = sources[0];
    const mesh = new THREE.InstancedMesh(
      first.geometry,
      first.material,
      sources.length,
    );
    mesh.castShadow = !ghost;
    mesh.receiveShadow = true;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (const source of sources) {
      source.visible = false;
      source.castShadow = false;
      // The visible instances provide the same world-space raycast targets.
      source.raycast = () => {};
    }
    root.add(mesh);
    batches.push({ mesh, sources });
  }
  const matrix = new THREE.Matrix4();
  function update() {
    for (const { mesh, sources } of batches) {
      sources.forEach((source, i) => {
        source.updateMatrix();
        matrix.copy(source.matrix);
        let parent = source.parent;
        while (parent && parent !== root) {
          parent.updateMatrix();
          matrix.premultiply(parent.matrix);
          parent = parent.parent;
        }
        mesh.setMatrixAt(i, matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }
  update();
  return update;
}

// Static gravel retains its individual facets with a single draw per material.
export function mergeDecorations(parent, sources) {
  const groups = new Map();
  for (const source of sources) {
    if (!groups.has(source.material)) groups.set(source.material, []);
    groups.get(source.material).push(source);
  }
  for (const [material, objects] of groups) {
    if (objects.length < 2) continue;
    const parts = objects.map((o) => {
      o.updateMatrix();
      const g = o.geometry.index
        ? o.geometry.toNonIndexed()
        : o.geometry.clone();
      return g.applyMatrix4(o.matrix);
    });
    const geometry = mergeGeometries(parts);
    parts.forEach((g) => g.dispose());
    if (!geometry) continue;
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    for (const object of objects) {
      object.removeFromParent();
      object.geometry.dispose();
    }
  }
}
