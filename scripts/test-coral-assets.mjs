import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CORAL_CATALOG } from '../src/reef/coral/CoralCatalog.js';

const root = path.resolve(import.meta.dirname, '..', 'public', 'assets', 'coral');
const diskCatalog = JSON.parse(await fs.readFile(path.join(root, 'catalog.json'), 'utf8'));
assert.equal(diskCatalog.assets.length, CORAL_CATALOG.length);

const loader = new GLTFLoader();
const reports = [];
for (const entry of CORAL_CATALOG) {
  const filePath = path.join(root, entry.file);
  const buffer = await fs.readFile(filePath);
  assert.equal(buffer.toString('ascii', 0, 4), 'glTF', `${entry.id} GLB header`);
  assert.equal(crypto.createHash('sha256').update(buffer).digest('hex'), entry.checksum, `${entry.id} checksum`);
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const gltf = await new Promise((resolve, reject) => loader.parse(arrayBuffer, '', resolve, reject));
  let meshCount = 0;
  let triangles = 0;
  let materials = 0;
  gltf.scene.traverse((object) => {
    if (!object.isMesh) return;
    meshCount += 1;
    const positions = object.geometry.getAttribute('position');
    assert.ok(positions?.count > 0, `${entry.id} positions`);
    for (let index = 0; index < positions.count; index += 1) {
      assert.ok(Number.isFinite(positions.getX(index)) && Number.isFinite(positions.getY(index)) && Number.isFinite(positions.getZ(index)), `${entry.id} finite positions`);
    }
    if (object.geometry.index) {
      const indices = object.geometry.index;
      for (let index = 0; index < indices.count; index += 1) assert.ok(indices.getX(index) < positions.count, `${entry.id} valid index`);
      triangles += indices.count / 3;
    } else {
      triangles += positions.count / 3;
    }
    materials += Array.isArray(object.material) ? object.material.length : 1;
  });
  assert.ok(meshCount > 0, `${entry.id} contains meshes`);
  assert.ok(materials > 0, `${entry.id} contains materials`);
  assert.equal(Math.round(triangles), entry.triangles, `${entry.id} triangle count`);
  const bounds = new THREE.Box3().setFromObject(gltf.scene);
  const size = bounds.getSize(new THREE.Vector3()).toArray();
  assert.ok(Math.abs(bounds.min.y) <= 0.001, `${entry.id} floor contact`);
  entry.bounds.forEach((expected, index) => assert.ok(Math.abs(size[index] - expected) <= 0.01, `${entry.id} bound ${index}`));
  reports.push({ id: entry.id, bytes: buffer.byteLength, meshCount, materials, triangles: Math.round(triangles), bounds: size.map((value) => Number(value.toFixed(4))) });
}

console.log(JSON.stringify({ status: 'pass', assets: reports }, null, 2));
