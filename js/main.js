import { Input } from './input.js';
import { Game, STATE } from './game.js';

const canvas = document.getElementById('game');
const input = new Input();

// Elementos de UI
const ui = {
  start: document.getElementById('start-screen'),
  gameover: document.getElementById('gameover-screen'),
  win: document.getElementById('win-screen'),
  pause: document.getElementById('pause-screen'),
  hud: document.getElementById('hud'),
  winStats: document.getElementById('win-stats'),
  health: document.getElementById('health-value'),
  keys: document.getElementById('keys-value'),
  battery: document.getElementById('battery-value'),
};

function hideAllOverlays() {
  ui.start.classList.add('hidden');
  ui.gameover.classList.add('hidden');
  ui.win.classList.add('hidden');
  ui.pause.classList.add('hidden');
}

const game = new Game(canvas, input, {
  onStateChange: (state) => {
    hideAllOverlays();
    ui.hud.classList.add('hidden');
    if (state === STATE.PLAYING) {
      ui.hud.classList.remove('hidden');
    } else if (state === STATE.PAUSED) {
      ui.hud.classList.remove('hidden');
      ui.pause.classList.remove('hidden');
    } else if (state === STATE.GAMEOVER) {
      ui.gameover.classList.remove('hidden');
    } else if (state === STATE.WIN) {
      ui.winStats.textContent = game.getWinStats();
      ui.win.classList.remove('hidden');
    } else if (state === STATE.START) {
      ui.start.classList.remove('hidden');
    }
  },
  onHudUpdate: ({ health, keys, battery }) => {
    ui.health.textContent = health;
    ui.keys.textContent = keys;
    ui.battery.textContent = battery;
  },
});

// Botões
document.getElementById('start-btn').addEventListener('click', () => game.start());
document.getElementById('restart-btn').addEventListener('click', () => game.start());
document.getElementById('win-restart-btn').addEventListener('click', () => game.start());

// Loop principal (timestep fixo ~60fps)
let last = performance.now();
let acc = 0;
const STEP = 1000 / 60;

function loop(now) {
  acc += now - last;
  last = now;

  // Pausa via tecla P
  if (input.wasPressed('p')) game.togglePause();

  // Atualiza em passos fixos (evita "túnel" em quedas de fps)
  let steps = 0;
  while (acc >= STEP && steps < 5) {
    game.update();
    acc -= STEP;
    steps++;
  }
  if (steps === 0 && acc > STEP) acc = 0;

  input.clearPressed();
  game.draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
