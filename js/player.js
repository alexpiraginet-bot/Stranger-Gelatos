import * as THREE from 'three';
import { CONFIG } from './config.js';

export class Player {
  constructor(camera, scene, level, spawn) {
    this.camera = camera;
    this.scene = scene;
    this.level = level;

    this.x = spawn.x;
    this.z = spawn.z;
    this.yaw = 0;
    this.pitch = 0;

    this.health = CONFIG.MAX_HEALTH;
    this.battery = 100;
    this.keys = 0;
    this.hurtTimer = 0;
    this.attackTimer = 0;

    this.camera.rotation.order = 'YXZ';

    this._setupFlashlight();
    this.syncCamera();
  }

  _setupFlashlight() {
    // Lanterna = SpotLight presa à câmera, apontando para frente
    this.flashlight = new THREE.SpotLight(
      0xfff2d0, 6, CONFIG.FLASH_DISTANCE, CONFIG.FLASH_ANGLE, 0.4, 1.2
    );
    this.flashlight.position.set(0, 0, 0);
    this.flashTarget = new THREE.Object3D();
    this.flashTarget.position.set(0, 0, -1);
    this.camera.add(this.flashlight);
    this.camera.add(this.flashTarget);
    this.flashlight.target = this.flashTarget;

    // Luz de preenchimento mínima ao redor (pra nunca ficar 100% cego)
    this.glow = new THREE.PointLight(0x4a2a55, 1.2, 14, 2);
    this.camera.add(this.glow);
  }

  get forward() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  update(dt, controls) {
    // ----- Olhar -----
    const look = controls.consumeLook();
    this.yaw -= look.dx;
    this.pitch -= look.dy;
    const lim = Math.PI / 2 - 0.05;
    this.pitch = Math.max(-lim, Math.min(lim, this.pitch));

    // ----- Movimento -----
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    let speed = CONFIG.MOVE_SPEED * (controls.running ? CONFIG.RUN_MULT : 1);
    let dx = (rx * controls.move.x + fx * controls.move.y) * speed * dt;
    let dz = (rz * controls.move.x + fz * controls.move.y) * speed * dt;

    let nx = this.x + dx;
    let nz = this.z + dz;
    const res = this.level.resolveCollision(nx, nz, CONFIG.PLAYER_RADIUS);
    this.x = res.x;
    this.z = res.z;

    // Correr drena bateria mais rápido
    const drain = CONFIG.BATTERY_DRAIN * (controls.running ? 1.4 : 1);
    this.battery = Math.max(0, this.battery - drain * dt);
    this._updateFlashlight();

    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.attackTimer > 0) this.attackTimer -= dt;

    this.syncCamera();
  }

  _updateFlashlight() {
    const t = this.battery / 100;
    this.flashlight.intensity = 1.2 + t * 6;            // some quando acaba
    this.flashlight.distance = CONFIG.FLASH_DISTANCE * (0.45 + t * 0.55);
    // leve tremulação
    this.flashlight.intensity *= 0.95 + Math.random() * 0.1;
  }

  syncCamera() {
    this.camera.position.set(this.x, CONFIG.EYE_HEIGHT, this.z);
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  takeDamage(n) {
    if (this.hurtTimer > 0) return false;
    this.health -= n;
    this.hurtTimer = CONFIG.HURT_COOLDOWN;
    return true;
  }

  addBattery(n) { this.battery = Math.min(100, this.battery + n); }

  heal(n) { this.health = Math.min(CONFIG.MAX_HEALTH, this.health + n); }

  triggerAttack() { this.attackTimer = 0.3; }
  get isAttacking() { return this.attackTimer > 0; }
}
