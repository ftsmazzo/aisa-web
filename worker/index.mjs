import { spawn } from "node:child_process";
import { mkdir, readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";

const backupDir = process.env.BACKUP_DIR || "/data/backups";
const umDia = 24 * 60 * 60 * 1000;
const trintaDias = 30 * umDia;

function executarDump(destino) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("[backup] DATABASE_URL ausente");
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const child = spawn(
      "pg_dump",
      ["--format=custom", "--file", destino, "--dbname", url],
      { stdio: "inherit" },
    );
    child.on("error", (erro) => {
      console.log("[backup] pg_dump indisponível:", erro.message);
      resolve(false);
    });
    child.on("exit", (codigo) => {
      console.log(`[backup] pg_dump encerrou com código ${codigo}`);
      resolve(codigo === 0);
    });
  });
}

async function backupDiario() {
  await mkdir(backupDir, { recursive: true });
  const arquivos = await readdir(backupDir);
  const agora = Date.now();
  let recente = false;

  for (const arquivo of arquivos) {
    const caminho = path.join(backupDir, arquivo);
    const info = await stat(caminho);
    if (agora - info.mtimeMs < umDia && arquivo.endsWith(".dump")) {
      recente = true;
    }
    if (agora - info.mtimeMs > trintaDias) {
      await unlink(caminho);
      console.log("[backup] removido", arquivo);
    }
  }

  if (recente) {
    console.log("[backup] já existe cópia nas últimas 24 horas");
    return;
  }

  const nome = `aisa-${new Date().toISOString().replace(/[:.]/g, "-")}.dump`;
  await executarDump(path.join(backupDir, nome));
}

console.log("[worker] AISA aguardando o ciclo de backup");
backupDiario().catch((erro) => console.log("[backup] falha", erro.message));
setInterval(() => {
  backupDiario().catch((erro) => console.log("[backup] falha", erro.message));
}, umDia);
