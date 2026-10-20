import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SLOTS } from "../simulation/species.js";
import { CAMERA, surfaceHeight } from "../simulation/environment.js";
import { createTerrarium } from "./terrarium.js";
import {
  createPlant,
  animatePlant,
  disposePlant,
  createThumbnails,
} from "./plantFactory.js";
import { createLamp } from "./lamp.js";
import { createWateringCan } from "./wateringCan.js";
export function createScene(container, getState) {
  const scene = new THREE.Scene(),
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0xf9f5dc, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.03;
  const thumbnails = createThumbnails(renderer);
  container.prepend(renderer.domElement);
  renderer.domElement.setAttribute(
    "aria-label",
    "3D terrarium. Drag plants to move, the can to water, the lamp to position it, and empty space to rotate.",
  );
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 40);
  camera.position.set(...CAMERA.position);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(...CAMERA.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 6;
  controls.maxDistance = 11;
  controls.minPolarAngle = 0.4;
  controls.maxPolarAngle = Math.PI / 2 - 0.12;
  controls.update();
  controls.saveState();
  const hemisphere = new THREE.HemisphereLight(0xfffce8, 0x6c9776, 2.0);
  scene.add(hemisphere);
  const key = new THREE.DirectionalLight(0xfffaf0, 2.4);
  key.position.set(-3, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, {
    left: -3.5,
    right: 3.5,
    top: 3.5,
    bottom: -3.5,
    near: 0.1,
    far: 14,
  });
  key.shadow.normalBias = 0.02;
  key.shadow.bias = -0.0002;
  scene.add(key);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.ShadowMaterial({ opacity: 0.12 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(2.5, 64),
    new THREE.MeshBasicMaterial({
      color: 0xe5eab2,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.006;
  floor.scale.set(1, 0.78, 1);
  scene.add(floor);
  const terrarium = createTerrarium(scene),
    lamp = createLamp(scene),
    wateringCan = createWateringCan(scene),
    plants = new Map();
  let ghost = null,
    hiddenSpecies = null,
    selectedSlot = -1,
    choosing = false,
    tool = null,
    lastField = null,
    frame = 0,
    until = 0,
    alive = true,
    last = performance.now();
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const target = new THREE.Vector3();
  function invalidate(duration = 350) {
    until = Math.max(until, performance.now() + duration);
    if (!frame && alive) frame = requestAnimationFrame(tick);
  }
  controls.addEventListener("change", () => invalidate(250));
  function sync() {
    const state = getState();
    for (const [species, model] of plants)
      if (!state.plants.some((p) => p.species === species)) {
        disposePlant(model);
        plants.delete(species);
      }
    for (const plant of state.plants)
      if (!plants.has(plant.species)) {
        const model = createPlant(plant.species),
          p = SLOTS[plant.slot];
        model.position.set(p.x, surfaceHeight(p.x, p.z), p.z);
        scene.add(model);
        plants.set(plant.species, model);
      }
    lamp.update(state.lamp);
    renderer.shadowMap.needsUpdate = true;
    if (lastField !== state.moisture) {
      terrarium.updateSoil(state);
      lastField = state.moisture;
    }
    invalidate(1100);
  }
  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = THREE.MathUtils.radToDeg(
      2 *
        Math.atan(
          Math.tan(THREE.MathUtils.degToRad(CAMERA.fov) / 2) *
            Math.max(1, 1.3 / camera.aspect),
        ),
    );
    camera.updateProjectionMatrix();
    invalidate();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  function tick(now) {
    frame = 0;
    if (!alive || document.hidden) return;
    const frameTime = now - last;
    // Keep drawing resolution stable, including during slow frames and gestures.
    const dt = Math.min(frameTime / 1000, 0.05),
      alpha = reducedMotion ? 1 : 1 - Math.exp(-dt * 10);
    last = now;
    const state = getState();
    for (const plant of state.plants) {
      const model = plants.get(plant.species);
      if (!model) continue;
      const p = SLOTS[plant.slot];
      target.set(p.x, surfaceHeight(p.x, p.z), p.z);
      const moving = model.position.distanceToSquared(target) > 0.00000001;
      if (moving) model.position.lerp(target, alpha);
      model.visible = plant.species !== hiddenSpecies;
      if (animatePlant(model, plant, alpha) || moving)
        renderer.shadowMap.needsUpdate = true;
    }
    terrarium.markers.forEach((marker, i) => {
      const occupied = state.plants.some((p) => p.slot === i);
      marker.material.color.set(i === selectedSlot ? 0xd7f589 : 0xffe5a0);
      marker.material.opacity =
        i === selectedSlot
          ? 0.95
          : occupied && !choosing
            ? 0.04
            : choosing
              ? 0.7
              : 0.3;
    });
    if (wateringCan.moving || wateringCan.pouring)
      renderer.shadowMap.needsUpdate = true;
    wateringCan.animate(now / 1000, alpha);
    controls.update();
    renderer.render(scene, camera);
    if (now < until || wateringCan.pouring || wateringCan.moving)
      frame = requestAnimationFrame(tick);
  }
  const onVisibility = () => {
    if (!document.hidden) invalidate();
  };
  document.addEventListener("visibilitychange", onVisibility);
  sync();
  return {
    scene,
    renderer,
    camera,
    controls,
    plants,
    terrarium,
    lamp,
    wateringCan,
    thumbnails,
    sync,
    invalidate,
    studioLights: [hemisphere, key],
    setTool(value) {
      tool = value;
      lamp.setActive(value === "lamp");
      invalidate();
    },
    pour(point) {
      wateringCan.pour(point, performance.now() / 1000);
      invalidate(2200);
    },
    waterPreview(point) {
      wateringCan.preview(point);
      invalidate();
    },
    highlight(slot, isChoosing = false) {
      selectedSlot = slot;
      choosing = isChoosing;
      invalidate();
    },
    preview(species, slot, health = 70, growth = 20) {
      if (ghost?.userData.species !== species) {
        if (ghost) disposePlant(ghost);
        ghost = createPlant(species, { ghost: true });
        animatePlant(ghost, { health, growth }, 1);
        scene.add(ghost);
      }
      ghost.visible = slot >= 0;
      if (slot >= 0) {
        const p = SLOTS[slot];
        ghost.position.set(p.x, surfaceHeight(p.x, p.z) + 0.015, p.z);
      }
      invalidate();
    },
    hideSpecies(species) {
      hiddenSpecies = species;
      invalidate();
    },
    clearPreview() {
      if (ghost) {
        disposePlant(ghost);
        ghost = null;
      }
      hiddenSpecies = null;
      selectedSlot = -1;
      wateringCan.cancel();
      invalidate();
    },
    resetCamera() {
      controls.reset();
      invalidate();
    },
    project(point) {
      const p = point.clone().project(camera);
      return {
        x: ((p.x + 1) / 2) * container.clientWidth,
        y: ((1 - p.y) / 2) * container.clientHeight,
      };
    },
    dispose() {
      alive = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      document.removeEventListener("visibilitychange", onVisibility);
      const geometries = new Set(),
        materials = new Set();
      scene.traverse((o) => {
        if (o.isInstancedMesh) o.dispose();
        if (o.geometry) geometries.add(o.geometry);
        if (o.material)
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            materials.add(m);
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
