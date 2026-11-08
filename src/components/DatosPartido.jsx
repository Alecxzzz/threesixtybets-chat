import { useEffect, useState } from "react";
import { getStoredSession, fetchDatosPartido } from "../services/api";

/**
 * Extras del partido (FotMob): forma reciente, insights, Ã¡rbitro y goleadores.
 * Se pintan como tarjetas dentro de la pestaÃ±a Resumen. Si no hay datos, no
 * muestra nada (no ensucia la vista).
 */
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
          <h4 className="dp-titulo">ðŸ’¡ Datos del partido</h4>
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
            { equipo: casa, fila: forma[0], nombre: goleadores?.local?.nombre },
            { equipo: fuera, fila: forma[1], nombre: goleadores?.visita?.nombre },
          ].map(({ equipo, fila }, idx) =>
            fila?.length ? (
              <div key={idx} className="dp-forma-fila">
                <span className="dp-forma-equipo">{equipo?.name || (idx === 0 ? "Local" : "Visitante")}</span>
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
          <h4 className="dp-titulo">Ãrbitro</h4>
          <div className="dp-arbitro">
            <span className="dp-arbitro-avatar">{arbitro.bandera ? <img src={arbitro.bandera} alt="" /> : "ðŸ§‘â€âš–ï¸"}</span>
            <div>
              <div className="dp-arbitro-nombre">{arbitro.nombre}</div>
              <div className="dp-arbitro-meta">
                {arbitro.pais}
                {arbitro.liga ? ` Â· ${arbitro.liga}` : ""}
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
                    <strong>{s.valor}</strong>
                    <span className="dp-stat-unidad">/ partido</span>
                  </div>
                  <div className="dp-barra">
                    <span style={{ width: `${pct}%`, background: color }} />
                  </div>
                  <div className={`dp-stat-vs ${s.vs === "above" ? "alto" : "bajo"}`}>
                    {s.vs === "above" ? "Por encima" : s.vs === "below" ? "Por debajo" : ""} de la media
                    {s.media != null ? ` (${s.media})` : ""}
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
                  <span className="dp-gol-val">{fila.valor}</span>
                  <span className="dp-gol-label">{fila.etiqueta}</span>
                  <span className="dp-gol-val">{otra?.valor ?? "-"}</span>
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

