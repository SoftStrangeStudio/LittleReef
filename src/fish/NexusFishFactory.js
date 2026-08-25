import * as THREE from 'three';
import { buildFishModel, createFishDefinition } from '../nexus/fish/generator.js';

const paletteNames = ['azureGold', 'coralSilver', 'emeraldPearl', 'violetSun'];

const colorBucket = (value) => {
  const numeric = Number(value) >>> 0;
  return paletteNames[numeric % paletteNames.length];
};

const toParams = (fish) => {
  const traits = fish.traits ?? {};
  return {
    speciesFamily: traits.body === 'long' ? 'torpedo' : traits.body === 'tall' ? 'disc' : 'oval',
    tailProfile: traits.tail === 'fork' ? 'forked' : traits.tail === 'long' ? 'fan' : 'rounded',
    patternType: traits.pattern === 'stripe' ? 'bands' : traits.pattern === 'spots' ? 'spots' : 'mottled',
    palette: colorBucket(traits.baseColor),
    eyeProfile: (Number(traits.eyes) >>> 0) % 2 ? 'amber' : 'dark',
    mouthProfile: 'terminal',
    size: 0.5,
    quality: 'preview'
  };
};

const textureFor = (texture) => {
  const result = new THREE.DataTexture(texture.data, texture.width, texture.height, THREE.RGBAFormat);
  result.flipY = false;
  result.colorSpace = texture.colorSpace === 'srgb' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  result.wrapS = THREE.RepeatWrapping;
  result.wrapT = THREE.RepeatWrapping;
  result.needsUpdate = true;
  return result;
};

const materialFor = (definition, textures) => {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: definition.roughnessFactor ?? 0.5,
    metalness: definition.metallicFactor ?? 0,
    transparent: definition.alphaMode === 'BLEND',
    side: definition.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    clearcoat: definition.clearcoat ?? 0,
    clearcoatRoughness: definition.clearcoatRoughness ?? 0.2,
    transmission: definition.transmission ?? 0,
    opacity: definition.baseColorFactor?.[3] ?? 1
  });
  if (definition.baseColorTexture) material.map = textures[definition.baseColorTexture];
  if (definition.normalTexture) material.normalMap = textures[definition.normalTexture];
  if (definition.metallicRoughnessTexture) material.metalnessMap = textures[definition.metallicRoughnessTexture];
  if (definition.occlusionTexture) material.aoMap = textures[definition.occlusionTexture];
  material.needsUpdate = true;
  return material;
};

const geometryFor = (mesh) => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(mesh.positions, 3));
  if (mesh.normals?.length) geometry.setAttribute('normal', new THREE.Float32BufferAttribute(mesh.normals, 3));
  if (mesh.uvs?.length) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(mesh.uvs, 2));
  if (mesh.tangents?.length) geometry.setAttribute('tangent', new THREE.Float32BufferAttribute(mesh.tangents, 4));
  if (mesh.indices?.length) geometry.setIndex(mesh.indices);
  geometry.computeBoundingSphere();
  return geometry;
};

export class NexusFishFactory {
  constructor() {
    this.cache = new Map();
  }

  create(fish) {
    const params = toParams(fish);
    const seed = fish.seed ?? `little-reef:${fish.id}`;
    const key = `${seed}:${JSON.stringify(params)}`;
    let cached = this.cache.get(key);
    if (!cached) {
      const definition = createFishDefinition(seed, { ...params, name: fish.name ?? 'Procedural Reef Fish' });
      const model = buildFishModel(definition, { quality: 'preview' });
      const textures = Object.fromEntries(Object.entries(model.textures).map(([id, texture]) => [id, textureFor(texture)]));
      const materials = Object.fromEntries(Object.entries(model.materials).map(([id, material]) => [id, materialFor(material, textures)]));
      cached = {
        definition,
        bounds: model.bounds,
        meshes: model.meshes.map((mesh) => ({ geometry: geometryFor(mesh), material: materials[mesh.material], name: mesh.name }))
      };
      this.cache.set(key, cached);
    }
    const group = new THREE.Group();
    group.name = fish.id;
    group.userData.fishId = fish.id;
    group.userData.proceduralSeed = cached.definition.seed;
    group.userData.phenotypeKey = key;
    // Nexus previews use a generous authoring scale; Little Reef keeps the
    // population compact enough to read as a school in the existing reef.
    group.scale.setScalar(0.22);
    group.userData.baseScale = group.scale.x;
    // Nexus bounds are authored before the render scale is applied. Keep the
    // Cannon proxy aligned with the visible fish rather than the source mesh.
    group.userData.physicsRadius = Math.max(cached.bounds.size[0], cached.bounds.size[1], cached.bounds.size[2]) * 0.18 * group.scale.x;
    for (const mesh of cached.meshes) {
      const object = new THREE.Mesh(mesh.geometry, mesh.material);
      object.name = mesh.name;
      object.castShadow = true;
      object.receiveShadow = true;
      group.add(object);
    }
    group.userData.tailMesh = group.getObjectByName('Fish_Caudal_Fin') ?? group.children.find((child) => /Tail|Caudal/i.test(child.name));
    return group;
  }
}
