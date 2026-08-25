import { SeededRandom, V3, clamp, lerp, smoothstep, sha256Hex } from './math.js';
import {
  createMesh,
  createParametricGrid,
  createUvSphere,
  createRibbon,
  createTubeAlongPath,
  createDisc,
  computeVertexNormals,
  computeTangents,
  modelBounds,
} from './geometry.js';
import { generateBodyTextures, generateFinTextures, generateEyeTexture } from './textures.js';

export const FISH_PALETTES = {
  azureGold: {
    baseDeep: [0.015, 0.175, 0.235],
    base: [0.025, 0.545, 0.630],
    dorsal: [0.010, 0.105, 0.165],
    belly: [0.475, 0.780, 0.720],
    face: [0.035, 0.690, 0.735],
    accent: [0.955, 0.545, 0.115],
    fin: [0.030, 0.500, 0.625],
    finDeep: [0.006, 0.120, 0.215],
    irisInner: [0.970, 0.675, 0.125],
    irisOuter: [0.105, 0.345, 0.285],
  },
  coralSilver: {
    baseDeep: [0.135, 0.125, 0.180],
    base: [0.570, 0.625, 0.660],
    dorsal: [0.090, 0.100, 0.165],
    belly: [0.725, 0.790, 0.770],
    face: [0.675, 0.460, 0.420],
    accent: [0.915, 0.275, 0.180],
    fin: [0.605, 0.255, 0.245],
    finDeep: [0.170, 0.090, 0.135],
    irisInner: [0.920, 0.510, 0.115],
    irisOuter: [0.260, 0.095, 0.085],
  },
  emeraldPearl: {
    baseDeep: [0.012, 0.160, 0.135],
    base: [0.050, 0.555, 0.410],
    dorsal: [0.005, 0.075, 0.080],
    belly: [0.620, 0.810, 0.690],
    face: [0.140, 0.650, 0.470],
    accent: [0.865, 0.835, 0.320],
    fin: [0.050, 0.510, 0.430],
    finDeep: [0.010, 0.160, 0.150],
    irisInner: [0.820, 0.790, 0.250],
    irisOuter: [0.080, 0.330, 0.240],
  },
  violetSun: {
    baseDeep: [0.090, 0.045, 0.210],
    base: [0.390, 0.210, 0.610],
    dorsal: [0.035, 0.020, 0.110],
    belly: [0.620, 0.540, 0.720],
    face: [0.520, 0.270, 0.600],
    accent: [0.960, 0.620, 0.120],
    fin: [0.350, 0.170, 0.570],
    finDeep: [0.070, 0.035, 0.175],
    irisInner: [0.950, 0.625, 0.105],
    irisOuter: [0.285, 0.090, 0.315],
  },
};

export const FISH_SPECIES = {
  oval: {
    length: 4.55,
    height: 2.18,
    depth: 1.05,
    profileExponent: 0.52,
    tailRoot: 0.25,
    topBias: 1.03,
    bellyBias: 0.91,
    foreheadLift: 0.10,
    tailLength: 1.55,
    tailHeight: 1.45,
    dorsalHeight: 0.78,
  },
  torpedo: {
    length: 5.15,
    height: 1.55,
    depth: 0.92,
    profileExponent: 0.66,
    tailRoot: 0.20,
    topBias: 1.00,
    bellyBias: 0.95,
    foreheadLift: 0.025,
    tailLength: 1.65,
    tailHeight: 1.05,
    dorsalHeight: 0.56,
  },
  disc: {
    length: 3.92,
    height: 2.70,
    depth: 0.84,
    profileExponent: 0.44,
    tailRoot: 0.23,
    topBias: 1.06,
    bellyBias: 0.90,
    foreheadLift: 0.16,
    tailLength: 1.35,
    tailHeight: 1.62,
    dorsalHeight: 0.92,
  },
  boxy: {
    length: 4.15,
    height: 1.95,
    depth: 1.20,
    profileExponent: 0.43,
    tailRoot: 0.27,
    topBias: 1.01,
    bellyBias: 0.94,
    foreheadLift: 0.04,
    tailLength: 1.42,
    tailHeight: 1.28,
    dorsalHeight: 0.67,
  },
};

function seedNumber(seed) {
  return parseInt(sha256Hex(String(seed)).slice(0, 8), 16) >>> 0;
}

export function createFishDefinition(seed = 'azure-reef-001', overrides = {}) {
  const rng = new SeededRandom(seed);
  const speciesFamily = overrides.speciesFamily ?? rng.pick(['oval', 'torpedo', 'disc', 'boxy']);
  const tailProfile = overrides.tailProfile ?? rng.pick(['forked', 'fan', 'rounded']);
  const patternType = overrides.patternType ?? rng.pick(['bands', 'spots', 'mottled', 'saddles']);
  const paletteName = overrides.palette ?? overrides.paletteName ?? rng.pick(Object.keys(FISH_PALETTES));
  const eyeProfile = overrides.eyeProfile ?? rng.pick(['amber', 'dark']);
  const mouthProfile = overrides.mouthProfile ?? rng.pick(['terminal', 'upturned', 'nibbler', 'beak']);
  const baseSpecies = FISH_SPECIES[speciesFamily];
  if (!baseSpecies) throw new RangeError(`Unknown species family: ${speciesFamily}`);
  if (!FISH_PALETTES[paletteName]) throw new RangeError(`Unknown palette: ${paletteName}`);
  const size = clamp(Number(overrides.size ?? 0.5), 0, 1);
  const sizeScale = lerp(0.78, 1.22, size);
  const tailScale = overrides.tailScale ?? rng.range(0.94, 1.08);
  const definition = {
    name: overrides.name ?? 'Procedural Reef Fish',
    seed: String(seed),
    seedNumber: seedNumber(seed),
    speciesFamily,
    tailProfile,
    patternType,
    paletteName,
    eyeProfile,
    size,
    sizeScale,
    body: {
      length: baseSpecies.length * sizeScale * (overrides.lengthScale ?? rng.range(0.96, 1.04)),
      height: baseSpecies.height * sizeScale * (overrides.heightScale ?? rng.range(0.96, 1.04)),
      depth: baseSpecies.depth * sizeScale * (overrides.depthScale ?? rng.range(0.97, 1.04)),
      profileExponent: baseSpecies.profileExponent,
      tailRoot: baseSpecies.tailRoot,
      topBias: baseSpecies.topBias,
      bellyBias: baseSpecies.bellyBias,
      foreheadLift: baseSpecies.foreheadLift,
      bellyFullness: overrides.bellyFullness ?? rng.range(0.96, 1.06),
      snoutLength: overrides.snoutLength ?? rng.range(0.92, 1.07),
    },
    fins: {
      tailLength: baseSpecies.tailLength * sizeScale * tailScale,
      tailHeight: baseSpecies.tailHeight * sizeScale * tailScale,
      dorsalHeight: baseSpecies.dorsalHeight * sizeScale * rng.range(0.94, 1.06),
      pectoralLength: (speciesFamily === 'torpedo' ? 1.15 : 0.92) * sizeScale * rng.range(0.94, 1.07),
      membraneThickness: clamp(baseSpecies.depth * sizeScale * 0.015, 0.010, 0.032),
    },
    head: {
      eyeScale: overrides.eyeScale ?? rng.range(0.92, 1.04),
      eyeU: speciesFamily === 'torpedo' ? 0.79 : 0.805,
      eyeVertical: speciesFamily === 'disc' ? 0.22 : 0.17,
      mouthProfile,
    },
    palette: FISH_PALETTES[paletteName],
    patternStrength: overrides.patternStrength ?? rng.range(0.68, 0.86),
    surface: {
      clearcoat: overrides.clearcoat ?? rng.range(0.48, 0.68),
      iridescence: overrides.iridescence ?? rng.range(0.18, 0.46),
      subsurface: overrides.subsurface ?? rng.range(0.12, 0.24),
      finTransmission: overrides.finTransmission ?? rng.range(0.44, 0.62),
      variation: overrides.surfaceVariation ?? rng.range(0.42, 0.68),
    },
    quality: overrides.quality ?? 'preview',
  };
  return definition;
}

function signedPower(value, power) {
  return Math.sign(value) * Math.pow(Math.abs(value), power);
}

export function createBodySurface(definition) {
  const body = definition.body;
  const xTail = -body.length * 0.48;
  const xNose = body.length * (0.48 + 0.04 * body.snoutLength);

  function section(u) {
    const sine = Math.pow(Math.max(0, Math.sin(Math.PI * u)), body.profileExponent);
    const tailPeduncle = body.tailRoot * (1 - smoothstep(0.0, 0.22, u));
    const noseMinimum = 0.055;
    let profile = noseMinimum + 0.93 * sine + tailPeduncle;
    const headTaper = 1 - 0.17 * smoothstep(0.78, 1.0, u);
    profile *= headTaper;
    const headRise = body.foreheadLift * smoothstep(0.68, 0.96, u);
    const centerY = 0.08 + 0.07 * Math.sin(Math.PI * u) + headRise;
    const bellyBoost = 1 + (body.bellyFullness - 1) * smoothstep(0.18, 0.70, u) * (1 - smoothstep(0.70, 0.96, u));
    const ry = body.height * 0.5 * profile;
    const rz = body.depth * 0.5 * profile * (1 - 0.055 * smoothstep(0.70, 1.0, u));
    const x = lerp(xTail, xNose, u);
    return { x, centerY, ry, rz, bellyBoost };
  }

  function point(u, theta, radialOffset = 0) {
    const s = section(clamp(u));
    const yBasis = Math.cos(theta);
    const zBasis = Math.sin(theta);
    const topBottom = yBasis >= 0 ? body.topBias : body.bellyBias * s.bellyBoost;
    let radialScale = 1;
    const nearSide = Math.exp(-Math.pow((theta - Math.PI / 2) / 0.20, 2));
    const farSide = Math.exp(-Math.pow((theta - Math.PI * 1.5) / 0.20, 2));
    const eyeSocket = Math.exp(-Math.pow((u - definition.head.eyeU) / 0.050, 2)) * (nearSide + farSide);
    radialScale -= eyeSocket * 0.045;
    const gillBulge = Math.exp(-Math.pow((u - 0.69) / 0.075, 2)) * (nearSide + farSide);
    radialScale += gillBulge * 0.014;
    const y = s.centerY + signedPower(yBasis, 1.07) * s.ry * topBottom * radialScale;
    const z = signedPower(zBasis, 1.035) * s.rz * radialScale;
    const outward = V3.norm([0, (y - s.centerY) / Math.max(1e-6, s.ry * topBottom), z / Math.max(1e-6, s.rz)]);
    return [s.x + outward[0] * radialOffset, y + outward[1] * radialOffset, z + outward[2] * radialOffset];
  }

  function frame(u, theta) {
    const epsilon = 0.0008;
    const p = point(u, theta);
    const pu = point(clamp(u + epsilon), theta);
    const pv = point(u, theta + epsilon);
    const tangentU = V3.norm(V3.sub(pu, p));
    const tangentV = V3.norm(V3.sub(pv, p));
    let normal = V3.norm(V3.cross(tangentU, tangentV));
    const sectionCenter = [section(u).x, section(u).centerY, 0];
    if (V3.dot(normal, V3.sub(p, sectionCenter)) < 0) normal = V3.mul(normal, -1);
    return { position: p, normal, tangentU, tangentV };
  }

  return { point, frame, section, xTail, xNose };
}

function buildBodyMesh(definition, surface, quality = 'high') {
  const longitudinal = quality === 'high' ? 128 : 72;
  const radial = quality === 'high' ? 72 : 40;
  const positions = [];
  const uvs = [];
  const indices = [];
  const seamPairs = [];
  for (let i = 0; i <= longitudinal; i += 1) {
    const u = i / longitudinal;
    for (let j = 0; j <= radial; j += 1) {
      const v = j / radial;
      const p = surface.point(u, v * Math.PI * 2);
      positions.push(...p);
      uvs.push(u, v);
    }
    seamPairs.push([i * (radial + 1), i * (radial + 1) + radial]);
  }
  const stride = radial + 1;
  for (let i = 0; i < longitudinal; i += 1) {
    for (let j = 0; j < radial; j += 1) {
      const a = i * stride + j;
      const b = a + 1;
      const c = (i + 1) * stride + j;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  // Cap both ends with duplicated rim vertices. Positional welding keeps the topology closed,
  // while duplicated vertices preserve a hard normal split between the side wall and each cap.
  const tailCapStart = positions.length / 3;
  for (let j = 0; j <= radial; j += 1) {
    positions.push(positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]);
    uvs.push(0, j / radial);
  }
  const noseRing = longitudinal * stride;
  const noseCapStart = positions.length / 3;
  for (let j = 0; j <= radial; j += 1) {
    const source = (noseRing + j) * 3;
    positions.push(positions[source], positions[source + 1], positions[source + 2]);
    uvs.push(1, j / radial);
  }
  seamPairs.push([tailCapStart, tailCapStart + radial]);
  seamPairs.push([noseCapStart, noseCapStart + radial]);

  const tailCenterIndex = positions.length / 3;
  const tailSection = surface.section(0);
  positions.push(tailSection.x - 0.035, tailSection.centerY, 0);
  uvs.push(0, 0.5);
  const noseCenterIndex = positions.length / 3;
  const noseSection = surface.section(1);
  positions.push(noseSection.x + 0.025, noseSection.centerY, 0);
  uvs.push(1, 0.5);
  for (let j = 0; j < radial; j += 1) {
    indices.push(tailCenterIndex, tailCapStart + j + 1, tailCapStart + j);
    indices.push(noseCenterIndex, noseCapStart + j + 1, noseCapStart + j);
  }

  const mesh = createMesh({
    name: 'Fish_Body',
    material: 'Skin',
    positions,
    uvs,
    indices,
    extras: { anatomicalRegion: 'body', allowOpenBoundary: false },
  });
  computeVertexNormals(mesh, { seamPairs });
  computeTangents(mesh);
  return mesh;
}


function caudalBase(surface) {
  const root = surface.section(0);
  return {
    x: root.x - 0.44,
    centerY: root.centerY,
    ry: root.ry * 0.54,
    rz: root.rz * 0.54,
    bodyRoot: root,
  };
}

function buildPeduncle(definition, surface, quality = 'high') {
  const root = surface.section(0);
  const base = caudalBase(surface);
  const uSegments = quality === 'high' ? 28 : 18;
  const vSegments = quality === 'high' ? 42 : 26;
  const mesh = createParametricGrid({
    name: 'Fish_Caudal_Peduncle',
    material: 'Skin',
    uSegments,
    vSegments,
    extras: { anatomicalRegion: 'caudalPeduncle', allowOpenBoundary: true },
    position: (u, v) => {
      const theta = v * Math.PI * 2;
      const blend = u * u * (3 - 2 * u);
      const ry = lerp(root.ry * 0.92, base.ry, blend);
      const rz = lerp(root.rz * 0.92, base.rz, blend);
      const x = lerp(root.x + 0.015, base.x, u);
      const centerY = lerp(root.centerY, base.centerY - 0.01, u);
      return [x, centerY + Math.cos(theta) * ry, Math.sin(theta) * rz];
    },
    uv: (u, v) => [lerp(0.075, 0.005, u), v],
  });
  const rowStride = uSegments + 1;
  const seamPairs = [];
  for (let u = 0; u <= uSegments; u += 1) seamPairs.push([u, vSegments * rowStride + u]);
  computeVertexNormals(mesh, { seamPairs });
  computeTangents(mesh);
  return mesh;
}

function tailTipX(definition, rootX, vv) {
  const length = definition.fins.tailLength;
  if (definition.tailProfile === 'forked') return rootX - length * (0.72 + 0.28 * Math.pow(Math.abs(vv), 0.52));
  if (definition.tailProfile === 'rounded') return rootX - length * (0.80 + 0.20 * Math.cos(vv * Math.PI * 0.5));
  return rootX - length * (0.92 + 0.08 * Math.cos(vv * Math.PI));
}

function buildTail(definition, surface, quality = 'high') {
  const root = caudalBase(surface);
  const uSegments = quality === 'high' ? 48 : 28;
  const vSegments = quality === 'high' ? 46 : 26;
  const tail = createParametricGrid({
    name: 'Fin_Caudal_Membrane',
    material: 'FinMembrane',
    uSegments,
    vSegments,
    transparent: true,
    doubleSided: true,
    extras: { anatomicalRegion: 'caudalFin', allowOpenBoundary: true },
    position: (u, v) => {
      const vv = v * 2 - 1;
      const eased = u * u * (3 - 2 * u);
      const rootY = root.centerY + vv * root.ry * 0.58;
      const tipY = root.centerY + vv * definition.fins.tailHeight * (0.91 + 0.09 * Math.abs(vv));
      const tipX = tailTipX(definition, root.x, vv);
      const x = lerp(root.x - 0.02, tipX, eased);
      const y = lerp(rootY, tipY, Math.pow(u, 0.86));
      const z = Math.sin(Math.PI * u) * (1 - vv * vv) * 0.075 + vv * 0.018;
      return [x, y, z];
    },
  });

  const rays = [];
  const rayCount = quality === 'high' ? 11 : 7;
  for (let rayIndex = 0; rayIndex < rayCount; rayIndex += 1) {
    const vv = lerp(-0.88, 0.88, rayIndex / (rayCount - 1));
    const points = [];
    const steps = 18;
    for (let i = 0; i <= steps; i += 1) {
      const u = i / steps;
      const eased = u * u * (3 - 2 * u);
      const rootY = root.centerY + vv * root.ry * 0.58;
      const tipY = root.centerY + vv * definition.fins.tailHeight * (0.91 + 0.09 * Math.abs(vv));
      const tipX = tailTipX(definition, root.x, vv);
      points.push([
        lerp(root.x - 0.018, tipX, eased),
        lerp(rootY, tipY, Math.pow(u, 0.86)),
        Math.sin(Math.PI * u) * (1 - vv * vv) * 0.079 + vv * 0.018 + 0.004,
      ]);
    }
    rays.push(createTubeAlongPath({
      name: `Fin_Caudal_Ray_${String(rayIndex).padStart(2, '0')}`,
      material: 'FinRay',
      points,
      radius: (t) => lerp(0.018, 0.006, t),
      radialSegments: 5,
      extras: { anatomicalRegion: 'finRay', allowOpenBoundary: true },
    }));
  }
  return [tail, ...rays];
}

function buildDorsalAndAnal(definition, surface, quality = 'high') {
  const segmentU = quality === 'high' ? 34 : 20;
  const segmentV = quality === 'high' ? 18 : 10;
  const dorsalStart = definition.speciesFamily === 'disc' ? 0.16 : 0.20;
  const dorsalEnd = definition.speciesFamily === 'torpedo' ? 0.68 : 0.72;
  const dorsal = createParametricGrid({
    name: 'Fin_Dorsal_Membrane',
    material: 'FinMembrane',
    uSegments: segmentU,
    vSegments: segmentV,
    transparent: true,
    doubleSided: true,
    extras: { anatomicalRegion: 'dorsalFin', allowOpenBoundary: true },
    position: (u, v) => {
      const bodyU = lerp(dorsalStart, dorsalEnd, u);
      const rootFrame = surface.frame(bodyU, 0);
      const profile = 0.035 + 0.965 * Math.pow(Math.sin(Math.PI * u), 0.62);
      const height = definition.fins.dorsalHeight * profile * (0.78 + 0.22 * (1 - u));
      const swept = -0.28 * v * u;
      return [
        rootFrame.position[0] + swept * v,
        rootFrame.position[1] + height * Math.pow(v, 0.88),
        rootFrame.position[2] + Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * 0.045,
      ];
    },
  });
  const anal = createParametricGrid({
    name: 'Fin_Anal_Membrane',
    material: 'FinMembrane',
    uSegments: Math.max(16, Math.floor(segmentU * 0.72)),
    vSegments: segmentV,
    transparent: true,
    doubleSided: true,
    reverseWinding: true,
    extras: { anatomicalRegion: 'analFin', allowOpenBoundary: true },
    position: (u, v) => {
      const bodyU = lerp(0.20, 0.58, u);
      const rootFrame = surface.frame(bodyU, Math.PI);
      const profile = 0.035 + 0.965 * Math.pow(Math.sin(Math.PI * u), 0.66);
      const height = definition.fins.dorsalHeight * 0.58 * profile;
      return [
        rootFrame.position[0] - 0.18 * v * u,
        rootFrame.position[1] - height * Math.pow(v, 0.9),
        rootFrame.position[2] - Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * 0.035,
      ];
    },
  });

  const rays = [];
  for (const [prefix, start, end, theta, count, scale] of [
    ['Dorsal', dorsalStart, dorsalEnd, 0, quality === 'high' ? 8 : 5, 1],
    ['Anal', 0.20, 0.58, Math.PI, quality === 'high' ? 6 : 4, 0.58],
  ]) {
    for (let ray = 0; ray < count; ray += 1) {
      const bodyU = lerp(start + 0.035, end - 0.035, ray / Math.max(1, count - 1));
      const localU = (bodyU - start) / (end - start);
      const frame = surface.frame(bodyU, theta);
      const profile = 0.035 + 0.965 * Math.pow(Math.sin(Math.PI * localU), 0.65);
      const height = definition.fins.dorsalHeight * profile * scale;
      const direction = theta === 0 ? 1 : -1;
      const points = [];
      for (let i = 0; i <= 10; i += 1) {
        const t = i / 10;
        points.push([
          frame.position[0] - 0.18 * t * localU,
          frame.position[1] + direction * height * Math.pow(t, 0.9),
          frame.position[2] + direction * Math.sin(Math.PI * t) * 0.012,
        ]);
      }
      rays.push(createTubeAlongPath({
        name: `Fin_${prefix}_Ray_${String(ray).padStart(2, '0')}`,
        material: 'FinRay',
        points,
        radius: (t) => lerp(0.010, 0.0032, t),
        radialSegments: 5,
        extras: { anatomicalRegion: 'finRay', allowOpenBoundary: true },
      }));
    }
  }
  return [dorsal, anal, ...rays];
}

function buildPectoral(definition, surface, near, quality = 'high') {
  const theta = near ? Math.PI / 2 : Math.PI * 1.5;
  const side = near ? 1 : -1;
  const mesh = createParametricGrid({
    name: near ? 'Fin_Pectoral_Near' : 'Fin_Pectoral_Far',
    material: 'FinMembrane',
    uSegments: quality === 'high' ? 26 : 15,
    vSegments: quality === 'high' ? 20 : 11,
    transparent: true,
    doubleSided: true,
    reverseWinding: !near,
    extras: { anatomicalRegion: 'pectoralFin', allowOpenBoundary: true },
    position: (u, v) => {
      const bodyU = lerp(0.57, 0.70, u);
      const root = surface.frame(bodyU, theta);
      const spread = definition.fins.pectoralLength * (0.035 + 0.965 * Math.sin(Math.PI * u)) * Math.pow(v, 0.82);
      return [
        root.position[0] - spread * 0.96,
        root.position[1] - spread * 0.46 + Math.sin(Math.PI * u) * 0.075,
        root.position[2] + side * spread * 0.30 + side * Math.sin(Math.PI * v) * 0.055,
      ];
    },
  });
  const rays = [];
  const rayCount = quality === 'high' ? 6 : 4;
  for (let ray = 0; ray < rayCount; ray += 1) {
    const localU = lerp(0.12, 0.88, ray / Math.max(1, rayCount - 1));
    const bodyU = lerp(0.57, 0.70, localU);
    const root = surface.frame(bodyU, theta);
    const points = [];
    for (let i = 0; i <= 10; i += 1) {
      const v = i / 10;
      const spread = definition.fins.pectoralLength * (0.035 + 0.965 * Math.sin(Math.PI * localU)) * Math.pow(v, 0.82);
      points.push([
        root.position[0] - spread * 0.96,
        root.position[1] - spread * 0.46 + Math.sin(Math.PI * localU) * 0.075,
        root.position[2] + side * spread * 0.30 + side * Math.sin(Math.PI * v) * 0.058,
      ]);
    }
    rays.push(createTubeAlongPath({
      name: `${near ? 'Fin_Pectoral_Near' : 'Fin_Pectoral_Far'}_Ray_${ray}`,
      material: 'FinRay',
      points,
      radius: (t) => lerp(0.011, 0.0035, t),
      radialSegments: 5,
      extras: { anatomicalRegion: 'finRay', allowOpenBoundary: true },
    }));
  }
  return [mesh, ...rays];
}

function buildPelvicFins(definition, surface, quality = 'high') {
  const results = [];
  for (const side of [-1, 1]) {
    const theta = Math.PI + side * 0.16;
    results.push(createParametricGrid({
      name: side > 0 ? 'Fin_Pelvic_Near' : 'Fin_Pelvic_Far',
      material: 'FinMembrane',
      uSegments: quality === 'high' ? 16 : 10,
      vSegments: quality === 'high' ? 12 : 8,
      transparent: true,
      doubleSided: true,
      reverseWinding: side < 0,
      extras: { anatomicalRegion: 'pelvicFin', allowOpenBoundary: true },
      position: (u, v) => {
        const bodyU = lerp(0.48, 0.58, u);
        const root = surface.frame(bodyU, theta);
        const extent = (0.035 + 0.965 * Math.sin(Math.PI * u)) * 0.50 * Math.pow(v, 0.85);
        return [
          root.position[0] - extent * 0.38,
          root.position[1] - extent * 0.88,
          root.position[2] + side * extent * 0.12,
        ];
      },
    }));
  }
  return results;
}

function createCorneaDome({ name, center, normal, radius, depth, segments, rings }) {
  const n = V3.norm(normal);
  let tangent = V3.norm(V3.cross(Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], n));
  if (V3.lenSq(tangent) < 1e-10) tangent = [1, 0, 0];
  const bitangent = V3.norm(V3.cross(n, tangent));
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const apex = V3.add(center, V3.mul(n, depth));
  positions.push(...apex);
  normals.push(...n);
  uvs.push(0.5, 0.5);

  for (let ring = 1; ring <= rings; ring += 1) {
    const t = ring / rings;
    const polar = t * Math.PI * 0.5;
    const radial = Math.sin(polar) * radius;
    const height = Math.cos(polar) * depth;
    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const point = V3.add(
        center,
        V3.add(
          V3.add(V3.mul(tangent, cos * radial), V3.mul(bitangent, sin * radial)),
          V3.mul(n, height),
        ),
      );
      positions.push(...point);
      const localNormal = V3.norm([
        cos * radial / Math.max(radius * radius, 1e-8),
        sin * radial / Math.max(radius * radius, 1e-8),
        height / Math.max(depth * depth, 1e-8),
      ]);
      normals.push(...V3.norm(V3.add(
        V3.add(V3.mul(tangent, localNormal[0]), V3.mul(bitangent, localNormal[1])),
        V3.mul(n, localNormal[2]),
      )));
      uvs.push(0.5 + cos * radial / (2 * radius), 0.5 + sin * radial / (2 * radius));
    }
  }

  const firstRing = 1;
  for (let segment = 0; segment < segments; segment += 1) indices.push(0, firstRing + segment, firstRing + segment + 1);
  const stride = segments + 1;
  for (let ring = 0; ring < rings - 1; ring += 1) {
    const aStart = firstRing + ring * stride;
    const bStart = aStart + stride;
    for (let segment = 0; segment < segments; segment += 1) {
      const a = aStart + segment;
      const b = a + 1;
      const c = bStart + segment;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const mesh = createMesh({
    name,
    material: 'Cornea',
    positions,
    normals,
    uvs,
    indices,
    transparent: true,
    doubleSided: false,
    extras: { anatomicalRegion: 'cornea', allowOpenBoundary: true },
  });
  computeTangents(mesh);
  return mesh;
}

function buildEyes(definition, surface, quality = 'high') {
  const meshes = [];
  const radius = 0.132 * definition.head.eyeScale * (definition.speciesFamily === 'torpedo' ? 0.90 : 1);
  const segments = quality === 'high' ? 48 : 28;
  const rings = quality === 'high' ? 12 : 7;
  for (const side of [1, -1]) {
    const theta = side > 0 ? Math.PI / 2 : Math.PI * 1.5;
    const frame = surface.frame(definition.head.eyeU, theta);
    // A flush socket and shallow dome read as an eye embedded in tissue rather than a sphere attached to the body.
    meshes.push(createDisc({
      name: side > 0 ? 'Eye_Near_Socket' : 'Eye_Far_Socket',
      material: 'EyeTissue',
      center: V3.add(frame.position, V3.mul(frame.normal, 0.003)),
      normal: frame.normal,
      radius: radius * 0.96,
      segments,
      doubleSided: false,
      extras: { anatomicalRegion: 'eyeSocket', allowOpenBoundary: true },
    }));
    meshes.push(createDisc({
      name: side > 0 ? 'Eye_Near_Iris' : 'Eye_Far_Iris',
      material: 'Iris',
      center: V3.add(frame.position, V3.mul(frame.normal, 0.007)),
      normal: frame.normal,
      radius: radius * 0.60,
      segments,
      doubleSided: false,
      extras: { anatomicalRegion: 'iris', allowOpenBoundary: true },
    }));
    meshes.push(createCorneaDome({
      name: side > 0 ? 'Eye_Near_Cornea' : 'Eye_Far_Cornea',
      center: V3.add(frame.position, V3.mul(frame.normal, 0.009)),
      normal: frame.normal,
      radius: radius * 0.98,
      depth: radius * 0.28,
      segments,
      rings,
    }));
  }
  return meshes;
}

function projectedSidePoint(surface, u, theta, offset = 0.018) {
  const frame = surface.frame(u, theta);
  return V3.add(frame.position, V3.mul(frame.normal, offset));
}

function buildFaceDetails(definition, surface) {
  const details = [];
  const profile = definition.head.mouthProfile ?? 'terminal';
  const mouthRules = {
    terminal: { u: 0.975, arc: 0.90, theta: 0.28, y: -0.085, width: 1.0, projection: 0.010, tilt: 0.010 },
    upturned: { u: 0.972, arc: 0.82, theta: 0.25, y: -0.030, width: 0.88, projection: 0.012, tilt: 0.055 },
    nibbler: { u: 0.982, arc: 0.66, theta: 0.22, y: -0.072, width: 0.68, projection: 0.006, tilt: 0.004 },
    beak: { u: 0.990, arc: 0.60, theta: 0.18, y: -0.060, width: 0.62, projection: 0.040, tilt: 0.008 },
  };
  const rule = mouthRules[profile] ?? mouthRules.terminal;
  const mouthPoints = [];
  const mouthSegments = 20;
  for (let i = 0; i <= mouthSegments; i += 1) {
    const t = i / mouthSegments;
    const angle = lerp(-rule.arc, rule.arc, t);
    const u = rule.u + 0.010 * Math.cos(angle);
    const theta = Math.PI / 2 + rule.theta * Math.sin(angle);
    const p = projectedSidePoint(surface, u, theta, 0.020);
    p[0] += rule.projection * Math.sin(Math.PI * t);
    p[1] += rule.y + rule.tilt * (t - 0.5);
    mouthPoints.push(p);
  }
  details.push(createRibbon({
    name: 'Face_Mouth_Cavity',
    material: 'MouthInterior',
    points: mouthPoints,
    width: (t) => rule.width * (0.028 * Math.sin(Math.PI * clamp(t, 0.02, 0.98)) + 0.008),
    normal: [0, 0, 1],
    extras: { anatomicalRegion: 'mouth', mouthProfile: profile, allowOpenBoundary: true },
  }));
  const lipPoints = mouthPoints.map((p, index) => [p[0] + 0.008, p[1] + (index / mouthSegments - 0.5) * rule.tilt, p[2] + 0.006]);
  details.push(createRibbon({
    name: 'Face_Lip_Ridge',
    material: 'Lip',
    points: lipPoints,
    width: 0.012 * rule.width,
    normal: [0, 0, 1],
    extras: { anatomicalRegion: 'lip', mouthProfile: profile, allowOpenBoundary: true },
  }));

  const gillPoints = [];
  for (let i = 0; i <= 30; i += 1) {
    const t = i / 30;
    const theta = lerp(0.52, 2.54, t);
    const u = 0.704 - 0.020 * Math.cos((t - 0.5) * Math.PI);
    gillPoints.push(projectedSidePoint(surface, u, theta, 0.022));
  }
  details.push(createRibbon({
    name: 'Face_Operculum_Crease',
    material: 'GillLine',
    points: gillPoints,
    width: (t) => 0.018 * Math.sin(Math.PI * t) + 0.006,
    normal: [0, 0, 1],
    extras: { anatomicalRegion: 'operculum', allowOpenBoundary: true },
  }));

  const lateral = [];
  for (let i = 0; i <= 48; i += 1) {
    const t = i / 48;
    const u = lerp(0.18, 0.67, t);
    const theta = Math.PI / 2 - 0.12 + 0.035 * Math.sin(t * Math.PI * 2);
    const p = projectedSidePoint(surface, u, theta, 0.018);
    p[1] += 0.035 * Math.sin(t * Math.PI);
    lateral.push(p);
  }
  details.push(createRibbon({
    name: 'Body_Lateral_Line',
    material: 'LateralLine',
    points: lateral,
    width: 0.005,
    normal: [0, 0, 1],
    extras: { anatomicalRegion: 'lateralLine', allowOpenBoundary: true },
  }));

  const nostrilFrame = surface.frame(0.925, Math.PI / 2 - 0.14);
  details.push(createUvSphere({
    name: 'Face_Nostril',
    material: 'MouthInterior',
    center: V3.add(nostrilFrame.position, V3.mul(nostrilFrame.normal, 0.022)),
    radius: 0.022,
    scale: [1, 0.68, 0.35],
    uSegments: 16,
    vSegments: 10,
    extras: { anatomicalRegion: 'nostril', allowOpenBoundary: false },
  }));
  return details;
}

function createMaterials(definition) {
  return {
    Skin: {
      name: 'Skin',
      kind: 'skin',
      baseColorFactor: [1, 1, 1, 1],
      baseColorTexture: 'body-albedo',
      normalTexture: 'body-normal',
      metallicRoughnessTexture: 'body-metallic-roughness',
      occlusionTexture: 'body-ao',
      metallicFactor: 1,
      roughnessFactor: 1,
      clearcoat: definition.surface.clearcoat,
      clearcoatRoughness: 0.14,
      iridescence: definition.surface.iridescence,
      subsurface: definition.surface.subsurface,
      alphaMode: 'OPAQUE',
      doubleSided: false,
    },
    FinMembrane: {
      name: 'FinMembrane',
      kind: 'fin',
      baseColorFactor: [1, 1, 1, 1],
      baseColorTexture: 'fin-albedo',
      normalTexture: 'fin-normal',
      metallicRoughnessTexture: 'fin-metallic-roughness',
      occlusionTexture: 'fin-ao',
      metallicFactor: 1,
      roughnessFactor: 1,
      clearcoat: 0.20,
      clearcoatRoughness: 0.22,
      iridescence: definition.surface.iridescence * 0.55,
      subsurface: 0.72,
      transmission: definition.surface.finTransmission,
      alphaMode: 'BLEND',
      doubleSided: true,
    },
    FinRay: {
      name: 'FinRay',
      kind: 'finRay',
      baseColorFactor: [...V3.mix(definition.palette.finDeep, definition.palette.fin, 0.72), 1],
      metallicFactor: 0.02,
      roughnessFactor: 0.38,
      clearcoat: 0.18,
      alphaMode: 'OPAQUE',
      doubleSided: false,
    },
    EyeTissue: {
      name: 'EyeTissue',
      kind: 'eyeTissue',
      baseColorFactor: [0.025, 0.040, 0.045, 1],
      metallicFactor: 0.0,
      roughnessFactor: 0.30,
      clearcoat: 0.46,
      clearcoatRoughness: 0.09,
      alphaMode: 'OPAQUE',
      doubleSided: false,
    },
    Iris: {
      name: 'Iris',
      kind: 'iris',
      baseColorFactor: [1, 1, 1, 1],
      baseColorTexture: 'eye-albedo',
      metallicFactor: 0.0,
      roughnessFactor: 0.29,
      clearcoat: 0.32,
      clearcoatRoughness: 0.08,
      alphaMode: 'OPAQUE',
      doubleSided: false,
    },
    Cornea: {
      name: 'Cornea',
      kind: 'cornea',
      baseColorFactor: [0.66, 0.92, 0.96, 0.12],
      metallicFactor: 0,
      roughnessFactor: 0.035,
      clearcoat: 1,
      clearcoatRoughness: 0.025,
      transmission: 0.92,
      alphaMode: 'BLEND',
      doubleSided: false,
    },
    MouthInterior: {
      name: 'MouthInterior',
      kind: 'mouth',
      baseColorFactor: [0.020, 0.018, 0.020, 1],
      metallicFactor: 0,
      roughnessFactor: 0.68,
      alphaMode: 'OPAQUE',
      doubleSided: true,
    },
    Lip: {
      name: 'Lip',
      kind: 'lip',
      baseColorFactor: [0.345, 0.125, 0.105, 1],
      metallicFactor: 0,
      roughnessFactor: 0.39,
      clearcoat: 0.34,
      clearcoatRoughness: 0.16,
      alphaMode: 'OPAQUE',
      doubleSided: true,
    },
    GillLine: {
      name: 'GillLine',
      kind: 'gill',
      baseColorFactor: [0.018, 0.170, 0.185, 0.34],
      metallicFactor: 0,
      roughnessFactor: 0.52,
      alphaMode: 'BLEND',
      doubleSided: true,
    },
    LateralLine: {
      name: 'LateralLine',
      kind: 'lateralLine',
      baseColorFactor: [0.035, 0.290, 0.295, 0.24],
      metallicFactor: 0,
      roughnessFactor: 0.48,
      alphaMode: 'BLEND',
      doubleSided: true,
    },
  };
}

export function buildFishAnatomy(definition, options = {}) {
  const quality = options.quality ?? definition.quality ?? 'high';
  const surface = createBodySurface(definition);
  return { surface, meshes: [buildBodyMesh(definition, surface, quality), buildPeduncle(definition, surface, quality)] };
}

export function buildFishAppendages(definition, options = {}) {
  const quality = options.quality ?? definition.quality ?? 'high';
  const surface = options.surface ?? createBodySurface(definition);
  return {
    meshes: [
      ...buildTail(definition, surface, quality),
      ...buildDorsalAndAnal(definition, surface, quality),
      ...buildPectoral(definition, surface, true, quality),
      ...buildPectoral(definition, surface, false, quality),
      ...buildPelvicFins(definition, surface, quality),
    ],
  };
}

export function buildFishFace(definition, options = {}) {
  const quality = options.quality ?? definition.quality ?? 'high';
  const surface = options.surface ?? createBodySurface(definition);
  return { meshes: [...buildEyes(definition, surface, quality), ...buildFaceDetails(definition, surface)] };
}

export function buildFishSurface(definition, options = {}) {
  const quality = options.quality ?? definition.quality ?? 'high';
  const textureSize = quality === 'high' ? [1024, 512] : [512, 256];
  const bodyTextures = generateBodyTextures(definition, textureSize[0], textureSize[1]);
  const finSize = quality === 'high' ? 512 : 256;
  const eyeSize = quality === 'high' ? 256 : 128;
  const finTextures = generateFinTextures(definition, finSize, finSize);
  const eyeTexture = generateEyeTexture(definition, eyeSize, eyeSize);
  return {
    textures: {
      'body-albedo': { ...bodyTextures.albedo, colorSpace: 'srgb' },
      'body-normal': { ...bodyTextures.normal, colorSpace: 'linear' },
      'body-metallic-roughness': { ...bodyTextures.metallicRoughness, colorSpace: 'linear' },
      'body-ao': { ...bodyTextures.ao, colorSpace: 'linear' },
      'fin-albedo': { ...finTextures.albedo, colorSpace: 'srgb' },
      'fin-normal': { ...finTextures.normal, colorSpace: 'linear' },
      'fin-metallic-roughness': { ...finTextures.metallicRoughness, colorSpace: 'linear' },
      'fin-ao': { ...finTextures.ao, colorSpace: 'linear' },
      'eye-albedo': { ...eyeTexture, colorSpace: 'srgb' },
    },
    materials: createMaterials(definition),
  };
}

export function composeFishModel(definition, { anatomy, appendages, face, surface } = {}) {
  const resolvedAnatomy = anatomy ?? buildFishAnatomy(definition);
  const bodySurface = resolvedAnatomy.surface ?? createBodySurface(definition);
  const resolvedAppendages = appendages ?? buildFishAppendages(definition, { surface: bodySurface });
  const resolvedFace = face ?? buildFishFace(definition, { surface: bodySurface });
  const resolvedSurface = surface ?? buildFishSurface(definition);
  const meshes = [...resolvedAnatomy.meshes, ...resolvedAppendages.meshes, ...resolvedFace.meshes];
  return {
    name: definition.name,
    definition,
    meshes,
    materials: resolvedSurface.materials,
    textures: resolvedSurface.textures,
    bounds: modelBounds(meshes),
    extras: {
      generator: 'NexusFactory procedural reef fish v1',
      seed: definition.seed,
      speciesFamily: definition.speciesFamily,
      tailProfile: definition.tailProfile,
      patternType: definition.patternType,
      paletteName: definition.paletteName,
      mouthProfile: definition.head.mouthProfile,
      eyeProfile: definition.eyeProfile,
    },
  };
}

export function buildFishModel(definition, options = {}) {
  const quality = options.quality ?? definition.quality ?? 'high';
  const anatomy = buildFishAnatomy(definition, { quality });
  const appendages = buildFishAppendages(definition, { quality, surface: anatomy.surface });
  const face = buildFishFace(definition, { quality, surface: anatomy.surface });
  const surface = buildFishSurface(definition, { quality });
  return composeFishModel(definition, { anatomy, appendages, face, surface });
}

export function createHeroDefinition(seed = 'azure-reef-hero-v2') {
  return createFishDefinition(seed, {
    name: 'Azure Gold Reef Fish',
    speciesFamily: 'oval',
    tailProfile: 'forked',
    patternType: 'bands',
    paletteName: 'azureGold',
    eyeProfile: 'amber',
    eyeScale: 0.93,
    patternStrength: 0.78,
    clearcoat: 0.62,
    iridescence: 0.34,
    quality: 'high',
  });
}
