import { useCallback, useEffect, useRef, useState } from "react";
import { getStoredSession, fetchTrackingDemo, fetchTrackingPartido } from "../services/api";

/**
 * Radar HD (demo): reproductor de tracking REAL de los 22 jugadores + balon.
 *
 * Los datos son de SkillCorner Open Data (MIT): 10 partidos de la A-League
 * 2024/25 capturados con vision por computadora sobre la retransmision. Son
 * partidos ya jugados, asi que esto es un replay (play/pausa/velocidad), no un
 * radar en vivo.
 *
 * El backend los sirve ya normalizados en /stats/tracking-demo:
 *   - coordenadas enteras en decimetros (x 0..largo*10, y 0..ancho*10)
 *   - -1 = sin deteccion en ese frame
 *   - un array plano [x0,y0,x1,y1,...] por jugador, y otro para el balon.
 */

const VELOCIDADES = [10, 30, 60];
const MARGEN = 10;

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

const boton = {
  background: "#1f2633",
  color: "#e5e7eb",
  border: "1px solid #303847",
  borderRadius: 8,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
};

const botonActivo = {
  ...boton,
  background: "#22c55e",
  borderColor: "#22c55e",
  color: "#08130b",
};

/** Color de texto/dorsal legible sobre el color de la camiseta. */
function contraste(hex) {
  const limpio = String(hex || "").replace("#", "");
  if (limpio.length !== 6) return "#0b1220";
  const r = parseInt(limpio.slice(0, 2), 16);
  const g = parseInt(limpio.slice(2, 4), 16);
  const b = parseInt(limpio.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? "#0b1220" : "#f8fafc";
}

/** Encaje del campo dentro del canvas, manteniendo proporcion real. */
function medidas(ancho, alto, datos) {
  const utilAncho = ancho - MARGEN * 2;
  const utilAlto = alto - MARGEN * 2;
  const escala = Math.min(utilAncho / datos.largo, utilAlto / datos.ancho);
  const campoAncho = datos.largo * escala;
  const campoAlto = datos.ancho * escala;
  return {
    escala,
    x0: MARGEN + (utilAncho - campoAncho) / 2,
    y0: MARGEN + (utilAlto - campoAlto) / 2,
    campoAncho,
    campoAlto,
  };
}

function pintarCampo(ctx, ancho, alto, datos) {
  const m = medidas(ancho, alto, datos);
  ctx.clearRect(0, 0, ancho, alto);
  ctx.fillStyle = "#0f2a19";
  ctx.fillRect(0, 0, ancho, alto);

  // franjas de cesped
  ctx.fillStyle = "#143823";
  const franjas = 10;
  for (let i = 0; i < franjas; i += 2) {
    ctx.fillRect(m.x0 + (m.campoAncho / franjas) * i, m.y0, m.campoAncho / franjas, m.campoAlto);
  }

  const { escala } = m;
  const px = (metros) => metros * escala;
  ctx.strokeStyle = "rgba(214, 240, 222, 0.55)";
  ctx.lineWidth = Math.max(1, escala * 0.12);

  ctx.strokeRect(m.x0, m.y0, m.campoAncho, m.campoAlto);
  // linea y circulo central
  ctx.beginPath();
  ctx.moveTo(m.x0 + m.campoAncho / 2, m.y0);
  ctx.lineTo(m.x0 + m.campoAncho / 2, m.y0 + m.campoAlto);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(m.x0 + m.campoAncho / 2, m.y0 + m.campoAlto / 2, px(9.15), 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(m.x0 + m.campoAncho / 2, m.y0 + m.campoAlto / 2, Math.max(1.5, escala * 0.15), 0, Math.PI * 2);
  ctx.fillStyle = "rgba(214, 240, 222, 0.55)";
  ctx.fill();

  // areas: grande (16.5 x 40.32) y chica (5.5 x 18.32), a ambos lados
  const centros = [m.y0 + m.campoAlto / 2];
  const areas = [
    { fondo: 16.5, ancho: 40.32 },
    { fondo: 5.5, ancho: 18.32 },
  ];
  for (const a of areas) {
    const altoArea = px(a.ancho);
    ctx.strokeRect(m.x0, centros[0] - altoArea / 2, px(a.fondo), altoArea);
    ctx.strokeRect(m.x0 + m.campoAncho - px(a.fondo), centros[0] - altoArea / 2, px(a.fondo), altoArea);
  }
  // puntos de penal
  for (const lado of [0, 1]) {
    ctx.beginPath();
    ctx.arc(
      m.x0 + (lado ? m.campoAncho - px(11) : px(11)),
      centros[0],
      Math.max(1.5, escala * 0.13),
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "rgba(214, 240, 222, 0.55)";
    ctx.fill();
  }
  return m;
}


function pintarFrame(ctx, ancho, alto, datos, frame) {
  const m = pintarCampo(ctx, ancho, alto, datos);
  const total = Math.floor(datos.balon.length / 2);
  const f0 = Math.max(0, Math.min(total - 1, Math.floor(frame)));
  const f1 = Math.min(total - 1, f0 + 1);
  const t = Math.max(0, Math.min(1, frame - f0));
  const X = (dm) => m.x0 + (dm / 10) * m.escala;
  const Y = (dm) => m.y0 + (dm / 10) * m.escala;
  const radio = Math.max(7, m.escala * 0.8);

  for (const j of datos.jugadores) {
    const c = j.camino;
    let ax = c[f0 * 2];
    let ay = c[f0 * 2 + 1];
    let bx = c[f1 * 2];
    let by = c[f1 * 2 + 1];
    if (ax < 0 && bx < 0) continue;
    if (ax < 0) { ax = bx; ay = by; }
    if (bx < 0) { bx = ax; by = ay; }

    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    const color = j.eq === "home" ? datos.local.color : datos.visita.color;
    const tinta = contraste(color);

    ctx.beginPath();
    ctx.arc(X(x), Y(y), radio, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = Math.max(1, radio * 0.18);
    ctx.strokeStyle = tinta;
    ctx.stroke();

    if (j.d != null) {
      ctx.fillStyle = tinta;
      ctx.font = `700 ${Math.round(radio * 0.95)}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(j.d), X(x), Y(y));
    }
  }

  // balon
  const b = datos.balon;
  const b0x = b[f0 * 2];
  const b0y = b[f0 * 2 + 1];
  const b1x = b[f1 * 2];
  const b1y = b[f1 * 2 + 1];
  if (b0x >= 0 || b1x >= 0) {
    const ax = b0x < 0 ? b1x : b0x;
    const ay = b0y < 0 ? b1y : b0y;
    const bx = b1x < 0 ? b0x : b1x;
    const by = b1y < 0 ? b0y : b1y;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    const r = Math.max(3.5, radio * 0.5);

    ctx.beginPath();
    ctx.arc(X(x), Y(y), r + 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(X(x), Y(y), r, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.4);
    ctx.strokeStyle = "#0b1220";
    ctx.stroke();
  }
}

export default function RadarHD({ session }) {
  const [lista, setLista] = useState([]);
  const [aviso, setAviso] = useState("");
  const [partidoId, setPartidoId] = useState(null);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [jugando, setJugando] = useState(true);
  const [velocidad, setVelocidad] = useState(30);
  const [frameUi, setFrameUi] = useState(0);

  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const datosRef = useRef(null);

  const repintar = useCallback((frame) => {
    const lienzo = canvasRef.current;
    const d = datosRef.current;
    if (!lienzo || !d) return;
    const padre = lienzo.parentElement;
    if (!padre) return;

    const ancho = padre.clientWidth || 640;
    const alto = Math.round(ancho * (d.ancho / d.largo) * 1.04);
    const dpr = window.devicePixelRatio || 1;
    const anchoPx = Math.round(ancho * dpr);
    const altoPx = Math.round(alto * dpr);
    if (lienzo.width !== anchoPx || lienzo.height !== altoPx) {
      lienzo.width = anchoPx;
      lienzo.height = altoPx;
      lienzo.style.width = `${ancho}px`;
      lienzo.style.height = `${alto}px`;
    }
    const ctx = lienzo.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    pintarFrame(ctx, ancho, alto, d, frame);
  }, []);

  // 1) Lista de partidos disponibles en la demo.
  useEffect(() => {
    const sesion = session || getStoredSession();
    if (!sesion) return undefined;
    let cancelado = false;

    (async () => {
      try {
        const r = await fetchTrackingDemo(sesion);
        if (cancelado) return;
        const partidos = r?.partidos || [];
        setLista(partidos);
        setAviso(r?.aviso || "");
        setPartidoId(partidos.length ? partidos[0].id : null);
        setError(partidos.length ? "" : "Todavia no hay partidos de tracking cargados.");
      } catch {
        if (!cancelado) setError("No se pudo cargar la lista de partidos.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [session]);

  // 2) Tracking del partido elegido.
  useEffect(() => {
    if (!partidoId) return undefined;
    const sesion = session || getStoredSession();
    if (!sesion) return undefined;
    let cancelado = false;

    (async () => {
      setCargando(true);
      setError("");
      try {
        const r = await fetchTrackingPartido(sesion, partidoId);
        if (cancelado) return;
        datosRef.current = r;
        frameRef.current = 0;
        setDatos(r);
        setFrameUi(0);
        setJugando(true);
      } catch {
        if (!cancelado) setError("No se pudo cargar el tracking de este partido.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [partidoId, session]);

  const nFrames = datos ? Math.floor(datos.balon.length / 2) : 0;

  // 3) Redimensionado: repinta el frame actual.
  useEffect(() => {
    repintar(frameRef.current);
    const alRedimensionar = () => repintar(frameRef.current);
    window.addEventListener("resize", alRedimensionar);
    return () => window.removeEventListener("resize", alRedimensionar);
  }, [datos, repintar]);

  // 4) Bucle de reproduccion.
  useEffect(() => {
    if (!datos || !jugando || !nFrames) return undefined;
    let raf = 0;
    let previo = performance.now();
    let acumuladoUi = 0;

    const paso = (ahora) => {
      const dt = Math.min(0.25, (ahora - previo) / 1000);
      previo = ahora;
      let f = frameRef.current + dt * datos.fps * velocidad;
      if (f >= nFrames) f -= nFrames;
      frameRef.current = f;
      repintar(f);
      acumuladoUi += dt;
      if (acumuladoUi > 0.12) {
        acumuladoUi = 0;
        setFrameUi(Math.floor(f));
      }
      raf = window.requestAnimationFrame(paso);
    };

    raf = window.requestAnimationFrame(paso);
    return () => window.cancelAnimationFrame(raf);
  }, [datos, jugando, velocidad, nFrames, repintar]);

  function irAFrame(valor) {
    const f = Math.max(0, Math.min(nFrames - 1, Number(valor) || 0));
    frameRef.current = f;
    setFrameUi(Math.floor(f));
    repintar(f);
  }

  const minuto = datos ? Math.floor(frameUi / datos.fps / 60) : 0;
  const segundo = datos ? Math.floor((frameUi / datos.fps) % 60) : 0;
  const reloj = `${minuto}:${String(segundo).padStart(2, "0")}`;
  const colorLocal = String(datos?.local?.color || "").toLowerCase() === "#ffffff" ? "#e5e7eb" : datos?.local?.color;
  const colorVisita = String(datos?.visita?.color || "").toLowerCase() === "#ffffff" ? "#e5e7eb" : datos?.visita?.color;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={caja}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ ...titulo, marginBottom: 0 }}>Radar HD · tracking real</span>
          <span style={{ fontSize: 10, color: "#fbbf24", fontWeight: 800, letterSpacing: 0.5 }}>
            DEMO · REPLAY
          </span>
        </div>

        {lista.length > 1 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {lista.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPartidoId(p.id)}
                style={p.id === partidoId ? botonActivo : boton}
              >
                {p.local} vs {p.visita}
              </button>
            ))}
          </div>
        )}

        {datos && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 14,
                fontWeight: 800,
                marginBottom: 10,
                gap: 8,
              }}
            >
              <span style={{ color: colorLocal }}>{datos.local.nombre}</span>
              <span style={{ color: "#e5e7eb", fontSize: 16 }}>{datos.marcador}</span>
              <span style={{ color: colorVisita, textAlign: "right" }}>{datos.visita.nombre}</span>
            </div>

            <canvas ref={canvasRef} style={{ display: "block", width: "100%", borderRadius: 10 }} />

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <button type="button" onClick={() => setJugando((v) => !v)} style={boton}>
                {jugando ? "⏸ Pausa" : "▶ Reproducir"}
              </button>
              <span
                style={{
                  fontSize: 12,
                  color: "#8b93a7",
                  fontVariantNumeric: "tabular-nums",
                  minWidth: 44,
                }}
              >
                {reloj}
              </span>
              <input
                type="range"
                min={0}
                max={Math.max(0, nFrames - 1)}
                value={frameUi}
                onChange={(e) => irAFrame(e.target.value)}
                aria-label="Minuto del partido"
                style={{ flex: "1 1 160px", accentColor: "#22c55e" }}
              />
              <div style={{ display: "flex", gap: 6 }}>
                {VELOCIDADES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVelocidad(v)}
                    style={v === velocidad ? botonActivo : boton}
                  >
                    {v}x
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 10,
                color: "#6b7280",
                marginTop: 8,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span>
                {datos.jugadores.length} jugadores · {datos.fps} fps · {datos.competicion} · {datos.estadio}
              </span>
              <span style={{ color: "#4b5563" }}>Datos: SkillCorner Open Data (MIT)</span>
            </div>
          </>
        )}

        {cargando && !datos && (
          <div style={{ fontSize: 13, color: "#8b93a7" }}>Cargando tracking del partido…</div>
        )}
        {error && <div style={{ fontSize: 13, color: "#f87171", marginTop: 8 }}>{error}</div>}
      </div>

      <div style={{ ...caja, fontSize: 12, color: "#8b93a7", lineHeight: 1.5 }}>
        <strong style={{ color: "#e5e7eb" }}>Qué es esto:</strong> las posiciones reales de los 22
        jugadores y del balón, capturadas por SkillCorner con visión por computadora sobre la
        retransmisión. Se ve como el Live Match Tracker de Sportradar, pero es un{" "}
        <strong>replay de partidos ya jugados</strong>: ninguna fuente gratuita ofrece estas
        posiciones en vivo.
        {aviso ? <div style={{ marginTop: 6, color: "#6b7280" }}>{aviso}</div> : null}
      </div>
    </div>
  );
}
