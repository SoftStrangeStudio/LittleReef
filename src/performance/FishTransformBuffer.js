export class FishTransformBuffer {
  constructor(capacity = 16) {
    this.capacity = capacity;
    this.stride = 8;
    this.data = new Float32Array(capacity * this.stride);
    this.ids = [];
    this.count = 0;
  }

  ensureCapacity(required) {
    if (required <= this.capacity) return;
    while (this.capacity < required) this.capacity *= 2;
    const next = new Float32Array(this.capacity * this.stride);
    next.set(this.data);
    this.data = next;
  }

  sync(objects) {
    const list = Array.isArray(objects) ? objects : [...objects];
    this.ensureCapacity(list.length);
    this.ids.length = list.length;
    this.count = list.length;
    for (let index = 0; index < list.length; index += 1) {
      const object = list[index];
      const offset = index * this.stride;
      this.ids[index] = object.userData.fishId;
      this.data[offset] = object.position.x;
      this.data[offset + 1] = object.position.y;
      this.data[offset + 2] = object.position.z;
      this.data[offset + 3] = object.scale.x;
      this.data[offset + 4] = object.rotation.x;
      this.data[offset + 5] = object.rotation.y;
      this.data[offset + 6] = object.rotation.z;
      this.data[offset + 7] = object.visible ? 1 : 0;
    }
    return this;
  }
}
