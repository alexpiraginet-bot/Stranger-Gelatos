import { Game, STATE } from './game.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { Assets } from './assets.js';
import { initPWA } from './pwa.js';
import { Leaderboard, makeCoupon } from './leaderboard.js';

initPWA();

const canvas = document.getElementById('game');
const input = new Input();
const audio = new Audio();

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 150));
resize();

const ui = {
  start: document.getElementById('start-screen'),
  gameover: document.getElementById('gameover-screen'),
  win: document.getElementById('win-screen'),
  transition: document.getElementById('transition-screen'),
  hud: document.getElementById('hud'),
  touch: document.getElementById('touch-controls'),
  objective: document.getElementById('objective'),
  health: document.getElementById('health-value'),
  ammo: document.getElementById('ammo-value'),
  keys: document.getElementById('keys-value'),
  coins: document.getElementById('coins-value'),
  hudKeys: document.getElementById('hud-keys'),
  winStats: document.getElementById('win-stats'),
  bossBar: document.getElementById('boss-bar'),
  bossFill: document.getElementById('boss-fill'),
  rotate: document.getElementById('rotate-screen'),
  stage: document.getElementById('stage-value'),
  transitionTitle: document.getElementById('transition-title'),
  transitionSub: document.getElementById('transition-sub'),
  progressMarkers: document.getElementById('progress-markers'),
  progressPlayer: document.getElementById('progress-player'),
  username: document.getElementById('username'),
  winScore: document.getElementById('win-score'),
  couponBox: document.getElementById('coupon-box'),
  leaderboard: document.getElementById('leaderboard-screen'),
  lbList: document.getElementById('leaderboard-list'),
};

// ---- Apelido (persistido) ----
ui.username.value = localStorage.getItem('sg-name') || '';
ui.username.addEventListener('input', () => localStorage.setItem('sg-name', ui.username.value.trim().toUpperCase()));
function getName() {
  let n = (ui.username.value || localStorage.getItem('sg-name') || '').trim().toUpperCase();
  if (!n) { n = 'BENTO' + ((Math.random() * 900 + 100) | 0); ui.username.value = n; localStorage.setItem('sg-name', n); }
  return n.slice(0, 14);
}

// ---- Placar ----
async function showLeaderboard() {
  ui.leaderboard.classList.remove('hidden');
  ui.lbList.textContent = 'carregando…';
  const rows = await Leaderboard.top(10);
  if (!rows) { ui.lbList.innerHTML = '<p>placar indisponível agora 😕</p>'; return; }
  if (!rows.length) { ui.lbList.innerHTML = '<p>seja o primeiro a pontuar! 🍦</p>'; return; }
  const me = getName();
  const di = { easy: '😎', medium: '🔥', hard: '💀' };
  ui.lbList.innerHTML = rows.map((r, i) =>
    `<div class="lb-row${r.name === me ? ' me' : ''}"><span><span class="lb-rank">${i + 1}.</span> ${(r.name || '???').slice(0, 14)} ${di[r.difficulty] || ''}</span><span>${r.score}</span></div>`
  ).join('');
}

function hideScreens() {
  ui.start.classList.add('hidden');
  ui.gameover.classList.add('hidden');
  ui.win.classList.add('hidden');
  ui.transition.classList.add('hidden');
  ui.leaderboard.classList.add('hidden');
}
function showHUD(v) {
  ui.hud.classList.toggle('hidden', !v);
  ui.touch.classList.toggle('hidden', !(v && input.isTouch));
}

const game = new Game(canvas, input, {
  audio,
  onState: (s) => {
    hideScreens(); showHUD(false); hideBoss();
    if (s === STATE.PLAYING) showHUD(true);
    else if (s === STATE.TRANSITION) ui.transition.classList.remove('hidden');
    else if (s === STATE.GAMEOVER) ui.gameover.classList.remove('hidden');
    else if (s === STATE.WIN) { onWin(); ui.win.classList.remove('hidden'); }
    else if (s === STATE.START) ui.start.classList.remove('hidden');
  },
  onMarkers: (marks) => {
    ui.progressMarkers.innerHTML = marks
      .map((m) => `<span style="left:${(m.p * 100).toFixed(1)}%">${m.icon}</span>`)
      .join('');
  },
  onHud: ({ health, ammo, keys, coins, phase, stage, stages, progress }) => {
    ui.health.textContent = '❤️'.repeat(health) || '💀';
    ui.ammo.textContent = ammo;
    ui.ammo.style.color = ammo <= 3 ? '#ff5555' : '#fff';
    ui.keys.textContent = `${keys}/3`;
    ui.coins.textContent = coins;
    if (ui.stage) ui.stage.textContent = `${stage}/${stages}`;
    if (ui.progressPlayer) ui.progressPlayer.style.left = `${((progress || 0) * 100).toFixed(1)}%`;
    ui.hudKeys.classList.toggle('hidden', phase !== 'avesso');
  },
  onObjective: (t) => { ui.objective.textContent = t; },
  onTransition: (title, sub) => {
    if (ui.transitionTitle) ui.transitionTitle.textContent = title;
    if (ui.transitionSub) ui.transitionSub.textContent = sub;
  },
  onBoss: ({ exists, active, dead, hp, max }) => {
    const show = exists && active && !dead;
    ui.bossBar.classList.toggle('hidden', !show);
    if (show) ui.bossFill.style.width = `${Math.max(0, (hp / max) * 100)}%`;
  },
});

// também esconde a barra do chefe ao sair do jogo
function hideBoss() { ui.bossBar.classList.add('hidden'); }

function stats() {
  const r = game.getRun();
  return `Tempo: ${Math.floor(r.secs / 60)}m ${r.secs % 60}s · Sorvetes: ${r.coins} 🍨 · Monstros: ${r.kills} 👾`;
}

function onWin() {
  const score = game.getScore();
  ui.winScore.textContent = `★ ${score} pontos ★`;
  ui.winStats.textContent = stats();
  const name = getName();
  // envia pontuação ao placar
  Leaderboard.submit({ name, score, difficulty: game.diff.key, coins: game.player.coins, kills: game.kills, stage: game.keysBanked });
  // cupom por derrotar o chefão
  const code = makeCoupon();
  ui.couponBox.classList.remove('hidden');
  ui.couponBox.innerHTML = `🎟️ Cupom por derrotar o Vecna:<br><b style="font-size:15px;letter-spacing:1px">${code}</b><br><span style="font-size:8px">mostre na Bentô Gelatos</span>`;
  Leaderboard.saveCoupon({ code, name, difficulty: game.diff.key });
}

// ---- Orientação: força paisagem no celular ----
const portraitMq = window.matchMedia('(orientation: portrait)');
let rotateBlocked = false;
function lockLandscape() {
  try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch (e) {}
  try { if (input.isTouch && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); } catch (e) {}
}
function updateOrientation() {
  rotateBlocked = input.isTouch && portraitMq.matches;
  ui.rotate.classList.toggle('show', rotateBlocked);
}
portraitMq.addEventListener?.('change', updateOrientation);
window.addEventListener('resize', updateOrientation);
window.addEventListener('orientationchange', () => setTimeout(updateOrientation, 150));
updateOrientation();

// ---- Dificuldade (persistida no aparelho) ----
let difficulty = localStorage.getItem('sg-diff') || 'medium';
const diffBtns = document.querySelectorAll('.diff-btn');
function markDiff() {
  diffBtns.forEach((b) => b.classList.toggle('selected', b.dataset.diff === difficulty));
}
diffBtns.forEach((b) => b.addEventListener('click', () => {
  difficulty = b.dataset.diff;
  localStorage.setItem('sg-diff', difficulty);
  markDiff();
}));
markDiff();

function startGame() { audio.resume(); lockLandscape(); updateOrientation(); game.setDifficulty(difficulty); game.start(); }
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', () => { audio.resume(); lockLandscape(); updateOrientation(); game.retry(); }); // tenta a fase de novo
document.getElementById('win-restart-btn').addEventListener('click', startGame);
document.getElementById('leaderboard-btn').addEventListener('click', showLeaderboard);
document.getElementById('win-leaderboard-btn').addEventListener('click', showLeaderboard);
document.getElementById('lb-close').addEventListener('click', () => ui.leaderboard.classList.add('hidden'));

let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  if (!rotateBlocked) game.update(dt); // congela em retrato até girar
  game.draw();
  requestAnimationFrame(loop);
}

// libera o botão e inicia o loop quando a arte carregar (com fallback)
let _begun = false;
function begin() {
  if (_begun) return;
  _begun = true;
  const btn = document.getElementById('start-btn');
  btn.removeAttribute('disabled');
  btn.textContent = '▶ JOGAR';
  document.getElementById('loading')?.classList.add('hidden');
  requestAnimationFrame(loop);
}
Assets.load().then(begin);
setTimeout(begin, 6000); // fallback: nunca deixa o botão preso em "CARREGANDO…"
