-- ===== Figurinhas da Copa 2026 — nuvem SEGURA (v2) =====
-- Rode UMA vez no SQL Editor do Supabase (mesmo projeto do jogo).
-- Modelo: a tabela fica FECHADA para o público; o acesso é só pelas
-- funções copa_save/copa_load, que exigem saber o código exato.

create table if not exists public.copa_albums (
  code text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- trava formato do código e tamanho do payload (anti-abuso)
do $$ begin
  alter table public.copa_albums add constraint copa_code_format check (code ~ '^[A-Z2-9]{6}$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.copa_albums add constraint copa_data_size check (pg_column_size(data) < 65536);
exception when duplicate_object then null; end $$;

alter table public.copa_albums enable row level security;

-- remove políticas abertas antigas (se existirem) e NÃO cria novas:
-- sem policy + revoke = ninguém lista/edita a tabela diretamente.
drop policy if exists copa_albums_select on public.copa_albums;
drop policy if exists copa_albums_insert on public.copa_albums;
drop policy if exists copa_albums_update on public.copa_albums;
revoke select, insert, update, delete on public.copa_albums from anon, authenticated;

-- salvar (upsert) — requer o código exato
create or replace function public.copa_save(p_code text, p_data jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.copa_albums (code, data, updated_at)
  values (upper(p_code), p_data, now())
  on conflict (code) do update set data = excluded.data, updated_at = now();
$$;

-- carregar — requer o código exato (sem listagem)
create or replace function public.copa_load(p_code text)
returns jsonb language sql security definer stable set search_path = public as $$
  select data from public.copa_albums where code = upper(p_code);
$$;

grant execute on function public.copa_save(text, jsonb) to anon;
grant execute on function public.copa_load(text) to anon;
