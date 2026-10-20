import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SLOTS } from "../simulation/species.js";
import { createTerrarium, SOIL_Y } from "./terrarium.js";
import {
  createPlant,
  animatePlant,
  disposePlant,
  createThumbnails,
} from "./plantFactory.js";
import { createLamp } from "./lamp.js";
import { createWateringCan } from "./wateringCan.js";

export function createScene(container, getState) {
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0xf3f0e7, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  const thumbnails = createThumbnails(renderer);
  container.prepend(renderer.domElement);
  renderer.domElement.setAttribute(
    "aria-label",
    "Interactive 3D terrarium. Drag empty space to rotate; drag plants to move; drag the lamp head to adjust light.",
  );
  const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 80);
  camera.position.set(2.4, 4.4, 7.5);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0.15, 1.65, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.minDistance = 7;
  controls.maxDistance = 12;
  controls.minPolarAngle = 0.42;
  controls.maxPolarAngle = Math.PI / 2 - 0.1;
  controls.update();
  controls.saveState();
  scene.add(new THREE.HemisphereLight(0xfffbed, 0x839076, 1.9));
  const key = new THREE.DirectionalLight(0xfffaf0, 2.6);
  key.position.set(-3, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, {
    left: -5,
    right: 5,
    top: 5,
    bottom: -5,
    near: 0.1,
    far: 20,
  });
  key.shadow.normalBias = 0.035;
  key.shadow.bias = -0.0002;
  key.shadow.radius = 4;
  scene.add(key);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.ShadowMaterial({ opacity: 0.075 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const terrarium = createTerrarium(scene);
  const lamp = createLamp(scene);
  const wateringCan = createWateringCan(scene);
  const plants = new Map();
  let ghost = null;
  let hiddenSpecies = null;
  let frame;
  let last = performance.now();
  let elapsed = 0;
  let alive = true;
  const dry = new THREE.Color(0xbfa577),
    wet = new THREE.Color(0x70543a);
  let selectedSlot = -1;
  let choosing = false;

  function sync() {
    const state = getState();
    for (const [species, model] of plants) {
      if (!state.plants.some((p) => p.species === species)) {
        disposePlant(model);
        plants.delete(species);
      }
    }
    for (const plant of state.plants) {
      if (!plants.has(plant.species)) {
        const model = createPlant(plant.species);
        model.position.set(SLOTS[plant.slot].x, SOIL_Y, SLOTS[plant.slot].z);
        scene.add(model);
        plants.set(plant.species, model);
      }
    }
    lamp.update(state.lampPosition);
  }

  function resize() {
    const { width, height } = container.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Preserve horizontal breathing room for the lamp and can on narrow screens.
    camera.fov = THREE.MathUtils.radToDeg(
      2 *
        Math.atan(
          Math.tan(THREE.MathUtils.degToRad(33) / 2) *
            Math.max(1, 1.35 / camera.aspect),
        ),
    );
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  function tick(now) {
    if (!alive) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    elapsed += dt;
    last = now;
    const alpha = 1 - Math.exp(-dt * 9);
    const state = getState();
    const targetSoil = dry.clone().lerp(wet, state.soilMoisture / 100);
    terrarium.soilMaterial.color.lerp(targetSoil, alpha);
    for (const plant of state.plants) {
      const model = plants.get(plant.species);
      if (!model) continue;
      const slot = SLOTS[plant.slot];
      model.position.lerp(new THREE.Vector3(slot.x, SOIL_Y, slot.z), alpha);
      model.visible = plant.species !== hiddenSpecies;
      animatePlant(model, plant, alpha);
    }
    terrarium.markers.forEach((marker, i) => {
      const occupied = state.plants.some((p) => p.slot === i);
      marker.material.color.set(i === selectedSlot ? 0xb9dd86 : 0xf3ebcf);
      marker.material.opacity =
        i === selectedSlot ? 0.95 : occupied && !choosing ? 0.12 : 0.5;
    });
    wateringCan.animate(elapsed);
    controls.update();
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  }
  sync();
  frame = requestAnimationFrame(tick);

  return {
    renderer,
    scene,
    camera,
    controls,
    plants,
    lamp,
    wateringCan,
    thumbnails,
    sync,
    pour() {
      wateringCan.pour(elapsed);
    },
    highlight(slot, isChoosing = false) {
      selectedSlot = slot;
      choosing = isChoosing;
    },
    preview(species, slot, health = 70, growth = 20) {
      if (ghost?.userData.species !== species) {
        if (ghost) disposePlant(ghost);
        ghost = createPlant(species, { ghost: true });
        animatePlant(ghost, { health, growth }, 1);
        scene.add(ghost);
      }
      ghost.visible = slot >= 0;
      if (slot >= 0)
        ghost.position.set(SLOTS[slot].x, SOIL_Y + 0.02, SLOTS[slot].z);
    },
    hideSpecies(species) {
      hiddenSpecies = species;
    },
    clearPreview() {
      if (ghost) {
        disposePlant(ghost);
        ghost = null;
      }
      hiddenSpecies = null;
      selectedSlot = -1;
    },
    resetCamera() {
      controls.reset();
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
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material)
          for (const m of Array.isArray(object.material)
            ? object.material
            : [object.material])
            m.dispose();
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
