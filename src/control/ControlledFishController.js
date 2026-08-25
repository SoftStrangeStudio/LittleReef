import * as THREE from 'three';
import { SwimVolume } from './SwimVolume.js';
import { RoutePlanner3D } from './RoutePlanner3D.js';
import { ObstacleAvoidanceSolver } from './ObstacleAvoidanceSolver.js';

export class ControlledFishController {
  constructor({ fishId, object, physics, camera, bounds, obstacles = [] }) {
    this.fishId = fishId;
    this.object = object;
    this.physics = physics;
    this.camera = camera;
    this.obstacles = obstacles;
    this.pointer = new THREE.Vector2(0, 0);
    this.raycaster = new THREE.Raycaster();
    this.targetPlane = new THREE.Plane();
    this.target = object.position.clone().add(new THREE.Vector3(2, 0, 0));
    this.route = [this.target.clone()];
    this.routeIndex = 0;
    this.replanElapsed = 0;
    this.depthOffset = 0;
    this.swimVolume = new SwimVolume(bounds);
    this.routePlanner = new RoutePlanner3D(this.swimVolume);
    this.avoidance = new ObstacleAvoidanceSolver();
    this.object.userData.controlled = true;
    this.lastDesiredVelocity = new THREE.Vector3();
  }

  setPointer(x, y) {
    this.pointer.set(THREE.MathUtils.clamp(x, -1, 1), THREE.MathUtils.clamp(y, -1, 1));
  }

  adjustDepth(amount) {
    this.depthOffset = THREE.MathUtils.clamp(this.depthOffset + amount, -2.5, 2.5);
  }

  update(delta) {
    this.#resolveTarget();
    this.replanElapsed += delta;
    if (this.replanElapsed >= 0.18 || this.route.length === 0) {
      this.route = this.routePlanner.plan(this.object.position, this.target, this.obstacles);
      this.routeIndex = 0;
      this.replanElapsed = 0;
    }

    let waypoint = this.route[this.routeIndex] ?? this.target;
    if (this.object.position.distanceToSquared(waypoint) < 0.42 * 0.42 && this.routeIndex < this.route.length - 1) {
      this.routeIndex += 1;
      waypoint = this.route[this.routeIndex];
    }
    const toWaypoint = waypoint.clone().sub(this.object.position);
    const distance = toWaypoint.length();
    const direction = distance > 0.001 ? toWaypoint.multiplyScalar(1 / distance) : new THREE.Vector3(1, 0, 0);
    const avoidance = this.avoidance.solve(this.object.position, direction, this.obstacles);
    const boundary = this.swimVolume.correction(this.object.position);
    direction.addScaledVector(avoidance, 0.9).addScaledVector(boundary, 1.15).normalize();
    const arrival = THREE.MathUtils.clamp(distance / 1.5, 0.24, 1);
    const targetSpeed = 1.28 * arrival;
    this.lastDesiredVelocity.copy(direction).multiplyScalar(targetSpeed);
    this.physics.steer(this.fishId, this.lastDesiredVelocity, 2.2);
    return this.snapshot();
  }

  #resolveTarget() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const normal = this.camera.getWorldDirection(new THREE.Vector3());
    const planePoint = this.object.position.clone().addScaledVector(normal, 4.5);
    this.targetPlane.setFromNormalAndCoplanarPoint(normal, planePoint);
    const hit = this.raycaster.ray.intersectPlane(this.targetPlane, new THREE.Vector3());
    if (hit) {
      hit.y += this.depthOffset;
      this.swimVolume.clamp(hit, this.target);
    }
  }

  snapshot() {
    return {
      fishId: this.fishId,
      target: this.target.toArray(),
      route: this.route.map((point) => point.toArray()),
      routeIndex: this.routeIndex,
      desiredVelocity: this.lastDesiredVelocity.toArray()
    };
  }
}
