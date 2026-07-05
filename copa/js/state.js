// ===== Estado do álbum: colada/faltando/repetidas + código de troca =====
import { STICKERS, TOTAL, SECTIONS } from './album.js';

const KEY = 'copa26-album';
const store = (typeof localStorage !== 'undefined') ? localStorage : { getItem() { return null; }, setItem() {}, removeItem() {} };

// st[id] = [colada(0/1), repetidas(int)] — ausente = faltando sem repetida
export const state = { st: {}, name: '', cloudCode: '', user: '', pin: '', badges: {}, counters: { scans: 0, compares: 0 }, milestone: 0, mute: false, friends: [] };

export function load() {
  try {
    const raw = store.getItem(KEY);
    if (raw) Object.assign(state, JSON.parse(raw));
  } catch (e) { /* corrompido: recomeça */ }
  if (!state.st || typeof state.st !== 'object') state.st = {};
  if (!state.badges || typeof state.badges !== 'object') state.badges = {};
  if (!state.counters || typeof state.counters !== 'object') state.counters = { scans: 0, compares: 0 };
  if (typeof state.cloudCode !== 'string') state.cloudCode = '';
  if (typeof state.user !== 'string') state.user = '';
  if (typeof state.pin !== 'string') state.pin = '';
  if (typeof state.milestone !== 'number') state.milestone = 0;
  if (!Array.isArray(state.friends)) state.friends = [];
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

// Estatísticas de TODAS as seções numa passada só (evita varrer 972 itens 50x)
export function statsBySection() {
  const acc = {};
  for (const s of STICKERS) {
    const a = acc[s.sec] || (acc[s.sec] = { glued: 0, dups: 0, total: 0 });
    const [g, d] = get(s.id);
    a.total++; if (g) a.glued++; a.dups += d;
  }
  for (const k in acc) { const a = acc[k]; a.missing = a.total - a.glued; a.pct = Math.round((a.glued / a.total) * 100); }
  return acc;
}

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
// prefixo carrega o TOTAL: se o checklist mudar, o código antigo é avisado (não mapeia errado)
const PREFIX = `COPA${TOTAL}-`;
export function exportCode() {
  let out = PREFIX, run = 0, cur = -1;
  const flush = () => { if (run > 0) out += SYM[cur] + (run > 1 ? String(run) : ''); };
  for (const s of STICKERS) {
    const v = symbolFor(s.id);
    if (v === cur) run++; else { flush(); cur = v; run = 1; }
  }
  flush();
  return out;
}
// retorna { ok:true, friend } | { ok:false, reason:'formato'|'versao' }
export function parseCode(code) {
  const m = /^COPA(\d+)-([A-J0-9]+)$/.exec(String(code || '').trim().toUpperCase());
  if (!m) return { ok: false, reason: 'formato' };
  if (parseInt(m[1], 10) !== TOTAL) return { ok: false, reason: 'versao' };
  const vals = [];
  const re = /([A-J])(\d*)/g; let t;
  while ((t = re.exec(m[2]))) {
    const v = SYM.indexOf(t[1]); const n = t[2] ? parseInt(t[2], 10) : 1;
    for (let i = 0; i < n && vals.length < TOTAL + 1; i++) vals.push(v);
  }
  if (vals.length !== TOTAL) return { ok: false, reason: 'formato' };
  const friend = {};
  STICKERS.forEach((s, i) => { friend[s.id] = vals[i]; });
  return { ok: true, friend }; // friend: id -> símbolo (0..9)
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

// ---- medalhas (conquistas) ----
export function award(id) {
  if (state.badges[id]) return false;
  state.badges[id] = new Date().toISOString();
  save();
  return true;
}
export function bump(counter) {
  state.counters[counter] = (state.counters[counter] || 0) + 1;
  save();
  return state.counters[counter];
}

export function resetAll() { state.st = {}; save(); }
export { SECTIONS };
