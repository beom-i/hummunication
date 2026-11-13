-- One sender row per person. Preserve existing content IDs and soft-delete records.
drop function public.save_weekly(uuid,integer,date,text[],jsonb,jsonb,jsonb);
drop function public.save_sender(uuid,integer,jsonb),public.get_sender(uuid),public.delete_sender(uuid,integer);
drop function public.save_sermon(uuid,integer,jsonb),public.save_family(uuid,integer,jsonb);
drop function public.delete_sermon(uuid,integer),public.delete_family(uuid,integer),public.delete_weekly(uuid,integer);
alter table public.weekly drop column version;
alter table public.sermon drop column version;
alter table public.family drop column version;

alter table public.sender rename to sender_bundle_old;
drop policy "team reads active sender people" on public.sender_person;
drop index public.sender_person_active_position;
alter table public.sender_person rename to sender;
alter table public.sender add column weekly_id uuid references public.weekly(id) on delete restrict;
update public.sender s set weekly_id=w.id from public.weekly w where w.sender_id=s.sender_id;
update public.sender s set deleted_at=coalesce(s.deleted_at,b.deleted_at) from public.sender_bundle_old b where b.id=s.sender_id;
alter table public.weekly drop column sender_id;
alter table public.sender drop column sender_id;
drop table public.sender_bundle_old;
alter table public.sender rename constraint sender_person_pkey to sender_pkey;
create unique index sender_active_position on public.sender(weekly_id,position) where deleted_at is null;
create policy "team reads active senders" on public.sender for select to authenticated using ((select auth.uid()) is not null and coalesce((select auth.jwt()->>'is_anonymous'),'false')<>'true' and deleted_at is null);
revoke all on public.sender from anon,authenticated;
grant select on public.sender to authenticated;

create function public.save_sermon(p_id uuid default null,p_values jsonb default null) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor uuid:=private.require_user(); current_row public.sermon%rowtype; result_id uuid;
begin
  if p_values is null or jsonb_typeof(p_values)<>'object' or p_values-array['date','speaker','title','bible','content','thumbnailId']<>'{}'::jsonb
    or jsonb_typeof(p_values->'speaker') is distinct from 'string' or private.text_length(p_values->>'speaker')>100
    or jsonb_typeof(p_values->'title') is distinct from 'string' or private.text_length(p_values->>'title')>200
    or jsonb_typeof(p_values->'bible') is distinct from 'string' or private.text_length(p_values->>'bible')>200
    or not private.valid_document(p_values->'content') then
    raise exception using errcode='22023', message='Invalid sermon';
  end if;
  perform private.lock_files(jsonb_build_array(jsonb_build_object('photoId',p_values->>'thumbnailId')));
  if p_id is null then
    insert into public.sermon(date,speaker,title,bible,content,thumbnail_id,updated_by) values(nullif(p_values->>'date','')::date,p_values->>'speaker',p_values->>'title',p_values->>'bible',p_values->'content',(p_values->>'thumbnailId')::uuid,actor) returning id into result_id;
  else
    select * into current_row from public.sermon where id=p_id for update;
    if not found or current_row.deleted_at is not null then raise exception using errcode='P0002', message='Not found'; end if;
    update public.sermon set date=nullif(p_values->>'date','')::date,speaker=p_values->>'speaker',title=p_values->>'title',bible=p_values->>'bible',content=p_values->'content',thumbnail_id=case when p_values ? 'thumbnailId' then (p_values->>'thumbnailId')::uuid else current_row.thumbnail_id end,updated_by=actor,updated_at=now() where id=p_id returning id into result_id;
  end if;
  return result_id;
end $$;
create function public.save_family(p_id uuid default null,p_values jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_user(); current_row public.family%rowtype; result_id uuid;
begin
  if p_values is null or p_values-array['groups']<>'{}'::jsonb or not private.valid_groups(p_values->'groups') then raise exception using errcode='22023', message='Invalid family'; end if;
  perform private.lock_files(p_values->'groups');
  if p_id is null then
    insert into public.family(groups,updated_by) values(p_values->'groups',actor) returning id into result_id;
  else
    select * into current_row from public.family where id=p_id for update;
    if not found or current_row.deleted_at is not null then raise exception using errcode='P0002', message='Not found'; end if;
    update public.family set groups=p_values->'groups',updated_at=now(),updated_by=actor where id=p_id returning id into result_id;
  end if;
  return result_id;
end $$;
create function public.delete_sermon(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_user(); current_row public.sermon%rowtype;
begin
  select * into current_row from public.sermon where id=p_id for update;
  if not found or current_row.deleted_at is not null then raise exception using errcode='P0002', message='Not found'; end if;
  if exists(select 1 from public.weekly where sermon_id=p_id) then raise exception using errcode='23503', message='Still referenced'; end if;
  update public.sermon set deleted_at=now(),updated_at=now(),updated_by=actor where id=p_id;
end $$;
create function public.delete_family(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_user(); current_row public.family%rowtype;
begin
  select * into current_row from public.family where id=p_id for update;
  if not found or current_row.deleted_at is not null then raise exception using errcode='P0002', message='Not found'; end if;
  if exists(select 1 from public.weekly where family_id=p_id) then raise exception using errcode='23503', message='Still referenced'; end if;
  update public.family set deleted_at=now(),updated_at=now(),updated_by=actor where id=p_id;
end $$;
create function public.delete_weekly(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_user(); current_row public.weekly%rowtype;
begin
  select * into current_row from public.weekly where id=p_id for update;
  if not found or current_row.deleted_at is not null then raise exception using errcode='P0002', message='Not found'; end if;
  update public.weekly set deleted_at=now(),updated_at=now(),updated_by=actor where id=p_id;
end $$;

create function private.valid_sender(person jsonb) returns boolean language plpgsql immutable set search_path='' as $$
begin
  if person is null or jsonb_typeof(person)<>'object' or person-array['name','generation','group','date','prayer']<>'{}'::jsonb
    or jsonb_typeof(person->'name') is distinct from 'string' or private.text_length(person->>'name')>100
    or jsonb_typeof(person->'generation') is distinct from 'string' or (person->>'generation') !~ '^[0-9]{0,3}$'
    or jsonb_typeof(person->'group') is distinct from 'string' or private.text_length(person->>'group')>100
    or jsonb_typeof(person->'prayer') is distinct from 'string' or private.text_length(person->>'prayer')>3000
    or (person->>'date' is not null and person->>'date'<>'' and (person->>'date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$') then return false; end if;
  perform nullif(person->>'date','')::date;
  return true;
exception when others then return false;
end $$;
create function public.save_sender(p_id uuid default null,p_values jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_user(); result_id uuid;
begin
  if not private.valid_sender(p_values) then raise exception using errcode='22023', message='Invalid sender'; end if;
  if p_id is null then
    insert into public.sender(name,generation,group_name,date,prayer,position,updated_by) values(p_values->>'name',p_values->>'generation',p_values->>'group',nullif(p_values->>'date','')::date,p_values->>'prayer',0,actor) returning id into result_id;
  else
    update public.sender set name=p_values->>'name',generation=p_values->>'generation',group_name=p_values->>'group',date=nullif(p_values->>'date','')::date,prayer=p_values->>'prayer',updated_at=now(),updated_by=actor where id=p_id and deleted_at is null returning id into result_id;
    if result_id is null then raise exception using errcode='P0002', message='Not found'; end if;
  end if;
  return result_id;
end $$;
create function public.get_sender(p_id uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception using errcode='42501', message='Authentication required'; end if;
  select jsonb_build_object('id',s.id,'weeklyId',s.weekly_id,'position',s.position,'name',s.name,'generation',s.generation,'group',s.group_name,'date',s.date,'prayer',s.prayer) into result from public.sender s where s.id=p_id and s.deleted_at is null;
  if result is null then raise exception using errcode='P0002', message='Not found'; end if;
  return result;
end $$;
create function public.delete_sender(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_user();
begin
  update public.sender set deleted_at=now(),updated_at=now(),updated_by=actor where id=p_id and deleted_at is null;
  if not found then raise exception using errcode='P0002', message='Not found'; end if;
end $$;

create function private.replace_senders(p_weekly_id uuid,p_people jsonb) returns void language plpgsql set search_path='' as $$
declare person jsonb; person_id uuid; ids uuid[]:='{}'; ordinal bigint; actor uuid:=private.require_user();
begin
  if p_people is null or jsonb_typeof(p_people)<>'array' or jsonb_array_length(p_people)>20 then raise exception using errcode='22023', message='Invalid senders'; end if;
  for person in select value from jsonb_array_elements(p_people) loop
    if not private.valid_sender(person-'id') then raise exception using errcode='22023', message='Invalid sender'; end if;
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
      insert into public.sender(weekly_id,name,generation,group_name,date,prayer,position,updated_by) values(p_weekly_id,person->>'name',person->>'generation',person->>'group',nullif(person->>'date','')::date,person->>'prayer',ordinal-1,actor);
    else
      update public.sender set weekly_id=p_weekly_id,name=person->>'name',generation=person->>'generation',group_name=person->>'group',date=nullif(person->>'date','')::date,prayer=person->>'prayer',position=ordinal-1,deleted_at=null,updated_at=now(),updated_by=actor where id=person_id;
    end if;
  end loop;
end $$;

create function public.save_weekly(p_id uuid default null,p_date date default null,p_sections text[] default null,p_sermon jsonb default null,p_family jsonb default null,p_senders jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_user(); current_row public.weekly%rowtype; sid uuid; fid uuid; result_id uuid;
begin
  if p_date is null or p_sections is null or array_position(p_sections,null) is not null
    or not p_sections <@ array['thumbnail','cover','sermon','family','senders']::text[]
    or cardinality(p_sections)<>(select count(distinct s) from unnest(p_sections) s) then raise exception using errcode='22023', message='Invalid weekly'; end if;
  if p_family is not null and not private.valid_groups(p_family->'values'->'groups') then raise exception using errcode='22023', message='Invalid family'; end if;
  -- Files -> weekly -> sermon -> family -> sender. Independent content writes never lock weekly.
  perform private.lock_files(coalesce(p_family->'values'->'groups','[]'::jsonb) || jsonb_build_array(jsonb_build_object('photoId',p_sermon->'values'->>'thumbnailId')));
  if p_id is not null then
    select * into current_row from public.weekly where id=p_id for update;
    if not found or current_row.deleted_at is not null then raise exception using errcode='P0002', message='Not found'; end if;
    if current_row.date<>p_date then raise exception using errcode='22023', message='Publication date is fixed'; end if;
  end if;
  perform id from public.sermon where id=(p_sermon->>'id')::uuid order by id for update;
  perform id from public.family where id=(p_family->>'id')::uuid order by id for update;
  if p_sermon is not null then sid:=public.save_sermon((p_sermon->>'id')::uuid,p_sermon->'values'); end if;
  if p_family is not null then fid:=public.save_family((p_family->>'id')::uuid,p_family->'values'); end if;
  if p_id is null then
    insert into public.weekly(date,sections,sermon_id,family_id,updated_by) values(p_date,p_sections,sid,fid,actor) returning id into result_id;
  else
    update public.weekly set sections=p_sections,sermon_id=sid,family_id=fid,updated_at=now(),updated_by=actor where id=p_id returning id into result_id;
  end if;
  if p_senders is not null then perform private.replace_senders(result_id,p_senders); end if;
  return result_id;
end $$;
create or replace function public.get_weekly(p_date date) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
  if auth.uid() is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception using errcode='42501', message='Authentication required'; end if;
  select to_jsonb(w)-array['created_at','updated_by','deleted_at','sermon_id','family_id'] || jsonb_build_object(
    'sermon',(select to_jsonb(s)-array['created_at','updated_at','updated_by','deleted_at'] from public.sermon s where s.id=w.sermon_id),
    'family',(select to_jsonb(f)-array['created_at','updated_at','updated_by','deleted_at'] from public.family f where f.id=w.family_id),
    'senders',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'generation',s.generation,'group',s.group_name,'date',s.date,'prayer',s.prayer) order by s.position) from public.sender s where s.weekly_id=w.id and s.deleted_at is null),'[]'::jsonb)
  ) into result from public.weekly w where w.date=p_date and w.deleted_at is null;
  if result is null then raise exception using errcode='P0002', message='Not found'; end if;
  return result;
end $$;
revoke all on function private.valid_sender(jsonb),private.replace_senders(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.save_sermon(uuid,jsonb),public.save_family(uuid,jsonb),public.save_sender(uuid,jsonb),public.save_weekly(uuid,date,text[],jsonb,jsonb,jsonb),public.delete_sermon(uuid),public.delete_family(uuid),public.delete_sender(uuid),public.delete_weekly(uuid),public.get_sender(uuid) from public,anon;
grant execute on function public.save_sermon(uuid,jsonb),public.save_family(uuid,jsonb),public.save_sender(uuid,jsonb),public.save_weekly(uuid,date,text[],jsonb,jsonb,jsonb),public.delete_sermon(uuid),public.delete_family(uuid),public.delete_sender(uuid),public.delete_weekly(uuid),public.get_sender(uuid) to authenticated;
