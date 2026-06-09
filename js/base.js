import * as THREE from 'three';
import { CONFIG, COLORS } from './config.js';

// Base principal: a sorveteria "Bentô Gelatos".
// No mundo normal a fachada é alegre; no Avesso ela aparece assombrada (neon piscando).
export class Base {
  constructor(scene, level, cell, mode = 'inverted') {
    this.scene = scene;
    this.level = level;
    this.cell = cell;
    this.mode = mode;
    this.haunted = (mode === 'inverted');
    this.group = new THREE.Group();
    this._build();
    this.scene.add(this.group);
  }

  _build() {
    const C = this.level.cell;
    const sx = this.cell.x;
    const sz = this.cell.z;
    const wallFaceZ = sz - C / 2; // face frontal da parede de trás (virada para +z)

    // ---- Letreiro da fachada ----
    const texPath = this.haunted ? 'textures/facade.png' : 'textures/facade-normal.png';
    const tex = new THREE.TextureLoader().load(texPath);
    tex.colorSpace = THREE.SRGBColorSpace;
    const signMat = new THREE.MeshStandardMaterial({
      map: tex, emissiveMap: tex, emissive: 0xffffff,
      emissiveIntensity: this.haunted ? 1.4 : 0.5, roughness: 0.6,
    });
    this.signMat = signMat;
    const signW = C * 1.85, signH = signW * (384 / 1024);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(signW, signH), signMat);
    sign.position.set(sx, CONFIG.WALL_HEIGHT - signH / 2 - 0.6, wallFaceZ + 0.12);
    this.group.add(sign);

    const frameMat = new THREE.MeshStandardMaterial({ color: this.haunted ? 0x14060f : 0x3a2c10, roughness: 0.9 });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(signW + 0.6, signH + 0.6, 0.3), frameMat);
    frame.position.set(sx, sign.position.y, wallFaceZ + 0.0);
    this.group.add(frame);

    // ---- Toldo listrado ----
    const awningColor = this.haunted ? 0x6b1020 : 0xc23a52;
    const awningMat = new THREE.MeshStandardMaterial({ color: awningColor, roughness: 0.8, side: THREE.DoubleSide });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(signW + 1.5, 0.3, 2.6), awningMat);
    awning.position.set(sx, CONFIG.WALL_HEIGHT - signH - 1.4, wallFaceZ + 1.3);
    awning.rotation.x = -0.25;
    this.group.add(awning);
    const stripeMat = new THREE.MeshStandardMaterial({ color: this.haunted ? 0xd8c8d0 : 0xfff2f4, roughness: 0.8, side: THREE.DoubleSide });
    for (let i = -3; i <= 3; i++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 2.6), stripeMat);
      st.position.set(sx + i * 1.4, awning.position.y + 0.01, wallFaceZ + 1.3);
      st.rotation.x = -0.25;
      this.group.add(st);
    }

    // ---- Postes com cones de sorvete ----
    for (const side of [-1, 1]) {
      const px = sx + side * (C / 2 - 0.7);
      const pz = wallFaceZ + 1.6;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4.2, 8),
        new THREE.MeshStandardMaterial({ color: this.haunted ? 0x2a1520 : 0x6b5536, roughness: 0.9 }));
      post.position.set(px, 2.1, pz);
      this.group.add(post);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 12),
        new THREE.MeshStandardMaterial({ color: 0xc8a060, roughness: 0.6 }));
      cone.position.set(px, 4.4, pz);
      cone.rotation.x = Math.PI;
      this.group.add(cone);
      const scoop = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 12),
        new THREE.MeshStandardMaterial({ color: COLORS.whey, emissive: 0x551028, emissiveIntensity: this.haunted ? 0.6 : 0.2, roughness: 0.5 }));
      scoop.position.set(px, 5.2, pz);
      this.group.add(scoop);
    }

    // ---- Tapete da entrada ----
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(C * 0.9, C * 0.9),
      new THREE.MeshStandardMaterial({
        color: this.haunted ? 0x2a0814 : 0x7a2236,
        emissive: this.haunted ? 0x3a0010 : 0x000000, emissiveIntensity: 0.4, roughness: 1,
      }));
    mat.rotation.x = -Math.PI / 2;
    mat.position.set(sx, 0.06, sz + 0.5);
    this.group.add(mat);

    // ---- Luz da fachada ----
    this.neon = new THREE.PointLight(this.haunted ? 0xff1830 : 0xffd9a0, this.haunted ? 4 : 2.2, 26, 2);
    this.neon.position.set(sx, sign.position.y, wallFaceZ + 3);
    this.group.add(this.neon);
  }

  update(dt, time) {
    if (!this.haunted) return; // fachada normal fica estável
    const flick = Math.random() < 0.06 ? 0.25 : (0.9 + Math.sin(time * 9) * 0.1);
    this.signMat.emissiveIntensity = 1.2 * flick;
    this.neon.intensity = 3 + flick * 2;
  }
}
