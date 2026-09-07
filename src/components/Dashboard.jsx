import { useEffect, useMemo, useState } from "react";
import { fetchDashboard } from "../services/api";

/**
 * Dashboard - pagina principal de 3SIXTYBETS.
 * Hero + stats + efectividad + tabs (Pronosticos del dia / Acertados)
 * + tarjetas de picks con badges. Auto-refresco cada 60 s.
 */

function ConfianzaBadge({ confianza }) {
  if (confianza === "ALTA")
    return <span className="dp-badge b-fuego">🔥 Bomba</span>;
  if (confianza === "MEDIA")
    return <span className="dp-badge b-valor">⭐ Valor</span>;
  if (confianza === "BAJA")
    return <span className="dp-badge b-suave">Riesgo</span>;
  return null;
}

function RingEfectividad({ porcentaje }) {
  const radio = 34;
  const circ = 2 * Math.PI * radio;
  const offset = circ * (1 - Math.min(porcentaje, 100) / 100);
  return (
    <div className="dash-ring">
      <svg width="86" height="86" viewBox="0 0 86 86">
        <circle cx="43" cy="43" r={radio} className="ring-fondo" />
        <circle
          cx="43"
          cy="43"
          r={radio}
          className="ring-progreso"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 43 43)"
        />
      </svg>
      <span className="dash-ring-num">{porcentaje}%</span>
    </div>
  );
}

export default function Dashboard({ session }) {
  const [data, setData] = useState(null);
  const [vista, setVista] = useState("dia"); // "dia" | "acertados"
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    const cargar = () =>
      fetchDashboard(session)
        .then((d) => alive && (setData(d), setError(null)))
        .catch((e) => alive && setError(e.message));
    cargar();
    const intervalo = setInterval(cargar, 60000);
    return () => {
      alive = false;
      clearInterval(intervalo);
    };
  }, [session]);

  const stats = data?.stats;

  const efectividad = useMemo(() => {
    if (!stats?.historico_resueltos) return 0;
    return Math.round((stats.historico_aciertos / stats.historico_resueltos) * 100);
  }, [stats]);

  if (error)
    return <div className="dash-error">⚠️ No se pudo cargar el dashboard: {error}</div>;
  if (!data) return <div className="dash-loading">Cargando dashboard...</div>;

  const picks =
    vista === "dia" ? data.pronosticos_del_dia || [] : data.pronosticos_acertados || [];

  const scrollPicks = (dir) => {
    document.getElementById("dash-picks-track")?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  return (
    <div className="dashboard">
      {/* ===== HERO ===== */}
      <section className="dash-hero">
        <span className="dash-hero-badge">⚡ Con tecnología de 3SIXTYBETS AI</span>
        <h1 className="dash-hero-title">Pronóstico del Día</h1>
        <p className="dash-hero-sub">
          Picks elegidos por nuestra IA entre los mercados de mayor probabilidad,
          variando deportes y mercados para buscar siempre el mayor valor.
        </p>
      </section>

      {/* ===== STATS ===== */}
      <section className="dash-stats-row">
        <div className="dash-kpi">
          <span className="dash-kpi-label">PRONÓSTICOS DEL DÍA</span>
          <span className="dash-kpi-num">{stats.pronosticos_del_dia}</span>
          <span className="dash-kpi-foot">
            {Object.entries(stats.por_deporte || {})
              .map(([d, n]) => `${d}: ${n}`)
              .join(" · ") || "esperando análisis de la IA"}
          </span>
        </div>
        <div className="dash-kpi kpi-verde">
          <span className="dash-kpi-label">ACERTADOS POR LA IA</span>
          <span className="dash-kpi-num">{stats.pronosticos_acertados_por_la_ia}</span>
          <span className="dash-kpi-foot">solo se muestran los aciertos</span>
        </div>
        <div className="dash-kpi kpi-morado">
          <span className="dash-kpi-label">EFECTIVIDAD HISTÓRICA</span>
          <span className="dash-kpi-num">{efectividad}%</span>
          <span className="dash-kpi-foot">
            {stats.historico_aciertos} de {stats.historico_resueltos} picks resueltos
          </span>
        </div>
      </section>

      {/* ===== EFECTIVIDAD ===== */}
      <section className="dash-efectividad">
        <h2 className="dash-seccion-titulo">📊 Efectividad de los pronósticos</h2>
        <div className="dash-efect-card">
          <RingEfectividad porcentaje={efectividad} />
          <div className="dash-efect-item">
            <span className="dash-efect-num">
              {stats.historico_aciertos} de {stats.historico_resueltos}
            </span>
            <span className="dash-efect-label">Picks resueltos</span>
          </div>
          <div className="dash-efect-item">
            <span className="dash-efect-num">{stats.pronosticos_del_dia}</span>
            <span className="dash-efect-label">Picks de hoy</span>
          </div>
        </div>
        <p className="dash-efect-nota">
          Resultados históricos de la IA. El rendimiento pasado no garantiza
          resultados futuros.
        </p>
      </section>

      {/* ===== TABS ===== */}
      <section className="dash-tabs-wrap">
        <div className="dash-tabs">
          <button
            className={`dash-tab ${vista === "dia" ? "activa" : ""}`}
            onClick={() => setVista("dia")}
          >
            Pronósticos del día
          </button>
          <button
            className={`dash-tab ${vista === "acertados" ? "activa" : ""}`}
            onClick={() => setVista("acertados")}
          >
            ✅ Acertados
          </button>
        </div>
        <div className="dash-tabs-nav">
          <button className="dash-arrow" onClick={() => scrollPicks(-1)}>‹</button>
          <button className="dash-arrow" onClick={() => scrollPicks(1)}>›</button>
        </div>
      </section>

      {/* ===== PICKS ===== */}
      <section id="dash-picks-track" className="dash-picks">
        {picks.length === 0 && (
          <p className="dash-vacio">
            {vista === "dia"
              ? "🤖 La IA aún está analizando los partidos de hoy. Vuelve en unos minutos."
              : "Aún no hay pronósticos acertados hoy."}
          </p>
        )}
        {picks.map((p) => (
          <article key={p.id} className={`dash-pick ${p.result === "ACIERTO" ? "pick-acierto" : ""}`}>
            <div className="dp-badges">
              <ConfianzaBadge confianza={p.confidence} />
              {p.result === "ACIERTO" && (
                <span className="dp-badge b-acierto">✓ Acertado</span>
              )}
            </div>
            <div className="dp-evento">
              <div className="dp-fila-equipo">
                {p.awayLogo ? (
                  <img className="dp-logo" src={p.awayLogo} alt="" loading="lazy" />
                ) : (
                  <span className="dp-logo dp-logo-fallback">?</span>
                )}
                <span className="dp-equipo">{p.awayName || p.eventName}</span>
              </div>
              <div className="dp-fila-equipo">
                {p.homeLogo ? (
                  <img className="dp-logo" src={p.homeLogo} alt="" loading="lazy" />
                ) : (
                  <span className="dp-logo dp-logo-fallback">?</span>
                )}
                <span className="dp-equipo">{p.homeName || ""}</span>
              </div>
            </div>
            <div className="dp-mercado">{p.market}</div>
            <div className="dp-pie">
              <span className="dp-pick-sel">{p.selection}</span>
              {p.odds ? <span className="dp-cuota">cuota {p.odds.toFixed(2)}</span> : null}
            </div>
            <div className="dp-foot">
              <span className="dp-liga">{p.sportLabel}</span>
              <span className="dp-fecha">Hoy</span>
            </div>
          </article>
        ))}
      </section>

      {/* ===== AVISO ===== */}
      <footer className="dash-aviso">
        ⚠️ <strong>Aviso de responsabilidad:</strong> los pronósticos mostrados son
        estimaciones de modelos predictivos basados en datos históricos. No
        garantizamos la exactitud de los resultados deportivos. Cualquier decisión
        tomada basándose en esta información es de absoluta responsabilidad del
        usuario. Plataforma exclusiva para mayores de 18 años.
      </footer>
    </div>
  );
}
