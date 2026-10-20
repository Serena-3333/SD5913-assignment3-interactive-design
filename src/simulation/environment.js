// Shared world geometry. Model units are illustrative, not physical metres.
export const SOIL_RADIUS = 1.26;
export const SOIL_Y = 0.64;
export const WATER_RADIUS = 0.55;
export const WATER_AMOUNT = 24;
export const AMBIENT_LIGHT = 20;
export const CAMERA = {
  position: [2.2, 3.5, 6.1],
  target: [0, 1.2, 0],
  fov: 32,
};
export function surfaceHeight(x, z) {
  const hill = Math.exp(-((x + 0.52) ** 2 + (z + 0.58) ** 2) / 0.38);
  return SOIL_Y + 0.19 * hill + 0.025 * Math.sin(x * 3 + z * 2);
}
export const SOIL_POINTS = Object.freeze(
  Array.from({ length: 17 }, (_, row) =>
    Array.from({ length: 17 }, (_, col) => ({
      x: (col - 8 + (row % 2) * 0.5) * 0.165,
      z: (row - 8) * 0.143,
    })),
  )
    .flat()
    .filter((p) => Math.hypot(p.x, p.z) <= SOIL_RADIUS),
);
export function clampToSoil(point, inset = 0.02) {
  const radius = SOIL_RADIUS - inset;
  const distance = Math.hypot(point.x, point.z);
  const scale = distance > radius ? radius / distance : 1;
  return { x: point.x * scale, z: point.z * scale };
}
export const INITIAL_LAMP = Object.freeze({
  azimuth: 138,
  reach: 0.95,
  radius: 0.72,
  power: 85,
  target: Object.freeze({ x: -0.1, z: -0.1 }),
});
export function lampFrame(lamp) {
  const angle = (lamp.azimuth * Math.PI) / 180;
  const base = {
    x: Math.sin(angle) * 2.02,
    y: 0.08,
    z: Math.cos(angle) * 2.02,
  };
  const head = {
    x: Math.sin(angle) * (2.02 - lamp.reach),
    y: 2.95,
    z: Math.cos(angle) * (2.02 - lamp.reach),
  };
  const aim = {
    ...lamp.target,
    y: surfaceHeight(lamp.target.x, lamp.target.z),
  };
  const delta = { x: aim.x - head.x, y: aim.y - head.y, z: aim.z - head.z };
  const distance = Math.hypot(delta.x, delta.y, delta.z);
  const direction = {
    x: delta.x / distance,
    y: delta.y / distance,
    z: delta.z / distance,
  };
  const emitter = {
    x: head.x + direction.x * 0.34,
    y: head.y + direction.y * 0.34,
    z: head.z + direction.z * 0.34,
  };
  const halfAngle = Math.atan(lamp.radius / (emitter.y - aim.y));
  return { base, head, aim, emitter, direction, halfAngle };
}
