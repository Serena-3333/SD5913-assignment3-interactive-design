import * as THREE from "three";

// Two thin, back-face shells give a warm rim without recoloring the object or
// rendering a full-screen postprocessing pass. Geometry is shared with each prop.
export function createHoverOutline(root) {
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
          tint: { value: new THREE.Color(0xffe9a0) },
          opacity: { value: opacity },
        },
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        vertexShader: `uniform vec2 viewport; uniform float width;
        void main() {
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.);
          vec3 n = normalize(normalMatrix * normal);
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
    shells = [];
  root.traverse((o) => {
    if (o.isMesh) sources.push(o);
  });
  for (const source of sources)
    for (const material of materials) {
      const shell = new THREE.Mesh(source.geometry, material);
      shell.visible = false;
      shell.raycast = () => {};
      shell.userData.hoverOutline = true;
      source.add(shell);
      shells.push(shell);
    }
  return {
    setVisible(value) {
      for (const shell of shells) shell.visible = value;
    },
    resize(width, height) {
      viewport.set(width, height);
    },
  };
}
