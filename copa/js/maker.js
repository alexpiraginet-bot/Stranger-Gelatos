// ===== CRIADOR DE FIGURINHA: foto -> recorta a pessoa -> estampa no fundo =====
// Recorte no PRÓPRIO navegador (MediaPipe Selfie Segmentation, sem custo de API).
// Fundos: OFICIAL 26 (azul) e LEGEND (dourada). Nome = apelido da conta.
// Download: figurinha em tamanho real de impressão + folha A4 com linhas de corte.
import { state } from './state.js';
import { mountCard } from './card3d.js';

let hooks = null;
let segmenter = null, segLoading = null;
let lastPhoto = null;      // Image da foto escolhida
let lastSticker = null;    // canvas final da figurinha
let tpl = 'oficial';

const $ = (id) => document.getElementById(id);

// figurinha oficial ≈ 5,0 × 7,8 cm -> 300 DPI
const STK_W = 591, STK_H = 921;

// ---- artes oficiais (fundo BRASIL + selo BENTÔ recortado) — carregam 1x ----
const ASSET = {};
function loadAsset(key, src) {
  if (!ASSET[key]) {
    ASSET[key] = new Promise((resolve) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);   // sem a arte, cai no desenho em canvas
      im.src = src;
    });
  }
  return ASSET[key];
}

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

// ---- fundos ----
// OFICIAL 26 v3: usa a ARTE REAL (icons/sticker-bg.jpg — azul-bebê + 26 verde + BRASIL).
// Desenho em canvas fica só de fallback se a imagem não carregar.
function drawOficialBg(ctx, img) {
  if (!img) return false;
  const sc = Math.max(STK_W / img.width, STK_H / img.height);   // cover
  const w = img.width * sc, h = img.height * sc;
  ctx.drawImage(img, (STK_W - w) / 2, (STK_H - h) / 2, w, h);
  return true;
}
// selo BENTÔ (PNG recortado) por cima de tudo, com sombrinha p/ leitura
function drawSelo(ctx, selo, x, y, h) {
  if (!selo) return;
  const w = h * (selo.width / selo.height);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.35)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 3;
  ctx.drawImage(selo, x - w, y, w, h);   // x = borda direita do selo
  ctx.restore();
}
// fallback antigo (canvas puro), caso a arte não carregue
function drawOficial(ctx) {
  ctx.fillStyle = '#a5ccd6';                       // azul-bebê oficial
  ctx.fillRect(0, 0, STK_W, STK_H);
  // "26" gigante em dois tons de verde (padrão geométrico do fundo)
  ctx.save();
  ctx.font = '900 520px "Baloo 2", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#2f7d52';
  ctx.fillText('2', STK_W * 0.30, STK_H * 0.52);
  ctx.fillStyle = '#57a06b';
  ctx.fillText('6', STK_W * 0.52, STK_H * 0.60);
  ctx.fillStyle = '#2f6f66';
  ctx.font = '900 400px "Baloo 2", Arial, sans-serif';
  ctx.fillText('6', STK_W * 0.72, STK_H * 0.98);
  ctx.restore();
  // quadrado amarelo de destaque
  ctx.fillStyle = '#f4c542';
  ctx.fillRect(STK_W * 0.55, STK_H * 0.36, 120, 120);
}
// elementos que ficam POR CIMA da pessoa (marca, bandeira, texto vertical)
function drawOficialFg(ctx, country = 'BRAZIL') {
  // topo direito: marca 26 + troféu-picolé branco (no lugar do logo FIFA)
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 96px "Baloo 2", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('26', STK_W - 78, 116);
  // picolé-troféu simplificado branco
  const px0 = STK_W - 78, py0 = 138;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(px0, py0 + 8, 15, Math.PI, 0); ctx.rect(px0 - 15, py0 + 8, 30, 30); ctx.fill();
  ctx.fillRect(px0 - 3, py0 + 38, 6, 14);
  ctx.font = '800 20px "Baloo 2", Arial, sans-serif';
  ctx.fillText('BENTÔ', px0, py0 + 72);
  ctx.restore();
  // lateral direita: bandeirinha do Brasil em pill + país na vertical (contorno branco)
  const bx = STK_W - 64, by = STK_H * 0.40;
  ctx.save();
  rr(ctx, bx - 34, by - 26, 68, 52, 14); ctx.fillStyle = '#3c8f5f'; ctx.fill();
  ctx.fillStyle = '#2e9c3f'; ctx.fillRect(bx - 26, by - 18, 52, 36);
  ctx.fillStyle = '#f4c542';
  ctx.beginPath(); ctx.moveTo(bx, by - 15); ctx.lineTo(bx + 22, by); ctx.lineTo(bx, by + 15); ctx.lineTo(bx - 22, by); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1c3d8f'; ctx.beginPath(); ctx.arc(bx, by, 9, 0, 6.29); ctx.fill();
  // país vertical
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.lineJoin = 'round';
  ctx.font = '900 46px "Baloo 2", Arial, sans-serif'; ctx.textAlign = 'center';
  const letters = country.slice(0, 8).split('');
  letters.forEach((L, i) => ctx.strokeText(L, bx, by + 66 + i * 44));
  ctx.restore();
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
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
    const [person, bgArt, selo] = await Promise.all([
      cutPerson(lastPhoto),
      loadAsset('bg', 'icons/sticker-bg.jpg'),
      loadAsset('selo', 'icons/selo-bento.png'),
    ]);
    const cv = document.createElement('canvas'); cv.width = STK_W; cv.height = STK_H;
    const ctx = cv.getContext('2d');
    const usouArte = tpl !== 'legend' && drawOficialBg(ctx, bgArt);
    if (tpl === 'legend') drawLegend(ctx); else if (!usouArte) drawOficial(ctx);
    // pessoa: preenche ~78% da altura, ancorada na base (acima da barra do nome)
    const barH = 108;
    const availH = STK_H - barH - 40;
    const sc = Math.min((STK_W * 0.94) / person.width, (availH * 0.98) / person.height);
    const pw = person.width * sc, ph = person.height * sc;
    ctx.drawImage(person, (STK_W - pw) / 2, STK_H - barH - ph, pw, ph);
    if (tpl === 'legend') {
      // barra LEGEND (dourada)
      ctx.fillStyle = '#3a2400';
      ctx.fillRect(0, STK_H - barH, STK_W, barH);
      ctx.fillStyle = '#ffd76a';
      ctx.font = '800 52px "Baloo 2", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(nick(), STK_W / 2, STK_H - barH / 2 + 6, STK_W - 60);
      ctx.font = '700 24px "Baloo 2", Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,215,106,.75)';
      ctx.fillText('BENTÔ WORLDCUP 26', STK_W / 2, STK_H - 14);
      // selo BENTÔ no topo direito (abaixo da faixa LEGEND)
      drawSelo(ctx, selo, STK_W - 34, 100, 180);
    } else {
      // com a arte real o fundo já tem 26/BRASIL — só entra o selo no lugar do logo FIFA;
      // sem a arte, cai no desenho antigo por cima da pessoa
      if (usouArte) drawSelo(ctx, selo, STK_W - 34, 38, 200);
      else drawOficialFg(ctx);
      // barra VERDE arredondada do nome (igual à figurinha real)
      rr(ctx, 36, STK_H - 176, STK_W - 150, 78, 38);
      ctx.fillStyle = '#3c8f5f'; ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 48px "Baloo 2", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(nick(), 36 + (STK_W - 150) / 2, STK_H - 122, STK_W - 200);
      // pill da data de nascimento + selo BENTÔ (no lugar do Panini)
      const dt = (document.getElementById('maker-date')?.value || '').trim();
      rr(ctx, 36, STK_H - 84, STK_W * 0.52, 48, 20);
      ctx.fillStyle = '#8fb9c2'; ctx.fill();
      ctx.fillStyle = '#123d3f';
      ctx.font = '800 30px "Baloo 2", Arial, sans-serif';
      ctx.fillText(dt || '2026', 36 + STK_W * 0.26, STK_H - 50);
      rr(ctx, STK_W * 0.60, STK_H - 84, STK_W * 0.34, 48, 12);
      ctx.fillStyle = '#f4c93f'; ctx.fill();
      ctx.fillStyle = '#c0392b';
      ctx.font = '900 26px "Baloo 2", Arial, sans-serif';
      ctx.fillText('BENTÔ', STK_W * 0.77, STK_H - 50);
    }
    // borda branca de figurinha + moldura fina
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 26; ctx.strokeRect(0, 0, STK_W, STK_H);
    ctx.strokeStyle = tpl === 'legend' ? '#b8860b' : '#9cc9e4'; ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, STK_W - 32, STK_H - 32);
    lastSticker = cv;
    const img = $('maker-preview');
    img.src = cv.toDataURL('image/png');
    $('maker-result')?.classList.remove('hidden');
    // card 3D holográfico (WebGL): se carregar, substitui a imagem plana
    const box = $('maker-3d'), hint = $('maker-3d-hint');
    mountCard(cv, box).then((ok) => {
      box?.classList.toggle('hidden', !ok);
      hint?.classList.toggle('hidden', !ok);
      img.classList.toggle('hidden', ok);
    }).catch(() => {});
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
