import * as THREE from 'three';
import { createSeededRandom } from './FishGenome.js';

export class FishBehaviour {
  constructor(random = Math.random, physics = null, fish = null) {
    this.physics = physics;
    const seeded = createSeededRandom(fish?.seed ?? `legacy:${random()}`);
    this.velocity = new THREE.Vector3(
      seeded() > 0.5 ? 0.35 : -0.35,
      (seeded() - 0.5) * 0.08,
      (seeded() - 0.5) * 0.18
    );
    this.phase = seeded() * Math.PI * 2;
    this.speed = 0.65 + seeded() * 0.55;
    this.preferredDepth = -1.2 + seeded() * 2.0;
    this.schooling = 0.12 + seeded() * 0.22;
    this.avoidance = 0.9 + seeded() * 0.7;
  }

  update(object, delta, elapsed, bounds, neighbors = []) {
    this.phase += delta * this.speed;
    if (this.physics) {
      const separation = new THREE.Vector3();
      const school = new THREE.Vector3();
      let nearby = 0;
      for (const neighbor of neighbors) {
        if (neighbor === object) continue;
        const offset = object.position.clone().sub(neighbor.position);
        const distance = offset.length();
        if (distance > 0 && distance < 1.35) {
          separation.addScaledVector(offset.normalize(), (1.35 - distance) / 1.35);
        }
        if (distance > 0 && distance < 3.2) {
          school.add(neighbor.position);
          nearby += 1;
        }
      }
      if (nearby) school.multiplyScalar(1 / nearby).sub(object.position).multiplyScalar(this.schooling);
      separation.multiplyScalar(this.avoidance);
      const depthCorrection = (this.preferredDepth - object.position.y) * 0.12;
      this.physics.steer(object.userData.fishId, {
        x: this.velocity.x * this.speed + separation.x + school.x,
        y: Math.sin(elapsed * 1.35 + this.phase) * 0.24 + depthCorrection + separation.y,
        z: this.velocity.z * this.speed + Math.sin(elapsed * 0.7 + this.phase) * 0.12 + separation.z + school.z
      });
      const tail = object.userData.tailMesh;
      if (tail) tail.rotation.y = Math.sin(elapsed * 7 * this.speed + this.phase) * 0.32;
      return;
    }
    object.position.addScaledVector(this.velocity, delta * this.speed);
    object.position.y += Math.sin(elapsed * 1.35 + this.phase) * delta * 0.06;
    object.position.z += Math.sin(elapsed * 0.7 + this.phase) * delta * 0.025;

    const half = bounds.clone().multiplyScalar(0.5);
    if (Math.abs(object.position.x) > half.x) this.velocity.x *= -1;
    if (object.position.y < -half.y + 0.55 || object.position.y > half.y - 0.45) this.velocity.y *= -1;
    if (Math.abs(object.position.z) > half.z) this.velocity.z *= -1;

    object.position.x = THREE.MathUtils.clamp(object.position.x, -half.x, half.x);
    object.position.y = THREE.MathUtils.clamp(object.position.y, -half.y + 0.5, half.y - 0.4);
    object.position.z = THREE.MathUtils.clamp(object.position.z, -half.z, half.z);

    object.rotation.y = this.velocity.x >= 0 ? 0 : Math.PI;
    const tail = object.userData.tailMesh;
    if (tail) tail.rotation.y = Math.sin(elapsed * 7 * this.speed + this.phase) * 0.32;
  }
}
