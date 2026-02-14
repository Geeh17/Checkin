import fs from "fs";
import path from "path";
import { getStore } from "@netlify/blobs";

export type Participante = {
  id: string;
  nomeCompleto: string;
  nomeNormalizado: string;
  equipe: "LARANJA" | "VERDE" | "VERMELHO" | null;
  checkinRealizado: boolean;
  checkinEm: string | null;
};

const LOCAL_JSON_PATH = path.join(process.cwd(), "data", "participantes.json");
const KEY = "participantes";

export function normalizarNome(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
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
      if (Array.isArray(data)) return data as Participante[];
      if (typeof data === "string") return JSON.parse(data) as Participante[];
      if (data == null) return [];
    }
  } catch {
    // fallback local
  }

  if (!fs.existsSync(LOCAL_JSON_PATH)) return [];
  return JSON.parse(fs.readFileSync(LOCAL_JSON_PATH, "utf-8"));
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

export function makeRecordFromName(nomeCompleto: string, id: string): Participante {
  const nomeNormalizado = normalizarNome(nomeCompleto);
  return {
    id,
    nomeCompleto,
    nomeNormalizado,
    equipe: null,
    checkinRealizado: false,
    checkinEm: null,
  };
}
