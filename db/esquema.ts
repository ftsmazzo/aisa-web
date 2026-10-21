import { obterSql } from "./cliente";
import { ESQUEMA_SQL } from "./esquema-sql";

let pronto = false;

export async function garantirEsquema(): Promise<void> {
  if (pronto) return;
  await obterSql().unsafe(ESQUEMA_SQL);
  pronto = true;
}
