import * as THREE from "three";
import { SOIL_RADIUS, surfaceHeight } from "../simulation/environment.js";
export function createFootprint(scene, color) {
  const count = 64,
    positions = new Float32Array((count + 2) * 3),
    uvs = new Float32Array((count + 2) * 2),
    indices = [];
  for (let i = 0; i <= count; i++) {
    const a = (i / count) * Math.PI * 2;
    uvs[(i + 1) * 2] = Math.cos(a);
    uvs[(i + 1) * 2 + 1] = Math.sin(a);
    if (i < count) indices.push(0, i + 2, i + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      tint: { value: new THREE.Color(color) },
      opacity: { value: 0.8 },
      soilRadius: { value: SOIL_RADIUS },
    },
    vertexShader:
      "varying vec2 p; varying vec2 world; void main(){p=uv;world=position.xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
    fragmentShader:
      "uniform vec3 tint;uniform float opacity;uniform float soilRadius;varying vec2 p;varying vec2 world;void main(){if(length(world)>soilRadius)discard;float r=length(p);float edge=smoothstep(.91,.945,r)*(1.-smoothstep(.985,1.,r));gl_FragColor=vec4(tint,(.12+edge*.68)*opacity);\n#include <colorspace_fragment>\n}",
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.visible = false;
  scene.add(mesh);
  function update(center, points) {
    positions[0] = center.x;
    positions[1] = surfaceHeight(center.x, center.z) + 0.027;
    positions[2] = center.z;
    for (let i = 0; i <= count; i++) {
      const p = points((i / count) * Math.PI * 2);
      positions[(i + 1) * 3] = p.x;
      positions[(i + 1) * 3 + 1] = surfaceHeight(p.x, p.z) + 0.03;
      positions[(i + 1) * 3 + 2] = p.z;
    }
    geometry.attributes.position.needsUpdate = true;
    mesh.visible = true;
  }
  return {
    mesh,
    material,
    update,
    circle(center, radius) {
      update(center, (a) => ({
        x: center.x + Math.cos(a) * radius,
        z: center.z + Math.sin(a) * radius,
      }));
    },
  };
}
