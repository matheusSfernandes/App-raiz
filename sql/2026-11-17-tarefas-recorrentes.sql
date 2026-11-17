-- Raiz: tarefas recorrentes (já aplicado pelo conector do Supabase em 17/11/2026; guardado aqui como registro)
create table if not exists public.recurring_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  category text default 'Geral',
  priority text default 'none',
  start_time text,
  end_time text,
  rule text not null check (rule in ('daily','weekly','monthly')),
  days_of_week int[],
  day_of_month int check (day_of_month between 1 and 31),
  start_date date not null,
  skip_dates date[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists recurring_tasks_user_idx on public.recurring_tasks(user_id);
alter table public.recurring_tasks enable row level security;
create policy recurring_tasks_own on public.recurring_tasks for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
alter table public.tasks add column if not exists recurring_id uuid references public.recurring_tasks(id) on delete set null;
create unique index if not exists tasks_recurring_date_uniq on public.tasks(recurring_id, date_key) where recurring_id is not null;
