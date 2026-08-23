import { FishTraits, randomTrait } from '../fish/FishTraits.js';

export class BreedingService {
  constructor(fishService, random = Math.random) {
    this.fishService = fishService;
    this.random = random;
  }

  breed(parentA, parentB) {
    if (!parentA || !parentB || parentA.id === parentB.id) return null;
    const inherit = (key) => (this.random() < 0.5 ? parentA.traits[key] : parentB.traits[key]);
    const traits = {
      body: inherit('body'),
      baseColor: inherit('baseColor'),
      pattern: inherit('pattern'),
      patternColor: inherit('patternColor'),
      tail: inherit('tail'),
      eyes: inherit('eyes')
    };

    if (this.random() < 0.08) {
      const mutation = randomTrait(['body', 'baseColor', 'pattern', 'tail'], this.random);
      const source = mutation === 'body' ? FishTraits.bodies
        : mutation === 'baseColor' ? FishTraits.colors
        : mutation === 'pattern' ? FishTraits.patterns
        : FishTraits.tails;
      traits[mutation] = randomTrait(source, this.random);
    }

    return this.fishService.createFish({
      generation: Math.max(parentA.generation, parentB.generation) + 1,
      parents: [parentA.id, parentB.id],
      traits
    });
  }
}
