import * as THREE from 'three';

export class SwimVolume {
  constructor(bounds, margin = 0.75) {
    this.half = bounds.clone().multiplyScalar(0.5);
    this.margin = margin;
    this.minimum = new THREE.Vector3(-this.half.x + margin, -this.half.y + margin, -this.half.z + margin);
    this.maximum = new THREE.Vector3(this.half.x - margin, this.half.y - margin, this.half.z - margin);
  }

  clamp(target, output = new THREE.Vector3()) {
    return output.copy(target).clamp(this.minimum, this.maximum);
  }

  correction(position, distance = 1.6, output = new THREE.Vector3()) {
    output.set(0, 0, 0);
    for (const axis of ['x', 'y', 'z']) {
      const low = position[axis] - this.minimum[axis];
      const high = this.maximum[axis] - position[axis];
      if (low < distance) output[axis] += (distance - low) / distance;
      if (high < distance) output[axis] -= (distance - high) / distance;
    }
    return output;
  }
}
