import * as THREE from 'three';

const bodyScale = {
  round: [1.05, 0.72, 0.58],
  long: [1.35, 0.55, 0.5],
  tall: [0.95, 0.95, 0.52]
};

export class FishRenderer {
  create(fish) {
    const group = new THREE.Group();
    group.name = fish.id;
    group.userData.fishId = fish.id;

    const geometry = new THREE.SphereGeometry(0.55, 20, 14);
    const material = new THREE.MeshStandardMaterial({
      color: fish.traits.baseColor,
      roughness: 0.66,
      metalness: 0.02
    });
    const body = new THREE.Mesh(geometry, material);
    body.scale.set(...bodyScale[fish.traits.body]);
    body.castShadow = true;
    group.add(body);

    this.#applyPattern(group, fish);

    const tail = this.#createTail(fish.traits.tail, fish.traits.patternColor);
    tail.position.x = -body.scale.x * 0.48 - 0.2;
    tail.rotation.z = -Math.PI / 2;
    group.add(tail);
    group.userData.tailMesh = tail;

    const eyeMaterial = new THREE.MeshStandardMaterial({ color: fish.traits.eyes, roughness: 0.35 });
    for (const z of [-0.32, 0.32]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), eyeMaterial);
      eye.position.set(body.scale.x * 0.43, 0.12, z * body.scale.z);
      group.add(eye);
    }

    return group;
  }

  setSelected(group, selected) {
    group.scale.setScalar(selected ? 1.12 : 1);
    if (selected && !group.userData.selectionRing) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.72, 0.035, 8, 32),
        new THREE.MeshBasicMaterial({ color: 0xfff1a6, transparent: true, opacity: 0.9 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.42;
      group.add(ring);
      group.userData.selectionRing = ring;
    }
    if (group.userData.selectionRing) group.userData.selectionRing.visible = selected;
  }

  #applyPattern(group, fish) {
    if (fish.traits.pattern === 'none') return;
    const patternMaterial = new THREE.MeshStandardMaterial({ color: fish.traits.patternColor, roughness: 0.62 });
    if (fish.traits.pattern === 'stripe') {
      for (const x of [-0.2, 0.1]) {
        const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.075, 8, 18), patternMaterial);
        stripe.rotation.y = Math.PI / 2;
        stripe.scale.set(1, 1.15, 1);
        stripe.position.x = x;
        group.add(stripe);
      }
    } else {
      for (const [x, y, z] of [[0.05, 0.25, 0.45], [-0.2, -0.2, 0.44], [0.23, -0.08, -0.44]]) {
        const spot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), patternMaterial);
        spot.position.set(x, y, z);
        spot.scale.z = 0.35;
        group.add(spot);
      }
    }
  }

  #createTail(type, color) {
    const material = new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.7 });
    let geometry;
    if (type === 'long') geometry = new THREE.ConeGeometry(0.25, 0.95, 4);
    else if (type === 'fork') geometry = new THREE.ConeGeometry(0.42, 0.62, 3);
    else geometry = new THREE.ConeGeometry(0.5, 0.52, 12);
    return new THREE.Mesh(geometry, material);
  }
}
