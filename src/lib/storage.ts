import fs from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";

export type TipoPessoa = "PARTICIPANTE" | "APOIO";

export type Participante = {
  id: string;
  nomeCompleto: string;
  nomeNormalizado: string;
  tipo: TipoPessoa;
  equipe: "LARANJA" | "VERDE" | "VERMELHO" | null;
  checkinRealizado: boolean;
  checkinEm: string | null;
};

const LOCAL_JSON_PATH = path.join(process.cwd(), "data", "participantes.json");
const KEY = "participantes";

export function normalizarNome(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function store() {
  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_BLOBS_TOKEN;

  if (siteID && token) {
    // assinatura alternativa suportada pelo runtime da Netlify
    // @ts-ignore
    return getStore("checkin", { siteID, token });
  }

  return getStore("checkin");
}

/** Normaliza/migra registros antigos (sem quebrar compatibilidade) */
function normalizeList(input: any): Participante[] {
  const arr = Array.isArray(input) ? input : [];
  return arr.map((p: any) => {
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
  });
}

function readLocal(): Participante[] {
  if (!fs.existsSync(LOCAL_JSON_PATH)) return [];
  const raw = JSON.parse(fs.readFileSync(LOCAL_JSON_PATH, "utf-8"));
  return normalizeList(raw);
}

export async function readParticipantes(): Promise<Participante[]> {
  // 1) tenta Blob
  try {
    const s = store();
    const data: any = await s.get(KEY, { type: "json" as any });

    let arr: any[] = [];
    if (Array.isArray(data)) arr = data;
    else if (typeof data === "string") arr = JSON.parse(data);
    else arr = [];

    const normalized = normalizeList(arr);

    // ✅ 2) Se o Blob estiver vazio, faz bootstrap do JSON local e salva no Blob
    if (normalized.length === 0) {
      const local = readLocal();
      if (local.length > 0) {
        try {
          await s.set(KEY, JSON.stringify(local));
        } catch {
          // se não conseguir salvar, pelo menos devolve local
        }
        return local;
      }
    }

    return normalized;
  } catch {
    // 3) fallback local
    return readLocal();
  }
}

export async function writeParticipantes(lista: Participante[]): Promise<void> {
  const payload = JSON.stringify(normalizeList(lista));

  // 1) tenta Blob
  try {
    const s = store();
    await s.set(KEY, payload);
    return;
  } catch {
    // 2) fallback local
  }

  fs.mkdirSync(path.dirname(LOCAL_JSON_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_JSON_PATH, payload);
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
