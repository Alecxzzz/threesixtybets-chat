import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import NbaBoxscore from "../components/NbaBoxscore";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://xn--sixtyserver--b61q52a.up.railway.app"
).replace(/\/$/, "");

const DARK = {
  minHeight: "100vh",
  background: "#0b0f14",
  color: "#e6edf3",
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  padding: "16px 12px 40px",
  boxSizing: "border-box",
};

function fmtHora(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
}

function restar(iso) {
  const t = new Date(iso).getTime() - Date.now();
  return Number.isFinite(t) ? Math.max(0, t) : 0;
}

// Señal de respaldo: mismo Stream 1 que sirve el backend.
const STREAM_FIJO = "https://barinaslive1.boldmss.com/ESPN_2/ESPN_2.isml/ESPN_2.m3u8";
const FALLBACK_STREAM = `${API_URL}/hls-proxy?url=${encodeURIComponent(STREAM_FIJO)}`;

// DASH: se carga desde el CDN SOLO si el partido trae una opcion .mpd
// (dash.js pesa ~300 KB y el 90% de las señales son HLS). El paquete npm
// dash.js@4 trae el campo "exports" mal formado y rompe el build de Vite.
const DASH_CDN = "https://cdn.dashjs.org/latest/dash.all.min.js";
let dashPromesa = null;

function cargarDashJs() {
  if (window.dashjs?.MediaPlayer) return Promise.resolve(window.dashjs);
  if (dashPromesa) return dashPromesa;
  dashPromesa = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = DASH_CDN;
    script.async = true;
    script.onload = () =>
      window.dashjs?.MediaPlayer ? resolve(window.dashjs) : reject(new Error("dash.js sin MediaPlayer"));
    script.onerror = () => reject(new Error("no se pudo cargar dash.js"));
    document.head.appendChild(script);
  });
  return dashPromesa;
}

export default function ESPNGratis() {
  const [match, setMatch] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [playerState, setPlayerState] = useState("cargando"); // cargando|listo|antes|fuera|error
  const [restanteMs, setRestanteMs] = useState(0);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const dashRef = useRef(null);
  const reintentosRef = useRef(0);
  const opcionesRef = useRef([]);
  const cambiarOpcionRef = useRef(null);
  const [opcionActiva, setOpcionActiva] = useState(0);
  const [embedUrl, setEmbedUrl] = useState("");

  // El CSS global de la app pone body { overflow: hidden } (layout del chat):
  // en esta pagina independiente lo reactivamos para que se pueda scrollear.
  useEffect(() => {
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
    return () => {
      document.body.style.overflow = "";
      document.body.style.height = "";
    };
  }, []);

  // Marcador y estadisticas: refresco cada 30 s
  useEffect(() => {
    let alive = true;
    async function cargar() {
      try {
        const r = await fetch(`${API_URL}/tv-live/match`);
        const d = await r.json();
        if (!alive) return;
        setMatch(d);
        if (d?.cierre) setRestanteMs(restar(d.cierre));
      } catch {
        /* sin datos: se reintenta en el proximo ciclo */
      } finally {
        if (alive) setCargando(false);
      }
    }
    cargar();
    const id = setInterval(cargar, 30000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Cuenta regresiva cada segundo
  useEffect(() => {
    const id = setInterval(() => {
      if (match?.cierre) setRestanteMs(restar(match.cierre));
    }, 1000);
    return () => clearInterval(id);
  }, [match?.cierre]);

  // Reproductor: pide al backend hasta 3 senales validadas (Opcion 1/2/3).
  // Auto-reintento: si la senal muere, prueba la siguiente opcion sola.
  useEffect(() => {
    let alive = true;
    async function cargarOpciones() {
      try {
        const r = await fetch(`${API_URL}/tv-live/stream`);
        if (!alive) return null;
        if (r.status === 403) {
          setPlayerState((match?.apertura && new Date(match.apertura) > new Date()) ? "antes" : "fuera");
          return null;
        }
        if (!r.ok) return null;
        const d = await r.json();
        return d?.opciones || (d?.url ? [{ label: "Opción 1", url: d.url }] : null);
      } catch {
        return null;
      }
    }
    // --- Utilidades del reproductor -------------------------------------
    function soltarDash() {
      if (dashRef.current) {
        try {
          dashRef.current.reset();
        } catch {
          /* el player ya estaba muerto */
        }
        dashRef.current = null;
      }
    }

    /** Pasa a la siguiente opcion cuando una señal muere. */
    function siguienteOpcion(urlActual) {
      const idx = opcionesRef.current.findIndex((o) => o.url === urlActual);
      const siguiente = opcionesRef.current[(idx + 1) % Math.max(1, opcionesRef.current.length)];
      if (reintentosRef.current < 6 && siguiente) {
        reintentosRef.current += 1;
        setTimeout(() => { if (alive) iniciar(siguiente.url); }, 2500);
      } else {
        setPlayerState("error");
      }
    }

    /** DASH (.mpd): hls.js no lo reproduce. Con llave ClearKey el navegador
     *  descifra solo (CDM org.w3.clearkey), sin servidor de licencias. */
    async function iniciarDash(opcion, video) {
      let dashjs;
      try {
        dashjs = await cargarDashJs();
      } catch {
        if (alive) setPlayerState("error");
        return;
      }
      if (!alive || !video) return;
      soltarDash();
      const player = dashjs.MediaPlayer().create();
      dashRef.current = player;
      const drm = opcion.drm;
      if (drm?.type === "clearkey" && drm.kid && drm.key) {
        player.setProtectionData({
          "org.w3.clearkey": {
            clearkeys: { [String(drm.kid).toLowerCase()]: String(drm.key).toLowerCase() },
          },
        });
      }
      player.on("error", () => {
        if (dashRef.current !== player) return;
        setPlayerState("cargando");
        siguienteOpcion(opcion.url);
      });
      player.initialize(video, opcion.url, true);
      reintentosRef.current = 0;
      setPlayerState("listo");
    }

    async function iniciar(urlPropia) {
      setPlayerState("cargando");
      const video = videoRef.current;
      if (!video) return;
      try {
        let url = urlPropia;
        if (!url) {
          if (opcionesRef.current.length) {
            url = opcionesRef.current[0].url;
          } else {
            const ops = await cargarOpciones();
            if (!alive) return;
            if (ops) opcionesRef.current = ops;
            url = opcionesRef.current[0]?.url || FALLBACK_STREAM;
          }
        }
        if (!alive) return;

        // Señal tipo embed (pagina HTML con su propio player): va en iframe.
        const opcion = opcionesRef.current.find((o) => o.url === url);
        if (opcion?.embed) {
          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
          }
          soltarDash();
          if (video) {
            try {
              video.pause();
              video.removeAttribute("src");
              video.load();
            } catch {
              /* el video puede no haber cargado nada */
            }
          }
          setEmbedUrl(url);
          setPlayerState("listo");
          return;
        }
        setEmbedUrl("");

        if (!alive || !video) return;

        // DASH (.mpd): hls.js no lo abre -> dash.js (+ ClearKey si trae llave).
        if (opcion?.dash) {
          await iniciarDash(opcion, video);
          return;
        }

        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        soltarDash();
        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            reintentosRef.current = 0; // senal viva: reiniciar el contador
            video.play().catch(() => { /* autoplay bloqueado: el usuario da play */ });
          });
          hls.on(Hls.Events.ERROR, (_e, data) => {
            if (!data?.fatal) return;
            // Senal congelada/muerta: cambiar SOLO a la siguiente opcion
            // (el backend entrega opciones validadas en vivo).
            siguienteOpcion(url);
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          video.src = url;
          video.play().catch(() => {});
        } else {
          setPlayerState("error");
          return;
        }
        setPlayerState("listo");
      } catch {
        if (alive) setPlayerState("error");
      }
    }
    function cambiarOpcion(idx) {
      const op = opcionesRef.current[idx];
      if (!op) return;
      reintentosRef.current = 0;
      setOpcionActiva(idx);
      iniciar(op.url);
    }
    cambiarOpcionRef.current = cambiarOpcion;
    window.__cambiarSenal = cambiarOpcion;

    if (!match) return; // esperando datos del backend
    if (!match.teams) {
      // Partido no encontrado en ESPN: reproducir igual con el stream fijo
      iniciar(FALLBACK_STREAM);
      return;
    }
    if (match.disponible) iniciar();
    else setPlayerState(match?.apertura ? "antes" : "fuera");
    return () => {
      alive = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (dashRef.current) {
        try {
          dashRef.current.reset();
        } catch {
          /* ya estaba destruido */
        }
        dashRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.disponible, !!match?.teams]);

  const home = match?.teams?.[0] || {};
  const away = match?.teams?.[1] || {};
  const enVivo = match?.estado === "in";
  // Cuartos y boxscore SOLO con el partido ya iniciado (antes no existen).
  const iniciado = match?.estado === "in" || match?.estado === "post";
  const minutosRestantes = Math.ceil(restanteMs / 60000);

  return (
    <div style={DARK}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <img src="/logo.png" alt="" width={34} height={34} style={{ borderRadius: 8 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>📺 Partido en vivo</div>
            <div style={{ fontSize: 12, color: "#8b95a1" }}>
              Transmisión en vivo del partido destacado
            </div>
          </div>
        </header>

        {cargando ? (
          <p style={{ color: "#8b95a1" }}>Cargando el partido...</p>
        ) : (
          <>
            {/* MARCADOR (solo si el partido esta en la agenda de ESPN) */}
            {match?.teams && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 10, background: "#111820", border: "1px solid #22303c",
              borderRadius: 14, padding: "14px 16px", marginBottom: 14,
            }}>
              <div style={{ flex: 1, textAlign: "center" }}>
                <img src={home.logo} alt="" width={44} height={44} style={{ display: "block", margin: "0 auto 6px" }} />
                <div style={{ fontWeight: 700, fontSize: 14 }}>{home.name}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 900, fontSize: 34, letterSpacing: 2 }}>
                  {home.score ?? "-"} : {away.score ?? "-"}
                </div>
                <div style={{ fontSize: 12, color: enVivo ? "#4ade80" : "#8b95a1", fontWeight: 700 }}>
                  {enVivo ? `● EN VIVO ${match.reloj || ""}` : match.status || match.estado}
                </div>
                <div style={{ fontSize: 11, color: "#5c6670" }}>{match.liga}</div>
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <img src={away.logo} alt="" width={44} height={44} style={{ display: "block", margin: "0 auto 6px" }} />
                <div style={{ fontWeight: 700, fontSize: 14 }}>{away.name}</div>
              </div>
            </div>
            )}

            {/* CUARTOS: pegados al marcador y solo con el partido iniciado */}
            {iniciado && <Cuartos equipos={match.teams || []} />}

            {/* REPRODUCTOR */}
            <PlayerBox
              playerState={playerState}
              match={match}
              videoRef={videoRef}
              opciones={opcionesRef.current}
              opcionActiva={opcionActiva}
              embedUrl={embedUrl}
              onCambiar={(idx) => cambiarOpcionRef.current?.(idx)}
            />

            {/* TIEMPO RESTANTE */}
            {playerState === "listo" && match?.cierre && (
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: "rgba(250,204,21,0.08)", border: "1px solid #78550f",
                borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13,
              }}>
                <span style={{ color: "#facc15", fontWeight: 800 }}>⏳ Acceso gratis activo</span>
                <span style={{ color: "#cbd5e1" }}>
                  termina en {Math.floor(minutosRestantes / 60)}h {minutosRestantes % 60}m
                </span>
              </div>
            )}

            {/* BOXSCORE EN VIVO: la misma tabla de la ficha del partido */}
            {iniciado && (match.boxscore || []).length ? (
              <>
                <h3 style={{ margin: "4px 0 8px", fontSize: 15 }}>🗂️ Boxscore en vivo</h3>
                <NbaBoxscore
                  playersBox={match.boxscore}
                  equipos={match.teams || []}
                  estado={match.estado}
                  status={match.status || ""}
                  clock={match.reloj || ""}
                />
              </>
            ) : null}

            {/* ESTADISTICAS */}
            <h3 style={{ margin: "4px 0 8px", fontSize: 15 }}>📊 Estadisticas</h3>
            {home.statistics?.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              {(home.statistics || []).map((st, idx) => {
                const l = st.label || "-";
                const r = away.statistics?.[idx]?.label || "-";
                const etiqueta = (st.name || "").replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
                return (
                  <div key={st.name || idx} style={{
                    display: "grid", gridTemplateColumns: "56px 1fr 56px", alignItems: "center",
                    gap: 10, background: "#111820", border: "1px solid #22303c", borderRadius: 10, padding: "8px 12px",
                  }}>
                    <div style={{ fontWeight: 800, textAlign: "center", color: "#4ade80" }}>{l}</div>
                    <div style={{ textAlign: "center", color: "#8b95a1", fontSize: 12 }}>{etiqueta}</div>
                    <div style={{ fontWeight: 800, textAlign: "center", color: "#4ade80" }}>{r}</div>
                  </div>
                );
              })}
            </div>
            ) : (
              <p style={{ color: "#8b95a1", fontSize: 13, background: "#111820", border: "1px solid #22303c", borderRadius: 10, padding: "12px 14px" }}>
                Las estadisticas aparecen cuando inicie el partido.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Marcador por cuartos (Q1..Q4 y prorrogas) debajo del marcador principal. */
function Cuartos({ equipos = [] }) {
  const filas = equipos.filter((t) => (t.linescores || []).length);
  if (!filas.length) return null;
  const cuartos = Math.max(...filas.map((t) => (t.linescores || []).length));

  const cabecera = { color: "#8b95a1", fontWeight: 800, fontSize: 11, padding: "2px 6px" };
  const celda = { textAlign: "center", padding: "4px 6px", fontVariantNumeric: "tabular-nums" };

  return (
    <div style={{
      background: "#111820", border: "1px solid #22303c", borderRadius: 12,
      padding: "10px 12px", marginBottom: 14,
    }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ ...cabecera, textAlign: "left" }} />
            {Array.from({ length: cuartos }, (_, i) => (
              <th key={i} style={cabecera}>{i < 4 ? `Q${i + 1}` : `P${i - 3}`}</th>
            ))}
            <th style={{ ...cabecera, color: "#4ade80" }}>T</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((t, idx) => (
            <tr key={t.id || t.name || idx}>
              <td style={{ padding: "4px 0" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  {t.logo ? <img src={t.logo} alt="" width={16} height={16} /> : null}
                  <span style={{ fontWeight: 700 }}>{t.short_name || t.abbr || t.name}</span>
                </span>
              </td>
              {Array.from({ length: cuartos }, (_, i) => {
                const q = (t.linescores || [])[i];
                // El backend normaliza, pero por si llega un string crudo.
                const texto = q?.displayValue ?? q?.value ?? (typeof q === "string" ? q : "-");
                return (
                  <td key={i} style={{ ...celda, color: "#cfd6e2" }}>
                    {texto}
                  </td>
                );
              })}
              <td style={{ ...celda, fontWeight: 800, color: "#4ade80" }}>{t.score ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


function PlayerBox({ playerState, match, videoRef, opciones = [], opcionActiva = 0, onCambiar, embedUrl = "" }) {
  return (
    <div style={{ marginBottom: 14 }}>
    <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: "1px solid #22303c", background: "#000" }}>
      <video
        ref={videoRef}
        controls
        playsInline
        style={{ width: "100%", aspectRatio: "16/9", display: embedUrl ? "none" : "block", background: "#000" }}
      />
      {embedUrl ? (
        <iframe
          title="Stream del partido"
          src={embedUrl}
          style={{ width: "100%", aspectRatio: "16/9", display: "block", border: 0, background: "#000" }}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="origin"
        />
      ) : null}
      {playerState !== "listo" && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 8, textAlign: "center",
          background: "rgba(0,0,0,0.75)", padding: 16,
        }}>
          {playerState === "cargando" && <p>Conectando con la senal...</p>}
          {playerState === "antes" && (
            <>
              <div style={{ fontSize: 40 }}>⏳</div>
              <p style={{ margin: 0 }}>
                El acceso gratis abre 15 min antes del partido
                {match.kickoff ? ` (${fmtHora(match.kickoff)})` : ""}.
              </p>
              {match.apertura && (
                <p style={{ margin: 0, color: "#facc15", fontWeight: 800 }}>
                  Faltan {Math.max(0, Math.ceil(restar(match.apertura) / 60000))} min
                </p>
              )}
            </>
          )}
          {playerState === "fuera" && (
            <>
              <div style={{ fontSize: 40 }}>🔒</div>
              <p style={{ margin: 0 }}>Las 2 horas de acceso gratis terminaron.</p>
            </>
          )}
          {playerState === "error" && (
            <>
              <div style={{ fontSize: 40 }}>⚠️</div>
              <p style={{ margin: 0 }}>No se pudo conectar con el stream.</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{ padding: "10px 18px", border: "1px solid #4ade80", borderRadius: 10, background: "rgba(74,222,128,0.12)", color: "#4ade80", fontWeight: 800, cursor: "pointer" }}
              >
                Reintentar
              </button>
            </>
          )}
        </div>
      )}
      </div>

      {/* SELECTOR DE SENAL: Opcion 1 / 2 */}
      <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
        {!embedUrl && (
        <button
          type="button"
          onClick={async () => {
            const video = document.querySelector('video');
            if (!video) return;
            try {
              if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
              } else if (document.pictureInPictureEnabled) {
                await video.requestPictureInPicture();
              }
            } catch(e) {}
          }}
          style={{
            padding: "9px 16px",
            borderRadius: 9,
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
            border: "1px solid #3a4450",
            background: "transparent",
            color: "#c9d1d9",
          }}
        >
          ⛶ Picture-in-Picture
        </button>
        )}
        {opciones.length > 1 && opciones.map((o, i) => (
          <button
            key={o.url || i}
            type="button"
            onClick={() => onCambiar?.(i)}
            style={{
              padding: "9px 16px",
              borderRadius: 9,
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              border: i === opcionActiva ? "1px solid #4ade80" : "1px solid #3a4450",
              background: i === opcionActiva ? "rgba(74,222,128,0.15)" : "transparent",
              color: i === opcionActiva ? "#4ade80" : "#8b95a1",
            }}
          >
            {o.label || `Opción ${i + 1}`}
          </button>
        ))}
      </div>
    </div>
  );
}
