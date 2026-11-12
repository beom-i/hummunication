-- Minimal Supabase boundaries for disposable PostgreSQL transaction tests.
-- JWT verification and Storage HTTP upload are checked separately in the app.
do $$ begin
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin; end if;
end $$;
create schema auth;
create table auth.users(id uuid primary key);
insert into auth.users values ('00000000-0000-4000-8000-000000000001');
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
grant usage on schema auth to authenticated,anon;
grant execute on all functions in schema auth to authenticated,anon;
create schema storage;
create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb,created_at timestamptz not null default now(),primary key(bucket_id,name));
alter table storage.objects enable row level security;
