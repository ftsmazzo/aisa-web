import { randomBytes } from "node:crypto";
import { and, count, eq, gt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { obterDb } from "@/db/cliente";
import { garantirEsquema } from "@/db/esquema";
import { sessoes, usuarios } from "@/db/tabelas";

export const cookieSessao = "aisa_sessao";
const dias = 14;

export type Usuario = {
  id: number;
  nome: string;
  papel: string;
};

export async function existeUsuario(): Promise<boolean> {
  await garantirEsquema();
  const [linha] = await obterDb().select({ n: count() }).from(usuarios);
  return Number(linha.n) > 0;
}

export async function criarGestor(
  nome: string,
  senhaHash: string,
): Promise<number | null> {
  await garantirEsquema();
  return obterDb().transaction(async (tx) => {
    await tx.execute(sql`LOCK TABLE usuarios IN EXCLUSIVE MODE`);
    const [linha] = await tx.select({ n: count() }).from(usuarios);
    if (Number(linha.n) > 0) return null;
    const [inserido] = await tx
      .insert(usuarios)
      .values({ nome, senhaHash, papel: "gestor" })
      .returning({ id: usuarios.id });
    return inserido.id;
  });
}

export async function buscarPorNome(nome: string) {
  await garantirEsquema();
  const [linha] = await obterDb()
    .select({
      id: usuarios.id,
      nome: usuarios.nome,
      papel: usuarios.papel,
      senhaHash: usuarios.senhaHash,
    })
    .from(usuarios)
    .where(eq(usuarios.nome, nome))
    .limit(1);
  return linha ?? null;
}

export async function abrirSessao(usuarioId: number): Promise<string> {
  const id = randomBytes(32).toString("hex");
  const expiraEm = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  await obterDb().insert(sessoes).values({ id, usuarioId, expiraEm });
  return id;
}

export async function encerrarSessao(id: string | undefined): Promise<void> {
  if (!id) return;
  await garantirEsquema();
  await obterDb().delete(sessoes).where(eq(sessoes.id, id));
}

export async function usuarioAtual(): Promise<Usuario | null> {
  await garantirEsquema();
  const jar = await cookies();
  const id = jar.get(cookieSessao)?.value;
  if (!id) return null;
  const [linha] = await obterDb()
    .select({ id: usuarios.id, nome: usuarios.nome, papel: usuarios.papel })
    .from(sessoes)
    .innerJoin(usuarios, eq(usuarios.id, sessoes.usuarioId))
    .where(and(eq(sessoes.id, id), gt(sessoes.expiraEm, new Date())))
    .limit(1);
  return linha ?? null;
}

export function opcoesCookie() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: dias * 24 * 60 * 60,
  };
}
