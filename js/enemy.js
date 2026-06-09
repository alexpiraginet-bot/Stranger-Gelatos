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
    this.bodyMat = new THREE.MeshStandardMaterial({ color: COLORS.enemyBody, roughness: 0.85 });
    this.headMat = new THREE.MeshStandardMaterial({ color: COLORS.enemyHead, roughness: 0.7, emissive: 0x2a0000 });

    // Pernas
    const legGeo = new THREE.BoxGeometry(0.6, 2.4, 0.6);
    for (const sx of [-0.8, 0.8]) {
      for (const sz of [-0.5, 0.5]) {
        const leg = new THREE.Mesh(legGeo, this.bodyMat);
        leg.position.set(sx, 1.2, sz);
        g.add(leg);
      }
    }
    // Tronco
    const torso = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 1.6), this.bodyMat);
    torso.position.y = 3.6;
    g.add(torso);
    // Braços
    const armGeo = new THREE.BoxGeometry(0.6, 2.4, 0.6);
    for (const sx of [-1.6, 1.6]) {
      const arm = new THREE.Mesh(armGeo, this.bodyMat);
      arm.position.set(sx, 3.7, 0);
      g.add(arm);
    }
    // Cabeça-flor (pétalas que abrem quando alerta)
    this.head = new THREE.Group();
    this.head.position.y = 5.4;
    const petalGeo = new THREE.ConeGeometry(0.9, 2.0, 4);
    this.petals = [];
    const N = 5;
    for (let i = 0; i < N; i++) {
      const p = new THREE.Mesh(petalGeo, this.headMat);
      const ang = (i / N) * Math.PI * 2;
      p.userData.ang = ang;
      this.head.add(p);
      this.petals.push(p);
    }
    g.add(this.head);

    g.position.set(this.x, 0, this.z);
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
    this.bob += dt * (this.alerted ? 8 : 3);
    this.mesh.position.y = Math.abs(Math.sin(this.bob)) * 0.3;
    const open = this.alerted ? 1.0 : 0.4;
    for (const p of this.petals) {
      const a = p.userData.ang;
      p.position.set(Math.cos(a) * open, 0, Math.sin(a) * open);
      p.rotation.z = -Math.cos(a) * open * 1.1;
      p.rotation.x = Math.sin(a) * open * 1.1;
    }
    this.head.rotation.y += dt * (this.alerted ? 4 : 1);

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
