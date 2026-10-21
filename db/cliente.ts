import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as tabelas from "./tabelas";

const globalParaDb = globalThis as unknown as {
  sql?: postgres.Sql;
  db?: ReturnType<typeof drizzle<typeof tabelas>>;
};

export function obterSql(): postgres.Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL ausente");
  if (!globalParaDb.sql) {
    globalParaDb.sql = postgres(url, { max: 5 });
  }
  return globalParaDb.sql;
}

export function obterDb() {
  if (!globalParaDb.db) {
    globalParaDb.db = drizzle(obterSql(), { schema: tabelas });
  }
  return globalParaDb.db;
}
