import { NextResponse } from "next/server";
import { readParticipantes } from "@/lib/storage";

const EQUIPES = ["LARANJA", "VERDE", "VERMELHO"] as const;

export async function GET() {
  const participantes = await readParticipantes();

  // ✅ conta somente PARTICIPANTE (APOIO fica fora)
  const somenteParticipantes = participantes.filter(
    (p: any) => (p?.tipo || "PARTICIPANTE") === "PARTICIPANTE",
  );

  const counts: Record<string, number> = { LARANJA: 0, VERDE: 0, VERMELHO: 0 };
  let semEquipe = 0;

  for (const p of somenteParticipantes) {
    if (p.equipe && (counts as any)[p.equipe] !== undefined) {
      counts[p.equipe] += 1;
    } else {
      semEquipe += 1;
    }
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
