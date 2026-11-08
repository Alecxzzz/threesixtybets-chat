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
 * En el móvil el campo se pinta VERTICAL (como la app de FotMob): se aprovecha
 * todo el ancho de la pantalla y los jugadores salen mucho más grandes.
 */
function useCampoVertical() {
  const [vertical, setVertical] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 700px)").matches
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 700px)");
    const alCambiar = () => setVertical(mq.matches);
    mq.addEventListener("change", alCambiar);
    return () => mq.removeEventListener("change", alCambiar);
  }, []);

  return vertical;
}

function Marca({ jugador, x, y, color, tipo, detalle }) {
  const nombre = String(jugador?.nombre || "").trim();
  const corto = nombre.length > 12 ? `${nombre.slice(0, 11)}…` : nombre;
  const etiqueta = tipo === "probable" ? `${jugador?.posibilidad ?? 0}%` : jugador?.nota;
  const fondo = tipo === "probable" ? "#1d4ed8" : colorNota(jugador?.nota);

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

      <ellipse cx="0" cy="4.6" rx="3.1" ry="0.8" fill="rgba(0,0,0,.42)" />
      <circle r="3.7" fill="rgba(255,255,255,.10)" />
      <circle r="3.2" fill={color} stroke="rgba(255,255,255,.92)" strokeWidth="0.3" />

      {jugador?.foto ? (
        <g clipPath="url(#alz-clip)">
          <image
            href={jugador.foto}
            x="-3.2"
            y="-3.2"
            width="6.4"
            height="6.4"
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
      ) : (
        <text y="1" textAnchor="middle" fontSize="2.5" fontWeight="800" fill="#fff">
          {(nombre || "?").slice(0, 2).toUpperCase()}
        </text>
      )}

      {/* nota / % de titularidad */}
      {etiqueta !== undefined && etiqueta !== null && etiqueta !== "" ? (
        <g transform="translate(2.4 -2.4)">
          <circle r="1.6" fill={fondo} stroke="#0b1118" strokeWidth="0.22" />
          <text y="0.6" textAnchor="middle" fontSize="1.7" fontWeight="800" fill="#fff">
            {etiqueta}
          </text>
        </g>
      ) : null}

      {/* dorsal + nombre, en texto limpio (sin pastilla) */}
      <text
        y="5.9"
        textAnchor="middle"
        fontSize="2.15"
        fontWeight="800"
        fill="#ffffff"
        style={{ paintOrder: "stroke", stroke: "rgba(6,12,10,.85)", strokeWidth: 0.55 }}
      >
        {`${jugador?.dorsal ? `${jugador.dorsal} ` : ""}${corto}`}
      </text>

      {extra ? (
        <text
          y="8.3"
          textAnchor="middle"
          fontSize="1.9"
          fontWeight="700"
          fill="#9fb0c4"
          style={{ paintOrder: "stroke", stroke: "rgba(6,12,10,.8)", strokeWidth: 0.45 }}
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
  const vertical = useCampoVertical();

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

  // Horizontal: el local ataca hacia la derecha. Vertical: el local ataca hacia
  // arriba (su portería queda abajo), así el portero siempre está abajo.
  const px = (j, esLocal) => {
    const x = Number(j.x || 0);
    const y = Number(j.y || 0);
    if (vertical) return 7 + y * 54;
    return esLocal ? 4 + x * 45 : 96 - x * 45;
  };

  const py = (j, esLocal) => {
    const x = Number(j.x || 0);
    if (vertical) return esLocal ? 93 - x * 45 : 7 + x * 45;
    return 7 + Number(j.y || 0) * 54;
  };


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
          viewBox={vertical ? "0 0 68 100" : "0 0 100 68"}
          className={vertical ? "alz-campo alz-campo-v" : "alz-campo"}
          role="img"
          aria-label="Alineación del partido"
        >
          <defs>
            <clipPath id="alz-clip">
              <circle r="3.2" />
            </clipPath>
            <linearGradient id="alz-cesped" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1b5f35" />
              <stop offset="100%" stopColor="#0d3a20" />
            </linearGradient>
          </defs>

          {/* El cesped y las lineas se dibujan en horizontal (100x68) y se giran
              cuando el campo es vertical, asi no hay que duplicar el dibujo. */}
          <g transform={vertical ? "translate(68 0) rotate(90)" : undefined}>

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
          </g>

          {(local?.titulares || []).map((j, i) => (
            <Marca key={`l-${j.id || i}`} jugador={j} x={px(j, true)} y={py(j, true)} color={COLOR_LOCAL} tipo={tipo} detalle={chip} />
          ))}
          {(visita?.titulares || []).map((j, i) => (
            <Marca key={`v-${j.id || i}`} jugador={j} x={px(j, false)} y={py(j, false)} color={COLOR_VISITA} tipo={tipo} detalle={chip} />
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

