// ===== MODO LIVE — consulta e registro instantâneo (abrir pacote / troca na escola) =====
// Lookup 100% LOCAL (estado já em memória): resposta < 100ms, funciona offline.
// Entradas: grade de toque (principal) · digitação tolerante · voz (segurar-e-falar).
import { TEAMS, GROUPS, SECTIONS, SPECIAL, section, stickerLabel } from './album.js';
import * as S from './state.js';

const $ = (id) => document.getElementById(id);
let deps = {};                 // { toast, vib, audio, commit }
let liveTab = 'teams';         // 'teams' | 'esp'
let curTeam = null;            // seleção escolhida (para grade de números / "mesma seleção")
let liveCurrent = null;        // { id, code, num } da consulta atual
let lastUndo = null;           // { snaps:[...], code } pra desfazer (1 ou vários)
let undoT = null;
let pendingLearn = null;       // { code, name } — jogador visto pela câmera aguardando número
let camMode = 'one';           // 'one' | 'pile'

// snapshot/restauração de um cromo (usado por PEGUEI e pela pilha)
function snapshot(id) {
  return { id, st: S.state.st[id] ? [...S.state.st[id]] : null, antiga: S.state.antigas[id] || null, review: S.state.review[id] || null, acq: S.state.acq[id] || null };
}
function restore(s) {
  if (s.st) S.state.st[s.id] = s.st; else delete S.state.st[s.id];
  if (s.antiga) S.state.antigas[s.id] = s.antiga; else delete S.state.antigas[s.id];
  if (s.review) S.state.review[s.id] = s.review; else delete S.state.review[s.id];
  if (s.acq) S.state.acq[s.id] = s.acq; else delete S.state.acq[s.id];
}
// aplica a aquisição de UM cromo (FALTA/ANTIGA→COLADA, ou COLADA→+repetida). Retorna o que houve.
function acquireOne(id) {
  if (!S.isGlued(id)) {
    const wasAntiga = S.isAntiga(id);
    S.setGlued(id, true); S.clearAntiga(id); S.clearReview(id);
    S.markAcq(id, { via: 'live', at: new Date().toISOString(), resg: wasAntiga });
    return wasAntiga ? 'resgatada' : 'colada';
  }
  S.addDup(id, +1);
  return 'repetida';
}

// ---- dicionário de aliases pt-BR (normalizado, sem acento) → código ----
const ALIAS_SRC = {
  CZE: ['tchequia', 'chequia', 'tcheca', 'republica tcheca', 'rep tcheca', 'republica checa', 'czechia'],
  MEX: ['mexico'],
  RSA: ['africa do sul', 'africa', 'sul africa', 'south africa'],
  KOR: ['coreia do sul', 'coreia', 'korea', 'south korea'],
  BIH: ['bosnia', 'bosnia e herzegovina', 'herzegovina'],
  CAN: ['canada'],
  QAT: ['catar', 'qatar'],
  SUI: ['suica', 'switzerland'],
  BRA: ['brasil', 'brazil'],
  HAI: ['haiti'],
  MAR: ['marrocos', 'morocco'],
  SCO: ['escocia', 'scotland'],
  AUS: ['australia'],
  PAR: ['paraguai', 'paraguay'],
  TUR: ['turquia', 'turkey'],
  USA: ['estados unidos', 'eua', 'america', 'united states'],
  CUW: ['curacao'],
  ECU: ['equador', 'ecuador'],
  GER: ['alemanha', 'germany', 'deutschland'],
  CIV: ['costa do marfim', 'marfim', 'costa marfim', 'ivory coast'],
  JPN: ['japao', 'japan'],
  NED: ['paises baixos', 'holanda', 'netherlands', 'holland'],
  SWE: ['suecia', 'sweden'],
  TUN: ['tunisia'],
  BEL: ['belgica', 'belgium'],
  EGY: ['egito', 'egypt'],
  IRN: ['ira', 'iran'],
  NZL: ['nova zelandia', 'new zealand'],
  CPV: ['cabo verde', 'cape verde'],
  KSA: ['arabia saudita', 'arabia', 'saudita', 'saudi'],
  ESP: ['espanha', 'spain'],
  URU: ['uruguai', 'uruguay'],
  FRA: ['franca', 'france'],
  IRQ: ['iraque', 'iraq'],
  NOR: ['noruega', 'norway'],
  SEN: ['senegal'],
  ALG: ['argelia', 'algeria'],
  ARG: ['argentina'],
  AUT: ['austria'],
  JOR: ['jordania', 'jordan'],
  COL: ['colombia'],
  COD: ['rd congo', 'congo', 'republica democratica do congo', 'r d congo', 'dr congo', 'congo democratico'],
  POR: ['portugal'],
  UZB: ['uzbequistao', 'uzbekistan'],
  CRO: ['croacia', 'croatia'],
  ENG: ['inglaterra', 'england'],
  GHA: ['gana', 'ghana'],
  PAN: ['panama'],
};
// mapa direto normalizado -> código (inclui o próprio código e nome oficial)
const ALIAS = {};
for (const t of TEAMS) {
  ALIAS[t.code.toLowerCase()] = t.code;
  ALIAS[norm(t.name)] = t.code;
}
for (const code in ALIAS_SRC) for (const a of ALIAS_SRC[code]) ALIAS[a] = code;
// especiais
for (const a of ['e', 'esp', 'especial', 'especiais', 'foil', 'brilhante']) ALIAS[a] = 'FWC';

const NUMW = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezasseis: 16,
  dezessete: 17, dezassete: 17, dezoito: 18, dezenove: 19, dezanove: 19, vinte: 20,
};

function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
function wordToNum(w) {
  if (/^\d{1,2}$/.test(w)) { const n = +w; return n >= 1 && n <= 20 ? n : null; }
  return NUMW[w] != null ? NUMW[w] : null;
}
// resolve um pedaço de texto → código de seleção. Retorna código | 'AMBIG' | null
function resolveTeam(letters) {
  letters = norm(letters);
  if (!letters) return null;
  if (ALIAS[letters]) return ALIAS[letters];
  // prefixo: junta candidatos por código e por qualquer alias/nome que comece com o texto
  const hit = new Set();
  for (const key in ALIAS) if (key.startsWith(letters)) hit.add(ALIAS[key]);
  if (hit.size === 1) return [...hit][0];
  if (hit.size > 1) return 'AMBIG';
  return null;
}
// parser tolerante: "BRA7","bra 7","brasil sete","b7","e12","especial doze"
export function parseInput(raw) {
  const s = norm(raw);
  if (!s) return { error: 'vazio' };
  let letters = s, num = null;
  const glued = /^(.*?)(\d{1,2})\s*$/.exec(s);          // dígitos colados/no fim
  if (glued) { letters = glued[1].trim(); num = +glued[2]; }
  else {                                                 // número por extenso no fim
    const parts = s.split(' ');
    const w = wordToNum(parts[parts.length - 1]);
    if (w != null) { num = w; letters = parts.slice(0, -1).join(' '); }
  }
  if (num == null) {                                     // só seleção (sem número): útil pra grade
    const code = resolveTeam(letters);
    return code && code !== 'AMBIG' ? { code, num: null } : (code === 'AMBIG' ? { ambiguous: true, letters } : { error: 'sel', letters });
  }
  if (num < 1 || num > 20) return { error: 'num', num };
  const code = resolveTeam(letters);
  if (code === 'AMBIG') return { ambiguous: true, letters, num };
  if (!code) return { error: 'sel', letters, num };
  return { code, num };
}

// ---- classificação de cor (semáforo) ----
function classify(id) {
  const g = S.isGlued(id), d = S.dups(id);
  if (g && d > 0) return { tone: 'yellow', msg: `JÁ SOBRA ×${d}`, sub: 'é moeda de troca 🔁', sound: 'coin' };
  if (g) return { tone: 'red', msg: 'JÁ TEMOS', sub: 'essa já está colada', sound: 'bad' };
  if (S.isAntiga(id)) return { tone: 'green', msg: 'PEGA!', sub: 'livra o álbum antigo 📕', sound: 'good', selo: '📕 estava no álbum antigo' };
  if (S.isReview(id)) return { tone: 'green', msg: 'PEGA!', sub: 'leitura pra confirmar', sound: 'good', selo: '🔎 confirmar leitura', review: true };
  return { tone: 'green', msg: 'PEGA!', sub: 'você ainda não tem', sound: 'good' };
}
const VIBES = { green: [18, 30, 18], red: [150], yellow: [12, 22, 12, 22, 12] };

// ---- flash de tela cheia ----
function lookup(code, num) {
  const id = `${code}-${num}`;
  // APRENDIZADO: se a câmera viu um jogador desta seleção e agora escolhemos o número, memoriza
  if (pendingLearn && pendingLearn.code === code && pendingLearn.name) {
    S.learnPlayer(code, pendingLearn.name, num);
    deps.toast(`Aprendi: ${pendingLearn.name} = nº ${num} 🧠`);
    pendingLearn = null;
  }
  liveCurrent = { id, code, num };
  const cls = classify(id);
  const flash = $('live-flash');
  flash.className = 'live-flash lf-' + cls.tone;
  $('lf-code').textContent = code === 'FWC' ? `E${num}` : `${code} ${num}`;
  $('lf-name').textContent = code === 'FWC' ? 'Especial ✨' : (section(code)?.name || code);
  $('lf-msg').textContent = cls.msg;
  $('lf-sub').textContent = cls.sub || '';
  const selo = $('lf-selo');
  if (cls.selo) { selo.textContent = cls.selo; selo.classList.remove('hidden'); }
  else selo.classList.add('hidden');
  $('lf-actions').classList.add('hidden');               // some durante o flash
  flash.classList.remove('hidden');
  try { deps.audio.resume?.(); deps.audio[cls.sound]?.(); } catch (e) {}
  deps.vib(VIBES[cls.tone]);
  clearTimeout(flashT);
  flashT = setTimeout(() => $('lf-actions').classList.remove('hidden'), 1500);   // revela PEGUEI
}
let flashT = null;
function hideFlash() { $('live-flash').classList.add('hidden'); clearTimeout(flashT); }

// ---- PEGUEI (transição de estado) ----
function applyPeguei() {
  if (!liveCurrent) return;
  const { id, code, num } = liveCurrent;
  const label = code === 'FWC' ? `E${num}` : `${code} ${num}`;
  const wasPct = S.stats(code).pct;
  const snap = snapshot(id);
  const what = acquireOne(id);
  const msg = what === 'repetida' ? `+1 repetida de ${label} — moeda de troca! 🔁`
    : what === 'resgatada' ? `${label} resgatada do álbum antigo! ✅` : `${label} colada! ✅`;
  try { (what === 'repetida' ? deps.audio.coin : deps.audio.win)?.(); } catch (e) {}
  lastUndo = { snaps: [snap], code };
  deps.commit(code, wasPct);                              // gamificação + salvamento na nuvem
  renderCounters();
  showUndo(msg);
  hideFlash();
  if (code === 'FWC') showEsp(); else showNums(code);     // "mesma seleção": volta pros números
}
function doUndo() {
  if (!lastUndo) return;
  const { snaps, code } = lastUndo;
  (snaps || []).forEach(restore);
  S.save();
  lastUndo = null; hideUndo();
  deps.commit(code, S.stats(code).pct);
  renderCounters();
  deps.toast('Desfeito ↩');
  deps.vib(10);
}
function showUndo(msg) {
  $('live-undo-txt').textContent = msg;
  $('live-undo').classList.remove('hidden');
  clearTimeout(undoT);
  undoT = setTimeout(hideUndo, 5000);
}
function hideUndo() { $('live-undo').classList.add('hidden'); clearTimeout(undoT); }

// ---- contadores do topo (ao vivo) ----
function renderCounters() {
  const st = S.stats();
  $('live-faltam').textContent = st.falta;
  $('live-coladas').textContent = st.glued;
  $('live-repetidas').textContent = st.dups;
}

// ---- grade de seleções / números ----
function showTeams(filter) {
  liveTab = 'teams'; curTeam = null; pendingLearn = null;
  syncTabs();
  $('live-nums-wrap').classList.add('hidden');
  const grid = $('live-grid'); grid.classList.remove('hidden');
  const f = norm(filter);
  grid.innerHTML = '';
  for (const g of GROUPS) {
    const teams = TEAMS.slice(g.from, g.to + 1).filter((t) => !f || norm(t.name).includes(f) || t.code.toLowerCase().includes(f) || (ALIAS_SRC[t.code] || []).some((a) => a.includes(f)));
    if (!teams.length) continue;
    const h = document.createElement('div'); h.className = 'live-grp'; h.textContent = g.name; grid.appendChild(h);
    for (const t of teams) {
      const b = document.createElement('button');
      b.className = 'live-team'; b.innerHTML = `<span class="lt-flag">${t.flag}</span><span class="lt-code">${t.code}</span>`;
      b.addEventListener('click', () => showNums(t.code));
      grid.appendChild(b);
    }
  }
  if (!grid.children.length) grid.innerHTML = '<div class="tip">Nenhuma seleção com esse nome 🤷</div>';
}
function showEsp() {
  liveTab = 'esp'; curTeam = 'FWC';
  syncTabs();
  $('live-nums-wrap').classList.add('hidden');
  const grid = $('live-grid'); grid.classList.remove('hidden');
  grid.innerHTML = '<div class="live-grp">✨ Especiais foil E1–E20</div>';
  const wrap = document.createElement('div'); wrap.className = 'live-nums';
  for (let n = 1; n <= SPECIAL.count; n++) {
    const b = document.createElement('button');
    b.className = 'live-num ' + tclass(`FWC-${n}`);
    b.textContent = `E${n}`;
    b.addEventListener('click', () => lookup('FWC', n));
    wrap.appendChild(b);
  }
  grid.appendChild(wrap);
}
function showNums(code) {
  curTeam = code; liveTab = 'teams'; syncTabs();
  $('live-grid').classList.add('hidden');
  $('live-nums-wrap').classList.remove('hidden');
  const sec = section(code);
  $('live-cur-team').innerHTML = `${sec.flag} <b>${sec.name}</b>`;
  const wrap = $('live-nums'); wrap.innerHTML = '';
  for (let n = 1; n <= sec.count; n++) {
    const b = document.createElement('button');
    b.className = 'live-num ' + tclass(`${code}-${n}`);
    b.textContent = n;
    b.addEventListener('click', () => lookup(code, n));
    wrap.appendChild(b);
  }
}
// pinta o número pelo estado atual (dica visual antes mesmo de tocar)
function tclass(id) {
  const stt = S.stickerState(id);
  if (S.isGlued(id) && S.dups(id) > 0) return 'n-dup';
  return { colada: 'n-colada', antiga: 'n-antiga', revisar: 'n-falta', falta: 'n-falta' }[stt];
}
function syncTabs() {
  document.querySelectorAll('.live-tab').forEach((t) => t.classList.toggle('sel', t.dataset.livetab === liveTab));
}

// ---- digitação + autocomplete ----
function onType() {
  const raw = $('live-type').value;
  if (liveTab === 'esp' && !norm(raw)) { showEsp(); return; }
  if (curTeam && !norm(raw)) return;         // já numa seleção: não atrapalha
  showTeams(raw);                            // filtra a grade ao digitar
}
function submitType() {
  const raw = $('live-type').value;
  const r = parseInput(raw);
  if (r.code && r.num) { lookup(r.code, r.num); $('live-type').value = ''; showTeams(''); return; }
  if (r.code && r.num == null) { $('live-type').value = ''; r.code === 'FWC' ? showEsp() : showNums(r.code); return; }
  if (r.ambiguous) { deps.toast(`"${r.letters}" pode ser várias — escolha na grade 👇`); showTeams(r.letters); return; }
  deps.toast('Não entendi. Ex.: BRA 7, brasil 7, e12');
}

// ---- voz: segurar-e-falar (walkie-talkie) ----
function initVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const mic = $('live-mic');
  if (!SR || !mic) { mic && mic.classList.add('hidden'); return; }   // sem suporte: some sem erro
  mic.classList.remove('hidden');
  let rec = null, listening = false;
  const start = (e) => {
    e && e.preventDefault();
    if (listening) return;
    rec = new SR(); rec.lang = 'pt-BR'; rec.continuous = false; rec.interimResults = false; rec.maxAlternatives = 3;
    rec.onresult = (ev) => { const a = ev.results[0][0]; handleVoice(a.transcript, a.confidence); };
    rec.onerror = () => {};
    rec.onend = () => { listening = false; mic.classList.remove('listening'); };
    try { rec.start(); listening = true; mic.classList.add('listening'); deps.vib(10); } catch (er) {}
  };
  const stop = () => { if (rec && listening) { try { rec.stop(); } catch (er) {} } };
  mic.addEventListener('pointerdown', start);
  mic.addEventListener('pointerup', stop);
  mic.addEventListener('pointerleave', stop);
  mic.addEventListener('pointercancel', stop);
}
function handleVoice(transcript, conf) {
  const r = parseInput(transcript);
  if (r.code && r.num) {
    if (conf != null && conf < 0.6) askConfirm(r, transcript);
    else lookup(r.code, r.num);
  } else if (r.code && r.num == null) {
    r.code === 'FWC' ? showEsp() : showNums(r.code);
  } else {
    askConfirm(r, transcript);
  }
}
function askConfirm(r, transcript) {
  const box = $('live-auto');
  const label = r && r.code && r.num ? (r.code === 'FWC' ? `E${r.num}` : `${r.code} ${r.num}`) : null;
  if (label) {
    box.innerHTML = `<span>🎤 entendi <b>${label}</b> — confirma?</span><button class="la-yes">Sim, consultar</button><button class="la-no">Não</button>`;
    box.querySelector('.la-yes').onclick = () => { hideAuto(); lookup(r.code, r.num); };
  } else {
    box.innerHTML = `<span>🎤 não entendi <b>"${transcript || '...'}"</b></span><button class="la-no">Fechar</button>`;
  }
  box.querySelector('.la-no').onclick = hideAuto;
  box.classList.remove('hidden');
}
function hideAuto() { const b = $('live-auto'); b.classList.add('hidden'); b.innerHTML = ''; }

// ---- CÂMERA IA: aponta pra figurinha na mão e a IA diz qual é ----
function downscale(file, maxSide, q) {
  return new Promise((resolve, reject) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const sc = Math.min(1, maxSide / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * sc); cv.height = Math.round(img.height * sc);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      resolve(cv.toDataURL('image/jpeg', q));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('foto inválida')); };
    img.src = url;
  });
}
function camBanner(html) { const b = $('live-auto'); b.innerHTML = html; b.classList.remove('hidden'); }
const TEAMS_STR = () => SECTIONS.map((s) => `${s.code}=${s.name}`).join(', ');
function camErr(off) {
  camBanner(`<span>${off ? '📴 Sem internet — use os botões ou a digitação.' : '😕 Não deu pra ler agora. Tente de novo.'}</span><button class="la-no">Fechar</button>`);
  const b = $('live-auto').querySelector('.la-no'); if (b) b.onclick = hideAuto;
}
async function handleCamPhoto(file, kind) {
  if (!file) return;
  if (kind === 'pile') return handlePile(file);
  camBanner('<span>🤖 <b>Lendo a figurinha…</b></span>');
  try {
    const dataUrl = await downscale(file, 1100, 0.8);
    const res = await fetch('/api/scan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl, teams: TEAMS_STR(), mode: 'sticker' }),
      signal: AbortSignal.timeout(45000),
    });
    const r = await res.json().catch(() => ({}));
    if (!res.ok || r.error) throw new Error(r.error || 'erro');
    const code = (r.code || '').toUpperCase();
    if (!code || (code !== 'FWC' && !section(code))) {
      camBanner(`<span>🤔 Não reconheci a figurinha. ${esc(r.note || 'Tente com mais luz.')}</span><button class="la-no">Fechar</button>`);
      $('live-auto').querySelector('.la-no').onclick = hideAuto;
      return;
    }
    const who = r.name ? ` (${esc(r.name)})` : '';
    let num = r.num;
    if (!num && code !== 'FWC' && r.name) num = S.rosterNum(code, r.name);   // já aprendi esse jogador?
    if (num) { hideAuto(); lookup(code, num); return; }             // escudo/time/especial/aprendido
    // jogador novo: a IA achou a seleção mas não o número → abre a grade e memoriza no toque
    pendingLearn = r.name ? { code, name: r.name } : null;
    camBanner(`<span>🤖 Vi <b>${section(code).flag} ${section(code).name}</b>${who} — toque no número da figurinha 👇</span><button class="la-no">Fechar</button>`);
    $('live-auto').querySelector('.la-no').onclick = hideAuto;
    showNums(code);
  } catch (e) { camErr(e.name === 'TimeoutError' || /rede|internet|network/i.test(e.message || '')); }
}

// ---- PILHA: foto de várias figurinhas → registrar em massa ----
let pileItems = [];
async function handlePile(file) {
  camBanner('<span>🤖 <b>Lendo a pilha de figurinhas…</b> (pode levar uns segundos)</span>');
  try {
    const dataUrl = await downscale(file, 1500, 0.8);
    const res = await fetch('/api/scan', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl, teams: TEAMS_STR(), mode: 'pile' }),
      signal: AbortSignal.timeout(60000),
    });
    const r = await res.json().catch(() => ({}));
    if (!res.ok || r.error) throw new Error(r.error || 'erro');
    hideAuto();
    // resolve o número de cada uma (escudo/time/especial direto; jogador via roster aprendido)
    pileItems = (r.stickers || []).map((s) => {
      const code = (s.code || '').toUpperCase();
      if (code !== 'FWC' && !section(code)) return null;
      let num = s.num;
      if (!num && code !== 'FWC' && s.name) num = S.rosterNum(code, s.name);
      return { code, num, name: s.name || '', tipo: s.tipo || '' };
    }).filter(Boolean);
    renderPile();
  } catch (e) { camErr(e.name === 'TimeoutError' || /rede|internet|network/i.test(e.message || '')); }
}
function pileLabel(it) {
  const nm = it.name ? ` · ${esc(it.name)}` : (it.tipo ? ` · ${it.tipo}` : '');
  const who = it.code === 'FWC' ? '✨ Especiais' : `${section(it.code).flag} ${section(it.code).name}`;
  return `${who}${nm}`;
}
function renderPile() {
  const known = pileItems.filter((it) => it.num);
  const unknown = pileItems.filter((it) => !it.num);
  $('pile-count').textContent = known.length;
  const box = $('pile-list');
  if (!pileItems.length) { box.innerHTML = '<div class="review-done">🤷 Não reconheci figurinhas. Tente com mais luz e espalhadas.</div>'; }
  else {
    box.innerHTML = known.map((it, i) => {
      const id = `${it.code}-${it.num}`;
      const g = S.isGlued(id), act = g ? '🔁 +repetida' : '✅ colar';
      const lbl = it.code === 'FWC' ? `E${it.num}` : `${it.code} ${it.num}`;
      return `<label class="pile-row"><input type="checkbox" checked data-pi="${i}"><span class="pile-name"><b>${lbl}</b> ${pileLabel(it)}</span><span class="pile-act">${act}</span></label>`;
    }).join('')
    + (unknown.length ? `<div class="pile-unknown">🧩 ${unknown.length} jogador(es) sem número aprendido — leia cada um sozinho com o 📸 pra eu aprender: ${unknown.map((u) => esc(u.name || section(u.code).name)).join(', ')}</div>` : '');
  }
  $('pile-modal').classList.remove('hidden');
}
function applyPile() {
  const checks = Array.from(document.querySelectorAll('#pile-list [data-pi]:checked')).map((c) => +c.dataset.pi);
  if (!checks.length) { closePile(); return; }
  const snaps = [];
  let colou = 0, rep = 0; const secs = new Set();
  for (const i of checks) {
    const it = pileItems[i]; if (!it || !it.num) continue;
    const id = `${it.code}-${it.num}`;
    snaps.push(snapshot(id));
    const what = acquireOne(id);
    if (what === 'repetida') rep++; else colou++;
    secs.add(it.code);
  }
  S.save();
  lastUndo = { snaps, code: [...secs][0] || 'BRA' };
  secs.forEach((c) => deps.commit(c, 0));   // gamificação por seleção afetada
  renderCounters();
  closePile();
  showUndo(`Pacote registrado: ${colou} colada(s) + ${rep} repetida(s)! 🎉`);
  try { deps.audio.win?.(); } catch (e) {}
  deps.vib(20);
}
function closePile() { $('pile-modal').classList.add('hidden'); }

// ---- boot ----
export function initLive(d) {
  deps = d;
  $('live-type')?.addEventListener('input', onType);
  $('live-type')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submitType(); } });
  document.querySelectorAll('.live-tab').forEach((t) => t.addEventListener('click', () => { t.dataset.livetab === 'esp' ? showEsp() : showTeams(''); }));
  $('live-back-teams')?.addEventListener('click', () => showTeams(''));
  $('lf-peguei')?.addEventListener('click', applyPeguei);
  $('lf-close')?.addEventListener('click', hideFlash);
  $('live-flash')?.addEventListener('click', (e) => { if (e.target === $('live-flash')) hideFlash(); });
  $('live-undo-btn')?.addEventListener('click', doUndo);
  // câmera IA: uma figurinha (📸) ou uma pilha inteira (🗂️)
  $('live-cam')?.addEventListener('click', () => { camMode = 'one'; $('live-cam-file')?.click(); });
  $('live-pile')?.addEventListener('click', () => { camMode = 'pile'; $('live-cam-file')?.click(); });
  $('live-cam-file')?.addEventListener('change', (e) => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) handleCamPhoto(f, camMode); });
  $('pile-close')?.addEventListener('click', closePile);
  $('pile-apply')?.addEventListener('click', applyPile);
  $('pile-modal')?.addEventListener('click', (e) => { if (e.target === $('pile-modal')) closePile(); });
  initVoice();
}
export function renderLive() {
  renderCounters();
  hideFlash(); hideUndo(); hideAuto();
  if (curTeam && liveTab === 'esp') showEsp();
  else if (curTeam) showNums(curTeam);
  else showTeams('');
}
