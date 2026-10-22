import * as THREE from "three";
import { stemBetween } from "./plantFactory.js";
import { WATER_RADIUS, surfaceHeight } from "../simulation/environment.js";
import { createFootprint } from "./footprint.js";
export function createWateringCan(scene) {
  const group = new THREE.Group();
  group.userData.kind = "water";
  const blue = new THREE.MeshStandardMaterial({
      color: 0x4faaa9,
      roughness: 0.68,
      flatShading: true,
    }),
    cream = new THREE.MeshStandardMaterial({
      color: 0xffedc5,
      roughness: 0.75,
    }),
    dark = new THREE.MeshStandardMaterial({ color: 0x2c7b82, roughness: 0.7 });
  function add(g, m = blue) {
    const o = new THREE.Mesh(g, m);
    o.castShadow = true;
    o.receiveShadow = true;
    group.add(o);
    return o;
  }
  const body = add(new THREE.CylinderGeometry(0.275, 0.23, 0.43, 12));
  body.position.y = 0.24;
  const rim = add(new THREE.TorusGeometry(0.273, 0.023, 5, 24), cream);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.46;
  const surface = add(new THREE.CircleGeometry(0.25, 24), dark);
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = 0.43;
  const band = add(new THREE.CylinderGeometry(0.263, 0.258, 0.06, 12), cream);
  band.position.y = 0.3;
  const handle = add(
    new THREE.TorusGeometry(0.22, 0.039, 5, 20, Math.PI * 1.6),
  );
  handle.position.set(-0.28, 0.24, 0);
  handle.rotation.z = 0.63;
  group.add(
    stemBetween(
      new THREE.Vector3(0.2, 0.17, 0),
      new THREE.Vector3(0.72, 0.52, 0),
      0.052,
      blue,
    ),
  );
  const rose = add(new THREE.ConeGeometry(0.115, 0.15, 10), cream);
  rose.position.set(0.73, 0.53, 0);
  rose.rotation.z = -Math.PI / 3;
  const home = new THREE.Vector3(-1.89, -0.025, 1.03),
    destination = home.clone();
  group.position.copy(home);
  group.rotation.y = -0.22;
  const decal = add(new THREE.IcosahedronGeometry(0.053, 0), cream);
  decal.position.set(0.07, 0.24, 0.245);
  decal.scale.set(1.2, 1.3, 0.25);
  scene.add(group);
  const drops = new THREE.Group(),
    dropMat = new THREE.MeshBasicMaterial({
      color: 0x79d8dc,
      transparent: true,
      opacity: 0.9,
    });
  const dropGeometry = new THREE.IcosahedronGeometry(0.025, 0);
  for (let i = 0; i < 22; i++) {
    const drop = new THREE.Mesh(dropGeometry, dropMat);
    drop.scale.y = 1.8;
    drops.add(drop);
  }
  drops.visible = false;
  scene.add(drops);
  const footprint = createFootprint(scene, 0x49bccc);
  let preview = null,
    pourPoint = null,
    started = null,
    clock = 0,
    active = false,
    hovered = false;
  const nozzle = new THREE.Vector3(),
    target = new THREE.Vector3();
  function rest() {
    destination.copy(home);
    if (hovered) destination.y += 0.09;
  }
  function positionFor(point) {
    destination.set(point.x - 0.67, 2.45, point.z + 0.025);
  }
  return {
    group,
    rose,
    footprint,
    setHovered(value) {
      hovered = value;
      if (!active && !preview) rest();
    },
    preview(point) {
      preview = point;
      if (point) {
        positionFor(point);
        footprint.circle(point, WATER_RADIUS);
        footprint.material.uniforms.opacity.value = 0.9;
      } else if (!active) {
        rest();
        footprint.mesh.visible = false;
      }
    },
    pour(point, time) {
      pourPoint = { ...point };
      preview = null;
      started = null;
      active = true;
      positionFor(point);
      footprint.circle(point, WATER_RADIUS);
    },
    cancel() {
      preview = null;
      if (!active) {
        rest();
        footprint.mesh.visible = false;
      }
    },
    animate(time, alpha) {
      clock = time;
      const lifted = !!preview || active;
      if (lifted && group.position.y < 2.34) {
        group.position.y = THREE.MathUtils.lerp(group.position.y, 2.45, alpha);
      } else if (
        !lifted &&
        Math.hypot(group.position.x - home.x, group.position.z - home.z) > 0.06
      ) {
        group.position.x = THREE.MathUtils.lerp(
          group.position.x,
          home.x,
          alpha,
        );
        group.position.z = THREE.MathUtils.lerp(
          group.position.z,
          home.z,
          alpha,
        );
      } else group.position.lerp(destination, alpha);
      if (
        active &&
        started === null &&
        group.position.distanceTo(destination) < 0.09
      )
        started = time;
      const age = started === null ? 0 : time - started;
      if (active && started !== null && age > 1) {
        active = false;
        rest();
      }
      group.rotation.y = THREE.MathUtils.lerp(
        group.rotation.y,
        active || preview ? 0 : -0.22,
        alpha,
      );
      group.rotation.z = THREE.MathUtils.lerp(
        group.rotation.z,
        active ? -0.24 : preview ? -0.1 : 0,
        alpha,
      );
      drops.visible = active && started !== null;
      if (active && started !== null) {
        group.updateMatrixWorld(true);
        rose.getWorldPosition(nozzle);
        target.set(
          pourPoint.x,
          surfaceHeight(pourPoint.x, pourPoint.z) + 0.035,
          pourPoint.z,
        );
        drops.children.forEach((drop, i) => {
          const t = (age * 1.9 + i / 22) % 1;
          drop.position.copy(nozzle).lerp(target, t);
          drop.position.x += Math.sin(i * 2.4) * 0.035 * t;
          drop.position.z += Math.cos(i * 2.4) * 0.035 * t;
        });
        footprint.material.uniforms.opacity.value = Math.max(
          0.1,
          1 - age * 0.75,
        );
      } else if (!preview) footprint.mesh.visible = false;
    },
    get pouring() {
      return active;
    },
    get moving() {
      return group.position.distanceTo(destination) > 0.005;
    },
  };
}
