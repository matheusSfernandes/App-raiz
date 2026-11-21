# Raiz: documentação, parte 1 de 3
## Arquitetura e banco de dados

Atualizada em 20/11/2026, a partir do código da branch main e do banco em produção. Cobre tudo até a Etapa 6 da checklist de melhorias.

Partes da documentação:
1. Arquitetura e banco de dados (este arquivo)
2. [Telas](2-telas.md)
3. [Design, deploy e manutenção](3-design-e-deploy.md)

---

## 1. Visão geral

O Raiz é um app pessoal de produtividade e autodesenvolvimento: hábitos, tarefas e rotina, metas com etapas, treino, finanças, diário com humor, histórico, conquistas e modo foco. É um PWA, ou seja, um site que pode ser instalado na tela inicial do celular e funciona como aplicativo, inclusive sem internet e com lembretes push.

| Item | Onde |
|---|---|
| App publicado | https://app-raiz.pages.dev |
| Código | GitHub, repositório `matheusSfernandes/App-raiz` |
| Banco, login e funções | Supabase, projeto `hjpbvfcmhuhhpwvlhewv` (plano gratuito) |
| Hospedagem | Cloudflare Pages, publica sozinho a cada envio para a main |

Cada pessoa cria a própria conta com e-mail e senha e só enxerga os próprios dados.

## 2. Tecnologias

| Camada | Tecnologia | Para quê |
|---|---|---|
| Interface | React 19 | Telas e componentes |
| Empacotamento | Vite 8 | Gera a pasta `dist` publicada |
| Dados e login | `@supabase/supabase-js` 2 | Conversa com o banco, login e funções |
| Backup | `xlsx` 0.18.5 | Gera a planilha de backup (carregado só quando usado) |
| Verificação | oxlint | Procura erros no código (`npm run lint`) |
| Servidor | Supabase (Postgres, Auth, Edge Functions, pg_cron, pg_net, Vault) | Banco, segurança, lembretes |

Não há servidor próprio. O navegador fala direto com o Supabase, e a segurança fica nas regras do banco (seção 6).

## 3. Estrutura do repositório

```
App-raiz/
├── raiz-react-source/          código do app (pasta base no Cloudflare)
│   ├── index.html              página única; carrega src/main.jsx
│   ├── package.json            dependências e comandos
│   ├── vite.config.js          configuração do Vite
│   ├── netlify.toml            sobra da hospedagem antiga (ver seção 10)
│   ├── public/                 arquivos copiados como estão
│   │   ├── sw.js               service worker (offline e push)
│   │   ├── manifest.json       dados do app instalável
│   │   └── icon*.png, icon.svg, apple-touch-icon.png, favicon-32.png
│   └── src/
│       ├── main.jsx            ponto de partida; aplica o tema
│       ├── App.jsx             login, navegação e moldura das telas
│       ├── index.css           todo o visual (cores, temas, componentes)
│       ├── context/
│       │   └── AppDataContext.jsx   dados centrais e funções de gravação
│       ├── lib/                regras e serviços sem tela (seção 4.3)
│       └── components/
│           ├── AuthScreen.jsx, ResetPasswordScreen.jsx
│           ├── Sidebar.jsx, TabBar.jsx, Toasts.jsx, OfflineBar.jsx
│           ├── JournalCard.jsx, WeeklyReview.jsx
│           ├── ui/Icons.jsx, ui/MoodFace.jsx
│           └── views/          uma tela por arquivo (parte 2)
├── sql/                        registro de cada mudança de banco (seção 9)
├── supabase/functions/send-reminders/index.ts   função dos lembretes push
├── .github/workflows/supabase-acordado.yml      evita a pausa do Supabase
├── registro/                   imagens de antes e depois de cada etapa
└── docs/                       esta documentação
```

## 4. Como o app funciona por dentro

### 4.1 Fluxo de abertura (`App.jsx`)

1. `main.jsx` aplica o tema salvo (claro, escuro ou automático) e monta o `App`.
2. `App` pergunta ao Supabase se há sessão. Sem internet, usa a sessão guardada no aparelho (`storedSession`), para o app abrir mesmo offline.
3. Sem sessão: mostra `AuthScreen` (entrar, criar conta, esqueci a senha). Vindo do link de redefinição de senha: mostra `ResetPasswordScreen`.
4. Com sessão: registra o service worker (`/sw.js`) e abre o `AppDataProvider` com a moldura (`AppShell`): menu lateral, saudação do dia, frase favorita, tela ativa, barra inferior, faixa de offline e avisos.
5. A tela ativa fica guardada no estado `view`. Um lembrete push pode abrir o app direto numa tela pelo endereço (`/?view=historico&tab=revisao`) ou por mensagem do service worker, se o app já estiver aberto.
6. Ao sair da conta, a cópia offline do aparelho é apagada (`clearOfflineData`).

### 4.2 Dados centrais (`context/AppDataContext.jsx`)

Guarda em memória o que várias telas usam e oferece as funções de gravação. Cada gravação chama `refreshAll`, que relê tudo do banco, então a tela sempre reflete o que foi salvo.

`refreshAll` faz, nesta ordem:
1. Cria as tarefas recorrentes de hoje que ainda não existem (`materializeRecurring`).
2. Lê perfil, hábitos, tarefas de hoje, todas as movimentações e as contas fixas, em paralelo.
3. Se o perfil não existe (primeiro acesso), cria um vazio.
4. Lê as subtarefas das tarefas de hoje.
5. Verifica sequências quebradas e aplica o congelamento (abaixo).
6. Recalcula hábitos flexíveis (sequência em semanas) e soma, para cada hábito, quantas vezes foi feito na semana e o progresso de hoje (hábitos por quantidade).

Funções oferecidas às telas:

| Grupo | Funções |
|---|---|
| Hábitos | `saveHabit`, `toggleHabit`, `setHabitDone` (qualquer data), `addHabitProgress`, `deleteHabit` |
| Tarefas | `saveTask`, `toggleTask`, `deleteTask`, `rescheduleTask` |
| Subtarefas | `addSubtask`, `toggleSubtask`, `deleteSubtask` |
| Finanças | `addTx`, `updateTx`, `deleteTx` |
| Contas fixas | `saveFixedBill`, `deleteFixedBill`, `payFixedBill` |
| Perfil | `saveProfile` |
| Geral | `showToast` (aviso rápido), `refreshAll` |

**Congelamento de sequência.** Ao abrir o app, para cada hábito de dias fixos que perdeu o último dia programado: se ainda houver congelamento no mês (2 por mês), o dia perdido é protegido, registrado em `profiles.freeze_log` no formato `AAAA-MM-DD|id_do_hábito`, e aparece o aviso "Sequência protegida com congelamento". Sem congelamento disponível, a sequência volta a zero. Hábitos flexíveis não usam congelamento.

**Sequência e último dia feito** (`streak` e `last_done` na tabela `habits`) são recalculados a partir do registro `habit_logs` sempre que um dia é marcado ou desmarcado (`recomputeHabitRow`). Sem internet esse recálculo espera; quando a fila offline termina de enviar, o app recalcula todos os hábitos (evento `raiz-synced`).

Telas com dados próprios (treino, metas, diário, tarefas de outras datas, histórico) leem direto do Supabase dentro do próprio componente, pelas funções de `lib/`.

### 4.3 Pasta `lib/`

| Arquivo | O que faz |
|---|---|
| `supabaseClient.js` | Cria o cliente `sb` do Supabase com a chave pública e liga a camada offline como forma de acesso à rede. Tem `storedSession()` para abrir sem internet |
| `offline.js` | Camada sem internet: cópia em IndexedDB e fila de gravações (seção 8) |
| `helpers.js` | Datas no horário local (`todayKey`, `dateToKey`, `formatKeyBR`), as 8 áreas da vida e suas cores, hábitos do dia (`todayHabits`), situação de uma tarefa (em andamento, atrasada, próxima, feita) |
| `habits.js` | Regras de hábitos: flexível ou de dias fixos, por quantidade, semana começando no domingo, sequência atual e maior sequência (em dias ou semanas), formatação de quantidade |
| `recurring.js` | Tarefas recorrentes: se uma regra cai numa data, texto da regra ("Dias úteis", "Todo dia 5") e criação das tarefas do dia |
| `finance.js` | Categorias de gasto e de entrada, formato em reais, meses (navegar, nomes), totais do mês, gastos por categoria, situação das contas fixas (paga, atrasada, pendente) |
| `goals.js` | Metas: leitura com etapas, percentual concluído e texto do prazo ("faltam 12 dias", "atrasada há 3 dias") |
| `journal.js` | Diário: os 5 humores (Péssimo a Ótimo), leitura por período e gravação de um dia |
| `push.js` | Lembretes push: verifica suporte, pede permissão, inscreve o aparelho, desliga e envia teste |
| `achievements.js` | As 30 conquistas, cores das 5 raridades, os 7 níveis e o cálculo de pontos |
| `backup.js` | Gera a planilha .xlsx com todos os dados da conta, uma aba por tabela |
| `effects.js` | Confete discreto (8 pontos na cor de destaque) e som curto ao concluir |
| `theme.js` | Tema claro, escuro ou automático, guardado no aparelho (`raiz_theme`) |

**Datas.** Todas as datas de calendário são texto `AAAA-MM-DD` no horário local do aparelho (`date_key`). Antes o app usava UTC, o que fazia o dia virar às 21h no Brasil; isso foi corrigido.

## 5. Banco de dados

Postgres do Supabase, esquema `public`. São 20 tabelas. Todas as tabelas de dados têm `user_id` ligado ao usuário do login (`auth.users`) com apagamento em cascata: se a conta for apagada, os dados vão junto.

### 5.1 Mapa das ligações

```
auth.users (login)
 ├── profiles                1 por pessoa
 ├── habits ─┬─ habit_logs        dias feitos
 │           └─ habit_progress    quantidade por dia
 ├── recurring_tasks ── tasks ── subtasks
 ├── fixed_bills ── transactions
 ├── goals ── goal_steps
 ├── workout_plans ─┬─ workout_plan_exercises
 │                  └─ workout_sessions ── workout_sets
 ├── journal_entries
 ├── push_subscriptions, push_log
 └── reminders (antiga, sem uso)
app_config (configuração geral, sem dono)
```

### 5.2 Perfil

**`profiles`**: uma linha por pessoa; `id` é o próprio id do login. Criada pelo app no primeiro acesso.

| Coluna | Tipo | Uso |
|---|---|---|
| `name`, `goal`, `quote` | texto | Nome, objetivo principal, frase favorita (aparece no topo) |
| `goal_label`, `goal_date` | texto, data | Meta em destaque com contagem regressiva no Início |
| `budget_limit` | número | Limite de gastos do mês (alerta em Finanças) |
| `freeze_log` | jsonb | Lista de congelamentos usados (`data|id_do_hábito`) |
| `notify_habits`, `notify_tasks`, `notify_review` | sim/não | Quais lembretes push a pessoa quer (padrão: todos) |
| `updated_at` | data e hora | Última alteração |

### 5.3 Hábitos

**`habits`**

| Coluna | Tipo | Uso |
|---|---|---|
| `name`, `category` | texto | Nome e área da vida (padrão Geral) |
| `time` | texto `HH:MM` | Horário; se preenchido, gera lembrete push |
| `days_of_week` | lista de inteiros | Dias programados, 0 = domingo (padrão: todos) |
| `weekly_target` | inteiro 1 a 7 | Se preenchido, o hábito é flexível: X vezes por semana |
| `target`, `unit` | número, texto | Se preenchido, o hábito é por quantidade (ex: 2000 ml) |
| `streak`, `last_done` | inteiro, data | Sequência atual e último dia feito (calculados) |
| `created_at` | data e hora | Dias antes da criação não contam |

**`habit_logs`**: um registro por hábito e dia feito (`habit_id`, `date_key`, único por par). É a fonte da verdade das sequências, do calendário e das conquistas.

**`habit_progress`**: quantidade acumulada por hábito e dia (`value`, único por `habit_id` + `date_key`). Ao atingir `target`, o app cria o registro em `habit_logs`; ao baixar de novo, remove.

### 5.4 Tarefas

**`tasks`**

| Coluna | Tipo | Uso |
|---|---|---|
| `title`, `notes`, `category` | texto | Título, notas e área da vida |
| `date_key` | data | Dia da tarefa (padrão: hoje). Vazio = tarefa "Sem data" |
| `start_time`, `end_time` | texto `HH:MM` | Horário; o início gera lembrete push |
| `priority` | texto | `alta`, `media`, `baixa` ou `none` |
| `flagged` | sim/não | Tarefa fixada |
| `done` | sim/não | Concluída |
| `recurring_id` | ligação | Regra recorrente que gerou a tarefa (fica vazio se a regra for apagada) |

Índice único `tasks_recurring_date_uniq` impede duas cópias da mesma recorrente no mesmo dia, mesmo com o app aberto em duas abas.

**`subtasks`**: itens de checklist de uma tarefa (`task_id`, `title`, `done`), apagados junto com a tarefa.

**`recurring_tasks`**: regras de repetição.

| Coluna | Uso |
|---|---|
| `title`, `notes`, `category`, `priority`, `start_time`, `end_time` | Copiados para cada tarefa gerada |
| `rule` | `daily` (todo dia), `weekly` (dias da semana) ou `monthly` (dia do mês) |
| `days_of_week` | Para `weekly` |
| `day_of_month` | Para `monthly`; dia 31 vira o último dia em meses curtos |
| `start_date` | A partir de quando vale |
| `skip_dates` | Datas puladas ("Apagar só esta") |
| `active` | Falso ao "Parar de repetir" |

As tarefas recorrentes são criadas como tarefas normais quando o dia é aberto (hoje ou uma data futura na Rotina), nunca para datas passadas.

### 5.5 Finanças

**`transactions`**: movimentações.

| Coluna | Uso |
|---|---|
| `description`, `amount` | Descrição e valor |
| `type` | `in` (entrada) ou `out` (saída) |
| `category` | Categoria (lista em `lib/finance.js`); vazia aparece como "Sem categoria" |
| `date_key` | Data da movimentação |
| `fixed_id` | Conta fixa que originou a movimentação, se houver |

**`fixed_bills`**: contas e receitas que se repetem todo mês.

| Coluna | Uso |
|---|---|
| `description`, `amount` (maior que zero), `type`, `category` | Dados da conta |
| `day_of_month` | Vencimento (31 vira o último dia em meses curtos) |
| `start_month` | `AAAA-MM`: vale a partir deste mês |
| `active` | Conta ativa |

Marcar uma conta como paga cria uma movimentação com `fixed_id`. A situação no mês (paga, atrasada ou pendente) é calculada procurando essa movimentação, sem coluna própria.

### 5.6 Metas

**`goals`**: `title`, `notes` (por que importa), `category`, `target_date` (prazo opcional), `done_at` (quando foi concluída).

**`goal_steps`**: etapas de uma meta: `goal_id`, `title`, `done`, `done_at`, `sort` (ordem). Apagadas junto com a meta. O percentual da meta é etapas feitas sobre o total; sem etapas, é 0 ou 100 conforme `done_at`.

A meta em destaque do Perfil (`profiles.goal_label` e `goal_date`) continua existindo, separada dessas metas.

### 5.7 Treino

| Tabela | Conteúdo |
|---|---|
| `workout_plans` | Modelos de treino (ex: Treino A) |
| `workout_plan_exercises` | Exercícios de cada modelo: `name`, `target_sets` (padrão 3), `target_reps` (padrão 10), `position` |
| `workout_sessions` | Cada treino feito: `plan_id`, `plan_name` (cópia do nome, mantida se o modelo for apagado), `date_key` (texto), `notes` |
| `workout_sets` | Cada série: `exercise_name`, `set_number`, `reps`, `weight` (kg) |

### 5.8 Diário

**`journal_entries`**: no máximo um registro por pessoa e dia (`user_id` + `date_key` único): `mood` de 1 (Péssimo) a 5 (Ótimo) e `note` (uma linha).

### 5.9 Lembretes push

| Tabela | Conteúdo |
|---|---|
| `push_subscriptions` | Um registro por aparelho inscrito: `endpoint` (único), chaves `p256dh` e `auth`, fuso `tz`, `user_agent` |
| `push_log` | Lembretes já enviados (`user_id` + `ref_key`), para não mandar duas vezes. Limpo após 30 dias |
| `app_config` | Configuração pública. Hoje guarda só `vapid_public`, a chave pública que o aparelho usa para se inscrever |

### 5.10 Tabela antiga

**`reminders`**: era da antiga aba Lembretes, que foi unida às Tarefas. O código atual não lê nem grava nela. Pode ser apagada no futuro, depois de conferir que não há dados úteis.

## 6. Segurança

- **Login:** Supabase Auth com e-mail e senha, incluindo redefinição de senha por e-mail.
- **Chave do app:** o código usa a chave pública (papel `anon`). Ela é feita para ficar no navegador e não dá acesso a dados sozinha.
- **RLS (segurança por linha):** ligada em todas as 20 tabelas. Cada tabela de dados tem uma regra do tipo "a pessoa logada só lê e grava linhas em que `user_id` é ela" (em `profiles`, a comparação é com `id`). Assim, mesmo com a chave pública, ninguém vê dados de outra pessoa.
- **Exceções:** `app_config` pode ser lida por todos (só tem a chave pública do push). `push_log` não tem regra de acesso para usuários: só a função de envio, com a chave de serviço, mexe nela.
- **Segredos:** ficam no Vault do Supabase, nunca no código: o segredo do agendamento (`raiz_cron_secret`) e as chaves VAPID do push (`raiz_vapid_keys`). As funções `raiz_get_secret` e `raiz_set_secret` só podem ser usadas pela chave de serviço.
- **Pendente (plano pago):** a proteção contra senhas vazadas do Supabase exige o plano Pro e fica para depois das primeiras vendas.

## 7. Lembretes push

Peças:

1. **No aparelho** (`lib/push.js`): em Perfil, "Lembretes no celular" pede permissão, busca a chave pública em `app_config`, inscreve o aparelho e grava em `push_subscriptions` (com o fuso horário). No iPhone, só funciona com o app instalado na tela inicial; o app avisa isso. No Brave, o push vem bloqueado por padrão e o app explica como liberar.
2. **Agendamento:** o `pg_cron` do banco roda o job `raiz-send-reminders` a cada minuto. Ele chama a função `send-reminders` pela extensão `pg_net`, mandando o segredo do agendamento no cabeçalho `x-cron-secret`.
3. **Função `send-reminders`** (Edge Function, código em `supabase/functions/send-reminders/index.ts`): confere o segredo; na primeira execução gera as chaves VAPID e guarda no Vault; para cada pessoa com aparelho inscrito, monta os avisos no fuso dela:
   - **Hábito:** hábito com horário, ainda não feito hoje e programado para hoje (flexível: enquanto a meta da semana não foi batida). Abre em Hábitos.
   - **Tarefa:** tarefa de hoje não concluída, com hora de início. Abre em Rotina.
   - **Revisão da semana:** domingo às 19h, com o resumo de tarefas feitas e pendentes da semana anterior. Abre o Histórico na aba Revisão da semana.
   Cada aviso tolera até 10 minutos de atraso do agendamento. Antes de enviar, grava a referência em `push_log`; se já existir, não envia de novo. Aparelhos que não existem mais são removidos.
4. **Teste:** "Enviar lembrete de teste" no Perfil chama a função com `?test=1` e o login da pessoa; ela envia "Lembretes funcionando neste aparelho." para os aparelhos dela.
5. **Na tela do celular** (`public/sw.js`): o service worker mostra a notificação e, ao tocar, abre ou foca o app na tela certa.

As preferências `notify_habits`, `notify_tasks` e `notify_review` do perfil desligam cada tipo de aviso.

Testado e funcionando no iPhone em 20/11/2026.

## 8. Funcionar sem internet

Duas partes trabalham juntas:

**Service worker v3 (`public/sw.js`)** cuida dos arquivos do app:
- Páginas: tenta a rede primeiro; sem internet, entrega a última versão guardada.
- Arquivos de `/assets`, ícones e a fonte Inter: guardados no aparelho na primeira vez e servidos de lá.
- A cada versão nova, apaga os arquivos antigos (cache `raiz-app-v3`).
- Os dados do Supabase não passam por ele.

**Camada de dados (`lib/offline.js`)** fica entre o cliente do Supabase e a rede, só para as chamadas de dados (`/rest/v1/`). Login e funções passam direto.
- **Com internet:** cada leitura bem-sucedida é guardada no IndexedDB do aparelho (banco `raiz-offline`), indexada pelo endereço exato da consulta.
- **Sem internet, leituras:** respondidas pela cópia guardada. Se uma consulta nunca foi feita antes, volta vazia.
- **Sem internet, gravações:** entram numa fila guardada no aparelho. Registros novos ganham `id` e `created_at` na hora, para a tela já mostrá-los. As gravações da fila são aplicadas por cima das leituras guardadas (incluir, alterar, apagar e "inserir ou atualizar"), então a tela já mostra o resultado.
- **Volta da internet:** a fila é enviada na ordem em que foi feita. Respostas de erro 4xx descartam aquele item para não travar a fila; sessão vencida (401) pausa até o login se renovar. Ao terminar, o app relê tudo e recalcula as sequências.
- **Enquanto houver fila:** novas gravações entram no fim dela, para manter a ordem.
- **Faixa de aviso** (`OfflineBar`): mostra "Sem internet · mostrando os últimos dados salvos", quantas alterações aguardam envio e quando está sincronizando.
- **Ao sair da conta:** a cópia e a fila são apagadas do aparelho.

Limitações conhecidas: o backup .xlsx, os lembretes push e o teste de push precisam de internet; telas nunca abertas com internet aparecem vazias offline; o recálculo de sequências espera a sincronização.

Situação: publicado em 20/11/2026, com 13 cenários da camada testados; teste no iPhone em modo avião aprovado em 21/11/2026.

## 9. Histórico das mudanças de banco

As tabelas base (`profiles`, `habits`, `habit_logs`, `tasks`, `subtasks`, `transactions`, `reminders`) foram criadas antes da pasta `sql/` existir, direto no editor SQL do Supabase. Desde a Etapa 1, cada mudança fica registrada:

| Arquivo | Etapa | O que muda |
|---|---|---|
| `2026-11-17-treino.sql` | 1 | 4 tabelas `workout_*`, índices e regras RLS |
| `2026-11-17-tarefas-recorrentes.sql` | 2 | `recurring_tasks`, `tasks.recurring_id` e índice único |
| `2026-11-17-habitos-metas.sql` | 3 | `habits.target`, `unit`, `weekly_target` e tabela `habit_progress` |
| `2026-11-19-financas.sql` | 4 | `fixed_bills`, `transactions.category` e `fixed_id` |
| `2026-11-19-lembretes-diario.sql` | 5 | Push (`push_subscriptions`, `push_log`, `app_config`, preferências no perfil), diário (`journal_entries`), funções do Vault e agendamento `pg_cron` |
| `2026-11-20-metas.sql` | 6 | `goals` e `goal_steps` |

A Etapa 6 "Funcionar sem internet" não mudou o banco.

## 10. Sobras e pontos de atenção

- **`reminders`:** tabela sem uso (seção 5.10).
- **`netlify.toml`:** sobra da época do Netlify. O Cloudflare Pages ignora o arquivo; pode ser removido.
- **`workout_sessions.date_key`** é texto, enquanto as outras tabelas usam o tipo data. Funciona, mas vale padronizar se a tabela for mexida.
- **`helpers.js`** ainda tem funções antigas sem efeito (`escapeHtml`, `uid`), herdadas da versão em HTML único.
- **Supabase gratuito** pausa após 7 dias sem uso; o GitHub Actions evita isso (parte 3).
