import { CONFIG } from './config.js';
import { Assets } from './assets.js';
import { aabb } from './physics.js';

const SIZE = {
  key: [16, 16], whey: [16, 18], freezer: [22, 16], coin: [12, 14],
  portal: [34, 52], shop: [96, 80],
};

export class Item {
  constructor(level, type, cx, cy) {
    this.level = level;
    this.type = type;
    this.collected = false;
    this.t = Math.random() * Math.PI * 2;
    const [w, h] = SIZE[type] || [16, 16];
    const cxPx = cx * CONFIG.TILE + CONFIG.TILE / 2;
    const bottom = (cy + 1) * CONFIG.TILE;
    this.box = { x: cxPx - w / 2, y: bottom - h, w, h };
    this.bob = (type === 'key' || type === 'whey' || type === 'freezer' || type === 'coin');
  }

  collidesPlayer(player) { return !this.collected && aabb(this.box, player.body); }
  collect() { this.collected = true; }

  draw(ctx, cam, time) {
    if (this.collected) return;
    let name = this.type;
    if (this.type === 'portal') name = ['portal1', 'portal2', 'portal3'][Math.floor(time * 6) % 3];
    const img = Assets.img(name);
    if (!img) return;
    const off = this.bob ? Math.sin(time * 3 + this.t) * 2 : 0;
    const sx = (this.box.x - cam.x) * cam.s;
    const sy = (this.box.y + off - cam.y) * cam.s;
    ctx.drawImage(img, sx, sy, img.width * cam.s, img.height * cam.s);
  }
}
