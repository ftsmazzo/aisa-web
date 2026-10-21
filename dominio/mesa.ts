import type { Banco } from "./banco";

export type Mesa = {
  produtoId: number;
  processos: Record<string, number>;
  componentes: Record<string, number>;
  chapas: Record<string, number>;
  nests: Record<string, number>;
};

async function idDe(
  db: Banco,
  tabela: string,
  codigoValor: string,
): Promise<number> {
  const linha = await db.uma<{ id: number }>(
    `SELECT id FROM ${tabela} WHERE codigo = $1`,
    [codigoValor],
  );
  if (!linha) throw new Error(`Não achei ${codigoValor} em ${tabela}.`);
  return Number(linha.id);
}

export async function popularMesa(db: Banco): Promise<Mesa> {
  const processos: Record<string, number> = {};
  const etapas = [
    ["CORTE", "Corte", "scissors", 1],
    ["DOBRA", "Dobra", "bounding-box", 2],
    ["SOLDA", "Solda", "fire", 3],
    ["ACAB", "Acabamento", "brush", 4],
    ["MONT", "Montagem", "tools", 5],
    ["EMB", "Embalagem", "box-seam", 6],
  ] as const;
  for (const [codigoProcesso, nome, icone, ordem] of etapas) {
    await db.executar(
      `INSERT INTO processos (codigo, nome, icone, ordem) VALUES ($1, $2, $3, $4)`,
      [codigoProcesso, nome, icone, ordem],
    );
    processos[codigoProcesso] = await idDe(db, "processos", codigoProcesso);
  }

  const componentes: Record<string, number> = {};
  const pecas = [
    [
      "TAMPO",
      "Tampo da Mesa",
      "Inox 201",
      "0,60",
      ["CORTE", "DOBRA", "SOLDA", "ACAB", "MONT", "EMB"],
    ],
    ["PE", "Pé da Mesa", "Inox 430", "0,8", ["CORTE", "DOBRA", "EMB"]],
    ["TRV-LAT", "Travessa Lateral", "Inox 430", "0,8", ["CORTE", "DOBRA"]],
    ["TRV-FRO", "Travessa Frontal", "Inox 430", "0,8", ["CORTE", "DOBRA"]],
    ["TRV-MED", "Travessa Média", "Inox 430", "0,8", ["CORTE", "DOBRA"]],
    [
      "EST-TAM",
      "Estrutura do Tampo",
      "Inox 430",
      "0,8",
      ["SOLDA", "ACAB", "MONT", "EMB"],
    ],
    ["PANEL", "Paneleiro", "Inox 430", "0,8", ["SOLDA", "ACAB", "MONT", "EMB"]],
  ] as const;
  for (const [codigoPeca, nome, material, espessura, roteiro] of pecas) {
    await db.executar(
      `INSERT INTO componentes (codigo, nome, material, espessura) VALUES ($1, $2, $3, $4)`,
      [codigoPeca, nome, material, espessura],
    );
    const id = await idDe(db, "componentes", codigoPeca);
    componentes[codigoPeca] = id;
    for (const [indice, processo] of roteiro.entries()) {
      await db.executar(
        `INSERT INTO roteiro_itens (componente_id, processo_id, sequencia) VALUES ($1, $2, $3)`,
        [id, processos[processo], indice + 1],
      );
    }
  }

  for (const pai of ["EST-TAM", "PANEL"]) {
    await db.executar(
      `INSERT INTO composicoes (componente_pai_id, componente_filho_id, quantidade) VALUES ($1, $2, 2)`,
      [componentes[pai], componentes["TRV-LAT"]],
    );
    await db.executar(
      `INSERT INTO composicoes (componente_pai_id, componente_filho_id, quantidade) VALUES ($1, $2, 2)`,
      [componentes[pai], componentes["TRV-FRO"]],
    );
    await db.executar(
      `INSERT INTO composicoes (componente_pai_id, componente_filho_id, quantidade) VALUES ($1, $2, 8)`,
      [componentes[pai], componentes["TRV-MED"]],
    );
  }

  await db.executar(
    `INSERT INTO produtos (codigo, nome) VALUES ('MESA-IND', 'Mesa Industrial')`,
  );
  const produtoId = await idDe(db, "produtos", "MESA-IND");
  for (const [codigoPeca, quantidade] of [
    ["TAMPO", 1],
    ["PE", 4],
    ["EST-TAM", 1],
    ["PANEL", 1],
  ] as const) {
    await db.executar(
      `INSERT INTO produto_componentes (produto_id, componente_id, quantidade) VALUES ($1, $2, $3)`,
      [produtoId, componentes[codigoPeca], quantidade],
    );
  }

  const chapas: Record<string, number> = {};
  const insumos = [
    [
      "CH-430-08",
      "Chapa Inox 430 0,8",
      "chapa",
      "un",
      "Inox 430",
      "0,8",
      "1250x3000",
      20,
    ],
    [
      "CH-201-06",
      "Chapa Inox 201 0,60",
      "chapa",
      "un",
      "Inox 201",
      "0,60",
      "1250x3000",
      10,
    ],
    [
      "CH-430-08G",
      "Chapa Inox 430 0,8 GR",
      "chapa",
      "un",
      "Inox 430",
      "0,8",
      "1500x3000",
      6,
    ],
    ["PAR-M6", "Parafuso M6x20 inox", "fixacao", "un", "", "", "", 500],
    ["POR-M6", "Porca M6 inox", "fixacao", "un", "", "", "", 500],
    ["ARR-M6", "Arruela M6 inox", "fixacao", "un", "", "", "", 500],
    ["PE-BOR", 'Pé de borracha 1"', "acabamento", "un", "", "", "", 200],
    [
      "CX-MESA",
      "Caixa de papelão mesa",
      "embalagem",
      "un",
      "",
      "",
      "90x70x20",
      30,
    ],
    [
      "PL-BOLHA",
      "Plástico bolha",
      "embalagem",
      "m",
      "",
      "",
      "1,20m largura",
      100,
    ],
    ["FITA", "Fita adesiva 48mm", "embalagem", "un", "", "", "", 20],
  ] as const;
  for (const insumo of insumos) {
    await db.executar(
      `INSERT INTO chapas
         (codigo, nome, tipo, unidade, material, espessura, formato, estoque_minimo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [...insumo],
    );
    chapas[insumo[0]] = await idDe(db, "chapas", insumo[0]);
  }
  for (const [codigoChapa, quantidade] of [
    ["CH-430-08", 40],
    ["CH-201-06", 15],
    ["CH-430-08G", 8],
    ["PAR-M6", 1200],
    ["POR-M6", 1200],
    ["ARR-M6", 1500],
    ["PE-BOR", 340],
    ["CX-MESA", 45],
    ["PL-BOLHA", 260],
    ["FITA", 35],
  ] as const) {
    await db.executar(
      `INSERT INTO chapa_movimentos (chapa_id, quantidade, tipo, observacao)
       VALUES ($1, $2, 'saldo_inicial', 'Estoque inicial de exemplo')`,
      [chapas[codigoChapa], quantidade],
    );
  }

  const nests: Record<string, number> = {};
  const planos = [
    [
      "NEST-A",
      "Estrutura + Paneleiro",
      "Inox 430",
      "0,8",
      "Chapa 1250x3000",
      2,
      "CH-430-08",
      [
        ["TRV-LAT", 4],
        ["TRV-FRO", 4],
        ["TRV-MED", 16],
        ["PE", 6],
      ],
    ],
    [
      "NEST-B",
      "Tampo",
      "Inox 201",
      "0,60",
      "Chapa 1250x3000",
      1,
      "CH-201-06",
      [
        ["TAMPO", 1],
        ["PE", 3],
        ["TRV-FRO", 2],
      ],
    ],
    [
      "NEST-C",
      "Estrutura + Paneleiro (aproveitamento B)",
      "Inox 430",
      "0,8",
      "Chapa 1500x3000",
      2,
      "CH-430-08G",
      [
        ["TRV-LAT", 4],
        ["TRV-FRO", 4],
        ["TRV-MED", 16],
        ["PE", 2],
      ],
    ],
  ] as const;
  for (const plano of planos) {
    await db.executar(
      `INSERT INTO nests (codigo, nome, material, espessura, chapa, chapas, chapa_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        plano[0],
        plano[1],
        plano[2],
        plano[3],
        plano[4],
        plano[5],
        chapas[plano[6]],
      ],
    );
    const nestId = await idDe(db, "nests", plano[0]);
    nests[plano[0]] = nestId;
    for (const [codigoPeca, quantidade] of plano[7]) {
      await db.executar(
        `INSERT INTO nest_itens (nest_id, componente_id, quantidade) VALUES ($1, $2, $3)`,
        [nestId, componentes[codigoPeca], quantidade],
      );
    }
    await db.executar(
      `INSERT INTO produto_nests (produto_id, nest_id) VALUES ($1, $2)`,
      [produtoId, nestId],
    );
  }

  await db.executar(
    `INSERT INTO componentes (codigo, nome, material) VALUES ('MESA-IND', 'Mesa Industrial', 'Produto acabado')`,
  );
  componentes["MESA-IND"] = await idDe(db, "componentes", "MESA-IND");
  await db.executar(`UPDATE produtos SET componente_id = $1 WHERE id = $2`, [
    componentes["MESA-IND"],
    produtoId,
  ]);
  await db.executar(
    `INSERT INTO roteiro_itens (componente_id, processo_id, sequencia) VALUES ($1, $2, 1)`,
    [componentes["MESA-IND"], processos.MONT],
  );
  await db.executar(
    `INSERT INTO roteiro_itens (componente_id, processo_id, sequencia) VALUES ($1, $2, 2)`,
    [componentes["MESA-IND"], processos.EMB],
  );
  for (const [codigoPeca, quantidade] of [
    ["TAMPO", 1],
    ["PE", 4],
    ["EST-TAM", 1],
    ["PANEL", 1],
  ] as const) {
    await db.executar(
      `INSERT INTO composicoes (componente_pai_id, componente_filho_id, quantidade) VALUES ($1, $2, $3)`,
      [componentes["MESA-IND"], componentes[codigoPeca], quantidade],
    );
  }
  for (const [codigoChapa, processo, quantidade] of [
    ["PAR-M6", "MONT", 16],
    ["POR-M6", "MONT", 16],
    ["ARR-M6", "MONT", 32],
    ["PE-BOR", "MONT", 4],
    ["CX-MESA", "EMB", 1],
    ["PL-BOLHA", "EMB", 6],
    ["FITA", "EMB", 0.2],
  ] as const) {
    await db.executar(
      `INSERT INTO componente_insumos (componente_id, insumo_id, processo_id, quantidade)
       VALUES ($1, $2, $3, $4)`,
      [
        componentes["MESA-IND"],
        chapas[codigoChapa],
        processos[processo],
        quantidade,
      ],
    );
  }

  await db.executar(
    `INSERT INTO movimentos (componente_id, processo_id, quantidade, tipo, observacao)
     VALUES ($1, $2, 30, 'saldo_inicial', 'Estoque inicial de exemplo')`,
    [componentes.PE, processos.CORTE],
  );
  await db.executar(
    `INSERT INTO movimentos (componente_id, processo_id, quantidade, tipo, observacao)
     VALUES ($1, $2, 12, 'saldo_inicial', 'Estoque inicial de exemplo')`,
    [componentes.PE, processos.DOBRA],
  );
  await db.executar(
    `INSERT INTO movimentos (componente_id, processo_id, quantidade, tipo, observacao)
     VALUES ($1, $2, 8, 'saldo_inicial', 'Estoque inicial de exemplo')`,
    [componentes["TRV-LAT"], processos.CORTE],
  );
  await db.executar(
    `INSERT INTO movimentos (componente_id, processo_id, quantidade, tipo, observacao)
     VALUES ($1, $2, 2, 'saldo_inicial', 'Estoque inicial de exemplo')`,
    [componentes.TAMPO, processos.DOBRA],
  );

  return { produtoId, processos, componentes, chapas, nests };
}
