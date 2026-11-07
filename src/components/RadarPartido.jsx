import { useEffect, useState } from "react";
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

function Cancha({ tiros }) {
  // viewBox 100x68 = proporcion real de un campo (105x68).
  const px = (t) => (t.equipo === "home" ? t.x : 100 - t.x);
  const py = (t) => (Number(t.y) / 100) * 68;
  const radio = (t) => 1.3 + Math.min(1, Math.max(0, Number(t.xg) || 0)) * 3.4;

  return (
    <svg
      viewBox="0 0 100 68"
      style={{ width: "100%", height: "auto", display: "block", borderRadius: 10, background: "#12351f" }}
      role="img"
      aria-label="Mapa de tiros del partido"
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

      <Cancha tiros={datos.tiros || []} />
      <div style={{ display: "flex", gap: 14, fontSize: 10, color: "#6b7280", margin: "8px 0 14px" }}>
        <span>● tamaño = xG</span>
        <span>◯ borde blanco = gol</span>
        <span>opaco = bloqueado</span>
        <span style={{ marginLeft: "auto" }}>{datos.tiros?.length || 0} tiros</span>
      </div>

      <Momentum puntos={datos.momentum} />
      <div style={{ height: 14 }} />
      <Zonas zonas={datos.zonas} home={local} away={visita} />
      <div style={{ height: 14 }} />
      <StatsClave stats={datos.stats} />

      <div style={{ fontSize: 10, color: "#4b5563", marginTop: 12 }}>
        Tiros, xG y momentum: FotMob. No incluye posiciones de jugadores (tracking licenciado).
      </div>
    </div>
  );
}
