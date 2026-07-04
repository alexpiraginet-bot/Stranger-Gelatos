// ===== CRIADOR DE FIGURINHA: foto -> recorta a pessoa -> estampa no fundo =====
// Recorte no PRÓPRIO navegador (MediaPipe Selfie Segmentation, sem custo de API).
// Fundos: OFICIAL 26 (azul) e LEGEND (dourada). Nome = apelido da conta.
// Download: figurinha em tamanho real de impressão + folha A4 com linhas de corte.
import { state } from './state.js';

let hooks = null;
let segmenter = null, segLoading = null;
let lastPhoto = null;      // Image da foto escolhida
let lastSticker = null;    // canvas final da figurinha
let tpl = 'oficial';

const $ = (id) => document.getElementById(id);

// figurinha oficial ≈ 5,0 × 7,8 cm -> 300 DPI
const STK_W = 591, STK_H = 921;

export function initMaker(h) {
  hooks = h;
  const wire = (id) => {
    const inp = $(id);
    inp?.addEventListener('change', () => {
      const f = inp.files && inp.files[0];
      if (f) loadPhoto(f);
      inp.value = '';
    });
  };
  wire('maker-file');
  wire('maker-gallery');
  $('btn-maker-cam')?.addEventListener('click', () => $('maker-file')?.click());
  $('btn-maker-gal')?.addEventListener('click', () => $('maker-gallery')?.click());
  document.querySelectorAll('.tpl-chip').forEach((b) => b.addEventListener('click', () => {
    tpl = b.dataset.tpl;
    document.querySelectorAll('.tpl-chip').forEach((x) => x.classList.toggle('sel', x === b));
    if (lastPhoto) createSticker();   // troca de fundo re-gera na hora
  }));
  $('btn-maker-create')?.addEventListener('click', createSticker);
  $('btn-maker-dl')?.addEventListener('click', () => downloadCanvas(lastSticker, `figurinha-${nick()}.png`));
  $('btn-maker-a4')?.addEventListener('click', downloadA4);
  const nameInp = $('maker-name');
  if (nameInp && !nameInp.value) nameInp.value = state.user || '';
}

function nick() {
  return (($('maker-name')?.value || state.user || 'CRAQUE').trim().toUpperCase() || 'CRAQUE').slice(0, 16);
}

function status(t) {
  const el = $('maker-status');
  if (!el) return;
  el.classList.toggle('hidden', !t);
  el.innerHTML = t || '';
}

function loadPhoto(file) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    lastPhoto = img;
    $('maker-step2')?.classList.remove('hidden');
    createSticker();
  };
  img.onerror = () => { URL.revokeObjectURL(url); hooks?.toast?.('Foto inválida 😕'); };
  img.src = url;
}

// ---- segmentação da pessoa (lazy: só carrega quando usar) ----
function loadSegmenter() {
  if (segmenter) return Promise.resolve(segmenter);
  if (segLoading) return segLoading;
  segLoading = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
    s.onload = () => {
      try {
        const seg = new window.SelfieSegmentation({
          locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${f}`,
        });
        seg.setOptions({ modelSelection: 1 });
        segmenter = seg;
        resolve(seg);
      } catch (e) { resolve(null); }
    };
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
  return segLoading;
}

// recorta a pessoa; se a mágica falhar, cai num recorte oval (nunca trava)
async function cutPerson(img) {
  const W = Math.min(900, img.width), H = Math.round(img.height * (W / img.width));
  const base = document.createElement('canvas'); base.width = W; base.height = H;
  base.getContext('2d').drawImage(img, 0, 0, W, H);
  const seg = await loadSegmenter();
  if (seg) {
    try {
      const mask = await new Promise((resolve, reject) => {
        seg.onResults((r) => resolve(r.segmentationMask));
        seg.send({ image: base }).catch(reject);
        setTimeout(() => reject(new Error('timeout')), 15000);
      });
      const out = document.createElement('canvas'); out.width = W; out.height = H;
      const ctx = out.getContext('2d');
      ctx.drawImage(mask, 0, 0, W, H);              // máscara (pessoa = claro)
      ctx.globalCompositeOperation = 'source-in';   // mantém só a pessoa
      ctx.drawImage(base, 0, 0, W, H);
      return out;
    } catch (e) { /* cai no oval */ }
  }
  // fallback: recorte oval central (ainda fica fofo)
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const ctx = out.getContext('2d');
  ctx.beginPath();
  ctx.ellipse(W / 2, H / 2, W * 0.42, H * 0.48, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(base, 0, 0, W, H);
  return out;
}

// ---- fundos (desenhados no canvas; sem logos FIFA/Panini — marca BENTÔ) ----
function drawOficial(ctx) {
  // azul-bebê estilo oficial + "26" gigante
  const g = ctx.createLinearGradient(0, 0, 0, STK_H);
  g.addColorStop(0, '#bfe3f2'); g.addColorStop(1, '#8fc8e8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, STK_W, STK_H);
  ctx.save();
  ctx.font = '900 620px "Baloo 2", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(20, 90, 60, 0.18)';
  ctx.fillText('26', STK_W / 2, STK_H * 0.72);
  ctx.fillStyle = 'rgba(255, 215, 80, 0.25)';
  ctx.fillText('26', STK_W / 2 + 10, STK_H * 0.72 + 8);
  ctx.restore();
}
function drawLegend(ctx) {
  // OURO com raios e brilhos (estilo Extra Sticker lendária)
  const g = ctx.createRadialGradient(STK_W / 2, STK_H * 0.4, 60, STK_W / 2, STK_H * 0.5, STK_H * 0.75);
  g.addColorStop(0, '#ffe9a3'); g.addColorStop(0.55, '#f0c14b'); g.addColorStop(1, '#b8860b');
  ctx.fillStyle = g; ctx.fillRect(0, 0, STK_W, STK_H);
  // raios
  ctx.save();
  ctx.translate(STK_W / 2, STK_H * 0.42);
  ctx.fillStyle = 'rgba(255, 246, 200, 0.35)';
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-40, -STK_H); ctx.lineTo(40, -STK_H); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  // brilhos
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * STK_W, y = Math.random() * STK_H, r = 1 + Math.random() * 3;
    ctx.fillStyle = `rgba(255,255,255,${0.25 + Math.random() * 0.5})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill();
  }
  // faixa LEGEND
  ctx.fillStyle = 'rgba(60, 30, 0, 0.85)';
  ctx.fillRect(0, 26, STK_W, 54);
  ctx.font = '800 34px "Baloo 2", Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.fillStyle = '#ffd76a';
  ctx.fillText('★ LEGEND ★', STK_W / 2, 64);
}

async function createSticker() {
  if (!lastPhoto) { hooks?.toast?.('Primeiro tire ou escolha uma foto! 📸'); return; }
  status('<span class="spin">✂️</span> Recortando você da foto… (a mágica leva uns segundinhos)');
  $('btn-maker-create')?.setAttribute('disabled', 'disabled');
  try {
    const person = await cutPerson(lastPhoto);
    const cv = document.createElement('canvas'); cv.width = STK_W; cv.height = STK_H;
    const ctx = cv.getContext('2d');
    if (tpl === 'legend') drawLegend(ctx); else drawOficial(ctx);
    // pessoa: preenche ~78% da altura, ancorada na base (acima da barra do nome)
    const barH = 108;
    const availH = STK_H - barH - 40;
    const sc = Math.min((STK_W * 0.94) / person.width, (availH * 0.98) / person.height);
    const pw = person.width * sc, ph = person.height * sc;
    ctx.drawImage(person, (STK_W - pw) / 2, STK_H - barH - ph, pw, ph);
    // barra do nome (estilo oficial)
    ctx.fillStyle = tpl === 'legend' ? '#3a2400' : '#123d63';
    ctx.fillRect(0, STK_H - barH, STK_W, barH);
    ctx.fillStyle = tpl === 'legend' ? '#ffd76a' : '#ffffff';
    ctx.font = '800 52px "Baloo 2", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(nick(), STK_W / 2, STK_H - barH / 2 + 6, STK_W - 60);
    ctx.font = '700 24px "Baloo 2", Arial, sans-serif';
    ctx.fillStyle = tpl === 'legend' ? 'rgba(255,215,106,.75)' : 'rgba(255,255,255,.75)';
    ctx.fillText('BENTÔ WORLDCUP 26', STK_W / 2, STK_H - 14);
    // borda branca de figurinha + moldura fina
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 26; ctx.strokeRect(0, 0, STK_W, STK_H);
    ctx.strokeStyle = tpl === 'legend' ? '#b8860b' : '#9cc9e4'; ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, STK_W - 32, STK_H - 32);
    lastSticker = cv;
    const img = $('maker-preview');
    img.src = cv.toDataURL('image/png');
    $('maker-result')?.classList.remove('hidden');
    status('');
    hooks?.toast?.('Figurinha criada! ⭐');
    hooks?.vib?.(20);
  } catch (e) {
    status('😕 Não consegui criar — tente outra foto (pessoa bem visível, boa luz).');
  } finally {
    $('btn-maker-create')?.removeAttribute('disabled');
  }
}

// folha A4 (300 DPI) com 2 figurinhas em tamanho REAL + linhas de corte
function downloadA4() {
  if (!lastSticker) return;
  const A4W = 2480, A4H = 3508;
  const cv = document.createElement('canvas'); cv.width = A4W; cv.height = A4H;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, A4W, A4H);
  const positions = [[(A4W - STK_W * 2 - 200) / 2, 400], [(A4W - STK_W * 2 - 200) / 2 + STK_W + 200, 400]];
  for (const [x, y] of positions) {
    ctx.drawImage(lastSticker, x, y, STK_W, STK_H);
    // linhas de corte
    ctx.strokeStyle = '#bbbbbb'; ctx.setLineDash([12, 10]); ctx.lineWidth = 2;
    ctx.strokeRect(x - 8, y - 8, STK_W + 16, STK_H + 16);
    ctx.setLineDash([]);
  }
  ctx.fillStyle = '#333333'; ctx.font = '700 44px Arial, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('✂️ Figurinha BENTÔ WORLDCUP 26 — imprima esta folha A4 em 100% (tamanho real: 5,0 × 7,8 cm)', A4W / 2, 260);
  downloadCanvas(cv, `figurinha-A4-${nick()}.png`);
}

function downloadCanvas(cv, name) {
  if (!cv) return;
  const a = document.createElement('a');
  a.download = name;
  a.href = cv.toDataURL('image/png');
  a.click();
  hooks?.toast?.('Baixando! Depois é só imprimir 🖨️');
}
