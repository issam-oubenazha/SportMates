create table if not exists public.racket_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sport text not null check (sport in ('Tennis', 'Padel')),
  opponent_name text not null check (char_length(btrim(opponent_name)) between 1 and 100),
  played_on date not null default current_date,
  duration_minutes integer not null check (duration_minutes between 1 and 720),
  best_of smallint not null check (best_of in (3, 5)),
  created_at timestamptz not null default now()
);

create table if not exists public.racket_match_sets (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.racket_matches(id) on delete cascade,
  set_number smallint not null check (set_number between 1 and 5),
  player_games smallint not null check (player_games between 0 and 99),
  opponent_games smallint not null check (opponent_games between 0 and 99),
  is_match_tiebreak boolean not null default false,
  unique (match_id, set_number),
  check (player_games <> opponent_games)
);

create index if not exists racket_matches_user_played_on_idx
  on public.racket_matches (user_id, played_on desc);

create index if not exists racket_match_sets_match_id_idx
  on public.racket_match_sets (match_id, set_number);

alter table public.racket_matches enable row level security;
alter table public.racket_match_sets enable row level security;

revoke all on public.racket_matches from public, anon, authenticated;
revoke all on public.racket_match_sets from public, anon, authenticated;
grant select, delete on public.racket_matches to authenticated;
grant select on public.racket_match_sets to authenticated;

drop policy if exists "Users can view their own racket matches"
  on public.racket_matches;
create policy "Users can view their own racket matches"
  on public.racket_matches for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their own racket matches"
  on public.racket_matches;
create policy "Users can delete their own racket matches"
  on public.racket_matches for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can view sets for their own racket matches"
  on public.racket_match_sets;
create policy "Users can view sets for their own racket matches"
  on public.racket_match_sets for select to authenticated
  using (
    exists (
      select 1
      from public.racket_matches as rm
      where rm.id = racket_match_sets.match_id
        and rm.user_id = (select auth.uid())
    )
  );

create or replace function public.save_racket_match(
  p_sport text,
  p_opponent_name text,
  p_played_on date,
  p_duration_minutes integer,
  p_best_of integer,
  p_sets jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_match_id uuid;
  v_target_wins integer;
  v_player_sets integer;
  v_opponent_sets integer;
  v_previous_player_sets integer;
  v_previous_opponent_sets integer;
  v_set_count integer;
begin
  if v_user_id is null then
    raise exception 'Connecte-toi pour enregistrer un match.'
      using errcode = '42501';
  end if;

  if p_sport is null or p_sport not in ('Tennis', 'Padel') then
    raise exception 'Le sport doit être Tennis ou Padel.';
  end if;

  if p_opponent_name is null
     or char_length(btrim(p_opponent_name)) not between 1 and 100 then
    raise exception 'Le nom de l’adversaire doit contenir entre 1 et 100 caractères.';
  end if;

  if p_played_on is null or p_played_on > current_date then
    raise exception 'La date du match est invalide.';
  end if;

  if p_duration_minutes is null or p_duration_minutes not between 1 and 720 then
    raise exception 'La durée doit être comprise entre 1 et 720 minutes.';
  end if;

  if p_best_of is null or p_best_of not in (3, 5) then
    raise exception 'Le format doit être en 3 ou 5 sets.';
  end if;

  if jsonb_typeof(p_sets) is distinct from 'array' then
    raise exception 'Les scores des sets sont invalides.';
  end if;

  v_set_count := jsonb_array_length(p_sets);
  if v_set_count < 2 or v_set_count > p_best_of then
    raise exception 'Le nombre de sets ne correspond pas au format du match.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_sets) with ordinality as score(value, position)
    where jsonb_typeof(score.value -> 'player_games') is distinct from 'number'
       or jsonb_typeof(score.value -> 'opponent_games') is distinct from 'number'
       or case
         when score.value ->> 'player_games' ~ '^\d{1,2}$'
          and score.value ->> 'opponent_games' ~ '^\d{1,2}$'
         then (score.value ->> 'player_games')::integer not between 0 and 99
           or (score.value ->> 'opponent_games')::integer not between 0 and 99
           or (score.value ->> 'player_games')::integer
             = (score.value ->> 'opponent_games')::integer
         else true
       end
       or case
         when jsonb_typeof(score.value -> 'is_match_tiebreak') = 'boolean'
         then (score.value ->> 'is_match_tiebreak')::boolean
           and score.position <> v_set_count
         else true
       end
  ) then
    raise exception 'Un ou plusieurs scores de set sont invalides.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_sets) with ordinality as score(value, position)
    where case
      when (score.value ->> 'is_match_tiebreak')::boolean then
        greatest(
          (score.value ->> 'player_games')::integer,
          (score.value ->> 'opponent_games')::integer
        ) < 10
        or abs(
          (score.value ->> 'player_games')::integer
          - (score.value ->> 'opponent_games')::integer
        ) < 2
      else
        greatest(
          (score.value ->> 'player_games')::integer,
          (score.value ->> 'opponent_games')::integer
        ) < 6
        or (
          abs(
            (score.value ->> 'player_games')::integer
            - (score.value ->> 'opponent_games')::integer
          ) < 2
          and not (
            greatest(
              (score.value ->> 'player_games')::integer,
              (score.value ->> 'opponent_games')::integer
            ) = 7
            and least(
              (score.value ->> 'player_games')::integer,
              (score.value ->> 'opponent_games')::integer
            ) = 6
          )
        )
    end
  ) then
    raise exception 'Les scores doivent représenter des sets terminés.';
  end if;

  v_target_wins := (p_best_of / 2) + 1;
  select
    (count(*) filter (
      where (score.value ->> 'player_games')::integer
        > (score.value ->> 'opponent_games')::integer
    ))::integer,
    (count(*) filter (
      where (score.value ->> 'player_games')::integer
        < (score.value ->> 'opponent_games')::integer
    ))::integer
  into v_player_sets, v_opponent_sets
  from jsonb_array_elements(p_sets) as score(value);

  if greatest(v_player_sets, v_opponent_sets) <> v_target_wins
     or least(v_player_sets, v_opponent_sets) >= v_target_wins then
    raise exception 'Le score ne désigne pas un vainqueur pour ce format.';
  end if;

  select
    (count(*) filter (
      where (score.value ->> 'player_games')::integer
        > (score.value ->> 'opponent_games')::integer
    ))::integer,
    (count(*) filter (
      where (score.value ->> 'player_games')::integer
        < (score.value ->> 'opponent_games')::integer
    ))::integer
  into v_previous_player_sets, v_previous_opponent_sets
  from jsonb_array_elements(p_sets) with ordinality as score(value, position)
  where score.position < v_set_count;

  if v_previous_player_sets >= v_target_wins
     or v_previous_opponent_sets >= v_target_wins then
    raise exception 'Le match contient des sets après la victoire.';
  end if;

  insert into public.racket_matches (
    user_id,
    sport,
    opponent_name,
    played_on,
    duration_minutes,
    best_of
  )
  values (
    v_user_id,
    p_sport,
    btrim(p_opponent_name),
    p_played_on,
    p_duration_minutes,
    p_best_of::smallint
  )
  returning id into v_match_id;

  insert into public.racket_match_sets (
    match_id,
    set_number,
    player_games,
    opponent_games,
    is_match_tiebreak
  )
  select
    v_match_id,
    score.position::smallint,
    (score.value ->> 'player_games')::smallint,
    (score.value ->> 'opponent_games')::smallint,
    (score.value ->> 'is_match_tiebreak')::boolean
  from jsonb_array_elements(p_sets) with ordinality as score(value, position);

  return v_match_id;
end;
$$;

revoke all on function public.save_racket_match(text, text, date, integer, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_racket_match(text, text, date, integer, integer, jsonb)
  to authenticated;

create or replace function public.get_racket_match_stats(
  p_sport text default null,
  p_from date default null,
  p_to date default null
)
returns table (
  matches_played bigint,
  wins bigint,
  losses bigint,
  sets_won bigint,
  sets_lost bigint,
  games_won bigint,
  games_lost bigint,
  minutes_played bigint
)
language sql
stable
security invoker
set search_path = pg_catalog, public
as $$
  with match_totals as (
    select
      rm.id,
      rm.duration_minutes,
      count(*) filter (where scores.player_games > scores.opponent_games) as sets_won,
      count(*) filter (where scores.player_games < scores.opponent_games) as sets_lost,
      coalesce(sum(scores.player_games) filter (
        where not scores.is_match_tiebreak
      ), 0) as games_won,
      coalesce(sum(scores.opponent_games) filter (
        where not scores.is_match_tiebreak
      ), 0) as games_lost
    from public.racket_matches as rm
    left join public.racket_match_sets as scores on scores.match_id = rm.id
    where rm.user_id = (select auth.uid())
      and (p_sport is null or rm.sport = p_sport)
      and (p_from is null or rm.played_on >= p_from)
      and (p_to is null or rm.played_on <= p_to)
    group by rm.id
  )
  select
    count(*)::bigint as matches_played,
    count(*) filter (where match_totals.sets_won > match_totals.sets_lost)::bigint as wins,
    count(*) filter (where match_totals.sets_won < match_totals.sets_lost)::bigint as losses,
    coalesce(sum(match_totals.sets_won), 0)::bigint as sets_won,
    coalesce(sum(match_totals.sets_lost), 0)::bigint as sets_lost,
    coalesce(sum(match_totals.games_won), 0)::bigint as games_won,
    coalesce(sum(match_totals.games_lost), 0)::bigint as games_lost,
    coalesce(sum(match_totals.duration_minutes), 0)::bigint as minutes_played
  from match_totals;
$$;

revoke all on function public.get_racket_match_stats(text, date, date)
  from public, anon;
grant execute on function public.get_racket_match_stats(text, date, date)
  to authenticated;
