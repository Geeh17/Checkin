export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { readParticipantes } from "@/lib/storage";

export async function GET() {
  const participantes = await readParticipantes();
  return NextResponse.json({ items: participantes });
}
