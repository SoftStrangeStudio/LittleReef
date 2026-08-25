import { V3, clamp } from './math.js';

export function createMesh({
  name,
  material,
  positions = [],
  normals = [],
  uvs = [],
  tangents = [],
  colors = [],
  indices = [],
  transparent = false,
  doubleSided = false,
  extras = {},
}) {
  return {
    name,
    material,
    positions,
    normals,
    uvs,
    tangents,
    colors,
    indices,
    transparent,
    doubleSided,
    extras,
  };
}

export function cloneMesh(mesh) {
  return createMesh({
    ...mesh,
    positions: [...mesh.positions],
    normals: [...mesh.normals],
    uvs: [...mesh.uvs],
    tangents: [...mesh.tangents],
    colors: [...mesh.colors],
    indices: [...mesh.indices],
    extras: { ...mesh.extras },
  });
}

export function computeVertexNormals(mesh, options = {}) {
  const positions = mesh.positions;
  const indices = mesh.indices;
  const normals = new Float64Array(positions.length);
  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i] * 3;
    const ib = indices[i + 1] * 3;
    const ic = indices[i + 2] * 3;
    const a = [positions[ia], positions[ia + 1], positions[ia + 2]];
    const b = [positions[ib], positions[ib + 1], positions[ib + 2]];
    const c = [positions[ic], positions[ic + 1], positions[ic + 2]];
    const face = V3.cross(V3.sub(b, a), V3.sub(c, a));
    const lengthSq = V3.lenSq(face);
    if (lengthSq < 1e-24) continue;
    for (const index of [ia, ib, ic]) {
      normals[index] += face[0];
      normals[index + 1] += face[1];
      normals[index + 2] += face[2];
    }
  }
  mesh.normals = new Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    const normal = V3.norm([normals[i], normals[i + 1], normals[i + 2]]);
    mesh.normals[i] = normal[0];
    mesh.normals[i + 1] = normal[1];
    mesh.normals[i + 2] = normal[2];
  }
  if (Array.isArray(options.seamPairs)) {
    for (const [a, b] of options.seamPairs) {
      const ia = a * 3;
      const ib = b * 3;
      const average = V3.norm([
        mesh.normals[ia] + mesh.normals[ib],
        mesh.normals[ia + 1] + mesh.normals[ib + 1],
        mesh.normals[ia + 2] + mesh.normals[ib + 2],
      ]);
      mesh.normals[ia] = average[0];
      mesh.normals[ia + 1] = average[1];
      mesh.normals[ia + 2] = average[2];
      mesh.normals[ib] = average[0];
      mesh.normals[ib + 1] = average[1];
      mesh.normals[ib + 2] = average[2];
    }
  }
  return mesh;
}

export function computeTangents(mesh) {
  const vertexCount = mesh.positions.length / 3;
  if (mesh.uvs.length !== vertexCount * 2 || mesh.normals.length !== vertexCount * 3) {
    mesh.tangents = [];
    return mesh;
  }
  const tan1 = Array.from({ length: vertexCount }, () => [0, 0, 0]);
  const tan2 = Array.from({ length: vertexCount }, () => [0, 0, 0]);
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const i1 = mesh.indices[i];
    const i2 = mesh.indices[i + 1];
    const i3 = mesh.indices[i + 2];
    const p1 = mesh.positions.slice(i1 * 3, i1 * 3 + 3);
    const p2 = mesh.positions.slice(i2 * 3, i2 * 3 + 3);
    const p3 = mesh.positions.slice(i3 * 3, i3 * 3 + 3);
    const w1 = mesh.uvs.slice(i1 * 2, i1 * 2 + 2);
    const w2 = mesh.uvs.slice(i2 * 2, i2 * 2 + 2);
    const w3 = mesh.uvs.slice(i3 * 2, i3 * 2 + 2);
    const x1 = p2[0] - p1[0];
    const x2 = p3[0] - p1[0];
    const y1 = p2[1] - p1[1];
    const y2 = p3[1] - p1[1];
    const z1 = p2[2] - p1[2];
    const z2 = p3[2] - p1[2];
    const s1 = w2[0] - w1[0];
    const s2 = w3[0] - w1[0];
    const t1 = w2[1] - w1[1];
    const t2 = w3[1] - w1[1];
    const determinant = s1 * t2 - s2 * t1;
    if (Math.abs(determinant) < 1e-12) continue;
    const r = 1 / determinant;
    const sdir = [(t2 * x1 - t1 * x2) * r, (t2 * y1 - t1 * y2) * r, (t2 * z1 - t1 * z2) * r];
    const tdir = [(s1 * x2 - s2 * x1) * r, (s1 * y2 - s2 * y1) * r, (s1 * z2 - s2 * z1) * r];
    for (const index of [i1, i2, i3]) {
      tan1[index] = V3.add(tan1[index], sdir);
      tan2[index] = V3.add(tan2[index], tdir);
    }
  }
  mesh.tangents = [];
  for (let i = 0; i < vertexCount; i += 1) {
    const n = mesh.normals.slice(i * 3, i * 3 + 3);
    const t = tan1[i];
    const tangent = V3.norm(V3.sub(t, V3.mul(n, V3.dot(n, t))));
    const handedness = V3.dot(V3.cross(n, tangent), tan2[i]) < 0 ? -1 : 1;
    mesh.tangents.push(tangent[0], tangent[1], tangent[2], handedness);
  }
  return mesh;
}

export function createParametricGrid({
  name,
  material,
  uSegments,
  vSegments,
  position,
  uv = (u, v) => [u, v],
  transparent = false,
  doubleSided = false,
  reverseWinding = false,
  extras = {},
}) {
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let vIndex = 0; vIndex <= vSegments; vIndex += 1) {
    const v = vIndex / vSegments;
    for (let uIndex = 0; uIndex <= uSegments; uIndex += 1) {
      const u = uIndex / uSegments;
      const p = position(u, v);
      const tex = uv(u, v, p);
      positions.push(p[0], p[1], p[2]);
      uvs.push(tex[0], tex[1]);
    }
  }
  const stride = uSegments + 1;
  for (let v = 0; v < vSegments; v += 1) {
    for (let u = 0; u < uSegments; u += 1) {
      const a = v * stride + u;
      const b = a + 1;
      const c = (v + 1) * stride + u;
      const d = c + 1;
      if (reverseWinding) indices.push(a, b, c, b, d, c);
      else indices.push(a, c, b, b, c, d);
    }
  }
  const mesh = createMesh({ name, material, positions, uvs, indices, transparent, doubleSided, extras });
  computeVertexNormals(mesh);
  computeTangents(mesh);
  return mesh;
}

export function createUvSphere({
  name,
  material,
  center = [0, 0, 0],
  radius = 1,
  scale = [1, 1, 1],
  uSegments = 40,
  vSegments = 24,
  transparent = false,
  doubleSided = false,
  extras = {},
}) {
  if (uSegments < 3 || vSegments < 3) throw new Error('Sphere requires at least 3x3 segments');
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const bottomIndex = 0;
  positions.push(center[0], center[1] - radius * scale[1], center[2]);
  normals.push(0, -1, 0);
  uvs.push(0.5, 0);

  const ringStart = 1;
  const ringStride = uSegments + 1;
  for (let vIndex = 1; vIndex < vSegments; vIndex += 1) {
    const v = vIndex / vSegments;
    const phi = -Math.PI / 2 + v * Math.PI;
    const cp = Math.cos(phi);
    const sp = Math.sin(phi);
    for (let uIndex = 0; uIndex <= uSegments; uIndex += 1) {
      const u = uIndex / uSegments;
      const theta = u * Math.PI * 2;
      const local = [
        radius * scale[0] * cp * Math.cos(theta),
        radius * scale[1] * sp,
        radius * scale[2] * cp * Math.sin(theta),
      ];
      positions.push(center[0] + local[0], center[1] + local[1], center[2] + local[2]);
      normals.push(...V3.norm([
        local[0] / Math.max(1e-12, scale[0] * scale[0]),
        local[1] / Math.max(1e-12, scale[1] * scale[1]),
        local[2] / Math.max(1e-12, scale[2] * scale[2]),
      ]));
      uvs.push(u, v);
    }
  }

  const topIndex = positions.length / 3;
  positions.push(center[0], center[1] + radius * scale[1], center[2]);
  normals.push(0, 1, 0);
  uvs.push(0.5, 1);

  // Bottom cap.
  for (let u = 0; u < uSegments; u += 1) {
    indices.push(bottomIndex, ringStart + u, ringStart + u + 1);
  }
  // Middle rings.
  const ringCount = vSegments - 1;
  for (let ring = 0; ring < ringCount - 1; ring += 1) {
    const current = ringStart + ring * ringStride;
    const next = current + ringStride;
    for (let u = 0; u < uSegments; u += 1) {
      const a = current + u;
      const b = a + 1;
      const c = next + u;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  // Top cap.
  const lastRing = ringStart + (ringCount - 1) * ringStride;
  for (let u = 0; u < uSegments; u += 1) {
    indices.push(topIndex, lastRing + u + 1, lastRing + u);
  }

  const mesh = createMesh({ name, material, positions, normals, uvs, indices, transparent, doubleSided, extras });
  const seamPairs = [];
  for (let ring = 0; ring < ringCount; ring += 1) {
    seamPairs.push([ringStart + ring * ringStride, ringStart + ring * ringStride + uSegments]);
  }
  // Analytic normals are already smooth; average seam pairs to eliminate numerical drift.
  for (const [a, b] of seamPairs) {
    const ia = a * 3;
    const ib = b * 3;
    const normal = V3.norm([
      mesh.normals[ia] + mesh.normals[ib],
      mesh.normals[ia + 1] + mesh.normals[ib + 1],
      mesh.normals[ia + 2] + mesh.normals[ib + 2],
    ]);
    for (const index of [ia, ib]) {
      mesh.normals[index] = normal[0];
      mesh.normals[index + 1] = normal[1];
      mesh.normals[index + 2] = normal[2];
    }
  }
  computeTangents(mesh);
  return mesh;
}

export function createRibbon({
  name,
  material,
  points,
  width = 0.02,
  normal = [0, 0, 1],
  transparent = false,
  doubleSided = true,
  extras = {},
}) {
  if (points.length < 2) throw new Error('Ribbon requires at least two points');
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let i = 0; i < points.length; i += 1) {
    const previous = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const tangent = V3.norm(V3.sub(next, previous));
    let side = V3.norm(V3.cross(normal, tangent));
    if (V3.lenSq(side) < 1e-10) side = [0, 1, 0];
    const half = typeof width === 'function' ? width(i / (points.length - 1)) * 0.5 : width * 0.5;
    const left = V3.sub(points[i], V3.mul(side, half));
    const right = V3.add(points[i], V3.mul(side, half));
    positions.push(...left, ...right);
    const u = i / (points.length - 1);
    uvs.push(u, 0, u, 1);
  }
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = i * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, c, b, b, c, d);
  }
  const mesh = createMesh({ name, material, positions, uvs, indices, transparent, doubleSided, extras });
  computeVertexNormals(mesh);
  computeTangents(mesh);
  return mesh;
}

export function createTubeAlongPath({
  name,
  material,
  points,
  radius = 0.02,
  radialSegments = 8,
  transparent = false,
  doubleSided = false,
  extras = {},
}) {
  if (points.length < 2) throw new Error('Tube path needs at least two points');
  const positions = [];
  const uvs = [];
  const indices = [];
  let previousNormal = [0, 1, 0];
  for (let i = 0; i < points.length; i += 1) {
    const previous = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const tangent = V3.norm(V3.sub(next, previous));
    let normal = V3.sub(previousNormal, V3.mul(tangent, V3.dot(previousNormal, tangent)));
    if (V3.lenSq(normal) < 1e-8) normal = V3.norm(V3.cross(tangent, [1, 0, 0]));
    normal = V3.norm(normal);
    const binormal = V3.norm(V3.cross(tangent, normal));
    previousNormal = normal;
    const t = i / (points.length - 1);
    const localRadius = typeof radius === 'function' ? radius(t) : radius;
    for (let j = 0; j <= radialSegments; j += 1) {
      const angle = (j / radialSegments) * Math.PI * 2;
      const offset = V3.add(V3.mul(normal, Math.cos(angle) * localRadius), V3.mul(binormal, Math.sin(angle) * localRadius));
      const p = V3.add(points[i], offset);
      positions.push(...p);
      uvs.push(t, j / radialSegments);
    }
  }
  const stride = radialSegments + 1;
  for (let i = 0; i < points.length - 1; i += 1) {
    for (let j = 0; j < radialSegments; j += 1) {
      const a = i * stride + j;
      const b = a + 1;
      const c = (i + 1) * stride + j;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const mesh = createMesh({ name, material, positions, uvs, indices, transparent, doubleSided, extras });
  const seamPairs = [];
  for (let i = 0; i < points.length; i += 1) seamPairs.push([i * stride, i * stride + radialSegments]);
  computeVertexNormals(mesh, { seamPairs });
  computeTangents(mesh);
  return mesh;
}

export function createDisc({
  name,
  material,
  center,
  normal = [0, 0, 1],
  radius = 1,
  segments = 48,
  transparent = false,
  doubleSided = true,
  extras = {},
}) {
  const n = V3.norm(normal);
  let tangent = V3.norm(V3.cross(Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], n));
  if (V3.lenSq(tangent) < 1e-10) tangent = [1, 0, 0];
  const bitangent = V3.norm(V3.cross(n, tangent));
  const positions = [...center];
  const uvs = [0.5, 0.5];
  const indices = [];
  for (let i = 0; i <= segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    const p = V3.add(center, V3.add(V3.mul(tangent, Math.cos(angle) * radius), V3.mul(bitangent, Math.sin(angle) * radius)));
    positions.push(...p);
    uvs.push(0.5 + Math.cos(angle) * 0.5, 0.5 + Math.sin(angle) * 0.5);
  }
  for (let i = 0; i < segments; i += 1) indices.push(0, i + 1, i + 2);
  const mesh = createMesh({ name, material, positions, uvs, indices, transparent, doubleSided, extras });
  mesh.normals = [];
  for (let i = 0; i < positions.length / 3; i += 1) mesh.normals.push(...n);
  computeTangents(mesh);
  return mesh;
}

export function meshBounds(mesh) {
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const p = [mesh.positions[i], mesh.positions[i + 1], mesh.positions[i + 2]];
    min = V3.min(min, p);
    max = V3.max(max, p);
  }
  return { min, max, size: V3.sub(max, min), center: V3.mul(V3.add(min, max), 0.5) };
}

export function modelBounds(meshes) {
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  for (const mesh of meshes) {
    const bounds = meshBounds(mesh);
    min = V3.min(min, bounds.min);
    max = V3.max(max, bounds.max);
  }
  return { min, max, size: V3.sub(max, min), center: V3.mul(V3.add(min, max), 0.5) };
}

export function transformMesh(mesh, transform) {
  const output = cloneMesh(mesh);
  const scale = transform.scale ?? [1, 1, 1];
  const translate = transform.translate ?? [0, 0, 0];
  const rotate = transform.rotate ?? [0, 0, 0];
  const [rx, ry, rz] = rotate;
  const cx = Math.cos(rx); const sx = Math.sin(rx);
  const cy = Math.cos(ry); const sy = Math.sin(ry);
  const cz = Math.cos(rz); const sz = Math.sin(rz);
  const applyRotation = (p) => {
    let [x, y, z] = p;
    [y, z] = [y * cx - z * sx, y * sx + z * cx];
    [x, z] = [x * cy + z * sy, -x * sy + z * cy];
    [x, y] = [x * cz - y * sz, x * sz + y * cz];
    return [x, y, z];
  };
  for (let i = 0; i < output.positions.length; i += 3) {
    const scaled = [output.positions[i] * scale[0], output.positions[i + 1] * scale[1], output.positions[i + 2] * scale[2]];
    const p = V3.add(applyRotation(scaled), translate);
    output.positions[i] = p[0];
    output.positions[i + 1] = p[1];
    output.positions[i + 2] = p[2];
  }
  computeVertexNormals(output);
  computeTangents(output);
  return output;
}

export function normalizeMeshAttributes(mesh) {
  const vertexCount = mesh.positions.length / 3;
  if (mesh.normals.length !== vertexCount * 3) computeVertexNormals(mesh);
  if (mesh.uvs.length !== vertexCount * 2) {
    mesh.uvs = [];
    for (let i = 0; i < vertexCount; i += 1) mesh.uvs.push(0, 0);
  }
  if (mesh.tangents.length !== vertexCount * 4) computeTangents(mesh);
  mesh.indices = mesh.indices.map((index) => clamp(Math.round(index), 0, vertexCount - 1));
  return mesh;
}
