# UI/UX Design — AISA

> Direção visual e de experiência.
> Fonte: [x] Entrevista com usuário  [x] Leitura de código existente (SIGPRO Kanban, `app/assets/app.css` e `app/assets/app.js`)
> Depende de: [Fluxo do App](FLUXO-APP.md)

**Data**: 21/10/2026
**Responsável**: a definir (entrevista desta data; nome não informado)

## 1. Referências e tom

- Referências visuais: o próprio SIGPRO Kanban. Fundo `#f6f8fc`, painel branco, azul `#0152f1`, azul escuro `#0140c4`, azul claro `#e8effe`, texto `#14192b`, texto secundário `#6b7280`, borda `#dde3ee`. Barra superior fixa, menu lateral com grupos, cartões com cantos de 12 px, fonte Inter. Sem referência de outro produto.
- Tom da marca: industrial e direto. Denso na mesa do gestor e do almoxarife. No celular do operador, as mesmas informações com área de toque maior. A interface fala em peça, etapa, ordem e falta. A IA escreve em linguagem simples dentro desse tom, sem ocupar a tela com um chat.

Fonte: entrevista (evoluir essa cara, proposta em vez de chat) + código (tokens e estrutura).

## 2. Plataformas-alvo

- [x] Web responsivo
- [x] PWA
- [ ] Mobile nativo (iOS/Android)
- [x] Desktop, pelo navegador

O computador usa a largura cheia, com menu lateral. Abaixo de 900 px o menu recolhe, como no SIGPRO, e o conteúdo ocupa a tela. O celular instala o AISA na tela inicial pelo navegador, sem loja. A casca (ícone, nome AISA, tela de abertura) fica em cache. Lançar ordem, card, corte, estoque ou saída exige rede. Não há fila offline de movimento: um lançamento sem rede não grava e a pessoa vê que precisa de conexão.

Impressão de etiqueta e de plano de corte abre em folha própria, sem menu nem barra, pronta para o diálogo da impressora. Etiqueta: A4, 8 por folha, 105 × 74 mm, escala 100%.

Fonte: entrevista (PWA, sem aplicativo de loja) + código (breakpoint de 900 px e medida da etiqueta no guia de instalação).

## 3. Sistema visual

- Paleta de cores: a do SIGPRO, listada na seção 1. Urgente, médio e aceitável usam as mesmas classes de estado do SIGPRO (`etiq-parado`, `etiq-andando`, `etiq-ok`), sempre com o rótulo escrito junto da cor.
- Tipografia: Inter, com fallback do sistema. Título de página em torno de 23 px, corpo em 14,5 px, rótulo de grupo do menu em 10,5 px. No celular do operador, quantidade e nome da peça sobem de tamanho. O botão de ação principal tem altura mínima de 44 px.
- Componentes centrais:
  - Barra superior com a marca AISA, atalho Ler etiqueta e o nome de quem entrou.
  - Menu lateral por grupo (Produção, Vendas, Estoque, Cadastros), filtrado pelo perfil. O gestor vê os quatro. O operador vê Kanban, Puxar serviço e Ler etiqueta. O almoxarife vê Estoque, Inventário e Matéria-prima. O administrativo vê Saídas diárias.
  - Indicadores do painel: número grande, rótulo curto, clique leva à lista.
  - Kanban em colunas por processo, card com peça, ordem, miniatura do roteiro e o motivo quando estiver travado.
  - Tabelas para ordens, planos, estoque, saídas, relatório e cadastro.
  - Formulários curtos: ordem, quantidade real do corte, lançamento do card, contagem, saída, cadastro.
  - Caixa de proposta da IA dentro do formulário, com aceitar e editar. Campo Perguntar na tela atual, resposta em texto abaixo do campo.
  - Avisos de sucesso, cuidado e recusa no topo do conteúdo, com o motivo da regra.
  - Upload de foto e de CSV.
  - Folhas de impressão de etiqueta (código de barras) e de plano de corte.

O leitor de mão funciona em qualquer tela quando o foco não está num campo. A leitura rápida terminada em Enter abre o card. Com o cursor dentro de um campo, as teclas vão para o campo. No celular, Ler etiqueta abre a câmera quando o aparelho tiver, e também aceita o leitor Bluetooth que se comporta como teclado. A câmera é apoio; a regra de abrir o card é a mesma.

O gesto de sete cliques no logo não volta. Backup, restauração e senha ficam no menu do gestor.

Fonte: entrevista + código (`app.css`, `app.js`, `layout.php`). A câmera do celular é apoio de usabilidade no navegador, sem aplicativo de loja. Se o aparelho não tiver câmera, resta o leitor e a digitação do código.

## 4. Acessibilidade

- Meta: WCAG 2.2 nível AA.
- `lang="pt-BR"` em todas as telas.
- Contraste do texto `#14192b` sobre branco e sobre `#f6f8fc`. O azul `#0152f1` não é a única forma de mostrar estado: urgente, médio e aceitável têm rótulo.
- Foco visível no teclado, com contorno azul, inclusive no campo que o leitor não deve capturar.
- Rótulo visível em todo campo. Recusa de formulário ligada ao campo e anunciada no aviso do topo.
- Alvo de toque de pelo menos 44 × 44 px nas ações do operador no celular: setup, produção, pausa, retomada e lançar.
- Cor de estado acompanhada de texto. Card travado diz a falta, não só muda de cor.
- Confirmação explícita antes de restaurar backup e antes de estornar ou excluir.
- Sem meta adicional de público idoso nem obrigação legal informada além do AA.

Fonte: entrevista (WCAG 2.2 AA) + código (foco e rótulos de estado já existentes).

## 5. Telas principais

Direção aprovada na entrevista. Ainda não há layout pixel a pixel; a estrutura abaixo é a especificação de cada tela.

| Tela | Jornada relacionada | Estado |
|---|---|---|
| Login | Entrar | Direção aprovada |
| Painel | Acompanhar; atalho para nova ordem | Direção aprovada |
| Nova ordem e detalhe da ordem | Abrir ordem. Proposta de nests dentro do formulário | Direção aprovada |
| Planos de corte, detalhe e impressão | Finalizar plano | Direção aprovada |
| Kanban e card, computador e celular | Executar etapa. Motivo da trava no card. Campo Perguntar no rodapé da tela, sem cobrir a coluna | Direção aprovada |
| Puxar serviço | Puxar serviço | Direção aprovada |
| Etiquetas e impressão A4 | Abrir ordem | Direção aprovada |
| Saídas diárias | Registrar saída | Direção aprovada |
| Estoque mínimo | Acompanhar. Sugestão com a conta e o texto da IA | Direção aprovada |
| Estoque | Contar e movimentar | Direção aprovada |
| Inventário | Contar e movimentar | Direção aprovada |
| Matéria-prima | Contar e movimentar | Direção aprovada |
| Relatórios | Acompanhar | Direção aprovada |
| Componentes, produtos, nests, processos | Cadastrar | Direção aprovada |
| Importar e exportar | Cadastrar. Proposta da IA antes de gravar o CSV | Direção aprovada |
| Backup e senha | Cadastrar | Direção aprovada |

Estados vazios que a tela precisa mostrar: nenhuma ordem aberta, kanban sem card no filtro, estoque zerado, CSV sem linha válida, código de etiqueta desconhecido, plano já finalizado, sem rede no PWA, OpenRouter sem resposta. Nesse último, o formulário segue com o texto da regra e sem proposta.

Fonte: [Fluxo do App](FLUXO-APP.md) + entrevista (PWA, proposta, AA, cara do SIGPRO).
