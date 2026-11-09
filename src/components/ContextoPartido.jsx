/**
 * Contexto del partido con datos REALES de ESPN que antes se tiraban:
 *   - `predictor`: probabilidad de victoria del modelo de ESPN (solo previo).
 *   - `odds`: cuotas de mercado (DraftKings): linea, total y moneyline.
 *   - `injuries`: bajas con estado (Out / Day-To-Day) y zona lesionada.
 * Si no hay nada de eso (futbol sin cuotas, etc.) no se pinta nada.
 */

const ORDEN_BAJAS = { Out: 0, "Day-To-Day": 1 };

export default function ContextoPartido({ predictor, odds, injuries, equipos = [] }) {
  const casa = equipos.find((t) => t.homeAway === "home") || equipos[0] || {};
  const fuera = equipos.find((t) => t.homeAway !== "home") || equipos[1] || {};

  const bajas = [...(injuries || [])].sort(
    (a, b) => (ORDEN_BAJAS[a.estado] ?? 9) - (ORDEN_BAJAS[b.estado] ?? 9)
  );

  const hayModelo = predictor?.local != null && predictor?.visita != null;
  const hayCuotas = odds && (odds.linea || odds.total || odds.ml_local);
  if (!hayModelo && !hayCuotas && !bajas.length) return null;

  const pctLocal = hayModelo ? Number(predictor.local) : 0;

  return (
    <>
      {(hayModelo || hayCuotas) && (
        <section className="sd-card dp-card" data-tab="resumen">
          <h4 className="dp-titulo">📊 Modelo y mercado</h4>

          {hayModelo && (
            <>
              <div className="ctx-prob">
                <span>{casa?.short_name || casa?.name || "Local"}</span>
                <strong>{Number(predictor.local).toFixed(1)}%</strong>
              </div>
              <div className="ctx-barra" role="img" aria-label={`Local ${predictor.local}% / Visitante ${predictor.visita}%`}>
                <span style={{ width: `${Math.max(2, Math.min(98, pctLocal))}%` }} />
              </div>
              <div className="ctx-prob ctx-prob-visita">
                <span>{fuera?.short_name || fuera?.name || "Visitante"}</span>
                <strong>{Number(predictor.visita).toFixed(1)}%</strong>
              </div>
              <p className="ctx-nota">Probabilidad del modelo de ESPN (no es una cuota de apuesta).</p>
            </>
          )}

          {hayCuotas && (
            <div className="ctx-cuotas">
              {odds.linea != null && (
                <span className="ctx-chip">
                  Línea <strong>{odds.linea > 0 ? `+${odds.linea}` : odds.linea}</strong>
                </span>
              )}
              {odds.total != null && (
                <span className="ctx-chip">
                  Total <strong>{odds.total}</strong>
                </span>
              )}
              {odds.ml_local != null && (
                <span className="ctx-chip">
                  ML {casa?.abbr || "L"} <strong>{odds.ml_local}</strong>
                </span>
              )}
              {odds.ml_visita != null && (
                <span className="ctx-chip">
                  ML {fuera?.abbr || "V"} <strong>{odds.ml_visita}</strong>
                </span>
              )}
            </div>
          )}
          {hayCuotas && odds.casa ? <p className="ctx-nota">Cuotas de {odds.casa}.</p> : null}
        </section>
      )}

      {bajas.length ? (
        <section className="sd-card dp-card" data-tab="resumen">
          <h4 className="dp-titulo">🚑 Bajas y dudas</h4>
          <div className="baj-columnas">
            {[casa, fuera].map((equipo) => {
              const suyas = bajas.filter(
                (b) => !b.equipo || !equipo?.name || b.equipo === equipo.name
              );
              const nombre = equipo?.short_name || equipo?.name || "Equipo";
              return (
                <div key={nombre} className="baj-columna">
                  <div className="baj-cab">
                    {equipo?.logo ? <img src={equipo.logo} alt="" width={18} height={18} /> : null}
                    <span>{nombre}</span>
                    <em>{suyas.length}</em>
                  </div>
                  {suyas.length ? (
                    suyas.map((b, i) => (
                      <div key={`${b.jugador}-${i}`} className="baj-item">
                        <span className="baj-foto">
                          {b.foto ? <img src={b.foto} alt="" loading="lazy" /> : null}
                        </span>
                        <span className="baj-texto">
                          <span className="baj-nombre">{b.corto || b.jugador}</span>
                          <span className={b.grave ? "baj-estado fuera" : "baj-estado duda"}>
                            <i aria-hidden="true">{b.grave ? "✚" : "✚"}</i>
                            {b.grave ? "Baja" : "Duda"}
                            {b.zona ? <u> · {b.zona}</u> : null}
                          </span>
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="baj-vacio">Sin bajas</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
