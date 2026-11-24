# B6: menos leituras a cada toque (24/11/2026)

Item B6 do teste com 3 personas (registro/testes-2026-11-24/RELATORIO.md).
Medido no app publicado (app-raiz.pages.dev), conta de teste, contando as requisições ao banco (/rest/v1/) de cada ação.

## Antes (versão anterior, commit 53c1ae2)

Cada gravação chamava `refreshAll`, que relia tudo. Na tela de Tarefas a própria tela ainda recarregava o dia.

| Ação | Requisições | Quais |
| --- | --- | --- |
| Concluir ou desmarcar tarefa (Tarefas) | 13 | PATCH tasks, recurring_tasks, profiles, habits, tasks, transactions, fixed_bills, subtasks, habit_logs, habit_progress, e de novo recurring_tasks, tasks, subtasks |
| Somar no hábito (sem concluir) | 11 | GET e POST habit_progress, recurring_tasks, profiles, habits, tasks, transactions, fixed_bills, subtasks, habit_logs, habit_progress |
| Somar que conclui o hábito | 14 | as 11 acima + POST habit_logs, GET habit_logs, PATCH habits |
| Zerar (desfaz o hábito) | 14 | idem, com DELETE habit_logs |

## Depois (commit 9bbfb89)

| Ação | Requisições | Quais |
| --- | --- | --- |
| Concluir ou desmarcar tarefa (Tarefas) | 1 | PATCH tasks |
| Somar no hábito (sem concluir) | 2 | GET e POST habit_progress |
| Somar que conclui o hábito | 5 | GET e POST habit_progress, POST habit_logs, GET habit_logs, PATCH habits |
| Zerar (desfaz o hábito) | 5 | GET e POST habit_progress, DELETE habit_logs, GET habit_logs, PATCH habits |

A tela mostrou o valor certo depois de cada ação (1.200, 1.700, 2.000, 0, 500 e 1.000 ml) e a tarefa alternou entre feita e pendente.

## Como ficou

- `src/context/AppDataContext.jsx`: `refreshAll` virou a soma de partes (tarefas, hábitos, movimentações, contas fixas). Cada ação atualiza só o item mexido na tela (concluir, apagar, fixar) ou relê só a sua parte (criar ou editar).
- Concluir um hábito: a releitura do registro daquele hábito, que já existia para calcular a sequência, também dá a contagem da semana.
- Sem internet: as leituras que sobraram usam as mesmas consultas de antes, então a cópia do aparelho (src/lib/offline.js) continua respondendo; concluir hábito sem internet segue pelo caminho antigo.
- Virada do dia com o app aberto: a próxima ação recarrega tudo (cria as recorrentes do novo dia e confere as sequências), como antes.
- `src/components/views/RotinaView.jsx`: a lista ajusta só a tarefa ou subtarefa mexida. "Apagar só esta" de uma recorrente ainda recarrega o dia, para não perder os dias pulados. Recorrente nova que cai hoje aparece no Início na hora.
