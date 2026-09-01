-- Sucedáneo mínimo de lo que Supabase da por hecho, para poder probar
-- schema.sql en un Postgres normal.

create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

do $$ begin
  create role authenticated;
exception when duplicate_object then null; end $$;

do $$ begin
  create role anon;
exception when duplicate_object then null; end $$;

do $$ begin
  create publication supabase_realtime;
exception when duplicate_object then null; end $$;
