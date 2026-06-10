-- ============================================================
-- Stranger Gelatos — Placar online + Cupons (Supabase)
-- Cole TUDO isto no painel do Supabase: SQL Editor -> New query -> Run.
-- (A "publishable/anon key" usada no jogo é pública e fica protegida
--  por estas regras de RLS abaixo.)
-- ============================================================

-- Tabela de pontuações
create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null check (char_length(name) between 1 and 16),
  score int not null check (score >= 0 and score < 100000000),
  difficulty text,
  coins int default 0,
  kills int default 0,
  stage int default 0
);
create index if not exists scores_score_idx on public.scores (score desc);

-- Tabela de cupons (gerados ao derrotar o Vecna)
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  code text not null,
  name text,
  difficulty text,
  used boolean default false
);

-- Ativa segurança em nível de linha
alter table public.scores enable row level security;
alter table public.coupons enable row level security;

-- Placar: leitura pública (qualquer um vê o TOP)
drop policy if exists scores_select on public.scores;
create policy scores_select on public.scores
  for select to anon using (true);

-- Placar: envio público de pontuação (com limites básicos anti-abuso)
drop policy if exists scores_insert on public.scores;
create policy scores_insert on public.scores
  for insert to anon
  with check (char_length(name) between 1 and 16 and score >= 0 and score < 100000000);

-- Cupons: só permite INSERIR (os códigos não são lidos publicamente pelo app;
-- vocês conferem/validam os cupons aqui no painel do Supabase).
drop policy if exists coupons_insert on public.coupons;
create policy coupons_insert on public.coupons
  for insert to anon with check (char_length(code) <= 32);
