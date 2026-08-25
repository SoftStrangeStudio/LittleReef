const goal = (id, label, current, target) => ({ id, label, current, target, complete: current >= target });

export class GameStateService {
  constructor() {
    this.state = 'reef';
    this.discovered = {
      bodies: new Set(),
      palettes: new Set(),
      patterns: new Set(),
      tails: new Set()
    };
    this.breedCount = 0;
  }

  enter(state) { this.state = state; return this.snapshot(); }

  recordFish(fish) {
    const genome = fish.genome ?? {};
    const discovered = [
      ['bodies', genome.bodyFamily ?? fish.traits?.body],
      ['palettes', genome.palette ?? fish.traits?.baseColor],
      ['patterns', genome.patternType ?? fish.traits?.pattern],
      ['tails', genome.tailProfile ?? fish.traits?.tail]
    ];
    for (const [key, value] of discovered) if (value != null) this.discovered[key].add(value);
    return this.snapshot();
  }

  recordBreed(fish) {
    this.breedCount += 1;
    this.recordFish(fish);
    this.state = 'offspring-reveal';
    return this.snapshot();
  }

  snapshot() {
    const goals = [
      goal('body-families', 'Discover body families', this.discovered.bodies.size, 3),
      goal('pattern-discovery', 'Discover patterns', this.discovered.patterns.size, 3),
      goal('first-breed', 'Breed your first offspring', this.breedCount, 1),
      goal('reef-population', 'Maintain a healthy reef', this.discovered.bodies.size + this.breedCount, 4)
    ];
    return {
      state: this.state,
      breedCount: this.breedCount,
      discovered: Object.fromEntries(Object.entries(this.discovered).map(([key, values]) => [key, [...values]])),
      goals,
      completedGoals: goals.filter((item) => item.complete).map((item) => item.id)
    };
  }
}
