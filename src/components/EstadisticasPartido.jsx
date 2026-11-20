import { useEffect, useMemo, useState } from "react";
import { getStoredSession, fetchEstadisticasPartido } from "../services/api";
import TrackerPartido from "./TrackerPartido";

/**
 * Pestaña Estadísticas del partido, estilo tracker profesional:
 *
 *   1. Momentum por minuto (área simétrica, un color por equipo)
 *   2. Comparativa: posesión como barra bipartita + filas con el color REAL de
 *      cada equipo (FotMob manda `teamColors`) y badge en el lado que domina
 *   3. "Todas las estadísticas" desplegable (Shots, Passes, Defence...)
 *   4. Timeline de acciones con minutos, tarjetas, cambios y separador de parte
 *
 * Nada de barras planas de 5px: las barras crecen desde su eje, las filas
 * entran escalonadas y el momentum se dibuja de izquierda a derecha. Todo
 * desactivado con `prefers-reduced-motion`.
 */

const LOCAL = "#34d399";
const VISITA = "#fb7185";

/** FotMob manda los títulos en inglés; aquí van en español. */
const TITULOS = {
  "Ball possession": "Posesión",
  "Total shots": "Tiros",
  "Shots on target": "Tiros a puerta",
  "Shots off target": "Tiros fuera",
  "Blocked shots": "Tiros bloqueados",
  "Touches in opposition box": "Toques en área rival",
  "Big chances": "Ocasiones claras",
  "Big chances missed": "Ocasiones falladas",
  "Accurate passes": "Pases acertados",
  "Yellow cards": "Amarillas",
  "Red cards": "Rojas",
  Corners: "Córners",
  Offsides: "Fueras de juego",
  Fouls: "Faltas",
  "Fouls committed": "Faltas",
  Passes: "Pases",
  "Own half": "Campo propio",
  "Opposition half": "Campo rival",
  Tackles: "Entradas",
  Interceptions: "Intercepciones",
  Blocks: "Bloqueos",
  Clearances: "Despejes",
  "Duels won": "Duelos ganados",
  "Ground duels": "Duelos en el suelo",
  "Aerial duels": "Duelos aéreos",
  Dribbles: "Regates",
  "Dribbles succeeded": "Regates logrados",
  Saves: "Paradas",
  Goals: "Goles",
  "Expected goals (xG)": "Goles esperados (xG)",
  "Expected assists (xA)": "Asistencias esperadas (xA)",
  Shots: "Tiros",
  Defence: "Defensa",
  Duels: "Duelos",
  Discipline: "Disciplina",
  Attack: "Ataque",
  Goalkeeping: "Portería",
  "Top stats": "Estadísticas clave",
};

const t = (texto) => TITULOS[texto] || texto;

/** Color del equipo para TEXTO sobre fondo oscuro: si es muy oscuro se aclara
 *  hasta que se lea (AA). Se usa en los nombres de la timeline. */
function colorTexto(hex) {
  const limpio = String(hex || "").replace("#", "");
  if (limpio.length < 6) return "#e2e8f0";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(limpio.slice(i, i + 2), 16));
  if ([r, g, b].some((v) => Number.isNaN(v))) return "#e2e8f0";
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum >= 0.45) return `#${limpio}`;
  const k = Math.min(0.7, (0.45 - lum) / 0.45 + 0.18);
  const mezcla = (v) => Math.round(v + (255 - v) * k);
  return `rgb(${mezcla(r)}, ${mezcla(g)}, ${mezcla(b)})`;
}

/** Texto legible encima de un color de fondo (blanco/negro según luminancia). */
function textoSobre(hex) {
  const limpio = String(hex || "").replace("#", "");
  if (limpio.length < 6) return "#0b1220";
  const r = parseInt(limpio.slice(0, 2), 16);
  const g = parseInt(limpio.slice(2, 4), 16);
  const b = parseInt(limpio.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? "#0b1220" : "#ffffff";
}

/** "169 (74%)" -> 169 · "65%" -> 65 · 65 -> 65. null si no es numérico. */
function numero(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = parseFloat(String(valor).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** La posesión se pinta con %; el resto tal cual. */
function etiqueta(valor, esPorcentaje) {
  if (valor === null || valor === undefined || valor === "") return "-";
  return esPorcentaje ? `${valor}%` : String(valor);
}


/* ------------------------------------------------------------------ */
/* 1. Momentum por minuto                                             */
/* ------------------------------------------------------------------ */
function Momentum({ puntos, equipos, minuto }) {
  const [equipoLocal, equipoVisita] = equipos || [];

  const vista = useMemo(() => {
    if (!puntos?.length) return null;
    const ANCHO = 320;
    const ALTO = 96;
    const MEDIO = ALTO / 2;
    const maxMinuto = Math.max(45, ...puntos.map((p) => Number(p.minuto) || 0));
    // Eje del partido completo: 45' si solo hay primera parte, 90' si ya rueda
    // la segunda (120' con prórroga).
    const tope = maxMinuto <= 45 ? 45 : maxMinuto <= 90 ? 90 : 120;
    const paso = ANCHO / Math.max(1, tope);
    const anchoBarra = Math.max(1.3, paso * 0.62);

    const barras = puntos.map((p) => {
      const min = Math.max(0, Math.min(tope, Number(p.minuto) || 0));
      const v = Math.max(-100, Math.min(100, Number(p.valor) || 0));
      const alto = Math.max(0.9, (Math.abs(v) / 100) * (MEDIO - 6));
      return { x: min * paso, alto, positivo: v >= 0, v };
    });

    const ultimoMin = Math.min(tope, Number(puntos[puntos.length - 1]?.minuto) || 0);

    return {
      ANCHO,
      ALTO,
      MEDIO,
      barras,
      anchoBarra,
      tope,
      xAhora: ultimoMin * paso,
      ultimo: barras[barras.length - 1],
      mitad: (45 / tope) * ANCHO,
    };
  }, [puntos]);

  if (!vista) return null;

  const colorLocal = equipoLocal?.color || LOCAL;
  const colorVisita = equipoVisita?.color || VISITA;


  return (
    <section className="sd-card est-card est-card--momento" data-tab="stats">
      <header className="est-cab">
        <h3 className="est-titulo">Momentum</h3>
        {minuto ? <span className="est-minuto-vivo">{minuto}</span> : null}
      </header>

      <div className="est-momento-equipos">
        <span className="est-escudo est-escudo--local">
          {equipoLocal?.escudo ? <img src={equipoLocal.escudo} alt="" /> : null}
          <i style={{ background: colorLocal }} />
        </span>

        <svg
          viewBox={`0 0 ${vista.ANCHO} ${vista.ALTO}`}
          className="est-momento"
          role="img"
          aria-label={`Momentum: ${equipoLocal?.nombre || "local"} arriba, ${equipoVisita?.nombre || "visitante"} abajo`}
          preserveAspectRatio="none"
        >
          <g className="est-momento-dibujo">
            {vista.barras.map((b, i) => (
              <rect
                key={i}
                className={`est-barra ${b.positivo ? "est-barra--arriba" : "est-barra--abajo"}`}
                style={{ "--i": i }}
                x={b.x - vista.anchoBarra / 2}
                y={b.positivo ? vista.MEDIO - b.alto : vista.MEDIO}
                width={vista.anchoBarra}
                height={b.alto}
                rx={Math.min(1.2, vista.anchoBarra / 2.4)}
                fill={b.positivo ? colorLocal : colorVisita}
                opacity={0.55 + Math.min(0.45, Math.abs(b.v) / 140)}
              />
            ))}
            <line
              x1="0"
              y1={vista.MEDIO}
              x2={vista.ANCHO}
              y2={vista.MEDIO}
              stroke="rgba(255,255,255,.22)"
              strokeWidth="0.8"
            />
          </g>

          {vista.tope > 45 ? (
            <line
              x1={vista.mitad}
              y1="3"
              x2={vista.mitad}
              y2={vista.ALTO - 3}
              stroke="rgba(255,255,255,.12)"
              strokeWidth="0.8"
            />
          ) : null}

          {/* Marcador del minuto actual: las barras no llegan hasta el final del
              eje mientras el partido sigue, y esto lo deja claro. */}
          <g className="est-momento-ahora">
            <line
              x1={vista.xAhora}
              y1="2"
              x2={vista.xAhora}
              y2={vista.ALTO - 2}
              stroke="rgba(248,113,113,.85)"
              strokeWidth="1"
            />
            <circle className="est-momento-halo" cx={vista.xAhora} cy={vista.MEDIO} r="6" fill={colorLocal} />
          </g>

          <circle
            className="est-momento-punto"
            cx={vista.xAhora}
            cy={vista.MEDIO}
            r="2.6"
            fill="#0b1220"
            stroke={colorLocal}
            strokeWidth="1.4"
          />
        </svg>

        <span className="est-escudo est-escudo--visita">
          {equipoVisita?.escudo ? <img src={equipoVisita.escudo} alt="" /> : null}
          <i style={{ background: colorVisita }} />
        </span>
      </div>

      <div className="est-eje">
        <span>0&apos;</span>
        {vista.tope > 45 ? <span>HT</span> : null}
        <span>{vista.tope}&apos;</span>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Comparativa                                                     */
/* ------------------------------------------------------------------ */
function Posesion({ fila, equipos }) {
  const [equipoLocal, equipoVisita] = equipos || [];
  const a = numero(fila?.local);
  const b = numero(fila?.visita);
  const total = (a ?? 0) + (b ?? 0) || 1;
  const pctLocal = Math.round(((a ?? 0) / total) * 100);
  const pctVisita = 100 - pctLocal;
  const colorLocal = equipoLocal?.color || LOCAL;
  const colorVisita = equipoVisita?.color || VISITA;

  return (
    <div className="est-posesion">
      <div className="est-posesion-barra">
        <span
          className="est-posesion-tramo"
          style={{ width: `${pctLocal}%`, background: colorLocal, color: textoSobre(colorLocal) }}
        >
          {pctLocal}%
        </span>
        <span
          className="est-posesion-tramo"
          style={{ width: `${pctVisita}%`, background: colorVisita, color: textoSobre(colorVisita) }}
        >
          {pctVisita}%
        </span>
      </div>
      <div className="est-posesion-pie">
        <span>{equipoLocal?.nombre}</span>
        <em>{fila?.titulo || "Posesión"}</em>
        <span>{equipoVisita?.nombre}</span>
      </div>
    </div>
  );
}

function FilaStat({ fila, equipos, i }) {
  const [equipoLocal, equipoVisita] = equipos || [];
  const a = numero(fila.local);
  const b = numero(fila.visita);
  // Cada lado crece desde el CENTRO hacia fuera y se mide contra el mayor de
  // los dos, como en los trackers de referencia (no contra el total).
  const tope = Math.max(a ?? 0, b ?? 0) || 1;
  const pctLocal = a != null ? Math.max(3, (a / tope) * 100) : 0;
  const pctVisita = b != null ? Math.max(3, (b / tope) * 100) : 0;
  const ganaLocal = fila.destaca === "home";
  const ganaVisita = fila.destaca === "away";
  const colorLocal = equipoLocal?.color || LOCAL;
  const colorVisita = equipoVisita?.color || VISITA;

  return (
    <div className="est-fila" style={{ "--i": i }}>
      <span
        className={ganaLocal ? "est-valor est-valor--badge" : "est-valor"}
        style={ganaLocal ? { background: colorLocal, color: textoSobre(colorLocal) } : undefined}
      >
        {etiqueta(fila.local, fila.grafico)}
      </span>

      <div className="est-fila-medio">
        <span className="est-fila-titulo">{fila.titulo}</span>
        <span className="est-fila-barras" aria-hidden="true">
          <span className="est-track est-track--izq">
            <i style={{ width: `${pctLocal}%`, background: colorLocal }} />
          </span>
          <span className="est-track est-track--der">
            <i style={{ width: `${pctVisita}%`, background: colorVisita }} />
          </span>
        </span>
      </div>

      <span
        className={ganaVisita ? "est-valor est-valor--der est-valor--badge" : "est-valor est-valor--der"}
        style={ganaVisita ? { background: colorVisita, color: textoSobre(colorVisita) } : undefined}
      >
        {etiqueta(fila.visita, fila.grafico)}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Timeline de acciones                                            */
/* ------------------------------------------------------------------ */
function IconoEvento({ evento }) {
  if (evento.tipo === "Goal") {
    return (
      <span className="est-ico est-ico--gol" aria-label={evento.propio ? "Gol en propia puerta" : "Gol"}>
        <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
          <circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <path d="M12 7.2l3.8 2.8-1.5 4.5h-4.6l-1.5-4.5z" fill="currentColor" />
        </svg>
      </span>
    );
  }
  if (evento.tipo === "Card") {
    const roja = /red/i.test(evento.tarjeta || "");
    return (
      <span
        className={`est-tarjeta ${roja ? "est-tarjeta--roja" : "est-tarjeta--amarilla"}`}
        aria-label={roja ? "Tarjeta roja" : "Tarjeta amarilla"}
      />
    );
  }
  if (evento.tipo === "Substitution") {
    return (
      <span className="est-ico est-ico--cambio" aria-label="Cambio">
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 9h13l-3-3" />
          <path d="M20 15H7l3 3" />
        </svg>
      </span>
    );
  }
  return (
    <span className="est-ico" aria-hidden="true">
      •
    </span>
  );
}

function Eventos({ eventos, equipos, descanso }) {
  if (!eventos?.length) return null;
  const [equipoLocal, equipoVisita] = equipos || [];

  // Del más reciente al más antiguo, como en un tracker en vivo.
  const orden = [...eventos].sort(
    (a, b) => (Number(b.minuto) || 0) - (Number(a.minuto) || 0)
  );
  const cruzaDescanso = orden.some((x) => (Number(x.minuto) || 0) > 45);

  const filas = [];
  let separado = false;
  for (const e of orden) {
    const min = Number(e.minuto) || 0;
    if (!separado && cruzaDescanso && min <= 45) {
      filas.push(
        <li key="separador" className="est-separador">
          <span>1ª parte</span>
          {descanso ? (
            <b>
              {descanso[0]} - {descanso[1]}
            </b>
          ) : null}
        </li>
      );
      separado = true;
    }
    filas.push(
      <li
        key={`${e.minuto}-${e.jugador_id || e.jugador}-${e.tipo}-${e.es_local}`}
        className={`est-evento${e.es_local ? " es-local" : " es-visita"}`}
        style={{ "--i": filas.length }}
      >
        <span className="est-evento-min">{e.minuto}&apos;</span>
        <span className="est-evento-cuerpo">
          <IconoEvento evento={e} />
          <span className="est-evento-texto">
            <b
              style={{
                color: colorTexto(
                  e.es_local ? equipoLocal?.color || LOCAL : equipoVisita?.color || VISITA
                ),
              }}
            >
              {e.jugador || e.tipo}
            </b>
            {e.marcador ? (
              <em>
                {" "}
                ({e.marcador[0]} - {e.marcador[1]})
              </em>
            ) : null}
            {e.asistente ? <small>asist. {e.asistente}</small> : null}
          </span>
        </span>
      </li>
    );
  }

  return (
    <section className="sd-card est-card" data-tab="stats">
      <header className="est-cab">
        <h3 className="est-titulo">Acciones</h3>
        <span className="est-leyenda">
          <span>
            <i style={{ background: equipoLocal?.color || LOCAL }} />
            {equipoLocal?.nombre}
          </span>
          <span>
            <i style={{ background: equipoVisita?.color || VISITA }} />
            {equipoVisita?.nombre}
          </span>
        </span>
      </header>
      <ul className="est-timeline">{filas}</ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Esqueleto de carga (shimmer, no spinner)                           */
/* ------------------------------------------------------------------ */
function Esqueleto() {
  return (
    <section className="sd-card est-card est-esqueleto" data-tab="stats" aria-busy="true" aria-label="Cargando estadísticas">
      <span className="est-brillo est-brillo--titulo" />
      <span className="est-brillo est-brillo--barra" />
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="est-brillo est-brillo--fila" style={{ "--i": i }} />
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Componente principal                                               */
/* ------------------------------------------------------------------ */
export default function EstadisticasPartido({ eventId, league = null, respaldo = null }) {
  // `null` = cargando. Se resuelve de forma perezosa para no escribir estado
  // dentro del efecto (react-hooks/set-state-in-effect).
  const [datos, setDatos] = useState(() =>
    getStoredSession() && eventId
      ? null
      : { ok: false, detalle: "Inicia sesión para ver las estadísticas." }
  );
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (datos) return undefined;
    let cancelado = false;

    fetchEstadisticasPartido(getStoredSession(), "soccer", eventId, league)
      .then((r) => {
        if (!cancelado) setDatos(r || { ok: false });
      })
      .catch(() => {
        if (!cancelado) setDatos({ ok: false });
      });

    return () => {
      cancelado = true;
    };
  }, [datos, eventId, league]);

  if (!datos) return <Esqueleto />;

  const equipos = datos.equipos || [];

  // Sin datos de FotMob: se aprovecha lo que ya traía la ficha de ESPN, pero
  // con el mismo formato (colores del equipo, badges y barras).
  if (!datos.ok) {
    const planas = Object.entries(respaldo || {}).flatMap(([, lista]) =>
      (lista || []).map((s) => ({ titulo: s.name, local: s.home, visita: s.away, destaca: "equal" }))
    );
    if (!planas.length) {
      return (
        <p className="est-vacio">
          {datos.detalle || "La fuente no publica estadísticas de este partido."}
        </p>
      );
    }
    return (
      <section className="sd-card est-card" data-tab="stats">
        <header className="est-cab">
          <h3 className="est-titulo">Estadísticas</h3>
        </header>
        {planas.map((f, i) => (
          <FilaStat key={`${f.titulo}-${i}`} fila={f} equipos={equipos} i={i} />
        ))}
      </section>
    );
  }

  const top = (datos.top || []).map((f) => ({ ...f, titulo: t(f.titulo) }));
  const grupos = (datos.grupos || []).map((g) => ({
    ...g,
    titulo: t(g.titulo),
    filas: (g.filas || []).map((f) => ({ ...f, titulo: t(f.titulo) })),
  }));
  const pose = top.find((f) => f.grafico) || null;
  // Mercado y modelo SIEMPRE primero: posesiones/xG/xA antes del resto.
  const filas = top
    .filter((f) => !f.grafico)
    .sort((a, b) => {
      const pa = ["Goles esperados (xG)", "Asistencias esperadas (xA)", "Goles", "Tiros", "Tiros a puerta"].indexOf(a.titulo);
      const pb = ["Goles esperados (xG)", "Asistencias esperadas (xA)", "Goles", "Tiros", "Tiros a puerta"].indexOf(b.titulo);
      if (pa === -1 && pb === -1) return 0;
      if (pa === -1) return 1;
      if (pb === -1) return -1;
      return pa - pb;
    });
  const visibles = abierto ? filas : filas.slice(0, 5);
  const hayMas = filas.length > visibles.length || grupos.length > 0;

  return (
    <div className="est-stack">
      {/* Tracker en vivo: se enseña siempre que la fuente lo publique (sin soloSiHay,
          porque en la pestaña Estadísticas el usuario quiere ver el estado real). */}
      {eventId ? (
        <TrackerPartido eventId={eventId} league={league || null} dataTab="stats" />
      ) : null}

      {datos.momento?.length ? (
        <Momentum puntos={datos.momento} equipos={equipos} minuto={datos.minuto} />
      ) : null}

      {top.length ? (
        <section className="sd-card est-card" data-tab="stats">
          <header className="est-cab">
            <h3 className="est-titulo">Estadísticas</h3>
            {datos.en_vivo ? <span className="est-live"><i />EN VIVO</span> : null}
          </header>

          {pose ? <Posesion fila={pose} equipos={equipos} /> : null}

          <div className="est-filas">
            {visibles.map((f, i) => (
              <FilaStat key={f.titulo} fila={f} equipos={equipos} i={i} />
            ))}
          </div>

          <div className={`est-plegable${abierto ? " abierto" : ""}`}>
            <div>
              {filas.slice(5).map((f, i) => (
                <FilaStat key={f.titulo} fila={f} equipos={equipos} i={i} />
              ))}
              {grupos.map((g) => (
                <div key={g.titulo} className="est-grupo">
                  <h4 className="est-grupo-titulo">{g.titulo}</h4>
                  {g.filas.map((f, i) => (
                    <FilaStat key={f.titulo} fila={f} equipos={equipos} i={i} />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {hayMas ? (
            <button
              type="button"
              className="est-vermas"
              onClick={() => setAbierto((v) => !v)}
              aria-expanded={abierto}
            >
              {abierto ? "Menos estadísticas" : "Todas las estadísticas"}
              <span className={abierto ? "est-chevron abierto" : "est-chevron"} aria-hidden="true" />
            </button>
          ) : null}
        </section>
      ) : null}

      <Eventos eventos={datos.eventos} equipos={equipos} descanso={datos.descanso} />
    </div>
  );
}
