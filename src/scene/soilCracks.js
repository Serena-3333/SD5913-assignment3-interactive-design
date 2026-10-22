import * as THREE from "three";
import { SOIL_RADIUS, soilDryness } from "../simulation/environment.js";
import { moistureAt } from "../simulation/simulation.js";

// A small, deterministic Voronoi network, allocated once. Moisture changes only
// its ribbon widths and opacity; a wet garden adds no crack draw call.
export function createSoilCracks(parent, surface) {
  const seeds = Array.from({ length: 37 }, (_, i) => {
    const angle = i * 2.399963;
    const radius = Math.sqrt((i + 0.5) / 37) * SOIL_RADIUS * 1.08;
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius };
  });
  const segments = [], seen = new Set();
  for (const seed of seeds) {
    let cell = Array.from({ length: 40 }, (_, i) => ({
      x: Math.cos(i * Math.PI / 20) * (SOIL_RADIUS - 0.025),
      z: Math.sin(i * Math.PI / 20) * (SOIL_RADIUS - 0.025),
    }));
    for (const other of seeds) {
      if (other === seed) continue;
      const nx = other.x - seed.x, nz = other.z - seed.z;
      const limit = (other.x ** 2 + other.z ** 2 - seed.x ** 2 - seed.z ** 2) / 2;
      const clipped = [];
      for (let i = 0; i < cell.length; i++) {
        const a = cell[i], b = cell[(i + 1) % cell.length];
        const da = a.x * nx + a.z * nz - limit;
        const db = b.x * nx + b.z * nz - limit;
        if (da <= 0) clipped.push(a);
        if ((da <= 0) !== (db <= 0)) {
          const t = da / (da - db);
          clipped.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
        }
      }
      cell = clipped;
    }
    for (let i = 0; i < cell.length; i++) {
      const a = cell[i], b = cell[(i + 1) % cell.length];
      if (Math.hypot(a.x, a.z) > SOIL_RADIUS - 0.035 && Math.hypot(b.x, b.z) > SOIL_RADIUS - 0.035) continue;
      if (Math.hypot(b.x - a.x, b.z - a.z) < 0.025) continue;
      const key = [a, b].map(p => `${p.x.toFixed(4)},${p.z.toFixed(4)}`).sort().join("/");
      if (!seen.has(key)) { seen.add(key); segments.push({ a, b }); }
    }
  }
  const positions = new Float32Array(segments.length * 18);
  const opacity = new Float32Array(segments.length * 6);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("visibility", new THREE.BufferAttribute(opacity, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: { tint: { value: new THREE.Color(0x68422e) } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `attribute float visibility; varying float alpha;
      void main(){alpha=visibility;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform vec3 tint; varying float alpha;
      void main(){if(alpha<.01)discard;gl_FragColor=vec4(tint,alpha);
      #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.visible = false;
  mesh.raycast = () => {};
  mesh.renderOrder = 1;
  parent.add(mesh);
  const top = surface.geometry.attributes.position;
  // Match the faceted soil, rather than floating above its analytic hill.
  function height(x, z) {
    for (let i = 0; i < top.count; i += 3) {
      const ax = top.getX(i), az = top.getZ(i);
      const bx = top.getX(i + 1), bz = top.getZ(i + 1);
      const cx = top.getX(i + 2), cz = top.getZ(i + 2);
      const det = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
      const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / det;
      const v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / det;
      if (u >= -1e-5 && v >= -1e-5 && u + v <= 1.00001)
        return u * top.getY(i) + v * top.getY(i + 1) + (1 - u - v) * top.getY(i + 2) + 0.004;
    }
    return 0;
  }
  return {
    mesh,
    update(state) {
      let visible = false;
      segments.forEach(({ a, b }, index) => {
        const center = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
        const dry = soilDryness(moistureAt(state, center));
        visible ||= dry > 0;
        const length = Math.hypot(b.x - a.x, b.z - a.z);
        const width = 0.001 + dry * 0.008;
        const nx = -(b.z - a.z) / length * width;
        const nz = (b.x - a.x) / length * width;
        const corners = [[a.x + nx, a.z + nz], [a.x - nx, a.z - nz], [b.x + nx, b.z + nz], [b.x - nx, b.z - nz]];
        [0, 1, 2, 2, 1, 3].forEach((corner, j) => {
          const [x, z] = corners[corner], offset = index * 18 + j * 3;
          positions.set([x, height(x, z), z], offset);
          opacity[index * 6 + j] = dry * 0.88;
        });
      });
      mesh.visible = visible;
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.visibility.needsUpdate = true;
      geometry.computeBoundingSphere();
    },
  };
}
