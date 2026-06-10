// Placar online + cupons via Supabase (API REST). A chave publishable é pública
// por design e protegida por RLS no banco. Tudo falha de forma silenciosa se
// o Supabase estiver indisponível (o jogo continua funcionando offline).
const SUPA_URL = 'https://txdxtwmvehrzwharvgda.supabase.co';
const SUPA_KEY = 'sb_publishable_5kIYNhWH4jzekXn-qScOcA_GEbEu-b_';
const H = { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json' };

export const Leaderboard = {
  enabled: !!(SUPA_URL && SUPA_KEY),

  async submit(row) {
    if (!this.enabled) return false;
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/scores`, {
        method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(row),
      });
      return r.ok;
    } catch (e) { return false; }
  },

  async top(limit = 10) {
    if (!this.enabled) return null;
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/scores?select=name,score,difficulty&order=score.desc&limit=${limit}`, { headers: H });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; }
  },

  async saveCoupon(row) {
    if (!this.enabled) return false;
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/coupons`, {
        method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(row),
      });
      return r.ok;
    } catch (e) { return false; }
  },
};

export function makeCoupon() {
  const c = 'ACDEFGHJKLMNPQRTUVWXY3479';
  let s = '';
  for (let i = 0; i < 5; i++) s += c[(Math.random() * c.length) | 0];
  return `BENTO-${s}`;
}
