import { useEffect, useState, useCallback } from "react";
import { getStoredSession, fetchSportGames, fetchGameDetail } from "../services/api";

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

function statusLabel(game) {
  if (game.state === "in") return `🔴 ${game.clock || game.status || "EN VIVO"}`;
  if (game.state === "post") return game.status || "Final";
  return formatTime(game.date);
}

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
          {team?.logo && <img src={team.logo} alt="" width={24} height={24} style={{ objectFit: "contain" }} />}
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

      <div style={{ fontSize: 11, color: theme.accent, textAlign: "right", opacity: 0.8 }}>Ver estadisticas →</div>
    </div>
  );
}

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

function GameDetail({ sport, eventId, onBack }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

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
        <p style={{ color: "#8b95a1" }}>Cargando estadisticas...</p>
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

  return (
    <div className="tool-panel">
      <button onClick={onBack} style={backBtnStyle}>← Volver a partidos</button>

      <Scoreboard detail={detail} />

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
                  <td style={{ padding: "4px 10px", color: "#c9d1d9", whiteSpace: "nowrap", fontWeight: 600 }}>{t?.abbr || t?.name}</td>
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

      {Object.keys(groups).length > 0 &&
        Object.entries(groups).map(([cat, list]) => (
          <div key={cat} style={{ marginBottom: 24 }}>
            <h3 style={{ color: "#e6edf3", margin: "0 0 4px", padding: "8px 14px", background: `linear-gradient(90deg, ${theme.accent}22, transparent)`, borderLeft: `4px solid ${theme.accent}`, borderRadius: 6, fontSize: 15 }}>
              📊 {cat}
            </h3>
            <div style={{ maxWidth: 560, margin: "0 auto", padding: "0 8px" }}>
              {list.map((s, i) => (
                <StatBar key={i} stat={s} awayColor="#38bdf8" homeColor="#f472b6" />
              ))}
            </div>
          </div>
        ))}

      {Object.keys(groups).length === 0 && linesLen === 0 && (
        <p style={{ color: "#8b95a1", textAlign: "center" }}>Las estadisticas detalladas estan disponibles cuando el partido comience.</p>
      )}
    </div>
  );
}

function Stats() {
  const [sport, setSport] = useState("soccer");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    const session = getStoredSession();
    if (!session) return;
    setLoading(true);
    try {
      const result = await fetchSportGames(session, sport);
      setData(result);
      setError(result?.error || null);
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [sport]);

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

  return (
    <section className="tool-page">
      <div className="tool-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <h2 style={{ margin: 0 }}>Estadisticas en vivo</h2>
          <span style={{ fontSize: 12, color: "#8b95a1" }}>
            {lastUpdate && `Actualizado ${lastUpdate.toLocaleTimeString("es-NI")}`} · auto cada 60s
          </span>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          {SPORTS.map((s) => {
            const active = sport === s.key;
            const th = SPORT_THEMES[s.key];
            return (
              <button
                key={s.key}
                onClick={() => setSport(s.key)}
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

        {loading && !data && <p style={{ color: "#8b95a1" }}>Cargando partidos...</p>}
        {error && <p style={{ color: "#f87171" }}>Error: {error}</p>}

        {!loading && !error && games.length === 0 && (
          <p style={{ color: "#8b95a1", marginTop: 20 }}>No hay partidos programados para hoy en este deporte.</p>
        )}

        {live.length > 0 && (
          <>
            <h3 style={{ color: "#22c55e", margin: "24px 0 12px" }}>🔴 En vivo ({live.length})</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
              {live.map((g) => <GameCard key={g.id} game={g} onOpen={(game) => setSelected({ id: game.id, sport })} />)}
            </div>
          </>
        )}

        {upcoming.length > 0 && (
          <>
            <h3 style={{ color: "#c9d1d9", margin: "24px 0 12px" }}>📅 Proximos ({upcoming.length})</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
              {upcoming.map((g) => <GameCard key={g.id} game={g} onOpen={(game) => setSelected({ id: game.id, sport })} />)}
            </div>
          </>
        )}

        {finished.length > 0 && (
          <>
            <h3 style={{ color: "#8b95a1", margin: "24px 0 12px" }}>✅ Finalizados ({finished.length})</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
              {finished.slice(0, 16).map((g) => <GameCard key={g.id} game={g} onOpen={(game) => setSelected({ id: game.id, sport })} />)}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default Stats;