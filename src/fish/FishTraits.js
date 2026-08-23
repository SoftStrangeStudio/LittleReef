export const FishTraits = Object.freeze({
  bodies: ['round', 'long', 'tall'],
  colors: [0x55b7d8, 0xf5c85b, 0xef7e72, 0x74d3b0, 0x9270d6],
  patterns: ['none', 'stripe', 'spots'],
  tails: ['fan', 'fork', 'long'],
  eyes: [0x101820, 0x3489c9]
});

export function randomTrait(values, random = Math.random) {
  return values[Math.floor(random() * values.length)];
}
