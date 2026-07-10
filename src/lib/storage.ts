import fs from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";

import { type Equipe } from "./config";

export type TipoPessoa = "PARTICIPANTE" | "APOIO";

export type Participante = {
  id: string;
  nomeCompleto: string;
  nomeNormalizado: string;
  tipo: TipoPessoa;
  equipe: Equipe | null;
  checkinRealizado: boolean;
  checkinEm: string | null;
};

const LOCAL_JSON_PATH = path.join(process.cwd(), "data", "participantes.json");

// Chave única que é a FONTE DA VERDADE. Escritas nela usam ETag (onlyIfMatch)
// para evitar que dois check-ins simultâneos (ex.: dois celulares) se
// sobrescrevam ("last write wins" é o comportamento padrão do Netlify Blobs).
const LEGACY_KEY = "participantes";

// Mantido apenas como espelho de compatibilidade (formato "v2"), útil para
// inspeção manual na UI do Netlify Blobs. NUNCA é usado como fonte de leitura
// primária, para não haver inconsistência entre os dois formatos.
const INDEX_KEY = "participantes:index";
const ITEM_PREFIX = "participantes:item:";

export function normalizarNome(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function store(consistency: "strong" | "eventual" = "eventual") {
  return getStore({ name: "checkin", consistency });
}

function normalizeList(input: any): Participante[] {
  const arr = Array.isArray(input) ? input : [];
  return arr
    .filter((p: any) => p != null) // remove entradas órfãs/corrompidas
    .map((p: any) => {
      const nomeCompleto = String(p?.nomeCompleto ?? "");
      const nomeNormalizado = String(
        p?.nomeNormalizado ?? normalizarNome(nomeCompleto),
      );
      const id = String(p?.id ?? "");

      return {
        ...p,
        id,
        nomeCompleto,
        nomeNormalizado,
        tipo: p?.tipo === "APOIO" ? "APOIO" : "PARTICIPANTE",
        equipe: p?.equipe ?? null,
        checkinRealizado: Boolean(p?.checkinRealizado),
        checkinEm: p?.checkinEm ?? null,
      } as Participante;
    })
    .filter((p) => p.id !== ""); // ids vazios não são registros válidos
}

function readLocal(): Participante[] {
  if (!fs.existsSync(LOCAL_JSON_PATH)) return [];
  const raw = JSON.parse(fs.readFileSync(LOCAL_JSON_PATH, "utf-8"));
  return normalizeList(raw);
}

function writeLocal(lista: Participante[]) {
  const payload = JSON.stringify(normalizeList(lista));
  fs.mkdirSync(path.dirname(LOCAL_JSON_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_JSON_PATH, payload);
}

// Atualiza o espelho v2 (índice + itens). É "melhor esforço": falhas aqui
// nunca devem derrubar uma operação de leitura/escrita real.
async function mirrorToBlobV2(lista: Participante[]): Promise<void> {
  try {
    const s = store();
    const normalized = normalizeList(lista);
    const ids = normalized.map((p) => String(p.id));

    await s.set(INDEX_KEY, JSON.stringify(ids));
    await Promise.all(
      normalized.map((p) => s.set(`${ITEM_PREFIX}${p.id}`, JSON.stringify(p))),
    );
  } catch {
    // best-effort, ignore
  }
}

/**
 * Leitura simples, usada pelas rotas que não fazem read-modify-write
 * (busca, listagem, resumo, import). Não precisa de ETag.
 */
export async function readParticipantes(): Promise<Participante[]> {
  try {
    const s = store();
    const raw: any = await s.get(LEGACY_KEY, { type: "json" as any });

    let arr: any[] = [];
    if (Array.isArray(raw)) arr = raw;
    else if (typeof raw === "string") arr = JSON.parse(raw);

    if (arr.length > 0) return normalizeList(arr);

    // Blob vazio: tenta migrar a partir do arquivo local (primeiro boot).
    const local = readLocal();
    if (local.length > 0) {
      try {
        await s.set(LEGACY_KEY, JSON.stringify(normalizeList(local)), {
          onlyIfNew: true,
        });
        mirrorToBlobV2(local);
      } catch {}
      return local;
    }

    return [];
  } catch {
    // Sem Netlify Blobs disponível (dev local sem `netlify dev`) -> arquivo local.
    return readLocal();
  }
}

/**
 * Escrita simples, sem controle de concorrência. Usada apenas em operações
 * administrativas (import/reset) que não competem tipicamente com o fluxo
 * de check-in do dia do evento.
 */
export async function writeParticipantes(lista: Participante[]): Promise<void> {
  const normalized = normalizeList(lista);
  const payload = JSON.stringify(normalized);

  try {
    const s = store();
    await s.set(LEGACY_KEY, payload);
    mirrorToBlobV2(normalized);
    return;
  } catch {
    writeLocal(normalized);
  }
}

export type ParticipantesParaAtualizar = {
  list: Participante[];
  etag: string | null;
  mode: "blob-existente" | "blob-novo" | "local";
};

/**
 * Leitura "para atualização": devolve também o ETag atual do blob, para que
 * a escrita seguinte possa ser condicional (compare-and-swap) e assim evitar
 * que dois check-ins concorrentes se percam um ao outro.
 */
export async function readParticipantesParaAtualizar(): Promise<ParticipantesParaAtualizar> {
  try {
    const s = store("strong");
    const result: any = await s.getWithMetadata(LEGACY_KEY, {
      type: "json" as any,
    });

    if (result) {
      const raw = Array.isArray(result.data)
        ? result.data
        : typeof result.data === "string"
          ? JSON.parse(result.data)
          : [];
      return { list: normalizeList(raw), etag: result.etag, mode: "blob-existente" };
    }

    // Chave ainda não existe: tenta popular a partir do arquivo local.
    const local = readLocal();
    return { list: local, etag: null, mode: "blob-novo" };
  } catch {
    return { list: readLocal(), etag: null, mode: "local" };
  }
}

/**
 * Escreve a lista de volta de forma condicional. Retorna `false` se outro
 * processo escreveu no meio do caminho (o chamador deve reler e tentar de
 * novo), e `true` em caso de sucesso.
 */
export async function writeParticipantesSeInalterado(
  lista: Participante[],
  etag: string | null,
  mode: ParticipantesParaAtualizar["mode"],
): Promise<boolean> {
  const normalized = normalizeList(lista);
  const payload = JSON.stringify(normalized);

  if (mode === "local") {
    writeLocal(normalized);
    return true;
  }

  const s = store("strong");

  try {
    const { modified } =
      mode === "blob-novo"
        ? await s.set(LEGACY_KEY, payload, { onlyIfNew: true })
        : await s.set(LEGACY_KEY, payload, { onlyIfMatch: etag as string });

    if (modified) {
      mirrorToBlobV2(normalized);
      return true;
    }

    return false;
  } catch {
    // Netlify Blobs indisponível no meio da operação -> não há como garantir
    // atomicidade; melhor falhar a tentativa do que arriscar sobrescrever.
    return false;
  }
}

export function makeRecordFromName(
  nomeCompleto: string,
  id: string,
  tipo: TipoPessoa = "PARTICIPANTE",
): Participante {
  const nomeNormalizado = normalizarNome(nomeCompleto);
  return {
    id: String(id),
    nomeCompleto: String(nomeCompleto),
    nomeNormalizado,
    tipo,
    equipe: null,
    checkinRealizado: false,
    checkinEm: null,
  };
}
