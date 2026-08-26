import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SwimVolume } from '../src/control/SwimVolume.js';
import { RoutePlanner3D } from '../src/control/RoutePlanner3D.js';
import { ObstacleAvoidanceSolver } from '../src/control/ObstacleAvoidanceSolver.js';
import { FishCameraRig } from '../src/control/FishCameraRig.js';
import { RockArchFactory } from '../src/reef/rock-arch/RockArchFactory.js';

const bounds = new THREE.Vector3(16, 7, 14);
const volume = new SwimVolume(bounds);
const planner = new RoutePlanner3D(volume);
const obstacle = new THREE.Object3D();
obstacle.position.set(0, 0, -2.5);
obstacle.userData.obstacleRadius = 1;

assert.deepEqual(volume.clamp(new THREE.Vector3(20, -20, 20)).toArray(), [7.25, -2.75, 6.25]);
assert.equal(planner.plan(new THREE.Vector3(0, 0, 1), new THREE.Vector3(5, 0, 1), [obstacle]).length, 1);

const detour = planner.plan(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -6), [obstacle]);
assert.equal(detour.length, 2);
assert.ok(detour[0].distanceTo(obstacle.position) >= 1.79, 'detour preserves route clearance');

const correction = volume.correction(new THREE.Vector3(7.2, 0, 0));
assert.ok(correction.x < 0, 'soft boundary pushes inward');

const avoidanceObstacle = obstacle.clone();
avoidanceObstacle.position.set(0, 0, -2);
avoidanceObstacle.userData.obstacleRadius = 1;
const avoidance = new ObstacleAvoidanceSolver().solve(
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(0, 0, -1),
  [avoidanceObstacle]
);
assert.ok(avoidance.lengthSq() > 0, 'predictive avoidance reacts before contact');

const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 100);
camera.position.set(0, 1.25, 6.5);
const fish = new THREE.Object3D();
fish.position.set(0, -1.2, 1.5);
const rig = new FishCameraRig(camera, fish);
for (let index = 0; index < 240; index += 1) rig.update(1 / 60, new THREE.Vector3(0.15, 1.2, -1));
assert.ok(Math.abs(camera.position.y - (fish.position.y + 1.15)) < 0.01, 'vertical steering cannot drag the camera below its follow height');
assert.ok(camera.position.distanceTo(fish.position) < 3.7, 'controlled fish remains readable');

const rockArch = new RockArchFactory().create({
  preset: '01-balanced-stack',
  seed: 'little-reef-main-v1',
  position: [0, -2.25, -3.8],
});
const passageY = rockArch.passage.center[1];
const passageRoute = planner.plan(
  new THREE.Vector3(0, passageY, 0.5),
  new THREE.Vector3(0, passageY, -6.5),
  rockArch.obstacles,
);
assert.equal(passageRoute.length, 1, 'route through the visible opening remains direct');

const pillar = rockArch.obstacles[2];
const pillarRoute = planner.plan(
  new THREE.Vector3(pillar.position.x, pillar.position.y, 0.5),
  new THREE.Vector3(pillar.position.x, pillar.position.y, -6.5),
  rockArch.obstacles,
);
assert.equal(pillarRoute.length, 2, 'route into a visible pillar detours');
const pillarAvoidance = new ObstacleAvoidanceSolver().solve(
  new THREE.Vector3(pillar.position.x, pillar.position.y, pillar.position.z + 2),
  new THREE.Vector3(0, 0, -1),
  rockArch.obstacles,
);
assert.ok(pillarAvoidance.lengthSq() > 0, 'arch avoidance activates before pillar contact');
rockArch.dispose();

console.log(JSON.stringify({
  status: 'pass',
  detourWaypoints: detour.map((point) => point.toArray()),
  boundaryCorrection: correction.toArray(),
  avoidance: avoidance.toArray(),
  archPassageWaypoints: passageRoute.map((point) => point.toArray()),
  archPillarWaypoints: pillarRoute.map((point) => point.toArray()),
  archPillarAvoidance: pillarAvoidance.toArray(),
  cameraPosition: camera.position.toArray()
}, null, 2));
