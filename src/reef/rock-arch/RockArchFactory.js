import * as THREE from 'three';
import { sha256, sha256Hex, stableStringify } from '../../nexus/foundation/hash.js';
import { createSymmetricArchPath } from './SymmetricArchPath.js';
import { createSymmetricDistortion } from './RockArchNoise.js';
import { getArchPreset } from './RockArchPresets.js';

const geometryCache = new Map();
const quantize = (value) => Math.round(value * 100000) / 100000;
const smoothstep = (value) => {
  const amount = THREE.MathUtils.clamp(value, 0, 1);
  return amount * amount * (3 - 2 * amount);
};

function radiusAt(halfCoordinate, parameters) {
  const shoulderStart = 0.58;
  if (halfCoordinate <= shoulderStart) {
    return THREE.MathUtils.lerp(
      parameters.baseRadius,
      parameters.shoulderRadius,
      smoothstep(halfCoordinate / shoulderStart),
    );
  }
  return THREE.MathUtils.lerp(
    parameters.shoulderRadius,
    parameters.apexRadius,
    smoothstep((halfCoordinate - shoulderStart) / (1 - shoulderStart)),
  );
}

function horizontalIntersections(points, y) {
  const intersections = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    if ((start.y <= y && end.y >= y) || (end.y <= y && start.y >= y)) {
      const span = end.y - start.y;
      if (Math.abs(span) > 1e-7) intersections.push(THREE.MathUtils.lerp(start.x, end.x, (y - start.y) / span));
    }
  }
  return intersections.sort((left, right) => left - right);
}

function verticalIntersections(points, x) {
  const intersections = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    if ((start.x <= x && end.x >= x) || (end.x <= x && start.x >= x)) {
      const span = end.x - start.x;
      if (Math.abs(span) > 1e-7) intersections.push(THREE.MathUtils.lerp(start.y, end.y, (x - start.x) / span));
    }
  }
  return intersections.sort((left, right) => left - right);
}

function closestSegmentDistance(point, centers, radii) {
  let minimum = Infinity;
  for (let index = 0; index < centers.length - 1; index += 1) {
    const start = centers[index];
    const end = centers[index + 1];
    const segment = end.clone().sub(start);
    const denominator = segment.lengthSq();
    const local = denominator === 0 ? 0 : THREE.MathUtils.clamp(point.clone().sub(start).dot(segment) / denominator, 0, 1);
    const closest = start.clone().addScaledVector(segment, local);
    const radius = THREE.MathUtils.lerp(radii[index], radii[index + 1], local);
    minimum = Math.min(minimum, point.distanceTo(closest) - radius);
  }
  return minimum;
}

function signatureForGeometry(geometry) {
  return sha256({
    positions: Array.from(geometry.attributes.position.array, quantize),
    indices: Array.from(geometry.index.array),
  });
}

export function deriveRockArchSeed(worldSeed, presetId) {
  return Number.parseInt(sha256Hex(`${worldSeed}:rock-arch:${presetId}`).slice(0, 8), 16) >>> 0;
}

function buildRockArch(parameters) {
  if (parameters.sectionCount % 2 !== 1) throw new Error('sectionCount must be odd');
  const path = createSymmetricArchPath(parameters);
  const distortion = createSymmetricDistortion(parameters.seed, parameters.noise);
  const centers = [];
  const normals = [];
  const radii = [];
  const depths = [];
  const bands = [];
  const halfIndex = (parameters.sectionCount - 1) / 2;

  for (let ring = 0; ring <= halfIndex; ring += 1) {
    const sample = path.sample(ring / (parameters.sectionCount - 1));
    const normal = new THREE.Vector2(-sample.tangent.y, sample.tangent.x).normalize();
    const coordinate = sample.halfCoordinate;
    const bandPhase = coordinate * parameters.strataCount;
    const nearestBoundary = Math.abs(bandPhase - Math.round(bandPhase));
    const groove = Math.exp(-Math.pow(nearestBoundary / Math.max(0.02, parameters.grooveWidth), 2));
    const apexProtection = smoothstep((1 - coordinate) / 0.09);
    const band = Math.min(parameters.strataCount - 1, Math.floor(Math.min(0.999999, coordinate) * parameters.strataCount));
    const alternating = band % 2 === 0 ? -1 : 1;
    const silhouetteOffset = distortion.silhouette(coordinate) * parameters.silhouetteAmplitude * apexProtection;
    const layerOffset = alternating * parameters.slabOffset * smoothstep(Math.min(coordinate, 1 - coordinate) / 0.12);
    const center = sample.point.clone().addScaledVector(normal, silhouetteOffset + layerOffset);
    const grooveScale = 1 - parameters.grooveDepth * groove * apexProtection;
    centers.push(center);
    normals.push(normal);
    radii.push(radiusAt(coordinate, parameters) * (1 + distortion.strata(coordinate) * parameters.strataAmplitude) * grooveScale);
    depths.push(parameters.depth * (1 + distortion.depth(coordinate, 0) * parameters.depthAmplitude) * grooveScale);
    bands.push(band);
  }

  for (let ring = halfIndex + 1; ring < parameters.sectionCount; ring += 1) {
    const mirror = parameters.sectionCount - 1 - ring;
    centers.push(new THREE.Vector2(-centers[mirror].x, centers[mirror].y));
    normals.push(new THREE.Vector2(-normals[mirror].x, normals[mirror].y));
    radii.push(radii[mirror]);
    depths.push(depths[mirror]);
    bands.push(bands[mirror]);
  }

  const positions = [];
  for (let ring = 0; ring < parameters.sectionCount; ring += 1) {
    const mirrorCoordinate = ring <= halfIndex ? ring / halfIndex : (parameters.sectionCount - 1 - ring) / halfIndex;
    for (let side = 0; side < parameters.sectionSides; side += 1) {
      const theta = (side / parameters.sectionSides) * Math.PI * 2;
      const radial = Math.cos(theta) * radii[ring] * (1 + distortion.facet(mirrorCoordinate, side) * parameters.facetAmplitude);
      const z = Math.sin(theta) * depths[ring] * (1 + distortion.depth(mirrorCoordinate, side) * parameters.depthAmplitude);
      positions.push(
        centers[ring].x + normals[ring].x * radial,
        centers[ring].y + normals[ring].y * radial,
        z,
      );
    }
  }

  let minimumY = Infinity;
  for (let index = 1; index < positions.length; index += 3) minimumY = Math.min(minimumY, positions[index]);
  for (let index = 1; index < positions.length; index += 3) {
    positions[index] -= minimumY;
    if (positions[index] < parameters.footFlatten) positions[index] = 0;
  }
  for (const center of centers) center.y -= minimumY;

  const indices = [];
  const groups = [];
  for (let ring = 0; ring < parameters.sectionCount - 1; ring += 1) {
    const start = indices.length;
    for (let side = 0; side < parameters.sectionSides; side += 1) {
      const next = (side + 1) % parameters.sectionSides;
      const a = ring * parameters.sectionSides + side;
      const b = ring * parameters.sectionSides + next;
      const c = (ring + 1) * parameters.sectionSides + next;
      const d = (ring + 1) * parameters.sectionSides + side;
      indices.push(a, b, c, a, c, d);
    }
    const materialIndex = bands[ring] % 4;
    const previous = groups.at(-1);
    if (previous?.materialIndex === materialIndex) previous.count += indices.length - start;
    else groups.push({ start, count: indices.length - start, materialIndex });
  }

  const firstCenter = positions.length / 3;
  positions.push(centers[0].x, centers[0].y, 0);
  const lastCenter = positions.length / 3;
  positions.push(centers.at(-1).x, centers.at(-1).y, 0);
  const capStart = indices.length;
  const lastRing = (parameters.sectionCount - 1) * parameters.sectionSides;
  for (let side = 0; side < parameters.sectionSides; side += 1) {
    const next = (side + 1) % parameters.sectionSides;
    indices.push(firstCenter, next, side);
    indices.push(lastCenter, lastRing + side, lastRing + next);
  }
  groups.push({ start: capStart, count: indices.length - capStart, materialIndex: 0 });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  for (const group of groups) geometry.addGroup(group.start, group.count, group.materialIndex);

  const materials = [0, 1, 2, 3].map((index) => {
    const lightness = THREE.MathUtils.clamp(parameters.charcoal + (index - 1.5) * parameters.materialVariation, 0.055, 0.35);
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.56, 0.08, lightness),
      roughness: 0.96,
      metalness: 0,
      flatShading: true,
    });
  });

  const innerPoints = centers.map((center, index) => center.clone().addScaledVector(normals[index], -radii[index]));
  const routeY = 1.15;
  const horizontal = horizontalIntersections(innerPoints, routeY);
  const vertical = verticalIntersections(innerPoints, 0);
  const bounds = geometry.boundingBox;
  const startTangent = path.sample(0).tangent;
  const endTangent = path.sample(1).tangent;
  const metrics = {
    vertices: geometry.attributes.position.count,
    triangles: geometry.index.count / 3,
    objectCount: 1,
    materialCount: materials.length,
    drawGroups: groups.length,
    bounds: { min: bounds.min.toArray().map(quantize), max: bounds.max.toArray().map(quantize) },
    floorContact: quantize(bounds.min.y),
    opening: {
      widthAtRouteY: quantize(horizontal.length >= 2 ? horizontal.at(-1) - horizontal[0] : 0),
      heightAtCenter: quantize(vertical.length ? Math.max(...vertical) : 0),
      routeY,
    },
    routeClearance: quantize(closestSegmentDistance(new THREE.Vector2(0, routeY), centers, radii)),
    baseTermination: {
      startTangent: startTangent.toArray().map(quantize),
      endTangent: endTangent.toArray().map(quantize),
    },
    controlPoints: path.controlPoints.map((point) => point.map(quantize)),
    geometrySignature: signatureForGeometry(geometry),
    encodingSignature: sha256(stableStringify(parameters)),
  };
  return { geometry, materials, centers, radii, depths, parameters, metrics };
}

function collisionIndices(sectionCount) {
  const last = sectionCount - 1;
  return [0, 3, 7, 11, 15, 18, 20, 22, 25, 29, 33, 37, last]
    .map((index) => Math.min(last, Math.round(index * last / 40)))
    .filter((index, position, values) => values.indexOf(index) === position);
}

function createObstacles(entry, position, scale, archId) {
  return collisionIndices(entry.parameters.sectionCount).map((pathIndex) => {
    const center = entry.centers[pathIndex];
    const obstacle = new THREE.Object3D();
    obstacle.name = `${archId}-collision-${String(pathIndex).padStart(2, '0')}`;
    obstacle.position.set(
      position.x + center.x * scale,
      position.y + center.y * scale,
      position.z,
    );
    obstacle.userData.obstacleRadius = Math.max(
      0.24,
      Math.min(entry.radii[pathIndex], entry.depths[pathIndex]) * scale * 0.72,
    );
    obstacle.userData.rockArchId = archId;
    obstacle.userData.pathIndex = pathIndex;
    return obstacle;
  });
}

export function validateRockArchGeometry(geometry) {
  const positions = geometry.attributes.position;
  const index = geometry.index;
  const edgeUses = new Map();
  const directedEdges = new Map();
  const faces = new Set();
  let invalidValues = 0;
  let degenerateTriangles = 0;
  let duplicateFaces = 0;
  for (const value of positions.array) if (!Number.isFinite(value)) invalidValues += 1;
  const addEdge = (start, end) => {
    const key = start < end ? `${start}:${end}` : `${end}:${start}`;
    edgeUses.set(key, (edgeUses.get(key) ?? 0) + 1);
    directedEdges.set(`${start}:${end}`, (directedEdges.get(`${start}:${end}`) ?? 0) + 1);
  };
  const adjacency = Array.from({ length: positions.count }, () => []);
  for (let offset = 0; offset < index.count; offset += 3) {
    const triangle = [index.getX(offset), index.getX(offset + 1), index.getX(offset + 2)];
    const faceKey = [...triangle].sort((left, right) => left - right).join(':');
    if (faces.has(faceKey)) duplicateFaces += 1;
    faces.add(faceKey);
    const a = new THREE.Vector3().fromBufferAttribute(positions, triangle[0]);
    const b = new THREE.Vector3().fromBufferAttribute(positions, triangle[1]);
    const c = new THREE.Vector3().fromBufferAttribute(positions, triangle[2]);
    if (b.clone().sub(a).cross(c.clone().sub(a)).lengthSq() < 1e-12) degenerateTriangles += 1;
    addEdge(triangle[0], triangle[1]);
    addEdge(triangle[1], triangle[2]);
    addEdge(triangle[2], triangle[0]);
    for (let corner = 0; corner < 3; corner += 1) {
      adjacency[triangle[corner]].push(triangle[(corner + 1) % 3], triangle[(corner + 2) % 3]);
    }
  }
  let boundaryEdges = 0;
  let nonManifoldEdges = 0;
  let orientationMismatches = 0;
  for (const [key, uses] of edgeUses) {
    if (uses === 1) boundaryEdges += 1;
    if (uses > 2) nonManifoldEdges += 1;
    const [start, end] = key.split(':');
    if (uses === 2 && (directedEdges.get(`${start}:${end}`) ?? 0) !== 1) orientationMismatches += 1;
  }
  const visited = new Set();
  let connectedComponents = 0;
  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    if (visited.has(vertex)) continue;
    connectedComponents += 1;
    const stack = [vertex];
    visited.add(vertex);
    while (stack.length) {
      for (const next of adjacency[stack.pop()]) {
        if (!visited.has(next)) {
          visited.add(next);
          stack.push(next);
        }
      }
    }
  }
  const pass = invalidValues === 0 && degenerateTriangles === 0 && duplicateFaces === 0
    && boundaryEdges === 0 && nonManifoldEdges === 0 && orientationMismatches === 0
    && connectedComponents === 1 && Boolean(geometry.attributes.normal);
  return {
    verdict: pass ? 'pass' : 'fail',
    invalidValues,
    degenerateTriangles,
    duplicateFaces,
    boundaryEdges,
    nonManifoldEdges,
    orientationMismatches,
    connectedComponents,
  };
}

export class RockArchFactory {
  create({
    preset = '01-balanced-stack',
    seed = 'little-reef-main-v1',
    position = [0, -2.25, -3.8],
    scale = 1,
    quality = 'preview',
  } = {}) {
    if (!(scale > 0)) throw new Error('Rock arch scale must be positive');
    const selected = getArchPreset(preset);
    const derivedSeed = deriveRockArchSeed(seed, preset);
    const parameters = { ...selected.parameters, seed: derivedSeed };
    const cacheKey = sha256({ preset, derivedSeed, quality });
    let entry = geometryCache.get(cacheKey);
    if (!entry) {
      entry = { ...buildRockArch(parameters), references: 0 };
      geometryCache.set(cacheKey, entry);
    }
    entry.references += 1;

    const worldPosition = new THREE.Vector3(...position);
    const mesh = new THREE.Mesh(entry.geometry, entry.materials);
    mesh.name = 'procedural-rock-arch';
    mesh.position.copy(worldPosition);
    mesh.scale.setScalar(scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const archId = `rock-arch-${preset}`;
    const obstacles = createObstacles(entry, worldPosition, scale, archId);
    const encoding = {
      schema: 'little-reef/rock-arch-v1',
      preset,
      worldSeed: String(seed),
      derivedSeed,
      quality,
      position: [...position],
      scale,
      parametersHash: entry.metrics.encodingSignature,
    };
    mesh.userData.rockArchEncoding = encoding;
    const passage = {
      center: [worldPosition.x, worldPosition.y + entry.metrics.opening.routeY * scale, worldPosition.z],
      width: entry.metrics.opening.widthAtRouteY * scale,
      height: entry.metrics.opening.heightAtCenter * scale,
      routeClearance: entry.metrics.routeClearance * scale,
    };
    const localBounds = entry.geometry.boundingBox;
    const metrics = {
      ...structuredClone(entry.metrics),
      collisionProxyCount: obstacles.length,
      worldBounds: {
        min: localBounds.min.clone().multiplyScalar(scale).add(worldPosition).toArray().map(quantize),
        max: localBounds.max.clone().multiplyScalar(scale).add(worldPosition).toArray().map(quantize),
      },
    };
    let disposed = false;
    return {
      mesh,
      obstacles,
      passage,
      metrics,
      encoding,
      dispose() {
        if (disposed) return;
        disposed = true;
        mesh.parent?.remove(mesh);
        obstacles.splice(0);
        entry.references -= 1;
        if (entry.references === 0) {
          entry.geometry.dispose();
          for (const material of entry.materials) material.dispose();
          geometryCache.delete(cacheKey);
        }
      },
    };
  }
}
