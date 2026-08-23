import * as THREE from 'three';

export class SelectionService {
  constructor(camera, canvas, fishRenderer, onChange) {
    this.camera = camera;
    this.canvas = canvas;
    this.fishRenderer = fishRenderer;
    this.onChange = onChange;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.targets = [];
    this.selected = null;
    canvas.addEventListener('pointerdown', (event) => this.#pick(event));
  }

  register(group) { this.targets.push(group); }

  #pick(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.targets, true);
    let group = hits[0]?.object ?? null;
    while (group && !group.userData.fishId) group = group.parent;
    if (!group?.userData.fishId) return;

    if (this.selected) this.fishRenderer.setSelected(this.selected, false);
    this.selected = group;
    this.fishRenderer.setSelected(group, true);
    this.onChange(group.userData.fishId);
  }
}
