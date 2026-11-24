-- Etapa 7, Primeiro acesso guiado (24/11/2026)
-- Guarda no perfil se a pessoa já concluiu ou pulou o guia do Início, para ele não voltar em outro aparelho.
-- Contas que já têm hábito, tarefa ou movimentação ficam marcadas como concluídas (o guia não aparece para elas).
alter table public.profiles add column if not exists onboarding_done boolean not null default false;
update public.profiles p set onboarding_done = true
where exists (select 1 from public.habits h where h.user_id = p.id)
   or exists (select 1 from public.tasks t where t.user_id = p.id)
   or exists (select 1 from public.transactions x where x.user_id = p.id);
