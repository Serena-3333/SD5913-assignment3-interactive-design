import * as THREE from "three";
import { stemBetween } from "./plantFactory.js";
import { lampFrame, surfaceHeight } from "../simulation/environment.js";
import { createFootprint } from "./footprint.js";
const V = (p) => new THREE.Vector3(p.x, p.y, p.z);
export function createLamp(scene) {
  const group = new THREE.Group(),
    yellow = new THREE.MeshStandardMaterial({
      color: 0xe7b73e,
      roughness: 0.68,
      flatShading: true,
    }),
    cream = new THREE.MeshStandardMaterial({ color: 0xffecc4, roughness: 0.6 }),
    dark = new THREE.MeshStandardMaterial({ color: 0x6b6745, roughness: 0.7 });
  function add(g, m, parent = group) {
    const mesh = new THREE.Mesh(g, m);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  const base = add(new THREE.CylinderGeometry(0.29, 0.36, 0.13, 12), yellow),
    baseBand = add(new THREE.CylinderGeometry(0.3, 0.34, 0.035, 12), cream);
  const pole = stemBetween(
    new THREE.Vector3(),
    new THREE.Vector3(0, 1, 0),
    0.044,
    dark,
  );
  group.add(pole);
  const arm = stemBetween(
    new THREE.Vector3(),
    new THREE.Vector3(0, 1, 0),
    0.055,
    yellow,
  );
  group.add(arm);
  const joint1 = add(new THREE.IcosahedronGeometry(0.085, 1), cream),
    joint2 = add(new THREE.IcosahedronGeometry(0.082, 1), cream);
  const head = new THREE.Group();
  head.userData.kind = "lamp";
  group.userData.kind = "lamp";
  group.add(head);
  const shade = add(
    new THREE.CylinderGeometry(0.105, 0.34, 0.34, 12, 1, true),
    yellow,
    head,
  );
  shade.position.y = -0.17;
  const lip = add(new THREE.TorusGeometry(0.332, 0.024, 5, 24), cream, head);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = -0.34;
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xfff4b8,
    emissive: 0xffd357,
    emissiveIntensity: 0.8,
  });
  const bulb = add(new THREE.CircleGeometry(0.31, 24), bulbMat, head);
  bulb.rotation.x = Math.PI / 2;
  bulb.position.y = -0.338;
  bulb.castShadow = false;
  const light = new THREE.SpotLight(0xffe7a7, 22, 8, 0.3, 0.3, 2);
  light.castShadow = true;
  light.shadow.mapSize.set(768, 768);
  light.shadow.camera.near = 0.1;
  light.shadow.camera.far = 6;
  light.shadow.normalBias = 0.015;
  light.shadow.bias = -0.00025;
  const footprint = createFootprint(scene, 0xf2c442);
  const aimHandle = new THREE.Mesh(
    new THREE.SphereGeometry(0.085, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe591 }),
  );
  aimHandle.userData.kind = "aim";
  aimHandle.scale.y = 0.22;
  aimHandle.visible = false;
  scene.add(aimHandle);
  scene.add(group, light, light.target);
  let active = false,
    hovered = false,
    lastFrame,
    lastLamp;
  function span(mesh, a, b) {
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.scale.set(0.044, a.distanceTo(b), 0.044);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      b.clone().sub(a).normalize(),
    );
  }
  function update(lamp) {
    lastLamp = lamp;
    const f = lampFrame(lamp);
    lastFrame = f;
    base.position.set(f.base.x, 0.065, f.base.z);
    baseBand.position.set(f.base.x, 0.025, f.base.z);
    const top = new THREE.Vector3(f.base.x, 2.95, f.base.z),
      basePoint = new THREE.Vector3(f.base.x, 0.12, f.base.z);
    span(pole, basePoint, top);
    span(arm, top, V(f.head));
    arm.scale.x = arm.scale.z = 0.055;
    joint1.position.copy(top);
    joint2.position.copy(V(f.head));
    head.position.copy(V(f.head));
    head.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, -1, 0),
      V(f.direction),
    );
    light.position.copy(V(f.emitter));
    light.target.position.copy(V(f.aim));
    light.angle = f.halfAngle;
    // Hover only brightens the rendered lamp; simulation power stays unchanged.
    light.intensity = (lamp.power / 100) * 28 * (hovered ? 1.4 : 1);
    light.shadow.camera.updateProjectionMatrix();
    bulbMat.emissiveIntensity = (lamp.power / 100) * (hovered ? 1.5 : 0.9);
    const axis = V(f.direction),
      right = new THREE.Vector3()
        .crossVectors(axis, new THREE.Vector3(0, 1, 0))
        .normalize(),
      up = new THREE.Vector3().crossVectors(right, axis).normalize();
    footprint.update(f.aim, (a) => {
      const ray = axis
        .clone()
        .multiplyScalar(Math.cos(f.halfAngle))
        .addScaledVector(right, Math.sin(f.halfAngle) * Math.cos(a))
        .addScaledVector(up, Math.sin(f.halfAngle) * Math.sin(a));
      let t = (f.aim.y - f.emitter.y) / ray.y,
        p;
      for (let i = 0; i < 3; i++) {
        p = V(f.emitter).addScaledVector(ray, t);
        t = (surfaceHeight(p.x, p.z) - f.emitter.y) / ray.y;
      }
      return { x: p.x, z: p.z };
    });
    footprint.mesh.visible = lamp.power > 0;
    footprint.material.uniforms.opacity.value =
      ((active || hovered ? 0.95 : 0.6) * lamp.power) / 100;
    aimHandle.position.set(f.aim.x, f.aim.y + 0.055, f.aim.z);
    aimHandle.visible = active || hovered;
  }
  return {
    group,
    head,
    light,
    aimHandle,
    footprint,
    update,
    get frame() {
      return lastFrame;
    },
    containsPoint(point) {
      if (!point) return false;
      // Hit-test the actual projected cone polygon in world XZ, not its screen pixels.
      const a = footprint.mesh.geometry.attributes.position;
      let inside = false;
      for (let i = 1, j = a.count - 1; i < a.count; j = i++) {
        const xi = a.getX(i),
          zi = a.getZ(i),
          xj = a.getX(j),
          zj = a.getZ(j);
        if (
          zi > point.z !== zj > point.z &&
          point.x < ((xj - xi) * (point.z - zi)) / (zj - zi) + xi
        )
          inside = !inside;
      }
      return inside;
    },
    setHovered(value) {
      if (hovered === value) return;
      hovered = value;
      if (lastLamp) update(lastLamp);
    },
    setActive(value) {
      active = value;
      if (lastLamp) update(lastLamp);
    },
  };
}
