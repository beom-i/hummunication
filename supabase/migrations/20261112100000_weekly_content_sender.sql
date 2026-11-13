-- A sender is an ordered content bundle; each person has real columns.
create table public.sender (
  id uuid primary key default gen_random_uuid(),
  version integer not null default 1 check(version>0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null, deleted_at timestamptz
);
create table public.sender_person (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.sender(id) on delete restrict,
  name text not null default '' check(private.text_length(name)<=100),
  generation text not null default '' check(generation ~ '^[0-9]{0,3}$'),
  group_name text not null default '' check(private.text_length(group_name)<=100),
  date date,
  prayer text not null default '' check(private.text_length(prayer)<=3000),
  position integer not null check(position between 0 and 19),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null, deleted_at timestamptz
);
create unique index sender_person_active_position on public.sender_person(sender_id,position) where deleted_at is null;
alter table public.weekly add column sender_id uuid unique references public.sender(id) on delete restrict;
alter table public.sender enable row level security;
alter table public.sender_person enable row level security;
create policy "team reads active senders" on public.sender for select to authenticated using ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'),'false')<>'true' and deleted_at is null);
create policy "team reads active sender people" on public.sender_person for select to authenticated using ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'),'false')<>'true' and deleted_at is null and exists(select 1 from public.sender s where s.id=sender_id and s.deleted_at is null));
revoke all on public.sender,public.sender_person from anon,authenticated;
grant select on public.sender,public.sender_person to authenticated;

create function public.save_sender(p_id uuid default null,p_version integer default null,p_values jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_user(); current_row public.sender%rowtype; result_id uuid; person jsonb; person_id uuid; ids uuid[]:='{}'; ordinal bigint;
begin
  if p_values is null or jsonb_typeof(p_values)<>'object' or p_values-array['people']<>'{}'::jsonb
    or jsonb_typeof(p_values->'people') is distinct from 'array' or jsonb_array_length(p_values->'people')>20
    or (p_id is null)<>(p_version is null) then raise exception using errcode='22023', message='Invalid sender'; end if;
  if p_id is null then
    insert into public.sender(updated_by) values(actor) returning id into result_id;
  else
    select * into current_row from public.sender where id=p_id for update;
    if not found or current_row.deleted_at is not null then raise exception using errcode='P0002', message='Not found'; end if;
    if current_row.version<>p_version then raise exception using errcode='40001', message='Version conflict'; end if;
    result_id:=p_id;
  end if;
  for person in select value from jsonb_array_elements(p_values->'people') loop
    if jsonb_typeof(person)<>'object' or person-array['personId','name','generation','group','date','prayer']<>'{}'::jsonb
      or jsonb_typeof(person->'name') is distinct from 'string' or private.text_length(person->>'name')>100
      or jsonb_typeof(person->'generation') is distinct from 'string' or (person->>'generation') !~ '^[0-9]{0,3}$'
      or jsonb_typeof(person->'group') is distinct from 'string' or private.text_length(person->>'group')>100
      or jsonb_typeof(person->'prayer') is distinct from 'string' or private.text_length(person->>'prayer')>3000
      or (person->>'date' is not null and person->>'date'<>'' and (person->>'date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
      then raise exception using errcode='22023', message='Invalid sender person'; end if;
    perform nullif(person->>'date','')::date;
    person_id:=(person->>'personId')::uuid;
    if person_id is not null then
      if person_id=any(ids) then raise exception using errcode='22023', message='Duplicate sender person'; end if;
      if not exists(select 1 from public.sender_person where id=person_id and sender_id=result_id and deleted_at is null) then raise exception using errcode='40001', message='Sender person is unavailable'; end if;
      ids:=array_append(ids,person_id);
    end if;
  end loop;
  -- Release active positions inside this transaction so swaps keep stable IDs.
  update public.sender_person set deleted_at=now(),updated_at=now(),updated_by=actor where sender_id=result_id and deleted_at is null;
  for person,ordinal in select value,ordinality from jsonb_array_elements(p_values->'people') with ordinality loop
    person_id:=(person->>'personId')::uuid;
    if person_id is null then
      insert into public.sender_person(sender_id,name,generation,group_name,date,prayer,position,updated_by)
      values(result_id,person->>'name',person->>'generation',person->>'group',nullif(person->>'date','')::date,person->>'prayer',ordinal-1,actor);
    else
      update public.sender_person set name=person->>'name',generation=person->>'generation',group_name=person->>'group',date=nullif(person->>'date','')::date,prayer=person->>'prayer',position=ordinal-1,deleted_at=null,updated_at=now(),updated_by=actor where id=person_id;
    end if;
  end loop;
  if p_id is not null then update public.sender set version=version+1,updated_at=now(),updated_by=actor where id=result_id; end if;
  return result_id;
end $$;
create function public.get_sender(p_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception using errcode='42501', message='Authentication required'; end if;
  select jsonb_build_object('id',s.id,'version',s.version,'people',coalesce((select jsonb_agg(jsonb_build_object('personId',p.id,'name',p.name,'generation',p.generation,'group',p.group_name,'date',p.date,'prayer',p.prayer) order by p.position) from public.sender_person p where p.sender_id=s.id and p.deleted_at is null),'[]'::jsonb)) into result from public.sender s where s.id=p_id and s.deleted_at is null;
  if result is null then raise exception using errcode='P0002', message='Not found'; end if;
  return result;
end $$;
create function public.delete_sender(p_id uuid,p_version integer) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_user(); current_row public.sender%rowtype;
begin
  select * into current_row from public.sender where id=p_id for update;
  if not found or current_row.deleted_at is not null then raise exception using errcode='P0002', message='Not found'; end if;
  if p_version is null or current_row.version<>p_version then raise exception using errcode='40001', message='Version conflict'; end if;
  if exists(select 1 from public.weekly where sender_id=p_id) then raise exception using errcode='23503', message='Still referenced'; end if;
  update public.sender_person set deleted_at=now(),updated_at=now(),updated_by=actor where sender_id=p_id and deleted_at is null;
  update public.sender set deleted_at=now(),updated_at=now(),updated_by=actor,version=version+1 where id=p_id;
end $$;

drop function public.save_weekly(uuid,integer,date,text[],jsonb,jsonb);
create function public.save_weekly(p_id uuid default null,p_version integer default null,p_date date default null,p_sections text[] default null,p_sermon jsonb default null,p_family jsonb default null,p_sender jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_user(); old public.weekly%rowtype; locked public.weekly%rowtype; sid uuid; fid uuid; sender_result uuid; result_id uuid;
begin
  if p_date is null or p_sections is null or array_position(p_sections,null) is not null
    or not p_sections <@ array['thumbnail','cover','sermon','family','senders']::text[]
    or cardinality(p_sections)<>(select count(distinct s) from unnest(p_sections) s)
    or (p_id is null)<>(p_version is null) then raise exception using errcode='22023', message='Invalid weekly'; end if;
  if p_id is not null then
    select * into old from public.weekly where id=p_id;
    if not found or old.deleted_at is not null then raise exception using errcode='P0002', message='Not found'; end if;
  end if;
  -- Global lock order: files -> sermon -> family -> sender -> weekly.
  if p_family is not null then
    if not private.valid_groups(p_family->'values'->'groups') then raise exception using errcode='22023', message='Invalid family'; end if;
  end if;
  perform private.lock_files(coalesce(p_family->'values'->'groups','[]'::jsonb) || jsonb_build_array(jsonb_build_object('photoId',p_sermon->'values'->>'thumbnailId')));
  perform id from public.sermon where id=old.sermon_id or id=(p_sermon->>'id')::uuid order by id for update;
  perform id from public.family where id=old.family_id or id=(p_family->>'id')::uuid order by id for update;
  perform id from public.sender where id=old.sender_id or id=(p_sender->>'id')::uuid order by id for update;
  if p_id is not null then
    select * into locked from public.weekly where id=p_id for update;
    if locked.deleted_at is not null then raise exception using errcode='P0002', message='Not found'; end if;
    if locked.version<>p_version or locked.date<>p_date or locked.sermon_id is distinct from old.sermon_id or locked.family_id is distinct from old.family_id or locked.sender_id is distinct from old.sender_id then raise exception using errcode='40001', message='Version conflict'; end if;
  end if;
  if p_sermon is not null then sid:=public.save_sermon((p_sermon->>'id')::uuid,(p_sermon->>'version')::integer,p_sermon->'values'); end if;
  if p_family is not null then fid:=public.save_family((p_family->>'id')::uuid,(p_family->>'version')::integer,p_family->'values'); end if;
  if p_sender is not null then sender_result:=public.save_sender((p_sender->>'id')::uuid,(p_sender->>'version')::integer,p_sender->'values'); end if;
  if p_id is null then
    insert into public.weekly(date,sections,sermon_id,family_id,sender_id,updated_by) values(p_date,p_sections,sid,fid,sender_result,actor) returning id into result_id;
  else
    update public.weekly w set sections=p_sections,sermon_id=sid,family_id=fid,sender_id=sender_result,updated_at=now(),updated_by=actor,version=w.version+1 where id=p_id returning id into result_id;
  end if;
  return result_id;
end $$;
create or replace function public.get_weekly(p_date date) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception using errcode='42501', message='Authentication required'; end if;
  select to_jsonb(w)-array['created_at','updated_by','deleted_at','sermon_id','family_id','sender_id'] || jsonb_build_object(
    'sermon',(select to_jsonb(s)-array['created_at','updated_at','updated_by','deleted_at'] from public.sermon s where s.id=w.sermon_id),
    'family',(select to_jsonb(f)-array['created_at','updated_at','updated_by','deleted_at'] from public.family f where f.id=w.family_id),
    'sender',case when w.sender_id is null then null else public.get_sender(w.sender_id) end
  ) into result from public.weekly w where w.date=p_date and w.deleted_at is null;
  if result is null then raise exception using errcode='P0002', message='Not found'; end if;
  return result;
end $$;
revoke all on function public.save_sender(uuid,integer,jsonb),public.get_sender(uuid),public.delete_sender(uuid,integer),public.save_weekly(uuid,integer,date,text[],jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.save_sender(uuid,integer,jsonb),public.get_sender(uuid),public.delete_sender(uuid,integer),public.save_weekly(uuid,integer,date,text[],jsonb,jsonb,jsonb) to authenticated;

-- Thumbnails reference the same immutable, private originals as family photos.
alter table public.sermon add column thumbnail_id uuid references public.files(id) on delete restrict;
create index sermon_thumbnail_id on public.sermon(thumbnail_id) where thumbnail_id is not null;
create or replace function private.lock_files(groups jsonb) returns void language plpgsql set search_path='' as $$
declare file_id uuid;
begin
  for file_id in select distinct (g->>'photoId')::uuid from jsonb_array_elements(groups) g where g->>'photoId' is not null order by 1 loop
    perform id from public.files where id=file_id and deleted_at is null for share;
    if not found then raise exception using errcode='23503', message='Photo is unavailable'; end if;
  end loop;
end $$;

create or replace function public.save_sermon(p_id uuid default null,p_version integer default null,p_values jsonb default null) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid:=private.require_user(); current_row public.sermon%rowtype; result_id uuid;
begin
  if p_values is null or jsonb_typeof(p_values)<>'object' or p_values-array['date','speaker','title','bible','content','thumbnailId']<>'{}'::jsonb
    or jsonb_typeof(p_values->'speaker') is distinct from 'string' or private.text_length(p_values->>'speaker')>100
    or jsonb_typeof(p_values->'title') is distinct from 'string' or private.text_length(p_values->>'title')>200
    or jsonb_typeof(p_values->'bible') is distinct from 'string' or private.text_length(p_values->>'bible')>200
    or not private.valid_document(p_values->'content') or (p_id is null)<>(p_version is null) then
    raise exception using errcode='22023', message='Invalid sermon';
  end if;
  perform private.lock_files(jsonb_build_array(jsonb_build_object('photoId',p_values->>'thumbnailId')));
  if p_id is null then
    insert into public.sermon(date,speaker,title,bible,content,thumbnail_id,updated_by) values(nullif(p_values->>'date','')::date,p_values->>'speaker',p_values->>'title',p_values->>'bible',p_values->'content',(p_values->>'thumbnailId')::uuid,actor) returning id into result_id;
  else
    select * into current_row from public.sermon where id=p_id for update;
    if not found or current_row.deleted_at is not null then raise exception using errcode='P0002', message='Not found'; end if;
    if current_row.version<>p_version then raise exception using errcode='40001', message='Version conflict'; end if;
    update public.sermon set date=nullif(p_values->>'date','')::date,speaker=p_values->>'speaker',title=p_values->>'title',bible=p_values->>'bible',content=p_values->'content',thumbnail_id=case when p_values ? 'thumbnailId' then (p_values->>'thumbnailId')::uuid else current_row.thumbnail_id end,updated_by=actor,updated_at=now(),version=version+1 where id=p_id returning id into result_id;
  end if;
  return result_id;
end $$;

create or replace function public.delete_file(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  perform private.require_user();
  perform id from public.files where id=p_id and deleted_at is null for update;
  if not found then raise exception using errcode='P0002', message='Not found'; end if;
  if exists(select 1 from public.family f, jsonb_array_elements(f.groups) g where g->>'photoId'=p_id::text) or exists(select 1 from public.sermon where thumbnail_id=p_id) then raise exception using errcode='23503', message='Still referenced'; end if;
  update public.files set deleted_at=now() where id=p_id;
end $$;
