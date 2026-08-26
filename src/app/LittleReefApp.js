import * as THREE from 'three';
import { ReefRenderer } from '../reef/ReefRenderer.js';
import { DEFAULT_REEF_CONFIG, ReefService } from '../reef/ReefService.js';
import { FishRenderer } from '../fish/FishRenderer.js';
import { FishService } from '../fish/FishService.js';
import { BreedingService } from '../breeding/BreedingService.js';
import { SelectionService } from '../selection/SelectionService.js';
import { UIService } from '../ui/UIService.js';
import { FishPhysics } from '../physics/FishPhysics.js';
import { GameStateService } from '../game/GameStateService.js';
import { ReefAudioService } from '../audio/ReefAudioService.js';
import { MenuTankScene } from '../menu/MenuTankScene.js';
import { TankDiveTransition } from '../menu/TankDiveTransition.js';
import { ControlledFishController } from '../control/ControlledFishController.js';
import { FishCameraRig } from '../control/FishCameraRig.js';

export class LittleReefApp {
  constructor(root) {
    this.root = root;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
    this.camera.position.set(0, 0.2, 11.2);
    this.camera.lookAt(0, -0.2, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    root.appendChild(this.renderer.domElement);

    this.#lighting();
    this.reefService = new ReefService(this.scene, new ReefRenderer(), DEFAULT_REEF_CONFIG);
    this.fishRenderer = new FishRenderer();
    this.audio = new ReefAudioService();
    this.audio.attachUserGesture(root);
    this.reefPhysics = new FishPhysics(this.reefService.bounds, () => this.audio.playCollision());
    for (const obstacle of this.reefService.visuals.obstacles) this.reefPhysics.addObstacle(obstacle);
    this.fishService = new FishService(Math.random, this.reefPhysics);
    this.breedingService = new BreedingService(this.fishService);
    this.gameState = new GameStateService();
    this.fishObjects = new Map();
    this.mode = 'menu';

    this.ui = new UIService(root, (ids) => {
      this.gameState.enter('parent-selection');
      this.audio.playParent(this.fishService.get(ids.at(-1)));
    }, (ids) => this.#breed(ids));
    this.ui.updateGameState(this.gameState.snapshot());
    this.selection = new SelectionService(this.camera, this.renderer.domElement, this.fishRenderer, (id) => {
      const fish = this.fishService.get(id);
      if (fish) {
        this.ui.setVisible(true);
        this.gameState.enter('fish-inspection');
        this.audio.playSelection(fish);
        this.ui.showFish(fish);
        this.ui.updateGameState(this.gameState.snapshot());
      }
    });
    this.selection.setEnabled(false);
    this.ui.setVisible(false);

    for (let i = 0; i < 8; i++) this.#spawn(this.fishService.createStarter(), i);

    this.menu = new MenuTankScene(this.scene);
    this.diveTransition = new TankDiveTransition({
      scene: this.scene,
      camera: this.camera,
      menu: this.menu,
      onComplete: () => this.#enterReef()
    });
    this.renderer.domElement.addEventListener('pointerdown', (event) => this.#handleMenuPointer(event));
    this.renderer.domElement.addEventListener('pointermove', (event) => this.#handleSwimPointer(event));
    this.renderer.domElement.addEventListener('wheel', (event) => this.#handleSwimDepth(event), { passive: false });

    this.clock = new THREE.Clock();
    addEventListener('resize', () => this.#resize());
    this.renderer.setAnimationLoop(() => this.#update());
  }

  #spawn(fish, index = this.fishObjects.size) {
    const object = this.fishRenderer.create(fish);
    const col = index % 4;
    const row = Math.floor(index / 4);
    object.position.set(-3.1 + col * 2.05, 0.8 - row * 1.45, -0.5 + (index % 3) * 0.45);
    this.scene.add(object);
    this.fishObjects.set(fish.id, object);
    this.gameState.recordFish(fish);
    this.ui.updateGameState(this.gameState.snapshot());
    this.reefPhysics.addFish(fish.id, object.position, object.userData.physicsRadius);
    this.selection.register(object);
  }

  #breed(ids) {
    this.gameState.enter('breeding');
    this.audio.playBreed(ids.join(':'));
    const child = this.breedingService.breed(this.fishService.get(ids[0]), this.fishService.get(ids[1]));
    if (!child) return;
    this.#spawn(child);
    this.ui.resetParents();
    this.ui.showFish(child);
    this.gameState.recordBreed(child);
    this.audio.playReveal(child);
    this.ui.updateGameState(this.gameState.snapshot());
  }

  #lighting() {
    this.scene.add(new THREE.HemisphereLight(0xb9f4ff, 0x6e5d3c, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 2.6);
    sun.position.set(-3, 6, 5);
    sun.castShadow = true;
    this.scene.add(sun);
    const fill = new THREE.PointLight(0x4bd6d8, 3.2, 12);
    fill.position.set(3, 0, 3);
    this.scene.add(fill);
  }

  #handleMenuPointer(event) {
    if (this.mode !== 'menu') return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const action = this.menu.pick(this.camera, event.clientX, event.clientY, rect);
    if (action === 'play' && this.diveTransition.start()) {
      this.mode = 'transition';
      this.audio.playDive();
    }
  }

  #enterReef() {
    this.mode = 'reef';
    this.menu.setVisible(false);
    this.selection.setEnabled(true);
    const [fishId, object] = this.fishObjects.entries().next().value;
    this.controlledFish = new ControlledFishController({
      fishId,
      object,
      physics: this.reefPhysics,
      camera: this.camera,
      bounds: this.reefService.bounds,
      obstacles: this.reefService.visuals.obstacles
    });
    this.cameraRig = new FishCameraRig(this.camera, object);
    this.gameState.enter('reef');
    this.ui.updateGameState(this.gameState.snapshot());
  }

  #handleSwimPointer(event) {
    if (this.mode !== 'reef' || !this.controlledFish) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.controlledFish.setPointer(x, y);
  }

  #handleSwimDepth(event) {
    if (this.mode !== 'reef' || !this.controlledFish) return;
    event.preventDefault();
    this.controlledFish.adjustDepth(-Math.sign(event.deltaY) * 0.28);
  }

  #update() {
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;
    this.reefService.update(delta, elapsed);
    this.menu.update(elapsed);
    if (this.mode === 'transition') this.diveTransition.update(delta);
    const objects = [...this.fishObjects.values()];
    for (const [id, object] of this.fishObjects) {
      if (this.mode === 'reef' && this.controlledFish?.fishId === id) continue;
      this.fishService.behaviour(id)?.update(object, delta, elapsed, this.reefService.bounds, objects);
    }
    if (this.mode === 'reef') this.controlledFish?.update(delta);
    this.reefPhysics.step(delta, objects);
    if (this.mode === 'reef' && this.cameraRig && this.controlledFish) {
      this.cameraRig.update(delta, this.controlledFish.lastDesiredVelocity);
    }
    this.fishRenderer.updateLOD(this.camera, objects);
    this.fishRenderer.syncTransforms(objects);
    this.renderer.render(this.scene, this.camera);
  }

  #resize() {
    const width = innerWidth;
    const height = innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}
