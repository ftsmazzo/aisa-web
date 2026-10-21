# Plano de Implementação — AISA

> Roteiro de execução.
> Depende de: [PRD](PRD.md), [TRD](TRD.md), [Fluxo do App](FLUXO-APP.md), [UI/UX](UIUX.md), [Esquema Backend](ESQUEMA-BACKEND.md)

**Data**: 21/10/2026
**Responsável**: a definir (entrevista desta data; nome não informado)

O escopo do PRD permanece: paridade com o SIGPRO e as cinco funções de IA. A entrega é fatiada. Uma pessoa mantém o repositório. Não há data de demo.

Fonte: entrevista (ordem, teste da Mesa, sem data) + documentos anteriores.

## 1. MVP

O produto gera valor quando a fábrica consegue abrir uma ordem, finalizar o corte e lançar etapa no kanban, no computador e no celular, com o mesmo saldo que o SIGPRO produziria. Isso são as fases 1 e 2. Estoque administrativo, saídas, cadastros completos e IA vêm em seguida e continuam no escopo.

O teste de aceite da regra é automatizado, no cenário da Mesa Industrial, contra quantidades esperadas tiradas do SIGPRO. O banco de produção não recebe esse seed.

## 2. Fases seguintes

| Fase | Escopo | Prioridade | Dependências |
|---|---|---|---|
| 1. Fundação | Repositório único, Next.js com `/health`, Docker, CI (tipos, Biome, teste mínimo), PostgreSQL, Redis, app e worker no EasyPanel, volume de arquivos, login, criação do primeiro gestor, papéis vazios de tela, backup diário do Postgres com retenção de 30 dias | Alta | Conta GitHub, painel EasyPanel do IP `46.62.130.249` confirmado entre os MCPs, `git` com nome e e-mail já configurados |
| 2. Regra da produção | Migrações do esquema de produção, módulo de domínio, telas de ordem, plano de corte e kanban, leitor, PWA mínimo para o operador instalar o kanban, teste automatizado da Mesa Industrial | Alta | Fase 1 |
| 3. Resto das telas | Estoque, inventário, matéria-prima, saídas, estoque mínimo, relatórios, etiquetas e impressão, cadastros, CSV, backup e senha pelo gestor, permissão recusando perfil errado | Média | Fase 2, porque essas telas leem o mesmo livro de movimentos |
| 4. IA | OpenRouter por variável de ambiente, cinco usos (nests, trava, mínimo, CSV, perguntas), `ia_registros`, falha do modelo caindo no texto da regra | Média | Fase 3 para o CSV e o mínimo terem tela. A chave `OPENROUTER_API_KEY` é colada pelo responsável no EasyPanel nesta fase |

Fonte: entrevista. O PWA do kanban entra na fase 2 porque o operador dessa fase já usa o celular. O polimento WCAG das telas da fase 3 acompanha cada tela, com a meta AA do UI/UX.

## 3. Marcos externos

- Data de lançamento/demo: a definir. O marco de cada fase é o critério da seção 4.
- Outras datas relevantes: nenhuma informada.
- Antes de provisionar o EasyPanel, confirmar qual dos painéis conectados é o servidor `46.62.130.249`.
- A chave do OpenRouter não bloqueia as fases 1 a 3.

Fonte: entrevista.

## 4. Critério de "pronto" por fase

- Fase 1: `GET /health` responde 200 no domínio do EasyPanel. O primeiro acesso cria o gestor e a tela some. O segundo acesso entra com senha. CI verde na branch principal. Repositório público sem `.env`, sem banco e sem chave. Backup diário gera arquivo no volume e a retenção descarta o que passar de 30 dias.
- Fase 2: o teste da Mesa Industrial passa sem divergência nos quatro marcos abaixo. O operador conclui uma etapa no celular instalado. O leitor, com o foco fora de um campo, abre o card.
  1. Abrir ordem da Mesa reserva primeiro o saldo da etapa mais adiantada e gera planos, cards e uma etiqueta por peça.
  2. Finalizar o plano entra a quantidade real no primeiro processo, baixa o card de corte e baixa a chapa do nest.
  3. Lançar etapa sem peça, sem filho da composição ou sem insumo recusa e informa a falta. O saldo não muda.
  4. Lançar quantidade válida grava consumo e produção, reserva o produzido para a ordem e libera o próximo card.
- Fase 3: cada jornada do fluxo, fora a IA, funciona com o perfil dono da tela. Outro perfil recebe recusa no servidor. Inventário grava só a diferença. Saída acima do pronto recusa. Impressão de etiqueta sai em A4 com 8 etiquetas de 105 × 74 mm.
- Fase 4: cada função de IA grava `ia_registros`. Aceitar a proposta chama `criar_op`, a gravação de mínimo ou a importação do domínio. Não existe ação de escrita exposta ao modelo. Com OpenRouter fora, a tela mostra a conta e o texto da regra e a produção segue.

Fonte: entrevista (teste da Mesa e ordem das fases) + regras de `logica.php`.

## 5. Fora deste plano

Cliente, nota, várias fábricas, aplicativo de loja e integração com o sistema oficial de vendas continuam fora, como no PRD. Migrar um `sigpro_kanban.sqlite` já em uso também fica fora: o banco de produção nasce vazio.
