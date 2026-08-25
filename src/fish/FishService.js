import { FishBehaviour } from './FishBehaviour.js';
import { breedGenome, createStarterGenome, deriveSeed, traitsFromGenome } from './FishGenome.js';

export class FishService {
  constructor(random = Math.random, physics = null, worldSeed = 'little-reef-world') {
    this.random = random;
    this.physics = physics;
    this.worldSeed = worldSeed;
    this.fish = new Map();
    this.behaviours = new Map();
    this.nextId = 1;
  }

  createStarter() {
    const seed = deriveSeed(this.worldSeed, 'starter', this.nextId);
    const genome = createStarterGenome(seed);
    return this.createFish({
      seed,
      generation: 0,
      parents: [],
      genome,
      traits: traitsFromGenome(genome)
    });
  }

  createFish({ generation, parents, traits, genome, seed }) {
    const id = `fish-${String(this.nextId++).padStart(3, '0')}`;
    const resolvedSeed = seed ?? deriveSeed(this.worldSeed, 'fish', id);
    const resolvedGenome = genome ?? createStarterGenome(resolvedSeed);
    const fish = {
      id,
      name: `Fish ${id.slice(-3)}`,
      seed: resolvedSeed,
      genome: resolvedGenome,
      phenotypeKey: resolvedGenome.phenotypeKey,
      generation,
      parents,
      traits: traits ?? traitsFromGenome(resolvedGenome)
    };
    this.fish.set(id, fish);
    this.behaviours.set(id, new FishBehaviour(this.random, this.physics, fish));
    return fish;
  }

  get(id) { return this.fish.get(id) ?? null; }
  all() { return [...this.fish.values()]; }
  behaviour(id) { return this.behaviours.get(id); }
  childSeed(parentA, parentB) { return deriveSeed(this.worldSeed, 'offspring', this.nextId, parentA.seed, parentB.seed); }
}
