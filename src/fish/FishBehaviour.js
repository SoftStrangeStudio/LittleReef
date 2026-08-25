[main d46f235] Give fish a clearer swim rhythm
 1 file changed, 1 insertion(+), 1 deletion(-)
import * as THREE from 'three';

export class FishBehaviour {
  constructor(random = Math.random) {
    this.velocity = new THREE.Vector3(
      random() > 0.5 ? 0.35 : -0.35,
      (random() - 0.5) * 0.08,
      (random() - 0.5) * 0.18
    );
    this.phase = random() * Math.PI * 2;
    this.speed = 0.65 + random() * 0.55;
  }

  update(object, delta, elapsed, bounds) {
    this.phase += delta * this.speed;
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
