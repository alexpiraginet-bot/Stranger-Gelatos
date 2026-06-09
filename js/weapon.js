import * as THREE from 'three';
import { CONFIG } from './config.js';

// BENTÔLÉ gun 🍦 — arma de primeira pessoa que atira picolés nos Demogorgons.
export class Weapon {
  constructor(camera, scene, level) {
    this.camera = camera;
    this.scene = scene;
    this.level = level;
    this.cooldown = 0;
    this.fireRate = 0.32;      // segundos entre disparos
    this.projSpeed = 90;
    this.projectiles = [];
    this.recoil = 0;
    this.kills = 0;

    this.viewmodel = this._buildViewmodel();
    this.camera.add(this.viewmodel);

    // geometria/material reaproveitados para os picolés
    this._popGeo = new THREE.BoxGeometry(0.35, 0.7, 0.18);
    this._stickGeo = new THREE.BoxGeometry(0.1, 0.4, 0.1);
  }

  _buildViewmodel() {
    const g = new THREE.Group();
    // Corpo da arma (estilo blocado/Roblox, cores de sorvete)
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x36c9d9, roughness: 0.5, metalness: 0.2 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xff7ab0, roughness: 0.5 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 1.4), bodyMat);
    g.add(body);
    const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.0, 12), accentMat);
    cannon.rotation.x = Math.PI / 2;
    cannon.position.set(0, 0.05, -1.0);
    g.add(cannon);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.7, 0.4), bodyMat);
    grip.position.set(0, -0.55, 0.4);
    grip.rotation.x = 0.3;
    g.add(grip);
    // Picolé "carregado" na ponta
    const loaded = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.55, 0.16),
      new THREE.MeshStandardMaterial({ color: 0xff5a8a, emissive: 0x551020 }));
    loaded.position.set(0, 0.05, -1.4);
    g.add(loaded);
    this._loaded = loaded;

    // Posiciona na mão (canto inferior direito da tela)
    g.position.set(0.55, -0.5, -1.1);
    g.rotation.y = -0.05;
    return g;
  }

  update(dt, enemies) {
    if (this.cooldown > 0) this.cooldown -= dt;

    // Recuo (kick) volta ao normal suavemente
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 6);
    this.viewmodel.position.z = -1.1 + this.recoil * 0.5;
    if (this._loaded) this._loaded.visible = this.cooldown <= this.fireRate * 0.4;

    // Atualiza projéteis
    for (const p of this.projectiles) {
      if (p.dead) continue;
      p.life -= dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += dt * 12;
      p.mesh.rotation.z += dt * 9;

      // Colisão com parede
      const cell = this.level.worldToCell(p.mesh.position.x, p.mesh.position.z);
      if (p.life <= 0 || this.level.isWall(cell.cx, cell.cz)) { this._kill(p); continue; }

      // Colisão com Demogorgon
      for (const e of enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - p.mesh.position.x, e.z - p.mesh.position.z);
        if (d < CONFIG.ENEMY_RADIUS + 0.6 && Math.abs(p.mesh.position.y - 4) < 4) {
          e.hit();
          if (e.dead) this.kills++;
          this._kill(p);
          break;
        }
      }
    }
    // remove mortos da lista periodicamente
    if (this.projectiles.length > 40) this.projectiles = this.projectiles.filter((p) => !p.dead);
  }

  fire() {
    if (this.cooldown > 0) return false;
    this.cooldown = this.fireRate;
    this.recoil = 1;

    // Direção = para onde a câmera olha (inclui o pitch)
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    const start = new THREE.Vector3();
    this.camera.getWorldPosition(start);
    start.addScaledVector(dir, 1.5);

    // Picolé (cores aleatórias de sabor 🍓🍋🫐)
    const flavors = [0xff5a8a, 0xffe14d, 0x6ab0ff, 0x7CFC00, 0xff9a3d];
    const mat = new THREE.MeshStandardMaterial({
      color: flavors[(Math.random() * flavors.length) | 0], emissive: 0x222222, roughness: 0.4,
    });
    const pop = new THREE.Group();
    const ice = new THREE.Mesh(this._popGeo, mat);
    const stick = new THREE.Mesh(this._stickGeo, new THREE.MeshStandardMaterial({ color: 0xc8a060 }));
    stick.position.y = -0.5;
    pop.add(ice); pop.add(stick);
    pop.position.copy(start);
    this.scene.add(pop);

    this.projectiles.push({
      mesh: pop,
      vel: dir.multiplyScalar(this.projSpeed),
      life: 1.6,
      dead: false,
    });
    return true;
  }

  _kill(p) {
    p.dead = true;
    this.scene.remove(p.mesh);
    p.mesh.traverse((o) => { if (o.geometry && o.geometry !== this._popGeo && o.geometry !== this._stickGeo) o.geometry.dispose(); });
  }

  reset() {
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles = [];
    this.kills = 0;
    this.cooldown = 0;
  }
}
