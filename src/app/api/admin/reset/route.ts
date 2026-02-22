export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { readParticipantes, writeParticipantes } from "@/lib/storage";

function okSecret(req: Request) {
  const expected = process.env.ADMIN_SECRET || "";
  const got = req.headers.get("x-admin-secret") || "";

  if (process.env.NODE_ENV === "production" && !expected) return false;
  if (!expected) return true;

  return expected === got;
}

/**
 * POST /api/admin/reset
 * Body opcional:
 * { "tipo": "TODOS" | "PARTICIPANTE" | "APOIO" }
 * Default: TODOS
 */
export async function POST(req: Request) {
  if (!okSecret(req)) {
    return NextResponse.json(
      {
        message:
          process.env.NODE_ENV === "production"
            ? "ADMIN_SECRET não configurado/fornecido."
            : "Não autorizado.",
      },
      { status: 401 },
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const tipo = String(body?.tipo ?? "TODOS").toUpperCase();
  const participantes = await readParticipantes();

  let afetados = 0;

  for (const p of participantes) {
    const ehParticipante = p.tipo === "PARTICIPANTE";
    const ehApoio = p.tipo === "APOIO";

    const deveResetar =
      tipo === "TODOS" ||
      (tipo === "PARTICIPANTE" && ehParticipante) ||
      (tipo === "APOIO" && ehApoio);

    if (!deveResetar) continue;

    if (p.checkinRealizado || p.checkinEm || p.equipe) afetados++;

    p.checkinRealizado = false;
    p.checkinEm = null;
    p.equipe = null;
  }

  await writeParticipantes(participantes);

  return NextResponse.json({
    message: "Reset concluído.",
    tipo,
    afetados,
    total: participantes.length,
  });
}
