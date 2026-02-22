export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { readParticipantes, writeParticipantes } from "@/lib/storage";
import { LIMITE_TOTAL } from "@/lib/config";
import { escolherEquipeBalanceada } from "@/lib/equipes";

export async function POST(_: Request, ctx: { params: { id: string } }) {
  const id = String(ctx.params.id);

  const participantes = await readParticipantes();
  const idx = participantes.findIndex((p) => String(p.id) === id);

  if (idx === -1) {
    return NextResponse.json(
      { message: "Participante não encontrado." },
      { status: 404 },
    );
  }

  const participante = participantes[idx];

  // ✅ Idempotente
  if (participante.checkinRealizado) {
    return NextResponse.json({
      message: "Check-in já realizado.",
      participante,
    });
  }

  // ✅ APOIO nunca entra em equipe
  if (participante.tipo === "APOIO") {
    participante.equipe = null;
  } else {
    // ✅ Só PARTICIPANTE ganha equipe
    if (!participante.equipe) {
      const equipe = escolherEquipeBalanceada(participantes);

      if (!equipe) {
        return NextResponse.json(
          {
            message: `Capacidade total atingida (3 equipes x 47 = ${LIMITE_TOTAL}).`,
          },
          { status: 409 },
        );
      }

      participante.equipe = equipe;
    }
  }

  participante.checkinRealizado = true;
  participante.checkinEm = new Date().toISOString();

  participantes[idx] = participante;
  await writeParticipantes(participantes);

  return NextResponse.json({
    message: "Check-in realizado com sucesso!",
    participante,
  });
}
