import { CONFIG } from './config.js';

// Dados puros do nível: grade de paredes, colisão e pontos livres.
// Sem dependência de Three.js — assim dá para testar a lógica isoladamente.
export class Level {
  constructor(size = CONFIG.GRID, rand = Math.random) {
    this.size = size;
    this.cell = CONFIG.CELL;
    this.rand = rand;
    this.grid = this._generate();
  }

  _generate() {
    const n = this.size;
    const g = Array.from({ length: n }, () => new Array(n).fill(0));

    // Bordas sólidas
    for (let i = 0; i < n; i++) {
      g[0][i] = 1; g[n - 1][i] = 1; g[i][0] = 1; g[i][n - 1] = 1;
    }

    // Pilares/blocos internos espaçados (deixa corredores largos para o 1ª pessoa)
    for (let z = 2; z < n - 2; z += 2) {
      for (let x = 2; x < n - 2; x += 2) {
        if (this.rand() < 0.55) {
          g[z][x] = 1;
          // ocasionalmente estende o bloco para formar uma "parede"
          if (this.rand() < 0.4) {
            const dir = this.rand() < 0.5 ? [0, 1] : [1, 0];
            const nz = z + dir[0], nx = x + dir[1];
            if (nz > 0 && nz < n - 1 && nx > 0 && nx < n - 1) g[nz][nx] = 1;
          }
        }
      }
    }
    return g;
  }

  isWall(cx, cz) {
    if (cx < 0 || cz < 0 || cx >= this.size || cz >= this.size) return true;
    return this.grid[cz][cx] === 1;
  }

  // Converte célula -> centro em coordenadas do mundo (x, z)
  cellToWorld(cx, cz) {
    const off = (this.size * this.cell) / 2;
    return {
      x: cx * this.cell - off + this.cell / 2,
      z: cz * this.cell - off + this.cell / 2,
    };
  }

  worldToCell(x, z) {
    const off = (this.size * this.cell) / 2;
    return {
      cx: Math.floor((x + off) / this.cell),
      cz: Math.floor((z + off) / this.cell),
    };
  }

  // Resolve colisão de um círculo (raio r) no plano XZ contra paredes.
  // Retorna a nova posição {x, z} já corrigida (slide nas paredes).
  resolveCollision(x, z, r) {
    const { cx, cz } = this.worldToCell(x, z);
    // Checa as 9 células ao redor
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ncx = cx + dx, ncz = cz + dz;
        if (!this.isWall(ncx, ncz)) continue;
        const c = this.cellToWorld(ncx, ncz);
        const half = this.cell / 2;
        // Ponto mais próximo do AABB da parede
        const nearestX = Math.max(c.x - half, Math.min(x, c.x + half));
        const nearestZ = Math.max(c.z - half, Math.min(z, c.z + half));
        let ox = x - nearestX;
        let oz = z - nearestZ;
        const dist = Math.hypot(ox, oz);
        if (dist < r) {
          if (dist === 0) { ox = 1; oz = 0; }
          const push = (r - dist) / (dist || 1);
          x += ox * push;
          z += oz * push;
        }
      }
    }
    return { x, z };
  }

  // Lista de centros de células livres (chão)
  freeCells() {
    const out = [];
    for (let z = 1; z < this.size - 1; z++) {
      for (let x = 1; x < this.size - 1; x++) {
        if (this.grid[z][x] === 0) out.push({ cx: x, cz: z, ...this.cellToWorld(x, z) });
      }
    }
    return out;
  }
}
