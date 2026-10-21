import { argon2id, argon2Verify } from "hash-wasm";

const memoriaKiB = 19456;

export async function gerarHash(senha: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return argon2id({
    password: senha,
    salt,
    parallelism: 1,
    iterations: 2,
    memorySize: memoriaKiB,
    hashLength: 32,
    outputType: "encoded",
  });
}

export async function conferirSenha(
  senha: string,
  hash: string,
): Promise<boolean> {
  try {
    return await argon2Verify({ password: senha, hash });
  } catch {
    return false;
  }
}
