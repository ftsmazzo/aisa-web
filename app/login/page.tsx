import { redirect } from "next/navigation";
import { entrar } from "@/auth/acoes";
import { mensagens } from "@/auth/http";
import { existeUsuario, usuarioAtual } from "@/auth/sessao";
import Moldura, { Aviso, Botao, Campo } from "../moldura";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if (!(await existeUsuario())) redirect("/primeiro-acesso");
  if (await usuarioAtual()) redirect("/");
  const { erro } = await searchParams;

  return (
    <Moldura titulo="Entrar" texto="Use o nome e a senha do gestor.">
      <form action={entrar}>
        <Aviso texto={erro ? mensagens[erro] : undefined} />
        <Campo id="nome" rotulo="Nome" tipo="text" autoComplete="username" />
        <Campo
          id="senha"
          rotulo="Senha"
          tipo="password"
          autoComplete="current-password"
        />
        <Botao>Entrar</Botao>
      </form>
    </Moldura>
  );
}
