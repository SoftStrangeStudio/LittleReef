import * as THREE from 'three';
import { ReefRenderer } from '../reef/ReefRenderer.js';
import { ReefService } from '../reef/ReefService.js';
import { FishRenderer } from '../fish/FishRenderer.js';
import { FishService } from '../fish/FishService.js';
import { BreedingService } from '../breeding/BreedingService.js';
import { SelectionService } from '../selection/SelectionService.js';
import { UIService } from '../ui/UIService.js';
import { FishPhysics } from '../physics/FishPhysics.js';
import { GameStateService } from '../game/GameStateService.js';

export class LittleReefApp {
  constructor(root) {
    this.root = root;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
    this.camera.position.set(0, 0.2, 9.2);
    this.camera.lookAt(0, -0.2, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    root.appendChild(this.renderer.domElement);

    this.#lighting();
    this.reefService = new ReefService(this.scene, new ReefRenderer());
    this.fishRenderer = new FishRenderer();
    this.reefPhysics = new FishPhysics(this.reefService.bounds);
    this.fishService = new FishService(Math.random, this.reefPhysics);
    this.breedingService = new BreedingService(this.fishService);
    this.gameState = new GameStateService();
    this.fishObjects = new Map();

    this.ui = new UIService(root, () => {}, (ids) => this.#breed(ids));
    this.ui.updateGameState(this.gameState.snapshot());
    this.selection = new SelectionService(this.camera, this.renderer.domElement, this.fishRenderer, (id) => {
      const fish = this.fishService.get(id);
      if (fish) this.ui.showFish(fish);
    });

    for (let i = 0; i < 8; i++) this.#spawn(this.fishService.createStarter(), i);

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
    const child = this.breedingService.breed(this.fishService.get(ids[0]), this.fishService.get(ids[1]));
    if (!child) return;
    this.#spawn(child);
    this.ui.resetParents();
    this.ui.showFish(child);
    this.gameState.recordBreed(child);
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

  #update() {
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.elapsedTime;
    this.reefService.update(delta, elapsed);
    for (const [id, object] of this.fishObjects) {
      this.fishService.behaviour(id)?.update(object, delta, elapsed, this.reefService.bounds);
    }
    this.reefPhysics.step(delta, [...this.fishObjects.values()]);
    this.fishRenderer.updateLOD(this.camera, this.fishObjects.values());
    this.fishRenderer.syncTransforms(this.fishObjects.values());
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
