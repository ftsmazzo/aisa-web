import type postgres from "postgres";
import { obterSql } from "@/db/cliente";

export type Linha = Record<string, unknown>;

export type Banco = {
  todas<T extends Linha = Linha>(
    texto: string,
    params?: unknown[],
  ): Promise<T[]>;
  uma<T extends Linha = Linha>(
    texto: string,
    params?: unknown[],
  ): Promise<T | null>;
  executar(texto: string, params?: unknown[]): Promise<void>;
  transacao<T>(fn: (tx: Banco) => Promise<T>): Promise<T>;
};

type Consulta = {
  query: (
    texto: string,
    params?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[] }>;
  transaction?: <T>(fn: (tx: Consulta) => Promise<T>) => Promise<T>;
};

type SqlExecutor = {
  unsafe: (
    texto: string,
    params?: unknown[],
  ) => Promise<Record<string, unknown>[]>;
  begin: <T>(fn: (tx: SqlExecutor) => Promise<T>) => Promise<T>;
};

function deLinhas(linhas: Record<string, unknown>[]): Linha[] {
  return linhas;
}

export function bancoPostgres(sql: postgres.Sql): Banco {
  return adaptarSql(sql as unknown as SqlExecutor);
}

export function bancoAtual(): Banco {
  return bancoPostgres(obterSql());
}

function adaptarSql(sql: SqlExecutor): Banco {
  return {
    async todas<T extends Linha = Linha>(
      texto: string,
      params: unknown[] = [],
    ) {
      return deLinhas(await sql.unsafe(texto, params)) as T[];
    },
    async uma<T extends Linha = Linha>(texto: string, params: unknown[] = []) {
      const linhas = await sql.unsafe(texto, params);
      return (linhas[0] as T | undefined) ?? null;
    },
    async executar(texto, params = []) {
      await sql.unsafe(texto, params);
    },
    transacao(fn) {
      return sql.begin((tx) => fn(adaptarSql(tx)));
    },
  };
}

export function bancoConsulta(consulta: Consulta): Banco {
  return {
    async todas<T extends Linha = Linha>(
      texto: string,
      params: unknown[] = [],
    ) {
      const resultado = await consulta.query(texto, params);
      return deLinhas(resultado.rows) as T[];
    },
    async uma<T extends Linha = Linha>(texto: string, params: unknown[] = []) {
      const resultado = await consulta.query(texto, params);
      return (resultado.rows[0] as T | undefined) ?? null;
    },
    async executar(texto, params = []) {
      await consulta.query(texto, params);
    },
    transacao(fn) {
      if (!consulta.transaction) {
        return fn(bancoConsulta(consulta));
      }
      return consulta.transaction((tx) => fn(bancoConsulta(tx)));
    },
  };
}
