// ===== App Figurinhas da Copa 2026 — UI + gamificação =====
import { SECTIONS, TEAMS, GROUPS, TEAM_OFFSET, section, stickerLabel, teamColors } from './album.js';
import * as S from './state.js';
import { initScan } from './scan.js';
import { initCloud, autoSave, cloudLoad, publicAlbum, searchUsers, sendMsg, loadChat } from './cloud.js';
import { initMaker } from './maker.js';
import { runScanImport } from './import-scan.js';
import { initLive, renderLive } from './live.js';
import { Audio } from './audio.js';

S.load();
const audio = new Audio();
audio.enabled = !S.state.mute;

const $ = (id) => document.getElementById(id);
const screens = { home: $('scr-home'), album: $('scr-album'), page: $('scr-page'), scan: $('scr-scan'), trade: $('scr-trade'), maker: $('scr-maker'), live: $('scr-live') };
let mode = 'glue';
let curSec = null;

// ---------- navegação ----------
export function go(name) {
  for (const k in screens) screens[k].classList.toggle('hidden', k !== name);
  document.body.classList.toggle('album-open', name === 'page');   // álbum ocupa a tela toda (paisagem)
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('sel', t.dataset.go === name || (name === 'page' && t.dataset.go === 'album')));
  if (name === 'home') renderHome();
  if (name === 'album') renderTeams();
  if (name === 'trade') renderTrade();
  if (name === 'live') renderLive();
  $('screens').scrollTop = 0;   // volta ao topo da área que rola de verdade
}
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));

// ---------- toast / vibração / sons ----------
let toastT = null;
export function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 2200);
}
export function vib(v) { try { navigator.vibrate?.(v); } catch (e) {} }
document.addEventListener('pointerdown', () => audio.resume(), { once: true });
$('btn-mute')?.addEventListener('click', () => {
  S.state.mute = !S.state.mute; S.save();
  audio.enabled = !S.state.mute;
  $('btn-mute').textContent = S.state.mute ? '🔇' : '🔊';
  toast(S.state.mute ? 'Sons desligados' : 'Sons ligados! 🔊');
});
if ($('btn-mute')) $('btn-mute').textContent = S.state.mute ? '🔇' : '🔊';

// ---------- CELEBRAÇÕES (confete + overlay) ----------
function confetti(n = 40) {
  const box = $('celebrate-confetti');
  if (!box) return;
  box.innerHTML = '';
  const EMO = ['⚽', '🎉', '⭐', '🍦', '🏆', '✨'];
  for (let i = 0; i < n; i++) {
    const sp = document.createElement('span');
    sp.textContent = EMO[(Math.random() * EMO.length) | 0];
    sp.style.left = (Math.random() * 100) + '%';
    sp.style.animationDelay = (Math.random() * 0.6) + 's';
    sp.style.fontSize = (16 + Math.random() * 22) + 'px';
    box.appendChild(sp);
  }
}
let celebT = null;
export function celebrate(title, sub, big = false) {
  const el = $('celebrate');
  $('celebrate-title').textContent = title;
  $('celebrate-sub').textContent = sub || '';
  el.classList.remove('hidden');
  confetti(big ? 70 : 40);
  audio.win();
  vib(big ? [50, 100, 50, 100, 200] : [30, 50, 30]);
  clearTimeout(celebT);
  celebT = setTimeout(() => el.classList.add('hidden'), big ? 4200 : 2600);
}
$('celebrate')?.addEventListener('click', () => $('celebrate').classList.add('hidden'));

// ---------- MEDALHAS ----------
const BADGES = [
  { id: 'first', icon: '🚀', name: 'Primeira Figurinha', test: (t) => t.glued >= 1 },
  { id: 'page1', icon: '📄', name: 'Primeira Página', test: (t, bySec) => Object.values(bySec).some((a) => a.pct === 100) },
  { id: 'cem', icon: '💯', name: '100 Coladas', test: (t) => t.glued >= 100 },
  { id: 'metade', icon: '🌗', name: 'Metade do Álbum', test: (t) => t.pct >= 50 },
  { id: 'scan1', icon: '🤖', name: 'Olho Biônico', test: () => (S.state.counters.scans || 0) >= 1 },
  { id: 'troca1', icon: '🤝', name: 'Primeira Troca', test: () => (S.state.counters.compares || 0) >= 1 },
  { id: 'bento', icon: '🍦', name: 'Mestre dos Sabores', test: (t, bySec) => bySec.BEN && bySec.BEN.pct === 100 },
  { id: 'campeao', icon: '🏆', name: 'Álbum Completo', test: (t) => t.pct === 100 },
];
function checkBadges() {
  const t = S.stats();
  const bySec = S.statsBySection();
  for (const b of BADGES) {
    if (!S.state.badges[b.id] && b.test(t, bySec)) {
      if (S.award(b.id)) {
        setTimeout(() => { celebrate(`${b.icon} MEDALHA: ${b.name}!`, 'Veja suas medalhas no Início!'); audio.key(); }, 350);
      }
    }
  }
}

// ---------- pós-ação central (chamado após QUALQUER mudança no álbum) ----------
function afterChange(secCode, wasPct) {
  renderTop();
  autoSave();                                    // salvamento automático na nuvem
  const t = S.stats();
  // primeira figurinha
  if (t.glued === 1 && !S.state.badges.first) celebrate('🚀 PRIMEIRA FIGURINHA!', 'A coleção começou!');
  // página completa em tempo real
  if (secCode !== undefined && wasPct !== undefined) {
    const now = S.stats(secCode);
    if (now.pct === 100 && wasPct < 100) {
      const sec = section(secCode);
      if (secCode === 'BEN') { celebrate('🍦 MISSÃO BENTÔ COMPLETA!', 'Você colecionou os 10 sabores + selo!', true); revealCoupon(); }
      else celebrate(`${sec.flag} PÁGINA COMPLETA!`, `Você fechou ${sec.name}! 🎉`);
    }
  }
  // marcos do álbum (25/50/75/100)
  for (const m of [25, 50, 75, 100]) {
    if (t.pct >= m && (S.state.milestone || 0) < m) {
      S.state.milestone = m; S.save();
      if (m === 100) celebrate('🏆 ÁLBUM COMPLETO!', 'VOCÊ É LENDA DA COPA 2026!', true);
      else celebrate(`⭐ ${m}% DO ÁLBUM!`, 'Continue colecionando!');
      break;
    }
  }
  checkBadges();
}

// cupom da Missão Bentô (mesmo estilo do STRANGER10 do jogo)
function revealCoupon() {
  const el = $('cloud-code-line');
  toast('🎟️ Cupom BENTÔ desbloqueado! Veja no Início!');
  if (el) {
    el.classList.remove('hidden');
    el.textContent = '🎟️ MISSÃO BENTÔ completa! Mostre esta tela na Bentô Gelatos e use o cupom COPA10 (10% OFF)!';
  }
}

// ---------- cards 3D dos acessos da home (inclinam com dedo/giroscópio) ----------
(function homeCards3D() {
  const setv = (el, nx, ny) => {
    el.style.setProperty('--ry', (nx * 12).toFixed(1) + 'deg');
    el.style.setProperty('--rx', (ny * -12).toFixed(1) + 'deg');
    el.style.setProperty('--mx', ((nx + 0.5) * 100).toFixed(0) + '%');
    el.style.setProperty('--my', ((ny + 0.5) * 100).toFixed(0) + '%');
  };
  const reset = (el) => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); el.style.setProperty('--mx', '50%'); el.style.setProperty('--my', '50%'); };
  document.addEventListener('pointermove', (e) => {
    const el = e.target.closest && e.target.closest('.acard'); if (!el) return;
    const r = el.getBoundingClientRect();
    setv(el, (e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
  }, { passive: true });
  document.addEventListener('pointerout', (e) => {
    const el = e.target.closest && e.target.closest('.acard'); if (el) reset(el);
  }, { passive: true });
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null || screens.home.classList.contains('hidden')) return;   // só na home
    const c = (v) => Math.max(-0.5, Math.min(0.5, v));
    const nx = c(e.gamma / 40), ny = c((e.beta - 40) / 40);
    document.querySelectorAll('#scr-home .acard').forEach((el) => setv(el, nx, ny));
  }, { passive: true });
})();

// ---------- topo / início ----------
export function renderTop() {
  const st = S.stats();
  $('progress-fill').style.width = st.pct + '%';
  $('progress-text').textContent = st.pct + '%';
}
function renderHome() {
  const st = S.stats();
  const ring = $('home-ring');
  // anel duplo: dourado = coladas · verde translúcido = potencial (presas no álbum antigo) · resto = trilho
  if (ring) ring.style.background = `conic-gradient(#d4af37 ${st.pct * 3.6}deg, rgba(74,222,128,.55) 0 ${st.potential * 3.6}deg, rgba(255,255,255,.18) 0)`;
  $('home-pct').textContent = st.pct + '%';
  $('home-glued').textContent = st.glued;
  $('home-missing').textContent = st.falta;         // faltam DE VERDADE (exclui antigas/revisão)
  $('home-dups').textContent = st.dups;
  const ha = $('home-antiga'); if (ha) ha.textContent = st.antiga;
  // progresso POTENCIAL (coladas + presas no álbum antigo) — anel externo
  const pot = $('home-potential');
  if (pot) pot.textContent = st.potential + '%';
  const potRing = $('home-ring');
  if (potRing) potRing.style.setProperty('--pot', (st.potential * 3.6) + 'deg');
  // botão da FILA DE REVISÃO (some quando não há nada pra revisar)
  const rv = $('btn-review');
  if (rv) {
    const n = S.reviewCount();
    rv.classList.toggle('hidden', n === 0);
    rv.innerHTML = `🔎 Revisar <b>${n}</b> figurinha${n === 1 ? '' : 's'} do scan`;
  }
  // nudges "falta pouco!"
  const bySec = S.statsBySection();
  const near = SECTIONS.filter((s) => { const a = bySec[s.code]; return a && a.missing >= 1 && a.missing <= 3; }).slice(0, 3);
  const nd = $('home-nudges');
  if (nd) {
    nd.innerHTML = '';
    for (const s of near) {
      const a = bySec[s.code];
      const b = document.createElement('button');
      b.className = 'nudge';
      b.textContent = `🔥 Falta${a.missing > 1 ? 'm' : ''} só ${a.missing} de ${s.name}!`;
      b.addEventListener('click', () => openPage(s.code));
      nd.appendChild(b);
    }
    nd.classList.toggle('hidden', near.length === 0);
  }
  // estante de medalhas
  const shelf = $('badge-shelf');
  if (shelf) {
    shelf.innerHTML = BADGES.map((b) => `<span class="badge${S.state.badges[b.id] ? ' won' : ''}" title="${b.name}">${b.icon}</span>`).join('');
  }
  renderTop();
}

// ---------- álbum: grade de seleções (1 passada de stats + grupos) ----------
function renderTeams() {
  const wrap = $('album-teams');
  const bySec = S.statsBySection();
  wrap.innerHTML = '';
  const addHead = (txt) => {
    const h = document.createElement('div');
    h.className = 'group-head'; h.textContent = txt;
    wrap.appendChild(h);
  };
  const addCard = (sec) => {
    const st = bySec[sec.code];
    const card = document.createElement('button');
    const almost = st.missing >= 1 && st.missing <= 3;
    card.className = 'team-card' + (st.pct === 100 ? ' done' : '') + (sec.bento ? ' bento' : '') + (almost ? ' almost' : '');
    const info = sec.bento
      ? `MISSÃO: complete os 10 sabores! · ${st.glued}/${st.total}`
      : `${st.glued}/${st.total}${st.antiga ? ` · 📕${st.antiga}` : ''}${st.review ? ` · 🔎${st.review}` : ''}${st.dups ? ` · 🔁${st.dups}` : ''}${almost ? ` · falta ${st.falta}!` : ''}`;
    card.innerHTML = `<span class="flag">${sec.flag}</span> <span class="tname">${sec.name}</span>
      <div class="tbar"><i style="width:${st.pct}%"></i></div>
      <span class="tinfo">${info}</span>`;
    card.addEventListener('click', () => openPage(sec.code));
    wrap.appendChild(card);
  };
  addCard(SECTIONS[0]);                    // Bentô Worldcup (missão)
  addHead('🏆 Especiais');
  addCard(SECTIONS[1]);                    // FWC (abertura, brilhantes)
  addCard(SECTIONS[2]);                    // Coca-Cola (edição BR)
  for (const g of GROUPS) {
    addHead(g.name);
    for (let i = g.from; i <= g.to && i < TEAMS.length; i++) addCard(SECTIONS[TEAM_OFFSET + i]);
  }
}

// ---------- página da seleção (álbum aberto + virada de página) ----------
export function openPage(code) {
  curSec = code;
  renderPage();
  go('page');
}
// vira a página (3D) e navega p/ a seção vizinha
function flipTo(dir) {
  const idx = SECTIONS.findIndex((s) => s.code === curSec);
  const next = SECTIONS[(idx + dir + SECTIONS.length) % SECTIONS.length];
  const sheet = $('album-sheet');
  if (!sheet || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    curSec = next.code; renderPage(); return;
  }
  sheet.classList.remove('flip-next', 'flip-prev');
  void sheet.offsetWidth;                       // reinicia a animação
  sheet.classList.add(dir > 0 ? 'flip-next' : 'flip-prev');
  audio.pickup?.(); vib(6);
  setTimeout(() => { curSec = next.code; renderPage(); }, 190);   // troca no meio da virada
  setTimeout(() => sheet.classList.remove('flip-next', 'flip-prev'), 420);
}
$('page-prev')?.addEventListener('click', () => flipTo(-1));
$('page-next')?.addEventListener('click', () => flipTo(+1));

// nome embaixo da figurinha (fiel ao álbum) — só onde faz sentido
function cellName(sec, n) {
  if (sec.special) return stickerLabel(sec.code, n).replace(/\s*[✨⭐⚽🦌🐆🇮🇹🇧🇷🇫🇷🇩🇪🇦🇷🇪🇸🇵🇹🏴󠁧󠁢󠁥󠁮󠁧󠁿🇺🇾🇲🇽🇨🇦🇺🇸].*$/u, '').trim();
  if (n === 1) return 'ESCUDO';
  if (n === 13) return 'SELEÇÃO';
  return '';   // jogadores: sem nome inventado (roster real pode entrar depois)
}

// cria uma célula de figurinha (com toda a lógica de toque)
function makeCell(sec, n, extra = '') {
  const id = `${sec.code}-${n}`;
  const cell = document.createElement('button');
  const glued = S.isGlued(id), d = S.dups(id);
  const antiga = !glued && S.isAntiga(id), review = !glued && !antiga && S.isReview(id);
  // cromos metalizados (escudo nº1, foto do time nº13 e toda a seção FWC) ganham foil
  const foil = glued && (n === 1 || n === 13 || sec.code === 'FWC');
  cell.className = 'cell' + (glued ? ' glued' : '') + (foil ? ' foil' : '')
    + (antiga ? ' antiga' : '') + (review ? ' review' : '') + (extra ? ' ' + extra : '');
  const name = cellName(sec, n);
  cell.innerHTML = `<span class="c26">26</span>
    <span class="c-top"><b class="c-code">${sec.code}</b><b class="c-num">${n}</b></span>
    ${name ? `<span class="c-name">${name}</span>` : ''}
    ${glued ? '<span class="c-check">✓</span>' : ''}
    ${antiga ? '<span class="c-old">📕</span>' : ''}
    ${review ? '<span class="c-rev">🔎</span>' : ''}
    ${d > 0 ? `<span class="dupbadge">+${d}</span>` : ''}`;
  cell.title = stickerLabel(sec.code, n);
  cell.addEventListener('click', () => {
    const wasPct = S.stats(curSec).pct;
    if (mode === 'glue') {
      const on = !S.isGlued(id);
      S.setGlued(id, on);
      if (on) { S.clearAntiga(id); S.clearReview(id); audio.coin(); vib(8); cell.classList.add('just-glued'); }
    } else if (mode === 'dup') {
      S.addDup(id, +1); audio.pickup(); vib(8);
    } else {
      if (S.dups(id) > 0) { S.addDup(id, -1); toast(`Tirei 1 repetida da nº ${n}`); }
      else if (S.isGlued(id)) { S.setGlued(id, false); toast(`Desmarquei a nº ${n}`); }
    }
    renderPage();
    afterChange(curSec, wasPct);
  });
  return cell;
}

// box do grupo (bandeirinhas dos 4 adversários), igual ao original
function groupBox(code) {
  const box = document.createElement('div');
  box.className = 'group-box';
  const idx = TEAMS.findIndex((t) => t.code === code);
  const g = GROUPS.find((gr) => idx >= gr.from && idx <= gr.to);
  if (idx < 0 || !g) { box.style.display = 'none'; return box; }
  const letter = g.name.trim().slice(-1);   // "⚽ Grupo C" -> "C"
  const flags = TEAMS.slice(g.from, g.to + 1)
    .map((t) => `<span>${t.flag} ${t.code}</span>`).join('');
  box.innerHTML = `<b>GRUPO ${letter}</b><div class="gb-flags">${flags}</div>`;
  return box;
}

function renderPage() {
  const sec = section(curSec);
  const st = S.stats(curSec);
  const [ca, cb, ink] = teamColors(curSec);            // cores da seleção (fundo fiel ao álbum)
  const book = $('album-sheet');
  book.style.setProperty('--team-a', ca);
  book.style.setProperty('--team-b', cb);
  book.style.setProperty('--team-ink', ink);
  $('page-head').innerHTML = `<span class="ph-we">WE ARE</span><span class="ph-name">${sec.name.toUpperCase()}</span>
    <span class="ph-flag">${sec.flag}</span><span class="ph-sub">${st.glued}/${st.total} coladas${st.antiga ? ` · 📕${st.antiga} antigo` : ''}${st.dups ? ` · ${st.dups} rep.` : ''}</span>`;
  $('page-pill').textContent = `${sec.flag} ${sec.name.toUpperCase()}`;
  const L = $('grid-left'), R = $('grid-right');
  L.innerHTML = ''; R.innerHTML = '';
  if (!sec.special) {
    // SELEÇÃO: disposição real — escudo + 2–10 na esquerda; 11,12 + FOTO DO TIME + 14–20 + grupo na direita
    L.appendChild(makeCell(sec, 1, 'escudo'));
    for (let n = 2; n <= 10; n++) L.appendChild(makeCell(sec, n));
    R.appendChild(makeCell(sec, 11));
    R.appendChild(makeCell(sec, 12));
    R.appendChild(makeCell(sec, 13, 'team-photo'));   // foto horizontal do time (2 colunas)
    for (let n = 14; n <= sec.count; n++) R.appendChild(makeCell(sec, n));
    R.appendChild(groupBox(sec.code));
  } else {
    // ESPECIAIS (Bentô/FWC/Coca): metade dos cromos em cada página
    const half = Math.ceil(sec.count / 2);
    for (let n = 1; n <= half; n++) L.appendChild(makeCell(sec, n));
    for (let n = half + 1; n <= sec.count; n++) R.appendChild(makeCell(sec, n));
  }
  fitSpread();
}

// dica de girar o celular quando estiver em pé (spread fica deitado)
let hintT = null;
function fitSpread() {
  const hint = $('rotate-hint');
  if (!hint) return;
  const portrait = window.innerHeight >= window.innerWidth;
  if (portrait) {
    hint.classList.remove('hidden');
    clearTimeout(hintT); hintT = setTimeout(() => hint.classList.add('hidden'), 3200);
  } else hint.classList.add('hidden');
}
window.addEventListener('orientationchange', () => setTimeout(fitSpread, 300));
window.addEventListener('resize', () => { if (document.body.classList.contains('album-open')) fitSpread(); });

// ---------- 3D de verdade: inclinação do celular / dedo move o brilho holográfico ----------
(function tilt3d() {
  let raf = 0, mx = 50, my = 50, rx = 0, ry = 0;
  function apply() {
    raf = 0;
    const stage = document.querySelector('.album-stage');
    if (!stage) return;
    stage.style.setProperty('--mx', mx.toFixed(1) + '%');
    stage.style.setProperty('--my', my.toFixed(1) + '%');
    stage.style.setProperty('--rx', rx.toFixed(2) + 'deg');
    stage.style.setProperty('--ry', ry.toFixed(2) + 'deg');
  }
  function set(nx, ny) {                 // nx, ny em -1..1
    mx = (nx + 1) * 50; my = (ny + 1) * 50;
    ry = nx * 5; rx = ny * -5;
    if (!raf) raf = requestAnimationFrame(apply);
  }
  const active = () => document.body.classList.contains('album-open');
  document.addEventListener('pointermove', (e) => {
    if (!active()) return;
    set(e.clientX / innerWidth - .5, e.clientY / innerHeight - .5);
  }, { passive: true });
  window.addEventListener('deviceorientation', (e) => {
    if (!active() || e.gamma == null) return;
    const clamp = (v) => Math.max(-1, Math.min(1, v));
    set(clamp(e.gamma / 28), clamp((e.beta - 40) / 28));
  }, { passive: true });
})();

document.querySelectorAll('.mode').forEach((b) => b.addEventListener('click', () => {
  mode = b.dataset.mode;
  document.querySelectorAll('.mode').forEach((x) => x.classList.toggle('sel', x === b));
  toast(mode === 'glue' ? '✅ Toque nas que você COLOU'
    : mode === 'dup' ? '🔁 Toque pra somar uma REPETIDA'
    : '🧽 Toque pra tirar repetida ou desmarcar');
}));
$('btn-all-page').addEventListener('click', () => {
  const sec = section(curSec);
  if (!confirm(`Tem certeza? Vou marcar TODAS as ${sec.count} figurinhas de ${sec.name} como coladas! ✅`)) return;
  const wasPct = S.stats(curSec).pct;
  for (let n = 1; n <= sec.count; n++) S.setGlued(`${sec.code}-${n}`, true);
  renderPage();
  afterChange(curSec, wasPct);
});

// ---------- trocas ----------
function chipHTML(s, dup) {
  const sec = section(s.sec);
  return `<span class="chip${dup ? ' dup' : ''}">${sec.flag} ${s.sec} ${s.num}${dup ? ` (+${S.dups(s.id)})` : ''}</span>`;
}
function renderTrade() {
  const dups = S.dupList(), miss = S.faltaList();   // "faltam" = só o que não temos (exclui antigas/revisão)
  $('trade-dup-count').textContent = dups.reduce((a, s) => a + S.dups(s.id), 0);
  $('trade-miss-count').textContent = miss.length;
  $('trade-dups').innerHTML = dups.length ? dups.map((s) => chipHTML(s, true)).join('') : '<span class="tip">Nenhuma repetida ainda. Use o modo 🔁 no álbum!</span>';
  const MAXSHOW = 160;
  $('trade-missing').innerHTML = miss.length
    ? miss.slice(0, MAXSHOW).map((s) => chipHTML(s, false)).join('') + (miss.length > MAXSHOW ? `<span class="chip">+${miss.length - MAXSHOW}…</span>` : '')
    : '<span class="tip">UAU! Não falta nenhuma! 🏆</span>';
  renderFriends();
}

// ---------- AMIGOS: buscar apelidos cadastrados, adicionar, comparar ----------
function renderFriends() {
  const list = $('friend-list'); if (!list) return;
  const fr = S.state.friends || [];
  const cnt = $('friend-count'); if (cnt) cnt.textContent = fr.length;
  list.innerHTML = fr.length
    ? fr.map((u) => `<span class="friend-chip">👤 <b>${u}</b>
        <button class="fr-cmp" data-friend="${u}">🔍 trocas</button>
        <button class="fr-chat" data-chat="${u}">💬 conversar</button>
        <button class="fr-del" data-friend="${u}" aria-label="Remover">✖</button></span>`).join('')
    : '<span class="tip">Nenhum amigo ainda. Busque um apelido acima! ⬆️</span>';
}
function addFriend(u) {
  u = (u || '').trim().toUpperCase(); if (!u) return;
  S.state.friends = S.state.friends || [];
  if (u === (S.state.user || '')) { toast('Esse é você! 😄'); return; }
  if (S.state.friends.includes(u)) { toast('Esse amigo já está na lista 😉'); return; }
  S.state.friends.push(u); S.save(); autoSave();
  renderFriends();
  $('friend-results').innerHTML = ''; const s = $('friend-search'); if (s) s.value = '';
  toast(`Amigo ${u} adicionado! 🤝`); vib(12);
}
function removeFriend(u) {
  S.state.friends = (S.state.friends || []).filter((x) => x !== u);
  S.save(); autoSave(); renderFriends();
}
async function doFriendSearch() {
  const q = ($('friend-search')?.value || '').trim().toUpperCase();
  const out = $('friend-results');
  if (q.length < 2) { out.innerHTML = '<span class="tip">Digite pelo menos 2 letras.</span>'; return; }
  out.innerHTML = '<span class="tip">🔎 Buscando…</span>';
  try {
    const rows = await searchUsers(q);
    const names = (rows || []).map((r) => (typeof r === 'string' ? r : r.username))
      .filter((u) => u && u !== S.state.user && !(S.state.friends || []).includes(u));
    out.innerHTML = names.length
      ? names.map((u) => `<button class="fr-add" data-add="${u}">➕ ${u}</button>`).join('')
      : '<span class="tip">Ninguém novo encontrado com esse apelido 🤷</span>';
  } catch (e) {
    out.innerHTML = '<span class="tip">😕 Não deu pra buscar agora — confira a internet.</span>';
  }
}
$('btn-friend-search')?.addEventListener('click', doFriendSearch);
$('friend-search')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doFriendSearch(); } });
// clique delegado na tela de trocas: adicionar / comparar / remover
$('scr-trade')?.addEventListener('click', (e) => {
  const t = e.target.closest('[data-add],[data-friend],[data-chat]'); if (!t) return;
  if (t.dataset.add) return addFriend(t.dataset.add);
  if (t.dataset.chat) return openChat(t.dataset.chat);
  const u = t.dataset.friend;
  if (t.classList.contains('fr-del')) return removeFriend(u);
  const fc = $('friend-code'); if (fc) { fc.value = u; $('btn-compare')?.click(); document.getElementById('compare-result')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
});

// ---------- CHAT entre amigos MÚTUOS (texto livre + filtro de palavrão) ----------
// filtro simples no cliente (o back-end só garante que são amigos mútuos)
const BAD_WORDS = ['merda', 'bosta', 'porra', 'caralho', 'buceta', 'cu', 'cuzao', 'cuzão', 'viado', 'viadinho',
  'puta', 'puta que pariu', 'fdp', 'foda', 'foder', 'fudido', 'fudida', 'arrombado', 'corno', 'vagabundo',
  'vagabunda', 'piranha', 'desgraça', 'desgraçado', 'idiota', 'imbecil', 'burro', 'otario', 'otário', 'babaca',
  'retardado', 'macaco', 'lixo', 'nojento', 'pau no cu', 'vai se fuder', 'toma no cu', 'escroto', 'safado',
  'cacete', 'crlh', 'pqp', 'bicha', 'baitola', 'racista', 'gordo', 'feio', 'burra'];
function cleanText(txt) {
  // remove acentos só pra checar, mas mantém o texto original se estiver limpo
  const norm = (txt || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const words = norm.split(/[^a-z0-9]+/).filter(Boolean);
  for (const w of words) if (BAD_WORDS.includes(w)) return { ok: false, word: w };
  // também pega palavrão colado/variações comuns
  for (const b of ['caralho', 'buceta', 'porra', 'viado', 'puta', 'merda', 'foder', 'cuzao', 'fdp']) {
    if (norm.replace(/\s+/g, '').includes(b)) return { ok: false, word: b };
  }
  return { ok: true };
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let chatWith = '';
let chatTimer = null;
let chatLastLen = -1;
function openChat(u) {
  if (!(S.state.user && S.state.pin)) { toast('Entre na sua conta pra conversar! 👤'); return; }
  chatWith = u; chatLastLen = -1;
  $('chat-with').textContent = u;
  $('chat-msg').textContent = '';
  $('chat-input').value = '';
  $('chat-msgs').innerHTML = '<div class="chat-loading">💬 Carregando conversa…</div>';
  $('chat-modal').classList.remove('hidden');
  refreshChat();
  clearTimeout(chatTimer);
  chatTimer = setInterval(refreshChat, 5000);   // atualiza a cada 5s enquanto aberto
  setTimeout(() => $('chat-input')?.focus(), 200);
}
function closeChat() {
  clearInterval(chatTimer); chatTimer = null; chatWith = '';
  $('chat-modal').classList.add('hidden');
}
function renderChat(msgs) {
  const box = $('chat-msgs');
  const me = (S.state.user || '').toUpperCase();
  if (!msgs || !msgs.length) {
    box.innerHTML = '<div class="chat-loading">Nenhuma mensagem ainda. Manda um oi! 👋</div>';
    chatLastLen = 0; return;
  }
  if (msgs.length === chatLastLen) return;   // nada novo: não redesenha (evita piscar)
  box.innerHTML = msgs.map((m) => {
    const mine = String(m.f || '').toUpperCase() === me;
    return `<div class="cmsg ${mine ? 'me' : 'them'}">${esc(m.b)}</div>`;
  }).join('');
  chatLastLen = msgs.length;
  box.scrollTop = box.scrollHeight;   // sempre mostra a mensagem mais nova
}
async function refreshChat() {
  if (!chatWith) return;
  try {
    const r = await loadChat(chatWith);
    if (!r || !r.ok) {
      if (r && r.error === 'nao_mutuo') {
        $('chat-msgs').innerHTML = `<div class="chat-loading">🔒 Vocês precisam ser amigos dos <b>dois lados</b>. Peça pro ${chatWith} também te adicionar!</div>`;
        clearInterval(chatTimer); chatTimer = null;
      }
      return;
    }
    renderChat(r.msgs || []);
  } catch (e) { /* offline: mantém o que tem */ }
}
async function doSendMsg() {
  const inp = $('chat-input'); const body = (inp.value || '').trim();
  const msg = $('chat-msg');
  if (!body) return;
  const chk = cleanText(body);
  if (!chk.ok) { msg.textContent = '🙊 Vamos falar sem palavrão, combinado? Reescreve com carinho.'; vib(20); return; }
  msg.textContent = '';
  inp.value = ''; inp.disabled = true;
  try {
    const r = await sendMsg(chatWith, body);
    inp.disabled = false; inp.focus();
    if (!r || !r.ok) {
      const map = { nao_mutuo: `Vocês precisam ser amigos dos dois lados. Peça pro ${chatWith} te adicionar!`, senha_errada: 'Erro de conta — entre de novo.', amigo_inexistente: 'Esse amigo não existe mais.', devagar: 'Calma! Muitas mensagens seguidas. Espere um pouco. ⏳', vazio: 'Escreva algo primeiro 😊' };
      msg.textContent = map[r && r.error] || 'Não deu pra enviar agora — confira a internet.';
      inp.value = body;   // devolve o texto pra não perder
      return;
    }
    chatLastLen = -1;   // força redesenho
    refreshChat();
  } catch (e) {
    inp.disabled = false; inp.value = body;
    msg.textContent = '😕 Sem internet — tente de novo.';
  }
}
$('chat-close')?.addEventListener('click', closeChat);
$('chat-modal')?.addEventListener('click', (e) => { if (e.target === $('chat-modal')) closeChat(); });
$('chat-send')?.addEventListener('click', doSendMsg);
$('chat-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doSendMsg(); } });
$('btn-whats').addEventListener('click', () => {
  const dups = S.dupList();
  const falta = S.faltaList();                        // só o que realmente não temos (sem antigas/revisão)
  const fmt = (list, withDup) => {
    const bySec = {};
    for (const s of list) (bySec[s.sec] = bySec[s.sec] || []).push(withDup && S.dups(s.id) > 1 ? `${s.num}(x${S.dups(s.id)})` : s.num);
    return Object.entries(bySec).map(([c, nums]) => `${section(c).flag} ${c}: ${nums.join(', ')}`).join('\n');
  };
  // PRIORIDADE: especiais foil (FWC) que faltam vão destacadas no topo
  const foilMiss = falta.filter((s) => s.sec === 'FWC').map((s) => s.num);
  const rest = falta.filter((s) => s.sec !== 'FWC');
  const st = S.stats();
  const foilBlock = foilMiss.length ? `✨ *FOIL ESPECIAIS QUE MAIS QUERO (${foilMiss.length}):*\n🏆 FWC: ${foilMiss.join(', ')}\n\n` : '';
  const antigaNote = st.antiga ? `\n📕 (tenho ${st.antiga} presas no álbum antigo — potencial ${st.potential}%)` : '';
  const txt = `⚽ *MEU ÁLBUM DA COPA 2026* — ${st.pct}% completo${antigaNote}\n\n${foilBlock}🔁 *TENHO REPETIDAS:*\n${fmt(dups, true) || 'nenhuma'}\n\n⬜ *ME FALTAM:*\n${fmt(rest, false) || 'só as foil de cima!'}\n\n📲 Organize o seu: ${location.origin}/copa/`;
  window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
});
$('btn-my-code').addEventListener('click', async () => {
  const code = S.exportCode();
  try { await navigator.clipboard.writeText(code); toast('Código copiado! Manda pro seu amigo 🤝'); }
  catch (e) { $('friend-code').value = code; toast('Código gerado na caixa abaixo!'); }
});
function symbolFromEntry(v) {
  const g = Array.isArray(v) ? v[0] : 0, d = Array.isArray(v) ? (v[1] || 0) : 0;
  return !g ? (d > 0 ? 9 : 0) : 1 + Math.min(d, 7);
}
$('btn-compare').addEventListener('click', async () => {
  const raw = ($('friend-code').value || '').trim().toUpperCase();
  const out = $('compare-result');
  let friend = null;
  if (/^[A-Z0-9]{3,12}$/.test(raw) && !/^COPA\d/.test(raw)) {
    // APELIDO do amigo — busca o álbum público da conta dele
    out.innerHTML = '<div class="grp">☁️ Buscando o álbum do seu amigo…</div>';
    try {
      const pub = await publicAlbum(raw);
      if (pub && pub.st) {
        friend = {};
        for (const id in pub.st) friend[id] = symbolFromEntry(pub.st[id]);
      }
    } catch (e) { /* tenta legado abaixo */ }
    if (!friend && /^[A-Z2-9]{6}$/.test(raw)) {
      try {
        const data = await cloudLoad(raw);   // código antigo de 6 letras
        if (data && data.st) {
          friend = {};
          for (const id in data.st) friend[id] = symbolFromEntry(data.st[id]);
        }
      } catch (e) { /* segue */ }
    }
    if (!friend) { out.innerHTML = '<div class="grp">😕 Não achei esse apelido. Seu amigo precisa criar a conta dele no app primeiro!</div>'; return; }
  } else {
    const r = S.parseCode(raw);
    if (!r.ok) {
      out.innerHTML = r.reason === 'versao'
        ? '<div class="grp">😮 Esse código é de uma versão antiga do álbum. Peça pro amigo atualizar o app e copiar de novo!</div>'
        : '<div class="grp">😕 Código inválido. Cole o código longo (COPA…) ou o código da nuvem (6 letras)!</div>';
      return;
    }
    friend = r.friend;
  }
  const { youGet, youGive } = S.compareWithFriend(friend);
  const st = S.stats();
  const pairs = Math.min(youGet.length, youGive.length);
  const proj = Math.min(100, Math.round(((st.glued + youGet.length) / st.total) * 100));
  const fmt = (list) => list.length ? list.map((s) => `${section(s.sec).flag} ${s.sec} ${s.num}`).join(' · ') : 'nenhuma 😅 — cola mais repetidas no modo 🔁 e tenta de novo!';
  out.innerHTML = `
    ${pairs > 0 ? `<div class="grp win">⚡ TROCA BOA! Vocês têm <b>${pairs}</b> troca${pairs > 1 ? 's' : ''} onde os DOIS saem ganhando!<br>Depois da troca seu álbum pula de <b>${st.pct}%</b> para <b>${proj}%</b>! 🚀</div>` : ''}
    <div class="grp get">🎁 <b>Seu amigo pode te dar (${youGet.length}):</b><br>${fmt(youGet)}</div>
    <div class="grp give">🤲 <b>Você pode dar pra ele (${youGive.length}):</b><br>${fmt(youGive)}</div>`;
  audio.pickup(); vib(15);
  S.bump('compares');
  checkBadges();
});

// ---------- FILA DE REVISÃO (itens ambíguos do scan) — 1 toque por figurinha ----------
function renderReviewList() {
  const box = $('review-list');
  const items = S.reviewList();
  $('review-count').textContent = items.length;
  if (!items.length) {
    box.innerHTML = '<div class="review-done">🎉 Tudo revisado! Nada na fila.</div>';
    return;
  }
  // agrupa por seleção (UI rápida "por seleção")
  const bySec = {};
  for (const s of items) (bySec[s.sec] = bySec[s.sec] || []).push(s);
  box.innerHTML = Object.entries(bySec).map(([code, list]) => {
    const sec = section(code);
    const rows = list.map((s) => `
      <div class="rev-row" data-rev-row="${s.id}">
        <span class="rev-name"><b>${s.num}</b> ${stickerLabel(s.sec, s.num)}</span>
        <span class="rev-acts">
          <button class="rev-b ok"     data-rev-id="${s.id}" data-rev="colada">✅ Colei</button>
          <button class="rev-b old"    data-rev-id="${s.id}" data-rev="antiga">📕 Antigo</button>
          <button class="rev-b no"     data-rev-id="${s.id}" data-rev="falta">❌ Não tenho</button>
        </span>
      </div>`).join('');
    return `<div class="rev-group"><div class="rev-head">${sec.flag} ${sec.name}</div>${rows}</div>`;
  }).join('');
}
function openReview() {
  renderReviewList();
  $('review-modal').classList.remove('hidden');
}
function closeReview() { $('review-modal').classList.add('hidden'); }
$('btn-review')?.addEventListener('click', openReview);
$('review-close')?.addEventListener('click', closeReview);
$('review-modal')?.addEventListener('click', (e) => { if (e.target === $('review-modal')) closeReview(); });
// resolução de 1 toque
$('review-list')?.addEventListener('click', (e) => {
  const b = e.target.closest('[data-rev-id]'); if (!b) return;
  const stickerId = b.dataset.revId, dec = b.dataset.rev;
  S.resolveReview(stickerId, dec);
  audio.key?.(); vib(8);
  // remove a linha com um fade rápido e atualiza contadores
  const row = b.closest('[data-rev-row]');
  if (row) { row.classList.add('rev-gone'); setTimeout(() => { renderReviewList(); }, 160); }
  else renderReviewList();
  $('review-count').textContent = S.reviewCount();
  renderHome();
  autoSave();
  if (S.reviewCount() === 0) {
    setTimeout(() => { closeReview(); celebrate('🔎 REVISÃO COMPLETA!', 'Tudo confirmado. Mandou bem!'); }, 220);
  }
});

// ---------- integração do scan ----------
export function applyScan(secCode, filled) {
  const wasPct = S.stats(secCode).pct;
  let added = 0;
  for (const n of filled) {
    const id = `${secCode}-${n}`;
    if (!S.isGlued(id)) { S.setGlued(id, true); added++; }
  }
  S.bump('scans');
  afterChange(secCode, wasPct);
  return added;
}

// ---------- boot ----------
initScan({ applyScan, toast, vib, openPage });
const refreshAll = () => { renderTop(); renderHome(); if (!screens.trade.classList.contains('hidden')) renderTrade(); };
initCloud({
  toast, vib, refresh: refreshAll,
  // roda DEPOIS da recuperação da nuvem: importa o snapshot da folha (1x só, não-destrutivo)
  afterBoot: async () => {
    try {
      const r = await runScanImport('seed-scan-2026-07-20');
      if (r && r.ok && (r.colada + r.antiga + r.revisar) > 0) {
        refreshAll();
        autoSave();   // sobe pra nuvem o estado já importado
        toast(`📋 Folha importada: ${r.colada} coladas, ${r.antiga} no álbum antigo, ${r.revisar} pra revisar!`);
      }
    } catch (e) { /* import é best-effort; nunca quebra o boot */ }
  },
});
initMaker({ toast, vib });
initLive({ toast, vib, audio, commit: (code, wasPct) => afterChange(code, wasPct) });
renderHome();
renderTop();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {}));
}
