-- Raiz: Etapa 5 (já aplicado pelo conector do Supabase em 19/11/2026; guardado aqui como registro)

-- 1) Lembretes push: inscrições de cada aparelho e registro do que já foi enviado
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  tz text not null default 'America/Sao_Paulo',
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Só a função de envio (service role) mexe aqui; evita mandar o mesmo lembrete duas vezes
create table if not exists public.push_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  ref_key text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, ref_key)
);
alter table public.push_log enable row level security;

-- O que a pessoa quer receber
alter table public.profiles add column if not exists notify_habits boolean not null default true;
alter table public.profiles add column if not exists notify_tasks boolean not null default true;
alter table public.profiles add column if not exists notify_review boolean not null default true;

-- 2) Diário rápido e humor: uma linha e um humor de 1 a 5 por dia
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date_key date not null,
  mood int check (mood between 1 and 5),
  note text,
  updated_at timestamptz not null default now(),
  unique (user_id, date_key)
);
alter table public.journal_entries enable row level security;
create policy journal_entries_own on public.journal_entries for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- 3) Segredos no Vault: nenhum valor secreto aparece neste arquivo nem no código.
-- O segredo do agendamento é gerado pelo próprio banco; as chaves VAPID são geradas
-- pela função send-reminders na primeira execução, e só a chave pública vai para app_config.
create table if not exists public.app_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;
create policy app_config_read on public.app_config for select to anon, authenticated using (true);

create or replace function public.raiz_get_secret(p_name text) returns text
language sql security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = p_name limit 1;
$$;
create or replace function public.raiz_set_secret(p_name text, p_value text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from vault.secrets where name = p_name;
  if v_id is null then perform vault.create_secret(p_value, p_name);
  else perform vault.update_secret(v_id, p_value); end if;
end; $$;
revoke all on function public.raiz_get_secret(text) from public, anon, authenticated;
revoke all on function public.raiz_set_secret(text, text) from public, anon, authenticated;
grant execute on function public.raiz_get_secret(text) to service_role;
grant execute on function public.raiz_set_secret(text, text) to service_role;

select vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'raiz_cron_secret')
where not exists (select 1 from vault.secrets where name = 'raiz_cron_secret');

-- 4) Agendamento: a cada minuto o banco chama a função send-reminders
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('raiz-send-reminders', '* * * * *', $$
  select net.http_post(
    url := 'https://hjpbvfcmhuhhpwvlhewv.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'raiz_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
$$);
