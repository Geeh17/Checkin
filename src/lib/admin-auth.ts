import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

/**
 * Verifica o header `x-admin-secret` contra a variável de ambiente
 * ADMIN_SECRET.
 *
 * - Em produção sem ADMIN_SECRET configurado -> bloqueia sempre.
 * - Em dev sem ADMIN_SECRET configurado -> libera (facilita testes locais).
 * - Comparação em tempo constante para reduzir risco de timing attack.
 */
export function isAdminAuthorized(req: Request): boolean {
  const expected = process.env.ADMIN_SECRET || "";
  const got = req.headers.get("x-admin-secret") || "";

  if (process.env.NODE_ENV === "production" && !expected) return false;
  if (!expected) return true;

  const a = Buffer.from(expected);
  const b = Buffer.from(got);

  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function adminUnauthorizedResponse() {
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
