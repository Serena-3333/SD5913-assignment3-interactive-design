import * as THREE from "three";

const palettes = {
  moss: [0x699239, 0x8db44c, 0x527e36, 0xa5c260],
  fern: [0x417747, 0x5c9c52, 0x85b95e, 0x346444],
  succulent: [0x73a99b, 0x96c3a7, 0x518c83, 0xaacbad],
  fittonia: [0x467547, 0x618e4b, 0x7aa25d, 0x3e6241],
};
const up = new THREE.Vector3(0, 1, 0);
const unitLeaf = new THREE.IcosahedronGeometry(1, 0);
const sphere = new THREE.IcosahedronGeometry(1, 1);
const stemGeometry = new THREE.CylinderGeometry(1, 1, 1, 6);

export function stemBetween(a, b, radius, material) {
  const mesh = new THREE.Mesh(stemGeometry, material);
  const direction = new THREE.Vector3().subVectors(b, a);
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
  root.userData.materials = palettes[species].map((color) => {
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.87,
      flatShading: true,
      transparent: ghost,
      opacity: ghost ? 0.48 : 1,
      depthWrite: !ghost,
    });
    material.userData.healthy = new THREE.Color(color);
    return material;
  });
  const materials = root.userData.materials;
  function leaf(
    parent,
    pos,
    size,
    rotation,
    mat,
    extra = false,
    geometry = unitLeaf,
  ) {
    const mesh = new THREE.Mesh(geometry, materials[mat % materials.length]);
    mesh.position.set(...pos);
    mesh.scale.set(...size);
    mesh.rotation.set(...rotation);
    mesh.castShadow = !ghost;
    mesh.receiveShadow = true;
    mesh.userData.baseRotation = mesh.rotation.z;
    mesh.userData.baseScale = mesh.scale.clone();
    mesh.userData.extra = extra;
    root.userData.leaves.push(mesh);
    parent.add(mesh);
    return mesh;
  }

  if (species === "moss") {
    for (let i = 0; i < 13; i++) {
      const angle = i * 2.39996;
      const radius = i === 0 ? 0 : 0.19 + (i % 3) * 0.14;
      const x = Math.cos(angle) * radius,
        z = Math.sin(angle) * radius;
      const height = 0.23 + (1 - radius) * 0.18 + (i % 3) * 0.025;
      leaf(
        root,
        [x, height * 0.62, z],
        [0.31, height, 0.29],
        [0, angle, 0.1],
        i,
        i > 9,
        sphere,
      );
      for (let j = 0; j < 4; j++) {
        const phi = j * 2.1 + i;
        leaf(
          root,
          [x + Math.cos(phi) * 0.17, height * 1.38, z + Math.sin(phi) * 0.16],
          [0.047, 0.065, 0.048],
          [0, phi, 0.2],
          i + j,
          i > 9,
        );
      }
    }
  } else if (species === "fern") {
    for (let i = 0; i < 8; i++) {
      const frond = new THREE.Group();
      frond.rotation.y = (i * Math.PI * 2) / 8;
      root.add(frond);
      const height = 1.12 + (i % 3) * 0.22;
      const reach = 0.56 + (i % 2) * 0.15;
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(),
        new THREE.Vector3(0.02, height * 0.9, 0.02),
        new THREE.Vector3(reach, height, 0),
      );
      const stem = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 10, 0.015, 5, false),
        materials[0],
      );
      frond.add(stem);
      for (let j = 1; j < 8; j++) {
        const t = j / 8;
        const p = curve.getPoint(t);
        const length = 0.27 * Math.sin(t * Math.PI) + 0.045;
        for (const side of [-1, 1]) {
          const mesh = leaf(
            frond,
            [p.x + 0.03, p.y + 0.035, side * length * 0.59],
            [0.075 * (1 - t * 0.35), 0.032, length * 0.73],
            [side * -0.24, side * -0.42, -0.2],
            i + j,
            i > 5 && j > 4,
          );
          mesh.userData.frondSide = side;
        }
      }
      leaf(frond, [reach, height, 0], [0.07, 0.17, 0.045], [0, 0, -0.6], 2);
    }
  } else if (species === "succulent") {
    for (let ring = 0; ring < 3; ring++) {
      const count = [10, 8, 6][ring];
      for (let i = 0; i < count; i++) {
        const angle = (i * Math.PI * 2) / count + ring * 0.45;
        const group = new THREE.Group();
        group.rotation.y = angle;
        root.add(group);
        const r = [0.35, 0.23, 0.1][ring];
        leaf(
          group,
          [r, 0.18 + ring * 0.16, 0],
          [0.38 - ring * 0.075, 0.12 + ring * 0.015, 0.16 - ring * 0.025],
          [0, 0, 0.28 + ring * 0.29],
          i + ring,
          ring === 0 && i > 7,
        );
      }
    }
    leaf(root, [0, 0.62, 0], [0.12, 0.19, 0.11], [0, 0, 0.1], 1);
  } else if (species === "fittonia") {
    const veinMaterial = new THREE.MeshStandardMaterial({
      color: 0xd7d8b4,
      roughness: 0.9,
      transparent: ghost,
      opacity: ghost ? 0.48 : 1,
    });
    root.userData.materials.push(veinMaterial);
    for (let i = 0; i < 5; i++) {
      const angle = i * 2.39996;
      const top = new THREE.Vector3(
        Math.cos(angle) * 0.26,
        0.45 + (i % 3) * 0.2,
        Math.sin(angle) * 0.26,
      );
      root.add(stemBetween(new THREE.Vector3(), top, 0.021, materials[0]));
      for (let j = 0; j < 2; j++) {
        const group = new THREE.Group();
        group.position.copy(top).multiplyScalar(j === 0 ? 0.68 : 1);
        group.rotation.y = angle + j * Math.PI;
        group.rotation.z = 0.24;
        root.add(group);
        leaf(
          group,
          [0.23, 0.02, 0],
          [0.32, 0.057, 0.2],
          [0, 0, 0.08],
          i + j,
          i === 4,
        );
        group.add(
          stemBetween(
            new THREE.Vector3(0, 0.069, 0),
            new THREE.Vector3(0.51, 0.069, 0),
            0.008,
            veinMaterial,
          ),
        );
        for (let k = 1; k <= 3; k++) {
          for (const side of [-1, 1])
            group.add(
              stemBetween(
                new THREE.Vector3(k * 0.11, 0.071, 0),
                new THREE.Vector3(
                  k * 0.11 + 0.08,
                  0.071,
                  side * (0.16 - Math.abs(2 - k) * 0.03),
                ),
                0.005,
                veinMaterial,
              ),
            );
        }
      }
    }
  }
  root.userData.visualHealth = 70;
  root.userData.visualGrowth = 20;
  root.userData.appear = ghost ? 1 : 0.01;
  return root;
}

export function animatePlant(root, plant, alpha) {
  const data = root.userData;
  data.visualHealth = THREE.MathUtils.lerp(
    data.visualHealth,
    plant.health,
    alpha,
  );
  data.visualGrowth = THREE.MathUtils.lerp(
    data.visualGrowth,
    plant.growth,
    alpha,
  );
  data.appear = THREE.MathUtils.lerp(data.appear, 1, alpha);
  const scale = (0.76 + data.visualGrowth * 0.004) * data.appear;
  root.scale.setScalar(scale);
  const stress = THREE.MathUtils.clamp((70 - data.visualHealth) / 65, 0, 1);
  for (const material of data.materials) {
    if (material.userData.healthy)
      material.color
        .copy(material.userData.healthy)
        .lerp(new THREE.Color(0xb7a554), stress * 0.75);
  }
  for (const leaf of data.leaves) {
    leaf.rotation.z = leaf.userData.baseRotation - stress * 0.32;
    const reveal = leaf.userData.extra
      ? THREE.MathUtils.clamp((data.visualGrowth - 20) / 25, 0.01, 1)
      : 1;
    leaf.scale.copy(leaf.userData.baseScale).multiplyScalar(reveal);
  }
}

export function disposePlant(root) {
  // Unit leaf/stem geometries are shared; only dispose plant-owned tube geometry.
  root.traverse((object) => {
    if (object.isMesh && object.geometry.type === "TubeGeometry")
      object.geometry.dispose();
  });
  for (const material of root.userData.materials) material.dispose();
  root.removeFromParent();
}

export function createThumbnails(renderer) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfffbed, 0x617454, 2));
  const key = new THREE.DirectionalLight(0xfffaf0, 2.8);
  key.position.set(-3, 6, 5);
  scene.add(key);
  const camera = new THREE.PerspectiveCamera(32, 1.3, 0.1, 20);
  const images = {};
  renderer.setSize(260, 200, false);
  for (const species of Object.keys(palettes)) {
    const model = createPlant(species);
    const height = species === "fern" ? 0.68 : 0.35;
    camera.position.set(1.45, 1.4 + height, 2.25);
    camera.lookAt(0, height, 0);
    model.rotation.y = -0.35;
    scene.add(model);
    animatePlant(model, { health: 85, growth: 50 }, 1);
    renderer.render(scene, camera);
    images[species] = renderer.domElement.toDataURL("image/png");
    disposePlant(model);
  }
  return images;
}
