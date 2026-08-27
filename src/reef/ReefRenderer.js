import * as THREE from 'three';
import { RockArchFactory } from './rock-arch/RockArchFactory.js';
import { CoralField } from './coral/CoralField.js';

export class ReefRenderer {
  constructor(rockArchFactory = new RockArchFactory(), coralLibrary = null) {
    this.rockArchFactory = rockArchFactory;
    this.coralLibrary = coralLibrary;
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

    const coralField = this.coralLibrary
      ? CoralField.create({ library: this.coralLibrary, config, floorY: -2.25 })
      : null;
    if (coralField) scene.add(coralField.group);

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
    if (coralField) obstacles.push(...coralField.obstacles);
    obstacles.push(...rockArch.obstacles);
    return {
      particles: points,
      obstacles,
      landmarks: { rockArch, coralField },
    };
  }
}
