import { sha256Hex, stableStringify } from '../../nexus/foundation/hash.js';
import { coralEntries } from './CoralCatalog.js';

const ANCHORS = Object.freeze([
  [-5.3, -0.7], [-4.0, -1.5], [-5.8, -2.7], [4.9, -0.8], [3.7, -1.8], [5.7, -2.9],
  [-5.7, -4.2], [-4.2, -5.2], [-6.0, -6.4], [5.6, -4.4], [4.1, -5.5], [6.0, -6.6],
  [-5.2, -7.6], [-3.5, -8.1], [-2.6, -6.9], [5.1, -7.8], [3.5, -8.3], [2.7, -7.0],
]);

function randomFor(text) {
  let state = Number.parseInt(sha256Hex(text).slice(0, 8), 16) >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createCoralPlacements({
  worldSeed,
  coralIds,
  coralCount = 18,
  coralScaleRange = [0.35, 0.52],
  floorY = -2.25,
}) {
  if (coralCount > ANCHORS.length) throw new RangeError(`Coral count cannot exceed ${ANCHORS.length}.`);
  const entries = coralEntries(coralIds);
  const placements = [];
  for (let index = 0; index < coralCount; index += 1) {
    const random = randomFor(`${worldSeed}:coral:${index}`);
    const entry = entries[Math.floor(random() * entries.length)];
    const [anchorX, anchorZ] = ANCHORS[index];
    const scale = coralScaleRange[0] + (coralScaleRange[1] - coralScaleRange[0]) * random();
    placements.push({
      id: `coral-${String(index + 1).padStart(2, '0')}`,
      assetId: entry.id,
      position: [anchorX + (random() - 0.5) * 0.34, floorY + entry.floorOffset * scale, anchorZ + (random() - 0.5) * 0.3],
      rotationY: random() * Math.PI * 2,
      tiltZ: 0,
      scale,
    });
  }
  return placements;
}

export function coralPlacementSignature(placements) {
  return sha256Hex(stableStringify(placements));
}

export function coralPlacementClearance(placements) {
  const failures = [];
  for (const placement of placements) {
    const [x, y, z] = placement.position;
    if (Math.abs(y + 2.25) > 0.0001) failures.push(`${placement.id}:floor`);
    if (Math.abs(x) > 7.2 || z > 0.2 || z < -9.1) failures.push(`${placement.id}:bounds`);
    if (Math.abs(x) < 2.35 && z < -1.0 && z > -6.2) failures.push(`${placement.id}:center-route`);
    if (Math.abs(x) < 2.6 && Math.abs(z + 3.8) < 1.55) failures.push(`${placement.id}:arch`);
  }
  return { valid: failures.length === 0, failures };
}
