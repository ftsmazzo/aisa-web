import { obterSql } from "./cliente";

let pronto = false;

export async function garantirEsquema(): Promise<void> {
  if (pronto) return;
  await obterSql().unsafe(`
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
  `);
  pronto = true;
}
