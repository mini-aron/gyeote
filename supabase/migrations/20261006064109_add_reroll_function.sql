create or replace function public.reroll_counsel_song(
  p_id uuid,
  p_user_id uuid,
  p_new_song_id uuid
) returns boolean
language sql
set search_path = public
as $$
  with updated as (
    update counsel_records
    set previous_song_ids = case
          when song_id is null then previous_song_ids
          else array_append(previous_song_ids, song_id)
        end,
        song_id = p_new_song_id,
        updated_at = now()
    where id = p_id
      and user_id = p_user_id
      and cardinality(previous_song_ids) < 3
    returning 1
  )
  select exists (select 1 from updated);
$$;

revoke execute on function public.reroll_counsel_song(uuid, uuid, uuid) from public, anon, authenticated;
