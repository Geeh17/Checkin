export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { readParticipantes } from "@/lib/storage";
import { EQUIPES, type Equipe } from "@/lib/config";

export async function GET() {
  const participantes = await readParticipantes();
  const somenteParticipantes = participantes.filter(
    (p) => p.tipo === "PARTICIPANTE",
  );

  const counts: Record<Equipe, number> = Object.fromEntries(
    EQUIPES.map((e) => [e, 0]),
  ) as Record<Equipe, number>;

  let semEquipe = 0;

  for (const p of somenteParticipantes) {
    if (p.equipe) counts[p.equipe] += 1;
    else semEquipe += 1;
  }

  const total = somenteParticipantes.length;

  return NextResponse.json({
    summary: {
      LARANJA: counts.LARANJA,
      VERDE: counts.VERDE,
      VERMELHO: counts.VERMELHO,
      SEM_EQUIPE: semEquipe,
      TOTAL: total,
    },
  });
}
