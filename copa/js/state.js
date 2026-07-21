// ===== Estado do álbum: colada/faltando/repetidas + código de troca =====
import { STICKERS, TOTAL, SECTIONS } from './album.js';

const KEY = 'copa26-album';
const store = (typeof localStorage !== 'undefined') ? localStorage : { getItem() { return null; }, setItem() {}, removeItem() {} };

// st[id] = [colada(0/1), repetidas(int)] — ausente = faltando sem repetida
// antigas[id] = { src, at } — presa no álbum ANTIGO (NÃO conta como colada)
// review[id]  = { src, at, conf } — leitura ambígua: fila de confirmação (não conta em nada)
// imports[fonte] = { at, colada, antiga, revisar } — registro de cada seed já importado (idempotência)
export const state = { st: {}, name: '', cloudCode: '', user: '', pin: '', badges: {}, counters: { scans: 0, compares: 0 }, milestone: 0, mute: false, friends: [], antigas: {}, review: {}, imports: {} };

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
  if (!state.antigas || typeof state.antigas !== 'object') state.antigas = {};
  if (!state.review || typeof state.review !== 'object') state.review = {};
  if (!state.imports || typeof state.imports !== 'object') state.imports = {};
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

// ---- ANTIGA (presa no álbum antigo) e REVISAR (fila de confirmação) ----
export function isAntiga(id) { return !!state.antigas[id]; }
export function isReview(id) { return !!state.review[id]; }
// estado único de um cromo: 'colada' | 'antiga' | 'revisar' | 'falta'
export function stickerState(id) {
  if (isGlued(id)) return 'colada';
  if (state.antigas[id]) return 'antiga';
  if (state.review[id]) return 'revisar';
  return 'falta';
}
export function setAntiga(id, meta) {
  if (isGlued(id)) return;                 // colada NUNCA é rebaixada
  state.antigas[id] = meta || { src: 'app', at: new Date().toISOString() };
  delete state.review[id];
  save();
}
export function clearAntiga(id) { delete state.antigas[id]; save(); }
export function setReview(id, meta) {
  if (isGlued(id) || state.antigas[id]) return;   // já resolvida: não volta pra revisão
  state.review[id] = meta || { src: 'app', at: new Date().toISOString() };
  save();
}
export function clearReview(id) { delete state.review[id]; save(); }
// resolução de 1 toque na fila: 'colada' | 'antiga' | 'falta'
export function resolveReview(id, decision) {
  delete state.review[id];
  if (decision === 'colada') { const [, d] = get(id); state.st[id] = [1, d]; delete state.antigas[id]; }
  else if (decision === 'antiga') { state.antigas[id] = { src: 'revisao', at: new Date().toISOString() }; }
  // 'falta': nada a marcar (só sai da fila)
  save();
}
export function reviewList() { return STICKERS.filter((s) => state.review[s.id]); }
export function reviewCount() { return reviewList().length; }

// Estatísticas de TODAS as seções numa passada só (evita varrer 972 itens 50x)
export function statsBySection() {
  const acc = {};
  for (const s of STICKERS) {
    const a = acc[s.sec] || (acc[s.sec] = { glued: 0, dups: 0, total: 0, antiga: 0, review: 0 });
    const [g, d] = get(s.id);
    a.total++; if (g) a.glued++; else if (state.antigas[s.id]) a.antiga++; else if (state.review[s.id]) a.review++;
    a.dups += d;
  }
  for (const k in acc) {
    const a = acc[k];
    a.missing = a.total - a.glued;                     // "faltam pra completar" (antiga inclusa)
    a.falta = a.total - a.glued - a.antiga - a.review; // não temos de jeito nenhum
    a.pct = Math.round((a.glued / a.total) * 100);
    a.potential = Math.round(((a.glued + a.antiga) / a.total) * 100);
  }
  return acc;
}

// ---- estatísticas ----
export function stats(secCode) {
  let glued = 0, antiga = 0, review = 0, dupTotal = 0, total = 0;
  for (const s of STICKERS) {
    if (secCode && s.sec !== secCode) continue;
    total++;
    const [g, d] = get(s.id);
    if (g) glued++; else if (state.antigas[s.id]) antiga++; else if (state.review[s.id]) review++;
    dupTotal += d;
  }
  return {
    glued, antiga, review,
    missing: total - glued,                         // faltam pra completar (antiga inclusa)
    falta: total - glued - antiga - review,         // não temos de jeito nenhum
    dups: dupTotal, total,
    pct: total ? Math.round((glued / total) * 100) : 0,
    potential: total ? Math.round(((glued + antiga) / total) * 100) : 0,
  };
}

export function missingList() { return STICKERS.filter((s) => !isGlued(s.id)); }
// só o que realmente não temos (exclui antigas e as em revisão) — pra pedir em troca
export function faltaList() { return STICKERS.filter((s) => stickerState(s.id) === 'falta'); }
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
