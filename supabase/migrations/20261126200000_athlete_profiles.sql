create table if not exists public.athlete_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile_data jsonb not null default '{}'::jsonb
    check (jsonb_typeof(profile_data) = 'object'),
  current_step smallint not null default 0
    check (current_step between 0 and 16),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.athlete_profiles enable row level security;

revoke all on public.athlete_profiles from public, anon, authenticated;
grant select, insert, update on public.athlete_profiles to authenticated;

drop policy if exists "Users can view their own athlete profile"
  on public.athlete_profiles;
create policy "Users can view their own athlete profile"
  on public.athlete_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own athlete profile"
  on public.athlete_profiles;
create policy "Users can create their own athlete profile"
  on public.athlete_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own athlete profile"
  on public.athlete_profiles;
create policy "Users can update their own athlete profile"
  on public.athlete_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
