import * as CANNON from 'cannon-es';

const wall = (world, position, halfExtents) => {
  const body = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC });
  body.addShape(new CANNON.Box(new CANNON.Vec3(...halfExtents)));
  body.position.set(...position);
  body.material = new CANNON.Material('reef-wall');
  world.addBody(body);
};

export class FishPhysics {
  constructor(bounds, onCollision = null) {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -0.18, 0) });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    this.bodies = new Map();
    this.obstacleBodies = [];
    this.collisionsByFish = new Map();
    this.collisions = 0;
    this.onCollision = onCollision;
    this.world.defaultContactMaterial.friction = 0.18;
    this.world.defaultContactMaterial.restitution = 0.42;
    const half = bounds.clone().multiplyScalar(0.5);
    wall(this.world, [0, -half.y - 0.35, 0], [half.x + 1, 0.35, half.z + 1]);
    wall(this.world, [0, half.y + 0.35, 0], [half.x + 1, 0.35, half.z + 1]);
    wall(this.world, [-half.x - 0.35, 0, 0], [0.35, half.y + 1, half.z + 1]);
    wall(this.world, [half.x + 0.35, 0, 0], [0.35, half.y + 1, half.z + 1]);
    wall(this.world, [0, 0, -half.z - 0.35], [half.x + 1, half.y + 1, 0.35]);
    wall(this.world, [0, 0, half.z + 0.35], [half.x + 1, half.y + 1, 0.35]);
  }

  get bodyCount() {
    return this.bodies.size;
  }

  addFish(id, position, radius = 0.55) {
    if (this.bodies.has(id)) return this.bodies.get(id);
    const body = new CANNON.Body({
      mass: 0.55,
      material: new CANNON.Material('fish'),
      linearDamping: 0.42,
      angularDamping: 0.9,
      allowSleep: false
    });
    body.addShape(new CANNON.Sphere(Math.max(0.22, radius)));
    body.position.set(position.x, position.y, position.z);
    this.collisionsByFish.set(id, 0);
    body.addEventListener('collide', () => {
      this.collisions += 1;
      this.collisionsByFish.set(id, (this.collisionsByFish.get(id) ?? 0) + 1);
      this.onCollision?.();
    });
    this.world.addBody(body);
    this.bodies.set(id, body);
    return body;
  }

  collisionCount(id) {
    return this.collisionsByFish.get(id) ?? 0;
  }

  addObstacle(object) {
    const radius = Math.max(0.2, object.userData.obstacleRadius ?? 0.8);
    const body = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, material: new CANNON.Material('reef-rock') });
    body.addShape(new CANNON.Sphere(radius));
    body.position.set(object.position.x, object.position.y, object.position.z);
    this.world.addBody(body);
    this.obstacleBodies.push(body);
    return body;
  }

  steer(id, targetVelocity, gain = 1.35) {
    const body = this.bodies.get(id);
    if (!body) return;
    const force = new CANNON.Vec3(
      (targetVelocity.x - body.velocity.x) * gain,
      (targetVelocity.y - body.velocity.y) * gain + 0.18,
      (targetVelocity.z - body.velocity.z) * gain
    );
    body.applyForce(force, body.position);
  }

  step(delta, objects) {
    this.world.step(1 / 120, delta, 6);
    for (const object of objects) {
      const body = this.bodies.get(object.userData.fishId);
      if (!body) continue;
      const speed = body.velocity.length();
      if (speed > 1.35) body.velocity.scale(1.35 / speed, body.velocity);
      object.position.set(body.position.x, body.position.y, body.position.z);
      const horizontalSpeed = Math.hypot(body.velocity.x, body.velocity.z);
      if (horizontalSpeed > 0.025) {
        const targetYaw = Math.atan2(-body.velocity.z, body.velocity.x);
        const difference = Math.atan2(Math.sin(targetYaw - object.rotation.y), Math.cos(targetYaw - object.rotation.y));
        object.rotation.y += difference * (1 - Math.exp(-delta * (object.userData.controlled ? 7 : 4)));
      }
      const targetPitch = Math.max(-0.28, Math.min(0.28, body.velocity.y * 0.22));
      object.rotation.z += (targetPitch - object.rotation.z) * (1 - Math.exp(-delta * 5));
    }
  }
}
