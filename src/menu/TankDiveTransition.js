import * as THREE from 'three';

const smooth = (value) => value * value * (3 - 2 * value);

const createTransitionMaterial = () => new THREE.MeshBasicMaterial({
  color: 0x6ee1ef,
  transparent: true,
  opacity: 0,
  depthTest: false,
  depthWrite: false,
  toneMapped: false
});

export class TankDiveTransition {
  constructor({ scene, camera, menu, onComplete = null }) {
    this.scene = scene;
    this.camera = camera;
    this.menu = menu;
    this.onComplete = onComplete;
    this.duration = 3.4;
    this.elapsed = 0;
    this.state = 'idle';
    this.crossedGlass = false;
    this.startPosition = camera.position.clone();
    this.approachPosition = new THREE.Vector3(0, 0.1, 3.05);
    this.gameplayPosition = new THREE.Vector3(0, 0.35, 7.15);
    this.overlay = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), createTransitionMaterial());
    this.overlay.frustumCulled = false;
    this.overlay.renderOrder = 10000;
    this.overlay.visible = false;
    this.overlay.name = 'glass-dive-refraction';
    scene.add(this.overlay);
  }

  start() {
    if (this.state !== 'idle') return false;
    this.elapsed = 0;
    this.state = 'active';
    this.crossedGlass = false;
    this.startPosition.copy(this.camera.position);
    this.overlay.visible = true;
    return true;
  }

  update(delta) {
    if (this.state !== 'active') return this.snapshot();
    this.elapsed = Math.min(this.duration, this.elapsed + delta);
    const progress = this.elapsed / this.duration;
    const cameraProgress = smooth(Math.min(1, progress / 0.62));

    const playScale = progress < 0.18 ? 1 + Math.sin(progress / 0.18 * Math.PI) * 0.14
      : Math.max(0.001, 1 - (progress - 0.18) / 0.26);
    this.menu.play.scale.setScalar(playScale);
    this.menu.title.material.opacity = Math.max(0, 1 - progress * 2.3);
    this.menu.settings.scale.setScalar(Math.max(0.001, 1 - progress * 2.6));

    const veil = Math.sin(Math.PI * progress);
    const wave = Math.sin(this.elapsed * 8) * 0.5 + 0.5;
    this.overlay.material.opacity = Math.min(0.94, veil * (0.76 + wave * 0.12));
    this.overlay.material.color.setRGB(0.2 + wave * 0.12, 0.68 + wave * 0.12, 0.78 + wave * 0.14);

    if (progress >= 0.56 && !this.crossedGlass) {
      this.crossedGlass = true;
      this.menu.setVisible(false);
      this.scene.fog.density = 0.038;
      this.scene.background.setHex(0x06485d);
    }

    if (this.crossedGlass) {
      this.camera.position.copy(this.gameplayPosition);
      this.camera.lookAt(0, -0.15, 0);
    } else {
      this.camera.position.lerpVectors(this.startPosition, this.approachPosition, cameraProgress);
      this.camera.lookAt(0, -0.15 + progress * 0.2, 0);
    }
    this.overlay.position.copy(this.camera.position);
    this.overlay.quaternion.copy(this.camera.quaternion);
    this.overlay.translateZ(-0.2);

    if (progress >= 1) {
      this.state = 'complete';
      this.overlay.visible = false;
      this.camera.position.copy(this.gameplayPosition);
      this.camera.lookAt(0, -0.15, 0);
      this.onComplete?.();
    }
    return this.snapshot();
  }

  snapshot() {
    return {
      state: this.state,
      progress: this.duration ? Math.min(1, this.elapsed / this.duration) : 0,
      crossedGlass: this.crossedGlass,
      menuVisible: this.menu.group.visible,
      overlayVisible: this.overlay.visible
    };
  }
}
