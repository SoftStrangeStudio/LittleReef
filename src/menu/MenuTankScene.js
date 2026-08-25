import * as THREE from 'three';

const GLYPHS = {
  ' ': ['00000','00000','00000','00000','00000','00000','00000'],
  E: ['11111','10000','10000','11110','10000','10000','11111'],
  F: ['11111','10000','10000','11110','10000','10000','10000'],
  I: ['11111','00100','00100','00100','00100','00100','11111'],
  L: ['10000','10000','10000','10000','10000','10000','11111'],
  R: ['11110','10001','10001','11110','10100','10010','10001'],
  T: ['11111','00100','00100','00100','00100','00100','00100']
};

const createTitleTexture = (text) => {
  const width = text.length * 6 - 1;
  const height = 7;
  const data = new Uint8Array(width * height * 4);
  for (let letter = 0; letter < text.length; letter += 1) {
    const glyph = GLYPHS[text[letter]] ?? GLYPHS[' '];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        if (glyph[y][x] !== '1') continue;
        const offset = ((height - 1 - y) * width + letter * 6 + x) * 4;
        data[offset] = 226;
        data[offset + 1] = 250;
        data[offset + 2] = 246;
        data[offset + 3] = 255;
      }
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
};

const createFrameBar = (width, height, depth, position) => {
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color: 0x87d7dc, roughness: 0.18, metalness: 0.32 })
  );
  bar.position.copy(position);
  return bar;
};

const createBubbleMaterial = () => new THREE.MeshPhysicalMaterial({
  color: 0xa9f4ff,
  emissive: 0x0b4854,
  emissiveIntensity: 0.35,
  transparent: true,
  opacity: 0.32,
  roughness: 0.05,
  metalness: 0.08,
  clearcoat: 1,
  clearcoatRoughness: 0.05,
  side: THREE.DoubleSide
});

const createPlayIcon = () => {
  const size = 16;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 2; x <= 13; x += 1) {
      if (Math.abs(y - 7.5) > (13 - x) * 0.62) continue;
      const offset = (y * size + x) * 4;
      data[offset] = 244;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  const icon = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.8),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide })
  );
  icon.position.z = 0.86;
  return icon;
};

const createPlayCore = () => {
  const core = new THREE.Mesh(
    new THREE.CircleGeometry(0.59, 40),
    new THREE.MeshBasicMaterial({
      color: 0x427e8d,
      side: THREE.DoubleSide
    })
  );
  core.position.z = 0.58;
  return core;
};

const createGearIcon = () => {
  const gear = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({ color: 0xf4ffff });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.07, 8, 24), material);
  gear.add(ring);
  for (let index = 0; index < 8; index += 1) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.18, 0.05), material);
    tooth.position.set(Math.cos(index * Math.PI / 4) * 0.28, Math.sin(index * Math.PI / 4) * 0.28, 0);
    tooth.rotation.z = index * Math.PI / 4;
    gear.add(tooth);
  }
  gear.position.z = 0.52;
  return gear;
};

const createSettingsCore = () => {
  const core = new THREE.Mesh(
    new THREE.CircleGeometry(0.33, 32),
    new THREE.MeshBasicMaterial({ color: 0x427e8d, side: THREE.DoubleSide })
  );
  core.position.z = 0.35;
  return core;
};

export class MenuTankScene {
  constructor(scene) {
    this.group = new THREE.Group();
    this.group.name = 'little-reef-menu-tank';
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.targets = [];

    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(11.15, 6.25),
      new THREE.MeshPhysicalMaterial({
        color: 0x8adce8,
        transparent: true,
        opacity: 0.08,
        roughness: 0.04,
        metalness: 0.05,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        side: THREE.DoubleSide
      })
    );
    glass.position.z = 2.25;
    glass.name = 'aquarium-glass';
    this.group.add(glass);

    const frameZ = 2.35;
    this.group.add(
      createFrameBar(11.7, 0.16, 0.18, new THREE.Vector3(0, 3.2, frameZ)),
      createFrameBar(11.7, 0.16, 0.18, new THREE.Vector3(0, -3.2, frameZ)),
      createFrameBar(0.16, 6.55, 0.18, new THREE.Vector3(-5.78, 0, frameZ)),
      createFrameBar(0.16, 6.55, 0.18, new THREE.Vector3(5.78, 0, frameZ))
    );

    const titleTexture = createTitleTexture('LITTLE REEF');
    const title = new THREE.Mesh(
      new THREE.PlaneGeometry(4.9, 0.72),
      new THREE.MeshBasicMaterial({ map: titleTexture, transparent: true, alphaTest: 0.1, depthWrite: false })
    );
    title.position.set(0, 2.25, 2.62);
    title.name = 'little-reef-title';
    this.title = title;
    this.group.add(title);

    const play = new THREE.Group();
    const playBubble = new THREE.Mesh(new THREE.SphereGeometry(0.82, 32, 20), createBubbleMaterial());
    playBubble.userData.menuAction = 'play';
    play.add(playBubble, createPlayCore(), createPlayIcon());
    play.position.set(0, -0.05, 2.72);
    play.name = 'play-bubble';
    this.play = play;
    this.targets.push(playBubble);
    this.group.add(play);

    const settings = new THREE.Group();
    const settingsBubble = new THREE.Mesh(new THREE.SphereGeometry(0.48, 24, 16), createBubbleMaterial());
    settingsBubble.userData.menuAction = 'settings';
    settings.add(settingsBubble, createSettingsCore(), createGearIcon());
    settings.position.set(4.2, -1.85, 2.72);
    settings.name = 'settings-bubble';
    this.settings = settings;
    this.targets.push(settingsBubble);
    this.group.add(settings);

    scene.add(this.group);
  }

  update(elapsed) {
    this.play.position.y = -0.05 + Math.sin(elapsed * 1.1) * 0.08;
    this.play.rotation.y = Math.sin(elapsed * 0.65) * 0.07;
    this.settings.position.y = -1.85 + Math.sin(elapsed * 1.35 + 1.4) * 0.045;
    this.settings.rotation.z = Math.sin(elapsed * 0.55) * 0.06;
    this.title.material.opacity = 0.88 + Math.sin(elapsed * 0.8) * 0.08;
  }

  pick(camera, clientX, clientY, rect) {
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, camera);
    return this.raycaster.intersectObjects(this.targets, false)[0]?.object.userData.menuAction ?? null;
  }

  setVisible(visible) {
    this.group.visible = visible;
  }
}
