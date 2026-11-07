import { useEffect, useMemo, useState } from "react";
import { getStoredSession, fetchRadar } from "../services/api";

/**
 * Radar del partido (solo futbol).
 *
 * Dibuja el campo con TODOS los tiros del partido (tamano = xG, color = equipo,
 * aro blanco = gol), la tira de momentum minuto a minuto y las zonas de ataque.
 *
 * OJO con las coordenadas: FotMob normaliza los tiros de los DOS equipos hacia
 * el mismo arco (media de x ~91 en ambos), asi que los del visitante se
 * espejan (100 - x) para que cada equipo tire hacia su porteria.
 *
 * No hay posicion de jugadores ni de balon: eso es tracking optico de pago.
 */

const REFRESCO_MS = 30000;
const COLOR_LOCAL = "#22c55e";
const COLOR_VISITA = "#f97316";

// Radar animado: el balon recorre la presion REAL del partido (momentum) y
// vuelve a empezar. En vivo se animan los ultimos VENTANA_MIN minutos; si el
// partido ya termino, se anima el partido completo.
const MS_POR_PUNTO = 200; // velocidad del replay (ms por minuto de juego)
const VENTANA_MIN = 15;   // minutos hacia atras que se animan en vivo
const COLA = 8;           // puntos de estela que se dibujan
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/**
 * Ruta de juego (posicion estimada del balon) minuto a minuto.
 *
 * Sale de datos REALES: signo e intensidad del momentum (positivo = local
 * empujando, negativo = visitante) y la altura (y) de los tiros cercanos
 * ponderada por xG. No son posiciones de jugadores: eso es tracking optico
 * licenciado (Hawk-Eye / Second Spectrum / LMT) y no existe gratis.
 */
function construirRuta(datos) {
  const puntos = (datos?.momentum || []).filter(
    (p) => Number.isFinite(p.valor) && Number.isFinite(p.min)
  );
  if (puntos.length < 3) return [];

  const maximo = Math.max(1, ...puntos.map((p) => Math.abs(p.valor)));
  const tiros = datos?.tiros || [];

  const crudos = puntos.map((p) => {
    const intensidad = clamp(p.valor / maximo, -1, 1);
    // El local ataca hacia la derecha (x alto) y el visitante hacia la izquierda.
    const x = clamp(50 + 44 * intensidad, 6, 94);

    let pesoY = 0;
    let pesoTotal = 0;
    for (const t of tiros) {
      if (!Number.isFinite(Number(t.y))) continue;
      if (Math.abs((Number(t.min) || 0) - p.min) > 6) continue;
      const peso = 0.2 + (Number(t.xg) || 0.05);
      pesoY += (Number(t.y) / 100) * 68 * peso;
      pesoTotal += peso;
    }
    // Los tiros se concentran en el centro: se amplia la desviacion para que la
    // ruta use mas ancho de campo.
    const yBase = pesoTotal > 0 ? pesoY / pesoTotal : 34 + 6 * Math.sin(p.min / 4);
    const y = clamp(34 + (yBase - 34) * 1.5, 8, 60);

    return { min: p.min, x, y, equipo: p.valor >= 0 ? "home" : "away" };
  });

  // Suavizado: media exponencial + tope de salto por minuto. Sin esto el balon
  // se "teletransporta" cuando el momentum pasa de -100 a 0 de un punto a otro.
  const salida = [];
  let xPrev = crudos[0].x;
  let yPrev = crudos[0].y;
  for (const p of crudos) {
    const x = clamp(xPrev + (p.x - xPrev) * 0.45, xPrev - 11, xPrev + 11);
    const y = clamp(yPrev + (p.y - yPrev) * 0.35, yPrev - 4, yPrev + 4);
    xPrev = x;
    yPrev = y;
    salida.push({ min: p.min, x, y, equipo: p.equipo });
  }
  return salida;
}

/** Anima la ruta: avanza un punto cada MS_POR_PUNTO y reinicia al final. */
function useRadarVivo(ruta, activo) {
  const [indice, setIndice] = useState(0);
  const total = ruta.length;

  useEffect(() => {
    if (!activo || total < 2) return undefined;
    const reduce = typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return undefined;

    let raf = 0;
    const inicio = performance.now();
    const paso = (t) => {
      const avance = Math.floor((t - inicio) / MS_POR_PUNTO) % total;
      // Solo re-renderiza cuando cambia el punto (4-5 veces por segundo).
      setIndice((prev) => (prev === avance ? prev : avance));
      raf = window.requestAnimationFrame(paso);
    };
    raf = window.requestAnimationFrame(paso);
    return () => window.cancelAnimationFrame(raf);
  }, [activo, total]);

  if (!total) return { punto: null, cola: [] };
  const i = indice % total;
  return {
    punto: ruta[i],
    cola: ruta.slice(Math.max(0, i - COLA), i + 1),
  };
}

const caja = {
  border: "1px solid #303847",
  borderRadius: 14,
  background: "#171c26",
  padding: 14,
  marginBottom: 14,
};

const titulo = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  color: "#8b93a7",
  marginBottom: 10,
};

function CargandoRadar() {
  return (
    <div style={{ ...caja, display: "flex", alignItems: "center", gap: 10 }}>
      <span
        aria-hidden="true"
        style={{
          width: 16,
          height: 16,
          flex: "0 0 auto",
          borderRadius: "50%",
          border: "2px solid #2b3342",
          borderTopColor: COLOR_LOCAL,
          animation: "events-spin 0.8s linear infinite",
        }}
      />
      <span style={{ fontSize: 13, color: "#8b93a7" }}>Cargando radar del partido…</span>
    </div>
  );
}

function Cancha({ tiros, ruta }) {
  // La animacion vive aqui dentro para que el re-render por frame no toque el
  // resto de la tarjeta (momentum, zonas, stats).
  const vivo = useRadarVivo(ruta || [], (ruta || []).length > 2);
  // viewBox 100x68 = proporcion real de un campo (105x68).
  const px = (t) => (t.equipo === "home" ? t.x : 100 - t.x);
  const py = (t) => (Number(t.y) / 100) * 68;
  const radio = (t) => 1.3 + Math.min(1, Math.max(0, Number(t.xg) || 0)) * 3.4;

  return (
    <svg
      viewBox="0 0 100 68"
      style={{ width: "100%", height: "auto", display: "block", borderRadius: 10, background: "#12351f" }}
      role="img"
      aria-label="Radar animado del partido: tiros con xG y presión minuto a minuto"
    >
      <rect x="0.6" y="0.6" width="98.8" height="66.8" fill="none" stroke="#2f6b45" strokeWidth="0.4" />
      <line x1="50" y1="0.6" x2="50" y2="67.4" stroke="#2f6b45" strokeWidth="0.4" />
      <circle cx="50" cy="34" r="9" fill="none" stroke="#2f6b45" strokeWidth="0.4" />
      <circle cx="50" cy="34" r="0.8" fill="#2f6b45" />
      <rect x="0.6" y="14" width="16" height="40" fill="none" stroke="#2f6b45" strokeWidth="0.4" />
      <rect x="83.4" y="14" width="16" height="40" fill="none" stroke="#2f6b45" strokeWidth="0.4" />
      <rect x="0.6" y="26" width="5" height="16" fill="none" stroke="#2f6b45" strokeWidth="0.4" />
      <rect x="94.4" y="26" width="5" height="16" fill="none" stroke="#2f6b45" strokeWidth="0.4" />
      <rect x="0.2" y="30" width="0.9" height="8" fill="#e5e7eb" opacity="0.55" />
      <rect x="98.9" y="30" width="0.9" height="8" fill="#e5e7eb" opacity="0.55" />

      {/* Estela del balon: por donde ha pasado la presion en los ultimos puntos. */}
      {vivo?.cola?.length > 1 ? (
        <polyline
          points={vivo.cola.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ")}
          fill="none"
          stroke={vivo.punto?.equipo === "home" ? COLOR_LOCAL : COLOR_VISITA}
          strokeWidth={0.7}
          strokeOpacity={0.35}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {tiros.map((t, i) => {
        const esGol = (t.tipo || "").toLowerCase().includes("goal");
        const color = t.equipo === "home" ? COLOR_LOCAL : COLOR_VISITA;
        return (
          <circle
            key={`${t.jugador}-${t.min}-${i}`}
            cx={Math.max(1, Math.min(99, px(t)))}
            cy={Math.max(1, Math.min(67, py(t)))}
            r={radio(t)}
            fill={color}
            fillOpacity={esGol ? 0.95 : t.bloqueado ? 0.25 : 0.5}
            stroke={esGol ? "#ffffff" : "none"}
            strokeWidth={esGol ? 0.7 : 0}
          >
            <title>
              {`${t.jugador || "?"} ${t.min != null ? `(${t.min}')` : ""} · ${t.tipo}${t.xg ? ` · xG ${Number(t.xg).toFixed(2)}` : ""}`}
            </title>
          </circle>
        );
      })}

      {/* Balon animado: posicion de presion real (momentum + tiros), minuto a minuto. */}
      {vivo?.punto ? (
        <g
          style={{
            transform: `translate(${vivo.punto.x.toFixed(2)}px, ${vivo.punto.y.toFixed(2)}px)`,
            transition: `transform ${MS_POR_PUNTO}ms linear`,
          }}
        >
          <circle r={5} fill={vivo.punto.equipo === "home" ? COLOR_LOCAL : COLOR_VISITA} opacity={0.12} />
          <circle r={3} fill="#ffffff" opacity={0.08} />
          <circle r={1.5} fill="#ffffff" opacity={0.95} />
          <circle
            r={2.6}
            fill="none"
            stroke={vivo.punto.equipo === "home" ? COLOR_LOCAL : COLOR_VISITA}
            strokeWidth={0.35}
            opacity={0.85}
          />
          <text
            y={-3.6}
            fontSize={3}
            fontWeight={700}
            fill="#e5e7eb"
            textAnchor="middle"
            style={{ paintOrder: "stroke", stroke: "#0b1220", strokeWidth: 0.7 }}
          >
            {`${vivo.punto.min}'`}
          </text>
          <title>{`Minuto ${vivo.punto.min}: ${vivo.punto.equipo === "home" ? "presion del local" : "presion del visitante"}`}</title>
        </g>
      ) : null}
    </svg>
  );
}


function Momentum({ puntos }) {
  if (!puntos?.length) return null;
  const maximo = Math.max(1, ...puntos.map((p) => Math.abs(p.valor)));
  return (
    <div>
      <div style={titulo}>Momentum</div>
      <div style={{ display: "flex", alignItems: "center", gap: 1, height: 64 }}>
        {puntos.map((p) => {
          const alto = Math.max(2, (Math.abs(p.valor) / maximo) * 30);
          const local = p.valor >= 0;
          return (
            <span
              key={p.min}
              title={`Minuto ${p.min}: ${local ? "local" : "visitante"} ${Math.abs(p.valor)}`}
              style={{
                flex: 1,
                height: alto,
                alignSelf: local ? "flex-end" : "flex-start",
                background: local ? COLOR_LOCAL : COLOR_VISITA,
                opacity: 0.75,
                borderRadius: 1,
                minWidth: 1,
              }}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#6b7280", marginTop: 4 }}>
        <span>0&apos;</span>
        <span>{puntos[puntos.length - 1]?.min}&apos;</span>
      </div>
    </div>
  );
}

function Zonas({ zonas, home, away }) {
  const filas = [
    { equipo: home, color: COLOR_LOCAL, datos: zonas?.home?.total },
    { equipo: away, color: COLOR_VISITA, datos: zonas?.away?.total },
  ].filter((f) => f.datos);

  if (!filas.length) return null;
  const lados = ["left", "center", "right"];
  const etiquetas = { left: "Izquierda", center: "Centro", right: "Derecha" };

  return (
    <div>
      <div style={titulo}>Zonas de ataque</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filas.map((f) => (
          <div key={f.equipo}>
            <div style={{ fontSize: 11, color: f.color, fontWeight: 700, marginBottom: 4 }}>{f.equipo}</div>
            <div style={{ display: "flex", gap: 6 }}>
              {lados.map((l) => {
                const valor = Number(f.datos[l]) || 0;
                return (
                  <div key={l} style={{ flex: 1, textAlign: "center" }}>
                    <div
                      style={{
                        height: 34,
                        borderRadius: 6,
                        background: "#0f1117",
                        border: "1px solid #2b3342",
                        display: "flex",
                        alignItems: "flex-end",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ width: "100%", height: `${Math.min(100, valor)}%`, background: f.color, opacity: 0.55 }} />
                    </div>
                    <div style={{ fontSize: 10, color: "#8b93a7", marginTop: 3 }}>
                      {etiquetas[l]} · {valor}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatsClave({ stats }) {
  const grupos = (stats || []).filter((g) =>
    ["Top stats", "Shots", "Expected goals (xG)"].includes(g.grupo)
  );
  if (!grupos.length) return null;

  return (
    <div>
      <div style={titulo}>Datos del partido</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {grupos.map((g) => (
          <div key={g.grupo}>
            <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 700, marginBottom: 4 }}>{g.grupo}</div>
            {g.filas.slice(0, 5).map((f) => (
              <div
                key={`${g.grupo}-${f.label}`}
                style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#d1d5db", padding: "2px 0" }}
              >
                <span style={{ width: 46, color: COLOR_LOCAL, fontWeight: 700 }}>{f.home}</span>
                <span style={{ flex: 1, textAlign: "center", color: "#8b93a7" }}>{f.label}</span>
                <span style={{ width: 46, textAlign: "right", color: COLOR_VISITA, fontWeight: 700 }}>{f.away}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RadarPartido({ sport = "soccer", eventId }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!eventId || sport !== "soccer") {
      setCargando(false);
      return undefined;
    }
    let cancelado = false;

    async function cargar() {
      const sesion = getStoredSession();
      if (!sesion) {
        if (!cancelado) setCargando(false);
        return;
      }
      try {
        const r = await fetchRadar(sesion, sport, eventId);
        if (!cancelado) {
          setDatos(r);
          setError("");
        }
      } catch {
        if (!cancelado) setError("No se pudo cargar el radar del partido.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    }

    cargar();
    const intervalo = setInterval(cargar, REFRESCO_MS);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [sport, eventId]);

  // Ruta de juego animada (momentum + tiros REALES). En vivo se animan los
  // ultimos VENTANA_MIN minutos para que el recorrido sea el del partido actual.
  const rutaCompleta = useMemo(() => construirRuta(datos), [datos]);
  const ruta = useMemo(() => {
    if (datos?.estado !== "live" || !rutaCompleta.length) return rutaCompleta;
    const ultimo = rutaCompleta[rutaCompleta.length - 1].min;
    const filtrada = rutaCompleta.filter((p) => p.min >= ultimo - VENTANA_MIN);
    return filtrada.length >= 3 ? filtrada : rutaCompleta;
  }, [rutaCompleta, datos]);

  if (sport !== "soccer") return null;
  if (cargando && !datos) return <CargandoRadar />;

  if (!datos?.ok) {
    return (
      <div style={{ ...caja, fontSize: 13, color: "#8b93a7" }}>
        {datos?.detalle || error || "Sin datos de radar para este partido."}
      </div>
    );
  }

  const local = datos.home_nombre || datos.home?.nombre || "Local";
  const visita = datos.away_nombre || datos.away?.nombre || "Visitante";
  const golesLocal = datos.home?.score;
  const golesVisita = datos.away?.score;

  return (
    <div style={caja}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ ...titulo, marginBottom: 0 }}>Radar del partido</span>
        <span style={{ fontSize: 11, color: "#6b7280" }}>
          {datos.estado === "live" ? `EN VIVO · ${datos.minuto || ""}` : datos.estado === "final" ? "FINAL" : "PREVIO"}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 14,
          fontWeight: 800,
          marginBottom: 10,
        }}
      >
        <span style={{ color: COLOR_LOCAL }}>
          {local}
          {golesLocal != null ? ` ${golesLocal}` : ""}
        </span>
        <span style={{ color: "#6b7280", fontSize: 12 }}>{datos.marcador || ""}</span>
        <span style={{ color: COLOR_VISITA, textAlign: "right" }}>
          {visita}
          {golesVisita != null ? ` ${golesVisita}` : ""}
        </span>
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <Cancha tiros={datos.tiros || []} ruta={ruta} />
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "4px 14px",
          fontSize: 10,
          color: "#6b7280",
          margin: "8px 0 14px",
        }}
      >
        <span>● tamaño = xG</span>
        <span>◯ borde blanco = gol</span>
        <span>opaco = bloqueado</span>
        <span>⬤ balón = presión real</span>
        <span style={{ marginLeft: "auto" }}>
          {datos.tiros?.length || 0} tiros
          {ruta.length ? ` · ${ruta[ruta.length - 1].min}′` : ""}
        </span>
      </div>

      <Momentum puntos={datos.momentum} />
      <div style={{ height: 14 }} />
      <Zonas zonas={datos.zonas} home={local} away={visita} />
      <div style={{ height: 14 }} />
      <StatsClave stats={datos.stats} />

      <div style={{ fontSize: 10, color: "#4b5563", marginTop: 12 }}>
        Tiros, xG y momentum: FotMob (datos reales). El balón animado es una
        estimación de presión minuto a minuto, no la posición real de los
        jugadores: eso es tracking licenciado.
      </div>
    </div>
  );
}
