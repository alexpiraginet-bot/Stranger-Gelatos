import * as THREE from 'three';
import { CONFIG } from './config.js';

// Decoração do mundo via InstancedMesh (poucas draw calls, bom p/ celular).
// Normal: vira uma vila (casas, árvores, arbustos, postes). Avesso: árvores mortas.
export class Scenery {
  constructor(scene, level, mode, baseCell) {
    this.scene = scene;
    this.level = level;
    this.mode = mode;
    this.baseCell = baseCell;
    this.group = new THREE.Group();
    this.lamps = [];
    if (mode === 'normal') this._buildNormal();
    else this._buildInverted();
    this.scene.add(this.group);
  }

  _isBaseCell(x, z) {
    const b = this.baseCell;
    if (!b) return false;
    if (x === b.cx && z === b.cz) return true;
    if (z === b.cz - 1 && Math.abs(x - b.cx) <= 1) return true;
    return false;
  }

  _wallCells() {
    const out = [];
    for (let z = 1; z < this.level.size - 1; z++)
      for (let x = 1; x < this.level.size - 1; x++)
        if (this.level.grid[z][x] === 1 && !this._isBaseCell(x, z)) out.push({ x, z, ...this.level.cellToWorld(x, z) });
    return out;
  }

  _freeCells() { return this.level.freeCells().filter((c) => !this._isBaseCell(c.cx, c.cz)); }
  _shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // Cria um InstancedMesh a partir de uma lista de transformações
  _inst(geo, mat, items) {
    if (!items.length) return null;
    const mesh = new THREE.InstancedMesh(geo, mat, items.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    const v = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color();
    let hasColor = false;
    items.forEach((it, i) => {
      e.set(it.rx || 0, it.ry || 0, it.rz || 0);
      q.setFromEuler(e);
      v.set(it.x, it.y, it.z);
      const s = it.s || 1; sc.set(it.sx || s, it.sy || s, it.sz || s);
      m.compose(v, q, sc);
      mesh.setMatrixAt(i, m);
      if (it.color != null) { mesh.setColorAt(i, col.setHex(it.color)); hasColor = true; }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (hasColor && mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = true;
    this.group.add(mesh);
    return mesh;
  }

  // ---------------- MUNDO NORMAL ----------------
  _buildNormal() {
    const C = this.level.cell, H = CONFIG.WALL_HEIGHT;
    const roofs = [], doors = [], windows = [], trunks = [], leaves = [], bushes = [];
    const roofColors = [0xb5482e, 0x9c6b2e, 0x7a8b46, 0x4f6d8a, 0xb07a8a, 0xc24a3a];

    for (const c of this._wallCells()) {
      const r = Math.random();
      if (r < 0.55) {
        roofs.push({ x: c.x, y: H + 1.5, z: c.z, ry: Math.PI / 4, color: roofColors[(Math.random() * roofColors.length) | 0] });
        doors.push({ x: c.x, y: 1.5, z: c.z + C / 2 + 0.12 });
        windows.push({ x: c.x - 1.6, y: 4.4, z: c.z + C / 2 + 0.12 });
        windows.push({ x: c.x + 1.6, y: 4.4, z: c.z + C / 2 + 0.12 });
      } else if (r < 0.78) {
        this._pushTree(trunks, leaves, c.x, H, c.z, 1.0);
      }
    }

    const free = this._shuffle(this._freeCells());
    const nTrees = Math.min(46, (free.length * 0.06) | 0);
    const nBush = Math.min(70, (free.length * 0.11) | 0);
    let i = 0;
    for (; i < nTrees && i < free.length; i++) {
      const c = free[i];
      this._pushTree(trunks, leaves, c.x + (Math.random() - 0.5) * 2.5, 0, c.z + (Math.random() - 0.5) * 2.5, 0.8 + Math.random() * 0.4);
    }
    for (let k = 0; k < nBush && i < free.length; k++, i++) {
      const c = free[i];
      bushes.push({ x: c.x + (Math.random() - 0.5) * 3.5, y: 0.5, z: c.z + (Math.random() - 0.5) * 3.5, s: 0.7 + Math.random() * 0.6, color: [0x4f8a44, 0x3f7a3a, 0x5b9a4a][(Math.random() * 3) | 0] });
    }
    for (let k = 0; k < 8 && i < free.length; k++, i++) this._lamppost(free[i].x, free[i].z);

    // Instâncias (poucas draw calls)
    this._inst(new THREE.ConeGeometry(C * 0.78, 3.2, 4), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), roofs);
    this._inst(new THREE.BoxGeometry(1.6, 3, 0.2), new THREE.MeshStandardMaterial({ color: 0x5b3a22, roughness: 0.9 }), doors);
    this._inst(new THREE.BoxGeometry(1.3, 1.3, 0.2), new THREE.MeshStandardMaterial({ color: 0xfff0b0, emissive: 0x6b5a20, emissiveIntensity: 0.5, roughness: 0.5 }), windows);
    this._inst(new THREE.CylinderGeometry(0.4, 0.5, 3, 6), new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 }), trunks);
    this._inst(new THREE.SphereGeometry(1.5, 8, 7), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 }), leaves);
    this._inst(new THREE.SphereGeometry(0.9, 7, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), bushes);
  }

  _pushTree(trunks, leaves, x, baseY, z, scale) {
    trunks.push({ x, y: baseY + 1.5 * scale, z, s: scale });
    const lc = [0x3f7a3a, 0x4a8a42, 0x356b32][(Math.random() * 3) | 0];
    for (const [dy, r] of [[3, 1.0], [4.1, 0.75], [5, 0.55]])
      leaves.push({ x, y: baseY + dy * scale, z, s: r * scale, color: lc });
  }

  _lamppost(x, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 4.6, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7, metalness: 0.4 }));
    pole.position.set(x, 2.3, z); this.group.add(pole);
    const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffd070, emissiveIntensity: 1.2 });
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 8), bulbMat);
    bulb.position.set(x, 4.7, z); this.group.add(bulb);
    const light = new THREE.PointLight(0xffd591, 5, 16, 2);
    light.position.set(x, 4.6, z); this.group.add(light);
    this.lamps.push({ mat: bulbMat, phase: Math.random() * 6.28 });
  }

  // ---------------- AVESSO ----------------
  _buildInverted() {
    const H = CONFIG.WALL_HEIGHT;
    const trunks = [], branches = [], pods = [];
    for (const c of this._wallCells()) {
      if (Math.random() > 0.45) continue;
      trunks.push({ x: c.x, y: H + 2.2, z: c.z, s: 0.8 + Math.random() * 0.5 });
      for (let b = 0; b < 4; b++) {
        const ang = Math.random() * Math.PI * 2;
        branches.push({
          x: c.x + Math.cos(ang) * 0.8, y: H + 3.4 + Math.random() * 1.2, z: c.z + Math.sin(ang) * 0.8,
          rz: Math.cos(ang) * 1.1, rx: Math.sin(ang) * 1.1,
        });
      }
      if (Math.random() < 0.4) pods.push({ x: c.x, y: H + 1.2, z: c.z + 0.6, s: 0.9 + Math.random() * 0.5 });
    }
    this._inst(new THREE.CylinderGeometry(0.3, 0.5, 4.5, 6), new THREE.MeshStandardMaterial({ color: 0x1c1018, roughness: 1 }), trunks);
    this._inst(new THREE.CylinderGeometry(0.08, 0.18, 2.2, 5), new THREE.MeshStandardMaterial({ color: 0x140a12, roughness: 1 }), branches);
    this._inst(new THREE.SphereGeometry(0.4, 7, 6), new THREE.MeshStandardMaterial({ color: 0x8a1020, emissive: 0x4a0008, emissiveIntensity: 0.8, roughness: 0.6 }), pods);
  }

  update(dt, time) {
    for (const l of this.lamps) l.mat.emissiveIntensity = 1.0 + Math.sin(time * 3 + l.phase) * 0.15;
  }
}
