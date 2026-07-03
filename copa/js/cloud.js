// ===== Nuvem com LOGIN SIMPLES: apelido + senha de 4 números =====
// O álbum segue a pessoa em qualquer celular. Tabela fechada; acesso só por
// RPCs (copa_signup / copa_auth_save / copa_auth_load / copa_public_album).
import { state, save as saveLocal, stats } from './state.js';

const SUPA_URL = 'https://txdxtwmvehrzwharvgda.supabase.co';
const SUPA_KEY = 'sb_publishable_5kIYNhWH4jzekXn-qScOcA_GEbEu-b_';
const H = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json' };
const USER_RE = /^[A-Z0-9]{3,12}$/;
const PIN_RE = /^[0-9]{4}$/;
const LEGACY_RE = /^[A-Z2-9]{6}$/;

const $ = (id) => document.getElementById(id);
let toast = () => {};

function rpc(fn, args) {
  return fetch(`${SUPA_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers: H, body: JSON.stringify(args),
    signal: AbortSignal.timeout(15000),
  }).then(async (r) => {
    if (!r.ok) throw new Error(`nuvem ${r.status}`);
    return r.json();
  });
}

function payload() {
  return { st: state.st, name: state.name, badges: state.badges, counters: state.counters, milestone: state.milestone };
}

export const signup = (user, pin) => rpc('copa_signup', { p_user: user, p_pin: pin, p_data: payload() });
export const authSave = () => rpc('copa_auth_save', { p_user: state.user, p_pin: state.pin, p_data: payload() });
export const authLoad = (user, pin) => rpc('copa_auth_load', { p_user: user, p_pin: pin });
export const publicAlbum = (user) => rpc('copa_public_album', { p_user: user });
// legado (código de 6 letras da versão anterior)
export const cloudLoad = async (code) => {
  const data = await rpc('copa_load', { p_code: code });
  return data && typeof data === 'object' && data.st ? data : null;
};

export const isLogged = () => !!(state.user && state.pin);

// ---- SALVAMENTO AUTOMÁTICO: cada movimento agenda um save (4s) ----
let autoT = null;
function setStatus(txt) {
  const line = $('cloud-code-line');
  if (!line) return;
  line.classList.remove('hidden');
  line.textContent = txt;
}
export function autoSave() {
  if (!isLogged()) return;   // sem conta: fica só no aparelho (o card de login convida)
  clearTimeout(autoT);
  setStatus(`👤 ${state.user} · ☁️ salvando…`);
  autoT = setTimeout(async () => {
    try {
      const r = await authSave();
      setStatus(r.ok ? `👤 ${state.user} · ☁️ salvo automaticamente ✅` : `👤 ${state.user} · ⚠️ ${r.error || 'erro'}`);
    } catch (e) {
      setStatus(`👤 ${state.user} · 📱 sem internet — salvo no aparelho`);
    }
  }, 4000);
}

// ---- UI: card de login + modal ----
function renderLoginCard() {
  const btn = $('btn-login');
  const out = $('btn-logout');
  if (!btn) return;
  if (isLogged()) {
    btn.classList.add('hidden');
    out?.classList.remove('hidden');
    setStatus(`👤 ${state.user} · ☁️ salvamento automático ligado`);
  } else {
    btn.classList.remove('hidden');
    out?.classList.add('hidden');
    setStatus('📱 Salvo só neste aparelho — crie sua conta pra não perder nada!');
  }
}

function openModal(msg) {
  $('login-modal').classList.remove('hidden');
  $('login-msg').textContent = msg || '';
}
function closeModal() { $('login-modal').classList.add('hidden'); }

function countGlued(st) { return Object.values(st || {}).filter((v) => Array.isArray(v) && v[0] === 1).length; }

async function doLoginOrSignup(kind) {
  const user = ($('login-user').value || '').trim().toUpperCase();
  const pin = ($('login-pin').value || '').trim();
  const msg = $('login-msg');
  if (!USER_RE.test(user)) { msg.textContent = 'Apelido: 3 a 12 letras/números, sem espaço. Ex.: PEDRO10'; return; }
  if (!PIN_RE.test(pin)) { msg.textContent = 'A senha são exatamente 4 números. Ex.: 2026'; return; }
  msg.textContent = '☁️ Conversando com a nuvem…';
  try {
    if (kind === 'signup') {
      const r = await signup(user, pin);
      if (!r.ok) {
        msg.textContent = r.error === 'apelido_em_uso'
          ? `😅 ${user} já existe! Tenta ${user}${(Math.random() * 90 + 10) | 0} — ou entre, se a conta é sua.`
          : 'Não deu — confira apelido e senha.';
        return;
      }
      state.user = user; state.pin = pin; saveLocal();
      closeModal(); renderLoginCard();
      toast(`Conta criada! Bem-vindo, ${user}! 🎉`);
      autoSave();
    } else {
      const r = await authLoad(user, pin);
      if (!r.ok) { msg.textContent = r.error === 'senha_errada' ? '🔒 Apelido ou senha errados. Tenta de novo!' : 'Não deu — tenta de novo.'; return; }
      const cloud = r.data || {};
      const localN = countGlued(state.st), cloudN = countGlued(cloud.st);
      let useCloud = true;
      if (localN > 0 && cloudN !== localN) {
        useCloud = confirm(`Qual álbum você quer manter?\n\n☁️ Conta ${user}: ${cloudN} coladas  →  OK\n📱 Este celular: ${localN} coladas  →  Cancelar\n\n(O escolhido vira o oficial da conta)`);
      }
      try { localStorage.setItem('copa26-backup', JSON.stringify(state)); } catch (e) {}
      state.user = user; state.pin = pin;
      if (useCloud && (cloud.st || cloudN > 0)) {
        state.st = cloud.st || {};
        state.badges = cloud.badges || {};
        state.counters = cloud.counters || { scans: 0, compares: 0 };
        state.milestone = cloud.milestone || 0;
      }
      saveLocal();
      if (!useCloud) { try { await authSave(); } catch (e) {} }  // celular vence: sobe já
      location.reload();
    }
  } catch (e) {
    msg.textContent = '😕 Nuvem indisponível agora. Tente de novo em instantes.';
  }
}

export function initCloud(h) {
  toast = h.toast;
  renderLoginCard();
  $('btn-login')?.addEventListener('click', () => openModal(''));
  $('login-close')?.addEventListener('click', closeModal);
  $('login-modal')?.addEventListener('click', (e) => { if (e.target === $('login-modal')) closeModal(); });
  $('btn-do-signup')?.addEventListener('click', () => doLoginOrSignup('signup'));
  $('btn-do-login')?.addEventListener('click', () => doLoginOrSignup('login'));
  $('btn-logout')?.addEventListener('click', () => {
    if (!confirm(`Sair da conta ${state.user}? O álbum continua salvo na nuvem e neste aparelho.`)) return;
    state.user = ''; state.pin = ''; saveLocal();
    renderLoginCard();
    toast('Você saiu. Até logo! 👋');
  });
}
