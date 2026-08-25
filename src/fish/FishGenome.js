import { FishTraits } from './FishTraits.js';

const bodyFamilies = ['oval', 'torpedo', 'disc', 'boxy'];
const tailProfiles = ['rounded', 'forked', 'fan'];
const patternTypes = ['solid', 'bands', 'spots', 'mottled'];
const palettes = ['azureGold', 'coralSilver', 'emeraldPearl', 'violetSun'];
const eyeProfiles = ['dark', 'amber'];

export const hashSeed = (value) => {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

export const deriveSeed = (...parts) => parts.map((part) => String(part)).join(':');

export const createSeededRandom = (seed) => {
  let state = hashSeed(seed) || 0x6d2b79f5;
  return () => {
    state = Math.imul(state ^ (state >>> 16), 2246822507);
    state = Math.imul(state ^ (state >>> 13), 3266489909);
    state ^= state >>> 16;
    return (state >>> 0) / 4294967296;
  };
};

const pick = (values, random) => values[Math.floor(random() * values.length)];
const between = (random, min, max) => min + (max - min) * random();

const phenotypeKeyFor = (genome) => `phenotype-${hashSeed(JSON.stringify(genome)).toString(16).padStart(8, '0')}`;

const finalize = (genome) => ({ ...genome, phenotypeKey: phenotypeKeyFor(genome) });

export const createStarterGenome = (seed) => {
  const random = createSeededRandom(deriveSeed(seed, 'starter'));
  return finalize({
    bodyFamily: pick(bodyFamilies, random),
    tailProfile: pick(tailProfiles, random),
    patternType: pick(patternTypes, random),
    palette: pick(palettes, random),
    eyeProfile: pick(eyeProfiles, random),
    mouthProfile: 'terminal',
    size: between(random, 0.42, 0.62),
    lengthScale: between(random, 0.9, 1.18),
    heightScale: between(random, 0.86, 1.12),
    depthScale: between(random, 0.86, 1.08),
    tailScale: between(random, 0.86, 1.16),
    finScale: between(random, 0.86, 1.14),
    patternStrength: between(random, 0.45, 0.95),
    mutation: null
  });
};

const categorical = ['bodyFamily', 'tailProfile', 'patternType', 'palette', 'eyeProfile', 'mouthProfile'];
const numeric = ['size', 'lengthScale', 'heightScale', 'depthScale', 'tailScale', 'finScale', 'patternStrength'];

export const breedGenome = (parentA, parentB, childSeed) => {
  const inheritance = createSeededRandom(deriveSeed(childSeed, 'inheritance'));
  const mutationRandom = createSeededRandom(deriveSeed(childSeed, 'mutation'));
  const genome = {};
  for (const key of categorical) genome[key] = inheritance() < 0.5 ? parentA[key] : parentB[key];
  for (const key of numeric) {
    const average = (Number(parentA[key]) + Number(parentB[key])) * 0.5;
    const jitter = (inheritance() - 0.5) * 0.08;
    genome[key] = Math.max(0.2, average + jitter);
  }
  genome.mutation = null;
  if (mutationRandom() < 0.08) {
    const mutation = pick(['bodyFamily', 'tailProfile', 'patternType', 'palette'], mutationRandom);
    const values = mutation === 'bodyFamily' ? bodyFamilies
      : mutation === 'tailProfile' ? tailProfiles
        : mutation === 'patternType' ? patternTypes : palettes;
    genome[mutation] = pick(values, mutationRandom);
    genome.mutation = `${mutation}:${genome[mutation]}`;
  }
  return finalize(genome);
};

const paletteColor = {
  azureGold: 0x55b7d8,
  coralSilver: 0xef7e72,
  emeraldPearl: 0x74d3b0,
  violetSun: 0x9270d6
};

export const traitsFromGenome = (genome) => ({
  body: genome.bodyFamily === 'torpedo' ? 'long' : genome.bodyFamily === 'disc' ? 'tall' : 'round',
  baseColor: paletteColor[genome.palette] ?? FishTraits.colors[0],
  pattern: genome.patternType === 'bands' ? 'stripe' : genome.patternType === 'solid' ? 'none' : 'spots',
  patternColor: genome.palette === 'azureGold' ? 0xf5c85b : 0xffffff,
  tail: genome.tailProfile === 'forked' ? 'fork' : genome.tailProfile === 'fan' ? 'long' : 'fan',
  eyes: genome.eyeProfile === 'amber' ? 0xd8a638 : FishTraits.eyes[0]
});

