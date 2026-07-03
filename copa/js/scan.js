// ===== Escanear página do álbum com IA de visão =====
// Foto -> reduz no aparelho -> POST /api/scan (chave fica no servidor) -> revisão -> aplicar
import { SECTIONS, section } from './album.js';

let hooks = null;

export function initScan(h) {
  hooks = h;
  const file = document.getElementById('scan-file');
  file.addEventListener('change', () => {
    const f = file.files && file.files[0];
    if (f) handlePhoto(f);
    file.value = '';
  });
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
