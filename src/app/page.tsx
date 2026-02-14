"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Equipe = "LARANJA" | "VERDE" | "VERMELHO";

type Participante = {
  id: string;
  nomeCompleto: string;
  equipe?: Equipe | null;
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

  // ===== Resumo =====
  const [openResumo, setOpenResumo] = useState(false);
  const [resumo, setResumo] = useState<any>(null);

  async function carregarResumo() {
    try {
      const res = await fetch("/api/participantes/summary");
      const data = await res.json();
      setResumo(data.summary);
    } catch {
      setResumo(null);
    }
  }

  // ===== Relatório / PDF =====
  const [openRelatorio, setOpenRelatorio] = useState(false);
  const [relatorio, setRelatorio] = useState<Participante[]>([]);
  const [filtroEquipe, setFiltroEquipe] = useState<"TODOS" | Equipe>("TODOS");

  async function carregarRelatorio() {
    try {
      const res = await fetch("/api/participantes/list");
      const data = await res.json();
      setRelatorio(
        (data.items || []).map((p: any) => ({ ...p, id: String(p.id) })),
      );
    } catch {
      setRelatorio([]);
    }
  }

  const podeBuscar = useMemo(() => q.trim().length >= 2, [q]);

  async function buscar() {
    setMsg("");
    if (!podeBuscar) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/participantes/search?q=${encodeURIComponent(q.trim())}`,
      );
      const data = await res.json();
      setItems(
        (data.items || []).map((p: any) => ({ ...p, id: String(p.id) })),
      );
    } catch {
      setMsg("Falha ao buscar participantes.");
    } finally {
      setLoading(false);
    }
  }

  async function checkin(id: string) {
    setMsg("");
    try {
      const res = await fetch(
        `/api/participantes/${encodeURIComponent(id)}/checkin`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.message || "Erro ao fazer check-in.");
        return;
      }

      setMsg(data.message || "Check-in realizado!");
      const atualizado = data.participante;

      setItems((prev) =>
        prev.map((p) =>
          p.id === String(atualizado.id) ? { ...p, ...atualizado } : p,
        ),
      );

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

  function listaEquipe(equipe: Equipe) {
    return relatorio
      .filter((p) => p.equipe === equipe)
      .sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto));
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>Check-in Umadjuf 2026</h1>
          <p style={{ margin: "6px 0 0", opacity: 0.8 }}>
            Digite o nome (mín. 2 letras). Clique em “Fazer check-in”.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              padding: 12,
              background: "#111827",
              borderRadius: 12,
              border: "1px solid #1f2937",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.8 }}>Atalho</div>
            <div style={{ fontSize: 14 }}>
              Pressione <b>Enter</b> para check-in do primeiro resultado.
            </div>
          </div>

          <button
            onClick={async () => {
              await carregarResumo();
              setOpenResumo(true);
            }}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #1f2937",
              background: "#111827",
              color: "#e6edf3",
              cursor: "pointer",
              fontWeight: 800,
              height: 52,
              whiteSpace: "nowrap",
            }}
          >
            Ver equipes
          </button>

          <button
            onClick={async () => {
              await carregarRelatorio();
              setOpenRelatorio(true);
            }}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #1f2937",
              background: "#111827",
              color: "#e6edf3",
              cursor: "pointer",
              fontWeight: 800,
              height: 52,
              whiteSpace: "nowrap",
            }}
          >
            Relatório / PDF
          </button>
        </div>
      </header>

      <section
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
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
            maxWidth: "100%",
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
          {items.length > 0
            ? `${items.length} resultado(s)`
            : podeBuscar
              ? "Sem resultados"
              : "Digite para buscar"}
        </div>
      </section>

      {msg && (
        <div
          style={{
            marginTop: 14,
            padding: 12,
            borderRadius: 12,
            background: "#111827",
            border: "1px solid #1f2937",
          }}
        >
          <b>{msg}</b>
        </div>
      )}

      <section style={{ marginTop: 18 }}>
        {items.length === 0 ? (
          <div
            style={{
              padding: 18,
              borderRadius: 16,
              background: "#0f172a",
              border: "1px solid #1f2937",
              opacity: 0.9,
            }}
          >
            {podeBuscar
              ? "Nenhum participante encontrado com esse nome."
              : "Comece digitando um nome para pesquisar."}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 12,
            }}
          >
            {items.map((p) => {
              const equipe = badgeEquipe(p.equipe);
              return (
                <div
                  key={p.id}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    background: "#0f172a",
                    border: "1px solid #1f2937",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "start",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>
                        {p.nomeCompleto}
                      </div>

                      <div
                        style={{
                          marginTop: 6,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            background: equipe.bg,
                            fontWeight: 800,
                            fontSize: 12,
                          }}
                        >
                          {equipe.label}
                        </span>

                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 999,
                            background: p.checkinRealizado
                              ? "#064e3b"
                              : "#374151",
                            fontWeight: 800,
                            fontSize: 12,
                          }}
                        >
                          {p.checkinRealizado
                            ? "CHECK-IN REALIZADO"
                            : "PENDENTE"}
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
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.checkinRealizado ? "OK" : "Fazer check-in"}
                    </button>
                  </div>

                  {p.checkinRealizado && p.checkinEm && (
                    <div style={{ marginTop: 10, opacity: 0.85, fontSize: 13 }}>
                      Check-in em:{" "}
                      <b>{new Date(p.checkinEm).toLocaleString("pt-BR")}</b>
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

      {/* ===== MODAL RESUMO ===== */}
      {openResumo && (
        <div
          onClick={() => setOpenResumo(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              background: "#0f172a",
              border: "1px solid #1f2937",
              borderRadius: 16,
              padding: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0 }}>Resumo das equipes</h3>

              <button
                onClick={() => setOpenResumo(false)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid #1f2937",
                  background: "#111827",
                  color: "#e6edf3",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                Fechar
              </button>
            </div>

            {!resumo ? (
              <p style={{ opacity: 0.8, marginTop: 12 }}>Carregando...</p>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #1f2937",
                  }}
                >
                  🟠 <b>LARANJA:</b> {resumo.LARANJA}
                </div>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #1f2937",
                  }}
                >
                  🟢 <b>VERDE:</b> {resumo.VERDE}
                </div>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #1f2937",
                  }}
                >
                  🔴 <b>VERMELHO:</b> {resumo.VERMELHO}
                </div>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #1f2937",
                    opacity: 0.9,
                  }}
                >
                  ⏳ <b>Sem equipe:</b> {resumo.SEM_EQUIPE}
                </div>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #1f2937",
                    opacity: 0.9,
                  }}
                >
                  👥 <b>Total:</b> {resumo.TOTAL}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== MODAL RELATÓRIO / PDF ===== */}
      {openRelatorio && (
        <div
          onClick={() => setOpenRelatorio(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 60,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 900,
              background: "#0f172a",
              border: "1px solid #1f2937",
              borderRadius: 16,
              padding: 16,
            }}
          >
            {/* ✅ Tudo que não deve ir pro PDF */}
            <div
              className="no-print"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <h3 style={{ margin: 0 }}>Relatório final</h3>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <select
                  value={filtroEquipe}
                  onChange={(e) => setFiltroEquipe(e.target.value as any)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #1f2937",
                    background: "#111827",
                    color: "#e6edf3",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  <option value="TODOS">Todos</option>
                  <option value="LARANJA">Laranja</option>
                  <option value="VERDE">Verde</option>
                  <option value="VERMELHO">Vermelho</option>
                </select>

                <button
                  onClick={() => window.print()}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #1f2937",
                    background: "#2563eb",
                    color: "#e6edf3",
                    cursor: "pointer",
                    fontWeight: 900,
                  }}
                >
                  Gerar PDF
                </button>

                <button
                  onClick={() => setOpenRelatorio(false)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid #1f2937",
                    background: "#111827",
                    color: "#e6edf3",
                    cursor: "pointer",
                    fontWeight: 900,
                  }}
                >
                  Fechar
                </button>
              </div>
            </div>

            <div
              className="no-print"
              style={{ marginTop: 10, opacity: 0.8, fontSize: 13 }}
            >
              Dica: clique em <b>Gerar PDF</b> e escolha “Salvar como PDF”.
            </div>

            {/* ✅ Área EXATA que será impressa */}
            <div
              id="relatorio-print"
              className="report-scroll"
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 14,
                border: "1px solid #1f2937",
                background: "#0b1220",
              }}
            >
              {/* Cabeçalho só no PDF */}
              <div className="print-only" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 900 }}>
                  Check-in UMADJUF
                </div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Gerado em: {new Date().toLocaleString("pt-BR")}
                </div>
                <hr style={{ marginTop: 10 }} />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                  gap: 12,
                }}
              >
                {(["LARANJA", "VERDE", "VERMELHO"] as const)
                  .filter((e) => filtroEquipe === "TODOS" || filtroEquipe === e)
                  .map((equipe, idx) => {
                    const lista = listaEquipe(equipe);
                    return (
                      <div
                        key={equipe}
                        className={`avoid-break ${idx === 2 ? "page-break" : ""}`}
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          border: "1px solid #1f2937",
                          background: "#0f172a",
                        }}
                      >
                        <div style={{ fontWeight: 900, marginBottom: 8 }}>
                          {equipe} —{" "}
                          <span style={{ opacity: 0.8 }}>
                            {lista.length} pessoa(s)
                          </span>
                        </div>

                        {lista.length === 0 ? (
                          <div style={{ opacity: 0.8, fontSize: 13 }}>
                            Nenhum participante nesta equipe.
                          </div>
                        ) : (
                          <ol style={{ margin: 0, paddingLeft: 18 }}>
                            {lista.map((p) => (
                              <li key={p.id} style={{ marginBottom: 6 }}>
                                {p.nomeCompleto}
                                <span
                                  style={{
                                    marginLeft: 8,
                                    opacity: 0.8,
                                    fontSize: 12,
                                  }}
                                >
                                  {p.checkinRealizado ? "✅" : "⏳"}
                                </span>
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    );
                  })}
              </div>

              <div style={{ marginTop: 14, opacity: 0.8, fontSize: 13 }}>
                Total carregado: <b>{relatorio.length}</b>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
