import { Engine } from './engine.js';
import { Controls } from './controls.js';
import { Game, STATE } from './game.js';
import { initPWA } from './pwa.js';
import { Audio } from './audio.js';

initPWA();
const audio = new Audio();

const canvas = document.getElementById('game');
const container = document.getElementById('game-container');

const engine = new Engine(canvas);
const controls = new Controls(container, canvas);

const ui = {
  start: document.getElementById('start-screen'),
  gameover: document.getElementById('gameover-screen'),
  win: document.getElementById('win-screen'),
  pause: document.getElementById('pause-screen'),
  hud: document.getElementById('hud'),
  touch: document.getElementById('touch-controls'),
  crosshair: document.getElementById('crosshair'),
  hurt: document.getElementById('hurt-flash'),
  vignette: document.getElementById('vignette'),
  transition: document.getElementById('transition-screen'),
  winStats: document.getElementById('win-stats'),
  health: document.getElementById('health-value'),
  keys: document.getElementById('keys-value'),
  battery: document.getElementById('battery-value'),
  ammo: document.getElementById('ammo-value'),
  hudKeys: document.getElementById('hud-keys'),
  hudBattery: document.getElementById('hud-battery'),
  hudAmmo: document.getElementById('hud-ammo'),
  objective: document.getElementById('objective'),
};

function hideOverlays() {
  ui.start.classList.add('hidden');
  ui.gameover.classList.add('hidden');
  ui.win.classList.add('hidden');
  ui.pause.classList.add('hidden');
  ui.transition.classList.add('hidden');
  ui.vignette.classList.remove('show');
}

function showPlayHUD(show) {
  ui.hud.classList.toggle('hidden', !show);
  ui.crosshair.classList.toggle('hidden', !show);
  // controles touch só em dispositivos com toque
  ui.touch.classList.toggle('hidden', !(show && controls.isTouch));
}

const game = new Game(engine, controls, {
  onState: (s) => {
    hideOverlays();
    showPlayHUD(false);
    if (s === STATE.PLAYING) showPlayHUD(true);
    else if (s === STATE.PAUSED) { showPlayHUD(true); ui.pause.classList.remove('hidden'); }
    else if (s === STATE.TRANSITION) ui.transition.classList.remove('hidden');
    else if (s === STATE.GAMEOVER) ui.gameover.classList.remove('hidden');
    else if (s === STATE.WIN) { ui.winStats.textContent = game.getStats(); ui.win.classList.remove('hidden'); }
    else if (s === STATE.START) ui.start.classList.remove('hidden');
  },
  onHud: ({ health, keys, battery, ammo, phase }) => {
    ui.health.textContent = '❤️'.repeat(health) || '💀';
    ui.keys.textContent = `${keys}/3`;
    ui.battery.textContent = `${battery}%`;
    ui.battery.style.color = battery < 25 ? '#ff4444' : '#7CFC00';
    ui.ammo.textContent = `${ammo}`;
    ui.ammo.style.color = ammo <= 3 ? '#ff4444' : '#fff';
    // Chave, munição e bateria só aparecem no Avesso
    const inverted = phase === 'inverted';
    ui.hudKeys.classList.toggle('hidden', !inverted);
    ui.hudBattery.classList.toggle('hidden', !inverted);
    ui.hudAmmo.classList.toggle('hidden', !inverted);
    ui.vignette.classList.toggle('show', inverted);
  },
  onObjective: (text) => { ui.objective.textContent = text; },
  audio,
  onHurt: () => {
    ui.hurt.classList.remove('show');
    void ui.hurt.offsetWidth; // reinicia a animação
    ui.hurt.classList.add('show');
  },
});

// ----- Orientação: força/incentiva paisagem no celular -----
const ui_rotate = document.getElementById('rotate-screen');
const portraitMq = window.matchMedia('(orientation: portrait)');
let rotateBlocked = false;

function lockLandscape() {
  // Funciona em apps instalados (PWA) e navegadores que suportam; iOS ignora
  try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch (e) {}
  try {
    const el = document.documentElement;
    if (controls.isTouch && el.requestFullscreen) el.requestFullscreen().catch(() => {});
  } catch (e) {}
}

function updateOrientation() {
  rotateBlocked = controls.isTouch && portraitMq.matches;
  ui_rotate.classList.toggle('show', rotateBlocked);
}
portraitMq.addEventListener?.('change', updateOrientation);
window.addEventListener('resize', updateOrientation);
window.addEventListener('orientationchange', () => setTimeout(updateOrientation, 150));
updateOrientation();

function startGame() { audio.resume(); lockLandscape(); updateOrientation(); game.start(); }
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('win-restart-btn').addEventListener('click', startGame);

// Pausa: tecla P (PC) e botão na tela (touch)
window.addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'p') game.togglePause(); });
document.getElementById('btn-pause')?.addEventListener('click', () => game.togglePause());

// Disparo no PC: clique do mouse (quando travado) ou já tratado pela barra de espaço
canvas.addEventListener('mousedown', () => {
  if (game.state === STATE.PLAYING && document.pointerLockElement === canvas) {
    const r = game.weapon.fire();
    if (r === true) audio.shoot();
    else if (r === 'empty') audio.empty();
  }
});

// Loop principal com delta-time real
let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  // Em retrato no celular, congela o jogo até girar (mas segue renderizando)
  if (!rotateBlocked) game.update(dt);
  game.render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
