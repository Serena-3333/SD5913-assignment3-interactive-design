import * as THREE from "three";
import { SLOTS } from "../simulation/species.js";
import {
  SOIL_Y,
  SOIL_RADIUS,
  surfaceHeight,
} from "../simulation/environment.js";
import { moistureAt } from "../simulation/simulation.js";
import { mergeDecorations } from "./meshBatching.js";
import { stemBetween } from "./plantFactory.js";
export { SOIL_Y } from "../simulation/environment.js";
export function createTerrarium(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const mat = (color) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.92,
      flatShading: true,
    });
  function add(geometry, material, position = [0, 0, 0]) {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(...position);
    item.castShadow = true;
    item.receiveShadow = true;
    group.add(item);
    return item;
  }
  add(
    new THREE.CylinderGeometry(1.43, 1.38, 0.055, 32),
    mat(0xf1cc80),
    [0, 0.03, 0],
  );
  add(
    new THREE.CylinderGeometry(1.13, 1.03, 0.22, 20),
    mat(0x8a4b32),
    [0, 0.17, 0],
  );
  add(
    new THREE.CylinderGeometry(1.2, 1.13, 0.13, 20),
    mat(0xc68a55),
    [0, 0.32, 0],
  );
  add(
    new THREE.CylinderGeometry(1.255, 1.2, 0.19, 20),
    mat(0x875439),
    [0, 0.48, 0],
  );
  const decorations = [];
  const gravel = [mat(0xe6c78e), mat(0xc3b384), mat(0xebd8ae)];
  for (let i = 0; i < 27; i++) {
    const a = i * 2.39996,
      r = 0.92 + (i % 3) * 0.07,
      item = add(new THREE.DodecahedronGeometry(1, 0), gravel[i % 3], [
        Math.cos(a) * r,
        0.29 + (i % 3) * 0.05,
        Math.sin(a) * r,
      ]);
    item.scale.set(0.1 + (i % 2) * 0.025, 0.075, 0.08);
    item.rotation.y = a;
    decorations.push(item);
  }
  const points = [[0, surfaceHeight(0, 0), 0]];
  const radial = 7,
    segments = 40;
  for (let r = 1; r <= radial; r++)
    for (let j = 0; j < segments; j++) {
      const a = (j / segments) * Math.PI * 2 + (r % 2) * 0.028,
        rr = (r / radial) * SOIL_RADIUS,
        x = Math.cos(a) * rr,
        z = Math.sin(a) * rr;
      points.push([x, surfaceHeight(x, z), z]);
    }
  // Join the uneven top to the soil body so its perimeter is never a floating sheet.
  const skirt = [];
  for (let j = 0; j < segments; j++) {
    const a = points[1 + (radial - 1) * segments + j],
      b = points[1 + (radial - 1) * segments + ((j + 1) % segments)];
    skirt.push(
      ...a,
      ...b,
      b[0],
      0.53,
      b[2],
      ...a,
      b[0],
      0.53,
      b[2],
      a[0],
      0.53,
      a[2],
    );
  }
  const skirtGeometry = new THREE.BufferGeometry();
  skirtGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(skirt, 3),
  );
  skirtGeometry.computeVertexNormals();
  add(skirtGeometry, mat(0x9b673f));
  const indices = [];
  for (let j = 0; j < segments; j++)
    indices.push(0, 1 + ((j + 1) % segments), 1 + j);
  for (let r = 1; r < radial; r++)
    for (let j = 0; j < segments; j++) {
      const a = 1 + (r - 1) * segments + j,
        b = 1 + (r - 1) * segments + ((j + 1) % segments),
        c = 1 + r * segments + j,
        d = 1 + r * segments + ((j + 1) % segments);
      indices.push(a, d, c, a, b, d);
    }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(points.flat(), 3),
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const soilGeometry = geometry.toNonIndexed();
  geometry.dispose();
  const colors = new Float32Array(soilGeometry.attributes.position.count * 3);
  soilGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const soilSurface = add(
    soilGeometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      flatShading: true,
    }),
  );
  const position = soilGeometry.attributes.position,
    dry = new THREE.Color(0xc49257),
    wet = new THREE.Color(0x66432f),
    color = new THREE.Color();
  function updateSoil(state) {
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i),
        z = position.getZ(i),
        moisture = moistureAt(state, { x, z });
      color.copy(dry).lerp(wet, (moisture / 100) * 0.78);
      const variation = ((Math.floor(i / 3) % 5) - 2) * 0.017;
      color.offsetHSL(0, 0, variation);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    soilGeometry.attributes.color.needsUpdate = true;
  }
  const stone = mat(0x9ba388),
    stoneLight = mat(0xc2c5a1);
  for (const [x, z, sx, sy, sz] of [
    [-0.7, -0.67, 0.32, 0.24, 0.26],
    [-0.93, -0.35, 0.2, 0.13, 0.18],
    [-0.52, -0.9, 0.22, 0.18, 0.17],
    [0.85, -0.47, 0.19, 0.1, 0.16],
    [0.8, 0.64, 0.15, 0.08, 0.12],
  ]) {
    const item = add(
      new THREE.DodecahedronGeometry(1, 0),
      x < 0 ? stone : stoneLight,
      [x, surfaceHeight(x, z) + sy * 0.45, z],
    );
    item.scale.set(sx, sy, sz);
    item.rotation.set(0.1, x * 2, 0.12);
  }
  const twigMat = mat(0xa5693b),
    p1 = new THREE.Vector3(-0.87, surfaceHeight(-0.87, -0.14) + 0.04, -0.14),
    p2 = new THREE.Vector3(-0.34, surfaceHeight(-0.34, -0.85) + 0.04, -0.85);
  group.add(stemBetween(p1, p2, 0.045, twigMat));
  group.add(
    stemBetween(
      p1.clone().lerp(p2, 0.55),
      new THREE.Vector3(-0.87, 0.83, -0.62),
      0.025,
      twigMat,
    ),
  );
  for (let i = 0; i < 28; i++) {
    const a = i * 2.39996,
      r = Math.sqrt((i + 0.5) / 28) * 1.18,
      x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    const pebble = add(new THREE.IcosahedronGeometry(1, 0), gravel[i % 3], [
      x,
      surfaceHeight(x, z) + 0.013,
      z,
    ]);
    pebble.scale.set(0.025 + (i % 4) * 0.009, 0.015, 0.028);
    pebble.rotation.y = a;
    decorations.push(pebble);
  }
  mergeDecorations(group, decorations);
  const profile = [
    [1.01, 0.09],
    [1.2, 0.24],
    [1.4, 0.65],
    [1.46, 1.15],
    [1.4, 1.67],
    [1.23, 2.05],
    [1.13, 2.22],
    [1.13, 2.31],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const glass = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    vertexShader:
      "varying vec3 n; varying vec3 v; void main(){ vec4 p=modelViewMatrix*vec4(position,1.); n=normalMatrix*normal; v=-p.xyz; gl_Position=projectionMatrix*p; }",
    fragmentShader:
      "varying vec3 n; varying vec3 v; void main(){float edge=pow(1.-abs(dot(normalize(n),normalize(v))),3.); gl_FragColor=vec4(mix(vec3(.65,.91,.83),vec3(.14,.55,.50),edge),.015+edge*.22); #include <colorspace_fragment> }".replace(
        "#include <colorspace_fragment>",
        "\n#include <colorspace_fragment>\n",
      ),
  });
  const wall = add(new THREE.LatheGeometry(profile, 32), glass);
  wall.castShadow = false;
  wall.receiveShadow = false;
  wall.renderOrder = 6;
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x8ecbb2,
    roughness: 0.25,
    metalness: 0.05,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });
  for (const [r, y, t] of [
    [1.135, 2.31, 0.045],
    [1.135, 2.26, 0.022],
    [1.045, 0.1, 0.032],
  ]) {
    const item = add(new THREE.TorusGeometry(r, t, 6, 48), rimMat, [0, y, 0]);
    item.rotation.x = Math.PI / 2;
    item.castShadow = false;
    item.renderOrder = 7;
  }
  const white = new THREE.MeshBasicMaterial({
    color: 0xfffef3,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  for (const [angle, start, end, width] of [
    [0.46, 2, 6, 0.055],
    [2.05, 1, 5, 0.038],
  ]) {
    const verts = [];
    for (let k = start; k < end; k++) {
      const p = profile[k],
        q = profile[k + 1],
        w = width * (k === start ? 0.5 : 1),
        w2 = width * (k === end - 1 ? 0.45 : 1);
      const v = (pt, a) => [
        Math.cos(a) * (pt.x + 0.013),
        pt.y,
        Math.sin(a) * (pt.x + 0.013),
      ];
      verts.push(
        ...v(p, angle - w),
        ...v(q, angle - w2),
        ...v(q, angle + w2),
        ...v(p, angle - w),
        ...v(q, angle + w2),
        ...v(p, angle + w),
      );
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    const item = add(g, white);
    item.castShadow = false;
    item.renderOrder = 8;
  }
  const markers = SLOTS.map((slot, i) => {
    const ring = add(
      new THREE.RingGeometry(0.31, 0.34, 32),
      new THREE.MeshBasicMaterial({
        color: 0xfff1af,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      [slot.x, surfaceHeight(slot.x, slot.z) + 0.025, slot.z],
    );
    ring.rotation.x = -Math.PI / 2;
    ring.userData.slot = i;
    ring.castShadow = false;
    return ring;
  });
  return { group, soilSurface, markers, updateSoil, glass };
}
