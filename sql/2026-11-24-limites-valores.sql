-- Etapa 7, testes de 24/11/2026 (A3): limites de valores também no banco.
-- O app já bloqueia antes de gravar; isto é uma segunda proteção.
-- NOT VALID: vale para gravações novas e não mexe nos registros antigos
-- (a conta de teste tem 2 movimentações de R$ 99.999.999.999).

alter table public.transactions
  add constraint transactions_amount_limite check (amount > 0 and amount <= 1000000) not valid;

alter table public.fixed_bills
  add constraint fixed_bills_amount_limite check (amount > 0 and amount <= 1000000) not valid;

alter table public.habits
  add constraint habits_target_limite check (target is null or (target > 0 and target <= 100000)) not valid;

alter table public.habit_progress
  add constraint habit_progress_value_limite check (value >= 0 and value <= 1000000) not valid;

alter table public.workout_plan_exercises
  add constraint workout_plan_exercises_limite check (target_sets between 1 and 100 and target_reps between 1 and 1000) not valid;

alter table public.workout_sets
  add constraint workout_sets_limite check ((reps is null or reps between 0 and 1000) and (weight is null or weight between 0 and 1000)) not valid;
