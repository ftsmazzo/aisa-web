# AISA — regras para quem altera o código

A fonte única das regras do projeto é este arquivo. A regra do Cursor em `.cursor/rules/projeto.mdc` só aponta para cá.

## O que este repositório é

Aplicação web da produção da fábrica. A regra de negócio a preservar é a do SIGPRO Kanban, descrita em `docs/PRD.md`, `docs/TRD.md`, `docs/FLUXO-APP.md`, `docs/ESQUEMA-BACKEND.md` e `docs/PLANO-IMPLEMENTACAO.md`.

Stack: TypeScript, Next.js (App Router), PostgreSQL com Drizzle quando o esquema entrar, Redis para fila e cache, worker Node, OpenRouter só para texto e proposta. A quantidade de estoque é a soma dos movimentos. O modelo de IA não grava estoque, card, plano de corte nem provisão.

## Arquitetura

- `app/` — telas e rotas HTTP. `GET /health` responde sem consultar banco.
- `worker/` — backup diário do PostgreSQL, retenção de 30 dias.
- `docs/` — decisões já fechadas. Mudança de escopo passa por esses documentos antes do código.
- O módulo de domínio da produção ainda não existe. Ele entra na fase 2, testado com o cenário da Mesa Industrial, e não mora dentro de componente visual.

## Segurança

- Repositório público. Segredo, `.env`, dump, foto real e chave do OpenRouter ficam fora do Git.
- Senha de usuário, quando existir, usa Argon2id. Cookie de sessão httpOnly.
- Perfil conferido no servidor em toda ação.
- Consulta ao banco parametrizada.
- Upload com tamanho e tipo conferidos, arquivo no volume, caminho no banco.
- Duas pessoas não podem consumir a mesma peça além do saldo: a transação trava as linhas antes de gravar o movimento.
- `GET /health` não devolve dado da fábrica.
- HTTPS no proxy do EasyPanel. Postgres e Redis sem porta pública.

## Fluxo de mudança

1. Issue no GitHub descrevendo o comportamento esperado e a fase do plano.
2. Branch a partir de `main`.
3. Pull request para `main`. A CI precisa passar: `npm run typecheck`, `npm run lint`, `npm run build`.
4. Merge só com a CI verde.
5. O EasyPanel publica a `main` sozinho. Confirmar `GET /health` no domínio depois do deploy.

Não há force push em `main`.

## Esteira de qualidade

- TypeScript estrito.
- Biome para formato e lint.
- Teste automatizado da Mesa Industrial quando a regra de produção existir. Até lá, a CI cobre tipo, lint e build.
- Erros de runtime: GlitchTip (template do EasyPanel, SDK compatível com Sentry), variável `SENTRY_DSN`. Sem DSN, a aplicação sobe e não envia erro para fora.
- Disponibilidade: Uptime Kuma (template do EasyPanel), monitor HTTP(s) em `/health`, 60 segundos, 1 ou 2 tentativas. Banco interno do Kuma: SQLite.

## O que não entra

Cliente, nota fiscal, várias fábricas, aplicativo de loja e integração com o sistema oficial de vendas. Banco de produção nasce vazio. A Mesa Industrial é só semente de desenvolvimento.
