import * as THREE from 'three';
import { RockArchFactory } from './rock-arch/RockArchFactory.js';

export class ReefRenderer {
  constructor(rockArchFactory = new RockArchFactory()) {
    this.rockArchFactory = rockArchFactory;
  }

  create(scene, config = {}) {
    scene.background = new THREE.Color(0x0d5266);
    scene.fog = new THREE.FogExp2(0x0d5266, 0.055);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 20),
      new THREE.MeshStandardMaterial({ color: 0xcdbf91, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.25;
    floor.position.z = -5;
    floor.receiveShadow = true;
    scene.add(floor);

    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 11),
      new THREE.MeshStandardMaterial({ color: 0x12687a, roughness: 0.95 })
    );
    back.position.set(0, 1.3, -9.5);
    scene.add(back);

    const rockArch = this.rockArchFactory.create({
      preset: config.rockArchPreset ?? '01-balanced-stack',
      seed: config.worldSeed ?? 'little-reef-main-v1',
      position: [0, -2.25, -3.8],
      scale: 1,
    });
    scene.add(rockArch.mesh);

    const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x737b72, roughness: 0.95 });
    const obstacles = [];
    for (const [x, y, z, s] of [
      [-3.7,-1.75,-1.1,0.8],[-2.8,-1.9,-0.5,0.55],[3.4,-1.8,-1.2,0.9],[2.5,-1.95,0.4,0.5],
      [-5.6,-1.45,-5.6,1.15],[5.3,-1.55,-6.4,1.05],[2.4,-1.7,-8.2,0.75]
    ]) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMaterial);
      rock.position.set(x, y, z);
      rock.scale.y = 0.7;
      rock.userData.obstacleRadius = s * 0.82;
      obstacles.push(rock);
      scene.add(rock);
    }

    const coralColors = [0xef766f, 0xf2ad62, 0x8e75ca, 0x66b995];
    for (let i = 0; i < 18; i++) {
    const coral = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09 + (i % 3) * 0.03, 0.16, 0.75 + (i % 4) * 0.2, 7),
        new THREE.MeshStandardMaterial({ color: coralColors[i % coralColors.length], roughness: 0.8 })
      );
      const row = Math.floor(i / 9);
      let x = -4.2 + (i % 9) * 1.05;
      const z = -1.6 - row * 4.1 + (i % 3) * 0.45;
      if (Math.abs(x) < 1.4) x += x < 0 || (x === 0 && row === 0) ? -2.8 : 2.8;
      else if (Math.abs(x) < 2.75 && z < -4.6) x += x < 0 ? -2.4 : 2.4;
      coral.position.set(x, -1.8 + coral.geometry.parameters.height / 2, z);
      coral.rotation.z = (i % 2 ? 1 : -1) * 0.12;
      scene.add(coral);
    }

    const particles = new THREE.BufferGeometry();
    const positions = [];
    let seed = 0x4c525046;
    const random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 180; i++) positions.push((random()-0.5)*18, (random()-0.5)*7, -random()*13 + 3);
    particles.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const points = new THREE.Points(particles, new THREE.PointsMaterial({ color: 0xbde8ef, size: 0.025, transparent: true, opacity: 0.48 }));
    scene.add(points);
    obstacles.push(...rockArch.obstacles);
    return {
      particles: points,
      obstacles,
      landmarks: { rockArch },
    };
  }
}
