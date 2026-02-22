import { EQUIPES, LIMITE_POR_EQUIPE, type Equipe } from "./config";
import type { Participante } from "./storage";

export function contagemPorEquipe(participantes: Participante[]) {
  const counts: Record<Equipe, number> = Object.fromEntries(
    EQUIPES.map((e) => [e, 0]),
  ) as Record<Equipe, number>;

  for (const p of participantes) {
    if (p.tipo !== "PARTICIPANTE") continue;
    if (!p.checkinRealizado) continue;
    if (!p.equipe) continue;
    counts[p.equipe] = (counts[p.equipe] ?? 0) + 1;
  }

  return counts;
}

export function escolherEquipeBalanceada(
  participantes: Participante[],
): Equipe | null {
  const counts = contagemPorEquipe(participantes);
  const disponiveis = EQUIPES.filter((e) => counts[e] < LIMITE_POR_EQUIPE);
  if (disponiveis.length === 0) return null;

  const menor = Math.min(...disponiveis.map((e) => counts[e]));
  const candidatas = disponiveis.filter((e) => counts[e] === menor);

  return candidatas[Math.floor(Math.random() * candidatas.length)];
}
