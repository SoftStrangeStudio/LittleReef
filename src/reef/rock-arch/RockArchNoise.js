function mix32(value) {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

function labelHash(label) {
  let hash = 2166136261;
  for (const character of label) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function fade(value) {
  return value * value * (3 - 2 * value);
}

export function createValueNoise1D(seed, label = 'default') {
  const streamSeed = mix32((seed >>> 0) ^ labelHash(label));
  const lattice = (index) => {
    const hash = mix32(streamSeed ^ Math.imul(index | 0, 0x9e3779b1));
    return (hash / 0xffffffff) * 2 - 1;
  };
  return (coordinate) => {
    const lower = Math.floor(coordinate);
    const fraction = coordinate - lower;
    const weight = fade(fraction);
    return lattice(lower) * (1 - weight) + lattice(lower + 1) * weight;
  };
}

export function createFbm1D(seed, label, options = {}) {
  const {
    octaves = 4,
    frequency = 1,
    lacunarity = 2,
    gain = 0.5,
    ridged = false,
  } = options;
  const noise = createValueNoise1D(seed, label);
  return (coordinate) => {
    let amplitude = 1;
    let currentFrequency = frequency;
    let total = 0;
    let normalization = 0;
    for (let octave = 0; octave < octaves; octave += 1) {
      let value = noise(coordinate * currentFrequency + octave * 17.731);
      if (ridged) value = 1 - Math.abs(value);
      total += value * amplitude;
      normalization += amplitude;
      currentFrequency *= lacunarity;
      amplitude *= gain;
    }
    const normalized = normalization === 0 ? 0 : total / normalization;
    return ridged ? normalized * 2 - 1 : normalized;
  };
}

export function createSymmetricDistortion(seed, noiseParameters) {
  const silhouette = createFbm1D(seed, 'silhouette', noiseParameters.silhouette);
  const strata = createFbm1D(seed, 'strata', noiseParameters.strata);
  const facet = createFbm1D(seed, 'facet', noiseParameters.facet);
  const depth = createFbm1D(seed, 'depth', noiseParameters.depth);
  return {
    silhouette: (coordinate) => silhouette(coordinate + 0.137),
    strata: (coordinate) => strata(coordinate + 3.271),
    facet: (coordinate, side) => facet(coordinate + side * 1.913),
    depth: (coordinate, side) => depth(coordinate + side * 2.417),
  };
}
