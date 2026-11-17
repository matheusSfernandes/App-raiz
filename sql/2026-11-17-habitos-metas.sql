-- Raiz: metas numéricas e frequência flexível (aplicado pelo conector do Supabase em 17/11/2026; registro)
alter table public.habits add column if not exists target numeric check (target is null or target > 0);
alter table public.habits add column if not exists unit text;
alter table public.habits add column if not exists weekly_target int check (weekly_target is null or weekly_target between 1 and 7);
create table if not exists public.habit_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  date_key date not null,
  value numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (habit_id, date_key)
);
create index if not exists habit_progress_user_idx on public.habit_progress(user_id);
alter table public.habit_progress enable row level security;
create policy habit_progress_own on public.habit_progress for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
