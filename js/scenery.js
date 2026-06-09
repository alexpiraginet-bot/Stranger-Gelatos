import * as THREE from 'three';
import { CONFIG } from './config.js';

// Decoração do mundo: vira a grade de blocos numa vila (casas/árvores) no normal,
// e em árvores mortas/assombradas no Avesso.
export class Scenery {
  constructor(scene, level, mode, baseCell) {
    this.scene = scene;
    this.level = level;
    this.mode = mode;
    this.baseCell = baseCell;
    this.group = new THREE.Group();
    this.lampMats = [];
    if (mode === 'normal') this._buildNormal();
    else this._buildInverted();
    this.scene.add(this.group);
  }

  _isBaseCell(x, z) {
    const b = this.baseCell;
    if (!b) return false;
    if (x === b.cx && z === b.cz) return true;
    if (z === b.cz - 1 && Math.abs(x - b.cx) <= 1) return true; // fileira da fachada
    return false;
  }

  _wallCells() {
    const out = [];
    for (let z = 1; z < this.level.size - 1; z++) {
      for (let x = 1; x < this.level.size - 1; x++) {
        if (this.level.grid[z][x] === 1 && !this._isBaseCell(x, z)) out.push({ x, z, ...this.level.cellToWorld(x, z) });
      }
    }
    return out;
  }

  _freeCells() {
    return this.level.freeCells().filter((c) => !this._isBaseCell(c.cx, c.cz));
  }

  _shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // ---------------- MUNDO NORMAL ----------------
  _buildNormal() {
    const C = this.level.cell;
    const H = CONFIG.WALL_HEIGHT;
    const roofGeo = new THREE.ConeGeometry(C * 0.78, 3.2, 4);
    const doorGeo = new THREE.BoxGeometry(1.6, 3, 0.2);
    const winGeo = new THREE.BoxGeometry(1.3, 1.3, 0.2);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x5b3a22, roughness: 0.9 });
    const winMat = new THREE.MeshStandardMaterial({ color: 0xfff0b0, emissive: 0x6b5a20, emissiveIntensity: 0.5, roughness: 0.5 });
    const roofColors = [0xb5482e, 0x9c6b2e, 0x7a8b46, 0x4f6d8a, 0xb07a8a];

    for (const c of this._wallCells()) {
      if (Math.random() < 0.6) {
        // casa: telhado + porta + janelas
        const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({
          color: roofColors[(Math.random() * roofColors.length) | 0], roughness: 0.85,
        }));
        roof.position.set(c.x, H + 1.5, c.z);
        roof.rotation.y = Math.PI / 4;
        this.group.add(roof);
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(c.x, 1.5, c.z + C / 2 + 0.11);
        this.group.add(door);
        for (const sx of [-1.6, 1.6]) {
          const w = new THREE.Mesh(winGeo, winMat);
          w.position.set(c.x + sx, 4.4, c.z + C / 2 + 0.11);
          this.group.add(w);
        }
      } else if (Math.random() < 0.5) {
        // árvore alta sobre o bloco
        this._tree(c.x, H, c.z, 1.0);
      }
    }

    // Árvores, arbustos e postes em áreas livres
    const free = this._shuffle(this._freeCells());
    let i = 0;
    for (const c of free.slice(0, 26)) this._tree(c.x + (Math.random() - 0.5) * 2.5, 0, c.z + (Math.random() - 0.5) * 2.5, 0.85);
    for (const c of free.slice(26, 54)) this._bush(c.x + (Math.random() - 0.5) * 3, c.z + (Math.random() - 0.5) * 3);
    for (const c of free.slice(54, 60)) this._lamppost(c.x, c.z);
  }

  _tree(x, baseY, z, scale = 1) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35 * scale, 0.45 * scale, 3 * scale, 6),
      new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 })
    );
    trunk.position.set(x, baseY + 1.5 * scale, z);
    this.group.add(trunk);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f7a3a, roughness: 0.8 });
    for (const [dy, r] of [[3, 1.8], [4.1, 1.3], [5, 0.9]]) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(r * scale, 8, 7), leafMat);
      f.position.set(x, baseY + dy * scale, z);
      this.group.add(f);
    }
  }

  _bush(x, z) {
    const b = new THREE.Mesh(
      new THREE.SphereGeometry(0.9, 7, 6),
      new THREE.MeshStandardMaterial({ color: 0x4f8a44, roughness: 0.9 })
    );
    b.position.set(x, 0.5, z);
    b.scale.y = 0.6;
    this.group.add(b);
  }

  _lamppost(x, z) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 4.6, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7, metalness: 0.4 })
    );
    pole.position.set(x, 2.3, z);
    this.group.add(pole);
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffd070, emissiveIntensity: 1.2 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), bulbMat);
    bulb.position.set(x, 4.7, z);
    this.group.add(bulb);
    this.lampMats.push({ mat: bulbMat, phase: Math.random() * 6.28 });
    const light = new THREE.PointLight(0xffd591, 5, 16, 2);
    light.position.set(x, 4.6, z);
    this.group.add(light);
  }

  // ---------------- AVESSO ----------------
  _buildInverted() {
    const H = CONFIG.WALL_HEIGHT;
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x1c1018, roughness: 1 });
    const branchMat = new THREE.MeshStandardMaterial({ color: 0x140a12, roughness: 1 });
    const podMat = new THREE.MeshStandardMaterial({ color: 0x8a1020, emissive: 0x4a0008, emissiveIntensity: 0.8, roughness: 0.6 });

    for (const c of this._wallCells()) {
      if (Math.random() > 0.45) continue;
      // árvore morta retorcida
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.5, 4.5, 6), trunkMat);
      trunk.position.set(c.x, H + 2.2, c.z);
      this.group.add(trunk);
      for (let b = 0; b < 4; b++) {
        const br = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.18, 2.2, 5), branchMat);
        const ang = Math.random() * Math.PI * 2;
        br.position.set(c.x + Math.cos(ang) * 0.8, H + 3.4 + Math.random() * 1.2, c.z + Math.sin(ang) * 0.8);
        br.rotation.z = Math.cos(ang) * 1.1;
        br.rotation.x = Math.sin(ang) * 1.1;
        this.group.add(br);
      }
      if (Math.random() < 0.4) {
        const pod = new THREE.Mesh(new THREE.SphereGeometry(0.4, 7, 6), podMat);
        pod.position.set(c.x, H + 1.2, c.z + 0.6);
        this.group.add(pod);
      }
    }
  }

  update(dt, time) {
    // leve cintilar dos postes
    for (const m of this.lampMats) m.emissiveIntensity = 1.0 + Math.sin(time * 3 + m.id) * 0.15;
  }
}
