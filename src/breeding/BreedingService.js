import { breedGenome, traitsFromGenome } from '../fish/FishGenome.js';

export class BreedingService {
  constructor(fishService, random = Math.random) {
    this.fishService = fishService;
    this.random = random;
  }

  breed(parentA, parentB) {
    if (!parentA || !parentB || parentA.id === parentB.id) return null;
    const childSeed = this.fishService.childSeed(parentA, parentB);
    const genome = breedGenome(parentA.genome, parentB.genome, childSeed);

    return this.fishService.createFish({
      seed: childSeed,
      generation: Math.max(parentA.generation, parentB.generation) + 1,
      parents: [parentA.id, parentB.id],
      genome,
      traits: traitsFromGenome(genome)
    });
  }
}
