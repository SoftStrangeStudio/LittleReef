import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import { RoutePlanner3D } from '../src/control/RoutePlanner3D.js';
import { SwimVolume } from '../src/control/SwimVolume.js';
import { DEFAULT_REEF_CONFIG } from '../src/reef/ReefService.js';
import { CoralAssetLoader } from '../src/reef/coral/CoralAssetLoader.js';
import { CORAL_BY_ID } from '../src/reef/coral/CoralCatalog.js';
import { CoralField } from '../src/reef/coral/CoralField.js';
import { coralPlacementClearance, coralPlacementSignature, createCoralPlacements } from '../src/reef/coral/CoralPlacement.js';

const input = { ...DEFAULT_REEF_CONFIG };
const first = createCoralPlacements(input);
const repeated = createCoralPlacements(input);
const changed = createCoralPlacements({ ...input, worldSeed: `${input.worldSeed}-changed` });
assert.equal(coralPlacementSignature(first), coralPlacementSignature(repeated));
assert.notEqual(coralPlacementSignature(first), coralPlacementSignature(changed));
assert.equal(first.length, DEFAULT_REEF_CONFIG.coralCount);
assert.deepEqual(coralPlacementClearance(first), { valid: true, failures: [] });
for (let left = 0; left < first.length; left += 1) {
  const entry = CORAL_BY_ID.get(first[left].assetId);
  assert.ok(entry);
  for (let right = left + 1; right < first.length; right += 1) {
    const distance = Math.hypot(first[left].position[0] - first[right].position[0], first[left].position[2] - first[right].position[2]);
    assert.ok(distance >= 0.7, `${first[left].id} overlaps ${first[right].id}`);
  }
}

const assetRoot = path.resolve(import.meta.dirname, '..', 'public', 'assets', 'coral');
const buffers = await Promise.all(DEFAULT_REEF_CONFIG.coralIds.map(async (id) => {
  const entry = CORAL_BY_ID.get(id);
  return [id, await fs.readFile(path.join(assetRoot, entry.file))];
}));
const library = await CoralAssetLoader.parseBuffers(buffers);
const field = CoralField.create({ library, config: DEFAULT_REEF_CONFIG, floorY: -2.25 });
assert.equal(field.placements.length, DEFAULT_REEF_CONFIG.coralCount);
assert.equal(field.group.children.length, DEFAULT_REEF_CONFIG.coralCount);
assert.equal(field.obstacles.length, DEFAULT_REEF_CONFIG.coralCount);
field.group.updateMatrixWorld(true);
for (const instance of field.group.children) {
  const bounds = new THREE.Box3().setFromObject(instance);
  assert.ok(Math.abs(bounds.min.y + 2.25) <= 0.001, `${instance.name} floor contact`);
}
for (const obstacle of field.obstacles) {
  assert.ok(obstacle.userData.obstacleRadius >= 0.16 && obstacle.userData.obstacleRadius <= 0.5, `${obstacle.name} bounded collider`);
  assert.ok(!(Math.abs(obstacle.position.x) < 2.6 && Math.abs(obstacle.position.z + 3.8) < 1.55), `${obstacle.name} outside arch`);
}

const planner = new RoutePlanner3D(new SwimVolume(new THREE.Vector3(16, 7, 14)));
const centralRoute = planner.plan(
  new THREE.Vector3(0, -1.1, 0.5),
  new THREE.Vector3(0, -1.1, -8.5),
  field.obstacles,
);
assert.equal(centralRoute.length, 1, 'loaded coral keeps the central swimming route direct');

const targetCoral = field.obstacles[0];
const coralRoute = planner.plan(
  new THREE.Vector3(targetCoral.position.x, targetCoral.position.y, 0.5),
  new THREE.Vector3(targetCoral.position.x, targetCoral.position.y, targetCoral.position.z - 1),
  field.obstacles,
);
assert.equal(coralRoute.length, 2, 'route into loaded coral detours around its measured proxy');
field.dispose();
assert.equal(library.disposed, true);

console.log(JSON.stringify({
  status: 'pass',
  signature: coralPlacementSignature(first),
  placements: first.length,
  obstacles: DEFAULT_REEF_CONFIG.coralCount,
  centralRouteWaypoints: centralRoute.length,
  coralDetourWaypoints: coralRoute.length,
}, null, 2));
