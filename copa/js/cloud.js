// ===== Nuvem (Supabase): salvar/recuperar o álbum com um código simples =====
// Mesmo projeto Supabase do domínio. Rode copa/supabase-copa.sql uma vez p/ criar a tabela.
import { state, save as saveLocal, load as loadLocal } from './state.js';

const SUPA_URL = 'https://txdxtwmvehrzwharvgda.supabase.co';
const SUPA_KEY = 'sb_publishable_5kIYNhWH4jzekXn-qScOcA_GEbEu-b_';
const H = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json' };
const TABLE = `${SUPA_URL}/rest/v1/copa_albums`;

const $ = (id) => document.getElementById(id);
let toast = () => {};

function newCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I (criança não confunde)
  let c = '';
  for (let i = 0; i < 6; i++) c += A[(Math.random() * A.length) | 0];
  return c;
}

async function cloudSave() {
  if (!state.cloudCode) { state.cloudCode = newCode(); saveLocal(); }
  const body = [{ code: state.cloudCode, data: { st: state.st, name: state.name }, updated_at: new Date().toISOString() }];
  const r = await fetch(TABLE + '?on_conflict=code', {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`nuvem ${r.status}`);
  return state.cloudCode;
}

async function cloudLoad(code) {
  const r = await fetch(`${TABLE}?code=eq.${encodeURIComponent(code)}&select=data`, { headers: H });
  if (!r.ok) throw new Error(`nuvem ${r.status}`);
  const rows = await r.json();
  if (!rows.length) return null;
  return rows[0].data;
}

export function initCloud(h) {
  toast = h.toast;
  const line = $('cloud-code-line');
  const showCode = () => {
    if (state.cloudCode) {
      line.classList.remove('hidden');
      line.innerHTML = `Seu código da nuvem: <b>${state.cloudCode}</b> — anote pra recuperar em outro celular! ☁️`;
    }
  };
  showCode();

  $('btn-cloud-save').addEventListener('click', async () => {
    try {
      const code = await cloudSave();
      showCode();
      toast(`Salvo na nuvem! Código: ${code} ☁️`);
    } catch (e) {
      toast('Nuvem indisponível agora 😕 (seus dados continuam salvos no aparelho)');
    }
  });

  $('btn-cloud-load').addEventListener('click', async () => {
    const code = (prompt('Digite o código da nuvem (6 letras/números):') || '').trim().toUpperCase();
    if (!code) return;
    try {
      const data = await cloudLoad(code);
      if (!data) { toast('Código não encontrado 😕'); return; }
      state.st = data.st || {};
      state.cloudCode = code;
      saveLocal();
      location.reload();
    } catch (e) {
      toast('Nuvem indisponível agora 😕');
    }
  });
}
