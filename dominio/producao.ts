import type { Banco, Linha } from "./banco";

export type Resultado =
  | { ok: true; quantidade?: number; status?: string }
  | { ok: false; erro: string };

type Etapa = {
  processoId: number;
  sequencia: number;
  processoNome: string;
};

type Filho = {
  componenteFilhoId: number;
  quantidade: number;
  nome: string;
  codigo: string;
};

function n(valor: unknown): number {
  const numero = Number(valor ?? 0);
  return Number.isFinite(numero) ? numero : 0;
}

export function fnum(valor: number): string {
  const negativo = valor < 0;
  const [inteiro, fracao] = Math.abs(valor).toFixed(2).split(".");
  const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const corpo = `${comMilhar},${fracao}`.replace(/0+$/, "").replace(/,$/, "");
  return negativo ? `-${corpo}` : corpo;
}

function codigo(prefixo: string): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return (
    prefixo +
    [...bytes]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

export async function saldoFisico(
  db: Banco,
  componenteId: number,
  processoId: number,
): Promise<number> {
  const linha = await db.uma(
    `SELECT COALESCE(SUM(quantidade), 0)::float8 AS n
     FROM movimentos WHERE componente_id = $1 AND processo_id = $2`,
    [componenteId, processoId],
  );
  return n(linha?.n);
}

export async function saldoProvisionado(
  db: Banco,
  componenteId: number,
  processoId: number,
  excetoOp?: number,
): Promise<number> {
  const linha = await db.uma(
    `SELECT COALESCE(SUM(quantidade), 0)::float8 AS n
     FROM provisoes
     WHERE componente_id = $1 AND processo_id = $2 AND status = 'ativa'
       AND ($3::int IS NULL OR op_id <> $3)`,
    [componenteId, processoId, excetoOp ?? null],
  );
  return n(linha?.n);
}

export async function saldoInsumo(
  db: Banco,
  insumoId: number,
): Promise<number> {
  const linha = await db.uma(
    `SELECT COALESCE(SUM(quantidade), 0)::float8 AS n
     FROM chapa_movimentos WHERE chapa_id = $1`,
    [insumoId],
  );
  return n(linha?.n);
}

async function saldoLivre(
  db: Banco,
  componenteId: number,
  processoId: number,
): Promise<number> {
  const fisico = await saldoFisico(db, componenteId, processoId);
  const reservado = await saldoProvisionado(db, componenteId, processoId);
  return fisico - reservado;
}

async function roteiro(db: Banco, componenteId: number): Promise<Etapa[]> {
  const linhas = await db.todas(
    `SELECT r.processo_id, r.sequencia, p.nome AS processo_nome
     FROM roteiro_itens r
     JOIN processos p ON p.id = r.processo_id
     WHERE r.componente_id = $1
     ORDER BY r.sequencia`,
    [componenteId],
  );
  return linhas.map((linha) => ({
    processoId: n(linha.processo_id),
    sequencia: n(linha.sequencia),
    processoNome: String(linha.processo_nome),
  }));
}

async function composicao(db: Banco, componenteId: number): Promise<Filho[]> {
  const linhas = await db.todas(
    `SELECT c.componente_filho_id, c.quantidade, co.codigo, co.nome
     FROM composicoes c
     JOIN componentes co ON co.id = c.componente_filho_id
     WHERE c.componente_pai_id = $1`,
    [componenteId],
  );
  return linhas.map((linha) => ({
    componenteFilhoId: n(linha.componente_filho_id),
    quantidade: n(linha.quantidade),
    codigo: String(linha.codigo),
    nome: String(linha.nome),
  }));
}

async function explodir(
  db: Banco,
  componenteId: number,
  quantidade: number,
  necessidade: Map<number, number>,
  nivel: number,
): Promise<void> {
  if (nivel > 10) return;
  necessidade.set(
    componenteId,
    (necessidade.get(componenteId) ?? 0) + quantidade,
  );
  for (const filho of await composicao(db, componenteId)) {
    await explodir(
      db,
      filho.componenteFilhoId,
      quantidade * filho.quantidade,
      necessidade,
      nivel + 1,
    );
  }
}

async function calcularNecessidade(
  db: Banco,
  produtoId: number,
  quantidade: number,
): Promise<Map<number, number>> {
  const necessidade = new Map<number, number>();
  const produto = await db.uma(
    `SELECT componente_id FROM produtos WHERE id = $1`,
    [produtoId],
  );
  const proprio = n(produto?.componente_id);
  if (proprio) {
    await explodir(db, proprio, quantidade, necessidade, 0);
    return necessidade;
  }
  const itens = await db.todas(
    `SELECT componente_id, quantidade FROM produto_componentes WHERE produto_id = $1`,
    [produtoId],
  );
  for (const item of itens) {
    await explodir(
      db,
      n(item.componente_id),
      n(item.quantidade) * quantidade,
      necessidade,
      0,
    );
  }
  return necessidade;
}

async function proximoNumero(
  db: Banco,
  tabela: "ops" | "planos_corte",
  prefixo: string,
): Promise<string> {
  const ano = new Date().getFullYear();
  const contagem = await db.uma(
    `SELECT COUNT(*)::int AS n FROM ${tabela} WHERE numero LIKE $1`,
    [`${prefixo}${ano}%`],
  );
  let sequencia = n(contagem?.n) + 1;
  for (;;) {
    const numero = `${prefixo}${ano}${String(sequencia).padStart(3, "0")}`;
    const existe = await db.uma(
      `SELECT 1 AS ok FROM ${tabela} WHERE numero = $1`,
      [numero],
    );
    if (!existe) return numero;
    sequencia += 1;
  }
}

async function movimentar(
  db: Banco,
  componenteId: number,
  processoId: number,
  quantidade: number,
  tipo: string,
  ref: {
    opId?: number | null;
    pcId?: number | null;
    cardId?: number | null;
    usuarioId?: number | null;
    obs?: string | null;
  },
): Promise<void> {
  await db.executar(
    `INSERT INTO movimentos
       (componente_id, processo_id, quantidade, tipo, op_id, pc_id, card_id, usuario_id, observacao)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      componenteId,
      processoId,
      quantidade,
      tipo,
      ref.opId ?? null,
      ref.pcId ?? null,
      ref.cardId ?? null,
      ref.usuarioId ?? null,
      ref.obs ?? null,
    ],
  );
}

async function movimentarInsumo(
  db: Banco,
  insumoId: number,
  quantidade: number,
  tipo: string,
  ref: { pcId?: number | null; usuarioId?: number | null; obs?: string | null },
): Promise<void> {
  await db.executar(
    `INSERT INTO chapa_movimentos (chapa_id, quantidade, tipo, pc_id, usuario_id, observacao)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      insumoId,
      quantidade,
      tipo,
      ref.pcId ?? null,
      ref.usuarioId ?? null,
      ref.obs ?? null,
    ],
  );
}

async function provisionar(
  db: Banco,
  opId: number,
  componenteId: number,
  processoId: number,
  quantidade: number,
): Promise<void> {
  if (quantidade <= 0) return;
  const atual = await db.uma(
    `SELECT id, quantidade FROM provisoes
     WHERE op_id = $1 AND componente_id = $2 AND processo_id = $3 AND status = 'ativa'
     LIMIT 1`,
    [opId, componenteId, processoId],
  );
  if (atual) {
    await db.executar(
      `UPDATE provisoes SET quantidade = quantidade + $1 WHERE id = $2`,
      [quantidade, n(atual.id)],
    );
    return;
  }
  await db.executar(
    `INSERT INTO provisoes (op_id, componente_id, processo_id, quantidade, status)
     VALUES ($1, $2, $3, $4, 'ativa')`,
    [opId, componenteId, processoId, quantidade],
  );
}

async function desprovisionar(
  db: Banco,
  opId: number,
  componenteId: number,
  processoId: number,
  quantidade: number,
): Promise<void> {
  if (quantidade <= 0) return;
  const atual = await db.uma(
    `SELECT id, quantidade::float8 AS quantidade FROM provisoes
     WHERE op_id = $1 AND componente_id = $2 AND processo_id = $3 AND status = 'ativa'
     LIMIT 1`,
    [opId, componenteId, processoId],
  );
  if (!atual) return;
  const novo = n(atual.quantidade) - quantidade;
  if (novo > 0.0001) {
    await db.executar(`UPDATE provisoes SET quantidade = $1 WHERE id = $2`, [
      novo,
      n(atual.id),
    ]);
    return;
  }
  await db.executar(
    `UPDATE provisoes SET quantidade = 0, status = 'consumida' WHERE id = $1`,
    [n(atual.id)],
  );
}

async function travar(
  db: Banco,
  tabela: "componentes" | "chapas",
  ids: number[],
): Promise<void> {
  const unicos = [...new Set(ids.filter((id) => id > 0))].sort((a, b) => a - b);
  for (const id of unicos) {
    await db.executar(`SELECT id FROM ${tabela} WHERE id = $1 FOR UPDATE`, [
      id,
    ]);
  }
}

async function insumosDaEtapa(
  db: Banco,
  componenteId: number,
  processoId: number,
) {
  return db.todas(
    `SELECT ci.insumo_id, ci.quantidade, ch.nome, ch.codigo
     FROM componente_insumos ci
     JOIN chapas ch ON ch.id = ci.insumo_id
     WHERE ci.componente_id = $1 AND ci.processo_id = $2`,
    [componenteId, processoId],
  );
}

async function checarInsumos(
  db: Banco,
  componenteId: number,
  processoId: number,
  quantidade: number,
): Promise<string[]> {
  const faltando: string[] = [];
  for (const insumo of await insumosDaEtapa(db, componenteId, processoId)) {
    const preciso = n(insumo.quantidade) * quantidade;
    const tem = await saldoInsumo(db, n(insumo.insumo_id));
    if (tem < preciso) {
      const nome = String(insumo.nome || insumo.codigo);
      faltando.push(`${nome} (precisa ${fnum(preciso)}, há ${fnum(tem)})`);
    }
  }
  return faltando;
}

async function baixarInsumos(
  db: Banco,
  componenteId: number,
  processoId: number,
  quantidade: number,
  usuarioId: number,
): Promise<void> {
  for (const insumo of await insumosDaEtapa(db, componenteId, processoId)) {
    await movimentarInsumo(
      db,
      n(insumo.insumo_id),
      -(n(insumo.quantidade) * quantidade),
      "consumo_producao",
      { usuarioId, obs: "Consumido na produção da OP" },
    );
  }
}

async function gerarEtiquetasOp(db: Banco, opId: number): Promise<void> {
  const itens = await db.todas(
    `SELECT componente_id, quantidade FROM op_necessidades WHERE op_id = $1`,
    [opId],
  );
  for (const item of itens) {
    const etapas = await roteiro(db, n(item.componente_id));
    if (etapas.length === 0) continue;
    await db.executar(
      `INSERT INTO etiquetas
         (tipo, codigo_barras, op_id, componente_id, processo_id, quantidade)
       VALUES ('op', $1, $2, $3, $4, $5)`,
      [
        codigo("PC"),
        opId,
        n(item.componente_id),
        etapas[0].processoId,
        n(item.quantidade),
      ],
    );
  }
}

export async function criarOp(
  db: Banco,
  entrada: {
    produtoId: number;
    quantidade: number;
    nests: { nestId: number; repeticoes: number }[];
    usuarioId: number;
    observacao?: string;
    numero?: string;
  },
): Promise<number> {
  return db.transacao(async (tx) => {
    const numero =
      entrada.numero?.trim() || (await proximoNumero(tx, "ops", "OP"));
    const repetido = await tx.uma(`SELECT 1 AS ok FROM ops WHERE numero = $1`, [
      numero,
    ]);
    if (repetido) {
      throw new Error(`Já existe uma ordem com o número ${numero}.`);
    }
    const criada = await tx.uma(
      `INSERT INTO ops (numero, produto_id, quantidade, status, observacao, criado_por)
       VALUES ($1, $2, $3, 'aberta', $4, $5)
       RETURNING id`,
      [
        numero,
        entrada.produtoId,
        entrada.quantidade,
        entrada.observacao ?? null,
        entrada.usuarioId,
      ],
    );
    const opId = n(criada?.id);
    const necessidade = await calcularNecessidade(
      tx,
      entrada.produtoId,
      entrada.quantidade,
    );
    for (const [componenteId, quantidade] of necessidade) {
      await tx.executar(
        `INSERT INTO op_necessidades (op_id, componente_id, quantidade)
         VALUES ($1, $2, $3)`,
        [opId, componenteId, quantidade],
      );
    }
    for (const nest of entrada.nests) {
      const repeticoes = Math.max(1, nest.repeticoes);
      const numeroPc = await proximoNumero(tx, "planos_corte", "PC");
      await tx.executar(
        `INSERT INTO planos_corte (numero, op_id, nest_id, repeticoes, status)
         VALUES ($1, $2, $3, $4, 'aberto')`,
        [numeroPc, opId, nest.nestId, repeticoes],
      );
    }
    for (const [componenteId, quantidade] of necessidade) {
      let restante = quantidade;
      const etapas = (await roteiro(tx, componenteId)).reverse();
      for (const etapa of etapas) {
        if (restante <= 0) break;
        const livre = await saldoLivre(tx, componenteId, etapa.processoId);
        if (livre <= 0) continue;
        const usar = Math.min(livre, restante);
        await tx.executar(
          `INSERT INTO provisoes
             (op_id, componente_id, processo_id, quantidade, status)
           VALUES ($1, $2, $3, $4, 'ativa')`,
          [opId, componenteId, etapa.processoId, usar],
        );
        restante -= usar;
      }
    }
    for (const [componenteId, quantidade] of necessidade) {
      const etapas = await roteiro(tx, componenteId);
      for (const [indice, etapa] of etapas.entries()) {
        await tx.executar(
          `INSERT INTO cards
             (codigo, op_id, componente_id, processo_id, sequencia, quantidade_prevista, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            codigo("CD"),
            opId,
            componenteId,
            etapa.processoId,
            etapa.sequencia,
            quantidade,
            indice === 0 ? "liberado" : "aguardando",
          ],
        );
      }
    }
    await gerarEtiquetasOp(tx, opId);
    return opId;
  });
}

async function registrarEvento(
  db: Banco,
  cardId: number,
  tipo: string,
  usuarioId: number,
  quantidade?: number,
  motivo?: string,
): Promise<void> {
  await db.executar(
    `INSERT INTO card_eventos (card_id, tipo, motivo, quantidade, usuario_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [cardId, tipo, motivo ?? null, quantidade ?? null, usuarioId],
  );
}

async function validarCard(
  db: Banco,
  card: Linha,
  quantidade: number,
): Promise<string[]> {
  const erros: string[] = [];
  const componenteId = n(card.componente_id);
  const etapas = await roteiro(db, componenteId);
  const anterior = [...etapas]
    .reverse()
    .find((etapa) => etapa.sequencia < n(card.sequencia));

  if (anterior) {
    const disponivel = await saldoFisico(db, componenteId, anterior.processoId);
    if (disponivel < quantidade) {
      erros.push(
        `Só há ${fnum(disponivel)} peça(s) em ${anterior.processoNome}. Não dá para processar ${fnum(quantidade)}.`,
      );
    }
  }

  for (const falta of await checarInsumos(
    db,
    componenteId,
    n(card.processo_id),
    quantidade,
  )) {
    erros.push(`Falta insumo: ${falta}.`);
  }

  if (!anterior) {
    for (const filho of await composicao(db, componenteId)) {
      const ultimo = (await roteiro(db, filho.componenteFilhoId)).at(-1);
      if (!ultimo) continue;
      const preciso = quantidade * filho.quantidade;
      const tem = await saldoFisico(
        db,
        filho.componenteFilhoId,
        ultimo.processoId,
      );
      if (tem < preciso) {
        erros.push(
          `Faltam ${fnum(preciso - tem)} de ${filho.nome} (${filho.codigo}). Precisa de ${fnum(preciso)} em ${ultimo.processoNome}, há ${fnum(tem)}.`,
        );
      }
    }
  }
  return erros;
}

async function baixarCardDoCorte(
  db: Banco,
  opId: number,
  componenteId: number,
  processoId: number,
  quantidade: number,
): Promise<void> {
  const card = await db.uma(
    `SELECT id, quantidade_processada::float8 AS quantidade_processada,
            quantidade_prevista::float8 AS quantidade_prevista, sequencia
     FROM cards
     WHERE op_id = $1 AND componente_id = $2 AND processo_id = $3
     ORDER BY sequencia
     LIMIT 1`,
    [opId, componenteId, processoId],
  );
  if (!card) return;
  const nova = n(card.quantidade_processada) + quantidade;
  const status =
    nova >= n(card.quantidade_prevista) ? "concluido" : "em_execucao";
  await db.executar(
    `UPDATE cards
     SET quantidade_processada = $1, status = $2,
         iniciado_em = COALESCE(iniciado_em, now()),
         finalizado_em = CASE WHEN $2 = 'concluido' THEN now() ELSE NULL END
     WHERE id = $3`,
    [nova, status, n(card.id)],
  );
  const proximo = await db.uma(
    `SELECT id, status FROM cards
     WHERE op_id = $1 AND componente_id = $2 AND sequencia > $3
     ORDER BY sequencia
     LIMIT 1`,
    [opId, componenteId, n(card.sequencia)],
  );
  if (proximo && proximo.status === "aguardando") {
    await db.executar(`UPDATE cards SET status = 'liberado' WHERE id = $1`, [
      n(proximo.id),
    ]);
  }
  if (!proximo && status === "concluido") {
    await db.executar(`UPDATE cards SET status = 'arquivado' WHERE id = $1`, [
      n(card.id),
    ]);
  }
}

export async function finalizarPc(
  db: Banco,
  entrada: {
    pcId: number;
    usuarioId: number;
    quantidadesReais?: Record<number, number>;
  },
): Promise<Resultado> {
  return db.transacao(async (tx) => {
    const pc = await tx.uma(
      `SELECT * FROM planos_corte WHERE id = $1 FOR UPDATE`,
      [entrada.pcId],
    );
    if (!pc) return { ok: false, erro: "Plano de corte não encontrado." };
    if (pc.status === "finalizado") {
      return { ok: false, erro: "Este PC já foi finalizado." };
    }
    const itens = await tx.todas(
      `SELECT ni.componente_id, ni.quantidade
       FROM nest_itens ni WHERE ni.nest_id = $1`,
      [n(pc.nest_id)],
    );
    const nest = await tx.uma(`SELECT * FROM nests WHERE id = $1`, [
      n(pc.nest_id),
    ]);
    await travar(
      tx,
      "componentes",
      itens.map((item) => n(item.componente_id)),
    );
    if (nest?.chapa_id) await travar(tx, "chapas", [n(nest.chapa_id)]);

    for (const item of itens) {
      const componenteId = n(item.componente_id);
      const previsto = n(item.quantidade) * n(pc.repeticoes);
      const real = entrada.quantidadesReais?.[componenteId] ?? previsto;
      const etapas = await roteiro(tx, componenteId);
      if (etapas.length === 0) continue;
      const primeiro = etapas[0].processoId;
      const necessidade = await tx.uma(
        `SELECT quantidade::float8 AS quantidade
         FROM op_necessidades WHERE op_id = $1 AND componente_id = $2`,
        [n(pc.op_id), componenteId],
      );
      const necessario = n(necessidade?.quantidade);
      const antesLinha = await tx.uma(
        `SELECT COALESCE(SUM(quantidade), 0)::float8 AS n
         FROM movimentos
         WHERE op_id = $1 AND componente_id = $2 AND tipo = 'corte'`,
        [n(pc.op_id), componenteId],
      );
      const antes = n(antesLinha?.n);
      await movimentar(tx, componenteId, primeiro, real, "corte", {
        opId: n(pc.op_id),
        pcId: entrada.pcId,
        usuarioId: entrada.usuarioId,
        obs: String(pc.numero),
      });
      await baixarCardDoCorte(tx, n(pc.op_id), componenteId, primeiro, real);
      const reservado = await tx.uma(
        `SELECT COALESCE(SUM(quantidade), 0)::float8 AS n
         FROM provisoes
         WHERE op_id = $1 AND componente_id = $2 AND status = 'ativa'`,
        [n(pc.op_id), componenteId],
      );
      await provisionar(
        tx,
        n(pc.op_id),
        componenteId,
        primeiro,
        Math.min(real, Math.max(0, necessario - n(reservado?.n))),
      );
      const excedente =
        Math.max(0, antes + real - necessario) -
        Math.max(0, antes - necessario);
      const sobra = necessario <= 0 ? real : 0;
      const quantidadeEtiqueta =
        sobra > 0 ? sobra : necessario > 0 ? excedente : 0;
      if (quantidadeEtiqueta > 0) {
        await tx.executar(
          `INSERT INTO etiquetas
             (tipo, codigo_barras, pc_id, componente_id, processo_id, quantidade)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            sobra > 0 ? "sobra" : "excedente",
            codigo("ET"),
            entrada.pcId,
            componenteId,
            primeiro,
            quantidadeEtiqueta,
          ],
        );
      }
    }

    if (nest?.chapa_id) {
      const gastas = n(nest.chapas) * n(pc.repeticoes);
      await movimentarInsumo(tx, n(nest.chapa_id), -gastas, "corte", {
        pcId: entrada.pcId,
        usuarioId: entrada.usuarioId,
        obs: `Consumo do ${String(pc.numero)}`,
      });
    }
    await tx.executar(
      `UPDATE planos_corte
       SET status = 'finalizado', finalizado_em = now(), finalizado_por = $2
       WHERE id = $1`,
      [entrada.pcId, entrada.usuarioId],
    );
    return { ok: true };
  });
}

export async function finalizarCard(
  db: Banco,
  entrada: {
    cardId: number;
    quantidade: number;
    usuarioId: number;
    encerrar?: boolean;
  },
): Promise<Resultado> {
  if (entrada.quantidade <= 0) {
    return { ok: false, erro: "Informe uma quantidade maior que zero." };
  }
  return db.transacao(async (tx) => {
    const card = await tx.uma(
      `SELECT c.*, co.codigo AS comp_codigo
       FROM cards c
       JOIN componentes co ON co.id = c.componente_id
       WHERE c.id = $1
       FOR UPDATE OF c`,
      [entrada.cardId],
    );
    if (!card) return { ok: false, erro: "Card não encontrado." };

    const componenteId = n(card.componente_id);
    const processoId = n(card.processo_id);
    const filhos = await composicao(tx, componenteId);
    const insumos = await insumosDaEtapa(tx, componenteId, processoId);
    await travar(tx, "componentes", [
      componenteId,
      ...filhos.map((filho) => filho.componenteFilhoId),
    ]);
    await travar(
      tx,
      "chapas",
      insumos.map((insumo) => n(insumo.insumo_id)),
    );

    const erros = await validarCard(tx, card, entrada.quantidade);
    if (erros.length > 0) return { ok: false, erro: erros.join(" ") };

    const etapas = await roteiro(tx, componenteId);
    const anterior = [...etapas]
      .reverse()
      .find((etapa) => etapa.sequencia < n(card.sequencia));
    if (anterior) {
      await movimentar(
        tx,
        componenteId,
        anterior.processoId,
        -entrada.quantidade,
        "consumo_etapa",
        {
          opId: n(card.op_id),
          cardId: entrada.cardId,
          usuarioId: entrada.usuarioId,
          obs: `Seguiu para ${processoId}`,
        },
      );
      if (card.op_id) {
        await desprovisionar(
          tx,
          n(card.op_id),
          componenteId,
          anterior.processoId,
          entrada.quantidade,
        );
      }
    } else {
      for (const filho of filhos) {
        const ultimo = (await roteiro(tx, filho.componenteFilhoId)).at(-1);
        if (!ultimo) continue;
        const usado = entrada.quantidade * filho.quantidade;
        await movimentar(
          tx,
          filho.componenteFilhoId,
          ultimo.processoId,
          -usado,
          "consumo_montagem",
          {
            opId: n(card.op_id),
            cardId: entrada.cardId,
            usuarioId: entrada.usuarioId,
            obs: `Consumido para formar ${String(card.comp_codigo)}`,
          },
        );
        if (card.op_id) {
          await desprovisionar(
            tx,
            n(card.op_id),
            filho.componenteFilhoId,
            ultimo.processoId,
            usado,
          );
        }
      }
    }

    await movimentar(
      tx,
      componenteId,
      processoId,
      entrada.quantidade,
      "producao",
      {
        opId: n(card.op_id),
        cardId: entrada.cardId,
        usuarioId: entrada.usuarioId,
      },
    );
    if (card.op_id) {
      await provisionar(
        tx,
        n(card.op_id),
        componenteId,
        processoId,
        entrada.quantidade,
      );
    }
    await baixarInsumos(
      tx,
      componenteId,
      processoId,
      entrada.quantidade,
      entrada.usuarioId,
    );
    await registrarEvento(
      tx,
      entrada.cardId,
      "lancamento",
      entrada.usuarioId,
      entrada.quantidade,
    );

    const nova = n(card.quantidade_processada) + entrada.quantidade;
    const prevista = n(card.quantidade_prevista);
    const status =
      entrada.encerrar || nova >= prevista ? "concluido" : "em_execucao";
    if (entrada.encerrar && nova < prevista) {
      await registrarEvento(
        tx,
        entrada.cardId,
        "encerrado_parcial",
        entrada.usuarioId,
        undefined,
        `Encerrado com ${fnum(nova)} de ${fnum(prevista)}`,
      );
    }
    await tx.executar(
      `UPDATE cards
       SET quantidade_processada = $1, status = $2,
           finalizado_em = CASE WHEN $2 = 'concluido' THEN now() ELSE NULL END,
           fase = CASE WHEN $2 = 'concluido' THEN 'concluido' ELSE 'parado' END,
           producao_inicio = NULL, setup_inicio = NULL,
           iniciado_em = COALESCE(iniciado_em, now())
       WHERE id = $3`,
      [nova, status, entrada.cardId],
    );
    if (status === "concluido") {
      await registrarEvento(
        tx,
        entrada.cardId,
        "conclusao",
        entrada.usuarioId,
        nova,
      );
    }

    const proximo = await tx.uma(
      `SELECT id, status FROM cards
       WHERE op_id = $1 AND componente_id = $2 AND sequencia > $3
       ORDER BY sequencia
       LIMIT 1`,
      [n(card.op_id), componenteId, n(card.sequencia)],
    );
    if (proximo && proximo.status === "aguardando") {
      await tx.executar(`UPDATE cards SET status = 'liberado' WHERE id = $1`, [
        n(proximo.id),
      ]);
    }
    if (!proximo && status === "concluido") {
      await tx.executar(`UPDATE cards SET status = 'arquivado' WHERE id = $1`, [
        entrada.cardId,
      ]);
    }
    return { ok: true, quantidade: nova, status };
  });
}
