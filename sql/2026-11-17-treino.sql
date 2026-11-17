-- Raiz: tabelas do Treino (rodar uma vez no Supabase > SQL Editor > New query > Run)
-- Pode rodar de novo sem problema: nada é apagado.

create table if not exists public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_plan_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.workout_plans(id) on delete cascade,
  name text not null,
  target_sets int not null default 3,
  target_reps int not null default 10,
  position int not null default 0
);

create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.workout_plans(id) on delete set null,
  plan_name text,
  date_key text not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_name text not null,
  set_number int not null,
  reps int,
  weight numeric,
  created_at timestamptz not null default now()
);

create index if not exists workout_plan_exercises_plan_idx on public.workout_plan_exercises(plan_id);
create index if not exists workout_sessions_user_date_idx on public.workout_sessions(user_id, date_key);
create index if not exists workout_sets_session_idx on public.workout_sets(session_id);

-- Cada pessoa só vê e mexe nos próprios dados
alter table public.workout_plans enable row level security;
alter table public.workout_plan_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sets enable row level security;

do $$
declare t text;
begin
  foreach t in array array['workout_plans','workout_plan_exercises','workout_sessions','workout_sets'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = t and policyname = t || '_own') then
      execute format(
        'create policy %I on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
        t || '_own', t);
    end if;
  end loop;
end $$;
