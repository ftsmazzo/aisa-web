import { redirect } from "next/navigation";
import { criarPrimeiroGestor } from "@/auth/acoes";
import { mensagens } from "@/auth/http";
import { existeUsuario, usuarioAtual } from "@/auth/sessao";
import Moldura, { Aviso, Botao, Campo } from "../moldura";

export const dynamic = "force-dynamic";

export default async function PrimeiroAcessoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  if (await existeUsuario()) redirect("/login");
  if (await usuarioAtual()) redirect("/");
  const { erro } = await searchParams;

  return (
    <Moldura
      titulo="Criar o gestor"
      texto="Esta tela aparece uma vez, enquanto não existe ninguém cadastrado. Depois o acesso é só com nome e senha."
    >
      <form action={criarPrimeiroGestor}>
        <Aviso texto={erro ? mensagens[erro] : undefined} />
        <Campo id="nome" rotulo="Nome" tipo="text" autoComplete="username" />
        <Campo
          id="senha"
          rotulo="Senha"
          tipo="password"
          autoComplete="new-password"
        />
        <Botao>Criar e entrar</Botao>
      </form>
    </Moldura>
  );
}
