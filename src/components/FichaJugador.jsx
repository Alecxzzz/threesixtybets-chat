/**
 * FichaJugador - panel de jugador estilo FotMob.
 *
 * Todo sale del mismo /stats/alineacion (matchDetails de FotMob): nota,
 * equipo, edad, pais, disparos del partido y stats por grupos.
 * NO se pinta heatmap: FotMob solo da el heatmap del PARTIDO, no del jugador;
 * en su lugar va el shot map, que si son datos reales de este jugador.
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

function MiniCampo({ disparos }) {
  const tiros = disparos || [];
  if (!tiros.length) {
    return <p className="fj-vacio">Sin remates en este partido.</p>;
  }

  // Resumen por resultado: es lo que se pinta en la leyenda.
  const cuenta = { gol: 0, puerta: 0, fuera: 0, bloqueado: 0 };
  const clase = (t) => {
    if (t.resultado === "Goal") return "gol";
    if (t.a_puerta) return "puerta";
    if (/block/i.test(t.resultado || "")) return "bloqueado";
    return "fuera";
  };

  return (
    <>
      <svg viewBox="0 0 100 64" className="fj-campo" role="img" aria-label="Mapa de remates">
        <rect x="0" y="0" width="100" height="64" rx="2" fill="#0f2418" />
        {/* area grande y pequena a la derecha (porteria atacada) */}
        <path d="M83 13 H99 V51 H83" fill="none" stroke="#4a7d61" strokeWidth="0.8" />
        <path d="M94 24 H99 V40 H94" fill="none" stroke="#4a7d61" strokeWidth="0.8" />
        <path d="M99 27 V37" stroke="#7dd3fc" strokeWidth="1.4" />
        <path d="M99 0 V64" stroke="#2f4a3a" strokeWidth="0.5" />

        {tiros.map((t, i) => {
          const k = clase(t);
          cuenta[k] += 1;
          const cx = Math.max(2, Math.min(96, Number(t.x) || 0));
          const cy = Math.max(2, Math.min(62, (Number(t.y) || 0) * 0.64));
          // Donde cruzo la linea de gol: x_porteria viene en metros desde el
          // centro de la porteria (-3.66 .. +3.66). Se lleva al dibujo.
          const metros = Number(t.x_porteria);
          const destino = Number.isFinite(metros)
            ? Math.max(26, Math.min(38, 32 + metros * 1.64))
            : 32;
          const color =
            k === "gol" ? "#22c55e" : k === "puerta" ? "#e2e8f0" : k === "bloqueado" ? "#94a3b8" : "#ef4444";

          return (
            <g key={i} className={`fj-tiro fj-tiro--${k}`}>
              {/* trayectoria del remate hasta la porteria */}
              <line
                x1={cx}
                y1={cy}
                x2={98}
                y2={destino}
                stroke={color}
                strokeWidth={k === "gol" ? 1.1 : 0.6}
                strokeOpacity={k === "gol" ? 0.95 : 0.55}
                strokeDasharray={k === "fuera" ? "1.6 1.4" : k === "bloqueado" ? "0.8 1.2" : "none"}
                strokeLinecap="round"
              />
              <circle cx={cx} cy={cy} r="2.6" fill={color} fillOpacity="0.9" stroke="#04120a" strokeWidth="0.4" />
              <text x={cx} y={cy + 0.9} textAnchor="middle" fontSize="2.1" fontWeight="800" fill="#04120a">
                {t.min}
              </text>
            </g>
          );
        })}
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
  if (!jugador) return null;
  const s = stats || {};
  const disparos = s.disparos || [];
  const grupos = s.grupos || [];
  const ultimo = disparos[disparos.length - 1];
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
            {jugador.foto ? (
              <img src={jugador.foto} alt="" />
            ) : (
              <span>{(jugador.nombre || "?").slice(0, 1)}</span>
            )}
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
              <h4>Mapa de remates</h4>
              <span>
                {disparos.length} {disparos.length === 1 ? "remate" : "remates"}
              </span>
            </div>
            <MiniCampo disparos={disparos} />
            {ultimo ? (
              <dl className="fj-detalle">
                <div><dt>Tipo</dt><dd>{txt(ultimo.tipo)}</dd></div>
                <div><dt>Situacion</dt><dd>{txt(ultimo.situacion)}</dd></div>
                <div><dt>Resultado</dt><dd>{txt(ultimo.resultado)}</dd></div>
                <div><dt>xG</dt><dd>{ultimo.xg ?? "—"}</dd></div>
                <div><dt>xGOT</dt><dd>{ultimo.xgot ?? "—"}</dd></div>
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
