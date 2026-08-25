import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MenuTankScene } from '../src/menu/MenuTankScene.js';
import { TankDiveTransition } from '../src/menu/TankDiveTransition.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 100);
camera.position.set(0, 0.2, 11.2);
camera.lookAt(0, -0.15, 0);
const menu = new MenuTankScene(scene);
scene.updateMatrixWorld(true);
camera.updateMatrixWorld(true);

const rect = { left: 0, top: 0, width: 960, height: 540 };
const clientPoint = (object) => {
  const projected = object.getWorldPosition(new THREE.Vector3()).project(camera);
  return {
    x: (projected.x + 1) * rect.width * 0.5,
    y: (1 - projected.y) * rect.height * 0.5
  };
};

const play = clientPoint(menu.play);
const settings = clientPoint(menu.settings);
assert.equal(menu.pick(camera, play.x, play.y, rect), 'play');
assert.equal(menu.pick(camera, settings.x, settings.y, rect), 'settings');
assert.equal(menu.pick(camera, 40, 40, rect), null);

menu.setVisible(false);
assert.equal(menu.group.visible, false);
menu.setVisible(true);
menu.update(1.5);
assert.equal(menu.group.visible, true);

scene.fog = new THREE.FogExp2(0x0d5266, 0.055);
scene.background = new THREE.Color(0x0d5266);
let completed = false;
const transition = new TankDiveTransition({ scene, camera, menu, onComplete: () => { completed = true; } });
assert.equal(transition.start(), true);
while (!transition.crossedGlass) transition.update(1 / 60);
const crossedPosition = camera.position.clone();
for (let index = 0; index < 20; index += 1) transition.update(1 / 60);
assert.ok(camera.position.distanceTo(crossedPosition) < 0.0001, 'camera stays inside the reef after crossing the glass');
while (transition.state !== 'complete') transition.update(1 / 60);
assert.equal(completed, true);
assert.equal(menu.group.visible, false);

console.log(JSON.stringify({ status: 'pass', play, settings, crossedPosition: crossedPosition.toArray() }, null, 2));
