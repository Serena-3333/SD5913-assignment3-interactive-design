import * as THREE from "three";

// Two thin, back-face shells give a warm rim without recoloring the object or
// rendering a full-screen postprocessing pass. Geometry is shared with each prop.
export function createHoverOutline(root, { tint = 0xffe9a0 } = {}) {
  const viewport = new THREE.Vector2(1, 1);
  const materials = [
    [4, 0.18],
    [1.6, 0.85],
  ].map(
    ([width, opacity]) =>
      new THREE.ShaderMaterial({
        uniforms: {
          viewport: { value: viewport },
          width: { value: width },
          tint: { value: new THREE.Color(tint) },
          opacity: { value: opacity },
        },
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        vertexShader: `uniform vec2 viewport; uniform float width;
        void main() {
          vec4 objectPosition = vec4(position, 1.);
          vec3 objectNormal = normal;
          #ifdef USE_INSTANCING
            mat3 im = mat3(instanceMatrix);
            objectNormal /= max(vec3(dot(im[0],im[0]), dot(im[1],im[1]), dot(im[2],im[2])), vec3(.00000001));
            objectNormal = im * objectNormal;
            objectPosition = instanceMatrix * objectPosition;
          #endif
          vec4 p = projectionMatrix * modelViewMatrix * objectPosition;
          vec3 n = normalize(normalMatrix * objectNormal);
          vec2 d = (projectionMatrix * vec4(n, 0.)).xy;
          d /= max(length(d), .0001);
          p.xy += d * width * 2. / viewport * p.w;
          gl_Position = p;
        }`,
        fragmentShader: `uniform vec3 tint; uniform float opacity;
        void main(){ gl_FragColor=vec4(tint,opacity);
        #include <colorspace_fragment>
        }`,
      }),
  );
  const sources = [],
    shells = [],
    instances = [];
  root.traverse((o) => {
    if (o.isMesh && o.visible && o !== root.userData.halo && !o.userData.hoverOutline)
      sources.push(o);
  });
  for (const source of sources)
    for (const material of materials) {
      const shell = source.isInstancedMesh
        ? new THREE.InstancedMesh(source.geometry, material, source.count)
        : new THREE.Mesh(source.geometry, material);
      if (source.isInstancedMesh)
        instances.push({ shell, source, version: -1 });
      shell.visible = false;
      shell.frustumCulled = false;
      shell.raycast = () => {};
      shell.userData.hoverOutline = true;
      source.add(shell);
      shells.push(shell);
    }
  return {
    setVisible(value) {
      if (value) this.sync();
      for (const shell of shells) shell.visible = value;
    },
    sync() {
      for (const item of instances) {
        if (item.version === item.source.instanceMatrix.version) continue;
        item.shell.instanceMatrix.array.set(item.source.instanceMatrix.array);
        item.shell.instanceMatrix.needsUpdate = true;
        item.version = item.source.instanceMatrix.version;
      }
    },
    resize(width, height) {
      viewport.set(width, height);
    },
    dispose() {
      for (const shell of shells) {
        shell.removeFromParent();
        if (shell.isInstancedMesh) shell.dispose();
      }
      materials.forEach((material) => material.dispose());
    },
  };
}
