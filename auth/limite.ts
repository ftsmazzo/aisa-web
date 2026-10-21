import Redis from "ioredis";

const janelaSegundos = 15 * 60;
const maximo = 10;

const globalParaRedis = globalThis as unknown as { redis?: Redis };

function cliente(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!globalParaRedis.redis) {
    globalParaRedis.redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
  }
  return globalParaRedis.redis;
}

export function ipDaRequisicao(request: Request): string {
  const encaminhado = request.headers.get("x-forwarded-for");
  if (encaminhado) return encaminhado.split(",")[0]?.trim() || "desconhecido";
  return "desconhecido";
}

export async function loginPermitido(ip: string): Promise<boolean> {
  const redis = cliente();
  if (!redis) return true;
  try {
    if (redis.status === "wait") await redis.connect();
    const atual = Number((await redis.get(`aisa:login:${ip}`)) ?? "0");
    return atual < maximo;
  } catch {
    return true;
  }
}

export async function registrarFalha(ip: string): Promise<void> {
  const redis = cliente();
  if (!redis) return;
  try {
    if (redis.status === "wait") await redis.connect();
    const chave = `aisa:login:${ip}`;
    const n = await redis.incr(chave);
    if (n === 1) await redis.expire(chave, janelaSegundos);
  } catch {
    /* o login segue mesmo se o limite estiver indisponível */
  }
}
