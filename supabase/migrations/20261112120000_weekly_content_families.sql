-- Family entries and senders are ordered rows directly attached to weekly.
drop function public.save_weekly(uuid,date,text[],jsonb,jsonb,jsonb);
drop function public.save_family(uuid,jsonb),public.delete_family(uuid);

create function private.valid_family(entry jsonb) returns boolean language sql immutable set search_path='' as $$
  select entry is not null and jsonb_typeof(entry)='object'
    and entry-array['name','photo_id','photo_edit','leader_name','leader_answer','members']='{}'::jsonb
    and private.valid_groups(jsonb_build_array(jsonb_build_object(
      'name',entry->'name','photoId',entry->'photo_id','photoEdit',entry->'photo_edit',
      'leader',jsonb_build_object('name',entry->'leader_name','answer',entry->'leader_answer'),'members',entry->'members')))
$$;
create table public.family_entry (
  id uuid primary key default gen_random_uuid(), weekly_id uuid references public.weekly(id) on delete restrict,
  name text not null default '', photo_id uuid references public.files(id) on delete restrict, photo_edit jsonb,
  leader_name text not null default '', leader_answer text not null default '', members jsonb not null default '[]',
  position integer not null default 0 check(position between 0 and 19),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null, deleted_at timestamptz,
  constraint family_valid_values check(private.valid_family(jsonb_build_object('name',name,'photo_id',photo_id,'photo_edit',photo_edit,'leader_name',leader_name,'leader_answer',leader_answer,'members',members)))
);
alter table public.family_entry enable row level security;
create policy "team reads active families" on public.family_entry for select to authenticated using ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'),'false')<>'true' and deleted_at is null);
revoke all on public.family_entry from anon,authenticated;
grant select on public.family_entry to authenticated;

insert into public.family_entry(id,weekly_id,name,photo_id,photo_edit,leader_name,leader_answer,members,position,created_at,updated_at,updated_by,deleted_at)
select case when g.ordinality=1 then f.id else gen_random_uuid() end,w.id,g.value->>'name',(g.value->>'photoId')::uuid,nullif(g.value->'photoEdit','null'::jsonb),g.value->'leader'->>'name',g.value->'leader'->>'answer',g.value->'members',g.ordinality-1,f.created_at,f.updated_at,f.updated_by,f.deleted_at
from public.family f left join public.weekly w on w.family_id=f.id cross join lateral jsonb_array_elements(f.groups) with ordinality g;
alter table public.weekly drop column family_id;
drop table public.family;
alter table public.family_entry rename to family;
alter table public.family rename constraint family_entry_pkey to family_pkey;
alter table public.family rename constraint family_entry_weekly_id_fkey to family_weekly_id_fkey;
alter table public.family rename constraint family_entry_photo_id_fkey to family_photo_id_fkey;
alter table public.family rename constraint family_entry_updated_by_fkey to family_updated_by_fkey;
alter table public.family rename constraint family_entry_position_check to family_position_check;
create unique index family_active_position on public.family(weekly_id,position) where deleted_at is null;
create index family_photo_id on public.family(photo_id) where photo_id is not null;

create function public.save_family(p_id uuid default null,p_values jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_user(); result_id uuid;
begin
  if not private.valid_family(p_values) then raise exception using errcode='22023', message='Invalid family'; end if;
  perform private.lock_files(jsonb_build_array(jsonb_build_object('photoId',p_values->>'photo_id')));
  if p_id is null then
    insert into public.family(name,photo_id,photo_edit,leader_name,leader_answer,members,updated_by) values(p_values->>'name',(p_values->>'photo_id')::uuid,nullif(p_values->'photo_edit','null'::jsonb),p_values->>'leader_name',p_values->>'leader_answer',p_values->'members',actor) returning id into result_id;
  else
    update public.family set name=p_values->>'name',photo_id=(p_values->>'photo_id')::uuid,photo_edit=nullif(p_values->'photo_edit','null'::jsonb),leader_name=p_values->>'leader_name',leader_answer=p_values->>'leader_answer',members=p_values->'members',updated_at=now(),updated_by=actor where id=p_id and deleted_at is null returning id into result_id;
    if result_id is null then raise exception using errcode='P0002', message='Not found'; end if;
  end if;
  return result_id;
end $$;
create function public.get_family(p_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception using errcode='42501', message='Authentication required'; end if;
  select to_jsonb(f)-array['created_at','updated_at','updated_by','deleted_at'] into result from public.family f where f.id=p_id and f.deleted_at is null;
  if result is null then raise exception using errcode='P0002', message='Not found'; end if;
  return result;
end $$;
create function public.delete_family(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_user();
begin
  update public.family set deleted_at=now(),updated_at=now(),updated_by=actor where id=p_id and deleted_at is null;
  if not found then raise exception using errcode='P0002', message='Not found'; end if;
end $$;
create function private.replace_families(p_weekly_id uuid,p_entries jsonb) returns void language plpgsql set search_path='' as $$
declare entry jsonb; entry_id uuid; ids uuid[]:='{}'; ordinal bigint; actor uuid:=private.require_user();
begin
  if p_entries is null or jsonb_typeof(p_entries)<>'array' or jsonb_array_length(p_entries)>20 then raise exception using errcode='22023', message='Invalid families'; end if;
  for entry in select value from jsonb_array_elements(p_entries) loop
    if not private.valid_family(entry-array['id','position']) then raise exception using errcode='22023', message='Invalid family'; end if;
    entry_id:=(entry->>'id')::uuid;
    if entry_id is not null then
      if entry_id=any(ids) then raise exception using errcode='22023', message='Duplicate family'; end if;
      ids:=array_append(ids,entry_id);
    end if;
  end loop;
  perform id from public.family where id=any(ids) order by id for update;
  if exists(select 1 from unnest(ids) wanted(id) left join public.family f on f.id=wanted.id where f.id is null or f.deleted_at is not null or (f.weekly_id is not null and f.weekly_id<>p_weekly_id)) then raise exception using errcode='23503', message='Family is unavailable'; end if;
  update public.family set deleted_at=now(),updated_at=now(),updated_by=actor where weekly_id=p_weekly_id and deleted_at is null;
  for entry,ordinal in select value,ordinality from jsonb_array_elements(p_entries) with ordinality loop
    entry_id:=(entry->>'id')::uuid;
    if entry_id is null then
      insert into public.family(weekly_id,name,photo_id,photo_edit,leader_name,leader_answer,members,position,updated_by) values(p_weekly_id,entry->>'name',(entry->>'photo_id')::uuid,nullif(entry->'photo_edit','null'::jsonb),entry->>'leader_name',entry->>'leader_answer',entry->'members',ordinal-1,actor);
    else
      update public.family set weekly_id=p_weekly_id,name=entry->>'name',photo_id=(entry->>'photo_id')::uuid,photo_edit=nullif(entry->'photo_edit','null'::jsonb),leader_name=entry->>'leader_name',leader_answer=entry->>'leader_answer',members=entry->'members',position=ordinal-1,deleted_at=null,updated_at=now(),updated_by=actor where id=entry_id;
    end if;
  end loop;
end $$;

create or replace function private.valid_sender(person jsonb) returns boolean language plpgsql immutable set search_path='' as $$
begin
  if person is null or jsonb_typeof(person)<>'object' or person-array['name','generation','group_name','date','prayer']<>'{}'::jsonb
    or jsonb_typeof(person->'name') is distinct from 'string' or private.text_length(person->>'name')>100
    or jsonb_typeof(person->'generation') is distinct from 'string' or (person->>'generation') !~ '^[0-9]{0,3}$'
    or jsonb_typeof(person->'group_name') is distinct from 'string' or private.text_length(person->>'group_name')>100
    or jsonb_typeof(person->'prayer') is distinct from 'string' or private.text_length(person->>'prayer')>3000
    or (person->>'date' is not null and person->>'date'<>'' and (person->>'date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') then return false; end if;
  perform nullif(person->>'date','')::date;
  return true;
exception when others then return false;
end $$;

create or replace function public.save_sender(p_id uuid default null,p_values jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_user(); result_id uuid;
begin
  if not private.valid_sender(p_values) then raise exception using errcode='22023', message='Invalid sender'; end if;
  if p_id is null then
    insert into public.sender(name,generation,group_name,date,prayer,position,updated_by) values(p_values->>'name',p_values->>'generation',p_values->>'group_name',nullif(p_values->>'date','')::date,p_values->>'prayer',0,actor) returning id into result_id;
  else
    update public.sender set name=p_values->>'name',generation=p_values->>'generation',group_name=p_values->>'group_name',date=nullif(p_values->>'date','')::date,prayer=p_values->>'prayer',updated_at=now(),updated_by=actor where id=p_id and deleted_at is null returning id into result_id;
    if result_id is null then raise exception using errcode='P0002', message='Not found'; end if;
  end if;
  return result_id;
end $$;

create or replace function private.replace_senders(p_weekly_id uuid,p_people jsonb) returns void language plpgsql set search_path='' as $$
declare person jsonb; person_id uuid; ids uuid[]:='{}'; ordinal bigint; actor uuid:=private.require_user();
begin
  if p_people is null or jsonb_typeof(p_people)<>'array' or jsonb_array_length(p_people)>20 then raise exception using errcode='22023', message='Invalid senders'; end if;
  for person in select value from jsonb_array_elements(p_people) loop
    if not private.valid_sender(person-array['id','position']) then raise exception using errcode='22023', message='Invalid sender'; end if;
    person_id:=(person->>'id')::uuid;
    if person_id is not null then
      if person_id=any(ids) then raise exception using errcode='22023', message='Duplicate sender'; end if;
      ids:=array_append(ids,person_id);
    end if;
  end loop;
  perform id from public.sender where id=any(ids) order by id for update;
  if exists(select 1 from unnest(ids) wanted(id) left join public.sender s on s.id=wanted.id where s.id is null or s.deleted_at is not null or (s.weekly_id is not null and s.weekly_id<>p_weekly_id)) then raise exception using errcode='23503', message='Sender is unavailable'; end if;
  -- Release positions atomically; retain submitted IDs and soft-delete removed rows.
  update public.sender set deleted_at=now(),updated_at=now(),updated_by=actor where weekly_id=p_weekly_id and deleted_at is null;
  for person,ordinal in select value,ordinality from jsonb_array_elements(p_people) with ordinality loop
    person_id:=(person->>'id')::uuid;
    if person_id is null then
      insert into public.sender(weekly_id,name,generation,group_name,date,prayer,position,updated_by) values(p_weekly_id,person->>'name',person->>'generation',person->>'group_name',nullif(person->>'date','')::date,person->>'prayer',ordinal-1,actor);
    else
      update public.sender set weekly_id=p_weekly_id,name=person->>'name',generation=person->>'generation',group_name=person->>'group_name',date=nullif(person->>'date','')::date,prayer=person->>'prayer',position=ordinal-1,deleted_at=null,updated_at=now(),updated_by=actor where id=person_id;
    end if;
  end loop;
end $$;

create or replace function public.get_sender(p_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception using errcode='42501', message='Authentication required'; end if;
  select to_jsonb(s)-array['created_at','updated_at','updated_by','deleted_at'] into result from public.sender s where s.id=p_id and s.deleted_at is null;
  if result is null then raise exception using errcode='P0002', message='Not found'; end if;
  return result;
end $$;
create function public.save_weekly(p_id uuid default null,p_date date default null,p_sections text[] default null,p_sermon jsonb default null,p_families jsonb default null,p_senders jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_user(); current_row public.weekly%rowtype; sid uuid; result_id uuid; file_refs jsonb;
begin
  if p_date is null or p_sections is null or array_position(p_sections,null) is not null
    or not p_sections <@ array['thumbnail','cover','sermon','family','senders']::text[]
    or cardinality(p_sections)<>(select count(distinct s) from unnest(p_sections) s) then raise exception using errcode='22023', message='Invalid weekly'; end if;
  if p_families is not null and jsonb_typeof(p_families)<>'array' then raise exception using errcode='22023', message='Invalid families'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('photoId',e->>'photo_id')),'[]'::jsonb) into file_refs from jsonb_array_elements(coalesce(p_families,'[]'::jsonb)) e;
  -- Lock referenced files before content rows, including the sermon thumbnail.
  perform private.lock_files(file_refs || jsonb_build_array(jsonb_build_object('photoId',p_sermon->'values'->>'thumbnailId')));
  if p_id is not null then
    select * into current_row from public.weekly where id=p_id for update;
    if not found or current_row.deleted_at is not null then raise exception using errcode='P0002', message='Not found'; end if;
    if current_row.date<>p_date then raise exception using errcode='22023', message='Publication date is fixed'; end if;
  end if;
  if p_sermon is not null then sid:=public.save_sermon((p_sermon->>'id')::uuid,p_sermon->'values'); end if;
  if p_id is null then
    insert into public.weekly(date,sections,sermon_id,updated_by) values(p_date,p_sections,sid,actor) returning id into result_id;
  else
    update public.weekly set sections=p_sections,sermon_id=sid,updated_at=now(),updated_by=actor where id=p_id returning id into result_id;
  end if;
  if p_families is not null then perform private.replace_families(result_id,p_families); end if;
  if p_senders is not null then perform private.replace_senders(result_id,p_senders); end if;
  return result_id;
end $$;
create or replace function public.get_weekly(p_date date) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception using errcode='42501', message='Authentication required'; end if;
  select to_jsonb(w)-array['created_at','updated_by','deleted_at','sermon_id'] || jsonb_build_object(
    'sermon',(select to_jsonb(s)-array['created_at','updated_at','updated_by','deleted_at'] from public.sermon s where s.id=w.sermon_id),
    'families',coalesce((select jsonb_agg(to_jsonb(f)-array['created_at','updated_at','updated_by','deleted_at','weekly_id'] order by f.position) from public.family f where f.weekly_id=w.id and f.deleted_at is null),'[]'::jsonb),
    'senders',coalesce((select jsonb_agg(to_jsonb(s)-array['created_at','updated_at','updated_by','deleted_at','weekly_id'] order by s.position) from public.sender s where s.weekly_id=w.id and s.deleted_at is null),'[]'::jsonb)
  ) into result from public.weekly w where w.date=p_date and w.deleted_at is null;
  if result is null then raise exception using errcode='P0002', message='Not found'; end if;
  return result;
end $$;
create or replace function public.delete_file(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  perform private.require_user();
  perform id from public.files where id=p_id and deleted_at is null for update;
  if not found then raise exception using errcode='P0002', message='Not found'; end if;
  if exists(select 1 from public.family where photo_id=p_id) or exists(select 1 from public.sermon where thumbnail_id=p_id) then raise exception using errcode='23503', message='Still referenced'; end if;
  update public.files set deleted_at=now() where id=p_id;
end $$;
revoke all on function private.valid_family(jsonb),private.replace_families(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.save_family(uuid,jsonb),public.get_family(uuid),public.delete_family(uuid),public.save_weekly(uuid,date,text[],jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.save_family(uuid,jsonb),public.get_family(uuid),public.delete_family(uuid),public.save_weekly(uuid,date,text[],jsonb,jsonb,jsonb) to authenticated;
