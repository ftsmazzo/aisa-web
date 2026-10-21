import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";
import { ESQUEMA_SQL } from "@/db/esquema-sql";
import { type Banco, bancoConsulta } from "@/dominio/banco";
import { type Mesa, popularMesa } from "@/dominio/mesa";
import {
  criarOp,
  finalizarCard,
  finalizarPc,
  saldoFisico,
  saldoInsumo,
} from "@/dominio/producao";

let db: Banco;
let mesa: Mesa;
let usuarioId: number;

async function foto(): Promise<string> {
  const movimentos = await db.uma(
    `SELECT COUNT(*)::int AS n, COALESCE(SUM(quantidade), 0)::float8 AS s FROM movimentos`,
  );
  const chapas = await db.uma(
    `SELECT COUNT(*)::int AS n, COALESCE(SUM(quantidade), 0)::float8 AS s FROM chapa_movimentos`,
  );
  const provisoes = await db.uma(
    `SELECT COALESCE(SUM(quantidade), 0)::float8 AS s FROM provisoes WHERE status = 'ativa'`,
  );
  return JSON.stringify({ movimentos, chapas, provisoes });
}

async function card(
  codigoPeca: string,
  codigoProcesso: string,
): Promise<{ id: number; status: string; processada: number }> {
  const linha = await db.uma(
    `SELECT c.id, c.status, c.quantidade_processada::float8 AS processada
     FROM cards c
     JOIN componentes co ON co.id = c.componente_id
     JOIN processos p ON p.id = c.processo_id
     WHERE co.codigo = $1 AND p.codigo = $2`,
    [codigoPeca, codigoProcesso],
  );
  if (!linha) throw new Error(`Card ${codigoPeca} ${codigoProcesso} ausente`);
  return {
    id: Number(linha.id),
    status: String(linha.status),
    processada: Number(linha.processada),
  };
}

async function provisao(
  codigoPeca: string,
  codigoProcesso: string,
): Promise<number> {
  const linha = await db.uma(
    `SELECT COALESCE(SUM(pr.quantidade), 0)::float8 AS n
     FROM provisoes pr
     JOIN componentes co ON co.id = pr.componente_id
     JOIN processos p ON p.id = pr.processo_id
     WHERE co.codigo = $1 AND p.codigo = $2 AND pr.status = 'ativa'`,
    [codigoPeca, codigoProcesso],
  );
  return Number(linha?.n ?? 0);
}

beforeEach(async () => {
  const pg = new PGlite();
  await pg.exec(ESQUEMA_SQL);
  db = bancoConsulta(pg);
  mesa = await popularMesa(db);
  const usuario = await db.uma(
    `INSERT INTO usuarios (nome, senha_hash, papel)
     VALUES ('mesa', 'teste', 'gestor') RETURNING id`,
  );
  usuarioId = Number(usuario?.id);
});

describe("Mesa Industrial", () => {
  it("reserva a etapa mais adiantada e gera planos, cards e uma etiqueta por peça", async () => {
    const opId = await criarOp(db, {
      produtoId: mesa.produtoId,
      quantidade: 1,
      usuarioId,
      nests: [
        { nestId: mesa.nests["NEST-A"], repeticoes: 1 },
        { nestId: mesa.nests["NEST-B"], repeticoes: 1 },
      ],
    });

    expect(await provisao("PE", "DOBRA")).toBe(4);
    expect(await provisao("PE", "CORTE")).toBe(0);
    expect(await provisao("TAMPO", "DOBRA")).toBe(1);
    expect(await provisao("TRV-LAT", "CORTE")).toBe(4);
    expect(
      await saldoFisico(db, mesa.componentes.PE, mesa.processos.CORTE),
    ).toBe(30);
    expect(
      await saldoFisico(db, mesa.componentes.PE, mesa.processos.DOBRA),
    ).toBe(12);

    const planos = await db.uma(
      `SELECT COUNT(*)::int AS n FROM planos_corte WHERE op_id = $1 AND status = 'aberto'`,
      [opId],
    );
    expect(Number(planos?.n)).toBe(2);

    const primeiro = await card("TAMPO", "CORTE");
    const segundo = await card("TAMPO", "DOBRA");
    expect(primeiro.status).toBe("liberado");
    expect(segundo.status).toBe("aguardando");

    const etiquetas = await db.uma(
      `SELECT COUNT(*)::int AS pecas, COUNT(DISTINCT componente_id)::int AS distintas
       FROM etiquetas WHERE op_id = $1 AND tipo = 'op'`,
      [opId],
    );
    expect(Number(etiquetas?.pecas)).toBe(8);
    expect(Number(etiquetas?.distintas)).toBe(8);
  });

  it("finaliza o corte, recusa falta e lança a etapa válida", async () => {
    await criarOp(db, {
      produtoId: mesa.produtoId,
      quantidade: 1,
      usuarioId,
      nests: [
        { nestId: mesa.nests["NEST-A"], repeticoes: 1 },
        { nestId: mesa.nests["NEST-B"], repeticoes: 1 },
      ],
    });
    const plano = await db.uma(
      `SELECT pc.id FROM planos_corte pc
       JOIN nests n ON n.id = pc.nest_id
       WHERE n.codigo = 'NEST-B'`,
    );

    const corte = await finalizarPc(db, { pcId: Number(plano?.id), usuarioId });
    expect(corte.ok).toBe(true);
    expect(
      await saldoFisico(db, mesa.componentes.TAMPO, mesa.processos.CORTE),
    ).toBe(1);
    expect(
      await saldoFisico(db, mesa.componentes.PE, mesa.processos.CORTE),
    ).toBe(33);
    expect(
      await saldoFisico(db, mesa.componentes["TRV-FRO"], mesa.processos.CORTE),
    ).toBe(2);
    expect(await saldoInsumo(db, mesa.chapas["CH-201-06"])).toBe(14);
    expect(await saldoInsumo(db, mesa.chapas["CH-430-08"])).toBe(40);
    expect((await card("TAMPO", "CORTE")).status).toBe("concluido");
    expect((await card("TAMPO", "DOBRA")).status).toBe("liberado");
    expect((await card("PE", "CORTE")).processada).toBe(3);
    expect((await card("PE", "DOBRA")).status).toBe("liberado");
    expect(await provisao("TRV-FRO", "CORTE")).toBe(2);

    const antesDaRecusa = await foto();
    const semPeca = await finalizarCard(db, {
      cardId: (await card("PE", "EMB")).id,
      quantidade: 100,
      usuarioId,
    });
    expect(semPeca.ok).toBe(false);
    if (!semPeca.ok)
      expect(semPeca.erro).toContain("Só há 12 peça(s) em Dobra");
    expect(await foto()).toBe(antesDaRecusa);

    const semFilho = await finalizarCard(db, {
      cardId: (await card("EST-TAM", "SOLDA")).id,
      quantidade: 1,
      usuarioId,
    });
    expect(semFilho.ok).toBe(false);
    if (!semFilho.ok) {
      expect(semFilho.erro).toContain("Faltam 2 de Travessa Lateral (TRV-LAT)");
    }
    expect(await foto()).toBe(antesDaRecusa);

    await db.executar(
      `INSERT INTO movimentos (componente_id, processo_id, quantidade, tipo, observacao)
       VALUES ($1, $2, 1, 'saldo_inicial', 'Peça para isolar a falta de insumo')`,
      [mesa.componentes["MESA-IND"], mesa.processos.MONT],
    );
    await db.executar(
      `INSERT INTO chapa_movimentos (chapa_id, quantidade, tipo, observacao)
       VALUES ($1, -35, 'saida_manual', 'Zera a fita para o teste')`,
      [mesa.chapas.FITA],
    );
    const antesDoInsumo = await foto();
    const semInsumo = await finalizarCard(db, {
      cardId: (await card("MESA-IND", "EMB")).id,
      quantidade: 1,
      usuarioId,
    });
    expect(semInsumo.ok).toBe(false);
    if (!semInsumo.ok) {
      expect(semInsumo.erro).toContain(
        "Falta insumo: Fita adesiva 48mm (precisa 0,2, há 0).",
      );
    }
    expect(await foto()).toBe(antesDoInsumo);

    const dobra = await card("PE", "DOBRA");
    const lancamento = await finalizarCard(db, {
      cardId: dobra.id,
      quantidade: 1,
      usuarioId,
    });
    expect(lancamento.ok).toBe(true);
    expect(
      await saldoFisico(db, mesa.componentes.PE, mesa.processos.CORTE),
    ).toBe(32);
    expect(
      await saldoFisico(db, mesa.componentes.PE, mesa.processos.DOBRA),
    ).toBe(13);
    expect(await provisao("PE", "DOBRA")).toBe(5);
    expect((await card("PE", "DOBRA")).processada).toBe(1);
    expect((await card("PE", "EMB")).status).toBe("liberado");

    const eventos = await db.uma(
      `SELECT COUNT(*)::int AS n FROM card_eventos
       WHERE card_id = $1 AND tipo = 'lancamento' AND usuario_id = $2`,
      [dobra.id, usuarioId],
    );
    expect(Number(eventos?.n)).toBe(1);
  });
});
