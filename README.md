# AISA

Gestão da produção no navegador, com a mesma lógica do SIGPRO Kanban.

Os documentos de produto e de técnica estão em `docs/`.

## Rodar na máquina

```bash
npm ci
npm run dev
```

A aplicação abre em `http://localhost:3000`. A rota de saúde é `GET /health` e responde `{ "status": "ok" }`.

O worker de backup diário:

```bash
npm run worker
```

Ele usa `DATABASE_URL` e grava em `BACKUP_DIR` (padrão `/data/backups`). Sem banco, o processo continua no ar e registra que a cópia foi pulada.

## Variáveis

Copie `.env.example`. Não grave senha, banco nem chave de API no Git.

| Variável             | Uso                                        |
| -------------------- | ------------------------------------------ |
| `DATABASE_URL`       | PostgreSQL                                 |
| `REDIS_URL`          | Fila e cache, a partir da fase de produção |
| `OPENROUTER_API_KEY` | IA, só na fase 4. Colada no EasyPanel      |
| `OPENROUTER_MODEL`   | Modelo no OpenRouter                       |
| `BACKUP_DIR`         | Pasta dos dumps                            |

## Publicação

O servidor é o EasyPanel em `46.62.130.249`. A imagem Docker sobe o Next.js na porta 3000. O worker usa a mesma imagem com o comando `node worker/index.mjs`.

Erros: template GlitchTip do EasyPanel. Disponibilidade: template Uptime Kuma, monitor HTTP em `/health`, intervalo de 60 segundos. A primeira conta desses dois serviços é criada por quem opera o painel.
