-- New template crops are 16:9; previously saved 119:71 edits remain readable.
create or replace function private.valid_family(entry jsonb) returns boolean language sql immutable set search_path='' as $$
  select entry is not null and jsonb_typeof(entry)='object'
    and entry-array['name','photo_id','photo_edit','leader_name','leader_answer','members']='{}'::jsonb
    and (private.valid_photo_edit(entry->'photo_edit',16.0/9) or private.valid_photo_edit(entry->'photo_edit',119.0/71))
    and (entry->'photo_edit' is null or entry->'photo_edit'='null'::jsonb or entry->>'photo_id' is not null)
    and private.valid_groups(jsonb_build_array(jsonb_build_object(
      'name',entry->'name','photoId',entry->'photo_id','photoEdit',null,
      'leader',jsonb_build_object('name',entry->'leader_name','answer',entry->'leader_answer'),'members',entry->'members')))
$$;
