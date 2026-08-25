import { FishTraits, randomTrait } from './FishTraits.js';
import { FishBehaviour } from './FishBehaviour.js';

export class FishService {
  constructor(random = Math.random, physics = null) {
    this.random = random;
    this.physics = physics;
    this.fish = new Map();
    this.behaviours = new Map();
    this.nextId = 1;
  }

  createStarter() {
    return this.createFish({
      generation: 0,
      parents: [],
      traits: {
        body: randomTrait(FishTraits.bodies, this.random),
        baseColor: randomTrait(FishTraits.colors, this.random),
        pattern: randomTrait(FishTraits.patterns, this.random),
        patternColor: randomTrait(FishTraits.colors, this.random),
        tail: randomTrait(FishTraits.tails, this.random),
        eyes: randomTrait(FishTraits.eyes, this.random)
      }
    });
  }

  createFish({ generation, parents, traits }) {
    const id = `fish-${String(this.nextId++).padStart(3, '0')}`;
    const fish = { id, name: `Fish ${id.slice(-3)}`, generation, parents, traits };
    this.fish.set(id, fish);
    this.behaviours.set(id, new FishBehaviour(this.random, this.physics));
    return fish;
  }

  get(id) { return this.fish.get(id) ?? null; }
  all() { return [...this.fish.values()]; }
  behaviour(id) { return this.behaviours.get(id); }
}
