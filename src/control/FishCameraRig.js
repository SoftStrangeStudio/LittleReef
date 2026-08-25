import * as THREE from 'three';

export class FishCameraRig {
  constructor(camera, fishObject) {
    this.camera = camera;
    this.fishObject = fishObject;
    this.forward = fishObject.position.clone().sub(camera.position);
    this.forward.y = 0;
    if (this.forward.lengthSq() < 0.001) this.forward.set(0, 0, -1);
    this.forward.normalize();
    this.lookTarget = fishObject.position.clone();
  }

  update(delta, desiredVelocity) {
    const horizontalVelocity = desiredVelocity.clone();
    horizontalVelocity.y = 0;
    if (horizontalVelocity.lengthSq() > 0.01) {
      this.forward.lerp(horizontalVelocity.normalize(), 1 - Math.exp(-delta * 3.8)).normalize();
    }
    const desiredPosition = this.fishObject.position.clone()
      .addScaledVector(this.forward, -3.35)
      .add(new THREE.Vector3(0, 1.15, 0));
    const positionBlend = 1 - Math.exp(-delta * 2.8);
    this.camera.position.lerp(desiredPosition, positionBlend);
    const desiredLook = this.fishObject.position.clone()
      .addScaledVector(this.forward, 1.3)
      .add(new THREE.Vector3(0, THREE.MathUtils.clamp(desiredVelocity.y * 0.35, -0.35, 0.35), 0));
    this.lookTarget.lerp(desiredLook, 1 - Math.exp(-delta * 4.5));
    this.camera.lookAt(this.lookTarget);
  }
}
