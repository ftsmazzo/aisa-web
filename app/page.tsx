import { redirect } from "next/navigation";
import { sair } from "@/auth/acoes";
import { existeUsuario, usuarioAtual } from "@/auth/sessao";
import { Botao } from "./moldura";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!(await existeUsuario())) redirect("/primeiro-acesso");
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login");

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "72px 24px" }}>
      <p style={{ margin: 0, color: "#0152f1", fontWeight: 700 }}>AISA</p>
      <h1 style={{ fontSize: 32, margin: "8px 0 12px" }}>
        Olá, {usuario.nome}
      </h1>
      <p style={{ color: "#6b7280", lineHeight: 1.6 }}>
        Você entrou como gestor. Ordens, corte e kanban entram na fase seguinte.
      </p>
      <form action={sair} style={{ maxWidth: 220 }}>
        <Botao>Sair</Botao>
      </form>
    </main>
  );
}
