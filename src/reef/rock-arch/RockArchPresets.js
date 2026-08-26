const base = {
  span: 5.25,
  height: 3.7,
  baseY: 0.86,
  baseLean: 0.22,
  baseRise: 0.26,
  apexApproach: 1.2,
  shoulderRise: 0.78,
  baseHandle: 0.58,
  footExitHandle: 0.42,
  pillarEntryHandle: 0.72,
  pillarExitHandle: 0.7,
  crownEntryHandle: 0.74,
  apexHandle: 0.86,
  pillarTangentX: 0.18,
  pillarTangentY: 1,
  shoulderTangentX: 0.82,
  shoulderTangentY: 0.62,
  sectionCount: 41,
  sectionSides: 12,
  baseRadius: 1.2,
  shoulderRadius: 0.78,
  apexRadius: 0.84,
  depth: 0.95,
  strataCount: 7,
  grooveDepth: 0.1,
  grooveWidth: 0.065,
  slabOffset: 0.075,
  silhouetteAmplitude: 0.055,
  strataAmplitude: 0.055,
  facetAmplitude: 0.075,
  depthAmplitude: 0.06,
  footFlatten: 0.2,
  charcoal: 0.15,
  materialVariation: 0.032,
  noise: {
    silhouette: { octaves: 3, frequency: 1.15, lacunarity: 2, gain: 0.48 },
    strata: { octaves: 4, frequency: 2, lacunarity: 2.05, gain: 0.5 },
    facet: { octaves: 5, frequency: 2.6, lacunarity: 2.1, gain: 0.52, ridged: true },
    depth: { octaves: 3, frequency: 1.7, lacunarity: 2, gain: 0.47 },
  },
};

function preset(id, name, seed, intent, overrides = {}) {
  return {
    id,
    name,
    seed,
    intent,
    parameters: {
      ...base,
      ...overrides,
      seed,
      noise: {
        silhouette: { ...base.noise.silhouette, ...overrides.noise?.silhouette },
        strata: { ...base.noise.strata, ...overrides.noise?.strata },
        facet: { ...base.noise.facet, ...overrides.noise?.facet },
        depth: { ...base.noise.depth, ...overrides.noise?.depth },
      },
    },
  };
}

export const ARCH_PRESETS = Object.freeze([
  preset('01-balanced-stack', 'Balanced Stack', 51001, 'Neutral layered landmark.'),
  preset('02-broad-foundation', 'Broad Foundation', 51002, 'Wider grounded feet and heavier pillars.', {
    span: 5.45, baseRadius: 1.34, shoulderRadius: 0.8, height: 3.62, slabOffset: 0.09,
  }),
  preset('03-tall-gateway', 'Tall Gateway', 51003, 'Taller fish opening and sharper peak.', {
    height: 4.05, apexApproach: 1.06, apexRadius: 0.76, baseRadius: 1.16, shoulderRise: 0.81,
    apexHandle: 0.72, shoulderTangentX: 0.88,
  }),
  preset('04-capstone-heavy', 'Capstone Heavy', 51004, 'A stronger bounded upper bridge.', {
    apexRadius: 0.96, shoulderRadius: 0.84, apexApproach: 1.3, grooveDepth: 0.075,
    crownEntryHandle: 0.88, apexHandle: 1.02,
  }),
  preset('05-broad-strata', 'Broad Strata', 51005, 'Fewer thick horizontal stone layers.', {
    strataCount: 5, grooveWidth: 0.08, grooveDepth: 0.12, slabOffset: 0.12, facetAmplitude: 0.06,
  }),
  preset('06-deep-seams', 'Deep Seams', 51006, 'Seven layers with deeper recesses.', {
    strataCount: 7, grooveDepth: 0.16, grooveWidth: 0.07, slabOffset: 0.105, strataAmplitude: 0.075,
  }),
  preset('07-weathered-facets', 'Weathered Facets', 51007, 'Stronger multi-octave surface erosion.', {
    facetAmplitude: 0.13, silhouetteAmplitude: 0.07,
    noise: { facet: { octaves: 6, frequency: 3.1, gain: 0.54, ridged: true } },
  }),
  preset('08-soft-eroded', 'Soft Eroded', 51008, 'Lower-frequency rounded weathering.', {
    sectionSides: 14, facetAmplitude: 0.055, silhouetteAmplitude: 0.075, grooveDepth: 0.08,
    noise: { facet: { octaves: 3, frequency: 1.65, gain: 0.42, ridged: false } },
  }),
  preset('09-rugged-blocks', 'Rugged Blocks', 51009, 'Chunkier facets and staggered slabs.', {
    sectionSides: 10, strataCount: 6, slabOffset: 0.14, facetAmplitude: 0.12, strataAmplitude: 0.09,
    baseLean: 0.3, apexApproach: 1.2, pillarTangentX: 0.12,
    noise: { strata: { octaves: 5, frequency: 2.4, gain: 0.55 } },
  }),
  preset('10-compact-reef', 'Compact Reef', 51010, 'Tank-friendly width with strong clearance.', {
    span: 4.85, height: 3.55, baseRadius: 1.12, shoulderRadius: 0.74, apexRadius: 0.72, depth: 0.88,
  }),
]);

export function getArchPreset(id) {
  const selected = ARCH_PRESETS.find((entry) => entry.id === id);
  if (!selected) throw new Error(`Unknown arch preset: ${id}`);
  return structuredClone(selected);
}
