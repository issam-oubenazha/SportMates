create or replace function public.enforce_activity_participant_capacity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_organizer_id uuid;
  v_max_participants integer;
  v_status text;
  v_participant_count integer;
begin
  if v_user_id is null or new.user_id is distinct from v_user_id then
    raise exception 'Une inscription doit utiliser le compte connecté.'
      using errcode = '42501';
  end if;

  select a.organizer_id, a.max_participants, a.status
    into v_organizer_id, v_max_participants, v_status
    from public.activities as a
   where a.id = new.activity_id
   for update;

  if not found then
    raise exception 'Cette activité est introuvable.';
  end if;

  if new.user_id = v_organizer_id then
    raise exception 'L’organisateur ne peut pas rejoindre sa propre activité.';
  end if;

  if v_status is distinct from 'open' then
    raise exception 'Cette activité n’est plus ouverte aux inscriptions.';
  end if;

  select count(*)::integer
    into v_participant_count
    from public.activity_participants as ap
   where ap.activity_id = new.activity_id
     and ap.user_id <> v_organizer_id;

  if v_participant_count + 1 >= v_max_participants then
    raise exception 'Cette activité est complète.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_activity_participant_capacity()
  from public, anon, authenticated;

drop trigger if exists activity_participants_capacity_guard
  on public.activity_participants;

create trigger activity_participants_capacity_guard
before insert on public.activity_participants
for each row execute function public.enforce_activity_participant_capacity();

grant insert on table public.activity_participants to authenticated;
