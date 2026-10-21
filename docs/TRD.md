# TRD — AISA

> Technical Requirements Document — traduz o PRD em decisões técnicas.
> Fonte: [x] Entrevista com usuário  [x] Leitura de código existente (SIGPRO Kanban)
> Depende de: [PRD](PRD.md)

**Data**: 21/10/2026
**Responsável**: a definir (entrevista desta data; nome não informado)

## 1. Stack tecnológica

| Camada | Tecnologia | Motivo/restrição |
|---|---|---|
| Frontend | Next.js (App Router), React, TypeScript, interface em português | Aplicação web no computador e no celular. Leitor USB continua “digitando” o código e confirmando com Enter. Impressão de plano de corte e de etiqueta A4 sai pelo navegador. |
| Backend | Next.js no mesmo repositório, com a regra de negócio em um módulo de domínio separado do HTML | Uma pessoa mantém o código. A regra do SIGPRO fica testável sem a tela. A tela chama o domínio; o domínio não conhece componente visual. |
| Banco de dados | PostgreSQL, acesso por Drizzle | Pedido da entrevista. O saldo continua sendo a soma dos movimentos, com SQL explícito e índice por peça e etapa. |
| Fila e cache | Redis, com fila BullMQ | Backup diário e chamadas longas de IA saem do pedido do operador. Cache curto do painel. Limite de tentativas de login. O Redis não guarda saldo nem provisão. |
| Worker | Processo Node separado, mesma imagem, outro comando | Backup e IA longa não competem com o kanban. |
| Autenticação | Sessão em cookie httpOnly, senha com hash Argon2id, quatro perfis no servidor | O SIGPRO guarda senha em SHA-256 e tem um usuário só. A troca do hash e os perfis são requisito de segurança e do PRD. A regra de produção não muda. |
| IA | OpenRouter, API compatível com OpenAI | Vários modelos, para ajustar custo e confiabilidade sem trocar código. Chave e modelo são variáveis de ambiente. |
| Qualidade | TypeScript estrito, Biome, testes do domínio | Uma pessoa precisa ver regressão da regra antes de publicar. |
| Infra/Deploy | Docker no EasyPanel, repositório GitHub público | Pedido da entrevista. |

Fonte: entrevista (stack, OpenRouter, EasyPanel, uma pessoa) + código (forma do saldo, leitor, impressão).

Versões exatas de Next.js, Drizzle, BullMQ e Better Auth, ou biblioteca equivalente de sessão, ficam as estáveis no momento do scaffold. Better Auth é a sugestão para sessão e perfis em cima do Drizzle. Se no scaffold a biblioteca estável for outra com o mesmo comportamento, o TRD se atualiza numa linha, sem reabrir a arquitetura.

## 2. Integrações externas

| Integração | Finalidade | Observações |
|---|---|---|
| OpenRouter | Sugerir nests e repetições, explicar trava de card, explicar sugestão de estoque mínimo, ajudar CSV e roteiro, responder perguntas da produção | Base `https://openrouter.ai/api/v1`. Variáveis `OPENROUTER_API_KEY` e `OPENROUTER_MODEL`, criadas no EasyPanel. A chave é colada pelo responsável lá. Não entra no Git. Se o modelo falhar ou demorar, a tela mostra o texto que a regra já calculou. |
| Nenhuma de e-mail, pagamento, login social ou ERP | | O SIGPRO não tem essas integrações. O PRD deixa o sistema oficial de vendas de fora. |

O leitor de código de barras e a impressora não são integração de rede. O navegador recebe o código como teclado e a impressão usa o diálogo do sistema.

Fonte: entrevista (OpenRouter e ausência de ERP) + código (leitor e impressão).

### Como a IA fica eficiente

A conta e a decisão continuam no domínio. O modelo recebe um resumo e devolve texto ou uma proposta estruturada.

- Estoque mínimo: o número sai da mesma conta do SIGPRO (média diária de saídas × 15). O modelo só explica. A pessoa grava.
- Card travado: `pode_trabalhar` e `validar_card` já dizem a falta. O modelo reescreve em linguagem simples. Sem resposta do modelo, a frase da regra aparece do mesmo jeito.
- Nests na ordem: o domínio calcula cobertura da necessidade, chapa e repetição. O modelo pode ordenar e explicar as opções. A gravação é a criação de ordem do domínio, depois que a pessoa confirma.
- CSV e roteiro: o modelo propõe linhas e etapas. Nada é inserido antes da confirmação do gestor.
- Perguntas: o modelo só consulta leituras. Não há ferramenta de inserir movimento, finalizar card, finalizar plano de corte ou alterar provisão.
- Caminho quente do operador (ler etiqueta, iniciar, pausar, lançar quantidade) não espera o OpenRouter.
- Chamadas longas entram na fila Redis. Chamada curta de explicação tem tempo limite baixo e cai no texto da regra.

Fonte: entrevista (OpenRouter, vários modelos, chave no EasyPanel) + PRD (IA não grava) + código (onde a conta já existe).

## 3. Requisitos não-funcionais

- Performance: tela de kanban, leitura de etiqueta e lançamento de quantidade respondem sem chamada de IA. Meta de referência, sugestão e não número fechado na entrevista: página e ação de chão abaixo de 300 ms no servidor, fora a impressão. A explicação da IA pode chegar depois do texto da regra.
- Escalabilidade: dezenas de pessoas ao mesmo tempo numa fábrica. A aplicação não guarda sessão em arquivo local. Postgres e Redis são compartilhados. Dá para subir outra instância do app no mesmo banco quando o volume passar do primeiro servidor. Primeira instalação: uma instância do app e uma do worker.
- Segurança: HTTPS no proxy do EasyPanel. Cookie de sessão httpOnly, secure e SameSite. Perfil conferido no servidor em toda ação. Senha com Argon2id. Limite de login no Redis. Consultas parametrizadas pelo Drizzle. Upload de foto e CSV com tamanho máximo, tipo conferido e gravação em volume, fora do repositório. Segredo só em variável de ambiente.
- Concorrência: duas pessoas não podem consumir a mesma peça além do saldo. A transação da etapa, do corte e da ordem trava as linhas de estoque envolvidas (`SELECT … FOR UPDATE` ou equivalente) antes de baixar. A regra observada continua a do SIGPRO: quantidade maior que o disponível é recusada, com o motivo. O SQLite de um usuário só não exigia essa trava; vários usuários exigem.
- Compliance: nome e credencial de usuário são dado pessoal. Saída diária guarda peça, quantidade, data e observação, como no SIGPRO. Repositório público sem banco, sem foto real de produção e sem chave. Política formal de LGPD além disso: a definir.
- Disponibilidade: sem SLA numérico. Um servidor no EasyPanel. Backup diário do PostgreSQL, retenção de 30 dias, no mesmo espírito do backup diário do SIGPRO. Restauração é ação do gestor.
- Internacionalização: português do Brasil. Sem segundo idioma.

Fonte: entrevista (dezenas de usuários, um app, backup diário, uma pessoa) + código (backup de 30 dias, campos da saída) + decisão técnica de concorrência para cumprir o PRD com vários usuários.

## 4. Ambiente e deploy

- Onde roda: servidor próprio com EasyPanel, IP `46.62.130.249`. Não é serverless.
- Provedor: EasyPanel. Há mais de um painel conectado nesta conta de desenvolvimento. Qual painel corresponde a esse IP se confirma na hora de criar o projeto, antes de provisionar.
- Serviços separados, sem reaproveitar banco de outro projeto:
  1. PostgreSQL, imagem padrão do provedor.
  2. Redis.
  3. App web, build a partir do GitHub, deploy automático, domínio do provedor, `DATABASE_URL` e `REDIS_URL` no hostname interno.
  4. Worker, mesma imagem, comando da fila.
  5. Volume para fotos de peças e nests e para os arquivos de backup.
- Variáveis de IA, criadas no serviço quando a aplicação já sobe: `OPENROUTER_API_KEY` (o responsável cola a chave) e `OPENROUTER_MODEL` (troca de modelo sem mudar código).
- Saúde: rota `/health` para o proxy e para o monitor.
- CI no GitHub: checagem de tipos, Biome e testes do domínio em todo push. Deploy pelo EasyPanel quando a branch principal avança.
- Monitoramento, na hora do scaffold e com conta criada pelo responsável: erros no GlitchTip (ou equivalente self-hosted) e checagem de `/health` no Uptime Kuma em intervalo de 60 segundos. Até existir DSN, a aplicação sobe sem enviar erro para fora.

Fonte: entrevista (IP, GitHub público, Postgres no EasyPanel, chave de IA no painel) + skill de blueprint para o formato dos serviços. A confirmação do painel entre os MCPs ainda não foi feita.

## 5. Restrições herdadas

- Sistemas legados a integrar: nenhum. O SIGPRO é a especificação de comportamento, não um serviço que o AISA chama. A migração de um `sigpro_kanban.sqlite` existente, se for necessária, fica para o plano de implementação. Não há integração com o sistema oficial de vendas.
- Decisões técnicas já tomadas e não-negociáveis:
  - A regra portada é a de `logica.php` e do esquema em `db.php` do SIGPRO Kanban lido em 21/10/2026: movimentos, provisão, roteiro, composição, ordem, plano de corte, card, etiqueta, insumos, vendas e cronoanálise.
  - PostgreSQL no EasyPanel, Redis para fila e cache, OpenRouter para IA, um repositório, quatro perfis, cadastro pelo gestor, uma fábrica por instalação.
  - O modelo de IA não possui função de escrita.
  - Repositório GitHub público. Segredo e dado real ficam fora dele.

Diferenças de plataforma, aceitas porque não são regra de produção: arquivo SQLite vira PostgreSQL; janela Electron vira site; sessão em arquivo vira cookie; SHA-256 vira Argon2id; um login vira quatro perfis; cópia do arquivo SQLite vira backup do Postgres; trava de concorrência entra para vários usuários.

Fonte: entrevista + código.

## 6. Manutenção

- Quem mantém o código após o lançamento: uma pessoa, com o Cursor.
- Nível de complexidade aceitável: um repositório, quatro serviços no EasyPanel (Postgres, Redis, app, worker) e um módulo de domínio. Sem microsserviço por tela. Sem segundo framework. A complexidade que vale a pena é o teste da regra de estoque, corte e kanban.

Fonte: entrevista.

## 7. Mapa do domínio a portar

Referência de comportamento, para as fases de fluxo, interface e esquema. Nomes podem mudar de arquivo; o resultado observado permanece.

| Capacidade do SIGPRO | Onde está hoje | No AISA |
|---|---|---|
| Esquema e migração | `app/db.php` | Migrações Drizzle |
| Saldo, provisão, ordem, corte, card, etiqueta, insumos, vendas, inventário | `app/logica.php` | Módulo de domínio + transação no Postgres |
| Telas | PHP em `app/*.php` | Rotas Next.js, mesmas tarefas |
| Código de barras | `app/barcode.php` | Geração da etiqueta no servidor, leitura pelo teclado |
| Backup diário e restauração | `app/backup.php` | Job no worker e ação do gestor |
| Dados de exemplo da Mesa Industrial | `app/seed.php` | Seed de desenvolvimento, fora do banco de produção |
| Ícones de processo | `app/icones.php` | Mesma paleta Bootstrap Icons, arquivo local |

Fonte: leitura do código.
