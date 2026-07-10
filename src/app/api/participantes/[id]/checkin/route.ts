export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  readParticipantesParaAtualizar,
  writeParticipantesSeInalterado,
} from "@/lib/storage";
import { LIMITE_TOTAL } from "@/lib/config";
import { escolherEquipeBalanceada } from "@/lib/equipes";

// Número de tentativas em caso de conflito de escrita concorrente
// (ex.: dois celulares fazendo check-in ao mesmo tempo).
const MAX_TENTATIVAS = 6;

export async function POST(_: Request, ctx: { params: { id: string } }) {
  const id = String(ctx.params.id);

  for (let tentativa = 0; tentativa < MAX_TENTATIVAS; tentativa++) {
    const { list: participantes, etag, mode } =
      await readParticipantesParaAtualizar();

    const idx = participantes.findIndex((p) => String(p.id) === id);

    if (idx === -1) {
      return NextResponse.json(
        { message: "Participante não encontrado." },
        { status: 404 },
      );
    }

    const participante = { ...participantes[idx] };

    if (participante.checkinRealizado) {
      return NextResponse.json({
        message: "Check-in já realizado.",
        participante,
      });
    }

    if (participante.tipo === "APOIO") {
      participante.equipe = null;
    } else if (!participante.equipe) {
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

    participante.checkinRealizado = true;
    participante.checkinEm = new Date().toISOString();

    const atualizados = [...participantes];
    atualizados[idx] = participante;

    const sucesso = await writeParticipantesSeInalterado(
      atualizados,
      etag,
      mode,
    );

    if (sucesso) {
      return NextResponse.json({
        message: "Check-in realizado com sucesso!",
        participante,
      });
    }

    // Conflito: outro check-in escreveu no meio do caminho.
    // Relê os dados atuais e tenta novamente (com um pequeno jitter).
    await new Promise((r) => setTimeout(r, 30 + Math.random() * 70));
  }

  return NextResponse.json(
    {
      message:
        "Muitas tentativas simultâneas de check-in agora. Tente novamente em instantes.",
    },
    { status: 409 },
  );
}
