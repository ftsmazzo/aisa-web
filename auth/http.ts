export const mensagens: Record<string, string> = {
  nome: "Informe o nome.",
  senha: "A senha precisa ter pelo menos 4 caracteres.",
  credencial: "Nome ou senha não confere.",
  limite: "Muitas tentativas. Espere alguns minutos.",
};

export function validarCredencial(
  nome: string,
  senha: string,
): "nome" | "senha" | null {
  if (nome.length === 0 || nome.length > 80) return "nome";
  if (senha.length < 4) return "senha";
  return null;
}
