import { NextResponse } from "next/server";
import {
  readParticipantes,
  writeParticipantes,
  makeRecordFromName,
} from "@/lib/storage";

function okSecret(req: Request) {
  const expected = process.env.ADMIN_SECRET || "";
  const got = req.headers.get("x-admin-secret") || "";
  return expected && got && expected === got;
}

export async function POST(req: Request) {
  if (!okSecret(req)) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const body = await req.json();
  const arr = Array.isArray(body) ? body : body?.items;
  if (!Array.isArray(arr)) {
    return NextResponse.json(
      { message: "Envie um array JSON." },
      { status: 400 },
    );
  }

  const participantes = await readParticipantes();

  // achar próximo id
  let maxId = 0;
  for (const p of participantes) {
    const n = Number(p.id);
    if (!Number.isNaN(n)) maxId = Math.max(maxId, n);
  }
  let nextId = maxId + 1;

  const adicionados: any[] = [];
  for (const raw of arr) {
    const nomeCompleto = (raw?.nomeCompleto || raw?.nome || raw?.Nome || "")
      .toString()
      .trim();
    if (!nomeCompleto) continue;

    const rec = makeRecordFromName(nomeCompleto, String(nextId++), "APOIO");
    rec.equipe = null; // garantia
    participantes.push(rec);
    adicionados.push(rec);
  }

  await writeParticipantes(participantes);

  return NextResponse.json({
    message: `Importação de APOIO concluída: ${adicionados.length} registro(s).`,
    adicionados: adicionados.length,
  });
}
