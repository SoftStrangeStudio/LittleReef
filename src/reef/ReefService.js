import * as THREE from 'three';

export const DEFAULT_REEF_CONFIG = Object.freeze({
  worldSeed: 'little-reef-main-v1',
  rockArchPreset: '01-balanced-stack',
  coralIds: Object.freeze(['01', '03', '05', '07', '09']),
  coralCount: 18,
  coralScaleRange: Object.freeze([0.35, 0.52]),
});

export class ReefService {
  constructor(scene, reefRenderer, config = DEFAULT_REEF_CONFIG) {
    this.bounds = new THREE.Vector3(16, 7, 14);
    this.config = { ...DEFAULT_REEF_CONFIG, ...config };
    this.visuals = reefRenderer.create(scene, this.config);
  }

  update(delta, elapsed) {
    this.visuals.particles.rotation.y += delta * 0.012;
    this.visuals.particles.position.y = Math.sin(elapsed * 0.15) * 0.08;
  }

  dispose() {
    const rockArch = this.visuals.landmarks?.rockArch;
    const coralField = this.visuals.landmarks?.coralField;
    const ownedObstacles = new Set([
      ...(rockArch?.obstacles ?? []),
      ...(coralField?.obstacles ?? []),
    ]);
    for (let index = this.visuals.obstacles.length - 1; index >= 0; index -= 1) {
      if (ownedObstacles.has(this.visuals.obstacles[index])) this.visuals.obstacles.splice(index, 1);
    }
    coralField?.dispose();
    rockArch?.dispose();
  }
}
