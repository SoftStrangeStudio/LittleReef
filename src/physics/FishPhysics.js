import * as CANNON from 'cannon-es';

const wall = (world, position, halfExtents) => {
  const body = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC });
  body.addShape(new CANNON.Box(new CANNON.Vec3(...halfExtents)));
  body.position.set(...position);
  body.material = new CANNON.Material('reef-wall');
  world.addBody(body);
};

export class FishPhysics {
  constructor(bounds) {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -0.18, 0) });
    this.world.broadphase = new CANNON.SAPBroadphase(this.world);
    this.world.allowSleep = true;
    this.bodies = new Map();
    this.collisions = 0;
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
    body.addEventListener('collide', () => { this.collisions += 1; });
    this.world.addBody(body);
    this.bodies.set(id, body);
    return body;
  }

  steer(id, targetVelocity) {
    const body = this.bodies.get(id);
    if (!body) return;
    const force = new CANNON.Vec3(
      (targetVelocity.x - body.velocity.x) * 1.35,
      (targetVelocity.y - body.velocity.y) * 1.35 + 0.18,
      (targetVelocity.z - body.velocity.z) * 1.35
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
      object.rotation.y = body.velocity.x >= 0 ? 0 : Math.PI;
      object.rotation.z = Math.max(-0.18, Math.min(0.18, -body.velocity.y * 0.16));
    }
  }
}
