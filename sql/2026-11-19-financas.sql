-- Raiz: Etapa 4, Finanças (já aplicado pelo conector do Supabase em 19/11/2026; guardado aqui como registro)
-- Contas fixas mensais (aluguel, internet, salário...) e categoria em cada movimentação.
create table if not exists public.fixed_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  amount numeric not null check (amount > 0),
  type text not null default 'out' check (type in ('in','out')),
  category text,
  day_of_month int not null check (day_of_month between 1 and 31),
  start_month text not null, -- 'AAAA-MM': a conta vale a partir deste mês
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists fixed_bills_user_idx on public.fixed_bills(user_id);
alter table public.fixed_bills enable row level security;
create policy fixed_bills_own on public.fixed_bills for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

alter table public.transactions add column if not exists category text;
-- Quando uma conta fixa é marcada como paga, vira uma movimentação ligada a ela
alter table public.transactions add column if not exists fixed_id uuid references public.fixed_bills(id) on delete set null;
create index if not exists transactions_fixed_idx on public.transactions(fixed_id) where fixed_id is not null;
