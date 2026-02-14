export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  makeRecordFromName,
  readParticipantes,
  writeParticipantes,
} from "@/lib/storage";

function okSecret(req: Request) {
  const expected = process.env.ADMIN_SECRET || "";
  const got = req.headers.get("x-admin-secret") || "";
  // Se você não usa segredo em dev, deixe ADMIN_SECRET vazio e libere localmente
  if (!expected) return true;
  return expected === got;
}

export async function POST(req: Request) {
  if (!okSecret(req)) {
    return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  if (!Array.isArray(body)) {
    return NextResponse.json(
      {
        message:
          'Envie um JSON no formato: [{"nomeCompleto":"Fulano"}, {"nomeCompleto":"Ciclano"}]',
      },
      { status: 400 },
    );
  }

  const atual = await readParticipantes();

  // Próximo ID numérico
  let maxId = 0;
  for (const p of atual as any[]) {
    const n = Number(p?.id);
    if (!Number.isNaN(n)) maxId = Math.max(maxId, n);
  }
  let nextId = maxId + 1;

  let adicionados = 0;

  for (const raw of body as any[]) {
    const nomeCompleto = (raw?.nomeCompleto || raw?.nome || raw?.Nome || "")
      .toString()
      .trim();
    if (!nomeCompleto) continue;

    // PARTICIPANTE é o padrão aqui (apoio entra pelo /import-apoio)
    const rec = makeRecordFromName(
      nomeCompleto,
      String(nextId++),
      "PARTICIPANTE",
    );

    atual.push(rec as any);
    adicionados++;
  }

  await writeParticipantes(atual as any);

  return NextResponse.json({
    message: `Importação concluída: ${adicionados} registro(s).`,
    adicionados,
    total: atual.length,
  });
}
