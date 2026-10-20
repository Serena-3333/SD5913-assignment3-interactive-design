import * as THREE from "three";
import { SLOTS } from "../simulation/species.js";

export const SOIL_Y = 0.66;
export function createTerrarium(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const mat = (color) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.94,
      flatShading: true,
    });
  function mesh(geometry, material, y) {
    const item = new THREE.Mesh(geometry, material);
    item.position.y = y;
    item.castShadow = true;
    item.receiveShadow = true;
    group.add(item);
    return item;
  }
  mesh(new THREE.CylinderGeometry(1.98, 1.74, 0.27, 48), mat(0x73523a), 0.23);
  mesh(new THREE.CylinderGeometry(2.01, 1.97, 0.12, 48), mat(0x947054), 0.42);
  const soilMaterial = mat(0xa88a59);
  mesh(
    new THREE.CylinderGeometry(2.02, 2, 0.22, 48),
    soilMaterial,
    SOIL_Y - 0.11,
  );
  const gravel = [mat(0xc7b78f), mat(0xbdb9a0), mat(0x929681), mat(0xe2d6b4)];
  for (let i = 0; i < 96; i++) {
    const a = i * 2.399963;
    const r = Math.sqrt((i + 0.5) / 96) * 1.94;
    const pebble = mesh(
      new THREE.IcosahedronGeometry(1, 0),
      gravel[i % 4],
      SOIL_Y + 0.012,
    );
    pebble.position.x = Math.cos(a) * r;
    pebble.position.z = Math.sin(a) * r;
    const size = i % 15 === 0 ? 0.12 : 0.025 + (i % 4) * 0.008;
    pebble.scale.set(size * 1.3, size * 0.58, size);
    pebble.rotation.y = a;
  }
  const profile = [
    [1.7, 0.07],
    [1.94, 0.25],
    [2.14, 0.7],
    [2.25, 1.35],
    [2.21, 1.95],
    [2.08, 2.5],
    [1.88, 2.98],
    [1.86, 3.07],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const glass = new THREE.MeshStandardMaterial({
    color: 0xc5d8bd,
    roughness: 0.15,
    metalness: 0.07,
    transparent: true,
    opacity: 0.085,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const wall = mesh(new THREE.LatheGeometry(profile, 64), glass, 0);
  wall.castShadow = false;
  wall.receiveShadow = false;
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x9eafa0,
    roughness: 0.25,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  });
  for (const [r, y, tube] of [
    [1.865, 3.065, 0.035],
    [1.86, 3.025, 0.018],
    [1.75, 0.1, 0.025],
  ]) {
    const rim = mesh(new THREE.TorusGeometry(r, tube, 8, 96), rimMat, y);
    rim.rotation.x = Math.PI / 2;
    rim.castShadow = false;
  }
  const highlight = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  for (const a of [0.75, 3.5]) {
    const points = profile
      .slice(2, 7)
      .map(
        (p) =>
          new THREE.Vector3(
            Math.cos(a) * (p.x + 0.014),
            p.y,
            Math.sin(a) * (p.x + 0.014),
          ),
      );
    const line = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        24,
        0.026,
        5,
        false,
      ),
      highlight,
    );
    group.add(line);
  }
  const markers = SLOTS.map((slot, i) => {
    const ring = mesh(
      new THREE.RingGeometry(0.39, 0.415, 48),
      new THREE.MeshBasicMaterial({
        color: 0xf5f0d3,
        transparent: true,
        opacity: 0.54,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      SOIL_Y + 0.027,
    );
    ring.position.set(slot.x, SOIL_Y + 0.027, slot.z);
    ring.rotation.x = -Math.PI / 2;
    ring.userData.slot = i;
    return ring;
  });
  return { group, soilMaterial, markers };
}
