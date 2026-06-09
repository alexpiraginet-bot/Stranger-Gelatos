import * as THREE from 'three';
import { CONFIG, COLORS } from './config.js';

// Constrói a geometria 3D do Mundo Invertido a partir dos dados do nível.
export class World {
  constructor(scene, level) {
    this.scene = scene;
    this.level = level;
    this.spores = null;
    this._build();
  }

  _build() {
    const { level } = this;
    const span = level.size * level.cell;

    // Névoa densa e fundo escuro (atmosfera do Mundo Invertido)
    this.scene.background = new THREE.Color(COLORS.sky);
    this.scene.fog = new THREE.Fog(CONFIG.FOG_COLOR, CONFIG.FOG_NEAR, CONFIG.FOG_FAR);

    // Luz ambiente bem fraca + leve tom frio
    const amb = new THREE.AmbientLight(0x331a33, 0.45);
    this.scene.add(amb);
    const hemi = new THREE.HemisphereLight(0x2a1530, 0x05030a, 0.35);
    this.scene.add(hemi);

    // Chão
    const floorGeo = new THREE.PlaneGeometry(span, span);
    const floorMat = new THREE.MeshStandardMaterial({
      color: COLORS.floor, roughness: 1, metalness: 0,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Teto baixo escuro (dá clima de "preso" no Mundo Invertido)
    const ceil = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({
      color: 0x0d0612, roughness: 1, side: THREE.DoubleSide,
    }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = CONFIG.WALL_HEIGHT + 1;
    this.scene.add(ceil);

    // Paredes via InstancedMesh (rápido no celular)
    const wallCells = [];
    for (let z = 0; z < level.size; z++) {
      for (let x = 0; x < level.size; x++) {
        if (level.grid[z][x] === 1) wallCells.push(level.cellToWorld(x, z));
      }
    }
    const boxGeo = new THREE.BoxGeometry(level.cell, CONFIG.WALL_HEIGHT, level.cell);
    const wallMat = new THREE.MeshStandardMaterial({
      color: COLORS.wall, roughness: 0.95, metalness: 0.05,
    });
    const inst = new THREE.InstancedMesh(boxGeo, wallMat, wallCells.length);
    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    wallCells.forEach((c, i) => {
      m.makeTranslation(c.x, CONFIG.WALL_HEIGHT / 2, c.z);
      inst.setMatrixAt(i, m);
      // leve variação de cor por bloco
      color.setHex(COLORS.wall).offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);
      inst.setColorAt(i, color);
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.castShadow = true;
    inst.receiveShadow = true;
    this.scene.add(inst);

    // "Veias" do Mundo Invertido no chão (linhas vermelhas espalhadas)
    this._addVines(span);

    // Esporos flutuantes (partículas)
    this._addSpores(span);
  }

  _addVines(span) {
    const mat = new THREE.LineBasicMaterial({ color: COLORS.vine, transparent: true, opacity: 0.5 });
    const group = new THREE.Group();
    for (let i = 0; i < 60; i++) {
      const pts = [];
      let x = (Math.random() - 0.5) * span;
      let z = (Math.random() - 0.5) * span;
      for (let s = 0; s < 6; s++) {
        pts.push(new THREE.Vector3(x, 0.06, z));
        x += (Math.random() - 0.5) * 8;
        z += (Math.random() - 0.5) * 8;
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      group.add(new THREE.Line(geo, mat));
    }
    this.scene.add(group);
  }

  _addSpores(span) {
    const count = 700;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    this._sporeBase = new Float32Array(count); // y base p/ animação
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * span;
      pos[i * 3 + 1] = Math.random() * (CONFIG.WALL_HEIGHT + 1);
      pos[i * 3 + 2] = (Math.random() - 0.5) * span;
      this._sporeBase[i] = pos[i * 3 + 1];
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: COLORS.spore, size: 0.35, transparent: true, opacity: 0.7,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.spores = new THREE.Points(geo, mat);
    this.scene.add(this.spores);
  }

  update(dt, time) {
    // Anima esporos subindo/flutuando suavemente
    if (this.spores) {
      const pos = this.spores.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + dt * 0.6;
        if (y > CONFIG.WALL_HEIGHT + 1) y = 0;
        pos.setY(i, y + Math.sin(time + i) * 0.002);
      }
      pos.needsUpdate = true;
      this.spores.rotation.y = time * 0.01;
    }
  }
}
