import { LittleReefApp } from './app/LittleReefApp.js';
import { DEFAULT_REEF_CONFIG } from './reef/ReefService.js';
import { CoralAssetLoader } from './reef/coral/CoralAssetLoader.js';

const root = document.querySelector('#app');

try {
  const coralLibrary = await CoralAssetLoader.load({
    enabledIds: DEFAULT_REEF_CONFIG.coralIds,
    assetRoot: `${import.meta.env.BASE_URL}assets/coral/`,
  });
  new LittleReefApp(root, { coralLibrary });
} catch (error) {
  console.error('Little Reef could not load its coral assets.', error);
  root.textContent = 'Little Reef could not load its reef assets.';
  throw error;
}
