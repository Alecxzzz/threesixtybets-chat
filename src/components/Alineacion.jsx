/**
 * Alineación del partido: campo con los 22 titulares colocados por línea
 * (portero / defensa / medio / delantera) según la posición de ESPN, con
 * avatar (foto o iniciales), dorsal en badge y nombre en pastilla.
 *
 * Datos: detail.lineups -> [{ equipo, lado, formacion, titulares[], suplentes[] }]
 *        detail.teams   -> [{ name, logo, color }]  (para logo y color)
 * Cada jugador: { nombre, dorsal, pos, orden, foto }
 */

const COLOR_POR_DEFECTO = { home: "#22c55e", away: "#f97316" };

/** Clasifica la posición de ESPN en línea del campo. */
function lineaDe(pos) {
  const p = (pos || "").toUpperCase();
  if (!p) return "mid";
  if (p.startsWith("G")) return "gk";
  if (/^(CDM|DM|CAM|AM|CM|RM|LM)/.test(p)) return "mid";
  if (/^(RB|LB|CD|CB|RCB|LCB|SW|D)/.test(p)) return "def";
  if (/^(CF|ST|F|RW|LW|W)/.test(p)) return "fwd";
  return "mid";
}

/** -1 izquierda, 0 centro, 1 derecha (según el sufijo de la posición). */
function ladoDe(pos) {
  const p = (pos || "").toUpperCase();
  if (p.endsWith("-L")) return -1;
  if (p.endsWith("-R")) return 1;
  return 0;
}

/** Portero + filas (defensa, medio, delantera) ordenadas por lado. */
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

/** Iniciales para el avatar cuando ESPN no trae foto ("C. Haydar" -> "CH"). */
function iniciales(nombre) {
  const partes = String(nombre || "")
    .replace(/\./g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!partes.length) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[1][0]).toUpperCase();
}

function hexValido(hex) {
  const h = String(hex || "").replace("#", "");
  return /^[0-9a-fA-F]{6}$/.test(h) ? h : null;
}

/** Aclara un color para el degradado del avatar. */
function aclarar(hex, factor) {
  const h = hexValido(hex);
  if (!h) return hex;
  const n = parseInt(h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const mezclar = (c) => Math.round(c + (255 - c) * factor);
  return `#${((mezclar(r) << 16) | (mezclar(g) << 8) | mezclar(b)).toString(16).padStart(6, "0")}`;
}

/** Color y escudo del equipo (busca por nombre en detail.teams). */
function datosEquipo(equipos, nombre, lado) {
  const buscado = String(nombre || "").toLowerCase();
  const equipo =
    (equipos || []).find((t) => t && String(t.name || "").toLowerCase() === buscado) ||
    (equipos || []).find(
      (t) =>
        t &&
        buscado &&
        (buscado.includes(String(t.name || "").toLowerCase().slice(0, 6)) ||
          String(t.name || "").toLowerCase().includes(buscado.slice(0, 6)))
    );

  const color = equipo?.color && hexValido(equipo.color) ? equipo.color : COLOR_POR_DEFECTO[lado];
  return { color, claro: aclarar(color, 0.35), logo: equipo?.logo || null };
}

/** Tamaño de la pastilla del nombre (SVG no mide texto: se estima). */
function anchoPastilla(nombre) {
  return Math.max(6.5, Math.min(11.5, String(nombre).length * 1.0 + 1.6));
}


/** Ficha de un jugador: avatar + dorsal + nombre. */
function Marca({ x, y, jugador, gradId }) {
  const nombre = String(jugador?.nombre || "").trim();
  const corto = nombre.length > 10 ? `${nombre.slice(0, 9)}…` : nombre;
  const ancho = anchoPastilla(corto);

  return (
    <g transform={`translate(${x} ${y})`}>
      <title>
        {`${nombre}${jugador?.dorsal ? ` · #${jugador.dorsal}` : ""}${jugador?.pos ? ` · ${jugador.pos}` : ""}`}
      </title>

      <ellipse cx="0" cy="4.7" rx="3" ry="0.75" fill="rgba(0,0,0,.38)" />
      <circle r="3.05" fill={`url(#${gradId})`} stroke="rgba(255,255,255,.92)" strokeWidth="0.3" />

      {jugador?.foto ? (
        <g clipPath="url(#alz-clip)">
          <image
            href={jugador.foto}
            x="-3.05"
            y="-3.05"
            width="6.1"
            height="6.1"
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
      ) : (
        <text
          y="1"
          textAnchor="middle"
          fontSize="2.45"
          fontWeight="800"
          fill="#ffffff"
          style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,.35)", strokeWidth: 0.35 }}
        >
          {iniciales(nombre)}
        </text>
      )}

      <g transform="translate(2.1 2.1)">
        <circle r="1.5" fill="#0b1118" stroke="rgba(255,255,255,.55)" strokeWidth="0.2" />
        <text y="0.6" textAnchor="middle" fontSize="1.85" fontWeight="800" fill="#e6edf3">
          {jugador?.dorsal ?? "-"}
        </text>
      </g>

      <g transform="translate(0 4.1)">
        <rect
          x={-ancho / 2}
          y="0"
          width={ancho}
          height="2.9"
          rx="1.45"
          fill="rgba(6,12,10,.74)"
          stroke="rgba(255,255,255,.10)"
          strokeWidth="0.12"
        />
        <text y="2.08" textAnchor="middle" fontSize="1.95" fontWeight="700" fill="#e9eff7">
          {corto}
        </text>
      </g>
    </g>
  );
}

const X_FILAS = { 1: [24], 2: [17.5, 32], 3: [13, 26, 39] };
const MARGEN_Y = 8.5;

/** Los 11 de un equipo en su mitad del campo. */
function MedioCampo({ lineup, esLocal, gradId }) {
  const { portero, filas } = filasDe(lineup);
  const xs = X_FILAS[filas.length] || X_FILAS[3];
  const espejo = (x) => (esLocal ? x : 100 - x);

  return (
    <>
      {portero ? (
        <Marca x={espejo(5.4)} y={34} jugador={portero} gradId={gradId} />
      ) : null}

      {filas.map((fila, i) =>
        fila.map((jugador, j) => {
          const n = fila.length;
          const y = n === 1 ? 34 : MARGEN_Y + (j * (68 - 2 * MARGEN_Y)) / (n - 1);
          return (
            <Marca
              key={`${i}-${jugador.nombre}-${jugador.dorsal}`}
              x={espejo(xs[i])}
              y={y}
              jugador={jugador}
              gradId={gradId}
            />
          );
        })
      )}
    </>
  );
}

export default function Alineacion({ lineups = [], equipos = [] }) {
  if (!lineups.length) {
    return (
      <p style={{ color: "#8b95a1", fontSize: 13, textAlign: "center", margin: 0 }}>
        La alineación se publica cerca del inicio del partido.
      </p>
    );
  }

  const local = lineups.find((l) => l.lado === "home") || lineups[0];
  const visita = lineups.find((l) => l.lado === "away") || lineups[1];
  const dLocal = datosEquipo(equipos, local?.equipo, "home");
  const dVisita = datosEquipo(equipos, visita?.equipo, "away");

  // metros -> unidades del viewBox (el campo mide 105 x 68)
  const mx = (metros) => metros * (100 / 105);

  return (
    <div>
      <div className="alz-cabecera">
        <div className="alz-equipo">
          {dLocal.logo ? <img className="alz-escudo" src={dLocal.logo} alt="" /> : null}
          <div className="alz-equipo-texto">
            <span className="alz-nombre">{local?.equipo}</span>
            <span className="alz-formacion">{local?.formacion || "-"}</span>
          </div>
        </div>

        <div className="alz-equipo alz-der">
          <div className="alz-equipo-texto alz-texto-der">
            <span className="alz-nombre">{visita?.equipo}</span>
            <span className="alz-formacion">{visita?.formacion || "-"}</span>
          </div>
          {dVisita.logo ? <img className="alz-escudo" src={dVisita.logo} alt="" /> : null}
        </div>
      </div>

      <svg
        viewBox="0 0 100 68"
        className="alz-campo"
        role="img"
        aria-label={`Alineación de ${local?.equipo || "local"} y ${visita?.equipo || "visitante"}`}
      >
        <defs>
          <clipPath id="alz-clip">
            <circle r="3.05" />
          </clipPath>
          <linearGradient id="alz-cesped" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1b5f35" />
            <stop offset="100%" stopColor="#0d3a20" />
          </linearGradient>
          <radialGradient id="alz-grad-home" cx="35%" cy="25%" r="85%">
            <stop offset="0%" stopColor={dLocal.claro} />
            <stop offset="100%" stopColor={dLocal.color} />
          </radialGradient>
          <radialGradient id="alz-grad-away" cx="35%" cy="25%" r="85%">
            <stop offset="0%" stopColor={dVisita.claro} />
            <stop offset="100%" stopColor={dVisita.color} />
          </radialGradient>
        </defs>

        <rect
          x="0.4"
          y="0.4"
          width="99.2"
          height="67.2"
          rx="2"
          fill="url(#alz-cesped)"
          stroke="rgba(255,255,255,.16)"
          strokeWidth="0.35"
        />

        {Array.from({ length: 10 }).map((_, i) => (
          <rect
            key={i}
            x={0.4 + i * 9.92}
            y="0.4"
            width="9.92"
            height="67.2"
            fill={i % 2 ? "rgba(255,255,255,.03)" : "transparent"}
          />
        ))}

        <g stroke="rgba(255,255,255,.20)" strokeWidth="0.32" fill="none">
          <line x1="50" y1="0.4" x2="50" y2="67.6" />
          <circle cx="50" cy="34" r="8.6" />
          <rect x="0.4" y={34 - 20.16} width={mx(16.5)} height="40.32" />
          <rect x={99.6 - mx(16.5)} y={34 - 20.16} width={mx(16.5)} height="40.32" />
          <rect x="0.4" y={34 - 9.16} width={mx(5.5)} height="18.32" />
          <rect x={99.6 - mx(5.5)} y={34 - 9.16} width={mx(5.5)} height="18.32" />
        </g>

        <circle cx="50" cy="34" r="0.6" fill="rgba(255,255,255,.35)" />
        <circle cx={0.4 + mx(11)} cy="34" r="0.45" fill="rgba(255,255,255,.35)" />
        <circle cx={99.6 - mx(11)} cy="34" r="0.45" fill="rgba(255,255,255,.35)" />

        <MedioCampo lineup={local} esLocal gradId="alz-grad-home" />
        <MedioCampo lineup={visita} esLocal={false} gradId="alz-grad-away" />
      </svg>

      <div className="alz-bancas">
        {[
          { alineacion: local, equipo: dLocal, clave: "home" },
          { alineacion: visita, equipo: dVisita, clave: "away" },
        ].map(({ alineacion, equipo, clave }) => (
          <details key={clave} className="alz-banca">
            <summary>
              <span className="alz-banca-punto" style={{ background: equipo.color }} />
              Suplentes {alineacion?.equipo}
              <span className="alz-banca-num">{alineacion?.suplentes?.length || 0}</span>
            </summary>
            <ul>
              {(alineacion?.suplentes || []).map((j, i) => (
                <li key={`${j.nombre}-${i}`}>
                  <span className="alz-dorsal">{j.dorsal ?? "-"}</span>
                  <span className="alz-banca-nombre">{j.nombre}</span>
                  {j.pos ? <span className="alz-pos">{j.pos}</span> : null}
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}

