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
  return { st: state.st, name: state.name, badges: state.badges, counters: state.counters, milestone: state.milestone, friends: state.friends, antigas: state.antigas, review: state.review, imports: state.imports };
}

export const signup = (user, pin) => rpc('copa_signup', { p_user: user, p_pin: pin, p_data: payload() });
export const authSave = () => rpc('copa_auth_save', { p_user: state.user, p_pin: state.pin, p_data: payload() });
export const authLoad = (user, pin) => rpc('copa_auth_load', { p_user: user, p_pin: pin });
export const publicAlbum = (user) => rpc('copa_public_album', { p_user: user });
// busca apelidos cadastrados (para adicionar amigos)
export const searchUsers = (q) => rpc('copa_search_users', { p_q: q });
// chat entre amigos MÚTUOS (texto livre) — exige a própria senha
export const sendMsg = (to, body) => rpc('copa_send_msg', { p_from: state.user, p_pin: state.pin, p_to: to, p_body: body });
export const loadChat = (withUser) => rpc('copa_chat', { p_user: state.user, p_pin: state.pin, p_with: withUser });
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

let gateMode = false;   // bloqueio: sem conta, não entra no app
function openModal(msg, gate = false) {
  gateMode = gate;
  const m = $('login-modal');
  m.classList.remove('hidden');
  m.classList.toggle('gate', gate);
  $('login-msg').textContent = msg || '';
}
function closeModal(force = false) {
  if (gateMode && !force && !isLogged()) return;   // trancado até logar
  gateMode = false;
  $('login-modal').classList.add('hidden');
  $('login-modal').classList.remove('gate');
}

function countGlued(st) { return Object.values(st || {}).filter((v) => Array.isArray(v) && v[0] === 1).length; }

// UNIÃO de dois álbuns: colada se qualquer lado tiver; repetidas = maior. NUNCA perde.
function mergeSt(a, b) {
  const out = {};
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) {
    const x = (a && a[k]) || [0, 0], y = (b && b[k]) || [0, 0];
    const g = (x[0] === 1 || y[0] === 1) ? 1 : 0;
    const d = Math.max(x[1] || 0, y[1] || 0);
    if (g || d) out[k] = [g, d];
  }
  return out;
}
// junta a nuvem com o que está no aparelho, sempre pelo MAIOR (protege contra perda)
function mergeCloudInto(cloud) {
  state.st = mergeSt(cloud.st, state.st);
  state.badges = Object.assign({}, cloud.badges || {}, state.badges || {});
  const cc = cloud.counters || {}, sc = state.counters || {};
  state.counters = { scans: Math.max(cc.scans || 0, sc.scans || 0), compares: Math.max(cc.compares || 0, sc.compares || 0) };
  state.milestone = Math.max(cloud.milestone || 0, state.milestone || 0);
  state.friends = Array.from(new Set([...(cloud.friends || []), ...(state.friends || [])]));
  if (cloud.name && !state.name) state.name = cloud.name;
  // ANTIGA/REVISAR/imports: junta os dois lados; colada sempre vence (nunca rebaixa)
  const glued = (id) => Array.isArray(state.st[id]) && state.st[id][0] === 1;
  state.antigas = Object.assign({}, cloud.antigas || {}, state.antigas || {});
  state.review = Object.assign({}, cloud.review || {}, state.review || {});
  state.imports = Object.assign({}, cloud.imports || {}, state.imports || {});
  for (const id in state.antigas) if (glued(id)) delete state.antigas[id];
  for (const id in state.review) if (glued(id) || state.antigas[id]) delete state.review[id];
}
let onRefresh = () => {};

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
      closeModal(true); renderLoginCard();
      toast(`Conta criada! Bem-vindo, ${user}! 🎉`);
      autoSave();
    } else {
      const r = await authLoad(user, pin);
      if (!r.ok) { msg.textContent = r.error === 'senha_errada' ? '🔒 Apelido ou senha errados. Tenta de novo!' : 'Não deu — tenta de novo.'; return; }
      const cloud = r.data || {};
      // backup local antes de qualquer mudança
      try { localStorage.setItem('copa26-backup', JSON.stringify(state)); } catch (e) {}
      // JUNTA (união) o álbum da nuvem com o do aparelho — NUNCA perde figurinha
      state.user = user; state.pin = pin;
      mergeCloudInto(cloud);
      saveLocal();
      try { await authSave(); } catch (e) {}   // sobe o álbum já juntado
      location.reload();
    }
  } catch (e) {
    msg.textContent = '😕 Nuvem indisponível agora. Tente de novo em instantes.';
  }
}

export function initCloud(h) {
  toast = h.toast;
  onRefresh = h.refresh || (() => {});
  const afterBoot = h.afterBoot || (() => {});
  renderLoginCard();
  // RECUPERAÇÃO NO BOOT: já logado? junta com a nuvem (protege contra local vazio/desatualizado)
  if (isLogged()) {
    authLoad(state.user, state.pin).then((r) => {
      if (!r || !r.ok || !r.data) return;
      const before = countGlued(state.st);
      const cloudN = countGlued(r.data.st);
      mergeCloudInto(r.data);
      saveLocal();
      const after = countGlued(state.st);
      if (after !== before) { onRefresh(); if (after > cloudN) authSave().catch(() => {}); }
    }).catch(() => {}).finally(() => afterBoot());  // importa seeds SÓ depois da nuvem (evita ressuscitar revisões já resolvidas)
  } else {
    afterBoot();
  }
  $('btn-login')?.addEventListener('click', () => openModal(''));
  $('login-close')?.addEventListener('click', () => closeModal());
  $('login-modal')?.addEventListener('click', (e) => { if (e.target === $('login-modal')) closeModal(); });
  $('btn-do-signup')?.addEventListener('click', () => doLoginOrSignup('signup'));
  $('btn-do-login')?.addEventListener('click', () => doLoginOrSignup('login'));
  $('btn-logout')?.addEventListener('click', () => {
    if (!confirm(`Sair da conta ${state.user}? O álbum continua salvo na nuvem.`)) return;
    state.user = ''; state.pin = ''; saveLocal();
    renderLoginCard();
    toast('Você saiu. Até logo! 👋');
    openModal('Entre com sua conta pra continuar colecionando! 🍦', true);   // volta pro bloqueio
  });
  // TELA DE BLOQUEIO: sem conta neste aparelho, o app só abre depois do login
  if (!isLogged()) openModal('Crie sua conta (ou entre) pra que seu álbum NUNCA se perca! ☁️', true);
}
