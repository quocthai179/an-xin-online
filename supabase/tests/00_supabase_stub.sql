-- =====================================================================
-- supabase/tests/00_supabase_stub.sql
-- Minimal stand-in for what a hosted Supabase project provides BEFORE our migrations run.
-- For LOCAL TESTING ONLY (plain PostgreSQL 15+/16, no Docker). Never run against a real project.
--
-- Run as the bootstrap superuser (`supabase_admin`, like on Supabase) in the target database.
-- Afterwards the migration is executed as `postgres`, which (as on Supabase) is NOT a superuser.
--
-- Modelled on supabase/postgres (roles), supabase/auth (auth.uid/role/jwt) and supabase/realtime
-- (realtime.messages, realtime.send, realtime.topic). Simplifications are marked "STUB:".
-- =====================================================================
\set ON_ERROR_STOP 1

-- ---------- Roles ----------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'postgres') then
    -- Supabase: postgres is the "owner" role used by the dashboard / `supabase db push`; not superuser.
    create role postgres login createrole createdb replication bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then create role authenticator login noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then create role supabase_auth_admin nologin noinherit createrole; end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_realtime_admin') then create role supabase_realtime_admin nologin noinherit; end if;
end $$;

grant anon, authenticated, service_role to authenticator;
grant anon, authenticated, service_role to postgres;
-- STUB: lets postgres create RLS policies on realtime.messages (Supabase docs do exactly that from the SQL editor / migrations).
grant supabase_realtime_admin to postgres;

grant create, connect, temporary on database :"DBNAME" to postgres;

-- ---------- public schema defaults (supabase/postgres init scripts) ----------
grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres;
-- Supabase auto-grants everything created by postgres in public to the API roles;
-- this is why our migration has to REVOKE explicitly. Reproduced here so the revokes are actually tested.
alter default privileges for role postgres in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant all on sequences to anon, authenticated, service_role;

-- ---------- extensions schema ----------
create schema if not exists extensions authorization postgres;
grant usage on schema extensions to anon, authenticated, service_role;
create extension if not exists pgcrypto    with schema extensions;   -- preinstalled on Supabase
create extension if not exists "uuid-ossp" with schema extensions;   -- preinstalled on Supabase

-- ---------- auth ----------
create schema if not exists auth authorization supabase_auth_admin;
grant usage on schema auth to anon, authenticated, service_role, postgres;

create table if not exists auth.users (
  instance_id        uuid,
  id                 uuid primary key,
  aud                varchar(255) default 'authenticated',
  role               varchar(255) default 'authenticated',
  email              varchar(255),
  is_anonymous       boolean not null default false,
  raw_app_meta_data  jsonb default '{}'::jsonb,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);
alter table auth.users owner to supabase_auth_admin;
-- STUB: on Supabase postgres can reference auth.users; tests also insert users directly as postgres.
grant all on auth.users to postgres;

create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;
create or replace function auth.email() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')
  )::jsonb
$$;
alter function auth.uid()   owner to supabase_auth_admin;
alter function auth.role()  owner to supabase_auth_admin;
alter function auth.email() owner to supabase_auth_admin;
alter function auth.jwt()   owner to supabase_auth_admin;
grant execute on all functions in schema auth to anon, authenticated, service_role, postgres;

-- ---------- realtime ----------
create schema if not exists realtime authorization supabase_realtime_admin;
grant usage on schema realtime to anon, authenticated, service_role, postgres;

-- STUB: on Supabase this table is range-partitioned by inserted_at (daily partitions managed by the Realtime server)
-- and rows are consumed + deleted by Realtime. Here it is a plain table so tests can inspect what RPCs emitted.
create table if not exists realtime.messages (
  id          uuid not null default gen_random_uuid(),
  topic       text not null,
  extension   text not null,
  payload     jsonb,
  event       text,
  private     boolean default false,
  updated_at  timestamp not null default now(),
  inserted_at timestamp not null default now(),
  primary key (id, inserted_at)
);
alter table realtime.messages owner to supabase_realtime_admin;
alter table realtime.messages enable row level security;
grant select, insert, update on realtime.messages to anon, authenticated;
grant all on realtime.messages to postgres, service_role;

-- realtime.topic(): the Realtime server sets `realtime.topic` before evaluating RLS for a channel join / client send.
create or replace function realtime.topic() returns text language sql stable as $$
  select nullif(current_setting('realtime.topic', true), '')::text
$$;

-- realtime.send(): "Broadcast from Database". Same body as upstream: errors are swallowed as a WARNING
-- (so a broken send never aborts the business transaction). Not security definer upstream either.
create or replace function realtime.send(payload jsonb, event text, topic text, private boolean default true)
returns void language plpgsql as $$
begin
  begin
    execute format('set local realtime.topic to %L', topic);
    insert into realtime.messages (payload, event, topic, private, extension)
    values (payload, event, topic, private, 'broadcast');
  exception when others then
    raise warning 'ErrorSendingBroadcastMessage: %', sqlerrm;
  end;
end $$;
alter function realtime.topic() owner to supabase_realtime_admin;
alter function realtime.send(jsonb, text, text, boolean) owner to supabase_realtime_admin;
grant execute on function realtime.topic() to anon, authenticated, service_role, postgres;
grant execute on function realtime.send(jsonb, text, text, boolean) to postgres, service_role;

-- ---------- publication (exists on every Supabase project; our migration does not add tables to it) ----------
do $$ begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;
