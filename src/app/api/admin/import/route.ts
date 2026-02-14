import { NextResponse } from "next/server";
import { makeRecordFromName, normalizarNome, readParticipantes, writeParticipantes } from "@/lib/storage";

function unauthorized() {
  return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
}

export async function POST(req: Request) {
  const secret = process.env.ADMIN_SECRET;
  const headerSecret = req.headers.get("x-admin-secret") || "";

  if (!secret || headerSecret !== secret) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!Array.isArray(body)) {
    return NextResponse.json({ message: "Envie um JSON: [{ nomeCompleto: "..." }, ...]" }, { status: 400 });
  }

  const atual = await readParticipantes();
  const mapa = new Map<string, any>();
  for (const p of atual) mapa.set(p.nomeNormalizado, p);

  let added = 0;
  let nextId = atual.length + 1;

  for (const raw of body) {
    const nomeCompleto = (raw?.nomeCompleto || raw?.nome || raw?.Nome || "").toString().trim();
    if (!nomeCompleto) continue;

    const nomeNormalizado = normalizarNome(nomeCompleto);
    if (mapa.has(nomeNormalizado)) continue;

    const rec = makeRecordFromName(nomeCompleto, String(nextId));
    nextId++;
    mapa.set(rec.nomeNormalizado, rec);
    added++;
  }

  const lista = Array.from(mapa.values()).sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto));
  await writeParticipantes(lista);

  return NextResponse.json({ message: "Importação concluída.", total: lista.length, added });
}
