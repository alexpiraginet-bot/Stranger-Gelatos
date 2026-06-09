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
    this.spawnAtStart();
  }

  spawnAtStart() {
    const s = this.level.playerStart;
    this.body = {
      x: s.cx * CONFIG.TILE, y: (s.cy) * CONFIG.TILE,
      w: CONFIG.PLAYER_W, h: CONFIG.PLAYER_H, vx: 0, vy: 0, onGround: false,
    };
    this.lastSafe = { x: this.body.x, y: this.body.y };
    this.coyote = 0; this.jumpBuf = 0; this.fireCd = 0;
    this.hurtTimer = 0; this.shootAnim = 0; this.animT = 0;
  }

  get cx() { return this.body.x + this.body.w / 2; }
  get cy() { return this.body.y + this.body.h / 2; }

  update(dt, input) {
    const b = this.body;
    const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const speed = CONFIG.MOVE_SPEED * (input.run ? CONFIG.RUN_MULT : 1);
    b.vx = moveX * speed;
    if (moveX !== 0) this.facing = moveX;

    // pulo com coyote-time + buffer
    this.coyote = b.onGround ? CONFIG.COYOTE : this.coyote - dt;
    if (input.consumeJump()) this.jumpBuf = CONFIG.JUMP_BUFFER; else this.jumpBuf -= dt;
    if (this.jumpBuf > 0 && this.coyote > 0) {
      b.vy = -CONFIG.JUMP_VEL; this.coyote = 0; this.jumpBuf = 0;
      this.game.audio?.jump();
    }
    // pulo variável (solta cedo = sobe menos)
    if (!input.jumpHeld && b.vy < 0) b.vy *= 0.86;

    b.vy = Math.min(b.vy + CONFIG.GRAVITY * dt, CONFIG.MAX_FALL);
    moveBody(this.level, b, dt);

    // tiro
    this.fireCd -= dt;
    if (input.shootHeld && this.fireCd <= 0 && this.ammo > 0) {
      this.ammo--;
      this.fireCd = CONFIG.FIRE_RATE;
      this.shootAnim = 0.18;
      const px = this.facing > 0 ? b.x + b.w : b.x - 6;
      this.game.spawnProjectile(px, b.y + 8, this.facing);
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

  hurt(n) {
    if (this.hurtTimer > 0) return false;
    this.health -= n;
    this.hurtTimer = CONFIG.HURT_COOLDOWN;
    this.game.audio?.hurt();
    return true;
  }

  heal(n) { this.health = Math.min(CONFIG.MAX_HEALTH, this.health + n); }
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
    const sx = (b.x - 6 - cam.x) * cam.s;
    const sy = (b.y - 4 - cam.y) * cam.s;
    ctx.save();
    if (this.facing < 0) {
      ctx.translate(sx + img.width * cam.s, sy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, img.width * cam.s, img.height * cam.s);
    } else {
      ctx.drawImage(img, sx, sy, img.width * cam.s, img.height * cam.s);
    }
    ctx.restore();
  }
}
