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
    this.big = false;       // power-up whey (estilo cogumelo do Mario)
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
    this.landT = 0; this.knockT = 0; this.airJumps = 0; this.growT = 0;
    this.face = 1; this.runPhase = 0;
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
    const goingUp = b.vy < 0;
    moveBody(this.level, b, dt);
    // cabeçada em bloco "?" (estilo Mario)
    if (goingUp && b.vy === 0) {
      const T = CONFIG.TILE;
      const ceilRow = Math.floor((b.y - 1) / T);
      const x0 = Math.floor((b.x + 2) / T), x1 = Math.floor((b.x + b.w - 3) / T);
      for (let cxq = x0; cxq <= x1; cxq++) {
        if (this.level.tile(cxq, ceilRow) === 'Q') { this.game.hitQBox?.(cxq, ceilRow); break; }
      }
    }
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
      this.game.spawnProjectile(px, b.y + 8, this.facing, (this.bazooka ? 3 : 1) + (this.big ? 1 : 0));
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
    if (this.growT > 0) this.growT -= dt;
    // virada suave + cadência de corrida proporcional à velocidade
    this.face += (this.facing - this.face) * Math.min(1, dt * 18);
    this.runPhase += Math.abs(b.vx) * dt * 0.085;
    this.animT += dt;
  }

  _fall() {
    if (this.hurt(1)) {
      const b = this.body;
      b.x = this.lastSafe.x; b.y = this.lastSafe.y - 20; b.vx = 0; b.vy = 0;
    }
  }

  _knock(fromX) {
    if (fromX !== undefined) {
      this.body.vx = (this.cx < fromX ? -1 : 1) * 175;
      this.body.vy = -190;
      this.knockT = 0.22;
    }
  }

  hurt(n, fromX) {
    if (this.hurtTimer > 0) return false;
    this.hurtTimer = this.game.diff?.hurtCd ?? CONFIG.HURT_COOLDOWN;
    this._knock(fromX);
    this.game.hitStop?.(0.06);
    this.game.audio?.hurt();
    if (this.big) {                 // estilo Mario: encolhe em vez de perder vida
      this.big = false;
      this.game.shake?.(6);
      this.game.burst?.(this.cx, this.cy, '#ffd0e6', 10);
      return false;
    }
    this.health -= n;
    this.game.shake?.(7);
    return true;
  }

  grow() {                          // power-up whey: cresce e fica mais forte
    this.big = true;
    this.growT = 0.7;               // pulso de transformação (estilo Mario)
    this.game.shake?.(6); this.game.hitStop?.(0.05);
    this.game.burst?.(this.cx, this.cy, '#7CFC00', 16);
    this.heal(1);
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
    else if (Math.abs(b.vx) > 5) name = 'player_run' + (1 + (Math.floor(this.runPhase) % 6)); // cadência por velocidade
    const img = Assets.img(name);
    if (!img) return;
    // squash & stretch (estica no ar, achata ao pousar)
    let sxr = 1, syr = 1;
    if (!b.onGround) { const k = Math.max(-1, Math.min(1, b.vy / 520)); sxr = 1 - k * 0.12; syr = 1 + k * 0.12; }
    else if (this.landT > 0) { const p = this.landT / 0.12; sxr = 1 + 0.28 * p; syr = 1 - 0.28 * p; }
    // escala "super": maior + pulso de transformação (flicker estilo Mario)
    let bigS = this.big ? 1.45 : 1;
    if (this.growT > 0) bigS = 1.0 + 0.5 * Math.abs(Math.sin(this.growT * 26));
    // aura verde pulsante (estilo DBZ) enquanto grande
    if (this.big) {
      const t = this.game.time || 0;
      const pulse = 0.5 + 0.5 * Math.sin(t * 7);
      const cxp = (this.cx - cam.x) * cam.s, cyp = (this.cy - cam.y) * cam.s;
      const rad = (img.height * 0.7 + pulse * 8) * cam.s;
      const grd = ctx.createRadialGradient(cxp, cyp, rad * 0.2, cxp, cyp, rad);
      grd.addColorStop(0, `rgba(150,255,90,${(0.28 + 0.18 * pulse).toFixed(2)})`);
      grd.addColorStop(1, 'rgba(124,252,0,0)');
      ctx.save(); ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(cxp, cyp, rad, 0, 6.29); ctx.fill(); ctx.restore();
      if (Math.random() < 0.25) this.game.burst?.(this.cx + (Math.random() - 0.5) * 14, b.y + b.h - Math.random() * b.h, '#aaff66', 1);
    }
    const dw = img.width * cam.s * sxr * bigS, dh = img.height * cam.s * syr * bigS;
    // respiração suave quando parado
    let bob = 0;
    if (name === 'player_idle') bob = Math.sin((this.game.time || 0) * 3) * 1.4 * cam.s;
    const footX = b.x + b.w / 2, footY = b.y + b.h;
    const sx = (footX - cam.x) * cam.s - dw / 2;       // centro na hitbox
    const sy = (footY - cam.y) * cam.s - dh - bob;     // base nos pés
    // virada suave (escala X interpolada em vez de espelhar instantâneo)
    let fx = this.face; if (Math.abs(fx) < 0.06) fx = fx < 0 ? -0.06 : 0.06;
    ctx.save();
    ctx.translate(sx + dw / 2, sy); ctx.scale(fx, 1);
    ctx.drawImage(img, -dw / 2, 0, dw, dh);
    ctx.restore();
  }
}
