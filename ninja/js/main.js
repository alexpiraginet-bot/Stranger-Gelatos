// ============================================================================
// GELO NINJA — entrada: telas, HUD, controles, laço principal e instalação.
// ============================================================================

import { WEAPONS, unlockedWeapons, flavorFor, LEVELS_PER_CYCLE } from './config.js';
import { State } from './state.js';
import { Sfx } from './audio.js';
import { Game } from './game.js';

const $ = (id) => document.getElementById(id);
const cv = $('cv');
const sfx = new Sfx();
State.load();
if (State.data.muted) sfx.on = false;

const SCREENS = ['scr-home', 'scr-arsenal', 'scr-como', 'scr-pause', 'scr-fail', 'scr-unlock', 'scr-cycle', 'scr-install'];
let current = 'scr-home';
let pendingUnlock = null;

function show(id) {
  for (const s of SCREENS) $(s).classList.toggle('hidden', s !== id);
  current = id || '';
  $('hud').classList.toggle('hidden', !!id);
  game.paused = !!id && id !== 'scr-home';
}

function hideAll() { show(null); }

// ---------------------------------------------------------------- jogo ----
const game = new Game(cv, sfx, {
  onHud: updateHud,
  onLevel: onLevel,
  onFail: onFail,
  onUnlock: onUnlock,
  onCycle: onCycle,
});

function updateHud(s) {
  $('hud-level').textContent = `FASE ${s.level}`;
  $('hud-cycle').textContent = `CICLO ${s.cycle} · ${flavorFor(s.cycle).name}`;
  $('hud-score').textContent = s.score.toLocaleString('pt-BR');
  $('hud-coins').textContent = s.coins;
  $('hud-weapon-icon').textContent = s.weapon.icon;
  $('hud-weapon-name').textContent = s.weapon.name;

  const pips = $('hud-blades');
  const total = s.maxBlades;
  pips.classList.toggle('dense', total > 8);
  if (pips.childElementCount !== total) {
    pips.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const d = document.createElement('i');
      d.className = 'blade-pip';
      pips.appendChild(d);
    }
  }
  [...pips.children].forEach((el, i) => el.classList.toggle('used', i >= s.blades));

  const bw = $('boss-wrap');
  if (s.boss != null) {
    bw.classList.remove('hidden');
    $('boss-name').textContent = s.bossName || 'CHEFE';
    $('boss-fill').style.width = `${Math.max(0, s.boss * 100).toFixed(1)}%`;
  } else bw.classList.add('hidden');
}

function onLevel(plan) {
  const first = State.data.level === 1 && State.data.cycle === 1 && !State.data.seenTutorial;
  $('tut').classList.toggle('hidden', !first);
  if (first) {
    setTimeout(() => {
      $('tut').classList.add('hidden');
      State.data.seenTutorial = true;
      State.save();
    }, 6000);
  }
  if (plan.boss) document.body.style.setProperty('--line', 'rgba(255,106,140,0.28)');
  else document.body.style.removeProperty('--line');
}

function onFail() {
  $('fail-sub').textContent = game.plan?.boss
    ? 'O chefe aguentou. Troque de arma e volte.'
    : 'As lâminas acabaram. Mire pelo núcleo brilhante.';
  show('scr-fail');
}

function onUnlock(w) {
  pendingUnlock = w;
  $('unlock-icon').textContent = w.icon;
  $('unlock-name').textContent = w.name;
  $('unlock-desc').textContent = w.desc;
  show('scr-unlock');
}

function onCycle(info) {
  $('cycle-num').textContent = info.cycle;
  $('cycle-flavor').textContent = info.flavor.name;
  $('cycle-score').textContent = info.score.toLocaleString('pt-BR');
  show('scr-cycle');
}

// -------------------------------------------------------------- telas ----
function refreshHome() {
  const d = State.data;
  $('home-progress').textContent = `FASE ${d.level}${d.cycle > 1 ? ` · C${d.cycle}` : ''}`;
  $('home-best').textContent = d.best.toLocaleString('pt-BR');
  $('home-coins').textContent = d.coins;
  $('btn-mute').textContent = sfx.on ? '🔊 SOM' : '🔇 MUDO';
}

function buildArsenal() {
  const d = State.data;
  const open = new Set(unlockedWeapons(d.maxLevel, d.cycle).map((w) => w.id));
  const list = $('arsenal-list');
  list.innerHTML = '';
  for (const w of WEAPONS) {
    const on = open.has(w.id);
    const b = document.createElement('button');
    b.className = `wcard${on ? '' : ' locked'}${d.weapon === w.id ? ' on' : ''}`;
    b.innerHTML = `<span class="ic">${on ? w.icon : '🔒'}</span>
      <span class="tx"><b>${w.name}</b><small>${on ? w.desc : `Vença o chefe da fase ${w.unlock} para liberar.`}</small></span>
      <span class="tag">${d.weapon === w.id ? 'EM USO' : on ? 'USAR' : `FASE ${w.unlock}`}</span>`;
    if (on) {
      b.addEventListener('click', () => {
        d.weapon = w.id; State.save(); sfx.ui(); buildArsenal(); game.pushHud();
      });
    }
    list.appendChild(b);
  }
}

function startRun() {
  sfx.resume();
  game.buildLevel();
  hideAll();
}

// -------------------------------------------------------------- botões ---
$('btn-play').addEventListener('click', () => { sfx.ui(); startRun(); });
$('btn-arsenal').addEventListener('click', () => { sfx.ui(); buildArsenal(); show('scr-arsenal'); });
$('btn-arsenal-close').addEventListener('click', () => {
  sfx.ui();
  show(game.phase === 'idle' || game.phase === 'hold' ? 'scr-home' : 'scr-pause');
  if (current === 'scr-home') refreshHome();
});
$('btn-como').addEventListener('click', () => { sfx.ui(); show('scr-como'); });
$('btn-como-close').addEventListener('click', () => { sfx.ui(); show('scr-home'); });

$('btn-pause').addEventListener('click', () => { sfx.ui(); show('scr-pause'); });
$('chip-weapon').addEventListener('click', () => { sfx.ui(); buildArsenal(); show('scr-arsenal'); });
$('btn-resume').addEventListener('click', () => { sfx.ui(); hideAll(); });
$('btn-pause-arsenal').addEventListener('click', () => { sfx.ui(); buildArsenal(); show('scr-arsenal'); });
$('btn-pause-home').addEventListener('click', () => { sfx.ui(); goHome(); });

$('btn-retry').addEventListener('click', () => { sfx.ui(); sfx.resume(); game.retry(); hideAll(); });
$('btn-fail-arsenal').addEventListener('click', () => { sfx.ui(); buildArsenal(); show('scr-arsenal'); });
$('btn-fail-home').addEventListener('click', () => { sfx.ui(); goHome(); });

$('btn-unlock-equip').addEventListener('click', () => {
  if (pendingUnlock) { State.data.weapon = pendingUnlock.id; State.save(); }
  pendingUnlock = null; sfx.ui(); game.buildLevel(); hideAll();
});
$('btn-unlock-skip').addEventListener('click', () => {
  pendingUnlock = null; sfx.ui(); game.buildLevel(); hideAll();
});
$('btn-cycle-go').addEventListener('click', () => { sfx.ui(); game.buildLevel(); hideAll(); });

$('btn-mute').addEventListener('click', () => {
  State.data.muted = !sfx.toggle(); State.save(); refreshHome();
});
$('btn-reset').addEventListener('click', () => {
  if (!confirm('Recomeçar da fase 1 do ciclo 1? As cerejas e o recorde continuam.')) return;
  State.reset(); attract(); refreshHome(); sfx.ui();
});

function goHome() {
  sfx.stopPad();
  attract();
  refreshHome();
  show('scr-home');
}

// Cena de atração: a fase roda sozinha atrás do menu.
function attract() {
  game.buildLevel();
  game.phase = 'idle';
  sfx.stopPad();
}

// ------------------------------------------------------------ controles --
cv.addEventListener('pointerdown', (e) => {
  if (current) return;
  cv.setPointerCapture?.(e.pointerId);
  sfx.resume();
  game.aimStart(e.clientX, e.clientY);
}, { passive: true });
cv.addEventListener('pointermove', (e) => { if (!current) game.aimMove(e.clientX, e.clientY); }, { passive: true });
cv.addEventListener('pointerup', () => { if (!current) game.aimEnd(); }, { passive: true });
cv.addEventListener('pointercancel', () => { game.aiming = false; }, { passive: true });
cv.addEventListener('contextmenu', (e) => e.preventDefault());

addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.key === 'Escape') { current ? (current === 'scr-pause' && hideAll()) : show('scr-pause'); return; }
  if (current) return;
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); game.aiming = false; game.fire(); }
});
addEventListener('keydown', (e) => {
  if (current) return;
  if (e.key === 'ArrowLeft') game.nudge(-1);
  if (e.key === 'ArrowRight') game.nudge(1);
});

addEventListener('resize', () => game.resize());
addEventListener('orientationchange', () => setTimeout(() => game.resize(), 220));
document.addEventListener('visibilitychange', () => {
  if (document.hidden && !current && game.phase === 'play') show('scr-pause');
});

// ------------------------------------------------------------------ PWA --
const ua = navigator.userAgent || '';
const isiOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /android/i.test(ua);
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
let deferred = null;

const STEPS = {
  ios: ['INSTALAR NO IPHONE', '<p>1️⃣ Toque em <b>Compartilhar</b> ⎙ na barra do Safari.</p><p>2️⃣ Role e toque em <b>"Adicionar à Tela de Início"</b>.</p><p>3️⃣ Abra pelo ícone do <b>GELO NINJA</b>. ❄️</p>'],
  android: ['INSTALAR NO ANDROID', '<p>1️⃣ Toque no menu <b>⋮</b> do Chrome.</p><p>2️⃣ Toque em <b>"Instalar app"</b>.</p><p>3️⃣ Abra pelo ícone do <b>GELO NINJA</b>. ❄️</p>'],
  desktop: ['INSTALAR NO COMPUTADOR', '<p>1️⃣ Clique no ícone <b>⊕</b> na barra de endereço.</p><p>2️⃣ Confirme em <b>"Instalar"</b>.</p>'],
};

if (!standalone && (isiOS || isAndroid)) $('btn-install').classList.remove('hidden');
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; $('btn-install').classList.remove('hidden'); });
addEventListener('appinstalled', () => { $('btn-install').classList.add('hidden'); deferred = null; });

$('btn-install').addEventListener('click', async () => {
  sfx.ui();
  if (deferred) {
    deferred.prompt();
    const c = await deferred.userChoice.catch(() => null);
    deferred = null;
    if (c && c.outcome === 'accepted') { $('btn-install').classList.add('hidden'); return; }
  }
  const k = isiOS ? 'ios' : isAndroid ? 'android' : 'desktop';
  $('install-title').textContent = STEPS[k][0];
  $('install-steps').innerHTML = STEPS[k][1];
  show('scr-install');
});
$('btn-install-close').addEventListener('click', () => { sfx.ui(); show('scr-home'); });

if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// ------------------------------------------------------------- laço -----
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  // window.__loop = false deixa os testes conduzirem o relógio manualmente
  if (window.__loop !== false) { game.update(dt); game.draw(); }
  requestAnimationFrame(frame);
}

// Ponte de diagnóstico: dá acesso ao motor pelo console do navegador e pelos
// testes automatizados (window.__loop = false deixa o teste conduzir o relógio).
// Junto com ?fase=57&ciclo=2 na URL, permite abrir direto em qualquer fase.
window.__g = game; window.__s = State; window.__api = { WEAPONS, flavorFor };

attract();
refreshHome();
show('scr-home');
requestAnimationFrame(frame);

// atalho de diagnóstico: ?fase=57&ciclo=2 abre direto naquela fase
const q = new URLSearchParams(location.search);
if (q.has('fase')) {
  State.data.level = Math.max(1, Math.min(LEVELS_PER_CYCLE, +q.get('fase') || 1));
  State.data.cycle = Math.max(1, +q.get('ciclo') || 1);
  State.data.maxLevel = Math.max(State.data.maxLevel, State.data.level);
  attract(); refreshHome();
}
