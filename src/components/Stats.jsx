import { useEffect, useState, useCallback, useRef } from "react";
import {
  getStoredSession,
  fetchSportGames,
  fetchGameDetail,
  fetchLeagues,
  fetchAiAnalysis,
} from "../services/api";

const SPORTS = [
  { key: "soccer", label: "⚽ Futbol" },
  { key: "nba", label: "🏀 NBA" },
  { key: "mlb", label: "⚾ MLB" },
  { key: "nfl", label: "🏈 NFL" },
  { key: "tennis", label: "🎾 Tenis" },
];

const SPORT_THEMES = {
  soccer: { grad: "linear-gradient(135deg,#064e3b 0%,#0f766e 50%,#052e16 100%)", accent: "#34d399" },
  nba: { grad: "linear-gradient(135deg,#7c2d12 0%,#ea580c 50%,#431407 100%)", accent: "#fb923c" },
  mlb: { grad: "linear-gradient(135deg,#1e3a8a 0%,#2563eb 50%,#172554 100%)", accent: "#60a5fa" },
  nfl: { grad: "linear-gradient(135deg,#312e81 0%,#6d28d9 50%,#1e1b4b 100%)", accent: "#a78bfa" },
  tennis: { grad: "linear-gradient(135deg,#14532d 0%,#65a30d 50%,#052e16 100%)", accent: "#bef264" },
};

const REFRESH_MS = 60_000;

function formatTime(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleTimeString("es-NI", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("es-NI", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

function statusLabel(game) {
  if (game.state === "in") return `🔴 ${game.clock || game.status || "EN VIVO"}`;
  if (game.state === "post") return game.status || "Final";
  return formatTime(game.date);
}

/* ---------- Pantalla de carga grande ---------- */
function LoadingScreen({ sport }) {
  const theme = SPORT_THEMES[sport] || SPORT_THEMES.soccer;
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 400,
      gap: 20,
    }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: "50%",
        border: `4px solid ${theme.accent}33`,
        borderTopColor: theme.accent,
        animation: "spin 1s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <h2 style={{ color: theme.accent, fontSize: 22, fontWeight: 700 }}>
        Cargando partidos...
      </h2>
      <p style={{ color: "#8b95a1", fontSize: 14 }}>
        Obteniendo datos en vivo de ESPN
      </p>
    </div>
  );
}

/* ---------- Tarjeta de partido ---------- */
function GameCard({ game, onOpen }) {
  const live = game.state === "in";
  const theme = SPORT_THEMES[game.sport] || SPORT_THEMES.soccer;
  const hasLines = (game.home_linescores?.length || 0) > 0 && (game.away_linescores?.length || 0) > 0;

  return (
    <div
      onClick={() => onOpen(game)}
      style={{
        background: "#11161d",
        border: `1px solid ${live ? theme.accent : "#232a33"}`,
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        cursor: "pointer",
        transition: "transform .12s, border-color .15s",
        boxShadow: live ? `0 0 14px ${theme.accent}22` : "none",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: live ? theme.accent : "#8b95a1" }}>
        <span>{game.league}</span>
        <span style={{ fontWeight: 600 }}>{statusLabel(game)}</span>
      </div>

      {[game.away, game.home].map((team, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: team?.winner ? 700 : 400, color: team?.winner ? "#e6edf3" : "#c9d1d9" }}>
          {team?.logo && <img src={team.logo} alt="" width={28} height={28} style={{ objectFit: "contain" }} />}
          <span style={{ flex: 1 }}>
            {team?.name || "?"}
            {team?.record && <span style={{ color: "#8b95a1", fontWeight: 400, marginLeft: 8, fontSize: 12 }}>({team.record})</span>}
          </span>
          {hasLines && (
            <span style={{ display: "flex", gap: 6, fontSize: 11, color: "#8b95a1", fontVariantNumeric: "tabular-nums" }}>
              {(i === 0 ? game.away_linescores : game.home_linescores).map((v, j) => (
                <span key={j} style={{ minWidth: 14, textAlign: "center" }}>{v}</span>
              ))}
            </span>
          )}
          <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 20, minWidth: 30, textAlign: "right", color: team?.winner ? theme.accent : "#c9d1d9" }}>
            {team?.score ?? "-"}
          </span>
        </div>
      ))}

      {game.odds?.details && (
        <div style={{ fontSize: 12, color: "#8b95a1", borderTop: "1px solid #232a33", paddingTop: 8 }}>
          📊 {game.odds.details}
          {game.odds.over_under != null && ` | O/U ${game.odds.over_under}`}
        </div>
      )}

      <div style={{ fontSize: 11, color: theme.accent, textAlign: "right", opacity: 0.8 }}>Ver detalle →</div>
    </div>
  );
}

/* ---------- Diamante de bases MLB ---------- */
function BasesDiamond({ situation }) {
  const base = (on) => ({
    width: 18, height: 18, transform: "rotate(45deg)",
    background: on ? "#facc15" : "#2a323d", border: "1px solid #3a4450", borderRadius: 3,
  });
  return (
    <div style={{ position: "relative", width: 56, height: 48 }}>
      <div style={{ ...base(situation.onSecond), position: "absolute", top: 0, left: 19 }} />
      <div style={{ ...base(situation.onThird), position: "absolute", bottom: 0, left: 0 }} />
      <div style={{ ...base(situation.onFirst), position: "absolute", bottom: 0, right: 0 }} />
    </div>
  );
}

/* ---------- Tablero estilo Sportradar ---------- */
function Scoreboard({ detail }) {
  const theme = SPORT_THEMES[detail.sport] || SPORT_THEMES.soccer;
  const away = detail.teams?.find((t) => t.homeAway !== "home") || detail.teams?.[0];
  const home = detail.teams?.find((t) => t.homeAway === "home") || detail.teams?.[1];
  const sit = detail.state === "in" ? detail.situation : null;
  const isMLB = detail.sport === "mlb";

  let statusText;
  if (detail.state === "in") {
    if (sit && isMLB) {
      statusText = `${sit.isTop ? "▲" : "▼"} ${sit.inning}ª entrada · ${sit.outs} out${sit.outs === 1 ? "" : "s"}`;
    } else {
      statusText = `🔴 ${detail.clock || detail.status}`;
    }
  } else {
    statusText = detail.status;
  }

  return (
    <div style={{ background: theme.grad, borderRadius: 16, padding: "26px 24px", marginBottom: 20, boxShadow: "0 6px 24px rgba(0,0,0,.35)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 120 }}>
          {away?.logo && <img src={away.logo} alt="" width={64} height={64} style={{ objectFit: "contain", filter: "drop-shadow(0 2px 6px rgba(0,0,0,.5))" }} />}
          <span style={{ fontWeight: 700, fontSize: 15, color: "#fff", textAlign: "center" }}>{away?.name}</span>
          {away?.records?.[0] && <span style={{ fontSize: 12, color: "#ffffffaa" }}>{away.records[0]}</span>}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span style={{ fontSize: 52, fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums", textShadow: "0 2px 8px rgba(0,0,0,.4)" }}>
            {away?.score ?? "-"}
          </span>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ background: detail.state === "in" ? "#ef4444" : "rgba(255,255,255,.15)", color: "#fff", padding: "4px 14px", borderRadius: 999, fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
              {statusText}
            </span>
            {sit && isMLB && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <BasesDiamond situation={sit} />
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: i < (sit.outs || 0) ? "#ef4444" : "#ffffff44" }} />
                  ))}
                </div>
              </div>
            )}
          </div>
          <span style={{ fontSize: 52, fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums", textShadow: "0 2px 8px rgba(0,0,0,.4)" }}>
            {home?.score ?? "-"}
          </span>
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 120 }}>
          {home?.logo && <img src={home.logo} alt="" width={64} height={64} style={{ objectFit: "contain", filter: "drop-shadow(0 2px 6px rgba(0,0,0,.5))" }} />}
          <span style={{ fontWeight: 700, fontSize: 15, color: "#fff", textAlign: "center" }}>{home?.name}</span>
          {home?.records?.[0] && <span style={{ fontSize: 12, color: "#ffffffaa" }}>{home.records[0]}</span>}
        </div>
      </div>
    </div>
  );
}

/* ---------- Barra de estadistica comparada ---------- */
function StatBar({ stat, awayColor, homeColor }) {
  const a = parseFloat(stat.away);
  const h = parseFloat(stat.home);
  const comparable = !isNaN(a) && !isNaN(h) && (a + h) > 0;

  return (
    <div style={{ padding: "8px 0", borderBottom: "1px solid #1c232c" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
        <span style={{ color: awayColor, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{stat.away}</span>
        <span style={{ color: "#aab4bf", flex: 1, textAlign: "center" }}>{stat.name}</span>
        <span style={{ color: homeColor, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{stat.home}</span>
      </div>
      {comparable && (
        <div style={{ display: "flex", height: 5, borderRadius: 3, overflow: "hidden", background: "#1c232c" }}>
          <div style={{ width: `${(a / (a + h)) * 100}%`, background: awayColor }} />
          <div style={{ width: `${(h / (a + h)) * 100}%`, background: homeColor }} />
        </div>
      )}
    </div>
  );
}

/* ---------- Mini juego para H2H y ultimos partidos ---------- */
function MiniGame({ game }) {
  const ha = game.away || {};
  const hh = game.home || {};
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "4px 0" }}>
      {ha.logo && <img src={ha.logo} alt="" width={16} height={16} style={{ objectFit: "contain" }} />}
      <span style={{ flex: 1, textAlign: "right", color: ha.winner ? "#e6edf3" : "#8b95a1" }}>{ha.name}</span>
      <span style={{ fontWeight: 700, color: "#c9d1d9", minWidth: 20, textAlign: "center" }}>{ha.score ?? "-"}</span>
      <span style={{ color: "#566270" }}>-</span>
      <span style={{ fontWeight: 700, color: "#c9d1d9", minWidth: 20, textAlign: "center" }}>{hh.score ?? "-"}</span>
      <span style={{ flex: 1, color: hh.winner ? "#e6edf3" : "#8b95a1" }}>{hh.name}</span>
      {hh.logo && <img src={hh.logo} alt="" width={16} height={16} style={{ objectFit: "contain" }} />}
    </div>
  );
}

/* ---------- Efecto de escritura para IA ---------- */
function TypewriterText({ text, speed = 20 }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!text) return;
    setDisplayed("");
    setDone(false);
    indexRef.current = 0;

    const interval = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayed(text.slice(0, indexRef.current + 1));
        indexRef.current += 1;
      } else {
        setDone(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <span style={{ opacity: 0.5, animation: "blink 1s infinite" }}>▋</span>}
      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </span>
  );
}

/* ---------- Vista de detalle del partido ---------- */
function GameDetail({ sport, eventId, onBack }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStarted, setAiStarted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const session = getStoredSession();
      if (!session) return;
      try {
        const result = await fetchGameDetail(session, sport, eventId);
        if (!cancelled) {
          setDetail(result);
          setError(result?.error || null);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [sport, eventId]);

  // Auto-cargar analisis IA cuando el detalle este listo
  useEffect(() => {
    if (detail && !detail.error && !aiStarted) {
      setAiStarted(true);
      loadAi();
    }
  }, [detail, aiStarted]);

  async function loadAi() {
    const session = getStoredSession();
    if (!session) return;
    setAiLoading(true);
    try {
      const result = await fetchAiAnalysis(session, sport, eventId);
      setAiAnalysis(result);
    } catch (err) {
      setAiAnalysis({ analysis: `Error: ${err.message}` });
    } finally {
      setAiLoading(false);
    }
  }

  const backBtnStyle = { background: "transparent", border: "1px solid #232a33", borderRadius: 8, color: "#c9d1d9", padding: "6px 12px", cursor: "pointer" };

  if (error) {
    return (
      <div className="tool-panel">
        <button onClick={onBack} style={backBtnStyle}>← Volver</button>
        <p style={{ color: "#f87171" }}>Error: {error}</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="tool-panel">
        <button onClick={onBack} style={backBtnStyle}>← Volver</button>
        <LoadingScreen sport={sport} />
      </div>
    );
  }

  const theme = SPORT_THEMES[sport] || SPORT_THEMES.soccer;
  const away = detail.teams?.find((t) => t.homeAway !== "home") || detail.teams?.[0];
  const home = detail.teams?.find((t) => t.homeAway === "home") || detail.teams?.[1];

  const statsByName = {};
  for (const s of away?.statistics || []) statsByName[s.name] = { name: s.name, away: s.label, home: "" };
  for (const s of home?.statistics || []) {
    if (statsByName[s.name]) statsByName[s.name].home = s.label;
    else statsByName[s.name] = { name: s.name, away: "", home: s.label };
  }

  const groups = {};
  for (const s of Object.values(statsByName)) {
    const idx = s.name.indexOf(" - ");
    if (idx > -1) {
      const cat = s.name.slice(0, idx);
      groups[cat] = groups[cat] || [];
      groups[cat].push({ ...s, name: s.name.slice(idx + 3) });
    } else {
      groups["Estadisticas"] = groups["Estadisticas"] || [];
      groups["Estadisticas"].push(s);
    }
  }

  const linesLen = Math.max(away?.linescores?.length || 0, home?.linescores?.length || 0);
  const h2h = detail.head_to_head || [];
  const keyPlayers = detail.key_players || [];

  return (
    <div className="tool-panel" style={{ maxWidth: "100%", overflowX: "auto" }}>
      <button onClick={onBack} style={backBtnStyle}>← Volver a partidos</button>

      <Scoreboard detail={detail} />

      {/* Linescores */}
      {linesLen > 0 && (
        <div style={{ overflowX: "auto", margin: "0 0 20px" }}>
          <table style={{ margin: "0 auto", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "#8b95a1" }}>
                <th style={{ padding: "4px 10px" }}></th>
                {Array.from({ length: linesLen }, (_, i) => (
                  <th key={i} style={{ padding: "4px 10px" }}>{i + 1}</th>
                ))}
                <th style={{ padding: "4px 10px", color: theme.accent }}>T</th>
              </tr>
            </thead>
            <tbody>
              {[away, home].map((t, i) => (
                <tr key={i}>
                  <td style={{ padding: "4px 10px", color: "#c9d1d9", whiteSpace: "nowrap", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                    {t?.logo && <img src={t.logo} alt="" width={18} height={18} style={{ objectFit: "contain" }} />}
                    {t?.abbr || t?.name}
                  </td>
                  {(t?.linescores || []).map((v, j) => (
                    <td key={j} style={{ padding: "4px 10px", textAlign: "center", color: "#c9d1d9" }}>{v}</td>
                  ))}
                  <td style={{ padding: "4px 10px", textAlign: "center", fontWeight: 800, color: theme.accent }}>{t?.score ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* H2H */}
      {h2h.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: "#e6edf3", margin: "0 0 8px", padding: "8px 14px", background: `linear-gradient(90deg, ${theme.accent}22, transparent)`, borderLeft: `4px solid ${theme.accent}`, borderRadius: 6, fontSize: 15 }}>
            ⚔️ Historial H2H
          </h3>
          <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 8px" }}>
            {h2h.map((h, i) => (
              <div key={i} style={{ marginBottom: 4 }}>
                <MiniGame game={h} />
                <div style={{ fontSize: 11, color: "#566270", textAlign: "center" }}>{formatDate(h.date)} · {h.status}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ultimos partidos de cada equipo */}
      {(away?.recent_games?.length > 0 || home?.recent_games?.length > 0) && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: "#e6edf3", margin: "0 0 8px", padding: "8px 14px", background: `linear-gradient(90deg, ${theme.accent}22, transparent)`, borderLeft: `4px solid ${theme.accent}`, borderRadius: 6, fontSize: 15 }}>
            📅 Ultimos partidos
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 700, margin: "0 auto" }}>
            {[away, home].map((t, i) => (
              <div key={i}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: theme.accent, fontWeight: 700, marginBottom: 4 }}>
                  {t?.logo && <img src={t.logo} alt="" width={18} height={18} style={{ objectFit: "contain" }} />}
                  {t?.name}
                </div>
                {(t?.recent_games || []).map((r, j) => (
                  <div key={j} style={{ marginBottom: 4 }}>
                    <MiniGame game={r} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Jugadores destacados */}
      {keyPlayers.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: "#e6edf3", margin: "0 0 8px", padding: "8px 14px", background: `linear-gradient(90deg, ${theme.accent}22, transparent)`, borderLeft: `4px solid ${theme.accent}`, borderRadius: 6, fontSize: 15 }}>
            ⭐ Jugadores destacados
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, maxWidth: 700, margin: "0 auto" }}>
            {keyPlayers.map((p, i) => (
              <div key={i} style={{ background: "#11161d", border: "1px solid #232a33", borderRadius: 10, padding: 12, display: "flex", gap: 10, alignItems: "center" }}>
                {p.headshot && <img src={p.headshot} alt="" width={40} height={40} style={{ borderRadius: "50%", objectFit: "cover" }} />}
                <div>
                  <div style={{ fontWeight: 700, color: "#e6edf3", fontSize: 13 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: "#8b95a1" }}>
                    {p.stats.map((s, j) => `${s.name}: ${s.value}`).join(" · ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estadisticas por equipo - usa toda la pantalla */}
      {Object.keys(groups).length > 0 &&
        Object.entries(groups).map(([cat, list]) => (
          <div key={cat} style={{ marginBottom: 24 }}>
            <h3 style={{ color: "#e6edf3", margin: "0 0 4px", padding: "8px 14px", background: `linear-gradient(90deg, ${theme.accent}22, transparent)`, borderLeft: `4px solid ${theme.accent}`, borderRadius: 6, fontSize: 15 }}>
              📊 {cat}
            </h3>
            <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 8px" }}>
              {list.map((s, i) => (
                <StatBar key={i} stat={s} awayColor="#38bdf8" homeColor="#f472b6" />
              ))}
            </div>
          </div>
        ))}

      {/* Analisis IA - automatico con efecto de escritura */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ color: "#e6edf3", margin: "0 0 8px", padding: "8px 14px", background: `linear-gradient(90deg, ${theme.accent}22, transparent)`, borderLeft: `4px solid ${theme.accent}`, borderRadius: 6, fontSize: 15 }}>
          🤖 Analisis de la IA
        </h3>
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "0 8px" }}>
          {aiLoading && (
            <div style={{ background: "#11161d", border: `1px solid ${theme.accent}44`, borderRadius: 10, padding: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: `3px solid ${theme.accent}33`, borderTopColor: theme.accent, animation: "spin 1s linear infinite" }} />
              <span style={{ color: "#8b95a1", fontSize: 13 }}>La IA esta analizando el partido...</span>
            </div>
          )}
          {!aiLoading && aiAnalysis && (
            <div style={{ background: "#11161d", border: `1px solid ${theme.accent}44`, borderRadius: 10, padding: 14, whiteSpace: "pre-wrap", fontSize: 13, color: "#c9d1d9", lineHeight: 1.6, minHeight: 60 }}>
              <TypewriterText text={aiAnalysis.analysis} />
            </div>
          )}
          {!aiLoading && !aiAnalysis && (
            <button
              onClick={loadAi}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: 10,
                border: `1px solid ${theme.accent}`,
                background: `${theme.accent}11`,
                color: theme.accent,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              🤖 Generar analisis IA del partido
            </button>
          )}
        </div>
      </div>

      {Object.keys(groups).length === 0 && linesLen === 0 && h2h.length === 0 && keyPlayers.length === 0 && (
        <p style={{ color: "#8b95a1", textAlign: "center" }}>
          Las estadisticas detalladas estan disponibles cuando el partido comience.
        </p>
      )}
    </div>
  );
}

/* ---------- Vista principal de Estadisticas ---------- */
function Stats() {
  const [sport, setSport] = useState("soccer");
  const [league, setLeague] = useState(null);
  const [leagues, setLeagues] = useState([]);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all"); // all | in | pre | post

  useEffect(() => {
    async function loadLeagues() {
      const session = getStoredSession();
      if (!session) return;
      try {
        const result = await fetchLeagues(session);
        setLeagues(result?.soccer || []);
      } catch {}
    }
    loadLeagues();
  }, []);

  const load = useCallback(async () => {
    const session = getStoredSession();
    if (!session) return;
    setLoading(true);
    try {
      const result = await fetchSportGames(session, sport, league);
      setData(result);
      setError(result?.error || null);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sport, league]);

  useEffect(() => {
    setSelected(null);
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  if (selected) {
    return <GameDetail sport={selected.sport} eventId={selected.id} onBack={() => setSelected(null)} />;
  }

  const games = data?.games || [];
  const upcoming = games.filter((g) => g.state === "pre");
  const live = games.filter((g) => g.state === "in");
  const finished = games.filter((g) => g.state === "post");

  // Filtrar por estado
  let displayGames = games;
  if (filter === "in") displayGames = live;
  else if (filter === "pre") displayGames = upcoming;
  else if (filter === "post") displayGames = finished;

  return (
    <section className="tool-page">
      <div className="tool-panel" style={{ maxWidth: "100%", overflowX: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Estadisticas en vivo</h2>
          <span style={{ fontSize: 12, color: "#8b95a1" }}>
            {lastUpdate && `Actualizado ${lastUpdate.toLocaleTimeString("es-NI")}`} · auto cada 60s
          </span>
        </div>

        {/* Tabs por deporte */}
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          {SPORTS.map((s) => {
            const active = sport === s.key;
            const th = SPORT_THEMES[s.key];
            return (
              <button
                key={s.key}
                onClick={() => { setSport(s.key); setLeague(null); setFilter("all"); }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: `1px solid ${active ? th.accent : "#232a33"}`,
                  background: active ? th.grad : "#11161d",
                  color: active ? "#fff" : "#c9d1d9",
                  cursor: "pointer",
                  fontWeight: active ? 700 : 400,
                  boxShadow: active ? `0 0 12px ${th.accent}44` : "none",
                }}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Selector de liga (solo futbol) */}
        {sport === "soccer" && leagues.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <select
              value={league || ""}
              onChange={(e) => setLeague(e.target.value || null)}
              style={{
                width: "100%",
                maxWidth: 400,
                padding: "8px 12px",
                borderRadius: 10,
                border: "1px solid #232a33",
                background: "#11161d",
                color: "#c9d1d9",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              <option value="">🌍 Todas las ligas</option>
              {leagues.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Filtros por estado */}
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {[
            { key: "all", label: "📋 Todos", count: games.length },
            { key: "in", label: "🔴 En vivo", count: live.length },
            { key: "pre", label: "📅 Proximos", count: upcoming.length },
            { key: "post", label: "✅ Finalizados", count: finished.length },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: `1px solid ${filter === f.key ? "#3a4450" : "#232a33"}`,
                background: filter === f.key ? "#1c232c" : "transparent",
                color: filter === f.key ? "#e6edf3" : "#8b95a1",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: filter === f.key ? 700 : 400,
              }}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {/* Contenido */}
        {loading ? (
          <LoadingScreen sport={sport} />
        ) : error ? (
          <p style={{ color: "#f87171" }}>Error: {error}</p>
        ) : displayGames.length === 0 ? (
          <p style={{ color: "#8b95a1", marginTop: 20, textAlign: "center" }}>
            No hay partidos en esta categoria.
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12, marginTop: 20 }}>
            {displayGames.map((g) => (
              <GameCard key={g.id} game={g} onOpen={(game) => setSelected({ id: game.id, sport })} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default Stats;