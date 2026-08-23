import * as THREE from 'three';

export class ReefService {
  constructor(scene, reefRenderer) {
    this.bounds = new THREE.Vector3(9.2, 4.5, 4.4);
    this.visuals = reefRenderer.create(scene);
  }

  update(delta, elapsed) {
    this.visuals.particles.rotation.y += delta * 0.006;
    this.visuals.particles.position.y = Math.sin(elapsed * 0.15) * 0.08;
  }
}
