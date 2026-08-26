import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import {
  RockArchFactory,
  deriveRockArchSeed,
  validateRockArchGeometry,
} from '../src/reef/rock-arch/RockArchFactory.js';
import { ARCH_PRESETS } from '../src/reef/rock-arch/RockArchPresets.js';
import { ReefRenderer } from '../src/reef/ReefRenderer.js';
import { ReefService } from '../src/reef/ReefService.js';

const factory = new RockArchFactory();
const options = {
  preset: '01-balanced-stack',
  seed: 'little-reef-main-v1',
  position: [0, -2.25, -3.8],
  scale: 1,
};
const first = factory.create(options);
const second = factory.create(options);
const variation = factory.create({ ...options, seed: 'little-reef-variation-v1' });
const presetReports = [];

for (const preset of ARCH_PRESETS) {
  const candidate = factory.create({ ...options, preset: preset.id });
  const candidateIntegrity = validateRockArchGeometry(candidate.mesh.geometry);
  assert.equal(candidateIntegrity.verdict, 'pass', `${preset.id} must remain watertight`);
  assert.ok(candidate.metrics.triangles <= 2000, `${preset.id} exceeds the triangle ceiling`);
  assert.ok(candidate.passage.width > 2, `${preset.id} closes the fish passage`);
  presetReports.push({
    preset: preset.id,
    triangles: candidate.metrics.triangles,
    signature: candidate.metrics.geometrySignature,
    passage: candidate.passage,
  });
  candidate.dispose();
}

assert.equal(ARCH_PRESETS.length, 10, 'all ten reviewed presets remain selectable');
assert.equal(first.metrics.geometrySignature, second.metrics.geometrySignature, 'same encoding reproduces identical geometry');
assert.equal(first.encoding.derivedSeed, deriveRockArchSeed(options.seed, options.preset));
assert.notEqual(first.metrics.geometrySignature, variation.metrics.geometrySignature, 'different world seeds create controlled variation');
assert.equal(first.metrics.triangles, variation.metrics.triangles, 'seed variation keeps topology stable');

const integrity = validateRockArchGeometry(first.mesh.geometry);
assert.equal(integrity.verdict, 'pass', `mesh integrity failed: ${JSON.stringify(integrity)}`);
assert.equal(integrity.connectedComponents, 1, 'arch is one connected shell');
assert.equal(integrity.boundaryEdges, 0, 'arch is watertight');
assert.ok(first.metrics.triangles <= 2000, 'arch stays below the 2,000 triangle ceiling');
assert.equal(first.metrics.floorContact, 0, 'generated base lies on its local floor');
assert.deepEqual(first.metrics.baseTermination.startTangent, [0, 1], 'left base terminates vertically');
assert.deepEqual(first.metrics.baseTermination.endTangent, [0, -1], 'right base terminates vertically');
assert.ok(first.passage.width > 2.4, 'opening is wide enough for fish');
assert.ok(first.passage.height > 2.2, 'opening is tall enough for fish');
assert.ok(first.obstacles.length >= 10 && first.obstacles.length <= 14, 'collision proxy count remains bounded');

const fishRadius = 0.45;
const passageCenter = new THREE.Vector3(...first.passage.center);
const passageMargins = first.obstacles.map((obstacle) => Math.hypot(
  obstacle.position.x - passageCenter.x,
  obstacle.position.y - passageCenter.y,
) - obstacle.userData.obstacleRadius - fishRadius);
assert.ok(Math.min(...passageMargins) > 0, 'collision proxies leave the center passage open');

for (const path of [
  'src/reef/rock-arch/RockArchFactory.js',
  'src/reef/rock-arch/RockArchNoise.js',
  'src/reef/rock-arch/RockArchPresets.js',
  'src/reef/rock-arch/SymmetricArchPath.js',
]) {
  const source = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');
  assert.ok(!source.includes("from 'node:"), `${path} must remain browser-safe`);
}

const report = {
  status: 'pass',
  encoding: first.encoding,
  integrity,
  metrics: first.metrics,
  passage: first.passage,
  minimumPassageMargin: Math.min(...passageMargins),
  variationSignature: variation.metrics.geometrySignature,
  presets: presetReports,
};

first.dispose();
second.dispose();
variation.dispose();
const reproduced = factory.create(options);
assert.equal(reproduced.metrics.geometrySignature, report.metrics.geometrySignature, 'rebuild after disposal remains deterministic');
reproduced.dispose();

const scene = new THREE.Scene();
const reef = new ReefService(scene, new ReefRenderer());
assert.equal(reef.visuals.obstacles.length, 20, 'reef exposes seven rocks and thirteen arch proxies');
assert.ok(scene.getObjectByName('procedural-rock-arch'), 'reef setup adds the generated mesh once');
reef.dispose();
assert.equal(reef.visuals.obstacles.length, 7, 'reef disposal releases arch collision references');
assert.equal(scene.getObjectByName('procedural-rock-arch'), undefined, 'reef disposal removes the generated mesh');

console.log(JSON.stringify(report, null, 2));
