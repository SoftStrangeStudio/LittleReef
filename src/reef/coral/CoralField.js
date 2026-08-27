import * as THREE from 'three';
import { CORAL_BY_ID } from './CoralCatalog.js';
import { createCoralPlacements } from './CoralPlacement.js';

export class CoralField {
  static create({ library, config, floorY = -2.25 }) {
    const placements = createCoralPlacements({
      worldSeed: config.worldSeed,
      coralIds: config.coralIds,
      coralCount: config.coralCount,
      coralScaleRange: config.coralScaleRange,
      floorY,
    });
    const group = new THREE.Group();
    group.name = 'loaded-coral-field';
    const obstacles = [];

    for (const placement of placements) {
      const instance = library.clone(placement.assetId);
      instance.name = placement.id;
      instance.position.fromArray(placement.position);
      instance.rotation.set(0, placement.rotationY, placement.tiltZ);
      instance.scale.setScalar(placement.scale);
      instance.userData.coralAssetId = placement.assetId;
      instance.userData.coralPlacementId = placement.id;
      group.add(instance);

      const entry = CORAL_BY_ID.get(placement.assetId);
      for (const proxy of entry.obstacleProxies.slice(0, 3)) {
        const offset = new THREE.Vector3(...proxy.offset)
          .multiplyScalar(placement.scale)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), placement.rotationY);
        const obstacle = new THREE.Object3D();
        obstacle.name = `${placement.id}-obstacle`;
        obstacle.position.fromArray(placement.position).add(offset);
        obstacle.userData.obstacleRadius = proxy.radius * placement.scale;
        obstacle.userData.coralAssetId = placement.assetId;
        obstacle.userData.coralPlacementId = placement.id;
        obstacles.push(obstacle);
      }
    }

    return new CoralField({ group, obstacles, placements, library });
  }

  constructor({ group, obstacles, placements, library }) {
    this.group = group;
    this.obstacles = obstacles;
    this.placements = placements;
    this.library = library;
    this.disposed = false;
  }

  dispose() {
    if (this.disposed) return;
    this.group.removeFromParent();
    this.group.clear();
    this.obstacles.length = 0;
    this.library.dispose();
    this.disposed = true;
  }
}
