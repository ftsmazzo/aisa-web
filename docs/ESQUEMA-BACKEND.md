# Esquema Backend — AISA

> Modelagem de dados e API.
> Fonte: [x] Entrevista com usuário  [x] Leitura de código existente (`app/db.php` e `app/logica.php` do SIGPRO Kanban)
> Depende de: [TRD](TRD.md)

**Data**: 21/10/2026
**Responsável**: a definir (entrevista desta data; nome não informado)

O banco de produção começa vazio. A Mesa Industrial existe só no seed de desenvolvimento. Na primeira subida, com a tabela de usuários vazia, a única tela é a criação do primeiro gestor. Depois que ele existe, essa tela deixa de aparecer.

Quem executa a ação fica gravado em ordem, movimento de peça, movimento de insumo, evento de card, saída diária, plano de corte e registro de IA. A quantidade de estoque continua sendo só a soma dos movimentos.

Datas de negócio (`vendas.data`) são dia civil. Instante de gravação é `timestamptz` em UTC, mostrado em `America/Sao_Paulo`. Quantidade é `numeric`, porque insumo e peça aceitam fração (a fita do exemplo é 0,2).

Fonte: entrevista (autor, log de IA, banco vazio) + código (tabelas e tipos de movimento).

## 1. Entidades principais

| Entidade | Campos-chave | Relacionamentos |
|---|---|---|
| `usuarios` | `id`, `nome` único, `senha_hash` Argon2id, `papel` (`gestor`, `operador`, `almoxarife`, `administrativo`), `criado_em` | Autor das ações abaixo. Uma fábrica por instalação: sem tabela de empresa. |
| `config` | `chave`, `valor` | Parâmetros soltos, como o nome da empresa na tela. |
| `processos` | `codigo` único, `nome`, `icone`, `ordem`, `ativo` | Etapas da fábrica. O roteiro e o card apontam para cá. |
| `componentes` | `codigo` único, `nome`, `material`, `espessura`, `peso`, `dimensoes`, `imagem`, `estoque_minimo`, `ativo` | Peça, subconjunto ou produto acabado. Tipo é derivado: produto se algum `produtos.componente_id` aponta para ele; subconjunto se tem filhos em `composicoes`; senão componente. |
| `roteiro_itens` | `componente_id`, `processo_id`, `sequencia` única por peça, `duracao_min` | Ordem das etapas da peça. |
| `composicoes` | `componente_pai_id`, `componente_filho_id`, `quantidade` | O que se consome quando o pai nasce, na primeira etapa do pai. |
| `produtos` | `codigo` único, `nome`, `imagem`, `componente_id`, `ativo` | O produto acabado também é um componente, que nasce consumindo os filhos. |
| `produto_componentes` | `produto_id`, `componente_id`, `quantidade` | Explosão quando o produto não tem `componente_id`. O SIGPRO usa as duas formas; as duas permanecem. |
| `produto_nests` | `produto_id`, `nest_id` | Limita os nests oferecidos na ordem. |
| `chapas` | `codigo` único, `nome`, `tipo`, `unidade`, `material`, `espessura`, `formato`, `peso`, `fornecedor`, `estoque_minimo`, `ativo` | Insumo. O nome da tabela permanece `chapas` na migração conceitual; no Postgres o nome físico pode ser `insumos`, com os mesmos campos. Tipos: `chapa`, `fixacao`, `acabamento`, `embalagem`, `componente_comprado`, `outro`. |
| `componente_insumos` | `componente_id`, `insumo_id`, `processo_id`, `quantidade` | Quanto a peça consome daquele insumo naquela etapa. |
| `chapa_movimentos` | `insumo_id`, `quantidade` com sinal, `tipo`, `pc_id`, `usuario_id`, `observacao`, `criado_em` | Saldo do insumo = soma. Tipos: `saldo_inicial`, `entrada`, `saida_manual`, `ajuste_inventario`, `corte`, `consumo_producao`. |
| `nests` | `codigo` único, `nome`, `material`, `espessura`, `chapa` texto, `chapa_id`, `chapas` inteiro, `imagem`, `ativo` | `chapas` é quantas chapas o nest gasta por repetição. |
| `nest_itens` | `nest_id`, `componente_id`, `quantidade` | Peças que saem de uma repetição do nest. |
| `ops` | `numero` único, `produto_id` nulo no avulso, `quantidade`, `status`, `tipo`, `observacao`, `criado_por`, `criado_em`, `finalizado_em` | `status`: `aberta`, `concluida`. `tipo`: `producao`, `avulso`. Número `OP` ou `AV` + ano + sequência. |
| `op_necessidades` | `op_id`, `componente_id`, `quantidade` | Resultado da explosão. |
| `planos_corte` | `numero` único, `op_id`, `nest_id`, `repeticoes`, `status`, `criado_em`, `finalizado_em`, `finalizado_por` | `status`: `aberto`, `finalizado`. Número `PC` + ano + sequência. |
| `provisoes` | `op_id`, `componente_id`, `processo_id`, `quantidade`, `status`, `criado_em` | `status`: `ativa`, `consumida`. Reserva. Não é saldo. |
| `cards` | `codigo` único, `op_id`, `componente_id`, `processo_id`, `sequencia`, `quantidade_prevista`, `quantidade_processada`, `status`, `fase`, tempos de setup, produção e pausa | `status`: `aguardando`, `liberado`, `em_execucao`, `concluido`, `arquivado`. `fase`: `parado`, `setup`, `producao`, `pausado`, `concluido`. |
| `card_eventos` | `card_id`, `tipo`, `motivo`, `quantidade`, `segundos`, `usuario_id`, `criado_em` | Cronoanálise. Tipos: `setup_inicio`, `setup_fim`, `producao_inicio`, `pausa_inicio`, `pausa_fim`, `lancamento`, `encerrado_parcial`, `conclusao`. |
| `movimentos` | `componente_id`, `processo_id`, `quantidade` com sinal, `tipo`, `op_id`, `pc_id`, `card_id`, `usuario_id`, `observacao`, `criado_em` | Livro do estoque de peça. Saldo físico = soma por peça e etapa. Tipos: `saldo_inicial`, `corte`, `consumo_etapa`, `consumo_montagem`, `producao`, `venda`, `estorno_venda`, `entrada_manual`, `saida_manual`, `ajuste_inventario`. |
| `etiquetas` | `tipo`, `codigo_barras`, `op_id`, `pc_id`, `card_id`, `componente_id`, `processo_id`, `quantidade`, `impressa`, `criado_em` | `tipo`: `op`, `sobra`, `excedente`. Uma etiqueta de ordem por peça, não por etapa. |
| `vendas` | `componente_id`, `quantidade`, `data`, `observacao`, `usuario_id`, `criado_em` | Saída diária, sem cliente. Estorno apaga a linha e lança movimento inverso. |
| `ia_registros` | `usuario_id`, `tela`, `tipo`, `resumo_entrada`, `resposta`, `proposta` jsonb, `modelo`, `aceita`, `criado_em` | `tipo`: `proposta_nest`, `explicacao_trava`, `sugestao_minimo`, `proposta_csv`, `pergunta`. Não referencia movimento. `aceita` fica nulo até a pessoa confirmar ou dispensar. |

Índices herdados do SIGPRO e mantidos: vendas por data; movimentos de insumo por insumo; movimentos de peça por peça e etapa; cards por ordem e por processo e status; provisões por peça, etapa e status; eventos por card. Novos: movimentos e eventos por `usuario_id`; `ia_registros` por usuário e data.

Integridade: chaves estrangeiras ligadas. Apagar ordem apaga necessidades, planos, cards, etiquetas da ordem e provisões, como o `ON DELETE CASCADE` do SIGPRO. Movimento de peça não some junto: a rastreabilidade fica. Por isso `op_id` no movimento é referência sem cascade, igual ao esquema atual.

Concorrência, já decidida no TRD: ao finalizar card, plano ou saída, a transação trava as linhas de saldo envolvidas antes de inserir o movimento.

Fonte: código do esquema, com `usuario_id` e `ia_registros` vindos da entrevista.

## 2. Autenticação e autorização

- Método: login próprio, nome e senha. Sessão em cookie httpOnly. Sem SSO e sem login social.
- Papéis: `gestor`, `operador`, `almoxarife`, `administrativo`.
- O gestor executa todas as ações. Os demais ficam nas ações da seção 3.
- Senha com Argon2id. Mínimo de 4 caracteres na troca, como no SIGPRO.
- A biblioteca de sessão usa esta tabela de usuários, com coluna `papel`. Não há segunda tabela de pessoa.

| Papel | Ações |
|---|---|
| Gestor | Todas, inclusive cadastro, importação, backup, restauração e senha. |
| Operador | Listar e executar card, ler etiqueta, puxar serviço, perguntar sobre o que o kanban já mostra. |
| Almoxarife | Ler estoque, lançar entrada e saída manual, inventariar peça e insumo já cadastrado, perguntar sobre esses saldos. |
| Administrativo | Lançar e estornar saída diária, perguntar sobre o pronto para saída. |

Fonte: entrevista + [Fluxo do App](FLUXO-APP.md).

## 3. Endpoints/ações principais

Ações de servidor, autenticadas, no módulo de domínio. Não há API pública para outro sistema. O nome é o da regra do SIGPRO, para a porta não reinventar o comportamento.

| Endpoint/Ação | Método | Autenticado? | Regra de negócio relevante |
|---|---|---|---|
| `POST /login` e `POST /logout` | POST | Login público; o resto sim | Sessão. Primeiro acesso só com usuários vazios. |
| `GET /health` | GET | Não | Saúde do processo, sem dado de fábrica. |
| `criar_op` | POST | Gestor | Explosão, reserva do livre da etapa mais adiantada, planos, cards e etiquetas, numa transação. |
| `finalizar_pc` | POST | Gestor | Quantidade real, entrada no primeiro processo, baixa do card de corte, baixa da chapa, sobra e excedente. |
| `iniciar_setup`, `iniciar_producao`, `pausar_card`, `retomar_card` | POST | Operador, gestor | Cronômetro. Pausa exige motivo. |
| `finalizar_card` | POST | Operador, gestor | Recusa sem peça, filho ou insumo. Trava de concorrência. Libera o próximo card. |
| `criar_card_avulso` | POST | Operador, gestor | Só com livre na etapa anterior. Não serve para a primeira etapa. |
| `registrar_venda`, `excluir_venda` | POST | Administrativo, gestor | Baixa ou estorno no último processo. |
| `lancar_estoque`, `acertar_inventario` | POST | Almoxarife, gestor | Saída limitada ao físico. Inventário grava a diferença. |
| `lancar_chapa`, `contar_chapa` | POST | Almoxarife, gestor | Mesma ideia para insumo. |
| Cadastros e CSV | POST | Gestor | Código de peça repetido é ignorado. Composição circular para no nível 10. |
| `fazer_backup`, `restaurar_backup` | POST | Gestor | Restaurar pede confirmação. O job diário também chama o backup. |
| Leitura de código | GET | Operador, gestor | `card_por_codigo`: card pelo código, ou etiqueta abrindo a etapa aberta mais atrasada. |
| Proposta e pergunta de IA | POST | Conforme a tela | Grava `ia_registros`. Confirmar nest, mínimo ou CSV chama a ação de domínio correspondente, não o modelo. |
| Relatórios e painel | GET | Gestor, e cada perfil na sua tela | Saldos por soma. Nível de mínimo: abaixo de 100% urgente, abaixo de 150% médio. |

Fonte: funções de `logica.php` + papéis da entrevista.

## 4. Processamento assíncrono

- Fila Redis (BullMQ) e worker no mesmo código.
- Backup diário do PostgreSQL, retenção de 30 dias, disparado pelo worker. O gestor também dispara na hora.
- Proposta de CSV e pergunta longa entram na fila. A tela mostra a regra ou o estado “consultando” e atualiza quando o registro de IA fica pronto.
- Explicação curta de trava e a conta do estoque mínimo rodam no pedido, com tempo limite baixo. Sem resposta, a interface mostra o texto da regra e a conta.
- Sem webhook de sistema externo.

Fonte: [TRD](TRD.md) + entrevista (log de IA).

## 5. Armazenamento

- Estruturado: PostgreSQL. Produção começa sem a Mesa Industrial.
- Arquivos: fotos de peça e de nest, CSV temporário de importação e arquivos de backup, no volume do EasyPanel. O banco guarda o caminho da foto, não o binário.
- Dados sensíveis: hash de senha, cookie de sessão, `OPENROUTER_API_KEY` só no ambiente. `ia_registros` guarda resumo e resposta, sem chave e sem cabeçalho de autenticação.
- Volume esperado: dezenas de pessoas ao mesmo tempo. Movimentos, eventos de card e registros de IA crescem com as ordens. Não há meta de milhões de linhas nesta versão. Os índices da seção 1 cobrem o acesso do kanban, do saldo e da rastreabilidade.

Fonte: entrevista (banco vazio, dezenas de usuários, log de IA) + código (fotos em `dados/imagens`, backup de 30 dias).
