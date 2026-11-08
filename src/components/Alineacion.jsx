/**
 * Alineacion del partido: campo con los 22 titulares colocados por linea
 * (portero / defensa / medio / delantera) segun la posicion de ESPN, mas la
 * formacion de cada equipo y la lista de suplentes.
 *
 * Datos: detail.lineups -> [{ equipo, lado, formacion, titulares[], suplentes[] }]
 * Cada jugador: { nombre, dorsal, pos, orden, foto }
 */

const COLORES = {
  home: "#22c55e",
  away: "#f97316",
};

/** Clasifica la posicion de ESPN en linea del campo. */
function lineaDe(pos) {
  const p = (pos || "").toUpperCase();
  if (!p) return "mid";
  if (p.startsWith("G")) return "gk";
  if (/^(CDM|DM|CAM|AM|CM|RM|LM)/.test(p)) return "mid";
  if (/^(RB|LB|CD|CB|RCB|LCB|SW|D)/.test(p)) return "def";
  if (/^(CF|ST|F|RW|LW|W)/.test(p)) return "fwd";
  return "mid";
}

/** -1 izquierda, 0 centro, 1 derecha (segun el sufijo de la posicion). */
function ladoDe(pos) {
  const p = (pos || "").toUpperCase();
  if (p.endsWith("-L")) return -1;
  if (p.endsWith("-R")) return 1;
  return 0;
}

/** Reparte los titulares en portero + filas (defensa, medio, delantera). */
function filasDe(lineup) {
  const titulares = lineup?.titulares || [];
  const portero = titulares.find((j) => lineaDe(j.pos) === "gk") || titulares[0];
  const resto = titulares.filter((j) => j !== portero);

  const filas = ["def", "mid", "fwd"]
    .map((clave) => resto.filter((j) => lineaDe(j.pos) === clave))
    .filter((fila) => fila.length)
    .map((fila) => fila.sort((a, b) => ladoDe(a.pos) - ladoDe(b.pos)));

  return { portero, filas };
}

const X_FILAS = {
  1: [32],
  2: [24, 40],
  3: [20, 32, 44],
};

function Jugador({ x, y, jugador, color, tinta }) {
  const nombre = String(jugador?.nombre || "").slice(0, 13);
  return (
    <g>
      <circle cx={x} cy={y} r={2.9} fill={color} stroke={tinta} strokeWidth={0.35} />
      <text
        x={x}
        y={y + 0.9}
        fontSize={2.6}
        fontWeight={800}
        textAnchor="middle"
        fill={tinta}
      >
        {jugador?.dorsal ?? ""}
      </text>
      <text
        x={x}
        y={y + 5.1}
        fontSize={2.3}
        fontWeight={600}
        textAnchor="middle"
        fill="#cbd5e1"
        style={{ paintOrder: "stroke", stroke: "#0b1118", strokeWidth: 0.5 }}
      >
        {nombre}
      </text>
    </g>
  );
}

function MedioCampo({ lineup, esLocal }) {
  const { portero, filas } = filasDe(lineup);
  const color = esLocal ? COLORES.home : COLORES.away;
  const tinta = "#08130b";
  const xs = X_FILAS[filas.length] || X_FILAS[3];

  const espejo = (x) => (esLocal ? x : 100 - x);

  return (
    <>
      {portero ? (
        <Jugador x={espejo(7)} y={32} jugador={portero} color={color} tinta={tinta} />
      ) : null}

      {filas.map((fila, i) =>
        fila.map((jugador, j) => (
          <Jugador
            key={`${i}-${jugador.nombre}`}
            x={espejo(xs[i])}
            y={((j + 1) / (fila.length + 1)) * 64}
            jugador={jugador}
            color={color}
            tinta={tinta}
          />
        ))
      )}
    </>
  );
}

export default function Alineacion({ lineups = [] }) {
  if (!lineups.length) {
    return (
      <p style={{ color: "#8b95a1", fontSize: 13, textAlign: "center", margin: 0 }}>
        La alineación se publica cerca del inicio del partido.
      </p>
    );
  }

  const local = lineups.find((l) => l.lado === "home") || lineups[0];
  const visita = lineups.find((l) => l.lado === "away") || lineups[1];

  return (
    <div>
      <div className="alz-cabecera">
        <div className="alz-equipo">
          <span className="alz-nombre">{local?.equipo}</span>
          <span className="alz-formacion">{local?.formacion || "-"}</span>
        </div>
        <div className="alz-equipo alz-der">
          <span className="alz-nombre">{visita?.equipo}</span>
          <span className="alz-formacion">{visita?.formacion || "-"}</span>
        </div>
      </div>

      <svg
        viewBox="0 0 100 64"
        className="alz-campo"
        role="img"
        aria-label="Alineación del partido"
      >
        <rect
          x="0.5"
          y="0.5"
          width="99"
          height="63"
          fill="#0f2a19"
          stroke="#2f6b45"
          strokeWidth="0.4"
        />
        <line x1="50" y1="0.5" x2="50" y2="63.5" stroke="#2f6b45" strokeWidth="0.4" />
        <circle cx="50" cy="32" r="8" fill="none" stroke="#2f6b45" strokeWidth="0.4" />
        <circle cx="50" cy="32" r="0.7" fill="#2f6b45" />
        <rect x="0.5" y="14" width="15" height="36" fill="none" stroke="#2f6b45" strokeWidth="0.4" />
        <rect x="84.5" y="14" width="15" height="36" fill="none" stroke="#2f6b45" strokeWidth="0.4" />
        <rect x="0.5" y="25" width="5" height="14" fill="none" stroke="#2f6b45" strokeWidth="0.4" />
        <rect x="94.5" y="25" width="5" height="14" fill="none" stroke="#2f6b45" strokeWidth="0.4" />

        <MedioCampo lineup={local} esLocal />
        <MedioCampo lineup={visita} esLocal={false} />
      </svg>

      <div className="alz-bancas">
        {[local, visita].map((l) => (
          <details key={l?.equipo || "banca"} className="alz-banca">
            <summary>
              Suplentes {l?.equipo} ({l?.suplentes?.length || 0})
            </summary>
            <ul>
              {(l?.suplentes || []).map((j, i) => (
                <li key={`${j.nombre}-${i}`}>
                  <span className="alz-dorsal">{j.dorsal ?? "-"}</span>
                  <span>{j.nombre}</span>
                  {j.pos ? <span className="alz-pos"> · {j.pos}</span> : null}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}

