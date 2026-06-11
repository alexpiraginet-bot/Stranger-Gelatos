import { CONFIG } from './config.js';
import { moveBody, touchesHazard } from './physics.js';
import { Assets } from './assets.js';

export class Player {
  constructor(level, game) {
    this.level = level;
    this.game = game;
    this.health = CONFIG.MAX_HEALTH;
    this.ammo = CONFIG.START_AMMO;
    this.keys = 0;
    this.coins = 0;
    this.facing = 1;
    this.bazooka = false;   // upgrade: bazuca de gelato (3x dano)
    this.spawnAtStart();
  }

  spawnAtStart() {
    const s = this.level.playerStart;
    this.body = {
      x: s.cx * CONFIG.TILE,
      y: (s.cy + 1) * CONFIG.TILE - CONFIG.PLAYER_H, // pés no topo do chão (sem afundar)
      w: CONFIG.PLAYER_W, h: CONFIG.PLAYER_H, vx: 0, vy: 0, onGround: false,
    };
    this.lastSafe = { x: this.body.x, y: this.body.y };
    this.coyote = 0; this.jumpBuf = 0; this.fireCd = 0;
    this.hurtTimer = 0; this.shootAnim = 0; this.animT = 0;
    this.landT = 0; this.knockT = 0; this.airJumps = 0;
  }

  get cx() { return this.body.x + this.body.w / 2; }
  get cy() { return this.body.y + this.body.h / 2; }

  update(dt, input) {
    const b = this.body;
    const onG = b.onGround;
    const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const target = moveX * CONFIG.MOVE_SPEED * (input.run ? CONFIG.RUN_MULT : 1);

    // movimento com aceleração/atrito (sensação Nintendo); knockback ignora controle
    if (this.knockT > 0) {
      this.knockT -= dt;
    } else if (moveX !== 0) {
      let accel = onG ? CONFIG.GROUND_ACCEL : CONFIG.AIR_ACCEL;
      if (b.vx !== 0 && Math.sign(moveX) !== Math.sign(b.vx)) accel *= CONFIG.TURN_BOOST;
      if (!onG && Math.abs(b.vy) < CONFIG.APEX_THRESHOLD) accel *= CONFIG.APEX_ACCEL_MULT;
      b.vx += Math.sign(target) * accel * dt;
      b.vx = target > 0 ? Math.min(b.vx, target) : Math.max(b.vx, target);
      this.facing = moveX;
    } else {
      const fr = (onG ? CONFIG.GROUND_FRICTION : CONFIG.AIR_FRICTION) * dt;
      if (Math.abs(b.vx) <= fr) b.vx = 0; else b.vx -= Math.sign(b.vx) * fr;
    }

    // pulo: simples (com coyote/buffer) + pulo DUPLO no ar
    this.coyote = onG ? CONFIG.COYOTE : this.coyote - dt;
    if (onG) this.airJumps = CONFIG.AIR_JUMPS;
    if (input.consumeJump()) this.jumpBuf = CONFIG.JUMP_BUFFER; else this.jumpBuf -= dt;
    if (this.jumpBuf > 0) {
      if (this.coyote > 0) {           // 1º pulo (do chão)
        b.vy = -CONFIG.JUMP_VEL; this.coyote = 0; this.jumpBuf = 0; this.game.audio?.jump();
      } else if (this.airJumps > 0) {  // 2º pulo (duplo, no ar)
        b.vy = -CONFIG.JUMP2_VEL; this.airJumps--; this.jumpBuf = 0;
        this.game.audio?.jump(); this.game.doubleFx?.(this.cx, b.y + b.h);
      }
    }
    if (!input.jumpHeld && b.vy < 0) b.vy *= 0.86; // pulo variável (toque = curto)

    // gravidade variável: queda mais pesada + "apex hang" no topo
    let g = CONFIG.GRAVITY;
    if (b.vy > 0) g *= CONFIG.FALL_GRAVITY_MULT;
    if (!onG && Math.abs(b.vy) < CONFIG.APEX_THRESHOLD) g *= CONFIG.APEX_GRAVITY_MULT;
    b.vy = Math.min(b.vy + g * dt, CONFIG.MAX_FALL);

    const fallVy = b.vy;
    moveBody(this.level, b, dt);
    // pouso: poeira + "squash"
    if (!onG && b.onGround && fallVy > 130) {
      this.landT = 0.12;
      this.game.onLand?.(this.cx, b.y + b.h);
    }
    if (this.landT > 0) this.landT -= dt;

    // tiro
    this.fireCd -= dt;
    if (input.shootHeld && this.fireCd <= 0 && this.ammo > 0) {
      this.ammo--;
      this.fireCd = CONFIG.FIRE_RATE;
      this.shootAnim = 0.18;
      const px = this.facing > 0 ? b.x + b.w : b.x - 6;
      this.game.spawnProjectile(px, b.y + 8, this.facing, this.bazooka ? 3 : 1);
      this.game.spawnMuzzle?.(px + this.facing * 4, b.y + 9);
      if (b.onGround && this.knockT <= 0) b.vx -= this.facing * 12; // leve recuo
      this.game.audio?.shoot();
    } else if (input.shootHeld && this.fireCd <= 0 && this.ammo <= 0) {
      this.fireCd = 0.3; this.game.audio?.empty();
    }

    // perigos / queda no vão
    if (touchesHazard(this.level, b)) this._fall();
    if (b.y > this.level.heightPx + 48) this._fall();
    if (b.onGround && !touchesHazard(this.level, b)) this.lastSafe = { x: b.x, y: b.y - 2 };

    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    if (this.shootAnim > 0) this.shootAnim -= dt;
    this.animT += dt * (Math.abs(b.vx) > 5 ? 1 : 0);
  }

  _fall() {
    if (this.hurt(1)) {
      const b = this.body;
      b.x = this.lastSafe.x; b.y = this.lastSafe.y - 20; b.vx = 0; b.vy = 0;
    }
  }

  hurt(n, fromX) {
    if (this.hurtTimer > 0) return false;
    this.health -= n;
    this.hurtTimer = this.game.diff?.hurtCd ?? CONFIG.HURT_COOLDOWN;
    if (fromX !== undefined) {
      this.body.vx = (this.cx < fromX ? -1 : 1) * 175;
      this.body.vy = -190;
      this.knockT = 0.22;
    }
    this.game.shake?.(7);
    this.game.hitStop?.(0.07);
    this.game.audio?.hurt();
    return true;
  }

  heal(n) { this.health = Math.min(this.maxHealth ?? CONFIG.MAX_HEALTH, this.health + n); }
  addAmmo(n) { this.ammo = Math.min(CONFIG.MAX_AMMO, this.ammo + n); }
  bounce() { this.body.vy = -CONFIG.STOMP_BOUNCE; }

  draw(ctx, cam) {
    // pisca quando levou dano
    if (this.hurtTimer > 0 && Math.floor(this.hurtTimer * 12) % 2 === 0) return;
    let name = 'player_idle';
    const b = this.body;
    if (!b.onGround) name = 'player_jump';
    else if (this.shootAnim > 0) name = 'player_shoot';
    else if (Math.abs(b.vx) > 5) name = (Math.floor(this.animT * 8) % 2 === 0) ? 'player_run1' : 'player_run2';
    const img = Assets.img(name);
    if (!img) return;
    // squash & stretch (estica no ar, achata ao pousar)
    let sxr = 1, syr = 1;
    if (!b.onGround) { const k = Math.max(-1, Math.min(1, b.vy / 520)); sxr = 1 - k * 0.12; syr = 1 + k * 0.12; }
    else if (this.landT > 0) { const p = this.landT / 0.12; sxr = 1 + 0.28 * p; syr = 1 - 0.28 * p; }
    const w = img.width * cam.s, h = img.height * cam.s;
    const dw = w * sxr, dh = h * syr;
    const sx = (b.x - 6 - cam.x) * cam.s + (w - dw) / 2;
    const sy = (b.y - 4 - cam.y) * cam.s + (h - dh);  // ancora nos pés
    ctx.save();
    if (this.facing < 0) {
      ctx.translate(sx + dw, sy); ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, dw, dh);
    } else {
      ctx.drawImage(img, sx, sy, dw, dh);
    }
    ctx.restore();
  }
}
