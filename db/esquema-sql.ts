export const ESQUEMA_SQL = `
CREATE TABLE IF NOT EXISTS usuarios (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome text NOT NULL UNIQUE,
  senha_hash text NOT NULL,
  papel text NOT NULL DEFAULT 'gestor'
    CHECK (papel IN ('gestor', 'operador', 'almoxarife', 'administrativo')),
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessoes (
  id text PRIMARY KEY,
  usuario_id integer NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  expira_em timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessoes_expira ON sessoes (expira_em);

CREATE TABLE IF NOT EXISTS config (
  chave text PRIMARY KEY,
  valor text
);

CREATE TABLE IF NOT EXISTS processos (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  icone text NOT NULL DEFAULT 'gear',
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS componentes (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  material text,
  espessura text,
  peso numeric,
  dimensoes text,
  imagem text,
  estoque_minimo numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vendas (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  componente_id integer NOT NULL REFERENCES componentes(id),
  quantidade numeric NOT NULL,
  data date NOT NULL,
  observacao text,
  usuario_id integer REFERENCES usuarios(id),
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vendas_data ON vendas (data);

CREATE TABLE IF NOT EXISTS roteiro_itens (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  componente_id integer NOT NULL REFERENCES componentes(id) ON DELETE CASCADE,
  processo_id integer NOT NULL REFERENCES processos(id),
  sequencia integer NOT NULL,
  duracao_min integer,
  UNIQUE (componente_id, sequencia)
);

CREATE TABLE IF NOT EXISTS composicoes (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  componente_pai_id integer NOT NULL REFERENCES componentes(id) ON DELETE CASCADE,
  componente_filho_id integer NOT NULL REFERENCES componentes(id),
  quantidade numeric NOT NULL DEFAULT 1,
  UNIQUE (componente_pai_id, componente_filho_id)
);

CREATE TABLE IF NOT EXISTS produtos (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  imagem text,
  componente_id integer REFERENCES componentes(id),
  ativo boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS produto_componentes (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  produto_id integer NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  componente_id integer NOT NULL REFERENCES componentes(id),
  quantidade numeric NOT NULL DEFAULT 1,
  UNIQUE (produto_id, componente_id)
);

CREATE TABLE IF NOT EXISTS chapas (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nome text,
  tipo text NOT NULL DEFAULT 'chapa',
  unidade text NOT NULL DEFAULT 'un',
  material text,
  espessura text,
  formato text,
  peso numeric,
  fornecedor text,
  estoque_minimo numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nests (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  nome text,
  material text,
  espessura text,
  chapa text,
  chapa_id integer REFERENCES chapas(id),
  chapas integer NOT NULL DEFAULT 1,
  imagem text,
  ativo boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS nest_itens (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nest_id integer NOT NULL REFERENCES nests(id) ON DELETE CASCADE,
  componente_id integer NOT NULL REFERENCES componentes(id),
  quantidade numeric NOT NULL DEFAULT 1,
  UNIQUE (nest_id, componente_id)
);

CREATE TABLE IF NOT EXISTS produto_nests (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  produto_id integer NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  nest_id integer NOT NULL REFERENCES nests(id) ON DELETE CASCADE,
  UNIQUE (produto_id, nest_id)
);

CREATE TABLE IF NOT EXISTS componente_insumos (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  componente_id integer NOT NULL REFERENCES componentes(id) ON DELETE CASCADE,
  insumo_id integer NOT NULL REFERENCES chapas(id) ON DELETE CASCADE,
  processo_id integer NOT NULL REFERENCES processos(id),
  quantidade numeric NOT NULL DEFAULT 1,
  UNIQUE (componente_id, insumo_id, processo_id)
);

CREATE TABLE IF NOT EXISTS ops (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  numero text NOT NULL UNIQUE,
  produto_id integer REFERENCES produtos(id),
  quantidade numeric NOT NULL,
  status text NOT NULL DEFAULT 'aberta'
    CHECK (status IN ('aberta', 'concluida')),
  tipo text NOT NULL DEFAULT 'producao'
    CHECK (tipo IN ('producao', 'avulso')),
  observacao text,
  criado_por integer REFERENCES usuarios(id),
  criado_em timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz
);

CREATE TABLE IF NOT EXISTS op_necessidades (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  op_id integer NOT NULL REFERENCES ops(id) ON DELETE CASCADE,
  componente_id integer NOT NULL REFERENCES componentes(id),
  quantidade numeric NOT NULL,
  UNIQUE (op_id, componente_id)
);

CREATE TABLE IF NOT EXISTS planos_corte (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  numero text NOT NULL UNIQUE,
  op_id integer NOT NULL REFERENCES ops(id) ON DELETE CASCADE,
  nest_id integer NOT NULL REFERENCES nests(id),
  repeticoes integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto', 'finalizado')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  finalizado_em timestamptz,
  finalizado_por integer REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS chapa_movimentos (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  chapa_id integer NOT NULL REFERENCES chapas(id) ON DELETE CASCADE,
  quantidade numeric NOT NULL,
  tipo text NOT NULL,
  pc_id integer REFERENCES planos_corte(id) ON DELETE SET NULL,
  usuario_id integer REFERENCES usuarios(id),
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chapamov ON chapa_movimentos (chapa_id, id);

CREATE TABLE IF NOT EXISTS provisoes (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  op_id integer NOT NULL REFERENCES ops(id) ON DELETE CASCADE,
  componente_id integer NOT NULL REFERENCES componentes(id),
  processo_id integer NOT NULL REFERENCES processos(id),
  quantidade numeric NOT NULL,
  status text NOT NULL DEFAULT 'ativa'
    CHECK (status IN ('ativa', 'consumida')),
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prov ON provisoes (componente_id, processo_id, status);

CREATE TABLE IF NOT EXISTS cards (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  op_id integer NOT NULL REFERENCES ops(id) ON DELETE CASCADE,
  componente_id integer NOT NULL REFERENCES componentes(id),
  processo_id integer NOT NULL REFERENCES processos(id),
  sequencia integer NOT NULL,
  quantidade_prevista numeric NOT NULL,
  quantidade_processada numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aguardando'
    CHECK (status IN ('aguardando', 'liberado', 'em_execucao', 'concluido', 'arquivado')),
  fase text NOT NULL DEFAULT 'parado'
    CHECK (fase IN ('parado', 'setup', 'producao', 'pausado', 'concluido')),
  setup_inicio timestamptz,
  setup_fim timestamptz,
  producao_inicio timestamptz,
  pausa_inicio timestamptz,
  pausa_motivo text,
  segundos_setup integer NOT NULL DEFAULT 0,
  segundos_producao integer NOT NULL DEFAULT 0,
  segundos_pausa integer NOT NULL DEFAULT 0,
  iniciado_em timestamptz,
  finalizado_em timestamptz
);
CREATE INDEX IF NOT EXISTS idx_cards_op ON cards (op_id);
CREATE INDEX IF NOT EXISTS idx_cards_proc ON cards (processo_id, status);

CREATE TABLE IF NOT EXISTS card_eventos (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  card_id integer NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  motivo text,
  quantidade numeric,
  segundos integer,
  usuario_id integer REFERENCES usuarios(id),
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evt_card ON card_eventos (card_id, id);

CREATE TABLE IF NOT EXISTS movimentos (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  componente_id integer NOT NULL REFERENCES componentes(id),
  processo_id integer NOT NULL REFERENCES processos(id),
  quantidade numeric NOT NULL,
  tipo text NOT NULL,
  op_id integer REFERENCES ops(id) ON DELETE SET NULL,
  pc_id integer REFERENCES planos_corte(id) ON DELETE SET NULL,
  card_id integer REFERENCES cards(id) ON DELETE SET NULL,
  usuario_id integer REFERENCES usuarios(id),
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mov_comp ON movimentos (componente_id, processo_id);
CREATE INDEX IF NOT EXISTS idx_mov_usuario ON movimentos (usuario_id);

CREATE TABLE IF NOT EXISTS etiquetas (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tipo text NOT NULL CHECK (tipo IN ('op', 'sobra', 'excedente')),
  codigo_barras text NOT NULL,
  op_id integer REFERENCES ops(id) ON DELETE CASCADE,
  pc_id integer REFERENCES planos_corte(id) ON DELETE CASCADE,
  card_id integer REFERENCES cards(id) ON DELETE CASCADE,
  componente_id integer REFERENCES componentes(id),
  processo_id integer REFERENCES processos(id),
  quantidade numeric NOT NULL DEFAULT 0,
  impressa boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now()
);
`;
