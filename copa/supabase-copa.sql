-- ===== Figurinhas da Copa 2026 — tabela de backup na nuvem =====
-- Rode UMA vez no SQL Editor do Supabase (mesmo projeto do jogo).

create table if not exists public.copa_albums (
  code text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.copa_albums enable row level security;

-- Acesso anônimo por código (o código de 6 caracteres é o "segredo" da criança)
drop policy if exists copa_albums_select on public.copa_albums;
create policy copa_albums_select on public.copa_albums for select using (true);

drop policy if exists copa_albums_insert on public.copa_albums;
create policy copa_albums_insert on public.copa_albums for insert with check (true);

drop policy if exists copa_albums_update on public.copa_albums;
create policy copa_albums_update on public.copa_albums for update using (true);
