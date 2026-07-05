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

-- ============================================================
-- v3: CONTAS com login simples (APELIDO + PIN de 4 números)
-- ============================================================
create table if not exists public.copa_accounts (
  username text primary key,
  pin_hash text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

do $$ begin
  alter table public.copa_accounts add constraint copa_user_format check (username ~ '^[A-Z0-9]{3,12}$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.copa_accounts add constraint copa_acc_data_size check (pg_column_size(data) < 65536);
exception when duplicate_object then null; end $$;

alter table public.copa_accounts enable row level security;
revoke select, insert, update, delete on public.copa_accounts from anon, authenticated;

-- criar conta (apelido único + PIN 4 dígitos) — hash sha256 nativo (sem extensão)
create or replace function public.copa_signup(p_user text, p_pin text, p_data jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := upper(trim(p_user));
begin
  if u !~ '^[A-Z0-9]{3,12}$' then return jsonb_build_object('ok', false, 'error', 'apelido_invalido'); end if;
  if p_pin !~ '^[0-9]{4}$' then return jsonb_build_object('ok', false, 'error', 'pin_invalido'); end if;
  if exists (select 1 from copa_accounts where username = u) then
    return jsonb_build_object('ok', false, 'error', 'apelido_em_uso');
  end if;
  insert into copa_accounts (username, pin_hash, data)
  values (u, encode(sha256(convert_to(u || ':' || p_pin, 'UTF8')), 'hex'), coalesce(p_data, '{}'::jsonb));
  return jsonb_build_object('ok', true);
end $$;

-- salvar o álbum (exige apelido + PIN corretos)
create or replace function public.copa_auth_save(p_user text, p_pin text, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := upper(trim(p_user));
begin
  if not exists (select 1 from copa_accounts where username = u
                 and pin_hash = encode(sha256(convert_to(u || ':' || p_pin, 'UTF8')), 'hex')) then
    return jsonb_build_object('ok', false, 'error', 'senha_errada');
  end if;
  update copa_accounts set data = p_data, updated_at = now() where username = u;
  return jsonb_build_object('ok', true);
end $$;

-- carregar o álbum (exige apelido + PIN corretos)
create or replace function public.copa_auth_load(p_user text, p_pin text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u text := upper(trim(p_user)); d jsonb; h text;
begin
  h := encode(sha256(convert_to(u || ':' || p_pin, 'UTF8')), 'hex');
  if not exists (select 1 from copa_accounts where username = u and pin_hash = h) then
    return jsonb_build_object('ok', false, 'error', 'senha_errada');
  end if;
  select data into d from copa_accounts where username = u;
  return jsonb_build_object('ok', true, 'data', coalesce(d, '{}'::jsonb));
end $$;

-- álbum PÚBLICO de um apelido (só as figurinhas, p/ comparar trocas — sem PIN)
create or replace function public.copa_public_album(p_user text)
returns jsonb language sql security definer stable set search_path = public as $$
  select jsonb_build_object('st', coalesce(data->'st', '{}'::jsonb))
  from copa_accounts where username = upper(trim(p_user));
$$;

grant execute on function public.copa_signup(text, text, jsonb) to anon;
grant execute on function public.copa_auth_save(text, text, jsonb) to anon;
grant execute on function public.copa_auth_load(text, text) to anon;
grant execute on function public.copa_public_album(text) to anon;

-- ===== v4: BUSCA de apelidos cadastrados (para adicionar amigos) =====
-- Retorna só a lista de apelidos que começam com o texto (máx 20). Nada sensível.
create or replace function public.copa_search_users(p_q text)
returns jsonb language sql security definer stable set search_path = public as $$
  select coalesce(jsonb_agg(username order by username), '[]'::jsonb)
  from (
    select username from copa_accounts
    where length(trim(p_q)) >= 2
      and username like upper(trim(p_q)) || '%'
    order by username limit 20
  ) s;
$$;

grant execute on function public.copa_search_users(text) to anon;

-- ===== v5: CHAT entre amigos MÚTUOS (texto livre) + filtro no cliente =====
create table if not exists public.copa_messages (
  id bigint generated always as identity primary key,
  from_user text not null,
  to_user   text not null,
  body      text not null,
  created_at timestamptz not null default now()
);
create index if not exists copa_msg_pair on public.copa_messages
  (least(from_user,to_user), greatest(from_user,to_user), created_at);
alter table public.copa_messages enable row level security;
revoke select, insert, update, delete on public.copa_messages from anon, authenticated;

-- são amigos MÚTUOS? (cada um tem o outro em data->'friends')
create or replace function public.copa_are_mutual(a text, b text)
returns boolean language sql security definer stable set search_path = public as $$
  select exists(select 1 from copa_accounts where username = upper(a) and data->'friends' ? upper(b))
     and exists(select 1 from copa_accounts where username = upper(b) and data->'friends' ? upper(a));
$$;

-- enviar mensagem (exige PIN; só entre amigos mútuos; máx 300 chars; anti-flood)
create or replace function public.copa_send_msg(p_from text, p_pin text, p_to text, p_body text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare f text := upper(trim(p_from)); t text := upper(trim(p_to)); msg text;
begin
  if not exists (select 1 from copa_accounts where username=f
                 and pin_hash = encode(sha256(convert_to(f||':'||p_pin,'UTF8')),'hex')) then
    return jsonb_build_object('ok', false, 'error', 'senha_errada'); end if;
  if not exists (select 1 from copa_accounts where username=t) then
    return jsonb_build_object('ok', false, 'error', 'amigo_inexistente'); end if;
  if not copa_are_mutual(f, t) then
    return jsonb_build_object('ok', false, 'error', 'nao_mutuo'); end if;
  msg := left(btrim(p_body), 300);
  if msg = '' then return jsonb_build_object('ok', false, 'error', 'vazio'); end if;
  if (select count(*) from copa_messages where from_user=f and created_at > now() - interval '1 minute') >= 20 then
    return jsonb_build_object('ok', false, 'error', 'devagar'); end if;
  insert into copa_messages (from_user, to_user, body) values (f, t, msg);
  delete from copa_messages where id in (
    select id from copa_messages
    where least(from_user,to_user)=least(f,t) and greatest(from_user,to_user)=greatest(f,t)
    order by created_at desc offset 200);
  return jsonb_build_object('ok', true);
end $$;

-- ler a conversa (exige PIN; só entre amigos mútuos)
create or replace function public.copa_chat(p_user text, p_pin text, p_with text)
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare u text := upper(trim(p_user)); w text := upper(trim(p_with));
begin
  if not exists (select 1 from copa_accounts where username=u
                 and pin_hash = encode(sha256(convert_to(u||':'||p_pin,'UTF8')),'hex')) then
    return jsonb_build_object('ok', false, 'error', 'senha_errada'); end if;
  if not copa_are_mutual(u, w) then
    return jsonb_build_object('ok', false, 'error', 'nao_mutuo'); end if;
  return jsonb_build_object('ok', true, 'msgs', coalesce((
    select jsonb_agg(jsonb_build_object('f', from_user, 'b', body) order by created_at)
    from (select from_user, body, created_at from copa_messages
          where least(from_user,to_user)=least(u,w) and greatest(from_user,to_user)=greatest(u,w)
          order by created_at desc limit 100) x), '[]'::jsonb));
end $$;

grant execute on function public.copa_are_mutual(text,text) to anon;
grant execute on function public.copa_send_msg(text,text,text,text) to anon;
grant execute on function public.copa_chat(text,text,text) to anon;
