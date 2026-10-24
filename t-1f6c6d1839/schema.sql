-- Fitness tracker schema for Supabase.
-- Paste into Supabase -> SQL Editor -> New query -> Run.
-- Every table is locked with Row Level Security: a signed-in user can only
-- read/write their own rows, and anonymous visitors can read nothing.

create table if not exists public.daily_log (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day        date not null,
  weight_lb  numeric(5,1),
  calories   integer,
  protein_g  integer,
  steps      integer,
  sleep_h    numeric(3,1),
  meal_prep  boolean not null default false,
  notes      text,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table if not exists public.workouts (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day        date not null,
  session    text not null,          -- Upper A / Lower A / Upper B / Lower B / Other
  notes      text,
  created_at timestamptz not null default now()
);

create table if not exists public.lift_sets (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  workout_id bigint references public.workouts(id) on delete cascade,
  day        date not null,
  lift       text not null,          -- Bench, Squat, Deadlift, RDL, OHP, Row
  weight_lb  numeric(6,1) not null,
  reps       integer not null,
  created_at timestamptz not null default now()
);

create table if not exists public.body_log (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day        date not null,
  waist_in   numeric(4,1),
  notes      text,
  primary key (user_id, day)
);

alter table public.daily_log enable row level security;
alter table public.workouts  enable row level security;
alter table public.lift_sets enable row level security;
alter table public.body_log  enable row level security;

do $$
declare t text;
begin
  foreach t in array array['daily_log','workouts','lift_sets','body_log'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

revoke all on public.daily_log, public.workouts, public.lift_sets, public.body_log from anon;
