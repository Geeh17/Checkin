export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { normalizarNome, readParticipantes } from "@/lib/storage";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const qRaw = (searchParams.get("q") || "").trim();

  if (!qRaw || qRaw.length < 2) return NextResponse.json({ items: [] });

  const q = normalizarNome(qRaw);
  const participantes = await readParticipantes();

  const items = participantes
    .filter((p: any) => (p?.nomeNormalizado || "").includes(q))
    .sort((a: any, b: any) => {
      const ta = a?.tipo === "APOIO" ? 1 : 0;
      const tb = b?.tipo === "APOIO" ? 1 : 0;
      if (ta !== tb) return ta - tb;

      return (a?.nomeCompleto || "").localeCompare(b?.nomeCompleto || "");
    })
    .slice(0, 30);

  return NextResponse.json({ items });
}
