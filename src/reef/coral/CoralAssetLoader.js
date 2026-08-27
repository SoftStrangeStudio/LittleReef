import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { coralEntries } from './CoralCatalog.js';

export class CoralAssetLibrary {
  constructor(sources) {
    this.sources = new Map(sources);
    this.disposed = false;
  }

  has(id) {
    return this.sources.has(id);
  }

  clone(id) {
    if (this.disposed) throw new Error('Coral asset library has been disposed.');
    const source = this.sources.get(id);
    if (!source) throw new RangeError(`Coral asset was not loaded: ${id}`);
    return source.clone(true);
  }

  dispose() {
    if (this.disposed) return;
    const geometries = new Set();
    const materials = new Set();
    for (const source of this.sources.values()) {
      source.traverse((object) => {
        if (!object.isMesh) return;
        geometries.add(object.geometry);
        const list = Array.isArray(object.material) ? object.material : [object.material];
        for (const item of list) if (item) materials.add(item);
      });
    }
    for (const geometry of geometries) geometry.dispose();
    for (const surface of materials) surface.dispose();
    this.sources.clear();
    this.disposed = true;
  }
}

export class CoralAssetLoader {
  static async load({ enabledIds, assetRoot }) {
    const root = assetRoot.endsWith('/') ? assetRoot : `${assetRoot}/`;
    const loader = new GLTFLoader();
    const sources = await Promise.all(coralEntries(enabledIds).map(async (entry) => {
      const gltf = await loader.loadAsync(`${root}${entry.file}`);
      gltf.scene.name = `coral-source-${entry.id}`;
      return [entry.id, gltf.scene];
    }));
    return new CoralAssetLibrary(sources);
  }

  static async parseBuffers(buffersById) {
    const loader = new GLTFLoader();
    const sources = [];
    for (const [id, buffer] of buffersById) {
      const arrayBuffer = buffer instanceof ArrayBuffer
        ? buffer
        : buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      const gltf = await new Promise((resolve, reject) => loader.parse(arrayBuffer, '', resolve, reject));
      gltf.scene.name = `coral-source-${id}`;
      sources.push([id, gltf.scene]);
    }
    return new CoralAssetLibrary(sources);
  }
}
