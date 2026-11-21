# Raiz: documentação, parte 3 de 3
## Design, deploy e manutenção

Atualizada em 20/11/2026, a partir do código da branch main. Cobre tudo até a Etapa 6.

Partes da documentação:
1. [Arquitetura e banco de dados](1-arquitetura-e-banco.md)
2. [Telas](2-telas.md)
3. Design, deploy e manutenção (este arquivo)

---

## 1. Princípios de design

Definidos no redesign de 17/11/2026, que substituiu a estética escura e gamificada antiga:

- **Minimalista e moderno**, sem aspecto de joguinho colorido.
- **Uma cor de destaque** (verde-musgo) sobre fundos neutros; as outras cores só aparecem com significado (áreas da vida, humor, alertas).
- **Tema escolhido pela pessoa:** Claro, Escuro ou Automático.
- **Celebração discreta:** confete, som e conquistas continuam, mas pequenos e baixos.
- **Uma tela por vez**, também no computador, com o menu lateral deslizante em todos os tamanhos.
- **Respeito ao aparelho:** se a pessoa pediu para reduzir movimento, animações e confete são desligados.

## 2. Cores, temas e tipografia (`src/index.css`)

Todo o visual está em um único arquivo de estilos. As cores são variáveis (tokens) definidas no topo e trocadas pelo tema.

### 2.1 Tokens principais

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--bg` | `#F6F6F3` | `#111312` | Fundo da página |
| `--surface` | `#FFFFFF` | `#191B1A` | Cartões |
| `--surface-2` | `#EFEFEB` | `#222523` | Fundos secundários, botões |
| `--ink` | `#1B1C1A` | `#ECECE8` | Texto principal |
| `--ink-soft` | `#6A6C66` | `#A3A69F` | Texto secundário |
| `--ink-faint` | `#A2A49E` | `#6C6F69` | Rótulos e ícones inativos |
| `--line` | `#E4E4DF` | `#2A2D2B` | Bordas e divisórias |
| `--accent` | `#2F6B4F` | `#6BAE88` | Verde-musgo de destaque |
| `--danger` | `#C0452F` | `#E2715C` | Apagar, atrasado, acima do orçamento |
| `--warn` | `#B07A1C` | `#D8A84A` | Avisos (ex: 80% do orçamento) |
| `--info` | `#3A6EA5` | `#7FA8D6` | Informação |
| `--heat-0` a `--heat-4` | cinza a verde | cinza a verde | Mapas de calor (Histórico, hábitos) |

Também há versões suaves (`--accent-soft`, `--danger-soft`, `--warn-soft`) para fundos, `--shadow` (sombra leve no claro, nenhuma no escuro) e os raios de borda `--radius` (14 px) e `--radius-sm` (10 px).

### 2.2 Como o tema funciona

- `lib/theme.js` guarda a escolha no aparelho (`raiz_theme`: `auto`, `light` ou `dark`).
- Claro ou Escuro: coloca `data-theme="light"` ou `data-theme="dark"` na página.
- Automático: tira o atributo e o CSS segue o tema do sistema (`prefers-color-scheme`), mudando sozinho quando o celular troca.
- A cor da barra do navegador (`theme-color`) acompanha o tema.

### 2.3 Outras paletas

- **Áreas da vida** (`lib/helpers.js`): Geral `#8E918A`, Trabalho `#4F7CAC`, Saúde `#4E9A6E`, Estudos `#C08A2E`, Finanças `#3F8F8A`, Alimentação `#C46A45`, Pessoal `#8467B0`, Lazer `#B5656F`.
- **Raridades das conquistas** (`lib/achievements.js`): Bronze `#B07A4E`, Prata `#8A939E`, Ouro `#C49A2C`, Diamante `#3F8FA6`, Lendário `#8467B0`.
- **Humor** (classes `.mood-1` a `.mood-5`): de vermelho suave (Péssimo `#D06A5C`) passando por laranja e amarelo até verde (Ótimo `#4FA283`), com tons próprios para o tema escuro.

### 2.4 Tipografia

- Fonte **Inter** (pesos 400, 500, 600 e 700), carregada do Google Fonts e guardada pelo service worker para funcionar sem internet.
- Números de relógio e valores usam algarismos de largura fixa (`tabular-nums`) para não "pular".

### 2.5 Organização do CSS

O arquivo segue blocos comentados: tokens e temas, base, cartões e botões, formulários, anéis e gráficos, telas (Início, Rotina, Hábitos, Finanças, Histórico, Conquistas, Foco, Treino, Diário e humor, Revisão da semana, Metas), menu lateral, barra inferior e ajustes de computador. Componentes reutilizados: `.card`, `.btn` (com variação `ghost`), `.seg-btn` (abas internas), `.stat-card`, `.section-title`, `.empty` (estado vazio), `.notif-hint` (dica em texto pequeno).

## 3. Logo, ícones e rostinhos

- **Logo:** um broto verde-musgo, escolhido em 17/11/2026 (preferido às versões com a letra "r" e raízes). Está em `public/icon.svg` e no componente `LogoMark` de `ui/Icons.jsx`, usado no menu lateral e nas telas de login.
- **Ícones do app instalado:** `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (versão com margem para Android recortar), `apple-touch-icon.png` (iPhone) e `favicon-32.png` (aba do navegador).
- **Ícones da interface:** desenhados em traço, dentro de `ui/Icons.jsx`, sem biblioteca externa.
- **Rostinhos de humor** (`ui/MoodFace.jsx`): 5 rostos em SVG, da boca triste à sorridente. Nos botões do diário aparecem coloridos com a cor do humor e textura de giz (preenchimento granulado e borda levemente irregular, feitos com filtros SVG). Substituíram os emojis em 19 e 20/11/2026.

## 4. Celular e computador

- **Celular primeiro:** a área de conteúdo tem no máximo 480 px de largura, com barra inferior fixa e espaço para a área segura do iPhone (`safe-area-inset-bottom`).
- **A partir de 900 px:** some a barra inferior, o conteúdo fica centralizado com até 760 px e o botão Sair do topo é escondido (sair continua no menu lateral).
- **Campos com 16 px no celular:** abaixo de 900 px, todo `input`, `select` e `textarea` tem pelo menos 16 px. Isso é obrigatório: com menos, o iPhone dá zoom na tela ao tocar no campo.
- **Menu lateral:** ao abrir, trava a rolagem da página de trás e devolve a posição ao fechar.

## 5. PWA (app instalável)

- **`public/manifest.json`:** nome "Raiz", abre em tela cheia (`standalone`), cor de fundo `#F6F6F3` e os ícones.
- **`index.html`:** marcações para o iPhone (`apple-mobile-web-app-capable`, título "Raiz", ícone) e `viewport-fit=cover`.
- **`public/sw.js` (service worker v3):** guarda o app para abrir sem internet e mostra os lembretes push. Detalhes na parte 1, seções 7 e 8.
- **Instalar no iPhone:** abrir o site no Safari, tocar em Compartilhar, depois "Adicionar à Tela de Início". Os lembretes push no iPhone só funcionam com o app aberto por esse ícone.
- **Atualizar o service worker:** ao mudar a forma como ele guarda arquivos, trocar o nome do cache (`raiz-app-v3` para `v4`), para os aparelhos descartarem a versão antiga. Mudanças comuns no app não exigem isso: ele busca a página nova pela rede sempre que há internet.

## 6. Deploy

### 6.1 Como uma mudança chega ao app

1. O código é alterado a partir da versão atual da main no GitHub (`matheusSfernandes/App-raiz`).
2. O envio (commit) vai direto para a main.
3. O Cloudflare Pages percebe o envio, instala as dependências, roda `npm run build` e publica a pasta gerada.
4. Em cerca de 1 a 2 minutos a versão nova está em https://app-raiz.pages.dev.

### 6.2 Configuração no Cloudflare Pages

| Campo | Valor |
|---|---|
| Repositório | `matheusSfernandes/App-raiz`, branch `main` |
| Root directory (pasta base) | `raiz-react-source` |
| Build command | `npm run build` |
| Build output (pasta publicada) | `dist` |

O app usa uma página só; o Cloudflare Pages já entrega o `index.html` para qualquer endereço. O `netlify.toml` é sobra da hospedagem anterior e não tem efeito. O Netlify foi trocado pelo Cloudflare por causa dos limites de deploy do plano gratuito.

### 6.3 Rodar no computador (opcional)

Dentro de `raiz-react-source`: `npm install` uma vez, depois `npm run dev` para abrir uma versão de teste local, ou `npm run build` para conferir se a versão final gera sem erro. O app local usa o mesmo banco de produção.

### 6.4 Função de lembretes

A função `send-reminders` não é publicada pelo Cloudflare. Ela fica no Supabase (Edge Functions) e é publicada pelo conector do Supabase. A cópia do código fica em `supabase/functions/send-reminders/index.ts`; ao mudar, publicar no Supabase e atualizar a cópia no repositório.

## 7. Mudanças no banco

1. Conferir as tabelas atuais antes de mudar.
2. Aplicar a mudança pelo conector do Supabase, **antes** de publicar o código que depende dela.
3. Salvar o SQL em `sql/` com o nome `AAAA-MM-DD-assunto.sql` e um comentário dizendo quando foi aplicado.
4. Toda tabela nova com dados de usuário precisa de: coluna `user_id` ligada a `auth.users` com apagamento em cascata, RLS ligada e a regra "só a própria pessoa" (modelo nos arquivos de `sql/`).
5. Se a tabela nova deve ir para o backup, incluir em `TABLES` de `lib/backup.js`.
6. Segredos nunca vão para o SQL nem para o código: usar o Vault.

## 8. Manutenção

### 8.1 Supabase acordado
O plano gratuito pausa o projeto depois de 7 dias sem uso. O GitHub Actions `.github/workflows/supabase-acordado.yml` faz uma consulta leve no banco **às segundas e quintas, por volta das 9h de Brasília**. Se o banco não responder, a execução falha e o GitHub avisa por e-mail. Também pode ser rodado à mão em Actions, "Supabase acordado", "Run workflow".

Na prática, o agendamento dos lembretes (a cada minuto) também mantém o banco em uso.

### 8.2 Se o app não abrir
1. Abrir o painel do Supabase e ver se o projeto está pausado; se estiver, clicar em **Resume project** e esperar alguns minutos.
2. Ver no Cloudflare Pages se o último deploy falhou; se falhou, a versão anterior continua no ar.

### 8.3 Endereços dos e-mails de login
Em Supabase, Authentication, URL Configuration: **Site URL** `https://app-raiz.pages.dev` e, em **Redirect URLs**, `https://app-raiz.pages.dev/**`. Sem isso, os links de confirmação de cadastro e de "Esqueci minha senha" abrem `localhost` (corrigido em 21/11/2026). Ao trocar para um domínio próprio, atualizar os dois campos.

### 8.4 Backup
Em Perfil, "Seus dados" baixa uma planilha .xlsx com todas as tabelas da conta. Vale baixar antes de mudanças grandes no banco.

### 8.5 Avisos de segurança do Supabase
De tempos em tempos, conferir os avisos (advisors) do painel. O aviso de proteção contra senhas vazadas é conhecido e depende do plano Pro.

## 9. Fluxo de trabalho com o Claude

- **Checklist:** as melhorias seguem a planilha "Raiz: checklist de melhorias", aba Checklist, por etapas. Cada item tem situação (Concluído, Em andamento, Adiado).
- **A cada item:** partir do código atual do GitHub, aplicar o banco pelo conector, registrar o SQL, testar, publicar direto na main, conferir no app real e atualizar a checklist.
- **Registro de mudanças:** imagens de antes e depois de cada etapa em `registro/` (uma pasta por etapa, com `LEIAME.txt` quando há explicação).
- **Problemas visuais:** resolvidos com prints de tela.
- **Senhas:** o próprio Matheus digita quando for preciso entrar no app.
- **Textos:** sem travessão; usar vírgula, ponto, dois pontos ou ponto e vírgula.
- **Custos:** nada pago antes das primeiras vendas.

### Histórico das etapas

| Etapa | Data | Principais entregas |
|---|---|---|
| 0 | 17/11/2026 | Supabase retomado, ligação com GitHub e conector, redesign minimalista, tema, logo do broto |
| 1 | 17/11/2026 | Treino, backup .xlsx, GitHub Actions contra a pausa |
| 2 | 17/11/2026 | Marcar dias passados, tarefas recorrentes, data nas movimentações |
| 3 | 17/11/2026 | Hábitos por quantidade, X vezes por semana, página do hábito |
| 4 | 19/11/2026 | Finanças: categorias, contas fixas, resumo mensal e 6 meses |
| 5 | 19 e 20/11/2026 | Diário e humor, revisão da semana, lembretes push (testados no iPhone), rostinhos a giz |
| 6 | 20 e 21/11/2026 | Metas com etapas, funcionar sem internet (testado no iPhone em modo avião), esta documentação |

## 10. Pendências e futuro

- **Etapa 7, preparar para vender:** próximos passos da checklist.
- **Adiado por custo, só depois das primeiras vendas:** domínio próprio, Supabase Pro (com proteção contra senhas vazadas), registro no INPI, e-mail próprio (SMTP) para os e-mails de login, publicação nas lojas (Google Play e App Store).
- **Ideias em espera:** IA para reescrever e classificar notas por importância (Claude API e Cloudflare Workers).
- **Limpezas possíveis:** apagar a tabela `reminders` e o `netlify.toml`, padronizar `workout_sessions.date_key` como data (parte 1, seção 10).
- **Repositório público:** como o app será vendido, o recomendado é deixar o repositório App-raiz privado (GitHub, Settings, Change visibility). Não afeta o deploy nem o GitHub Actions.
