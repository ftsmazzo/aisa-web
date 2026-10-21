"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { validarCredencial } from "@/auth/http";
import { loginPermitido, registrarFalha } from "@/auth/limite";
import { conferirSenha, gerarHash } from "@/auth/senha";
import {
  abrirSessao,
  buscarPorNome,
  cookieSessao,
  criarGestor,
  encerrarSessao,
  existeUsuario,
  opcoesCookie,
} from "@/auth/sessao";

async function ipAtual(): Promise<string> {
  const cabecalhos = await headers();
  const encaminhado = cabecalhos.get("x-forwarded-for");
  if (encaminhado) return encaminhado.split(",")[0]?.trim() || "desconhecido";
  return "desconhecido";
}

export async function criarPrimeiroGestor(form: FormData) {
  if (await existeUsuario()) redirect("/login");
  const nome = String(form.get("nome") ?? "").trim();
  const senha = String(form.get("senha") ?? "");
  const erro = validarCredencial(nome, senha);
  if (erro) redirect(`/primeiro-acesso?erro=${erro}`);

  const id = await criarGestor(nome, await gerarHash(senha));
  if (id === null) redirect("/login");

  const jar = await cookies();
  jar.set(cookieSessao, await abrirSessao(id), opcoesCookie());
  redirect("/");
}

export async function entrar(form: FormData) {
  if (!(await existeUsuario())) redirect("/primeiro-acesso");
  const nome = String(form.get("nome") ?? "").trim();
  const senha = String(form.get("senha") ?? "");
  const erro = validarCredencial(nome, senha);
  if (erro) redirect(`/login?erro=${erro}`);

  const ip = await ipAtual();
  if (!(await loginPermitido(ip))) redirect("/login?erro=limite");

  const usuario = await buscarPorNome(nome);
  const confere = usuario
    ? await conferirSenha(senha, usuario.senhaHash)
    : false;
  if (!usuario || !confere) {
    await registrarFalha(ip);
    redirect("/login?erro=credencial");
  }

  const jar = await cookies();
  jar.set(cookieSessao, await abrirSessao(usuario.id), opcoesCookie());
  redirect("/");
}

export async function sair() {
  const jar = await cookies();
  await encerrarSessao(jar.get(cookieSessao)?.value);
  jar.set(cookieSessao, "", { ...opcoesCookie(), maxAge: 0 });
  redirect("/login");
}
