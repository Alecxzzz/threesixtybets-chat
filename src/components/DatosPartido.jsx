import { useEffect, useState } from "react";
import { getStoredSession, fetchDatosPartido } from "../services/api";

/**
 * Extras del partido (FotMob): forma reciente, insights, árbitro y goleadores.
 * Se pintan como tarjetas dentro de la pestaña Resumen. Si no hay datos, no
 * muestra nada (no ensucia la vista).
 */

/** Números: enteros tal cual, decimales a 2 cifras (xG, nota). */
function fmt(valor) {
  if (valor === null || valor === undefined || valor === "") return "-";
  const n = Number(valor);
  if (!Number.isFinite(n)) return String(valor);
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(2);
}

export default function DatosPartido({ sport = "soccer", eventId, league = null, equipos = [] }) {
  const [datos, setDatos] = useState(null);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      const sesion = getStoredSession();
      if (!sesion || !eventId || sport !== "soccer") return;
      try {
        const r = await fetchDatosPartido(sesion, sport, eventId, league);
        if (!cancelado) setDatos(r);
      } catch {
        /* sin extras: no se muestra nada */
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [sport, eventId, league]);

  if (!datos?.ok) return null;

  const { forma = [], insights = [], arbitro, goleadores } = datos;
  const casa = equipos.find((t) => t.homeAway === "home") || equipos[0] || {};
  const fuera = equipos.find((t) => t.homeAway !== "home") || equipos[1] || {};

  return (
    <div className="dp-extras">
      {insights.length ? (
        <section className="sd-card dp-card" data-tab="resumen">
          <h4 className="dp-titulo">💡 Datos del partido</h4>
          <ul className="dp-insights">
            {insights.map((i, idx) => (
              <li key={idx} style={{ borderLeftColor: i.color || "#4ade80" }}>
                {i.texto}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {forma.some((f) => f.length) ? (
        <section className="sd-card dp-card" data-tab="resumen">
          <h4 className="dp-titulo">Forma reciente</h4>
          {[
            { equipo: casa, fila: forma[0] },
            { equipo: fuera, fila: forma[1] },
          ].map(({ equipo, fila }, idx) =>
            fila?.length ? (
              <div key={idx} className="dp-forma-fila">
                <span className="dp-forma-equipo">
                  {equipo?.name || (idx === 0 ? "Local" : "Visitante")}
                </span>
                <span className="dp-forma-chips">
                  {fila.map((f, i) => (
                    <span
                      key={i}
                      className={`dp-forma ${f.resultado === "W" ? "g" : f.resultado === "L" ? "p" : "e"}`}
                      title={f.fecha || ""}
                    >
                      {f.resultado || "?"}
                    </span>
                  ))}
                </span>
              </div>
            ) : null
          )}
        </section>
      ) : null}

      {arbitro ? (
        <section className="sd-card dp-card" data-tab="resumen">
          <h4 className="dp-titulo">Árbitro</h4>
          <div className="dp-arbitro">
            <span className="dp-arbitro-avatar">
              {arbitro.bandera ? <img src={arbitro.bandera} alt="" /> : "👨‍⚖️"}
            </span>
            <div>
              <div className="dp-arbitro-nombre">{arbitro.nombre}</div>
              <div className="dp-arbitro-meta">
                {[arbitro.pais, arbitro.liga].filter(Boolean).join(" · ")}
              </div>
            </div>
          </div>

          <div className="dp-arbitro-stats">
            {[
              { clave: "yellowCards", label: "Tarjetas", color: "#facc15" },
              { clave: "fouls", label: "Faltas", color: "#38bdf8" },
            ].map(({ clave, label, color }) => {
              const s = arbitro.stats?.[clave];
              if (!s) return null;
              const pct = Math.max(4, Math.min(100, s.pct ?? 50));
              return (
                <div key={clave} className="dp-stat">
                  <div className="dp-stat-top">
                    <span>{label}</span>
                    <strong>{fmt(s.valor)}</strong>
                    <span className="dp-stat-unidad">/ partido</span>
                  </div>
                  <div className="dp-barra">
                    <span style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div className={`dp-stat-vs ${s.vs === "above" ? "alto" : s.vs === "below" ? "bajo" : ""}`}>
                    {s.vs === "above"
                      ? "Por encima de la media"
                      : s.vs === "below"
                        ? "Por debajo de la media"
                        : "En la media"}
                    {s.media != null ? ` (${fmt(s.media)})` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {goleadores ? (
        <section className="sd-card dp-card" data-tab="resumen">
          <h4 className="dp-titulo">{goleadores.titulo || "Goleadores"}</h4>
          <div className="dp-gol-cab">
            <div className="dp-gol-jug">
              {goleadores.local?.foto ? <img src={goleadores.local.foto} alt="" /> : null}
              <span>{goleadores.local?.nombre}</span>
            </div>
            <div className="dp-gol-jug">
              {goleadores.visita?.foto ? <img src={goleadores.visita.foto} alt="" /> : null}
              <span>{goleadores.visita?.nombre}</span>
            </div>
          </div>
          <div className="dp-gol-filas">
            {(goleadores.local?.filas || []).map((fila, i) => {
              const otra = (goleadores.visita?.filas || [])[i];
              return (
                <div key={fila.etiqueta} className="dp-gol-fila">
                  <span className="dp-gol-val">{fmt(fila.valor)}</span>
                  <span className="dp-gol-label">{fila.etiqueta}</span>
                  <span className="dp-gol-val">{fmt(otra?.valor)}</span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="dp-fuente">Datos: FotMob</div>
    </div>
  );
}

