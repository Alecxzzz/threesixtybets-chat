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

function Marca({ jugador, x, y, color, tipo }) {
  const nombre = String(jugador?.nombre || "").trim();
  const corto = nombre.length > 11 ? `${nombre.slice(0, 10)}…` : nombre;
  const ancho = Math.max(7, Math.min(12.5, corto.length * 1.05 + 2));
  const etiqueta = tipo === "probable" ? `${jugador?.posibilidad ?? 0}%` : jugador?.nota;
  const fondo = tipo === "probable" ? "#1d4ed8" : colorNota(jugador?.nota);

  return (
    <g transform={`translate(${x} ${y})`}>
      <title>
        {`${nombre}${jugador?.dorsal ? ` · #${jugador.dorsal}` : ""}${jugador?.nota ? ` · nota ${jugador.nota}` : ""}`}
      </title>

      <ellipse cx="0" cy="3.9" rx="2.9" ry="0.7" fill="rgba(0,0,0,.4)" />
      <circle r="3.3" fill="rgba(255,255,255,.10)" />
      <circle r="2.9" fill={color} stroke="rgba(255,255,255,.9)" strokeWidth="0.28" />

      {jugador?.foto ? (
        <g clipPath="url(#alz-clip)">
          <image
            href={jugador.foto}
            x="-2.9"
            y="-2.9"
            width="5.8"
            height="5.8"
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
      ) : (
        <text y="0.9" textAnchor="middle" fontSize="2.4" fontWeight="800" fill="#fff">
          {(nombre || "?").slice(0, 2).toUpperCase()}
        </text>
      )}

      {/* dorsal */}
      <g transform="translate(2 -2)">
        <circle r="1.45" fill="#0b1118" stroke="rgba(255,255,255,.55)" strokeWidth="0.18" />
        <text y="0.58" textAnchor="middle" fontSize="1.75" fontWeight="800" fill="#e6edf3">
          {jugador?.dorsal || "-"}
        </text>
      </g>

      {/* nota / % de titularidad */}
      {etiqueta !== undefined && etiqueta !== null && etiqueta !== "" ? (
        <g transform="translate(0 -4.1)">
          <rect x="-2.2" y="-1.5" width="4.4" height="2.6" rx="0.7" fill={fondo} />
          <text y="0.42" textAnchor="middle" fontSize="1.8" fontWeight="800" fill="#fff">
            {etiqueta}
          </text>
        </g>
      ) : null}

      {/* nombre */}
      <g transform="translate(0 4.3)">
        <rect
          x={-ancho / 2}
          y="0"
          width={ancho}
          height="2.7"
          rx="1.35"
          fill="rgba(6,12,10,.76)"
          stroke="rgba(255,255,255,.10)"
          strokeWidth="0.1"
        />
        <text y="1.95" textAnchor="middle" fontSize="1.85" fontWeight="700" fill="#e9eff7">
          {corto}
        </text>
      </g>
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

  const px = (j, esLocal) => (esLocal ? 3 + Number(j.x || 0) * 47 : 97 - Number(j.x || 0) * 47);
  const py = (j) => 2 + Number(j.y || 0) * 64;


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

      <div className="alz-cabs">
        <CabeceraEquipo equipo={local} color={COLOR_LOCAL} />
        <CabeceraEquipo equipo={visita} color={COLOR_VISITA} />
      </div>

      {vista === "campo" ? (
        <svg viewBox="0 0 100 68" className="alz-campo" role="img" aria-label="Alineación del partido">
          <defs>
            <clipPath id="alz-clip">
              <circle r="2.9" />
            </clipPath>
            <linearGradient id="alz-cesped" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1b5f35" />
              <stop offset="100%" stopColor="#0d3a20" />
            </linearGradient>
          </defs>

          <rect x="0.4" y="0.4" width="99.2" height="67.2" rx="2" fill="url(#alz-cesped)" stroke="rgba(255,255,255,.16)" strokeWidth="0.35" />
          {Array.from({ length: 10 }).map((_, i) => (
            <rect key={i} x={0.4 + i * 9.92} y="0.4" width="9.92" height="67.2" fill={i % 2 ? "rgba(255,255,255,.03)" : "transparent"} />
          ))}
          <g stroke="rgba(255,255,255,.20)" strokeWidth="0.32" fill="none">
            <line x1="50" y1="0.4" x2="50" y2="67.6" />
            <circle cx="50" cy="34" r="8.6" />
            <rect x="0.4" y="13.84" width="15.7" height="40.32" />
            <rect x="83.9" y="13.84" width="15.7" height="40.32" />
            <rect x="0.4" y="24.84" width="5.24" height="18.32" />
            <rect x="94.36" y="24.84" width="5.24" height="18.32" />
          </g>
          <circle cx="50" cy="34" r="0.6" fill="rgba(255,255,255,.35)" />

          {(local?.titulares || []).map((j, i) => (
            <Marca key={`l-${j.id || i}`} jugador={j} x={px(j, true)} y={py(j)} color={COLOR_LOCAL} tipo={tipo} />
          ))}
          {(visita?.titulares || []).map((j, i) => (
            <Marca key={`v-${j.id || i}`} jugador={j} x={px(j, false)} y={py(j)} color={COLOR_VISITA} tipo={tipo} />
          ))}
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

