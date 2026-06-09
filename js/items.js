import * as THREE from 'three';
import { CONFIG, COLORS } from './config.js';

export class Item {
  constructor(scene, type, spawn) {
    this.scene = scene;
    this.type = type; // 'key' | 'battery' | 'portal'
    this.x = spawn.x;
    this.z = spawn.z;
    this.collected = false;
    this.phase = Math.random() * Math.PI * 2;
    this.mesh = this._build();
    this.scene.add(this.mesh);
  }

  _build() {
    const g = new THREE.Group();
    if (this.type === 'key') {
      const mat = new THREE.MeshStandardMaterial({ color: COLORS.key, emissive: 0x6b5400, metalness: 0.6, roughness: 0.3 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.22, 8, 16), mat);
      ring.position.y = 2.2;
      g.add(ring);
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.2, 0.25), mat);
      stem.position.y = 1.2;
      g.add(stem);
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.25), mat);
      tooth.position.set(0.3, 0.7, 0);
      g.add(tooth);
      this.light = new THREE.PointLight(COLORS.key, 3, 12, 2);
      this.light.position.y = 2;
      g.add(this.light);
    } else if (this.type === 'battery') {
      const mat = new THREE.MeshStandardMaterial({ color: COLORS.battery, emissive: 0x2a5500, metalness: 0.4, roughness: 0.4 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.8, 12), mat);
      body.position.y = 1.8;
      g.add(body);
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.3, 8), mat);
      tip.position.y = 2.85;
      g.add(tip);
      this.light = new THREE.PointLight(COLORS.battery, 2.5, 10, 2);
      this.light.position.y = 1.8;
      g.add(this.light);
    } else if (this.type === 'whey') {
      // Pote de whey (regenera vida) — estilo Roblox, com tampa e cruz de saúde
      const tubMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f5, roughness: 0.5 });
      const lidMat = new THREE.MeshStandardMaterial({ color: COLORS.whey, emissive: 0x551028, roughness: 0.4 });
      const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.7, 16), tubMat);
      tub.position.y = 1.5;
      g.add(tub);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.5, 16), lidMat);
      lid.position.y = 2.55;
      g.add(lid);
      // cruz de saúde na frente
      const crossMat = new THREE.MeshStandardMaterial({ color: 0xff3b6b, emissive: 0x551028 });
      const cv = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.8, 0.05), crossMat);
      cv.position.set(0, 1.5, 0.86); g.add(cv);
      const ch = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.05), crossMat);
      ch.position.set(0, 1.5, 0.86); g.add(ch);
      this.light = new THREE.PointLight(COLORS.whey, 2.5, 11, 2);
      this.light.position.y = 1.8;
      g.add(this.light);
    } else if (this.type === 'freezer') {
      // Freezer escondido (baú) com munição Bentolés
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe8f6fa, roughness: 0.4, metalness: 0.2 });
      const trimMat = new THREE.MeshStandardMaterial({ color: COLORS.freezer, emissive: 0x114455, emissiveIntensity: 0.5, roughness: 0.3, metalness: 0.3 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.7, 1.7), bodyMat);
      body.position.y = 0.95;
      g.add(body);
      // tampa levemente aberta
      const lid = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.3, 1.8), trimMat);
      lid.position.set(0, 1.9, -0.6);
      lid.rotation.x = -0.5;
      g.add(lid);
      // faixa de gelo
      const band = new THREE.Mesh(new THREE.BoxGeometry(2.62, 0.4, 1.72), trimMat);
      band.position.y = 1.1;
      g.add(band);
      // picolé visível dentro
      const pop = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 0.2),
        new THREE.MeshStandardMaterial({ color: 0xff5a8a, emissive: 0x551020 }));
      pop.position.set(0, 1.5, 0.3);
      g.add(pop);
      this.light = new THREE.PointLight(COLORS.freezer, 2.2, 12, 2);
      this.light.position.set(0, 1.6, 0);
      g.add(this.light);
    } else if (this.type === 'portal') {
      const mat = new THREE.MeshStandardMaterial({ color: COLORS.portal, emissive: COLORS.portal, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
      this.ring = new THREE.Mesh(new THREE.TorusGeometry(3, 0.6, 12, 32), mat);
      this.ring.position.y = 3.5;
      g.add(this.ring);
      const innerMat = new THREE.MeshBasicMaterial({ color: 0x2a0044, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
      this.inner = new THREE.Mesh(new THREE.CircleGeometry(2.6, 32), innerMat);
      this.inner.position.y = 3.5;
      g.add(this.inner);
      this.light = new THREE.PointLight(COLORS.portal, 5, 30, 2);
      this.light.position.y = 3.5;
      g.add(this.light);
    }
    g.position.set(this.x, 0, this.z);
    return g;
  }

  get radius() {
    if (this.type === 'portal') return 3.5;
    if (this.type === 'freezer') return 2.6;
    return 2.2;
  }

  update(dt, time, camera) {
    if (this.collected) return;
    this.phase += dt;
    if (this.type === 'portal') {
      this.ring.rotation.z += dt * 1.2;
      this.ring.rotation.y += dt * 0.6;
      if (this.inner && camera) this.inner.lookAt(camera.position);
      this.light.intensity = 4 + Math.sin(time * 3) * 1.5;
    } else if (this.type === 'freezer') {
      // baú no chão: só pulsa a luz fria (não flutua nem gira)
      if (this.light) this.light.intensity = 1.8 + Math.sin(time * 2.5) * 0.7;
    } else {
      this.mesh.rotation.y += dt * 1.5;
      this.mesh.position.y = Math.sin(this.phase * 2) * 0.3;
    }
  }

  collidesPlayer(player) {
    return Math.hypot(player.x - this.x, player.z - this.z) < this.radius + CONFIG.PLAYER_RADIUS;
  }

  collect() {
    this.collected = true;
    this.scene.remove(this.mesh);
    this.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
}
