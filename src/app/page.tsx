"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Participante = {
  id: string;
  nomeCompleto: string;
  equipe?: "LARANJA" | "VERDE" | "VERMELHO" | null;
  checkinRealizado: boolean;
  checkinEm?: string | null;
};

function badgeEquipe(equipe?: string | null) {
  if (!equipe) return { label: "—", bg: "#1f2937" };
  if (equipe === "LARANJA") return { label: "LARANJA", bg: "#9a3412" };
  if (equipe === "VERDE") return { label: "VERDE", bg: "#14532d" };
  if (equipe === "VERMELHO") return { label: "VERMELHO", bg: "#7f1d1d" };
  return { label: String(equipe), bg: "#1f2937" };
}

export default function Home() {
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Participante[]>([]);
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const podeBuscar = useMemo(() => q.trim().length >= 2, [q]);

  async function buscar() {
    setMsg("");
    if (!podeBuscar) { setItems([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/participantes/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setItems((data.items || []).map((p: any) => ({ ...p, id: String(p.id) })));
    } catch {
      setMsg("Falha ao buscar participantes.");
    } finally {
      setLoading(false);
    }
  }

  async function checkin(id: string) {
    setMsg("");
    try {
      const res = await fetch(`/api/participantes/${encodeURIComponent(id)}/checkin`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) { setMsg(data.message || "Erro ao fazer check-in."); return; }

      setMsg(data.message || "Check-in realizado!");
      const atualizado = data.participante;

      setItems((prev) => prev.map((p) => (p.id === String(atualizado.id) ? { ...p, ...atualizado } : p)));

      inputRef.current?.focus();
      inputRef.current?.select();
    } catch {
      setMsg("Falha ao fazer check-in.");
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if (podeBuscar) buscar();
      else setItems([]);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Check-in do Evento</h1>
          <p style={{ margin: "6px 0 0", opacity: 0.8 }}>
            Digite o nome (mín. 2 letras). Clique em “Fazer check-in”.
          </p>
        </div>
        <div style={{ padding: 12, background: "#111827", borderRadius: 12, border: "1px solid #1f2937" }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Atalho</div>
          <div style={{ fontSize: 14 }}>Pressione <b>Enter</b> para check-in do primeiro resultado.</div>
        </div>
      </header>

      <section style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && items.length > 0) {
              checkin(items[0].id);
            }
          }}
          placeholder="Digite o nome (ex.: manoel, ana, joão...)"
          style={{
            padding: "14px 12px",
            width: 520,
            borderRadius: 12,
            border: "1px solid #1f2937",
            background: "#0f172a",
            color: "#e6edf3",
            outline: "none",
            fontSize: 16,
          }}
        />

        <button
          onClick={buscar}
          disabled={!podeBuscar || loading}
          style={{
            padding: "14px 16px",
            borderRadius: 12,
            border: "1px solid #1f2937",
            background: !podeBuscar || loading ? "#111827" : "#2563eb",
            color: "#e6edf3",
            cursor: !podeBuscar || loading ? "not-allowed" : "pointer",
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          {loading ? "Buscando..." : "Buscar"}
        </button>

        <div style={{ opacity: 0.8, fontSize: 14 }}>
          {items.length > 0 ? `${items.length} resultado(s)` : (podeBuscar ? "Sem resultados" : "Digite para buscar")}
        </div>
      </section>

      {msg && (
        <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "#111827", border: "1px solid #1f2937" }}>
          <b>{msg}</b>
        </div>
      )}

      <section style={{ marginTop: 18 }}>
        {items.length === 0 ? (
          <div style={{ padding: 18, borderRadius: 16, background: "#0f172a", border: "1px solid #1f2937", opacity: 0.9 }}>
            {podeBuscar ? "Nenhum participante encontrado com esse nome." : "Comece digitando um nome para pesquisar."}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
            {items.map((p) => {
              const equipe = badgeEquipe(p.equipe);
              return (
                <div key={p.id} style={{ padding: 14, borderRadius: 16, background: "#0f172a", border: "1px solid #1f2937" }}>
                  <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{p.nomeCompleto}</div>
                      <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ padding: "4px 10px", borderRadius: 999, background: equipe.bg, fontWeight: 800, fontSize: 12 }}>
                          {equipe.label}
                        </span>
                        <span style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          background: p.checkinRealizado ? "#064e3b" : "#374151",
                          fontWeight: 800,
                          fontSize: 12
                        }}>
                          {p.checkinRealizado ? "CHECK-IN REALIZADO" : "PENDENTE"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => checkin(p.id)}
                      disabled={p.checkinRealizado}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid #1f2937",
                        background: p.checkinRealizado ? "#111827" : "#22c55e",
                        color: "#0b0f17",
                        cursor: p.checkinRealizado ? "not-allowed" : "pointer",
                        fontWeight: 900,
                        whiteSpace: "nowrap"
                      }}
                    >
                      {p.checkinRealizado ? "OK" : "Fazer check-in"}
                    </button>
                  </div>

                  {p.checkinRealizado && p.checkinEm && (
                    <div style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>
                      Check-in em: <b>{new Date(p.checkinEm).toLocaleString("pt-BR")}</b>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <footer style={{ marginTop: 22, opacity: 0.7, fontSize: 12 }}>
        Equipes: LARANJA • VERDE • VERMELHO — Limite: 47 por equipe.
      </footer>
    </main>
  );
}
