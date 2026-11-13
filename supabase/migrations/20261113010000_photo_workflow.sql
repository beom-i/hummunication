-- Keep original files; persist photo editing for both domains and retire unused files.
create function private.valid_photo_edit(edit jsonb,aspect numeric) returns boolean language plpgsql immutable set search_path='' as $$
declare crop jsonb; w numeric; h numeric; angle numeric;
begin
  if edit is null or edit='null'::jsonb then return true; end if;
  if jsonb_typeof(edit)<>'object' or edit-array['rotation','sourceWidth','sourceHeight','crop','quality']<>'{}'::jsonb
    or jsonb_typeof(edit->'rotation') is distinct from 'number' or jsonb_typeof(edit->'sourceWidth') is distinct from 'number' or jsonb_typeof(edit->'sourceHeight') is distinct from 'number' then return false; end if;
  angle:=(edit->>'rotation')::numeric; w:=(edit->>'sourceWidth')::numeric; h:=(edit->>'sourceHeight')::numeric;
  if angle not in(0,90,180,270) or w not between 1 and 50000 or h not between 1 and 50000 or trunc(w)<>w or trunc(h)<>h then return false; end if;
  if edit ? 'quality' and edit->'quality'<>'null'::jsonb and (jsonb_typeof(edit->'quality')<>'number' or (edit->>'quality')::numeric not in(0.85,0.65)) then return false; end if;
  crop:=edit->'crop';
  if jsonb_typeof(crop) is distinct from 'object' or crop-array['x','y','width','height']<>'{}'::jsonb
    or jsonb_typeof(crop->'x') is distinct from 'number' or jsonb_typeof(crop->'y') is distinct from 'number'
    or jsonb_typeof(crop->'width') is distinct from 'number' or jsonb_typeof(crop->'height') is distinct from 'number' then return false; end if;
  if (crop->>'x')::numeric<0 or (crop->>'y')::numeric<0 or (crop->>'width')::numeric<=0 or (crop->>'height')::numeric<=0
    or (crop->>'width')::numeric>1 or (crop->>'height')::numeric>1
    or (crop->>'x')::numeric+(crop->>'width')::numeric>1.001 or (crop->>'y')::numeric+(crop->>'height')::numeric>1.001 then return false; end if;
  if angle in(90,270) then w:=(edit->>'sourceHeight')::numeric; h:=(edit->>'sourceWidth')::numeric; end if;
  return abs(((crop->>'width')::numeric*w)/((crop->>'height')::numeric*h)-aspect)<0.01;
exception when others then return false;
end $$;
create or replace function private.valid_family(entry jsonb) returns boolean language sql immutable set search_path='' as $$
  select entry is not null and jsonb_typeof(entry)='object'
    and entry-array['name','photo_id','photo_edit','leader_name','leader_answer','members']='{}'::jsonb
    and (private.valid_photo_edit(entry->'photo_edit',16.0/9) or private.valid_photo_edit(entry->'photo_edit',119.0/71))
    and (entry->'photo_edit' is null or entry->'photo_edit'='null'::jsonb or entry->>'photo_id' is not null)
    and private.valid_groups(jsonb_build_array(jsonb_build_object(
      'name',entry->'name','photoId',entry->'photo_id','photoEdit',null,
      'leader',jsonb_build_object('name',entry->'leader_name','answer',entry->'leader_answer'),'members',entry->'members')))
$$;
alter table public.sermon add column thumbnail_edit jsonb;
alter table public.sermon add constraint sermon_valid_thumbnail_edit check (
  private.valid_photo_edit(thumbnail_edit,16.0/9) and (thumbnail_edit is null or thumbnail_id is not null)
);
alter table public.files add column purged_at timestamptz;
create index files_pending_cleanup on public.files(deleted_at,id) where purged_at is null;

-- One team, small photo batches: serialize file linking and retirement before content locks.
create or replace function private.lock_files(groups jsonb) returns void language plpgsql set search_path='' as $$
declare file_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('hummunication.photos'),0);
  for file_id in select distinct (g->>'photoId')::uuid from jsonb_array_elements(groups) g where g->>'photoId' is not null order by 1 loop
    perform id from public.files where id=file_id and deleted_at is null for update;
    if not found then raise exception using errcode='23503', message='Photo is unavailable'; end if;
  end loop;
end $$;
create or replace function public.save_sermon(p_id uuid default null,p_values jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_user(); current_row public.sermon%rowtype; result_id uuid; file_id uuid; edit jsonb;
begin
  if p_values is null or jsonb_typeof(p_values)<>'object' or p_values-array['date','speaker','title','bible','content','thumbnailId','thumbnailEdit']<>'{}'::jsonb
    or jsonb_typeof(p_values->'speaker') is distinct from 'string' or private.text_length(p_values->>'speaker')>100
    or jsonb_typeof(p_values->'title') is distinct from 'string' or private.text_length(p_values->>'title')>200
    or jsonb_typeof(p_values->'bible') is distinct from 'string' or private.text_length(p_values->>'bible')>200
    or not private.valid_document(p_values->'content') or not private.valid_photo_edit(p_values->'thumbnailEdit',16.0/9) then
    raise exception using errcode='22023', message='Invalid sermon';
  end if;
  perform private.lock_files(jsonb_build_array(jsonb_build_object('photoId',p_values->>'thumbnailId')));
  if p_id is not null then
    select * into current_row from public.sermon where id=p_id for update;
    if not found or current_row.deleted_at is not null then raise exception using errcode='P0002', message='Not found'; end if;
  end if;
  file_id:=case when p_values ? 'thumbnailId' then (p_values->>'thumbnailId')::uuid else current_row.thumbnail_id end;
  edit:=case when p_values ? 'thumbnailEdit' then nullif(p_values->'thumbnailEdit','null'::jsonb) when file_id is not distinct from current_row.thumbnail_id then current_row.thumbnail_edit end;
  if file_id is null and edit is not null then raise exception using errcode='22023', message='Photo is required'; end if;
  if p_id is null then
    insert into public.sermon(date,speaker,title,bible,content,thumbnail_id,thumbnail_edit,updated_by)
    values(nullif(p_values->>'date','')::date,p_values->>'speaker',p_values->>'title',p_values->>'bible',p_values->'content',file_id,edit,actor) returning id into result_id;
  else
    update public.sermon set date=nullif(p_values->>'date','')::date,speaker=p_values->>'speaker',title=p_values->>'title',bible=p_values->>'bible',content=p_values->'content',thumbnail_id=file_id,thumbnail_edit=edit,updated_by=actor,updated_at=now() where id=p_id returning id into result_id;
  end if;
  return result_id;
end $$;
create function private.retire_replaced_photo() returns trigger language plpgsql security definer set search_path='' as $$
declare old_id uuid:=(to_jsonb(old)->>tg_argv[0])::uuid;
begin
  if old_id is not null then
    perform pg_advisory_xact_lock(hashtext('hummunication.photos'),0);
    update public.files f set deleted_at=now() where f.id=old_id and f.deleted_at is null
      and not exists(select 1 from public.family g where g.photo_id=f.id)
      and not exists(select 1 from public.sermon s where s.thumbnail_id=f.id);
  end if;
  return null;
end $$;
-- Check after the entire transaction, so swapping/reusing photos across rows remains valid.
create constraint trigger family_retire_photo after update on public.family deferrable initially deferred for each row
  when (old.photo_id is distinct from new.photo_id) execute function private.retire_replaced_photo('photo_id');
create constraint trigger sermon_retire_photo after update on public.sermon deferrable initially deferred for each row
  when (old.thumbnail_id is distinct from new.thumbnail_id) execute function private.retire_replaced_photo('thumbnail_id');

create function public.claim_photo_cleanup() returns table(id uuid,path text) language plpgsql security definer set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtext('hummunication.photos'),0);
  -- Only the new app-owned namespace is eligible for unregistered-upload recovery.
  insert into public.files(path,created_at,deleted_at)
  select o.name,o.created_at,o.created_at from storage.objects o
    where o.bucket_id='uploads' and o.created_at<now()-interval '24 hours'
      and o.name ~ '^[0-9a-f-]{36}/photos/[0-9a-f-]{36}\.(png|jpg|webp)$'
      and not exists(select 1 from public.files f where f.path=o.name)
    on conflict on constraint files_path_key do nothing;
  update public.files f set deleted_at=f.created_at where f.deleted_at is null and f.created_at<now()-interval '24 hours'
    and not exists(select 1 from public.family g where g.photo_id=f.id)
    and not exists(select 1 from public.sermon s where s.thumbnail_id=f.id);
  return query select f.id,f.path from public.files f
    where f.deleted_at<now()-interval '24 hours' and f.purged_at is null
      and not exists(select 1 from public.family g where g.photo_id=f.id)
      and not exists(select 1 from public.sermon s where s.thumbnail_id=f.id)
    order by f.deleted_at,f.id limit 100;
end $$;
create function public.finish_photo_cleanup(p_ids uuid[]) returns void language sql security definer set search_path='' as $$
  update public.files f set purged_at=now() where f.id=any(p_ids) and f.deleted_at<now()-interval '24 hours' and f.purged_at is null
    and not exists(select 1 from public.family g where g.photo_id=f.id)
    and not exists(select 1 from public.sermon s where s.thumbnail_id=f.id)
$$;
revoke all on function private.valid_photo_edit(jsonb,numeric),private.retire_replaced_photo() from public,anon,authenticated;
revoke all on function public.claim_photo_cleanup(),public.finish_photo_cleanup(uuid[]) from public,anon,authenticated;
grant usage on schema public to service_role;
grant execute on function public.claim_photo_cleanup(),public.finish_photo_cleanup(uuid[]) to service_role;
