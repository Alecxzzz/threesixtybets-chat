import { useMemo, useState } from "react";

/**
 * Lista de partidos "en vivo" con el layout de Canzu Analytics:
 *
 *   Hoy · 12 partidos                       ● En vivo (2)
 *   ┌ BRA  Brasileirão                    3 ▾ ┐
 *   │ 22:00  [logo] Fluminense      1  [2.38] │
 *   │        [logo] São Paulo       0  [3.05] │
 *   │        O/U 2.5   Detalle -215           │
 *   └─────────────────────────────────────────┘
 *
 * Solo pinta lo que llega del backend: si ESPN no publica cuotas, no se
 * inventan. Lo que no existe se omite (o se marca con "—").
 */

const TAGS_DEPORTE = { nba: "NBA", mlb: "MLB", nfl: "NFL", tennis: "TEN", mma: "MMA" };

function hora(fecha) {
  if (!fecha) return "";
  try {
    return new Date(fecha).toLocaleTimeString("es-NI", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function etiquetaDia(fecha) {
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "Sin fecha";
  const soloDia = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dif = Math.round((soloDia(d) - soloDia(new Date())) / 86400000);
  if (dif === 0) return "Hoy";
  if (dif === 1) return "Mañana";
  if (dif === 2) return "Pasado mañana";
  if (dif === -1) return "Ayer";
  return d.toLocaleDateString("es-NI", { weekday: "short", day: "2-digit", month: "short" });
}

function claveDia(fecha) {
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "9999-99-99";
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** "esp.1" -> ESP, "uefa.champions" -> UEFA, "nba" -> NBA. */
function codigoLiga(game) {
  const prefijo = String(game.league_code || "").split(".")[0].toUpperCase();
  if (prefijo) return prefijo.slice(0, 4);
  return TAGS_DEPORTE[game.sport] || "—";
}

/** Cuota de ESPN (dinero americano) -> decimal, o la decimal tal cual. */
function cuotaDecimal(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n) || n === 0) return null;
  if (Math.abs(n) >= 100) return n > 0 ? 1 + n / 100 : 1 + 100 / Math.abs(n);
  if (n > 1 && n < 50) return n;
  return null;
}

function cuota(valor) {
  const n = cuotaDecimal(valor);
  return n === null ? null : n.toFixed(2);
}

function estadoRail(game) {
  if (game.state === "in") {
    return { vivo: true, texto: game.clock || game.status || "VIVO" };
  }
  if (game.state === "post") return { vivo: false, texto: "Final" };
  return { vivo: false, texto: hora(game.date) || "—" };
}

function FilaEquipo({ equipo, marcador, odd, conMarcador }) {
  return (
    <div className="cz-fila">
      {equipo?.logo ? (
        <img className="cz-logo" src={equipo.logo} alt="" loading="lazy" />
      ) : (
        <span className="cz-logo cz-logo--vacio" />
      )}
      <span className="cz-nombre">{equipo?.name || "?"}</span>
      {equipo?.record ? <span className="cz-record">{equipo.record}</span> : null}
      {conMarcador && (
        <span className="cz-marcador">{marcador === null || marcador === undefined ? "-" : marcador}</span>
      )}
      {odd ? <span className="cz-cuota">{odd}</span> : null}
    </div>
  );
}

function Partido({ game, onOpen }) {
  const rail = estadoRail(game);
  const odds = game.odds || {};
  const conMarcador = game.state === "in" || game.state === "post";
  const oddLocal = cuota(odds.home_odds);
  const oddVisitante = cuota(odds.away_odds);
  const oddEmpate = cuota(odds.draw_odds ?? odds.draw);

  const chips = [];
  if (odds.over_under !== null && odds.over_under !== undefined && odds.over_under !== "") {
    chips.push({ etiqueta: "O/U", valor: odds.over_under });
  }
  if (odds.details) chips.push({ etiqueta: "Línea", valor: odds.details });

  return (
    <article
      className="cz-partido"
      onClick={() => onOpen(game)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(game);
        }
      }}
    >
      <div className={rail.vivo ? "cz-rail cz-rail--vivo" : "cz-rail"}>
        {rail.vivo ? <span className="cz-live-dot" /> : null}
        <span>{rail.texto}</span>
      </div>

      <div className="cz-centro">
        <FilaEquipo
          equipo={game.home}
          marcador={game.home?.score}
          odd={oddLocal}
          conMarcador={conMarcador}
        />
        {oddEmpate ? <div className="cz-x">X {oddEmpate}</div> : null}
        <FilaEquipo
          equipo={game.away}
          marcador={game.away?.score}
          odd={oddVisitante}
          conMarcador={conMarcador}
        />

        <div className="cz-chips">
          {chips.length > 0 ? (
            chips.map((c) => (
              <span key={c.etiqueta} className="cz-chip">
                {c.etiqueta}
                <b>{c.valor}</b>
              </span>
            ))
          ) : (
            <span className="cz-chip cz-chip--plano">Sin cuotas publicadas</span>
          )}
        </div>
      </div>
    </article>
  );
}

function CardLiga({ liga, juegos, onOpen, esFav, onToggleFav }) {
  const [abierta, setAbierta] = useState(true);
  const enVivo = juegos.filter((g) => g.state === "in").length;
  const favorito = juegos.some((g) => esFav(g));

  return (
    <div className="cz-card" data-abierta={abierta}>
      <div className="cz-card-cab">
        <button
          type="button"
          className="cz-card-cab-btn"
          onClick={() => setAbierta((v) => !v)}
          aria-expanded={abierta}
        >
          <span className="cz-code">{codigoLiga(juegos[0])}</span>
          <span className="cz-liga">{liga}</span>
          {enVivo > 0 ? <span className="cz-live-dot" /> : null}
        </button>

        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {onToggleFav && (
            <button
              type="button"
              className={favorito ? "cz-fav is-on" : "cz-fav"}
              title={favorito ? "Quitar de favoritos" : "Agregar a favoritos"}
              onClick={() => onToggleFav(juegos[0])}
            >
              ⭐
            </button>
          )}
          <span className="cz-cuenta">{juegos.length}</span>
          <span className="cz-flecha">▾</span>
        </span>
      </div>

      {abierta && (
        <div className="cz-partidos">
          {juegos.map((g) => (
            <Partido key={g.id} game={g} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

function LigasCanzu({ games, onOpen, esFav, onToggleFav }) {
  const secciones = useMemo(() => {
    const porDia = new Map();
    for (const g of games) {
      const clave = claveDia(g.date);
      if (!porDia.has(clave)) {
        porDia.set(clave, { clave, etiqueta: etiquetaDia(g.date), juegos: [] });
      }
      porDia.get(clave).juegos.push(g);
    }

    const orden = (g) => (g.state === "in" ? 0 : g.state === "pre" ? 1 : 2);
    return [...porDia.values()]
      .sort((a, b) => a.clave.localeCompare(b.clave))
      .map((seccion) => {
        const porLiga = new Map();
        const juegos = [...seccion.juegos].sort((a, b) => {
          const estado = orden(a) - orden(b);
          if (estado !== 0) return estado;
          return new Date(a.date || 0) - new Date(b.date || 0);
        });
        for (const g of juegos) {
          const liga = g.league || "Otras ligas";
          if (!porLiga.has(liga)) porLiga.set(liga, []);
          porLiga.get(liga).push(g);
        }
        return {
          ...seccion,
          enVivo: juegos.filter((g) => g.state === "in").length,
          total: juegos.length,
          ligas: [...porLiga.entries()],
        };
      });
  }, [games]);

  return (
    <div className="cz-lista">
      {secciones.map((seccion) => (
        <section key={seccion.clave} className="cz-seccion">
          <div className="cz-seccion-cab">
            <h3 className="cz-seccion-titulo">
              {seccion.etiqueta} <span>· {seccion.total} partidos</span>
            </h3>
            {seccion.enVivo > 0 ? (
              <span className="cz-vivo-pill">
                <span className="cz-vivo-dot" />
                En vivo ({seccion.enVivo})
              </span>
            ) : null}
          </div>

          <div className="cz-grid">
            {seccion.ligas.map(([liga, juegos]) => (
              <CardLiga
                key={liga}
                liga={liga}
                juegos={juegos}
                onOpen={onOpen}
                esFav={esFav}
                onToggleFav={onToggleFav}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default LigasCanzu;
