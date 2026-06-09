import * as THREE from 'three';
import { CONFIG, COLORS } from './config.js';

// Base principal: a sorveteria "Bentô Gelatos".
// No Avesso a fachada aparece assombrada — letreiro em neon vermelho que pisca.
export class Base {
  constructor(scene, level, cell) {
    this.scene = scene;
    this.level = level;
    this.cell = cell;
    this.group = new THREE.Group();
    this._build();
    this.scene.add(this.group);
  }

  _build() {
    const C = this.level.cell;
    const sx = this.cell.x;
    const sz = this.cell.z;
    // face frontal da parede de trás (célula cz-1), virada para o jogador (+z)
    const wallFaceZ = sz - C / 2;

    // ---- Letreiro da fachada (textura assombrada) ----
    const tex = new THREE.TextureLoader().load('textures/facade.png');
    tex.colorSpace = THREE.SRGBColorSpace;
    const signMat = new THREE.MeshStandardMaterial({
      map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.4,
      roughness: 0.6,
    });
    this.signMat = signMat;
    const signW = C * 1.85, signH = signW * (384 / 1024);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(signW, signH), signMat);
    sign.position.set(sx, CONFIG.WALL_HEIGHT - signH / 2 - 0.6, wallFaceZ + 0.12);
    this.group.add(sign);

    // moldura escura ao redor do letreiro
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x14060f, roughness: 0.9 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(signW + 0.6, signH + 0.6, 0.3), frameMat);
    frame.position.set(sx, sign.position.y, wallFaceZ + 0.0);
    this.group.add(frame);

    // ---- Toldo listrado (escurecido/assombrado) ----
    const awningMat = new THREE.MeshStandardMaterial({ color: 0x6b1020, roughness: 0.8, side: THREE.DoubleSide });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(signW + 1.5, 0.3, 2.6), awningMat);
    awning.position.set(sx, CONFIG.WALL_HEIGHT - signH - 1.4, wallFaceZ + 1.3);
    awning.rotation.x = -0.25;
    this.group.add(awning);
    // listras claras no toldo
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xd8c8d0, roughness: 0.8, side: THREE.DoubleSide });
    for (let i = -3; i <= 3; i++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 2.6), stripeMat);
      st.position.set(sx + i * 1.4, awning.position.y + 0.01, wallFaceZ + 1.3);
      st.rotation.x = -0.25;
      this.group.add(st);
    }

    // ---- Postes com cones de sorvete nas laterais da entrada ----
    for (const side of [-1, 1]) {
      const px = sx + side * (C / 2 - 0.7);
      const pz = wallFaceZ + 1.6;
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 4.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x2a1520, roughness: 0.9 })
      );
      post.position.set(px, 2.1, pz);
      this.group.add(post);
      // casquinha
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.5, 1.2, 12),
        new THREE.MeshStandardMaterial({ color: 0xc8a060, roughness: 0.6 })
      );
      cone.position.set(px, 4.4, pz);
      cone.rotation.x = Math.PI;
      this.group.add(cone);
      // bola de sorvete (rosa, brilhando fraco)
      const scoop = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 12, 12),
        new THREE.MeshStandardMaterial({ color: COLORS.whey, emissive: 0x551028, emissiveIntensity: 0.6, roughness: 0.5 })
      );
      scoop.position.set(px, 5.2, pz);
      this.group.add(scoop);
    }

    // ---- Tapete/piso da entrada ----
    const matMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(C * 0.9, C * 0.9),
      new THREE.MeshStandardMaterial({ color: 0x2a0814, emissive: 0x3a0010, emissiveIntensity: 0.4, roughness: 1 })
    );
    matMesh.rotation.x = -Math.PI / 2;
    matMesh.position.set(sx, 0.06, sz + 0.5);
    this.group.add(matMesh);

    // ---- Luz neon vermelha iluminando a fachada ----
    this.neon = new THREE.PointLight(0xff1830, 4, 26, 2);
    this.neon.position.set(sx, sign.position.y, wallFaceZ + 3);
    this.group.add(this.neon);
  }

  update(dt, time) {
    // Flicker de neon assombrado
    const base = 1.2;
    const flick = Math.random() < 0.06 ? 0.25 : (0.9 + Math.sin(time * 9) * 0.1);
    this.signMat.emissiveIntensity = base * flick;
    this.neon.intensity = 3 + flick * 2;
  }
}
