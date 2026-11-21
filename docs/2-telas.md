# Raiz: documentação, parte 2 de 3
## Telas

Atualizada em 20/11/2026, a partir do código da branch main. Cobre tudo até a Etapa 6.

Partes da documentação:
1. [Arquitetura e banco de dados](1-arquitetura-e-banco.md)
2. Telas (este arquivo)
3. [Design, deploy e manutenção](3-design-e-deploy.md)

---

## 1. Navegação

O app tem 10 telas, cada uma num arquivo de `src/components/views/`. A tela ativa é trocada sem recarregar a página.

| Ordem | Tela | Arquivo | Barra inferior |
|---|---|---|---|
| 1 | Início | `InicioView.jsx` | sim |
| 2 | Rotina | `RotinaView.jsx` | sim |
| 3 | Hábitos | `HabitosView.jsx` | sim |
| 4 | Metas | `MetasView.jsx` | não |
| 5 | Treino | `TreinoView.jsx` | não |
| 6 | Finanças | `FinancasView.jsx` | sim |
| 7 | Histórico | `HistoricoView.jsx` | sim |
| 8 | Conquistas | `ConquistasView.jsx` | não |
| 9 | Foco | `FocoView.jsx` | não |
| 10 | Perfil | `PerfilView.jsx` | sim |

- **Menu lateral (drawer)** (`Sidebar.jsx`): aberto pelo botão de três linhas no topo, em qualquer tamanho de tela. Lista todas as telas na ordem acima. Enquanto aberto, a página de trás não rola.
- **Barra inferior** (`TabBar.jsx`): no celular, atalho para as 6 telas principais. Some em telas com 900 px ou mais.
- **Topo de todas as telas:** dia da semana e data, saudação (Bom dia, Boa tarde, Boa noite) com o primeiro nome, frase favorita do Perfil e botão Sair (escondido no computador).
- A lista de telas e os ícones ficam em `ui/Icons.jsx` (`NAV_ITEMS`). Para incluir uma tela nova: criar o arquivo em `views/`, acrescentar em `NAV_ITEMS` e na lista de `App.jsx`.

## 2. Entrada no app

### Login e cadastro (`AuthScreen.jsx`)
Campos de e-mail e senha, com três modos: **Entrar**, **Criar conta** e **Esqueci minha senha** (manda e-mail de redefinição). Links trocam entre os modos.

### Nova senha (`ResetPasswordScreen.jsx`)
Aberta pelo link do e-mail. Pede a nova senha duas vezes; ao salvar, mostra "Senha alterada com sucesso!" e entra no app.

## 3. Início (`InicioView.jsx`)

Painel do dia, de cima para baixo:

1. **Meta em destaque:** nome e contagem de dias até a data definida no Perfil (só aparece se preenchida).
2. **Hoje:** anel com o percentual geral do dia e linhas de progresso de hábitos e tarefas.
3. **Números do dia:** hábitos feitos (ex: 3/5), tarefas feitas, maior sequência atual e saldo.
4. **Diário** (`JournalCard.jsx`): 5 rostinhos de humor e uma linha sobre o dia. Uma entrada por dia; pode ser alterada.
5. **Metas:** as 3 metas em aberto com prazo mais próximo, com barra de etapas e texto do prazo; "Ver todas" abre Metas.
6. **Áreas da vida:** percentual do dia por área (Geral, Trabalho, Saúde, Estudos, Finanças, Alimentação, Pessoal, Lazer), juntando hábitos e tarefas, cada área com sua cor.
7. **Resumo da semana:** percentual concluído (hábitos programados mais tarefas) nos últimos 7 dias, com a diferença em pontos para os 7 dias anteriores.

Tabelas: `profiles`, `habits`, `habit_logs`, `tasks`, `transactions`, `journal_entries`, `goals`, `goal_steps`.

## 4. Rotina (`RotinaView.jsx`)

Onde ficam as tarefas. Três modos no topo:

- **Por data:** navegação por dias (com atalho Hoje). Mostra a **Próxima tarefa** e a lista do dia, separada por situação: em andamento, atrasada, próxima e feita, conforme o horário.
- **Sem data:** tarefas sem dia definido (uma lista de coisas a fazer).
- **Recorrentes:** regras de repetição ativas, com o texto da regra (ex: "Dias úteis", "Todo dia 5") e a opção de parar de repetir.

**Criar ou editar tarefa** (+ Nova tarefa): título, notas, "Tem data definida" (data, hora de início e fim), repetição (não repete, todo dia, dias da semana, ou dia do mês), área, prioridade (alta, média, baixa ou nenhuma) e "Fixar esta tarefa".

**Ações em cada tarefa:** concluir (com confete e som), abrir **Subtarefas** (adicionar, marcar, apagar), **Editar**, **Mover/Reagendar** para outro dia e **Apagar**. Numa tarefa recorrente: **Apagar só esta** (a data entra em `skip_dates` da regra) ou **Parar de repetir**.

Ao abrir hoje ou um dia futuro, as tarefas recorrentes daquele dia são criadas automaticamente.

Tabelas: `tasks`, `subtasks`, `recurring_tasks`.

## 5. Hábitos (`HabitosView.jsx`)

**Lista "Meus hábitos":** todos os hábitos com sequência e o botão de marcar. Hábitos por quantidade mostram o progresso (ex: 1.200/2.000 ml). Tocar no nome abre a página do hábito.

**Criar ou editar** (+ Novo hábito):
- Nome, horário (gera lembrete push) e área.
- **Como medir:** "Só marcar feito" ou "Quantidade", com meta e unidade (ex: 2000 ml, 20 páginas).
- **Frequência:** "Dias fixos" (escolher os dias da semana) ou "Vezes por semana" (de 1 a 7). O flexível aparece todo dia até a meta da semana ser batida, e a sequência é contada em semanas.

**Registrar quantidade:** botões de valores rápidos (calculados a partir da meta), campo "Outro valor", Somar, Zerar. Ao bater a meta, o hábito é concluído no dia.

**Página do hábito:** sequência atual, maior sequência, taxa de cumprimento, vezes concluído, média por dia registrado (hábitos por quantidade) e mapa de calor dos últimos 4 meses, que mostra os dias de folga. Para marcar um dia passado, o caminho é o Histórico.

**Congelamento:** 2 por mês, aplicado sozinho quando um dia programado é perdido (detalhes na parte 1, seção 4.2).

Tabelas: `habits`, `habit_logs`, `habit_progress`, `profiles.freeze_log`.

## 6. Metas (`MetasView.jsx`)

Metas grandes divididas em etapas pequenas.

- **+ Nova meta:** título, "por que ela importa" (opcional), área, prazo opcional e etapas (uma por linha, pode deixar para depois).
- **Cartão de cada meta:** barra de progresso (etapas feitas sobre o total), prazo ("faltam 12 dias", "vence hoje", "atrasada há 3 dias", em vermelho quando atrasada) e a lista de etapas para marcar.
- **Etapas:** adicionar ("Nova etapa"), marcar, apagar. Quando todas ficam prontas, o app sugere concluir a meta.
- **Marcar meta como concluída:** grava a data de conclusão; a meta vai para a lista de concluídas (mais recentes primeiro) e sai do resumo do Início. "Reabrir meta" desfaz.
- **Ordem:** metas em aberto pelo prazo mais próximo; sem prazo ficam no fim.

A "Meta em destaque" do Perfil é outra coisa: uma única data com contagem regressiva no Início.

Tabelas: `goals`, `goal_steps`.

## 7. Treino (`TreinoView.jsx`)

Duas abas (Modelos e Histórico) e o modo de treino em andamento:

- **Modelos:** criar modelos de treino (ex: "Treino A, Peito e tríceps") com exercícios, séries e repetições. Em cada modelo, **Treinar** começa o treino.
- **Treinando agora:** uma lista por exercício com as séries do modelo; em cada série, repetições e carga (kg), marcando as feitas. "+ Série" acrescenta; Salvar grava (precisa de pelo menos uma série feita); Descartar cancela.
- **Histórico:** treinos feitos e, por exercício, o gráfico de **carga máxima por treino** (aparece a partir de dois treinos com o mesmo exercício).

Tabelas: `workout_plans`, `workout_plan_exercises`, `workout_sessions`, `workout_sets`.

## 8. Finanças (`FinancasView.jsx`)

Navegação por mês no topo e três abas:

**Resumo**
- Entradas, saídas e saldo do mês, mais o saldo atual geral.
- Alerta de orçamento: barra do gasto do mês contra o limite do Perfil, com aviso a partir de 80%.
- **Gastos por categoria:** gráfico com a parte de cada categoria; tocar numa categoria filtra as movimentações.
- **Contas do mês:** quantas contas já foram pagas e quais estão em aberto; "Ver todas" abre Contas fixas.
- **Últimos 6 meses:** gráfico de entradas e saídas, com a opção "Ver em tabela".

**Movimentações**
- Lista do mês, com filtro por categoria.
- **+ Novo registro:** descrição, valor, saída ou entrada, categoria e data. Cada movimentação pode ser editada ou apagada.

**Contas fixas**
- Contas a pagar e receitas fixas do mês, com vencimento e situação: paga, atrasada ou pendente.
- **+ Nova conta fixa:** nome, valor, dia do mês, tipo (conta a pagar ou receita fixa) e categoria. Vale a partir do mês em que foi criada.
- Marcar como paga cria a movimentação do mês ligada à conta.

Categorias de gasto: Moradia, Alimentação, Transporte, Saúde, Educação, Lazer, Compras, Contas e serviços, Outros. De entrada: Salário, Vendas e extras, Investimentos, Outros.

Tabelas: `transactions`, `fixed_bills`, `profiles.budget_limit`.

## 9. Histórico (`HistoricoView.jsx`)

Três abas:

- **Calendário:** mês em mapa de calor (de "Menos" a "Mais", pelo percentual de hábitos e tarefas do dia). Tocar num dia mostra os hábitos programados e as tarefas daquele dia, e permite **marcar ou desmarcar dias passados** ("Esqueceu de marcar?"). As sequências são recalculadas na hora.
- **Diário:** entradas do mês com rostinho de humor e a linha escrita; tocar abre o dia no calendário.
- **Revisão da semana** (`WeeklyReview.jsx`): semana de domingo a sábado, com setas para semanas anteriores. Mostra hábitos cumpridos, tarefas feitas, treinos e humor médio; lista do que **ficou para trás**, com "Trazer para hoje"; desempenho por hábito, do menos cumprido para o mais; quanto gastou e em qual categoria mais; e as linhas do diário. O lembrete de domingo às 19h abre aqui.

Tabelas: `habit_logs`, `tasks`, `journal_entries`, `transactions`, `workout_sessions`.

## 10. Conquistas (`ConquistasView.jsx`)

- **Nível:** 7 níveis por pontos: Iniciante (0), Aprendiz (100), Dedicado (250), Consistente (500), Avançado (900), Mestre (1500) e Lendário (2080), com barra até o próximo.
- **30 conquistas** em 5 raridades, cada uma com barra de progresso:

| Raridade | Pontos | Quantidade | Exemplos |
|---|---|---|---|
| Bronze | 10 | 8 | primeiro hábito, primeira tarefa, 3 dias seguidos, usar um congelamento |
| Prata | 25 | 6 | 7 dias seguidos, 5 hábitos, 20 tarefas, 30 dias de app |
| Ouro | 50 | 5 | 30 dias seguidos, 100 conclusões, 100 tarefas |
| Diamante | 100 | 6 | 100 dias seguidos, 500 conclusões, 180 dias de app |
| Lendário | 200 | 5 | 365 dias seguidos, 1000 conclusões, um ano de Raiz |

A lista completa e as regras ficam em `lib/achievements.js`. Tudo é calculado na hora a partir dos dados; não há tabela de conquistas.

## 11. Foco (`FocoView.jsx`)

Pomodoro: **Foco de 25 minutos** e **Pausa de 5 minutos**, com anel de tempo e os botões Começar, Pausar e Reiniciar. Ao terminar cada ciclo, mostra um aviso e toca o som. Não grava nada no banco.

## 12. Perfil (`PerfilView.jsx`)

- **Dados pessoais**, com modo ver e modo editar/salvar: nome, objetivo principal, frase favorita (aparece no topo de todas as telas), meta em destaque (nome e data) e orçamento mensal (limite de gastos).
- **Nível e conquistas:** resumo com atalho para Conquistas.
- **Aparência:** Claro, Escuro ou Automático (segue o celular ou computador).
- **Lembretes no celular:** liga ou desliga o push neste aparelho; escolhe os tipos (Hábitos, no horário de cada hábito; Tarefas, na hora de início; Revisão da semana, domingo às 19h); "Enviar lembrete de teste". No iPhone fora da tela inicial, explica que é preciso instalar o app primeiro.
- **Som ao concluir:** liga ou desliga o toque curto (guardado no aparelho).
- **Seus dados:** baixa a planilha .xlsx de backup com hábitos, tarefas, recorrentes, finanças, contas fixas, diário, metas e treinos (uma aba por tabela).

Tabelas: `profiles`, `push_subscriptions`; para conquistas e backup, lê as demais.

## 13. Elementos comuns

| Elemento | Arquivo | O que faz |
|---|---|---|
| Faixa sem internet | `OfflineBar.jsx` | Rodapé com "Sem internet · mostrando os últimos dados salvos", alterações aguardando envio e sincronização |
| Avisos | `Toasts.jsx` | Mensagens curtas que somem em cerca de 3 segundos |
| Confete e som | `lib/effects.js` | 8 pontinhos na cor de destaque e um toque baixo ao concluir; o confete respeita "reduzir movimento" do aparelho |
| Rostinhos de humor | `ui/MoodFace.jsx` | 5 rostos desenhados em traço, coloridos por humor, com textura de giz |
| Ícones e logo | `ui/Icons.jsx` | Ícones do menu, broto da logo e ícones de ação |
| Carregando | `App.jsx` | "Carregando seus dados..." na primeira leitura |
