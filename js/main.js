import { Engine } from './engine.js';
import { Controls } from './controls.js';
import { Game, STATE } from './game.js';
import { initPWA } from './pwa.js';

initPWA();

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
  transition: document.getElementById('transition-screen'),
  winStats: document.getElementById('win-stats'),
  health: document.getElementById('health-value'),
  keys: document.getElementById('keys-value'),
  battery: document.getElementById('battery-value'),
  hudKeys: document.getElementById('hud-keys'),
  hudBattery: document.getElementById('hud-battery'),
  objective: document.getElementById('objective'),
};

function hideOverlays() {
  ui.start.classList.add('hidden');
  ui.gameover.classList.add('hidden');
  ui.win.classList.add('hidden');
  ui.pause.classList.add('hidden');
  ui.transition.classList.add('hidden');
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
  onHud: ({ health, keys, battery, phase }) => {
    ui.health.textContent = '❤️'.repeat(health) || '💀';
    ui.keys.textContent = `${keys}/3`;
    ui.battery.textContent = `${battery}%`;
    ui.battery.style.color = battery < 25 ? '#ff4444' : '#7CFC00';
    // Chave e bateria só fazem sentido no Avesso
    const inverted = phase === 'inverted';
    ui.hudKeys.classList.toggle('hidden', !inverted);
    ui.hudBattery.classList.toggle('hidden', !inverted);
  },
  onObjective: (text) => { ui.objective.textContent = text; },
  onHurt: () => {
    ui.hurt.classList.remove('show');
    void ui.hurt.offsetWidth; // reinicia a animação
    ui.hurt.classList.add('show');
  },
});

document.getElementById('start-btn').addEventListener('click', () => game.start());
document.getElementById('restart-btn').addEventListener('click', () => game.start());
document.getElementById('win-restart-btn').addEventListener('click', () => game.start());

// Pausa: tecla P (PC) e botão na tela (touch)
window.addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'p') game.togglePause(); });
document.getElementById('btn-pause')?.addEventListener('click', () => game.togglePause());

// Disparo no PC: clique do mouse (quando travado) ou já tratado pela barra de espaço
canvas.addEventListener('mousedown', () => {
  if (game.state === STATE.PLAYING && document.pointerLockElement === canvas) {
    game.weapon.fire();
  }
});

// Loop principal com delta-time real
let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  game.update(dt);
  game.render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
