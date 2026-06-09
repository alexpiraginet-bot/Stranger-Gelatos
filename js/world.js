import { CONFIG, COLORS } from './config.js';

// O mundo é uma grade de tiles. 1 = parede, 0 = chão.
export class World {
  constructor() {
    this.cols = CONFIG.MAP_COLS;
    this.rows = CONFIG.MAP_ROWS;
    this.tile = CONFIG.TILE;
    this.width = this.cols * this.tile;
    this.height = this.rows * this.tile;
    this.grid = this._generate();
    this._decorations = this._buildDecorations();
  }

  // Gera um mapa com bordas, salas e pilares. Garante chão aberto o suficiente
  // para o jogador circular sem becos fechados.
  _generate() {
    const { cols, rows } = this;
    const g = Array.from({ length: rows }, () => new Array(cols).fill(0));

    // Bordas
    for (let x = 0; x < cols; x++) { g[0][x] = 1; g[rows - 1][x] = 1; }
    for (let y = 0; y < rows; y++) { g[y][0] = 1; g[y][cols - 1] = 1; }

    // Blocos internos espalhados (formam um "labirinto" suave)
    const blocks = [
      [4, 3, 3, 1], [4, 8, 1, 4], [9, 4, 4, 1], [3, 14, 4, 1],
      [4, 18, 1, 4], [10, 10, 3, 1], [10, 14, 1, 4], [14, 6, 1, 5],
      [17, 3, 4, 1], [20, 6, 1, 5], [16, 13, 4, 1], [22, 10, 3, 1],
      [24, 4, 1, 5], [7, 19, 5, 1], [15, 18, 1, 4], [19, 16, 4, 1],
      [23, 15, 1, 5], [8, 11, 1, 3], [12, 20, 4, 1],
    ];
    for (const [bx, by, w, h] of blocks) {
      for (let y = by; y < by + h && y < rows - 1; y++) {
        for (let x = bx; x < bx + w && x < cols - 1; x++) {
          if (x > 0 && y > 0) g[y][x] = 1;
        }
      }
    }
    return g;
  }

  // Pré-calcula posições de decoração (esporos/veias) por tile, fixas.
  _buildDecorations() {
    const decos = [];
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.grid[y][x] === 0 && Math.random() < 0.08) {
          decos.push({
            x: x * this.tile + Math.random() * this.tile,
            y: y * this.tile + Math.random() * this.tile,
            r: 2 + Math.random() * 3,
          });
        }
      }
    }
    return decos;
  }

  isWall(col, row) {
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return true;
    return this.grid[row][col] === 1;
  }

  // Colisão de uma caixa (x,y,w,h em pixels) com paredes
  collidesBox(x, y, w, h) {
    const left = Math.floor(x / this.tile);
    const right = Math.floor((x + w) / this.tile);
    const top = Math.floor(y / this.tile);
    const bottom = Math.floor((y + h) / this.tile);
    for (let r = top; r <= bottom; r++) {
      for (let c = left; c <= right; c++) {
        if (this.isWall(c, r)) return true;
      }
    }
    return false;
  }

  // Retorna posições (centro em pixels) de tiles de chão livres
  freeFloorTiles() {
    const tiles = [];
    for (let y = 1; y < this.rows - 1; y++) {
      for (let x = 1; x < this.cols - 1; x++) {
        if (this.grid[y][x] === 0) {
          tiles.push({ x: x * this.tile + this.tile / 2, y: y * this.tile + this.tile / 2 });
        }
      }
    }
    return tiles;
  }

  draw(ctx, cam) {
    const t = this.tile;
    const startCol = Math.max(0, Math.floor(cam.x / t));
    const endCol = Math.min(this.cols, Math.ceil((cam.x + CONFIG.WIDTH) / t));
    const startRow = Math.max(0, Math.floor(cam.y / t));
    const endRow = Math.min(this.rows, Math.ceil((cam.y + CONFIG.HEIGHT) / t));

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const px = Math.floor(col * t - cam.x);
        const py = Math.floor(row * t - cam.y);
        if (this.grid[row][col] === 1) {
          // Parede com "topo" e veias do Mundo Invertido
          ctx.fillStyle = COLORS.wall;
          ctx.fillRect(px, py, t, t);
          ctx.fillStyle = COLORS.wallTop;
          ctx.fillRect(px, py, t, 6);
          ctx.strokeStyle = COLORS.wallVine;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(px + 6, py + t);
          ctx.lineTo(px + 14, py + t * 0.4);
          ctx.lineTo(px + 26, py + t * 0.7);
          ctx.lineTo(px + 32, py + 4);
          ctx.stroke();
        } else {
          // Chão xadrez sutil
          ctx.fillStyle = (col + row) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;
          ctx.fillRect(px, py, t, t);
        }
      }
    }

    // Esporos flutuantes (decoração)
    ctx.fillStyle = COLORS.spore;
    for (const d of this._decorations) {
      const px = d.x - cam.x;
      const py = d.y - cam.y;
      if (px < -10 || px > CONFIG.WIDTH + 10 || py < -10 || py > CONFIG.HEIGHT + 10) continue;
      ctx.beginPath();
      ctx.arc(px, py, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
