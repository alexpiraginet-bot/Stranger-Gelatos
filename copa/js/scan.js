// ===== Escanear página do álbum com IA de visão =====
// Foto -> reduz no aparelho -> POST /api/scan (chave fica no servidor) -> revisão -> aplicar
import { SECTIONS, section } from './album.js';

let hooks = null;

export function initScan(h) {
  hooks = h;
  const wireInput = (id) => {
    const inp = document.getElementById(id);
    inp?.addEventListener('change', () => {
      const f = inp.files && inp.files[0];
      if (f) handlePhoto(f);
      inp.value = '';
    });
  };
  wireInput('scan-file');
  wireInput('scan-gallery');
  document.getElementById('btn-gallery')?.addEventListener('click', () => document.getElementById('scan-gallery')?.click());
  document.getElementById('btn-open-cam')?.addEventListener('click', openCamera);
  document.getElementById('cam-cancel')?.addEventListener('click', closeCamera);
  document.getElementById('cam-gallery')?.addEventListener('click', () => { closeCamera(); document.getElementById('scan-gallery')?.click(); });
  document.getElementById('cam-shoot')?.addEventListener('click', captureFrame);
}

// ===== câmera com MOLDURA de enquadramento + dicas flutuantes =====
let camStream = null, tipTimer = null;
const CAM_TIPS = [
  '📄 Encaixe a página inteira na moldura',
  '💡 Boa luz, sem flash!',
  '🖐️ Sem dedos em cima das figurinhas',
  '🤳 Segure firme e de frente (por cima)',
  '🔍 Aproxime até a página encher a moldura',
];

async function openCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    document.getElementById('scan-file')?.click();   // aparelho sem suporte: câmera nativa
    return;
  }
  try {
    camStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1440 } },
      audio: false,
    });
  } catch (e) {
    hooks?.toast?.('Sem permissão da câmera — usando a câmera do celular 📸');
    document.getElementById('scan-file')?.click();
    return;
  }
  const v = document.getElementById('cam-video');
  v.srcObject = camStream;
  document.getElementById('cam-modal').classList.remove('hidden');
  // dicas flutuantes girando em volta da moldura
  let i = 0;
  const tip = document.getElementById('cam-tip');
  tip.textContent = CAM_TIPS[0];
  clearInterval(tipTimer);
  tipTimer = setInterval(() => {
    i = (i + 1) % CAM_TIPS.length;
    tip.classList.remove('show');
    setTimeout(() => { tip.textContent = CAM_TIPS[i]; tip.classList.add('show'); }, 180);
  }, 3200);
  tip.classList.add('show');
}

function closeCamera() {
  clearInterval(tipTimer); tipTimer = null;
  document.getElementById('cam-modal').classList.add('hidden');
  if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; }
  const v = document.getElementById('cam-video');
  if (v) v.srcObject = null;
}

// captura APENAS o que está dentro da moldura (foto mais limpa p/ a IA)
function captureFrame() {
  const v = document.getElementById('cam-video');
  const frame = document.getElementById('cam-frame');
  if (!v || !v.videoWidth) { hooks?.toast?.('Câmera ainda abrindo… tenta de novo!'); return; }
  const vr = v.getBoundingClientRect(), fr = frame.getBoundingClientRect();
  // vídeo exibido com object-fit: cover -> mapeia moldura (tela) p/ pixels do vídeo
  const scale = Math.max(vr.width / v.videoWidth, vr.height / v.videoHeight);
  const dispW = v.videoWidth * scale, dispH = v.videoHeight * scale;
  const offX = (dispW - vr.width) / 2, offY = (dispH - vr.height) / 2;
  const sx = Math.max(0, ((fr.left - vr.left) + offX) / scale);
  const sy = Math.max(0, ((fr.top - vr.top) + offY) / scale);
  const sw = Math.min(v.videoWidth - sx, fr.width / scale);
  const sh = Math.min(v.videoHeight - sy, fr.height / scale);
  const cv = document.createElement('canvas');
  const outW = Math.min(1024, Math.round(sw));
  cv.width = outW; cv.height = Math.round(sh * (outW / sw));
  cv.getContext('2d').drawImage(v, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
  hooks?.vib?.(15);
  closeCamera();
  cv.toBlob((blob) => {
    if (blob) handlePhoto(new File([blob], 'pagina.jpg', { type: 'image/jpeg' }));
  }, 'image/jpeg', 0.82);
}

const $ = (id) => document.getElementById(id);

function status(html) {
  const el = $('scan-status');
  if (html === null) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.innerHTML = html;
}

let lastPhoto = null;   // miniatura p/ a criança conferir o que o robô viu

async function handlePhoto(f) {
  $('scan-review').classList.add('hidden');
  status('<span class="spin">⚽</span><br>Olhando sua página com atenção…');
  try {
    const dataUrl = await downscale(f, 1024, 0.75);   // menor = mais rápido e dentro do limite do servidor
    lastPhoto = dataUrl;
    const teams = SECTIONS.map((s) => `${s.code}=${s.name}`).join(', ');
    const counts = SECTIONS.map((s) => `${s.code}:${s.count}`).join(', ');
    const res = await fetch('/api/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: dataUrl, teams, counts }),
      signal: AbortSignal.timeout(60000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(data.error || `Erro ${res.status}`);
    showReview(data);
  } catch (e) {
    const msg = e.name === 'TimeoutError' ? 'demorou demais — internet lenta?' : (e.message || 'erro');
    status(`😕 Não consegui escanear.<br><small>${escapeHtml(msg)}</small><br><small>Tente de novo com a página inteira e bastante luz!</small>`);
  }
}

function showReview(data) {
  status(null);
  const box = $('scan-review');
  const sec = section(String(data.section || '').toUpperCase());
  const inRange = (n) => Number.isInteger(n) && sec && n >= 1 && n <= sec.count;
  const filled = Array.isArray(data.filled) ? data.filled.filter(inRange) : [];
  const empty = Array.isArray(data.empty) ? data.empty.filter(inRange) : [];
  const uncertain = Array.isArray(data.uncertain) ? data.uncertain.filter(inRange) : [];
  const weird = Array.isArray(data.weird) ? data.weird.filter(inRange) : [];
  if (!sec) {
    box.classList.remove('hidden');
    box.innerHTML = `<h3>🤔 Não reconheci a página</h3>
      <p class="tip">${escapeHtml(data.note || 'Tente fotografar a página inteira, mostrando o nome da seleção no topo.')}</p>`;
    return;
  }
  box.classList.remove('hidden');
  box.innerHTML = `
    <h3>${sec.flag} Página: ${sec.name}</h3>
    ${lastPhoto ? `<img class="scan-thumb" src="${lastPhoto}" alt="sua foto" />` : ''}
    <div class="found-list">
      ✅ <b>Coladas que eu vi (${filled.length}):</b> ${filled.length ? filled.join(', ') : '—'}<br>
      ⬜ <b>Espaços vazios (${empty.length}):</b> ${empty.length ? empty.join(', ') : '—'}
      ${uncertain.length ? `<br>🤔 <b>Não tive certeza (${uncertain.length}):</b> ${uncertain.join(', ')} — confira no álbum!` : ''}
      ${weird.length ? `<br>🚨 <b>Figurinha suspeita (${weird.length}):</b> espaço ${weird.join(', ')} — o nome não bate ou não parece oficial! (não vou marcar)` : ''}
      ${data.note ? `<br><small>🤖 ${escapeHtml(data.note)}</small>` : ''}
    </div>
    <button class="mega album ok-btn small-mega" id="scan-apply">✅ ISSO! MARCAR ${filled.length} FIGURINHA${filled.length === 1 ? '' : 'S'}</button>
    <button class="mini wide" id="scan-open">📖 Abrir página ${sec.code} no álbum</button>`;
  $('scan-apply').addEventListener('click', () => {
    const added = hooks.applyScan(sec.code, filled);
    hooks.toast(added > 0 ? `Marquei ${added} figurinha${added > 1 ? 's' : ''} colada${added > 1 ? 's' : ''}! 🎉` : 'Tudo isso já estava marcado! 👍');
    hooks.vib(20);
    box.classList.add('hidden');
    hooks.openPage(sec.code);
  });
  $('scan-open').addEventListener('click', () => hooks.openPage(sec.code));
}

// reduz a foto no aparelho (rápido de enviar e barato pra IA)
function downscale(file, maxSide, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const sc = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.round(img.width * sc), h = Math.round(img.height * sc);
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(cv.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('foto inválida')); };
    img.src = url;
  });
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
