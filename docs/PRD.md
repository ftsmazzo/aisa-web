# PRD — AISA

> Product Requirements Document — o quê e por quê, não como.
> Fonte: [x] Entrevista com usuário  [x] Leitura de código existente (SIGPRO Kanban, pasta Versão Antiga)

**Data**: 21/10/2026
**Responsável**: a definir (entrevista desta data; nome não informado)

## 1. Resumo em uma frase

O AISA é o sistema web de gestão da produção da fábrica: ordens, kanban, planos de corte, estoque e etiquetas com a mesma lógica do SIGPRO, usado ao mesmo tempo por gestor, operador, almoxarife e administrativo, com IA que sugere e explica e com a pessoa confirmando antes de qualquer gravação.

Fonte: entrevista + código.

## 2. Problema e contexto

- Problema real que motiva o projeto: a produção já tem regra definida no SIGPRO Kanban (PHP, SQLite e janela Electron num único computador). Esse formato não atende vários usuários ao mesmo tempo, deixa o celular dependente de uma ponte na rede local e dificulta segurança, evolução e uso no dia a dia. A fábrica precisa da mesma lógica numa aplicação web que escale.
- Como é resolvido hoje: SIGPRO Kanban 1.0.0, aberto por `SIGPRO.bat` ou pelo navegador local. O banco inteiro é o arquivo `sigpro_kanban.sqlite`. O exemplo de fábrica carregado na primeira execução é a Mesa Industrial (peças de inox, nests de corte, insumos e estoque inicial). Saídas diárias não carregam dados de cliente; o código registra que isso fica no sistema oficial da empresa.
- Por que agora: transformar essa aplicação numa aplicação web padrão, com repositório público, hospedagem própria, vários usuários, segurança e usabilidade, e com IA para facilitar o uso. A lógica do programa permanece.

Fonte: entrevista (motivo e direção) + código (como funciona hoje).

## 3. Público-alvo

- Persona principal: gestor da produção. Abre ordem de produção, acompanha o painel, o estoque mínimo e os relatórios.
- Outros perfis de usuário relevantes:
  - Operador de chão: kanban, leitor de etiqueta e uso pelo celular.
  - Almoxarife: estoque, inventário e matéria-prima.
  - Administrativo: saídas diárias.
- Quem mantém os cadastros (componentes, produtos, nests, processos, importação e exportação CSV, backup e restauração): o gestor.

Fonte da responsabilidade de cadastro: entrevista.

Fonte: entrevista. O mapeamento de cada perfil para as telas do SIGPRO segue o texto escolhido na entrevista. O SIGPRO atual tem um único login.

## 4. Objetivos e métricas de sucesso

| Objetivo | Métrica | Meta |
|---|---|---|
| A produção roda no AISA com a mesma regra do SIGPRO | Resultado igual ao SIGPRO para o mesmo cenário (necessidade da ordem, reserva, corte, bloqueio de etapa, saldo por processo) | A definir. Sugestão, não decisão: o cenário da Mesa Industrial reproduzido sem divergência de saldo |
| Várias pessoas usam ao mesmo tempo | Sessões simultâneas de gestor, operador, almoxarife e administrativo, inclusive celular | A definir |
| O chão de fábrica registra a etapa com menos atrito | Etapa concluída por leitor ou pelo celular, com o bloqueio aparecendo antes do lançamento | A definir |
| A IA facilita e não decide no lugar da regra | Toda gravação de estoque, card, plano de corte e provisão passa pela regra do sistema; a IA só sugere ou explica | 100% das gravações. Meta de produto, vinda da premissa de não alterar a lógica |
| O gestor enxerga urgência de estoque | Itens abaixo do mínimo visíveis no painel, com pronto e previsto | A definir. A regra de nível (abaixo de 100% urgente, abaixo de 150% médio) vem do SIGPRO e permanece |

Fonte: entrevista (objetivos) + código (regra de nível e cenário da Mesa). Metas numéricas não foram informadas.

## 5. Escopo

### Dentro do escopo (MVP)

Paridade com o SIGPRO, sem mudar a regra:

- Painel da produção (ordens abertas, fila, paradas, itens abaixo do mínimo).
- Ordem de produção: explosão da necessidade, reserva do estoque livre da etapa mais adiantada para a menos, planos de corte e cards por etapa do roteiro.
- Plano de corte: impressão para o laser, quantidades reais, entrada no primeiro processo do roteiro, baixa da chapa do nest, sobra e excedente.
- Kanban: setup, produção, pausa com motivo, cronoanálise, bloqueio quando falta peça da etapa anterior, filho da composição ou insumo.
- Serviço avulso (puxar serviço) quando há peça livre na etapa anterior.
- Saídas diárias no último processo do roteiro, com estorno.
- Estoque mínimo, sugestão pela média de saídas e leitura “pronto” versus “previsto”.
- Estoque por etapa (físico, reservado, livre), lançamento manual e inventário por diferença.
- Matéria-prima e insumos (chapa, fixação, acabamento, embalagem e outros), consumo na etapa da peça.
- Etiquetas com código de barras, uma por peça da ordem, leitor em qualquer tela, sobra e excedente.
- Relatórios: inventário, cronoanálise, paradas, chapas, ordens e rastreabilidade dos movimentos.
- Cadastros: componentes e roteiro, composição, produtos, nests, insumos, processos e ícones, fotos de peças e nests, importação e exportação CSV. Quem cadastra é o gestor.
- Backup, restauração e troca de senha, no perfil gestor. No SIGPRO isso fica no painel aberto por sete cliques no logo; a capacidade entra no AISA, o gesto oculto não é regra de negócio.
- Uso no computador e no celular pelo navegador, com leitor de código de barras, impressão do plano de corte para o laser e impressão de etiquetas em folha A4 (8 etiquetas de 105 × 74 mm).
- Quatro perfis de acesso: gestor, operador, almoxarife e administrativo.
- Uma fábrica por instalação, como no SIGPRO. Sem dados de cliente, pedido ou nota fiscal; a saída diária registra peça, quantidade, data e observação.
- IA no produto, sempre com confirmação humana:
  - sugerir nests e repetições ao abrir a ordem;
  - explicar em linguagem simples o que trava o card e o que falta;
  - sugerir estoque mínimo a partir das saídas;
  - ajudar a importar CSV e completar cadastro de peça, roteiro e composição;
  - responder perguntas sobre a produção, como o que está parado e por quê.

### Fora do escopo (por enquanto)

- Integração com o sistema oficial de vendas. Decisão da entrevista.
- Alterar a lógica do SIGPRO: estoque como soma de movimentos, provisão, bloqueio de etapa, composição, plano de corte, etiqueta e níveis de estoque mínimo. Decisão da entrevista.
- O que o SIGPRO não faz. Decisão da entrevista: replicar o aplicativo antigo, sem acrescentar módulo que ele não tem.
  - Cadastro de clientes, pedidos e nota fiscal.
  - Várias fábricas ou empresas na mesma instalação.
  - Aplicativo de loja (App Store ou Play Store). O celular entra pelo navegador, como o acesso que o SIGPRO já oferece na rede local.
  - Instalador Windows, janela Electron e pasta local de dados. Isso é a forma antiga de entregar o sistema, não regra de produção.

Fonte: entrevista. O detalhe de cada função do SIGPRO vem do código.

## 6. Funcionalidades principais

| Funcionalidade | Prioridade (MVP/depois) | Descrição curta |
|---|---|---|
| Acesso por perfil | MVP | Gestor, operador, almoxarife e administrativo. O gestor mantém cadastros, importação, exportação, backup e restauração. |
| Painel | MVP | Mostra o que está aberto, esperando operador, em andamento, parado, corte pendente, etiqueta a imprimir e estoque abaixo do mínimo. |
| Ordem de produção | MVP | Produto e quantidade geram necessidade, reserva, planos de corte, cards e etiquetas. |
| Plano de corte | MVP | Nest, repetições, quantidade real, entrada de peças, baixa de chapa, sobra e excedente. |
| Kanban e cronoanálise | MVP | Leitura de etiqueta, setup, produção, pausa, retomada e lançamento de quantidade. O card só anda se a regra permitir. |
| Serviço avulso | MVP | O chão puxa uma etapa quando há peça livre na etapa anterior, sem ordem de produto. |
| Saídas diárias | MVP | Baixa do último processo e estorno. Sem dados de cliente no lançamento, como no SIGPRO. |
| Estoque mínimo | MVP | Mínimo por item, níveis urgente / médio / aceitável, sugestão pela média de saídas, pronto e previsto. |
| Estoque e inventário | MVP | Saldo por etapa, entrada, saída e acerto pela contagem. O histórico do movimento permanece. |
| Matéria-prima | MVP | Saldo por movimento, consumo no corte e na etapa que usa o insumo. |
| Etiquetas e leitor | MVP | Etiqueta da ordem, sobra, excedente e abertura do card pelo código. |
| Relatórios e rastreabilidade | MVP | Inventário, tempos, paradas, chapas, ordens e livro dos movimentos. |
| Cadastros e CSV | MVP | Peças, roteiros, composições, produtos, nests, insumos, processos, fotos, importação e exportação. Responsável: gestor. |
| Backup e senha | MVP | Backup, restauração e troca de senha, no perfil gestor. |
| IA na abertura da ordem | MVP | Sugere nests e repetições. A pessoa confirma. A gravação usa a mesma criação de ordem do sistema. |
| IA no card travado | MVP | Explica a falta que a regra já calculou, em linguagem simples. |
| IA no estoque mínimo | MVP | Sugere o mínimo a partir das saídas. A pessoa grava. |
| IA no cadastro | MVP | Ajuda a ler CSV e a propor roteiro e composição. A pessoa confirma antes de gravar. |
| IA de perguntas | MVP | Responde sobre a produção com os dados do sistema. Não cria movimento. |

Fonte: código (paridade) + entrevista (perfis e IA). Prioridade MVP da IA porque a opção de deixar a IA para uma fase seguinte não foi escolhida.

## 7. Restrições de negócio

- Prazo: a definir.
- Orçamento: a definir.
- Legais/regulatórias: contas de usuário (nome e credencial) são dado pessoal. Saídas diárias, no SIGPRO, não guardam cliente. O repositório será público, então segredo, senha, banco e dado real de produção ficam fora do código. Detalhe de LGPD além disso: a definir.
- A lógica de negócio do SIGPRO é restrição de produto, não sugestão de implementação.
- O código-fonte do produto novo será publicado em repositório público. Dado operacional da fábrica não entra nesse repositório.

Fonte: entrevista (público, preservação da lógica, prazo não informado) + código (saídas sem cliente).

## 8. Riscos e premissas

- Premissa: o comportamento a preservar é o do código do SIGPRO Kanban lido em 21/10/2026. Se a fábrica opera exceções que não estão nesse código, o AISA reproduz o código.
- Premissa: a IA não grava estoque, não finaliza card, não finaliza plano de corte e não muda provisão. Se essa premissa cair, a regra deixa de ser a fonte da verdade.
- Premissa: quatro perfis bastam para o lançamento. O gestor cadastra peça, produto, nest, processo e importa CSV. Se essa permissão faltar, a fábrica não configura o sistema.
- Risco: paridade completa e cinco usos de IA na mesma primeira entrega atrasam o primeiro teste na fábrica. Probabilidade média, impacto alto. O plano de implementação pode ordenar a entrega; o PRD mantém os dois no escopo.
- Risco: repositório público expõe a regra industrial. Probabilidade alta se o repositório for público, impacto a avaliar pelo responsável. Foi pedido explícito.
- Risco: pedir no meio do caminho cliente, nota fiscal, várias fábricas ou aplicativo de loja. Isso muda autenticação, banco e interface, e sai da réplica do SIGPRO. Probabilidade média, impacto alto.

Fonte: entrevista + leitura do código.
