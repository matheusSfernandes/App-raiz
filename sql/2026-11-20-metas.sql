-- Raiz: metas com etapas (aplicado pelo conector do Supabase em 20/11/2026; guardado aqui como registro)
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  category text not null default 'Geral',
  target_date date,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists goals_user_idx on public.goals(user_id);
alter table public.goals enable row level security;
create policy goals_own on public.goals for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create table if not exists public.goal_steps (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  done boolean not null default false,
  done_at timestamptz,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists goal_steps_goal_idx on public.goal_steps(goal_id);
create index if not exists goal_steps_user_idx on public.goal_steps(user_id);
alter table public.goal_steps enable row level security;
create policy goal_steps_own on public.goal_steps for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
