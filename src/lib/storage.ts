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

const LEGACY_KEY = "participantes";

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

function store() {
  return getStore("checkin");
}

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

async function readFromBlobV2(): Promise<Participante[] | null> {
  const s = store();

  const index: any = await s.get(INDEX_KEY, { type: "json" as any });
  let ids: string[] = [];

  if (Array.isArray(index)) ids = index.map((x) => String(x));
  else if (typeof index === "string") {
    try {
      const parsed = JSON.parse(index);
      if (Array.isArray(parsed)) ids = parsed.map((x) => String(x));
    } catch {
      ids = [];
    }
  }

  if (ids.length === 0) return null;

  const items = await Promise.all(
    ids.map(async (id) => {
      const raw: any = await s.get(`${ITEM_PREFIX}${id}`, {
        type: "json" as any,
      });
      return raw;
    }),
  );

  return normalizeList(items);
}

async function writeToBlobV2(lista: Participante[]): Promise<void> {
  const s = store();
  const normalized = normalizeList(lista);

  const ids = normalized.map((p) => String(p.id));
  await s.set(INDEX_KEY, JSON.stringify(ids));

  await Promise.all(
    normalized.map((p) => s.set(`${ITEM_PREFIX}${p.id}`, JSON.stringify(p))),
  );
}

export async function readParticipantes(): Promise<Participante[]> {
  try {
    try {
      const v2 = await readFromBlobV2();
      if (v2 && v2.length > 0) return v2;
    } catch {}

    const s = store();
    const data: any = await s.get(LEGACY_KEY, { type: "json" as any });

    let arr: any[] = [];
    if (Array.isArray(data)) arr = data;
    else if (typeof data === "string") arr = JSON.parse(data);
    else arr = [];

    const normalized = normalizeList(arr);

    if (normalized.length === 0) {
      const local = readLocal();
      if (local.length > 0) {
        try {
          await writeToBlobV2(local);
          await s.set(LEGACY_KEY, JSON.stringify(local));
        } catch {}
        return local;
      }
    }

    if (normalized.length > 0) {
      try {
        await writeToBlobV2(normalized);
      } catch {}
    }

    return normalized;
  } catch {
    return readLocal();
  }
}

export async function writeParticipantes(lista: Participante[]): Promise<void> {
  const payload = JSON.stringify(normalizeList(lista));

  try {
    await writeToBlobV2(lista);
    const s = store();
    await s.set(LEGACY_KEY, payload);
    return;
  } catch {}

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
