import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://site--threesixtybetssz--qytms2wflqbs.code.run"
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

export default function ESPNGratis() {
  const [match, setMatch] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [playerState, setPlayerState] = useState("cargando"); // cargando|listo|antes|fuera|error
  const [restanteMs, setRestanteMs] = useState(0);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  // Marcador y estadisticas: refresco cada 30 s
  useEffect(() => {
    let alive = true;
    async function cargar() {
      try {
        const r = await fetch(`${API_URL}/free-espn/match`);
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

  // Reproductor: pide el stream al backend solo durante la ventana
  useEffect(() => {
    let alive = true;
    async function iniciar() {
      setPlayerState("cargando");
      const video = videoRef.current;
      if (!video) return;
      try {
        const r = await fetch(`${API_URL}/free-espn/stream`);
        if (!alive) return;
        if (r.status === 403) {
          setPlayerState((match?.apertura && new Date(match.apertura) > new Date()) ? "antes" : "fuera");
          return;
        }
        if (!r.ok) {
          setPlayerState("error");
          return;
        }
        const { url } = await r.json();
        if (!alive || !video) return;

        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
        if (Hls.isSupported()) {
          const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
          hlsRef.current = hls;
          hls.loadSource(url);
          hls.attachMedia(video);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            video.play().catch(() => { /* autoplay bloqueado: el usuario da play */ });
          });
          hls.on(Hls.Events.ERROR, (_e, data) => {
            if (data?.fatal) setPlayerState("error");
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
    if (match?.disponible) iniciar();
    else if (match && !match.disponible) setPlayerState(match?.apertura ? "antes" : "fuera");
    return () => {
      alive = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.disponible]);

  const home = match?.teams?.[0] || {};
  const away = match?.teams?.[1] || {};
  const enVivo = match?.estado === "in";
  const minutosRestantes = Math.ceil(restanteMs / 60000);

  return (
    <div style={DARK}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <img src="/logo.png" alt="" width={34} height={34} style={{ borderRadius: 8 }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>📺 ESPN Deportes — GRATIS</div>
            <div style={{ fontSize: 12, color: "#8b95a1" }}>
              Sin registro · acceso libre por 2 horas alrededor del partido
            </div>
          </div>
        </header>

        {cargando ? (
          <p style={{ color: "#8b95a1" }}>Cargando el partido...</p>
        ) : !match?.teams ? (
          <p style={{ color: "#8b95a1" }}>{match?.motivo || "El partido no esta disponible."}</p>
        ) : (
          <>
            {/* MARCADOR */}
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

            {/* REPRODUCTOR */}
            <PlayerBox playerState={playerState} match={match} videoRef={videoRef} />

            {/* TIEMPO RESTANTE */}
            {playerState === "listo" && (
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

            {/* ESTADISTICAS */}
            <h3 style={{ margin: "4px 0 8px", fontSize: 15 }}>📊 Estadisticas</h3>
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

            <p style={{ fontSize: 11, color: "#5c6670", marginTop: 18, textAlign: "center" }}>
              Señal de ESPN Deportes vía 3SIXTYBETS AI · solo durante la ventana de 2 horas del partido
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function PlayerBox({ playerState, match, videoRef }) {
  return (
    <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", border: "1px solid #22303c", background: "#000", marginBottom: 14 }}>
      <video
        ref={videoRef}
        controls
        playsInline
        style={{ width: "100%", aspectRatio: "16/9", display: "block", background: "#000" }}
      />
      {playerState !== "listo" && (
        <div style={{
          position: "absolute", inset: 0, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 8, textAlign: "center",
          background: "rgba(0,0,0,0.75)", padding: 16,
        }}>
          {playerState === "cargando" && <p>Conectando con ESPN Deportes...</p>}
          {playerState === "antes" && (
            <>
              <div style={{ fontSize: 40 }}>⏳</div>
              <p style={{ margin: 0 }}>
                El acceso gratis abre 30 min antes del partido
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
  );
}
