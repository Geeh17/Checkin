import { NextResponse } from "next/server";
import { readParticipantes } from "@/lib/storage";

export async function GET() {
  const participantes = await readParticipantes();

  const summary = {
    LARANJA: 0,
    VERDE: 0,
    VERMELHO: 0,
    SEM_EQUIPE: 0,
    TOTAL: participantes.length,
  };

  for (const p of participantes) {
    if (p.equipe === "LARANJA") summary.LARANJA++;
    else if (p.equipe === "VERDE") summary.VERDE++;
    else if (p.equipe === "VERMELHO") summary.VERMELHO++;
    else summary.SEM_EQUIPE++;
  }

  return NextResponse.json({ summary });
}
