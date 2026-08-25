import * as THREE from 'three';

export class ReefRenderer {
  create(scene) {
    scene.background = new THREE.Color(0x0d5266);
    scene.fog = new THREE.FogExp2(0x0d5266, 0.055);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 6),
      new THREE.MeshStandardMaterial({ color: 0xcdbf91, roughness: 1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.25;
    floor.receiveShadow = true;
    scene.add(floor);

    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 5.2),
      new THREE.MeshStandardMaterial({ color: 0x12687a, roughness: 0.95 })
    );
    back.position.set(0, 0, -2.7);
    scene.add(back);

    const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x737b72, roughness: 0.95 });
    for (const [x, y, z, s] of [[-3.7,-1.75,-1.1,0.8],[-2.8,-1.9,-0.5,0.55],[3.4,-1.8,-1.2,0.9],[2.5,-1.95,0.4,0.5]]) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), rockMaterial);
      rock.position.set(x, y, z);
      rock.scale.y = 0.7;
      scene.add(rock);
    }

    const coralColors = [0xef766f, 0xf2ad62, 0x8e75ca, 0x66b995];
    for (let i = 0; i < 10; i++) {
    const coral = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09 + (i % 3) * 0.03, 0.16, 0.75 + (i % 4) * 0.2, 7),
        new THREE.MeshStandardMaterial({ color: coralColors[i % coralColors.length], roughness: 0.8 })
      );
      coral.position.set(-4.2 + i * 0.9, -1.8 + coral.geometry.parameters.height / 2, -1.6 + (i % 3) * 0.8);
      coral.rotation.z = (i % 2 ? 1 : -1) * 0.12;
      scene.add(coral);
    }

    const particles = new THREE.BufferGeometry();
    const positions = [];
    for (let i = 0; i < 90; i++) positions.push((Math.random()-0.5)*10, (Math.random()-0.5)*4.5, (Math.random()-0.5)*5);
    particles.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const points = new THREE.Points(particles, new THREE.PointsMaterial({ color: 0xbde8ef, size: 0.025, transparent: true, opacity: 0.48 }));
    scene.add(points);
    return { particles: points };
  }
}
