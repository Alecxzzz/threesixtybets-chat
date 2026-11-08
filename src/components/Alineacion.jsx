import { useEffect, useState } from "react";
import { getStoredSession, fetchAlineacion } from "../services/api";

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
 * Nombre corto para el campo: solo el apellido (como FotMob), así no se pisan
 * los textos aunque haya cinco jugadores en la misma línea.
 */
function nombreCorto(nombre) {
  const partes = String(nombre || "").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  const apellido = partes.length > 1 ? partes[partes.length - 1] : partes[0];
  return apellido.length > 11 ? `${apellido.slice(0, 10)}…` : apellido;
}

function Marca({ jugador, x, y, tono, tipo, detalle }) {
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
    <g transform={`translate(${x} ${y})`}>
      <title>
        {`${nombre}${jugador?.dorsal ? ` · #${jugador.dorsal}` : ""}${jugador?.nota ? ` · nota ${jugador.nota}` : ""}`}
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

function FilaJugador({ jugador, tipo, color }) {
  const etiqueta = tipo === "probable" ? `${jugador?.posibilidad ?? 0}%` : jugador?.nota;
  return (
    <li className="alz-fila">
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

export default function Alineacion({ sport = "soccer", eventId, league = null }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState("campo");
  const [chip, setChip] = useState("nota");

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
  const px = (j) => 7 + Number(j.y || 0) * 54;


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
            fila.map((j, k) => (
              <Marca
                key={`l-${j.id || `${i}-${k}`}`}
                jugador={j}
                x={px(j)}
                y={yLinea(i, true)}
                tono="local"
                tipo={tipo}
                detalle={chip}
              />
            ))
          )}
          {filasVisita.map((fila, i) =>
            fila.map((j, k) => (
              <Marca
                key={`v-${j.id || `${i}-${k}`}`}
                jugador={j}
                x={px(j)}
                y={yLinea(i, false)}
                tono="visita"
                tipo={tipo}
                detalle={chip}
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
                  <FilaJugador key={`${j.id || i}`} jugador={j} tipo={tipo} color={color} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="alz-bancas">
        {[
          { equipo: local, color: COLOR_LOCAL },
          { equipo: visita, color: COLOR_VISITA },
        ].map(({ equipo, color }) => (
          <div key={`b-${equipo?.equipo || color}`} className="alz-banca-grupo">
            {equipo?.suplentes?.length ? (
              <details className="alz-banca">
                <summary>
                  <span className="alz-banca-punto" style={{ background: color }} />
                  Suplentes {equipo?.equipo}
                  <span className="alz-banca-num">{equipo.suplentes.length}</span>
                </summary>
                <ul className="alz-filas">
                  {equipo.suplentes.map((j, i) => (
                    <FilaJugador key={`s-${j.id || i}`} jugador={j} tipo="oficial" color={color} />
                  ))}
                </ul>
              </details>
            ) : null}

            {equipo?.bajas?.length ? (
              <details className="alz-banca alz-bl">
                <summary>
                  <span className="alz-banca-punto" style={{ background: "#ef4444" }} />
                  Bajas {equipo?.equipo}
                  <span className="alz-banca-num">{equipo.bajas.length}</span>
                </summary>
                <ul className="alz-filas">
                  {equipo.bajas.map((j, i) => (
                    <li key={`x-${i}`} className="alz-fila">
                      <span className="alz-fila-foto">
                        {j.foto ? (
                          <img src={j.foto} alt="" loading="lazy" />
                        ) : (
                          <span className="alz-fila-inicial">?</span>
                        )}
                      </span>
                      <span className="alz-fila-nombre">{j.nombre}</span>
                      <span className="alz-fila-pos">{j.motivo || "baja"}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ))}
      </div>

      <div className="alz-fuente">Alineación: FotMob</div>
    </div>
  );
}

