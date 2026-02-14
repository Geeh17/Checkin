import { NextResponse } from "next/server";
import { readParticipantes, writeParticipantes } from "@/lib/storage";

const EQUIPES = ["LARANJA", "VERDE", "VERMELHO"] as const;
const LIMITE_POR_EQUIPE = 47;

// ✅ Conta e escolhe equipe somente entre PARTICIPANTES
function escolherEquipe(lista: any[]) {
  const counts: Record<string, number> = { LARANJA: 0, VERDE: 0, VERMELHO: 0 };

  for (const p of lista) {
    if (
      p?.tipo === "PARTICIPANTE" &&
      p.equipe &&
      counts[p.equipe] !== undefined
    ) {
      counts[p.equipe] += 1;
    }
  }

  const disponiveis = EQUIPES.filter((e) => counts[e] < LIMITE_POR_EQUIPE);
  if (disponiveis.length === 0) return null;

  return disponiveis[Math.floor(Math.random() * disponiveis.length)];
}

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
    // ✅ Só PARTICIPANTE ganha equipe (se ainda não tiver)
    if (!participante.equipe) {
      const equipe = escolherEquipe(participantes);
      if (!equipe) {
        return NextResponse.json(
          { message: "Todas as equipes atingiram o limite." },
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
