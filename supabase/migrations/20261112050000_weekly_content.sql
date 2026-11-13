-- Source content only. Generated card HTML/images are not database records.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.require_user() returns uuid language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception using errcode='42501', message='Authentication required'; end if;
  return auth.uid();
end $$;

create function private.text_length(value text) returns integer language sql immutable strict set search_path='' as $$
  select length(value)+regexp_count(value,U&'[\+010000-\+10FFFF]')
$$;

create function private.valid_document(doc jsonb) returns boolean language plpgsql immutable set search_path = '' as $$
declare paragraph jsonb; node jsonb; mark jsonb; attrs jsonb; total integer := 0;
begin
  if doc is null or jsonb_typeof(doc) <> 'object' or doc->>'type' is distinct from 'doc'
    or doc - array['type','content'] <> '{}'::jsonb
    or jsonb_typeof(doc->'content') is distinct from 'array'
    or jsonb_array_length(doc->'content') not between 1 and 2000
    or octet_length(doc::text)>2000000 then return false; end if;
  for paragraph in select value from jsonb_array_elements(doc->'content') loop
    if paragraph->>'type' is distinct from 'paragraph' or paragraph-array['type','content'] <> '{}'::jsonb then return false; end if;
    if paragraph ? 'content' then
      if jsonb_typeof(paragraph->'content') <> 'array' then return false; end if;
      for node in select value from jsonb_array_elements(paragraph->'content') loop
        if node->>'type' = 'hardBreak' then
          if node <> '{"type":"hardBreak"}'::jsonb then return false; end if;
          total := total+1;
        elsif node->>'type' = 'text' then
          if node-array['type','text','marks'] <> '{}'::jsonb or jsonb_typeof(node->'text') is distinct from 'string' or private.text_length(node->>'text')=0 then return false; end if;
          total := total+private.text_length(node->>'text');
          if node ? 'marks' then
            if jsonb_typeof(node->'marks')<>'array' or jsonb_array_length(node->'marks')>5 then return false; end if;
            for mark in select value from jsonb_array_elements(node->'marks') loop
              if mark->>'type' in ('bold','italic','underline','strike') then
                if mark-array['type'] <> '{}'::jsonb then return false; end if;
              elsif mark->>'type'='textStyle' then
                attrs:=mark->'attrs';
                if mark-array['type','attrs'] <> '{}'::jsonb or jsonb_typeof(attrs) is distinct from 'object' or attrs-array['color','fontSize'] <> '{}'::jsonb then return false; end if;
                if attrs->>'color' is not null and (attrs->>'color') !~ '^#[0-9A-Fa-f]{6}$' then return false; end if;
                if attrs->>'fontSize' is not null and (attrs->>'fontSize') !~ '^([89]|[12][0-9]|3[0-2])px$' then return false; end if;
              else return false; end if;
            end loop;
          end if;
        else return false; end if;
        if total>20000 then return false; end if;
      end loop;
    end if;
    total:=total+1;
  end loop;
  return total-1<=20000;
exception when others then return false;
end $$;

create table public.sermon (
  id uuid primary key default gen_random_uuid(), date date,
  speaker text not null default '' check(private.text_length(speaker)<=100),
  title text not null default '' check(private.text_length(title)<=200),
  bible text not null default '' check(private.text_length(bible)<=200),
  content jsonb not null default '{"type":"doc","content":[{"type":"paragraph","content":[]}]}' check(private.valid_document(content)),
  version integer not null default 1 check(version>0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null, deleted_at timestamptz
);
alter table public.sermon enable row level security;
create policy "team reads active sermons" on public.sermon for select to authenticated using ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'),'false')<>'true' and deleted_at is null);
revoke all on public.sermon from anon, authenticated;
grant select on public.sermon to authenticated;

create function public.save_sermon(p_id uuid default null,p_version integer default null,p_values jsonb default null) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid:=private.require_user(); current_row public.sermon%rowtype; result_id uuid;
begin
  if p_values is null or jsonb_typeof(p_values)<>'object' or p_values-array['date','speaker','title','bible','content']<>'{}'::jsonb
    or jsonb_typeof(p_values->'speaker') is distinct from 'string' or private.text_length(p_values->>'speaker')>100
    or jsonb_typeof(p_values->'title') is distinct from 'string' or private.text_length(p_values->>'title')>200
    or jsonb_typeof(p_values->'bible') is distinct from 'string' or private.text_length(p_values->>'bible')>200
    or not private.valid_document(p_values->'content') or (p_id is null)<>(p_version is null) then
    raise exception using errcode='22023', message='Invalid sermon';
  end if;
  if p_id is null then
    insert into public.sermon(date,speaker,title,bible,content,updated_by) values(nullif(p_values->>'date','')::date,p_values->>'speaker',p_values->>'title',p_values->>'bible',p_values->'content',actor) returning id into result_id;
  else
    select * into current_row from public.sermon where id=p_id for update;
    if not found or current_row.deleted_at is not null then raise exception using errcode='P0002', message='Not found'; end if;
    if current_row.version<>p_version then raise exception using errcode='40001', message='Version conflict'; end if;
    update public.sermon set date=nullif(p_values->>'date','')::date,speaker=p_values->>'speaker',title=p_values->>'title',bible=p_values->>'bible',content=p_values->'content',updated_by=actor,updated_at=now(),version=version+1 where id=p_id returning id into result_id;
  end if;
  return result_id;
end $$;
create function public.get_sermon(p_id uuid) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception using errcode='42501', message='Authentication required'; end if;
  select to_jsonb(s)-array['created_at','updated_at','updated_by','deleted_at'] into result from public.sermon s where id=p_id and deleted_at is null;
  if result is null then raise exception using errcode='P0002', message='Not found'; end if;
  return result;
end $$;
revoke all on all functions in schema private from public, anon, authenticated;
revoke all on function public.save_sermon(uuid,integer,jsonb), public.get_sermon(uuid) from public, anon;
grant execute on function public.save_sermon(uuid,integer,jsonb), public.get_sermon(uuid) to authenticated;

create table public.files (
  id uuid primary key default gen_random_uuid(), path text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), deleted_at timestamptz
);
create table public.family (
  id uuid primary key default gen_random_uuid(), groups jsonb not null default '[]' check(jsonb_typeof(groups)='array' and jsonb_array_length(groups)<=20),
  version integer not null default 1 check(version>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null, deleted_at timestamptz
);
create table public.weekly (
  id uuid primary key default gen_random_uuid(), date date not null,
  sections text[] not null default '{}' check(sections <@ array['thumbnail','cover','sermon','family','senders']::text[]),
  sermon_id uuid unique references public.sermon(id) on delete restrict,
  family_id uuid unique references public.family(id) on delete restrict,
  version integer not null default 1 check(version>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null, deleted_at timestamptz
);
create unique index weekly_active_date on public.weekly(date) where deleted_at is null;
alter table public.files enable row level security;
alter table public.family enable row level security;
alter table public.weekly enable row level security;
create policy "team reads active files" on public.files for select to authenticated using ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'),'false')<>'true' and deleted_at is null);
create policy "team reads active families" on public.family for select to authenticated using ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'),'false')<>'true' and deleted_at is null);
create policy "team reads active weekly" on public.weekly for select to authenticated using ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'),'false')<>'true' and deleted_at is null);
revoke all on public.files,public.family,public.weekly from anon,authenticated;
grant select on public.files,public.family,public.weekly to authenticated;

create function private.valid_groups(groups jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare g jsonb; person jsonb; edit jsonb; crop jsonb; w numeric; h numeric; angle integer;
begin
  if groups is null or jsonb_typeof(groups)<>'array' or jsonb_array_length(groups)>20 or octet_length(groups::text)>3000000 then return false; end if;
  for g in select value from jsonb_array_elements(groups) loop
    if jsonb_typeof(g)<>'object' or g-array['name','photoId','photoEdit','leader','members']<>'{}'::jsonb
      or jsonb_typeof(g->'name') is distinct from 'string' or private.text_length(g->>'name')>100
      or jsonb_typeof(g->'leader') is distinct from 'object' or jsonb_typeof(g->'members') is distinct from 'array'
      or jsonb_array_length(g->'members')>30 then return false; end if;
    if g->>'photoId' is not null then perform (g->>'photoId')::uuid; end if;
    for person in select g->'leader' union all select value from jsonb_array_elements(g->'members') loop
      if person-array['name','answer']<>'{}'::jsonb or jsonb_typeof(person->'name') is distinct from 'string' or private.text_length(person->>'name')>100
        or jsonb_typeof(person->'answer') is distinct from 'string' or private.text_length(person->>'answer')>3000 then return false; end if;
    end loop;
    edit:=g->'photoEdit';
    if edit is not null and edit<>'null'::jsonb then
      if g->>'photoId' is null or jsonb_typeof(edit)<>'object' or edit-array['rotation','sourceWidth','sourceHeight','crop']<>'{}'::jsonb then return false; end if;
      if jsonb_typeof(edit->'rotation') is distinct from 'number' or jsonb_typeof(edit->'sourceWidth') is distinct from 'number' or jsonb_typeof(edit->'sourceHeight') is distinct from 'number' then return false; end if;
      w:=(edit->>'sourceWidth')::numeric; h:=(edit->>'sourceHeight')::numeric; angle:=(edit->>'rotation')::integer;
      if angle not in(0,90,180,270) or (edit->>'rotation')::numeric<>angle or w not between 1 and 50000 or h not between 1 and 50000 or trunc(w)<>w or trunc(h)<>h then return false; end if;
      crop:=edit->'crop';
      if jsonb_typeof(crop) is distinct from 'object' or crop-array['x','y','width','height']<>'{}'::jsonb or
        (jsonb_typeof(crop->'x') is distinct from 'number' or jsonb_typeof(crop->'y') is distinct from 'number' or jsonb_typeof(crop->'width') is distinct from 'number' or jsonb_typeof(crop->'height') is distinct from 'number') then return false; end if;
      if (crop->>'x')::numeric<0 or (crop->>'y')::numeric<0 or (crop->>'width')::numeric<=0 or (crop->>'height')::numeric<=0
        or (crop->>'x')::numeric+(crop->>'width')::numeric>1.001 or (crop->>'y')::numeric+(crop->>'height')::numeric>1.001 then return false; end if;
      if angle in(90,270) then w:=(edit->>'sourceHeight')::numeric;h:=(edit->>'sourceWidth')::numeric;end if;
      if abs(((crop->>'width')::numeric*w)/((crop->>'height')::numeric*h)-119.0/71)>0.01 then return false;end if;
    end if;
  end loop;
  return true;
exception when others then return false;
end $$;
alter table public.family add constraint family_valid_groups check(private.valid_groups(groups));

create function private.lock_files(groups jsonb) returns void language plpgsql set search_path='' as $$
declare file_id uuid;
begin
  for file_id in select distinct (g->>'photoId')::uuid from jsonb_array_elements(groups) g where g->>'photoId' is not null order by 1 loop
    perform id from public.files where id=file_id and deleted_at is null for key share;
    if not found then raise exception using errcode='23503', message='Photo is unavailable'; end if;
  end loop;
end $$;
create function public.save_family(p_id uuid default null,p_version integer default null,p_values jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_user(); current_row public.family%rowtype; result_id uuid;
begin
  if p_values is null or p_values-array['groups']<>'{}'::jsonb or not private.valid_groups(p_values->'groups') or (p_id is null)<>(p_version is null) then raise exception using errcode='22023', message='Invalid family'; end if;
  perform private.lock_files(p_values->'groups');
  if p_id is null then
    insert into public.family(groups,updated_by) values(p_values->'groups',actor) returning id into result_id;
  else
    select * into current_row from public.family where id=p_id for update;
    if not found or current_row.deleted_at is not null then raise exception using errcode='P0002', message='Not found'; end if;
    if current_row.version<>p_version then raise exception using errcode='40001', message='Version conflict'; end if;
    update public.family set groups=p_values->'groups',updated_at=now(),updated_by=actor,version=version+1 where id=p_id returning id into result_id;
  end if;
  return result_id;
end $$;

create function public.save_weekly(p_id uuid default null,p_version integer default null,p_date date default null,p_sections text[] default null,p_sermon jsonb default null,p_family jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_user(); old public.weekly%rowtype; locked public.weekly%rowtype; sid uuid; fid uuid; result_id uuid;
begin
  if p_date is null or p_sections is null or array_position(p_sections,null) is not null
    or not p_sections <@ array['thumbnail','cover','sermon','family','senders']::text[]
    or cardinality(p_sections)<>(select count(distinct s) from unnest(p_sections) s)
    or (p_id is null)<>(p_version is null) then raise exception using errcode='22023', message='Invalid weekly'; end if;
  if p_id is not null then
    select * into old from public.weekly where id=p_id;
    if not found or old.deleted_at is not null then raise exception using errcode='P0002', message='Not found'; end if;
  end if;
  -- Global lock order: referenced files -> sermon -> family -> weekly.
  if p_family is not null then
    if not private.valid_groups(p_family->'values'->'groups') then raise exception using errcode='22023', message='Invalid family'; end if;
    perform private.lock_files(p_family->'values'->'groups');
  end if;
  perform id from public.sermon where id=old.sermon_id or id=(p_sermon->>'id')::uuid order by id for update;
  perform id from public.family where id=old.family_id or id=(p_family->>'id')::uuid order by id for update;
  if p_id is not null then
    select * into locked from public.weekly where id=p_id for update;
    if locked.deleted_at is not null then raise exception using errcode='P0002', message='Not found'; end if;
    if locked.version<>p_version or locked.date<>p_date or locked.sermon_id is distinct from old.sermon_id or locked.family_id is distinct from old.family_id then raise exception using errcode='40001', message='Version conflict'; end if;
  end if;
  if p_sermon is not null then
    sid:=public.save_sermon((p_sermon->>'id')::uuid,(p_sermon->>'version')::integer,p_sermon->'values');
  end if;
  if p_family is not null then
    fid:=public.save_family((p_family->>'id')::uuid,(p_family->>'version')::integer,p_family->'values');
  end if;
  if p_id is null then
    insert into public.weekly(date,sections,sermon_id,family_id,updated_by) values(p_date,p_sections,sid,fid,actor) returning id into result_id;
  else
    update public.weekly set sections=p_sections,sermon_id=sid,family_id=fid,updated_at=now(),updated_by=actor,version=version+1 where id=p_id returning id into result_id;
  end if;
  return result_id;
end $$;
create function public.get_weekly(p_date date) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception using errcode='42501', message='Authentication required'; end if;
  select to_jsonb(w)-array['created_at','updated_by','deleted_at','sermon_id','family_id'] || jsonb_build_object(
    'sermon',(select to_jsonb(s)-array['created_at','updated_at','updated_by','deleted_at'] from public.sermon s where s.id=w.sermon_id),
    'family',(select to_jsonb(f)-array['created_at','updated_at','updated_by','deleted_at'] from public.family f where f.id=w.family_id)
  ) into result from public.weekly w where w.date=p_date and w.deleted_at is null;
  if result is null then raise exception using errcode='P0002', message='Not found'; end if;
  return result;
end $$;
create function public.delete_sermon(p_id uuid,p_version integer) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_user(); current_row public.sermon%rowtype;
begin
  select * into current_row from public.sermon where id=p_id for update;
  if not found or current_row.deleted_at is not null then raise exception using errcode='P0002', message='Not found'; end if;
  if p_version is null or current_row.version<>p_version then raise exception using errcode='40001', message='Version conflict'; end if;
  if exists(select 1 from public.weekly where sermon_id=p_id) then raise exception using errcode='23503', message='Still referenced'; end if;
  update public.sermon set deleted_at=now(),updated_at=now(),updated_by=actor,version=version+1 where id=p_id;
end $$;
create function public.delete_family(p_id uuid,p_version integer) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_user(); current_row public.family%rowtype;
begin
  select * into current_row from public.family where id=p_id for update;
  if not found or current_row.deleted_at is not null then raise exception using errcode='P0002', message='Not found'; end if;
  if p_version is null or current_row.version<>p_version then raise exception using errcode='40001', message='Version conflict'; end if;
  if exists(select 1 from public.weekly where family_id=p_id) then raise exception using errcode='23503', message='Still referenced'; end if;
  update public.family set deleted_at=now(),updated_at=now(),updated_by=actor,version=version+1 where id=p_id;
end $$;
create function public.delete_weekly(p_id uuid,p_version integer) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_user(); current_row public.weekly%rowtype;
begin
  select * into current_row from public.weekly where id=p_id for update;
  if not found or current_row.deleted_at is not null then raise exception using errcode='P0002', message='Not found'; end if;
  if p_version is null or current_row.version<>p_version then raise exception using errcode='40001', message='Version conflict'; end if;
  update public.weekly set deleted_at=now(),updated_at=now(),updated_by=actor,version=version+1 where id=p_id;
end $$;

-- A retained original cannot be overwritten/deleted through the Storage owner policies.
drop policy if exists "uploads: owner can update" on storage.objects;
drop policy if exists "uploads: owner can delete" on storage.objects;
drop policy if exists "uploads: owner can read" on storage.objects;
create function private.can_read_upload(object_path text) returns boolean language sql stable security definer set search_path='' as $$
  select auth.uid() is not null and coalesce(auth.jwt()->>'is_anonymous','false')<>'true' and (
    exists(select 1 from public.files f where f.path=object_path and f.deleted_at is null)
    or (split_part(object_path,'/',1)=auth.uid()::text and not exists(select 1 from public.files f where f.path=object_path))
  )
$$;
create policy "team reads registered uploads" on storage.objects for select to authenticated using (bucket_id='uploads' and private.can_read_upload(name));
create function public.register_file(p_path text) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_user(); result_id uuid;
begin
  if p_path is null or left(p_path,length(actor::text)+1)<>actor::text||'/' then raise exception using errcode='42501', message='Invalid path'; end if;
  if not exists(select 1 from storage.objects where bucket_id='uploads' and name=p_path and (metadata->>'size')::bigint between 1 and 5242880 and metadata->>'mimetype' in('image/png','image/jpeg','image/webp')) then raise exception using errcode='22023', message='Invalid image'; end if;
  insert into public.files(path,created_by) values(p_path,actor) returning id into result_id;
  return result_id;
end $$;
create function public.delete_file(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  perform private.require_user();
  perform id from public.files where id=p_id and deleted_at is null for update;
  if not found then raise exception using errcode='P0002', message='Not found'; end if;
  if exists(select 1 from public.family f, jsonb_array_elements(f.groups) g where g->>'photoId'=p_id::text) then raise exception using errcode='23503', message='Still referenced'; end if;
  update public.files set deleted_at=now() where id=p_id;
end $$;
revoke all on all functions in schema private from public,anon,authenticated;
revoke all on function public.delete_sermon(uuid,integer),public.save_family(uuid,integer,jsonb),public.save_weekly(uuid,integer,date,text[],jsonb,jsonb),public.get_weekly(date),public.delete_family(uuid,integer),public.delete_weekly(uuid,integer),public.register_file(text),public.delete_file(uuid) from public,anon;
grant execute on function public.delete_sermon(uuid,integer),public.save_family(uuid,integer,jsonb),public.save_weekly(uuid,integer,date,text[],jsonb,jsonb),public.get_weekly(date),public.delete_family(uuid,integer),public.delete_weekly(uuid,integer),public.register_file(text),public.delete_file(uuid) to authenticated;

grant usage on schema private to authenticated;
grant execute on function private.can_read_upload(text) to authenticated;
