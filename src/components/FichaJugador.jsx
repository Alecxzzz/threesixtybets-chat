import { useState } from "react";

/**
 * FichaJugador - panel de jugador estilo FotMob.
 *
 * Todo sale del mismo /stats/alineacion (matchDetails de FotMob): nota,
 * equipo, edad, pais, disparos del partido y stats por grupos.
 *
 * Sobre el heatmap: FotMob NO publica el mapa de calor de actividad del
 * jugador (ni `heatmapUrl` ni coordenadas por minuto; se comprobo: 400/404 y
 * `playerStats` sin coordenadas). Lo que si da es el `shotmap` por jugador con
 * x/y, xG, xGOT, resultado, situacion y tipo de cada remate. Con eso se pinta:
 *   - "Remates": mapa vertical interactivo (tiro seleccionable + detalle).
 *   - "Calor": densidad de esos mismos remates, y se dice que se calcula asi.
 * Nunca se inventa un heatmap de actividad.
 */

const TRADUCE = {
  LeftFoot: "Pie izquierdo",
  RightFoot: "Pie derecho",
  Head: "Cabeza",
  Other: "Otro",
  RegularPlay: "Jugada",
  Penalty: "Penal",
  FreeKick: "Tiro libre",
  CornerKick: "Corner",
  SetPiece: "Balón parado",
  FastBreak: "Contra",
  Goal: "Gol",
  AttemptSaved: "Atajado",
  AttemptBlocked: "Bloqueado",
  OffTarget: "Fuera",
  Post: "Al palo",
  OwnGoal: "En propia",
};

const txt = (v) => TRADUCE[v] || v || "—";

/** Titulos de grupo y stats de FotMob, en espanol. Lo que no este, se deja tal cual. */
const GRUPOS = {
  "Top stats": "Estadísticas",
  Attack: "Ataque",
  Defense: "Defensa",
  Duels: "Duelos",
  Goalkeeping: "Portería",
  Passing: "Pases",
};

const STATS_ES = {
  "FotMob rating": "Nota",
  "Minutes played": "Minutos jugados",
  Goals: "Goles",
  Assists: "Asistencias",
  "Total shots": "Remates",
  "Accurate passes": "Pases acertados",
  "Chances created": "Ocasiones creadas",
  Touches: "Toques",
  "Touches in opposition box": "Toques en el área rival",
  "Successful dribbles": "Regates logrados",
  "Accurate crosses": "Centros acertados",
  "Tackles won": "Entradas ganadas",
  Clearances: "Despejes",
  Recoveries: "Recuperaciones",
  "Duels won": "Duelos ganados",
  "Shots on target": "Tiros a puerta",
  "Shots off target": "Tiros fuera",
  "Blocked shots": "Tiros bloqueados",
  "Shot accuracy": "Precisión de tiro",
  "Defensive contributions": "Acciones defensivas",
  "Accurate long balls": "Pases largos acertados",
  Interceptions: "Intercepciones",
  "Expected goals (xG)": "xG",
  "Expected assists (xA)": "xA",
  "Passes into final third": "Pases al último tercio",
  "Big chances missed": "Ocasiones claras falladas",
  "Saves inside box": "Paradas dentro del área",
  "Aerial duels won": "Duelos aéreos ganados",
};

const grupoES = (v) => GRUPOS[v] || v || "";
const statES = (v) => STATS_ES[v] || v || "";

/** Bandera como imagen: Windows no dibuja emojis de bandera (salia "us"). */
function Bandera({ codigo, pais }) {
  const c = String(codigo || "").toLowerCase();
  if (c.length !== 2) return null;
  return (
    <img
      className="fj-bandera"
      src={`https://flagcdn.com/w20/${c}.png`}
      alt={pais ? `Bandera de ${pais}` : c}
      loading="lazy"
      onError={(ev) => {
        ev.currentTarget.style.display = "none";
      }}
    />
  );
}

/** Grupo de posición segun la coordenada en el campo (0 = porteria propia). */
function grupoPosicion(jugador) {
  const x = Number(jugador?.x ?? 0.5);
  if (x < 0.18) return "Portero";
  if (x < 0.42) return "Defensa";
  if (x < 0.68) return "Medio";
  return "Delantero";
}

function tonoNota(nota) {
  if (nota == null) return "sin";
  if (nota >= 7) return "alto";
  if (nota >= 6) return "medio";
  return "bajo";
}

/** Clasifica el remate por como acabo (color y leyenda). */
function claseTiro(t) {
  if (/goal/i.test(t.resultado || "")) return "gol";
  if (t.a_puerta) return "puerta";
  if (/block/i.test(t.resultado || "")) return "bloqueado";
  return "fuera";
}

const COLOR_TIRO = {
  gol: "#22c55e",
  puerta: "#e2e8f0",
  bloqueado: "#94a3b8",
  fuera: "#ef4444",
};

/**
 * Mapa de remates en vertical (porteria atacada arriba), como un tracker:
 *
 *  - "remates": cada tiro con su trayectoria hasta el punto de porteria, radio
 *    segun el xG y color segun el resultado. El seleccionado lleva anillo.
 *  - "calor": densidad de esos mismos remates. No es el heatmap de actividad
 *    (la fuente no publica posiciones), se calcula con las coordenadas REALES
 *    de sus tiros y se dice asi en la nota.
 */
function MapaRemates({ disparos, modo, seleccionado, onSeleccionar }) {
  const tiros = disparos || [];
  if (!tiros.length) {
    return <p className="fj-vacio">Sin remates en este partido.</p>;
  }

  // Coordenadas: FotMob da x = 0 (porteria propia) .. 100 (porteria rival) e
  // y = 0 .. 100 a lo ancho. En vertical la porteria queda arriba.
  const punto = (t) => ({
    x: 4 + (Math.max(0, Math.min(100, Number(t.y) || 0)) / 100) * 60,
    // Se dibuja solo la mitad atacante (viewBox 0..62): el tiro queda al doble
    // de tamaño. Un remate desde campo propio se ancla al borde.
    y: Math.min(59, 3 + ((100 - Math.max(0, Math.min(100, Number(t.x) || 0))) / 100) * 99),
  });

  // Donde cruzo la linea de gol: x_porteria viene en metros desde el centro
  // de la porteria (-3.66 .. +3.66).
  const destinoX = (t) => {
    const metros = Number(t.x_porteria);
    if (!Number.isFinite(metros)) return 34;
    return Math.max(24, Math.min(44, 34 + metros * 2.4));
  };

  const cuenta = { gol: 0, puerta: 0, fuera: 0, bloqueado: 0 };
  for (const t of tiros) cuenta[claseTiro(t)] += 1;

  return (
    <>
      <svg
        viewBox="0 0 68 62"
        className="fj-mapa"
        role="img"
        aria-label="Mapa de remates del jugador"
      >
        <defs>
          <radialGradient id="fj-cal">
            <stop offset="0%" stopColor="#fde047" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#facc15" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
          </radialGradient>
          <filter id="fj-suave" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>

        {/* cesped */}
        <rect x="0" y="0" width="68" height="62" rx="3" fill="#1c6b3a" />
        <rect x="3" y="3" width="62" height="56" rx="1.5" fill="none" stroke="#79c795" strokeWidth="0.6" opacity="0.55" />

        {/* areas y porteria (arriba) */}
        <g fill="none" stroke="#79c795" strokeWidth="0.6" opacity="0.6">
          <rect x="13" y="3" width="42" height="16" />
          <rect x="23" y="3" width="22" height="7" />
          <line x1="3" y1="59" x2="65" y2="59" />
          <circle cx="34" cy="62" r="8.2" />
          <circle cx="34" cy="59" r="0.9" fill="#79c795" stroke="none" />
          <circle cx="34" cy="14.5" r="0.8" fill="#79c795" stroke="none" />
        </g>
        {/* porteria: marco claro para ver a donde apuntan los tiros */}
        <rect x="26" y="0.6" width="16" height="2.6" rx="0.4" fill="rgba(226,232,240,0.14)" stroke="#e2e8f0" strokeWidth="0.45" />
        <line x1="26" y1="1.9" x2="42" y2="1.9" stroke="#e2e8f0" strokeWidth="0.2" opacity="0.35" />

        {modo === "calor" ? (
          <g filter="url(#fj-suave)" style={{ mixBlendMode: "screen" }}>
            {tiros.map((t, i) => {
              const p = punto(t);
              return <circle key={i} cx={p.x} cy={p.y} r="13" fill="url(#fj-cal)" />;
            })}
          </g>
        ) : (
          <g>
            {tiros.map((t, i) => {
              const k = claseTiro(t);
              const p = punto(t);
              const activo = i === seleccionado;
              const radio = 2.6 + Math.min(1, Number(t.xg) || 0) * 4.5;
              return (
                <g
                  key={i}
                  className="fj-tiro-punto"
                  style={{ "--i": i, cursor: "pointer" }}
                  onClick={() => onSeleccionar(i)}
                >
                  <line
                    x1={p.x}
                    y1={p.y}
                    x2={destinoX(t)}
                    y2="2.4"
                    stroke={COLOR_TIRO[k]}
                    strokeWidth={k === "gol" ? 0.75 : 0.45}
                    strokeOpacity={activo ? 0.95 : 0.45}
                    strokeDasharray={k === "fuera" ? "1.4 1.2" : k === "bloqueado" ? "0.7 1" : "none"}
                    strokeLinecap="round"
                  />
                  {activo ? (
                    <circle cx={p.x} cy={p.y} r={radio + 2.2} fill="none" stroke="#ffffff" strokeWidth="0.7" />
                  ) : null}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={radio}
                    fill={COLOR_TIRO[k]}
                    fillOpacity={0.95}
                    stroke="#04120a"
                    strokeWidth="0.4"
                  />
                  <text x={p.x} y={p.y + 0.9} textAnchor="middle" fontSize="2.4" fontWeight="800" fill="#04120a">
                    {t.min}
                  </text>
                </g>
              );
            })}
          </g>
        )}
      </svg>

      <ul className="fj-leyenda">
        {[
          ["gol", "Gol"],
          ["puerta", "A puerta"],
          ["fuera", "Fuera"],
          ["bloqueado", "Bloqueado"],
        ].map(([k, etiqueta]) => (
          <li key={k} className={`fj-leyenda-item fj-leyenda--${k}`}>
            <i /> {etiqueta} <b>{cuenta[k]}</b>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function FichaJugador({ jugador, stats, aporte, onClose, onPrev, onNext }) {
  const [modo, setModo] = useState("remates"); // remates | calor
  const [selTiro, setSelTiro] = useState(null);

  const s = stats || {};
  const disparos = s.disparos || [];
  const grupos = s.grupos || [];

  // Al pasar de jugador con ‹ › el indice guardado puede quedarse fuera de
  // rango: se acota en vez de guardar estado dentro de un efecto.
  const indice = Math.max(0, Math.min(selTiro ?? disparos.length - 1, disparos.length - 1));
  const tiro = disparos[indice];

  if (!jugador) return null;
  const nota = jugador.nota;

  return (
    <div
      className="fj-fondo"
      role="dialog"
      aria-modal="true"
      aria-label={`Estadisticas de ${jugador.nombre || "jugador"}`}
      onClick={onClose}
    >
      <div className={`fj-panel fj-nota-${tonoNota(nota)}`} onClick={(ev) => ev.stopPropagation()}>
        <button type="button" className="fj-nav fj-prev" onClick={onPrev} aria-label="Jugador anterior">
          ‹
        </button>
        <button type="button" className="fj-nav fj-next" onClick={onNext} aria-label="Jugador siguiente">
          ›
        </button>

        <header className="fj-cab">
          <div className="fj-avatar">
            <span className="fj-inicial">{(jugador.nombre || "?").slice(0, 1)}</span>
            {jugador.foto ? (
              <img
                src={jugador.foto}
                alt=""
                loading="lazy"
                onError={(ev) => {
                  // Foto caida (404 de FotMob): se queda la inicial.
                  ev.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            {nota != null ? <span className="fj-nota">{nota}</span> : null}
          </div>
          <h3 className="fj-nombre">
            {jugador.nombre} <Bandera codigo={jugador.pais_codigo} pais={jugador.pais} />
          </h3>
          <div className="fj-datos">
            <div>
              <b>{grupoPosicion(jugador)}</b>
              <span>Posicion</span>
            </div>
            <div>
              <b>{s.equipo || "—"}</b>
              <span>Equipo</span>
            </div>
            <div>
              <b>{jugador.edad ?? "—"}</b>
              <span>Edad</span>
            </div>
          </div>
        </header>

        <div className="fj-cuerpo">
          <section className="fj-izq">
            <div className="fj-izq-cab">
              <h4>Remates</h4>
              <span>
                {disparos.length} {disparos.length === 1 ? "remate" : "remates"}
              </span>
            </div>

            {disparos.length > 1 ? (
              <div className="fj-modo" role="group" aria-label="Vista del mapa">
                <button
                  type="button"
                  className={modo === "remates" ? "activo" : ""}
                  onClick={() => setModo("remates")}
                >
                  Remates
                </button>
                <button
                  type="button"
                  className={modo === "calor" ? "activo" : ""}
                  onClick={() => setModo("calor")}
                >
                  Calor
                </button>
              </div>
            ) : null}

            <MapaRemates
              disparos={disparos}
              modo={modo}
              seleccionado={indice}
              onSeleccionar={setSelTiro}
            />

            {disparos.length > 1 ? (
              <div className="fj-tiros-chips">
                {disparos.map((t, i) => (
                  <button
                    key={`${t.min}-${i}`}
                    type="button"
                    className={i === indice ? "activo" : ""}
                    onClick={() => setSelTiro(i)}
                    title={`Remate del minuto ${t.min}`}
                  >
                    {t.min}&apos;
                  </button>
                ))}
              </div>
            ) : null}

            {modo === "calor" ? (
              <p className="fj-aviso">
                Calor calculado con los {disparos.length} remates reales de este partido: la fuente no
                publica las posiciones de actividad del jugador.
              </p>
            ) : tiro ? (
              <dl className="fj-detalle">
                <div>
                  <dt>Minuto</dt>
                  <dd>{tiro.min}&apos;</dd>
                </div>
                <div>
                  <dt>Resultado</dt>
                  <dd>{txt(tiro.resultado)}</dd>
                </div>
                <div>
                  <dt>xG</dt>
                  <dd>{tiro.xg ?? "—"}</dd>
                </div>
                <div>
                  <dt>xGOT</dt>
                  <dd>{tiro.xgot ?? "—"}</dd>
                </div>
                <div>
                  <dt>Situación</dt>
                  <dd>{txt(tiro.situacion)}</dd>
                </div>
                <div>
                  <dt>Tipo</dt>
                  <dd>{txt(tiro.tipo)}</dd>
                </div>
              </dl>
            ) : null}
            <div className="fj-aportes">
              {aporte?.goles ? (
                <span className="gol">
                  ⚽ {aporte.goles} {aporte.goles === 1 ? "gol" : "goles"}
                </span>
              ) : null}
              {aporte?.asistencias ? (
                <span className="asist">
                  A {aporte.asistencias}{" "}
                  {aporte.asistencias === 1 ? "asistencia" : "asistencias"}
                </span>
              ) : null}
            </div>
          </section>

          <section className="fj-der">
            {grupos.length === 0 ? (
              <p className="fj-vacio">
                No hay estadísticas individuales de este partido.
              </p>
            ) : (
              grupos.map((g) => (
                <div key={g.grupo} className="fj-grupo">
                  <h4>{grupoES(g.grupo)}</h4>
                  <ul>
                    {(g.filas || []).map((f, i) => (
                      <li key={`${g.grupo}-${i}`}>
                        <span>{statES(f.etiqueta)}</span>
                        <b>
                          {f.valor}
                          {f.total != null ? ` / ${f.total}` : ""}
                        </b>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </section>
        </div>

        <footer className="fj-pie">
          <span className="fj-fuente">Ficha del jugador</span>
          <button type="button" className="fj-cerrar" onClick={onClose}>
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}
