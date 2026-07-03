// ===== Nuvem (Supabase via RPC segura): salvar/recuperar com código de 6 letras =====
// Segurança: a tabela NÃO é listável — só as funções copa_save/copa_load (rode copa/supabase-copa.sql).
import { state, save as saveLocal, stats } from './state.js';

const SUPA_URL = 'https://txdxtwmvehrzwharvgda.supabase.co';
const SUPA_KEY = 'sb_publishable_5kIYNhWH4jzekXn-qScOcA_GEbEu-b_';
const H = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json' };
const CODE_RE = /^[A-Z2-9]{6}$/;

const $ = (id) => document.getElementById(id);
let toast = () => {};

function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I (criança não confunde)
  let c = '';
  for (let i = 0; i < 6; i++) c += A[(Math.random() * A.length) | 0];
  return c;
}

function rpc(fn, args) {
  return fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers: H, body: JSON.stringify(args),
    signal: AbortSignal.timeout(15000),
  });
}

async function cloudSave() {
  const code = state.cloudCode && CODE_RE.test(state.cloudCode) ? state.cloudCode : newCode();
  const payload = { st: state.st, name: state.name, badges: state.badges, counters: state.counters, milestone: state.milestone };
  const r = await rpc('copa_save', { p_code: code, p_data: payload });
  if (!r.ok) throw new Error(`nuvem ${r.status}`);
  // só grava o código local DEPOIS do sucesso (senão a criança acha que salvou)
  state.cloudCode = code; saveLocal();
  return code;
}

export async function cloudLoad(code) {
  const r = await rpc('copa_load', { p_code: code });
  if (!r.ok) throw new Error(`nuvem ${r.status}`);
  const data = await r.json();
  return data && typeof data === 'object' && data.st ? data : null;
}

// ---- SALVAMENTO AUTOMÁTICO: a cada movimento no álbum, agenda um save (4s) ----
let autoT = null, autoState = '';
function setAutoStatus(txt) {
  autoState = txt;
  const line = $('cloud-code-line');
  if (line && state.cloudCode) {
    line.classList.remove('hidden');
    line.textContent = `☁️ Código: ${state.cloudCode} · ${txt}`;
  }
}
export function autoSave() {
  clearTimeout(autoT);
  setAutoStatus('salvando…');
  autoT = setTimeout(async () => {
    try {
      await cloudSave();
      setAutoStatus('salvo automaticamente ✅');
    } catch (e) {
      setAutoStatus('sem internet — salvo no aparelho 📱');
    }
  }, 4000);
}

function busy(btn, label, fn) {
  return async () => {
    const old = btn.textContent;
    btn.disabled = true; btn.textContent = label;
    try { await fn(); } finally { btn.disabled = false; btn.textContent = old; }
  };
}

export function initCloud(h) {
  toast = h.toast;
  const line = $('cloud-code-line');
  const showCode = () => {
    if (state.cloudCode && CODE_RE.test(state.cloudCode)) {
      line.classList.remove('hidden');
      // textContent (nunca innerHTML) — código pode vir de fora
      line.textContent = `☁️ Seu código da nuvem: ${state.cloudCode} — anote pra recuperar em outro celular!`;
    }
  };
  showCode();

  const btnSave = $('btn-cloud-save');
  btnSave.addEventListener('click', busy(btnSave, '☁️ Salvando…', async () => {
    try {
      const code = await cloudSave();
      showCode();
      toast(`Salvo na nuvem! Código: ${code} ☁️`);
      h.vib?.(10);
    } catch (e) {
      toast('Nuvem indisponível agora 😕 (seus dados continuam no aparelho)');
    }
  }));

  const btnLoad = $('btn-cloud-load');
  btnLoad.addEventListener('click', busy(btnLoad, '📥 Buscando…', async () => {
    const code = (prompt('Digite o código da nuvem (6 letras/números):') || '').trim().toUpperCase();
    if (!code) return;
    if (!CODE_RE.test(code)) { toast('Código inválido — são 6 letras/números 😕'); return; }
    try {
      const data = await cloudLoad(code);
      if (!data) { toast('Código não encontrado 😕'); return; }
      // confirmação com números concretos (evita perda acidental)
      const local = stats().glued;
      const cloudCount = Object.values(data.st || {}).filter((v) => Array.isArray(v) && v[0] === 1).length;
      const okGo = confirm(`⚠️ Isso vai TROCAR o álbum deste aparelho.\n\nAqui: ${local} coladas\nNa nuvem (${code}): ${cloudCount} coladas\n\nQuer trocar mesmo?`);
      if (!okGo) return;
      try { localStorage.setItem('copa26-backup', JSON.stringify(state)); } catch (e) {}
      state.st = data.st || {};
      state.badges = data.badges || state.badges || {};
      state.counters = data.counters || state.counters;
      state.milestone = data.milestone || 0;
      state.cloudCode = code;
      saveLocal();
      location.reload();
    } catch (e) {
      toast('Nuvem indisponível agora 😕');
    }
  }));
}
