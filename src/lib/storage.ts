import fs from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";

export type TipoPessoa = "PARTICIPANTE" | "APOIO";

export type Participante = {
  id: string;
  nomeCompleto: string;
  nomeNormalizado: string;
  tipo: TipoPessoa; // ✅ NOVO
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

function isNetlifyEnv() {
  return Boolean(process.env.NETLIFY || process.env.NETLIFY_LOCAL);
}

function store() {
  return getStore({ name: "checkin", consistency: "strong" });
}

export async function readParticipantes(): Promise<Participante[]> {
  try {
    if (isNetlifyEnv()) {
      const s = store();
      const data: any = await s.get(KEY, { type: "json" as any });
      let arr: any[] = [];

      if (Array.isArray(data)) arr = data;
      else if (typeof data === "string") arr = JSON.parse(data);
      else if (data == null) arr = [];

      // ✅ Migração leve: se vier registro antigo sem "tipo", define PARTICIPANTE
      return arr.map((p: any) => ({
        ...p,
        tipo: p?.tipo === "APOIO" ? "APOIO" : "PARTICIPANTE",
        equipe: p?.equipe ?? null,
        checkinRealizado: Boolean(p?.checkinRealizado),
        checkinEm: p?.checkinEm ?? null,
      })) as Participante[];
    }
  } catch {
    // fallback local
  }

  if (!fs.existsSync(LOCAL_JSON_PATH)) return [];

  const raw = JSON.parse(fs.readFileSync(LOCAL_JSON_PATH, "utf-8"));

  // ✅ Migração leve local também
  return (Array.isArray(raw) ? raw : []).map((p: any) => ({
    ...p,
    tipo: p?.tipo === "APOIO" ? "APOIO" : "PARTICIPANTE",
    equipe: p?.equipe ?? null,
    checkinRealizado: Boolean(p?.checkinRealizado),
    checkinEm: p?.checkinEm ?? null,
  })) as Participante[];
}

export async function writeParticipantes(lista: Participante[]): Promise<void> {
  try {
    if (isNetlifyEnv()) {
      const s = store();
      await s.set(KEY, JSON.stringify(lista));
      return;
    }
  } catch {
    // fallback local
  }

  fs.mkdirSync(path.dirname(LOCAL_JSON_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_JSON_PATH, JSON.stringify(lista, null, 2));
}

/**
 * ✅ Agora aceita o 3º parâmetro "tipo".
 * - Se não passar, vira PARTICIPANTE (não quebra seu import antigo)
 */
export function makeRecordFromName(
  nomeCompleto: string,
  id: string,
  tipo: TipoPessoa = "PARTICIPANTE",
): Participante {
  const nomeNormalizado = normalizarNome(nomeCompleto);

  return {
    id,
    nomeCompleto,
    nomeNormalizado,
    tipo,
    equipe: null,
    checkinRealizado: false,
    checkinEm: null,
  };
}
