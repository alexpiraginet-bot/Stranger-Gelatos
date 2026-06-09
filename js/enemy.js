import * as THREE from 'three';
import { CONFIG, COLORS } from './config.js';

export class Enemy {
  constructor(scene, level, spawn) {
    this.scene = scene;
    this.level = level;
    this.x = spawn.x;
    this.z = spawn.z;
    this.hp = CONFIG.ENEMY_HP;
    this.dead = false;
    this.hitFlash = 0;
    this.wander = this._randDir();
    this.wanderTimer = 0;
    this.alerted = false;
    this.bob = Math.random() * Math.PI * 2;
    this.mesh = this._build();
    this.scene.add(this.mesh);
  }

  _randDir() {
    const a = Math.random() * Math.PI * 2;
    return { x: Math.cos(a), z: Math.sin(a) };
  }

  _build() {
    const g = new THREE.Group();
    this.bodyMat = new THREE.MeshStandardMaterial({ color: COLORS.enemyBody, roughness: 0.9 });
    this.skinMat = new THREE.MeshStandardMaterial({ color: 0x9a5560, roughness: 0.85 });
    this.headMat = new THREE.MeshStandardMaterial({ color: COLORS.enemyHead, roughness: 0.6, emissive: 0x2a0000 });
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x120006, roughness: 1 });

    // Pernas digitígradas (curvadas)
    const thighGeo = new THREE.BoxGeometry(0.55, 1.8, 0.55);
    const shinGeo = new THREE.BoxGeometry(0.45, 1.6, 0.45);
    for (const sx of [-0.7, 0.7]) {
      const thigh = new THREE.Mesh(thighGeo, this.bodyMat);
      thigh.position.set(sx, 1.6, -0.2); thigh.rotation.x = 0.4; g.add(thigh);
      const shin = new THREE.Mesh(shinGeo, this.bodyMat);
      shin.position.set(sx, 0.8, 0.4); shin.rotation.x = -0.5; g.add(shin);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 1.1), this.bodyMat);
      foot.position.set(sx, 0.15, 0.75); g.add(foot);
    }
    // Tronco curvado para frente (postura predadora)
    this.torso = new THREE.Group(); this.torso.position.set(0, 2.6, 0);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.2, 1.3), this.skinMat);
    chest.position.set(0, 0.4, 0.2); chest.rotation.x = -0.25; this.torso.add(chest);
    const belly = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 1.1), this.bodyMat);
    belly.position.set(0, -0.7, 0.45); this.torso.add(belly);
    // Costelas (ripas)
    for (let i = 0; i < 3; i++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.18, 1.34), this.bodyMat);
      rib.position.set(0, 0.9 - i * 0.5, 0.2); rib.rotation.x = -0.25; this.torso.add(rib);
    }
    // Braços longos com garras
    const upperArmGeo = new THREE.BoxGeometry(0.4, 1.8, 0.4);
    const foreArmGeo = new THREE.BoxGeometry(0.35, 1.7, 0.35);
    this.arms = [];
    for (const sx of [-1.1, 1.1]) {
      const arm = new THREE.Group(); arm.position.set(sx, 0.8, 0.3);
      const up = new THREE.Mesh(upperArmGeo, this.skinMat); up.position.y = -0.7; up.rotation.x = 0.5; arm.add(up);
      const fore = new THREE.Mesh(foreArmGeo, this.bodyMat); fore.position.set(0, -1.8, 0.7); fore.rotation.x = 0.9; arm.add(fore);
      for (let c = -1; c <= 1; c++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.6, 4), this.skinMat);
        claw.position.set(c * 0.12, -2.7, 1.1); claw.rotation.x = Math.PI; arm.add(claw);
      }
      this.torso.add(arm); this.arms.push(arm);
    }
    g.add(this.torso);

    // Pescoço + cabeça-flor (5 pétalas grandes + 5 menores, com dentes)
    this.head = new THREE.Group();
    this.head.position.set(0, 5.2, 0.5);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 1.0, 8), this.skinMat);
    neck.position.y = -0.7; this.head.add(neck);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), mouthMat);
    this.head.add(core);
    const petalGeo = new THREE.ConeGeometry(0.7, 2.2, 3);
    const petalGeoIn = new THREE.ConeGeometry(0.4, 1.6, 3);
    this.petals = [];
    const N = 5;
    for (let i = 0; i < N; i++) {
      const ang = (i / N) * Math.PI * 2;
      const p = new THREE.Mesh(petalGeo, this.headMat); p.userData.ang = ang; p.userData.ring = 0;
      this.head.add(p); this.petals.push(p);
      const ang2 = ang + Math.PI / N;
      const p2 = new THREE.Mesh(petalGeoIn, this.headMat); p2.userData.ang = ang2; p2.userData.ring = 1;
      this.head.add(p2); this.petals.push(p2);
    }
    // dentes ao redor da boca
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 4), this.skinMat);
      tooth.position.set(Math.cos(ang) * 0.5, 0, Math.sin(ang) * 0.5);
      tooth.rotation.z = -Math.cos(ang) * 1.4; tooth.rotation.x = Math.sin(ang) * 1.4;
      this.head.add(tooth);
    }
    g.add(this.head);

    g.position.set(this.x, 0, this.z);
    g.scale.set(1.05, 1.05, 1.05);
    return g;
  }

  update(dt, player) {
    if (this.dead) return;
    const dx = player.x - this.x;
    const dz = player.z - this.z;
    const dist = Math.hypot(dx, dz);

    let mx = 0, mz = 0;
    if (dist < CONFIG.ENEMY_SIGHT) {
      this.alerted = true;
      mx = dx / dist; mz = dz / dist;
    } else {
      this.alerted = false;
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) { this.wander = this._randDir(); this.wanderTimer = 1.5 + Math.random() * 2; }
      mx = this.wander.x * 0.45; mz = this.wander.z * 0.45;
    }

    const sp = CONFIG.ENEMY_SPEED * dt;
    const res = this.level.resolveCollision(this.x + mx * sp, this.z + mz * sp, CONFIG.ENEMY_RADIUS);
    if (res.x === this.x && res.z === this.z) this.wander = this._randDir();
    this.x = res.x; this.z = res.z;

    // Vira para a direção do movimento
    if (mx || mz) this.mesh.rotation.y = Math.atan2(mx, mz);
    this.mesh.position.set(this.x, 0, this.z);

    // Animações
    this.bob += dt * (this.alerted ? 9 : 3);
    this.mesh.position.y = Math.abs(Math.sin(this.bob)) * 0.35;
    // pétalas abrem quando alerta (anel externo abre mais)
    const open = this.alerted ? 1.15 : 0.35;
    for (const p of this.petals) {
      const a = p.userData.ang;
      const o = open * (p.userData.ring === 1 ? 0.6 : 1) + (p.userData.ring === 1 ? 0.15 : 0);
      p.position.set(Math.cos(a) * o, p.userData.ring === 1 ? 0.2 : 0, Math.sin(a) * o);
      p.rotation.z = -Math.cos(a) * o * 1.2;
      p.rotation.x = Math.sin(a) * o * 1.2;
    }
    // cabeça oscila/encara; braços balançam ao perseguir
    this.head.rotation.y += dt * (this.alerted ? 3 : 0.8);
    const sway = Math.sin(this.bob) * (this.alerted ? 0.5 : 0.2);
    if (this.arms) { this.arms[0].rotation.x = sway; this.arms[1].rotation.x = -sway; }
    if (this.torso) this.torso.rotation.x = -0.1 + Math.sin(this.bob) * 0.05;

    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      const f = Math.sin(this.hitFlash * 40) > 0;
      this.bodyMat.emissive.setHex(f ? 0xffffff : 0x000000);
      this.headMat.emissive.setHex(f ? 0xffffff : 0x2a0000);
      if (this.hitFlash <= 0) { this.bodyMat.emissive.setHex(0x000000); this.headMat.emissive.setHex(0x2a0000); }
    }
  }

  collidesPlayer(player) {
    return Math.hypot(player.x - this.x, player.z - this.z) < CONFIG.ENEMY_RADIUS + CONFIG.PLAYER_RADIUS + 0.5;
  }

  hit() {
    this.hp--;
    this.hitFlash = 0.3;
    if (this.hp <= 0) this.die();
  }

  die() {
    this.dead = true;
    this.scene.remove(this.mesh);
    this.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
}
