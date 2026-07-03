// ===== Estado do álbum: colada/faltando/repetidas + código de troca =====
import { STICKERS, TOTAL, SECTIONS } from './album.js';

const KEY = 'copa26-album';
const store = (typeof localStorage !== 'undefined') ? localStorage : { getItem() { return null; }, setItem() {}, removeItem() {} };

// st[id] = [colada(0/1), repetidas(int)] — ausente = faltando sem repetida
export const state = { st: {}, name: '', cloudCode: '' };

export function load() {
  try {
    const raw = store.getItem(KEY);
    if (raw) Object.assign(state, JSON.parse(raw));
    if (!state.st) state.st = {};
  } catch (e) { state.st = {}; }
}
export function save() { try { store.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

export function get(id) { return state.st[id] || [0, 0]; }
export function isGlued(id) { return get(id)[0] === 1; }
export function dups(id) { return get(id)[1] || 0; }

export function setGlued(id, on) {
  const [, d] = get(id);
  if (!on && !d) delete state.st[id]; else state.st[id] = [on ? 1 : 0, d];
  save();
}
export function addDup(id, delta) {
  const [g, d] = get(id);
  const nd = Math.max(0, Math.min(99, d + delta));
  if (!g && !nd) delete state.st[id]; else state.st[id] = [g, nd];
  save();
}
export function clearSticker(id) { delete state.st[id]; save(); }

// ---- estatísticas ----
export function stats(secCode) {
  let glued = 0, dupTotal = 0, total = 0;
  for (const s of STICKERS) {
    if (secCode && s.sec !== secCode) continue;
    total++;
    const [g, d] = get(s.id);
    if (g) glued++;
    dupTotal += d;
  }
  return { glued, missing: total - glued, dups: dupTotal, total, pct: total ? Math.round((glued / total) * 100) : 0 };
}

export function missingList() { return STICKERS.filter((s) => !isGlued(s.id)); }
export function dupList() { return STICKERS.filter((s) => dups(s.id) > 0); }

// ---- Código de troca (compacto, dá pra mandar no WhatsApp) ----
// símbolo por cromo: A=faltando · B=colada · C..I=colada+1..7+ repetidas · J=repetida sem colar
const SYM = 'ABCDEFGHIJ';
function symbolFor(id) {
  const [g, d] = get(id);
  if (!g) return d > 0 ? 9 : 0;
  return 1 + Math.min(d, 7);
}
export function exportCode() {
  let out = 'COPA1-', run = 0, cur = -1;
  const flush = () => { if (run > 0) out += SYM[cur] + (run > 1 ? String(run) : ''); };
  for (const s of STICKERS) {
    const v = symbolFor(s.id);
    if (v === cur) run++; else { flush(); cur = v; run = 1; }
  }
  flush();
  return out;
}
export function parseCode(code) {
  const m = /^COPA1-([A-J0-9]+)$/.exec(String(code || '').trim().toUpperCase());
  if (!m) return null;
  const vals = [];
  const re = /([A-J])(\d*)/g; let t;
  while ((t = re.exec(m[1]))) {
    const v = SYM.indexOf(t[1]); const n = t[2] ? parseInt(t[2], 10) : 1;
    for (let i = 0; i < n && vals.length <= TOTAL; i++) vals.push(v);
  }
  if (vals.length !== TOTAL) return null;
  const friend = {};
  STICKERS.forEach((s, i) => { friend[s.id] = vals[i]; });
  return friend; // id -> símbolo (0..9)
}

// Comparação de troca: o que o amigo pode te dar e o que você pode dar
export function compareWithFriend(friend) {
  const youGet = [], youGive = [];
  for (const s of STICKERS) {
    const fv = friend[s.id] ?? 0;
    const friendHasDup = fv >= 2;                       // repetida do amigo (colada+extra ou só extra)
    if (friendHasDup && !isGlued(s.id)) youGet.push(s); // ele te dá o que te falta
    if (dups(s.id) > 0 && fv === 0) youGive.push(s);    // você dá o que falta pra ele
  }
  return { youGet, youGive };
}

export function resetAll() { state.st = {}; save(); }
export { SECTIONS };
