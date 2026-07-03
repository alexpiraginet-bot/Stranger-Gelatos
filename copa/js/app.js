// ===== App Figurinhas da Copa 2026 — UI =====
import { SECTIONS, section, stickerLabel } from './album.js';
import * as S from './state.js';
import { initScan } from './scan.js';
import { initCloud } from './cloud.js';

S.load();

const $ = (id) => document.getElementById(id);
const screens = { home: $('scr-home'), album: $('scr-album'), page: $('scr-page'), scan: $('scr-scan'), trade: $('scr-trade') };
let mode = 'glue';
let curSec = null;

// ---------- navegação ----------
export function go(name) {
  for (const k in screens) screens[k].classList.toggle('hidden', k !== name);
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('sel', t.dataset.go === name || (name === 'page' && t.dataset.go === 'album')));
  if (name === 'home') renderHome();
  if (name === 'album') renderTeams();
  if (name === 'trade') renderTrade();
  window.scrollTo(0, 0);
}
document.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.go)));

// ---------- toast ----------
let toastT = null;
export function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 2200);
}

// ---------- topo / início ----------
export function renderTop() {
  const st = S.stats();
  $('progress-fill').style.width = st.pct + '%';
  $('progress-text').textContent = st.pct + '%';
}
function renderHome() {
  const st = S.stats();
  $('home-pct').textContent = st.pct + '%';
  $('home-glued').textContent = st.glued;
  $('home-missing').textContent = st.missing;
  $('home-dups').textContent = st.dups;
  renderTop();
}

// ---------- álbum: grade de seleções ----------
function renderTeams() {
  const wrap = $('album-teams');
  wrap.innerHTML = '';
  for (const sec of SECTIONS) {
    const st = S.stats(sec.code);
    const card = document.createElement('button');
    card.className = 'team-card' + (st.pct === 100 ? ' done' : '') + (sec.bento ? ' bento' : '');
    card.innerHTML = `<span class="flag">${sec.flag}</span> <span class="tname">${sec.name}</span>
      <div class="tbar"><i style="width:${st.pct}%"></i></div>
      <span class="tinfo">${st.glued}/${st.total}${st.dups ? ` · 🔁${st.dups}` : ''}</span>`;
    card.addEventListener('click', () => openPage(sec.code));
    wrap.appendChild(card);
  }
}

// ---------- página da seleção ----------
export function openPage(code) {
  curSec = code;
  renderPage();
  go('page');
}
function renderPage() {
  const sec = section(curSec);
  const st = S.stats(curSec);
  $('page-head').innerHTML = `<span class="flag">${sec.flag}</span><span>${sec.name}<span class="sub">${st.glued}/${st.total} coladas${st.dups ? ` · ${st.dups} repetidas` : ''}</span></span>`;
  const grid = $('page-grid');
  grid.innerHTML = '';
  for (let n = 1; n <= sec.count; n++) {
    const id = `${sec.code}-${n}`;
    const cell = document.createElement('button');
    const glued = S.isGlued(id), d = S.dups(id);
    cell.className = 'cell' + (glued ? ' glued' : '');
    cell.innerHTML = `${n}${d > 0 ? `<span class="dupbadge">+${d}</span>` : ''}`;
    cell.title = stickerLabel(sec.code, n);
    cell.addEventListener('click', () => {
      if (mode === 'glue') { S.setGlued(id, !S.isGlued(id)); if (S.isGlued(id)) vib(8); }
      else if (mode === 'dup') { S.addDup(id, +1); vib(8); }
      else { if (S.dups(id) > 0) S.addDup(id, -1); else S.clearSticker(id); }
      renderPage(); renderTop();
    });
    grid.appendChild(cell);
  }
}
document.querySelectorAll('.mode').forEach((b) => b.addEventListener('click', () => {
  mode = b.dataset.mode;
  document.querySelectorAll('.mode').forEach((x) => x.classList.toggle('sel', x === b));
  $('mode-hint').textContent = mode === 'glue' ? 'Toque nas figurinhas que você já colou!'
    : mode === 'dup' ? 'Toque para somar +1 repetida em cada figurinha!'
    : 'Toque para tirar uma repetida (ou desmarcar).';
}));
$('btn-all-page').addEventListener('click', () => {
  const sec = section(curSec);
  for (let n = 1; n <= sec.count; n++) S.setGlued(`${sec.code}-${n}`, true);
  renderPage(); renderTop(); toast('Página completa! 🎉'); vib(20);
});

// ---------- trocas ----------
function chipHTML(s, dup) {
  const sec = section(s.sec);
  return `<span class="chip${dup ? ' dup' : ''}">${sec.flag} ${s.sec} ${s.num}${dup ? ` (+${S.dups(s.id)})` : ''}</span>`;
}
function renderTrade() {
  const dups = S.dupList(), miss = S.missingList();
  $('trade-dup-count').textContent = dups.reduce((a, s) => a + S.dups(s.id), 0);
  $('trade-miss-count').textContent = miss.length;
  $('trade-dups').innerHTML = dups.length ? dups.map((s) => chipHTML(s, true)).join('') : '<span class="tip">Nenhuma repetida ainda. Use o modo 🔁 no álbum!</span>';
  const MAXSHOW = 160;
  $('trade-missing').innerHTML = miss.length
    ? miss.slice(0, MAXSHOW).map((s) => chipHTML(s, false)).join('') + (miss.length > MAXSHOW ? `<span class="chip">+${miss.length - MAXSHOW}…</span>` : '')
    : '<span class="tip">UAU! Não falta nenhuma! 🏆</span>';
}
$('btn-whats').addEventListener('click', () => {
  const dups = S.dupList(), miss = S.missingList();
  const fmt = (list, withDup) => {
    const bySec = {};
    for (const s of list) (bySec[s.sec] = bySec[s.sec] || []).push(withDup && S.dups(s.id) > 1 ? `${s.num}(x${S.dups(s.id)})` : s.num);
    return Object.entries(bySec).map(([c, nums]) => `${section(c).flag} ${c}: ${nums.join(', ')}`).join('\n');
  };
  const st = S.stats();
  const txt = `⚽ *MEU ÁLBUM DA COPA 2026* — ${st.pct}% completo\n\n🔁 *TENHO REPETIDAS:*\n${fmt(dups, true) || 'nenhuma'}\n\n⬜ *ME FALTAM:*\n${fmt(miss, false) || 'nenhuma!'}\n\n📲 Organize o seu: ${location.origin}/copa/`;
  window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
});
$('btn-my-code').addEventListener('click', async () => {
  const code = S.exportCode();
  try { await navigator.clipboard.writeText(code); toast('Código copiado! Manda pro seu amigo 🤝'); }
  catch (e) { $('friend-code').value = code; toast('Código gerado na caixa abaixo!'); }
});
$('btn-compare').addEventListener('click', () => {
  const friend = S.parseCode($('friend-code').value);
  const out = $('compare-result');
  if (!friend) { out.innerHTML = '<div class="grp">😕 Código inválido. Peça pro amigo copiar de novo!</div>'; return; }
  const { youGet, youGive } = S.compareWithFriend(friend);
  const fmt = (list) => list.length ? list.map((s) => `${section(s.sec).flag} ${s.sec} ${s.num}`).join(' · ') : 'nenhuma 😅';
  out.innerHTML = `
    <div class="grp get">🎁 <b>Seu amigo pode te dar (${youGet.length}):</b><br>${fmt(youGet)}</div>
    <div class="grp give">🤲 <b>Você pode dar pra ele (${youGive.length}):</b><br>${fmt(youGive)}</div>`;
  vib(15);
});

// ---------- util ----------
export function vib(ms) { try { navigator.vibrate?.(ms); } catch (e) {} }
export function applyScan(secCode, filled) {
  let added = 0;
  for (const n of filled) {
    const id = `${secCode}-${n}`;
    if (!S.isGlued(id)) { S.setGlued(id, true); added++; }
  }
  renderTop();
  return added;
}
export { S, toast as showToast };

// ---------- boot ----------
initScan({ applyScan, toast, vib, openPage });
initCloud({ toast });
renderHome();
renderTop();
if ('serviceWorker' in navigator) { /* usa o SW do domínio (network-first) — nada a registrar aqui */ }
