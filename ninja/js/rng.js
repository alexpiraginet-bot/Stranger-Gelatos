// Gerador pseudoaleatório determinístico (mulberry32).
// A fase 37 do ciclo 2 é SEMPRE a mesma fase — dá pra treinar e decorar.
export function makeRng(seed) {
  let a = seed >>> 0;
  const r = () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (lo, hi) => lo + r() * (hi - lo);
  r.int = (lo, hi) => Math.floor(lo + r() * (hi - lo + 1));
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.chance = (p) => r() < p;
  return r;
}

export function hashSeed(...nums) {
  let h = 2166136261 >>> 0;
  for (const n of nums) {
    h ^= (n | 0) + 0x9e3779b9;
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
