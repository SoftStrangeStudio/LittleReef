import * as THREE from 'three';

const segmentDistanceSquared = (start, end, point) => {
  const segment = end.clone().sub(start);
  const lengthSquared = segment.lengthSq();
  if (lengthSquared === 0) return point.distanceToSquared(start);
  const amount = THREE.MathUtils.clamp(point.clone().sub(start).dot(segment) / lengthSquared, 0, 1);
  return point.distanceToSquared(start.clone().addScaledVector(segment, amount));
};

export class RoutePlanner3D {
  constructor(swimVolume, clearance = 0.8) {
    this.swimVolume = swimVolume;
    this.clearance = clearance;
  }

  plan(start, requestedTarget, obstacles) {
    const target = this.swimVolume.clamp(requestedTarget);
    const blocking = obstacles
      .map((obstacle) => ({
        obstacle,
        radius: (obstacle.userData.obstacleRadius ?? 0.8) + this.clearance,
        distanceSquared: segmentDistanceSquared(start, target, obstacle.position)
      }))
      .filter(({ radius, distanceSquared }) => distanceSquared < radius * radius)
      .sort((left, right) => start.distanceToSquared(left.obstacle.position) - start.distanceToSquared(right.obstacle.position))[0];

    if (!blocking) return [target];
    const travel = target.clone().sub(start).normalize();
    let side = new THREE.Vector3().crossVectors(travel, new THREE.Vector3(0, 1, 0));
    if (side.lengthSq() < 0.01) side.set(1, 0, 0);
    side.normalize();
    const first = this.swimVolume.clamp(blocking.obstacle.position.clone().addScaledVector(side, blocking.radius));
    const second = this.swimVolume.clamp(blocking.obstacle.position.clone().addScaledVector(side, -blocking.radius));
    const waypoint = first.distanceToSquared(start) + first.distanceToSquared(target)
      <= second.distanceToSquared(start) + second.distanceToSquared(target) ? first : second;
    waypoint.y = this.swimVolume.clamp(new THREE.Vector3(0, target.y, 0)).y;
    return [waypoint, target];
  }
}
