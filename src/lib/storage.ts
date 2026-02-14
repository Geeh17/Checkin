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
    // @ts-ignore
    return getStore("checkin", { siteID, token });
  }

  return getStore("checkin");
}

export async function readParticipantes(): Promise<Participante[]> {
  try {
    const s = store();
    const data: any = await s.get(KEY, { type: "json" as any });

    const arr = Array.isArray(data)
      ? data
      : typeof data === "string"
        ? JSON.parse(data)
        : data == null
          ? []
          : [];

    return arr.map((p: any) => ({
      ...p,
      tipo: p?.tipo === "APOIO" ? "APOIO" : "PARTICIPANTE",
      equipe: p?.equipe ?? null,
      checkinRealizado: Boolean(p?.checkinRealizado),
      checkinEm: p?.checkinEm ?? null,
    })) as Participante[];
  } catch {}

  if (!fs.existsSync(LOCAL_JSON_PATH)) return [];
  const raw = JSON.parse(fs.readFileSync(LOCAL_JSON_PATH, "utf-8"));

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
    const s = store();
    await s.set(KEY, JSON.stringify(lista));
    return;
  } catch {}

  fs.mkdirSync(path.dirname(LOCAL_JSON_PATH), { recursive: true });
  fs.writeFileSync(LOCAL_JSON_PATH, JSON.stringify(lista, null, 2));
}

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
