import { useState } from "react";

/**
 * Panel de ANALYTICS NBA (todo calculado desde ESPN, nada inventado):
 *   - Curva de win probability jugada a jugada.
 *   - Cuatro factores de Dean Oliver: eFG%, TOV%, OREB%, FT rate.
 *   - Ritmo y eficiencia: posesiones, Pace, OffRtg, NetRtg, TS%.
 *   - MVP del partido con Game Score (Hollinger).
 *   - Rachas (momentum) sacadas del play-by-play.
 *   - Caja completa ordenable por cualquier columna.
 */

const n1 = (v) => (v == null ? "-" : Number(v).toFixed(1));
const entero = (v) => (v == null ? "-" : String(Math.round(Number(v))));

/** Curva de probabilidad de victoria (0-100% del local). */
function Curva({ serie, colorLocal, abbrLocal, abbrVisita }) {
  if (!serie || serie.length < 4) return null;

  const W = 300;
  const H = 90;
  const puntos = serie.map((p, i) => {
    const x = (i / (serie.length - 1)) * W;
    const local = Math.max(0, Math.min(1, p.local ?? 0.5));
    return { x, y: H - local * H, pct: local };
  });

  const linea = puntos.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${linea} L${W},${H} L0,${H} Z`;
  const maxLocal = Math.max(...puntos.map((p) => p.pct));
  const minLocal = Math.min(...puntos.map((p) => p.pct));
  const pico = puntos.findIndex((p) => p.pct === maxLocal);
  const valle = puntos.findIndex((p) => p.pct === minLocal);

  return (
    <div className="nba-curva">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Probabilidad de victoria jugada a jugada"
      >
        <defs>
          <linearGradient id="nba-curva-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorLocal} stopOpacity="0.55" />
            <stop offset="100%" stopColor={colorLocal} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="#38414f" strokeWidth="0.6" strokeDasharray="3 3" />
        <path d={area} fill="url(#nba-curva-grad)" />
        <path d={linea} fill="none" stroke={colorLocal} strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx={puntos[pico].x} cy={puntos[pico].y} r="2" fill="#4ade80" />
        <circle cx={puntos[valle].x} cy={puntos[valle].y} r="2" fill="#f87171" />
      </svg>
      <div className="nba-curva-pie">
        <span>
          Máx. {abbrLocal} <strong>{Math.round(maxLocal * 100)}%</strong>
        </span>
        <span>
          Máx. {abbrVisita} <strong>{Math.round((1 - minLocal) * 100)}%</strong>
        </span>
      </div>
    </div>
  );
}

/** Barra comparativa de un factor (local vs visitante). */
function Factor({ titulo, local, visita, sufijo = "%", mejor = "alto", nota }) {
  if (local == null && visita == null) return null;
  const max = Math.max(local || 0, visita || 0) || 1;
  const ganaLocal = mejor === "alto" ? (local || 0) >= (visita || 0) : (local || 0) <= (visita || 0);

  return (
    <div className="nba-factor">
      <div className="nba-factor-cab">
        <span className={ganaLocal ? "nba-val gana" : "nba-val"}>
          {local == null ? "-" : `${n1(local)}${sufijo}`}
        </span>
        <span className="nba-factor-titulo">{titulo}</span>
        <span className={!ganaLocal ? "nba-val gana nba-der" : "nba-val nba-der"}>
          {visita == null ? "-" : `${n1(visita)}${sufijo}`}
        </span>
      </div>
      <div className="nba-factor-barras">
        <span style={{ width: `${((local || 0) / max) * 100}%` }} />
        <span style={{ width: `${((visita || 0) / max) * 100}%` }} />
      </div>
      {nota ? <p className="nba-nota">{nota}</p> : null}
    </div>
  );
}

/** Ficha del mejor jugador del partido (Game Score). */
function MejorJugador({ jugador, color }) {
  if (!jugador) return null;
  return (
    <div className="nba-mvp" style={{ borderColor: `${color}55` }}>
      <span className="nba-mvp-foto">
        {jugador.foto ? <img src={jugador.foto} alt="" loading="lazy" /> : null}
      </span>
      <div className="nba-mvp-datos">
        <div className="nba-mvp-nombre">
          {jugador.dorsal ? <em>#{jugador.dorsal}</em> : null} {jugador.corto}
        </div>
        <div className="nba-mvp-linea">
          <strong>{entero(jugador.pts)}</strong> pts · <strong>{entero(jugador.reb)}</strong> reb ·{" "}
          <strong>{entero(jugador.ast)}</strong> ast
        </div>
        <div className="nba-mvp-extra">
          TS {n1(jugador.ts)}% · GS {n1(jugador.game_score)} · {n1(jugador.min)}′
        </div>
      </div>
    </div>
  );
}

const COLUMNAS = [
  { clave: "min", label: "MIN" },
  { clave: "pts", label: "PTS" },
  { clave: "reb", label: "REB" },
  { clave: "ast", label: "AST" },
  { clave: "fg3m", label: "3P" },
  { clave: "stl", label: "ROB" },
  { clave: "blk", label: "TAP" },
  { clave: "to", label: "PER" },
  { clave: "ts", label: "TS%" },
  { clave: "plus", label: "+/-" },
];

export default function NbaAnalytics({ equipos = [], playersBox = [], runs = [], winProbability = [] }) {
  const casa = equipos.find((t) => t.homeAway === "home") || equipos[0] || {};
  const fuera = equipos.find((t) => t.homeAway !== "home") || equipos[1] || {};
  const anCasa = casa.analytics || null;
  const anFuera = fuera.analytics || null;
  const [orden, setOrden] = useState({ clave: "game_score", asc: false });

  if (!anCasa && !anFuera && !playersBox.length) return null;

  const ordenar = (clave) => setOrden((o) => ({ clave, asc: o.clave === clave ? !o.asc : false }));

  const tabla = (equipo) => {
    const filas = [...(equipo.jugadores || [])].sort((a, b) => {
      const na = typeof a[orden.clave] === "number" ? a[orden.clave] : -999;
      const nb = typeof b[orden.clave] === "number" ? b[orden.clave] : -999;
      return orden.asc ? na - nb : nb - na;
    });

    return (
      <div className="nba-tabla-wrap">
        <table className="nba-tabla">
          <thead>
            <tr>
              <th className="nba-th-jug">Jugador</th>
              {COLUMNAS.map((c) => (
                <th
                  key={c.clave}
                  className={orden.clave === c.clave ? "activa" : ""}
                  onClick={() => ordenar(c.clave)}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((j) => (
              <tr key={j.id || j.nombre}>
                <td className="nba-td-jug">
                  {j.foto ? <img src={j.foto} alt="" loading="lazy" /> : <span className="nba-sin-foto" />}
                  <span className="nba-td-nombre">
                    {j.titular ? (
                      <b className="nba-titular" title="Titular">
                        •
                      </b>
                    ) : null}
                    {j.corto}
                  </span>
                </td>
                {COLUMNAS.map((c) => (
                  <td key={c.clave} className={c.clave === "ts" ? "nba-ts" : ""}>
                    {c.clave === "ts" ? n1(j[c.clave]) : entero(j[c.clave])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="nba-panel">
      {winProbability.length ? (
        <section className="sd-card dp-card" data-tab="stats">
          <h4 className="dp-titulo">📈 Probabilidad de victoria</h4>
          <Curva
            serie={winProbability}
            colorLocal={casa.color || "#22c55e"}
            abbrLocal={casa.abbr || "Local"}
            abbrVisita={fuera.abbr || "Visitante"}
          />
          <p className="nba-nota">Cada punto es una jugada. Por encima de la línea manda el local.</p>
        </section>
      ) : null}

      {playersBox.length ? (
        <section className="sd-card dp-card" data-tab="stats">
          <h4 className="dp-titulo">⭐ MVP del partido (Game Score)</h4>
          <div className="nba-mvps">
            <MejorJugador jugador={playersBox[0]?.jugadores?.[0]} color={casa.color || "#22c55e"} />
            <MejorJugador jugador={playersBox[1]?.jugadores?.[0]} color={fuera.color || "#f97316"} />
          </div>
        </section>
      ) : null}

      {anCasa && anFuera ? (
        <section className="sd-card dp-card" data-tab="stats">
          <h4 className="dp-titulo">🧮 Cuatro factores</h4>
          <Factor
            titulo="eFG% (tiro efectivo)"
            local={anCasa.efg}
            visita={anFuera.efg}
            nota="El triple cuenta 1.5: mide la calidad real del tiro."
          />
          <Factor
            titulo="TOV% (pérdidas)"
            local={anCasa.tov_pct}
            visita={anFuera.tov_pct}
            mejor="bajo"
            nota="Menos es mejor: posesiones que regalas."
          />
          <Factor
            titulo="OREB% (rebote ofensivo)"
            local={anCasa.oreb_pct}
            visita={anFuera.oreb_pct}
            nota="Segundas oportunidades que fabricas."
          />
          <Factor
            titulo="FT rate (TL / tiros)"
            local={anCasa.ftr}
            visita={anFuera.ftr}
            nota="Cuánto castigas dentro."
          />
        </section>
      ) : null}

      {anCasa && anFuera ? (
        <section className="sd-card dp-card" data-tab="stats">
          <h4 className="dp-titulo">⚡ Ritmo y eficiencia</h4>
          <div className="nba-chips">
            <span className="nba-chip">
              Pace <strong>{n1(anCasa.pace)}</strong>
            </span>
            <span className="nba-chip">
              Posesiones <strong>{n1(anCasa.posesiones)}</strong>
            </span>
            <span className="nba-chip">
              TS% {casa.abbr || "L"} <strong>{n1(anCasa.ts)}</strong>
            </span>
            <span className="nba-chip">
              TS% {fuera.abbr || "V"} <strong>{n1(anFuera.ts)}</strong>
            </span>
          </div>
          <div className="nba-rtg">
            <div className="nba-rtg-lado">
              <span className="nba-rtg-num">{n1(anCasa.ortg)}</span>
              <span className="nba-rtg-lbl">OffRtg {casa.abbr || "local"}</span>
              <span className={anCasa.net >= 0 ? "nba-rtg-sub alto" : "nba-rtg-sub bajo"}>
                {anCasa.net >= 0 ? "+" : ""}
                {n1(anCasa.net)} neto
              </span>
            </div>
            <div className="nba-rtg-medio">vs</div>
            <div className="nba-rtg-lado nba-rtg-der">
              <span className="nba-rtg-num">{n1(anFuera.ortg)}</span>
              <span className="nba-rtg-lbl">OffRtg {fuera.abbr || "visitante"}</span>
              <span className={anFuera.net >= 0 ? "nba-rtg-sub alto" : "nba-rtg-sub bajo"}>
                {anFuera.net >= 0 ? "+" : ""}
                {n1(anFuera.net)} neto
              </span>
            </div>
          </div>
          <p className="nba-nota">
            OffRtg = puntos por cada 100 posesiones ({n1(anCasa.minutos)} minutos jugados).
          </p>
        </section>
      ) : null}

      {runs.length ? (
        <section className="sd-card dp-card" data-tab="stats">
          <h4 className="dp-titulo">🔥 Rachas del partido</h4>
          <ul className="nba-rachas">
            {runs.map((r, i) => {
              const esCasa = String(r.equipo) === String(casa.id);
              return (
                <li key={i}>
                  <span className={esCasa ? "nba-racha-chip casa" : "nba-racha-chip fuera"}>
                    {esCasa ? casa.abbr || "LOCAL" : fuera.abbr || "VISITA"}
                  </span>
                  <strong className="nba-racha-puntos">{r.puntos}-0</strong>
                  <span className="nba-racha-meta">
                    Q{r.periodo} · {r.reloj} · {r.local}-{r.visita}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {playersBox.length ? (
        <section className="sd-card dp-card" data-tab="stats">
          <h4 className="dp-titulo">🗂️ Caja completa</h4>
          <p className="nba-nota" style={{ marginTop: 0 }}>
            Toca una columna para ordenar · • = titular
          </p>
          {playersBox.map((eq) => (
            <details key={eq.equipo_id || eq.equipo} className="nba-caja" open>
              <summary>
                {eq.equipo} <span className="nba-caja-num">{eq.jugadores?.length || 0}</span>
              </summary>
              {tabla(eq)}
            </details>
          ))}
        </section>
      ) : null}
    </div>
  );
}
