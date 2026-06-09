import * as THREE from 'three';
import { CONFIG, COLORS, WORLDS } from './config.js';

// Constrói a geometria 3D do mundo, em modo 'normal' (natural/claro) ou 'inverted' (Avesso).
export class World {
  constructor(scene, level, mode = 'inverted') {
    this.scene = scene;
    this.level = level;
    this.mode = mode;
    this.cfg = WORLDS[mode];
    this.spores = null;
    this._build();
  }

  _loadTex(path, repeat) {
    const t = new THREE.TextureLoader().load(path);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.magFilter = THREE.NearestFilter;     // visual pixel-art nítido (Minecraft)
    t.minFilter = THREE.NearestMipmapLinearFilter;
    t.anisotropy = 4;
    return t;
  }

  _build() {
    const { level, cfg } = this;
    const span = level.size * level.cell;

    this.scene.background = new THREE.Color(cfg.sky);
    this.scene.fog = new THREE.Fog(cfg.fog, cfg.fogNear, cfg.fogFar);

    // Luzes (mais fortes no normal; suaves porém visíveis no Avesso)
    this.scene.add(new THREE.AmbientLight(cfg.ambient, cfg.ambientInt));
    this.scene.add(new THREE.HemisphereLight(cfg.hemiSky, cfg.hemiGround, cfg.hemiInt));

    // Chão (com textura)
    const floorGeo = new THREE.PlaneGeometry(span, span);
    const floorMat = new THREE.MeshStandardMaterial({ color: cfg.floor, roughness: 1, metalness: 0 });
    if (cfg.floorTex) floorMat.map = this._loadTex(cfg.floorTex, level.size);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Teto baixo (só no Avesso, dá clima de "preso")
    if (cfg.ceiling) {
      const ceil = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({
        color: 0x0d0612, roughness: 1, side: THREE.DoubleSide,
      }));
      ceil.rotation.x = Math.PI / 2;
      ceil.position.y = CONFIG.WALL_HEIGHT + 1;
      this.scene.add(ceil);
    }

    // Paredes via InstancedMesh
    const wallCells = [];
    for (let z = 0; z < level.size; z++) {
      for (let x = 0; x < level.size; x++) {
        if (level.grid[z][x] === 1) wallCells.push(level.cellToWorld(x, z));
      }
    }
    const boxGeo = new THREE.BoxGeometry(level.cell, CONFIG.WALL_HEIGHT, level.cell);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0.05 });
    if (cfg.wallTex) wallMat.map = this._loadTex(cfg.wallTex, 2);
    const inst = new THREE.InstancedMesh(boxGeo, wallMat, wallCells.length);
    const m = new THREE.Matrix4();
    const color = new THREE.Color();
    wallCells.forEach((c, i) => {
      m.makeTranslation(c.x, CONFIG.WALL_HEIGHT / 2, c.z);
      inst.setMatrixAt(i, m);
      // tom por bloco (multiplica a textura): claro p/ não escurecer demais
      color.setHex(cfg.wall).offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);
      inst.setColorAt(i, color);
    });
    inst.instanceMatrix.needsUpdate = true;
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
    inst.castShadow = true;
    inst.receiveShadow = true;
    this.scene.add(inst);

    if (cfg.vines) this._addVines(span);
    if (cfg.spores) this._addSpores(span);
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
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    }
    this.scene.add(group);
  }

  _addSpores(span) {
    const count = 700;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * span;
      pos[i * 3 + 1] = Math.random() * (CONFIG.WALL_HEIGHT + 1);
      pos[i * 3 + 2] = (Math.random() - 0.5) * span;
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
