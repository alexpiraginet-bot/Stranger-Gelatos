import { Game, STATE } from './game.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { Assets } from './assets.js';
import { initPWA } from './pwa.js';

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
};

function hideScreens() {
  ui.start.classList.add('hidden');
  ui.gameover.classList.add('hidden');
  ui.win.classList.add('hidden');
  ui.transition.classList.add('hidden');
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
    else if (s === STATE.WIN) { ui.winStats.textContent = stats(); ui.win.classList.remove('hidden'); }
    else if (s === STATE.START) ui.start.classList.remove('hidden');
  },
  onHud: ({ health, ammo, keys, coins, phase }) => {
    ui.health.textContent = '❤️'.repeat(health) || '💀';
    ui.ammo.textContent = ammo;
    ui.ammo.style.color = ammo <= 3 ? '#ff5555' : '#fff';
    ui.keys.textContent = `${keys}/3`;
    ui.coins.textContent = coins;
    ui.hudKeys.classList.toggle('hidden', phase !== 'avesso');
  },
  onObjective: (t) => { ui.objective.textContent = t; },
  onBoss: ({ exists, active, dead, hp, max }) => {
    const show = exists && active && !dead;
    ui.bossBar.classList.toggle('hidden', !show);
    if (show) ui.bossFill.style.width = `${Math.max(0, (hp / max) * 100)}%`;
  },
});

// também esconde a barra do chefe ao sair do jogo
function hideBoss() { ui.bossBar.classList.add('hidden'); }

function stats() {
  const secs = Math.round((performance.now() - game.startTime) / 1000);
  return `Tempo: ${Math.floor(secs / 60)}m ${secs % 60}s · Sorvetes: ${game.player.coins} 🍨`;
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

function startGame() { audio.resume(); lockLandscape(); updateOrientation(); game.start(); }
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('win-restart-btn').addEventListener('click', startGame);

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
