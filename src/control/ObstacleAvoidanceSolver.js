import * as THREE from 'three';

export class ObstacleAvoidanceSolver {
  constructor({ lookAhead = 2.4, clearance = 0.65, strength = 1.8 } = {}) {
    this.lookAhead = lookAhead;
    this.clearance = clearance;
    this.strength = strength;
  }

  solve(position, desiredDirection, obstacles, output = new THREE.Vector3()) {
    output.set(0, 0, 0);
    for (const obstacle of obstacles) {
      const offset = obstacle.position.clone().sub(position);
      const forwardDistance = offset.dot(desiredDirection);
      if (forwardDistance <= 0 || forwardDistance > this.lookAhead) continue;
      const nearest = position.clone().addScaledVector(desiredDirection, forwardDistance);
      const away = nearest.clone().sub(obstacle.position);
      const safeRadius = (obstacle.userData.obstacleRadius ?? 0.8) + this.clearance;
      const lateralDistance = away.length();
      if (lateralDistance >= safeRadius) continue;
      if (lateralDistance < 0.001) away.set(-desiredDirection.z, 0.35, desiredDirection.x);
      away.normalize();
      const urgency = (1 - forwardDistance / this.lookAhead) * (1 - lateralDistance / safeRadius);
      output.addScaledVector(away, urgency * this.strength);
    }
    return output;
  }
}
