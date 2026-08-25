import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SwimVolume } from '../src/control/SwimVolume.js';
import { RoutePlanner3D } from '../src/control/RoutePlanner3D.js';
import { ObstacleAvoidanceSolver } from '../src/control/ObstacleAvoidanceSolver.js';
import { FishCameraRig } from '../src/control/FishCameraRig.js';

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

console.log(JSON.stringify({
  status: 'pass',
  detourWaypoints: detour.map((point) => point.toArray()),
  boundaryCorrection: correction.toArray(),
  avoidance: avoidance.toArray(),
  cameraPosition: camera.position.toArray()
}, null, 2));
