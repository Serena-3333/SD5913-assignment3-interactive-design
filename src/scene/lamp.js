import * as THREE from "three";
import { stemBetween } from "./plantFactory.js";

export function createLamp(scene) {
  const group = new THREE.Group();
  const sage = new THREE.MeshStandardMaterial({
    color: 0x7a8a53,
    flatShading: true,
    roughness: 0.68,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x52613e,
    roughness: 0.72,
  });
  function add(geometry, mat, x, y, z) {
    const item = new THREE.Mesh(geometry, mat);
    item.position.set(x, y, z);
    item.castShadow = true;
    group.add(item);
    return item;
  }
  add(new THREE.CylinderGeometry(0.42, 0.52, 0.15, 12), sage, 2.9, 0.09, -1.8);
  group.add(
    stemBetween(
      new THREE.Vector3(2.9, 0.15, -1.8),
      new THREE.Vector3(3.1, 1.85, -1.8),
      0.06,
      dark,
    ),
  );
  add(new THREE.IcosahedronGeometry(0.105, 1), sage, 3.1, 1.85, -1.8);
  const upper = stemBetween(
    new THREE.Vector3(3.1, 1.85, -1.8),
    new THREE.Vector3(2.85, 3.6, -1.8),
    0.06,
    sage,
  );
  group.add(upper);
  add(new THREE.IcosahedronGeometry(0.11, 1), sage, 2.85, 3.6, -1.8);
  const arm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 1, 8),
    dark,
  );
  group.add(arm);
  const head = new THREE.Group();
  head.userData.kind = "lamp";
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.44, 0.48, 12, 1, true),
    sage,
  );
  shade.castShadow = true;
  head.add(shade);
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xffe4a4,
    emissive: 0xffd783,
    emissiveIntensity: 0.65,
  });
  const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.39, 24), bulbMat);
  bulb.rotation.x = Math.PI / 2;
  bulb.position.y = -0.22;
  head.add(bulb);
  group.add(head);
  const light = new THREE.SpotLight(0xffe3b6, 18, 14, Math.PI / 4, 0.8, 1.4);
  light.target.position.set(0, 0.4, 0);
  scene.add(group, light, light.target);
  function update(position) {
    head.position.set(position.x, 3.35, position.z);
    const a = new THREE.Vector3(2.85, 3.6, -1.8);
    const b = new THREE.Vector3(position.x, 3.58, position.z);
    arm.position.copy(a).add(b).multiplyScalar(0.5);
    arm.scale.set(1, a.distanceTo(b), 1);
    arm.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      b.sub(a).normalize(),
    );
    light.position.copy(head.position);
  }
  return { group, head, update };
}
