import { useEffect, useMemo, useState } from "react";
import { getStoredSession, fetchAlineacion } from "../services/api";
import FichaJugador from "./FichaJugador";

/**
 * Alineación del partido con FOTOS de todos los jugadores.
 *
 * Datos: /stats/alineacion (FotMob)
 *   - tipo "oficial": once real con nota, suplentes y bajas.
 *   - tipo "probable": once más repetido en los últimos partidos (con % de
 *     titularidad), para cuando aún no se publicó la oficial.
 * Cada jugador trae: id, nombre, dorsal, pos_id, x, y (0..1), nota, foto.
 *
 * Coordenadas: FotMob da x=0 en la portería propia y x=1 en la contraria, así
 * que el local se pinta en la mitad izquierda y el visitante en la derecha.
 */

const COLOR_LOCAL = "#22c55e";
const COLOR_VISITA = "#f97316";

/** Color de la nota (estilo SofaScore). */
function colorNota(nota) {
  if (nota == null) return "#334155";
  if (nota >= 7) return "#16a34a";
  if (nota >= 6) return "#ca8a04";
  return "#dc2626";
}

/**
 * Agrupa a los jugadores en LÍNEAS (portero, defensa, medio, ataque) según su
 * x. Así se pueden repartir a la misma distancia y los nombres no se pisan.
 */
function lineas(jugadores) {
  const orden = [...(jugadores || [])].sort((a, b) => Number(a.x || 0) - Number(b.x || 0));
  const grupos = [];
  for (const j of orden) {
    const x = Number(j.x || 0);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && Math.abs(x - ultimo.x) < 0.08) {
      ultimo.jugadores.push(j);
    } else {
      grupos.push({ x, jugadores: [j] });
    }
  }
  return grupos.map((g) => g.jugadores);
}

/**
 * Reparte a los jugadores de una misma línea a lo ancho del campo. FotMob a
 * veces da la misma y a dos jugadores (o el once probable los mezcla de varios
 * partidos): así se separan y no se pisan.
 */
function reparte(fila) {
  const minimo = Math.min(12, 54 / Math.max(1, fila.length - 1));
  const enFila = fila
    .map((jugador) => ({ jugador, x: 7 + Number(jugador.y || 0) * 54 }))
    .sort((a, b) => a.x - b.x);

  for (let i = 1; i < enFila.length; i += 1) {
    if (enFila[i].x - enFila[i - 1].x < minimo) enFila[i].x = enFila[i - 1].x + minimo;
  }

  const sobra = enFila.length ? Math.max(0, enFila[enFila.length - 1].x - 61) : 0;
  return enFila.map(({ jugador, x }) => ({
    jugador,
    x: Math.max(7, Math.min(61, x - sobra)),
  }));
}

/**
 * Nombre corto para el campo: solo el apellido (como FotMob), así no se pisan
 * los textos aunque haya cinco jugadores en la misma línea.
 */
function nombreCorto(nombre) {
  const partes = String(nombre || "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  const apellido = partes.length > 1 ? partes[partes.length - 1] : partes[0];
  return apellido.length > 11 ? `${apellido.slice(0, 10)}…` : apellido;
}

function Marca({ jugador, x, y, tono, tipo, detalle, goles = 0, asistencias = 0, indice = 0, onAbrir }) {
  const nombre = String(jugador?.nombre || "").trim();
  const corto = nombreCorto(nombre);
  const etiqueta = tipo === "probable" ? `${jugador?.posibilidad ?? 0}%` : jugador?.nota;
  const fondo = tipo === "probable" ? "#1d4ed8" : colorNota(jugador?.nota);
  // El visitante lleva el nombre encima: así los dos equipos no se pisan en el medio
  const arriba = tono === "visita";

  // Dato extra bajo el nombre segun el chip elegido
  let extra = "";
  if (detalle === "valor" && jugador?.valor) extra = `${Math.round(jugador.valor / 1e6)} M€`;
  else if (detalle === "edad" && jugador?.edad) extra = `${jugador.edad} años`;
  else if (detalle === "pais" && jugador?.pais) extra = jugador.pais;

  return (
    <g
      transform={`translate(${x} ${y})`}
      className="alz-jug"
      style={{ animationDelay: `${Math.min(indice, 22) * 45}ms` }}
      role="button"
      tabIndex={0}
      aria-label={`${nombre}. Ver sus estadísticas del partido`}
      onClick={() => onAbrir?.(jugador)}
      onKeyDown={(ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          onAbrir?.(jugador);
        }
      }}
    >
      <title>
        {`${nombre}${jugador?.dorsal ? ` · #${jugador.dorsal}` : ""}${jugador?.nota ? ` · nota ${jugador.nota}` : ""}${goles ? ` · ${goles} gol(es)` : ""}${asistencias ? ` · ${asistencias} asistencia(s)` : ""}`}
      </title>

      {/* sombra proyectada sobre el césped */}
      <ellipse cx="0.25" cy="3.9" rx="3.15" ry="0.85" fill="rgba(0,0,0,.55)" />

      {/* anillo con degradado: da volumen de esfera */}
      <circle r="3.55" fill={`url(#alz-aro-${tono})`} />
      <circle r="3.15" fill="#0b1118" opacity="0.65" />

      {jugador?.foto ? (
        <g clipPath="url(#alz-clip)">
          <image
            href={jugador.foto}
            x="-3.15"
            y="-3.15"
            width="6.3"
            height="6.3"
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
      ) : (
        <text y="1" textAnchor="middle" fontSize="2.5" fontWeight="800" fill="#fff">
          {(nombre || "?").slice(0, 2).toUpperCase()}
        </text>
      )}

      {/* brillo de la parte alta + aro fino claro */}
      <circle r="3.15" fill="url(#alz-brillo)" />
      <circle r="3.15" fill="none" stroke="rgba(255,255,255,.8)" strokeWidth="0.2" />

      {/* nota / % de titularidad */}
      {etiqueta !== undefined && etiqueta !== null && etiqueta !== "" ? (
        <g transform="translate(2.35 -2.35)">
          <circle r="1.55" fill="rgba(0,0,0,.55)" />
          <circle r="1.35" fill={fondo} stroke="#0b1118" strokeWidth="0.18" />
          <text y="0.5" textAnchor="middle" fontSize="1.55" fontWeight="800" fill="#fff">
            {etiqueta}
          </text>
        </g>
      ) : null}

      {/* goles y asistencias EN VIVO, sobre el jugador */}
      {goles > 0 ? (
        <g transform="translate(-2.75 -2.6)">
          <circle r="1.7" fill="#0b1118" stroke="#facc15" strokeWidth="0.25" />
          <text y="0.62" textAnchor="middle" fontSize="1.85">⚽</text>
          {goles > 1 ? (
            <text x="1.9" y="-1.2" textAnchor="middle" fontSize="1.7" fontWeight="800" fill="#facc15">
              {goles}
            </text>
          ) : null}
        </g>
      ) : null}

      {asistencias > 0 ? (
        <g transform="translate(-2.75 2.7)">
          <circle r="1.55" fill="#0b1118" stroke="#38bdf8" strokeWidth="0.25" />
          <text y="0.58" textAnchor="middle" fontSize="1.6" fontWeight="800" fill="#7dd3fc">
            A
          </text>
          {asistencias > 1 ? (
            <text x="1.8" y="-1.1" textAnchor="middle" fontSize="1.6" fontWeight="800" fill="#7dd3fc">
              {asistencias}
            </text>
          ) : null}
        </g>
      ) : null}

      {/* apellido, en texto limpio (sin pastilla) */}
      <text
        y={arriba ? -5.85 : 5.85}
        textAnchor="middle"
        fontSize="2.05"
        fontWeight="800"
        fill="#ffffff"
        style={{ paintOrder: "stroke", stroke: "rgba(4,10,7,.9)", strokeWidth: 0.6 }}
      >
        {corto}
      </text>

      {extra ? (
        <text
          y={arriba ? -8.15 : 8.15}
          textAnchor="middle"
          fontSize="1.8"
          fontWeight="700"
          fill="#c3d2e2"
          style={{ paintOrder: "stroke", stroke: "rgba(4,10,7,.85)", strokeWidth: 0.45 }}
        >
          {extra}
        </text>
      ) : null}
    </g>
  );
}

function FilaJugador({ jugador, tipo, color, goles = 0, asistencias = 0, onAbrir }) {
  const etiqueta = tipo === "probable" ? `${jugador?.posibilidad ?? 0}%` : jugador?.nota;
  return (
    <li
      className={`alz-fila${onAbrir ? " alz-fila-click" : ""}`}
      role={onAbrir ? "button" : undefined}
      tabIndex={onAbrir ? 0 : undefined}
      onClick={() => onAbrir?.(jugador)}
      onKeyDown={(ev) => {
        if (onAbrir && (ev.key === "Enter" || ev.key === " ")) {
          ev.preventDefault();
          onAbrir(jugador);
        }
      }}
    >
      <span className="alz-fila-foto">
        {jugador?.foto ? (
          <img src={jugador.foto} alt="" loading="lazy" />
        ) : (
          <span className="alz-fila-inicial">{(jugador?.nombre || "?").slice(0, 1)}</span>
        )}
      </span>
      <span className="alz-fila-dorsal" style={{ borderColor: color }}>
        {jugador?.dorsal || "-"}
      </span>
      <span className="alz-fila-nombre">{jugador?.nombre}</span>
      {goles > 0 ? <span className="alz-fila-aporte gol">⚽{goles > 1 ? ` ${goles}` : ""}</span> : null}
      {asistencias > 0 ? <span className="alz-fila-aporte asist">A{asistencias > 1 ? ` ${asistencias}` : ""}</span> : null}
      {etiqueta != null && etiqueta !== "" ? (
        <span
          className="alz-fila-nota"
          style={{ background: tipo === "probable" ? "#1d4ed8" : colorNota(jugador?.nota) }}
        >
          {etiqueta}
        </span>
      ) : null}
    </li>
  );
}

function CabeceraEquipo({ equipo, color }) {
  return (
    <div className="alz-cab">
      <span className="alz-cab-punto" style={{ background: color }} />
      <div className="alz-cab-texto">
        <span className="alz-cab-nombre">{equipo?.equipo}</span>
        <span className="alz-cab-meta">
          {equipo?.formacion || "-"}
          {equipo?.entrenador ? ` · ${equipo.entrenador}` : ""}
          {equipo?.nota != null ? ` · nota ${equipo.nota}` : ""}
        </span>
      </div>
    </div>
  );
}

/** Fila del banquillo: dorsal, nombre y rol (Portero/Defensa/Medio/Delantero). */
function FilaBanca({ jugador, color, onAbrir }) {
  return (
    <li
      className="alz-fila alz-fila-click"
      role="button"
      tabIndex={0}
      onClick={() => onAbrir?.(jugador)}
      onKeyDown={(ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          onAbrir?.(jugador);
        }
      }}
    >
      <span className="alz-fila-foto">
        <span className="alz-fila-inicial">{(jugador?.nombre || "?").slice(0, 1)}</span>
        {jugador?.foto ? (
          <img
            className="alz-fila-foto-img"
            src={jugador.foto}
            alt=""
            loading="lazy"
            onError={(ev) => {
              // Foto rota (FotMob devuelve 404 en algunos jugadores):
              // se quita y queda la inicial de debajo.
              ev.currentTarget.remove();
            }}
          />
        ) : null}
      </span>
      <span className="alz-fila-dorsal" style={{ borderColor: color }}>
        {jugador?.dorsal || "-"}
      </span>
      <span className="alz-fila-texto">
        <b>{jugador?.nombre}</b>
        {jugador?.rol ? <small>{jugador.rol}</small> : null}
      </span>
    </li>
  );
}

/** "2026-11-14T20:45:00Z" -> "14 nov 2026" */
function fechaCorta(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Baja: sancion (tarjeta) o lesion, con la fecha de vuelta si la hay. */
function FilaBaja({ jugador }) {
  const sancion = /suspen/i.test(jugador?.tipo || "");
  const cuando = fechaCorta(jugador?.regreso_fecha) || jugador?.regreso || "";
  return (
    <li className="alz-fila alz-fila-baja">
      <span className="alz-fila-foto">
        <span className="alz-fila-inicial">{(jugador?.nombre || "?").slice(0, 1)}</span>
        {jugador?.foto ? (
          <img
            className="alz-fila-foto-img"
            src={jugador.foto}
            alt=""
            loading="lazy"
            onError={(ev) => {
              ev.currentTarget.remove();
            }}
          />
        ) : null}
      </span>
      <span
        className={`alz-baja-icono ${sancion ? "sancion" : "lesion"}`}
        aria-hidden="true"
      >
        {sancion ? "▮" : "+"}
      </span>
      <span className="alz-fila-texto">
        <b>{jugador?.nombre}</b>
        <small>
          {sancion ? "Sancionado" : "Lesión"}
          {cuando ? ` · ${cuando}` : ""}
        </small>
      </span>
    </li>
  );
}

export default function Alineacion({ sport = "soccer", eventId, league = null }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState("campo");
  const [chip, setChip] = useState("nota");
  const [sel, setSel] = useState(null);

  // Goles y asistencias por jugador a partir de los eventos del partido (FotMob).
  // Un gol en propia puerta NO cuenta como gol del jugador.
  const aportes = useMemo(() => {
    const mapa = {};
    for (const e of datos?.eventos || []) {
      if (e.tipo !== "Goal") continue;
      const autor = String(e.jugador_id || "");
      if (autor && !e.propio) {
        mapa[autor] = mapa[autor] || { goles: 0, asistencias: 0 };
        mapa[autor].goles += 1;
      }
      const asistente = String(e.asistente_id || "");
      if (asistente) {
        mapa[asistente] = mapa[asistente] || { goles: 0, asistencias: 0 };
        mapa[asistente].asistencias += 1;
      }
    }
    return mapa;
  }, [datos]);

  const statsJugador = datos?.stats_jugador || {};
  const aporteDe = (jugador) => aportes[String(jugador?.id)] || { goles: 0, asistencias: 0 };
  const abrirJugador = (jugador) => setSel(jugador || null);

  // Recorrido con las flechas ‹ › de la ficha (titulares, en orden de campo).
  const ordenJugadores = useMemo(
    () => [...(datos?.local?.titulares || []), ...(datos?.visita?.titulares || [])],
    [datos]
  );

  const moverJugador = (paso) => {
    if (!sel || !ordenJugadores.length) return;
    const i = ordenJugadores.findIndex((j) => j.id === sel.id);
    const n = (i + paso + ordenJugadores.length) % ordenJugadores.length;
    setSel(ordenJugadores[n]);
  };

  // Escape cierra la ficha del jugador.
  useEffect(() => {
    if (!sel) return undefined;
    const alPulsar = (ev) => {
      if (ev.key === "Escape") setSel(null);
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [sel]);

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      const sesion = getStoredSession();
      if (!sesion || !eventId || sport !== "soccer") {
        if (!cancelado) setCargando(false);
        return;
      }
      try {
        const r = await fetchAlineacion(sesion, sport, eventId, league);
        if (!cancelado) setDatos(r);
      } catch {
        if (!cancelado) setDatos({ ok: false, detalle: "No se pudo cargar la alineación." });
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [sport, eventId, league]);

  if (sport !== "soccer") return null;

  if (cargando) {
    return (
      <div className="alz-cargando">
        <span className="alz-spinner" aria-hidden="true" />
        Cargando alineación…
      </div>
    );
  }

  if (!datos?.ok) {
    return <p className="alz-vacio">{datos?.detalle || "Sin alineación disponible para este partido."}</p>;
  }

  const { local, visita, tipo } = datos;
  const probable = tipo === "probable";

  // Campo VERTICAL (como la app de FotMob): el portero local queda abajo y el
  // visitante arriba. x = de portería a portería, y = a lo ancho del campo.
  const filasLocal = lineas(local?.titulares);
  const filasVisita = lineas(visita?.titulares);
  const totalFilas = Math.max(1, filasLocal.length + filasVisita.length);
  const paso = 93 / totalFilas; // reparto vertical: de la y=6 a la y=99
  const yLinea = (i, esLocal) => (esLocal ? 99 - (i + 0.5) * paso : 6 + (i + 0.5) * paso);


  return (
    <div>
      <div className="alz-barra">
        <span className={`alz-etiqueta${probable ? " es-probable" : ""}`}>
          {probable ? "Once probable" : "Alineación oficial"}
          {probable && local?.partidos ? ` · últimos ${local.partidos} partidos` : ""}
        </span>
        <div className="alz-toggle" role="group" aria-label="Vista de la alineación">
          <button
            type="button"
            className={vista === "campo" ? "alz-tab activo" : "alz-tab"}
            onClick={() => setVista("campo")}
          >
            Campo
          </button>
          <button
            type="button"
            className={vista === "lista" ? "alz-tab activo" : "alz-tab"}
            onClick={() => setVista("lista")}
          >
            Lista
          </button>
        </div>
      </div>

      <div className="alz-chips">
        {[
          { key: "nota", label: "Nota" },
          { key: "valor", label: "Valor" },
          { key: "edad", label: "Edad" },
          { key: "pais", label: "País" },
        ].map((c) => (
          <button
            key={c.key}
            type="button"
            className={chip === c.key ? "alz-chip activo" : "alz-chip"}
            onClick={() => setChip(c.key)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="alz-cabs">
        <CabeceraEquipo equipo={local} color={COLOR_LOCAL} />
        <CabeceraEquipo equipo={visita} color={COLOR_VISITA} />
      </div>

      {vista === "campo" ? (
        <svg
          viewBox="0 0 68 105"
          className="alz-campo alz-campo-v"
          role="img"
          aria-label="Alineación del partido"
        >
          <defs>
            <clipPath id="alz-clip">
              <circle r="3.15" />
            </clipPath>

            {/* Césped con volumen: degradado + viñeta */}
            <linearGradient id="alz-cesped" x1="0" y1="0" x2="0.25" y2="1">
              <stop offset="0%" stopColor="#2f8349" />
              <stop offset="45%" stopColor="#1e6537" />
              <stop offset="100%" stopColor="#0a2c18" />
            </linearGradient>
            <radialGradient id="alz-vineta" cx="0.5" cy="0.43" r="0.8">
              <stop offset="52%" stopColor="#ffffff" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
            </radialGradient>

            {/* Aros 3D de cada equipo (luz arriba a la izquierda) */}
            <radialGradient id="alz-aro-local" cx="0.34" cy="0.26" r="0.8">
              <stop offset="0%" stopColor="#8df0b0" />
              <stop offset="55%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#0f4527" />
            </radialGradient>
            <radialGradient id="alz-aro-visita" cx="0.34" cy="0.26" r="0.8">
              <stop offset="0%" stopColor="#ffe0b8" />
              <stop offset="55%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#6d2a10" />
            </radialGradient>
            <radialGradient id="alz-brillo" cx="0.32" cy="0.22" r="0.74">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
              <stop offset="52%" stopColor="#ffffff" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
            </radialGradient>

            <filter id="alz-sombra-campo" x="-8%" y="-8%" width="116%" height="116%">
              <feDropShadow dx="0" dy="1.4" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.55" />
            </filter>
          </defs>

          {/* Césped */}
          <rect
            x="0.5"
            y="0.5"
            width="67"
            height="104"
            rx="2.4"
            fill="url(#alz-cesped)"
            filter="url(#alz-sombra-campo)"
          />
          {Array.from({ length: 10 }).map((_, i) => (
            <rect
              key={i}
              x="0.5"
              y={0.5 + i * 10.4}
              width="67"
              height="10.4"
              fill={i % 2 ? "rgba(255,255,255,.035)" : "transparent"}
            />
          ))}
          <rect x="0.5" y="0.5" width="67" height="104" rx="2.4" fill="url(#alz-vineta)" />

          {/* Líneas */}
          <g stroke="rgba(255,255,255,.28)" strokeWidth="0.3" fill="none">
            <rect x="1.2" y="1.2" width="65.6" height="102.6" rx="1.6" />
            <line x1="1.2" y1="52.5" x2="66.8" y2="52.5" />
            <circle cx="34" cy="52.5" r="8.6" />
            <rect x="13.84" y="1.2" width="40.32" height="16.5" />
            <rect x="13.84" y="87.3" width="40.32" height="16.5" />
            <rect x="24.84" y="1.2" width="18.32" height="5.6" />
            <rect x="24.84" y="98.2" width="18.32" height="5.6" />
            <path d="M 25.4 17.7 Q 34 26.4 42.6 17.7" />
            <path d="M 25.4 87.3 Q 34 78.6 42.6 87.3" />
          </g>
          <circle cx="34" cy="52.5" r="0.55" fill="rgba(255,255,255,.5)" />

          {filasLocal.map((fila, i) =>
            reparte(fila).map(({ jugador, x }, k) => (
              <Marca
                key={`l-${jugador.id || `${i}-${k}`}`}
                jugador={jugador}
                x={x}
                y={yLinea(i, true)}
                tono="local"
                tipo={tipo}
                detalle={chip}
                goles={aporteDe(jugador).goles}
                asistencias={aporteDe(jugador).asistencias}
                indice={i * 5 + k}
                onAbrir={abrirJugador}
              />
            ))
          )}
          {filasVisita.map((fila, i) =>
            reparte(fila).map(({ jugador, x }, k) => (
              <Marca
                key={`v-${jugador.id || `${i}-${k}`}`}
                jugador={jugador}
                x={x}
                y={yLinea(i, false)}
                tono="visita"
                tipo={tipo}
                detalle={chip}
                goles={aporteDe(jugador).goles}
                asistencias={aporteDe(jugador).asistencias}
                indice={i * 5 + k}
                onAbrir={abrirJugador}
              />
            ))
          )}
        </svg>
      ) : (
        <div className="alz-lista">
          {[
            { equipo: local, color: COLOR_LOCAL },
            { equipo: visita, color: COLOR_VISITA },
          ].map(({ equipo, color }) => (
            <div key={equipo?.equipo || color} className="alz-lista-equipo">
              <CabeceraEquipo equipo={equipo} color={color} />
              <ul className="alz-filas">
                {(equipo?.titulares || []).map((j, i) => (
                  <FilaJugador
                    key={`${j.id || i}`}
                    jugador={j}
                    tipo={tipo}
                    color={color}
                    goles={aporteDe(j).goles}
                    asistencias={aporteDe(j).asistencias}
                    onAbrir={abrirJugador}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Cuerpo tecnico */}
      <div className="alz-tecnicos">
        {[{ equipo: local, color: COLOR_LOCAL }, { equipo: visita, color: COLOR_VISITA }].map(({ equipo, color }) => (
          <div key={`c-${equipo?.equipo || color}`} className="alz-tecnico">
            <span className="alz-cab-punto" style={{ background: color }} />
            <b>{equipo?.entrenador || "—"}</b>
            <span>Entrenador</span>
          </div>
        ))}
      </div>

      {/* Banquillo: dos columnas, con el rol de cada suplente */}
      {local?.suplentes?.length || visita?.suplentes?.length ? (
        <section className="alz-bloque">
          <h4 className="alz-bloque-tit">Banquillo</h4>
          <div className="alz-banca-grid">
            {[{ equipo: local, color: COLOR_LOCAL }, { equipo: visita, color: COLOR_VISITA }].map(({ equipo, color }) => (
              <ul key={`b-${equipo?.equipo || color}`} className="alz-banca-lista">
                {(equipo?.suplentes || []).map((j, i) => (
                  <FilaBanca key={`s-${j.id || i}`} jugador={j} color={color} onAbrir={abrirJugador} />
                ))}
              </ul>
            ))}
          </div>
        </section>
      ) : null}

      {/* Bajas: tipo y fecha de vuelta */}
      {local?.bajas?.length || visita?.bajas?.length ? (
        <section className="alz-bloque">
          <h4 className="alz-bloque-tit">Lesionados y sancionados</h4>
          <div className="alz-banca-grid">
            {[{ equipo: local, color: COLOR_LOCAL }, { equipo: visita, color: COLOR_VISITA }].map(({ equipo, color }) => (
              <ul key={`x-${equipo?.equipo || color}`} className="alz-banca-lista">
                {(equipo?.bajas || []).map((j, i) => (
                  <FilaBaja key={`x-${i}`} jugador={j} />
                ))}
              </ul>
            ))}
          </div>
        </section>
      ) : null}

      {/* Ficha del jugador: panel estilo FotMob (shot map + stats del partido) */}
      {sel ? (
        <FichaJugador
          jugador={sel}
          stats={statsJugador[String(sel.id)]}
          aporte={aporteDe(sel)}
          onClose={() => setSel(null)}
          onPrev={() => moverJugador(-1)}
          onNext={() => moverJugador(1)}
        />
      ) : null}

      <div className="alz-fuente">Alineación: FotMob</div>
    </div>
  );
}

