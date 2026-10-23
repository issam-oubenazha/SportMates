create or replace function public.join_activity(p_activity_id uuid)
returns table (participant_count integer, already_joined boolean)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_organizer_id uuid;
  v_max_participants integer;
  v_status text;
  v_other_participant_count integer;
begin
  if v_user_id is null then
    raise exception 'Connectez-vous pour rejoindre cette activité.';
  end if;

  select a.organizer_id, a.max_participants, a.status
    into v_organizer_id, v_max_participants, v_status
    from public.activities as a
   where a.id = p_activity_id
   for update;

  if not found then
    raise exception 'Cette activité est introuvable.';
  end if;

  if v_organizer_id = v_user_id then
    raise exception 'Vous ne pouvez pas rejoindre votre propre activité.';
  end if;

  if v_status is distinct from 'open' then
    raise exception 'Cette activité n''est plus ouverte aux inscriptions.';
  end if;

  if exists (
    select 1
      from public.activity_participants as ap
     where ap.activity_id = p_activity_id
       and ap.user_id = v_user_id
  ) then
    select count(*)::integer
      into v_other_participant_count
      from public.activity_participants as ap
     where ap.activity_id = p_activity_id
       and ap.user_id <> v_organizer_id;

    return query select v_other_participant_count + 1, true;
    return;
  end if;

  select count(*)::integer
    into v_other_participant_count
    from public.activity_participants as ap
   where ap.activity_id = p_activity_id
     and ap.user_id <> v_organizer_id;

  if v_other_participant_count + 1 >= v_max_participants then
    raise exception 'Cette activité est complète.';
  end if;

  insert into public.activity_participants (activity_id, user_id)
  values (p_activity_id, v_user_id);

  return query select v_other_participant_count + 2, false;
end;
$$;

revoke all on function public.join_activity(uuid) from public, anon, authenticated;
grant execute on function public.join_activity(uuid) to authenticated;
revoke insert on table public.activity_participants from authenticated;
