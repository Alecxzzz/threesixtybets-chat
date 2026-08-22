import { useEffect, useState, useCallback } from "react";
import { getStoredSession, fetchSportGames, fetchGameDetail } from "../services/api";

const SPORTS = [
  { key: "soccer", label: "⚽ Futbol" },
  { key: "nba", label: "🏀 NBA" },
  { key: "mlb", label: "⚾ MLB" },
  { key: "nfl", label: "🏈 NFL" },
  { key: "tennis", label: "🎾 Tenis" },
];

const REFRESH_MS = 60_000;

function formatTime(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleTimeString("es-NI", {
      hour: "2-digit",
      minute: "2-digit",
    });
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
  const hasLines =
    (game.home_linescores?.length || 0) > 0 && (game.away_linescores?.length || 0) > 0;

  return (
    <div
      onClick={() => onOpen(game)}
      style={{
        background: "#11161d",
        border: `1px solid ${live ? "#22c55e" : "#232a33"}`,
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        cursor: "pointer",
        transition: "border-color .15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = live ? "#4ade80" : "#3a4450")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = live ? "#22c55e" : "#232a33")}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: live ? "#22c55e" : "#8b95a1",
        }}
      >
        <span>{game.league}</span>
        <span>{statusLabel(game)}</span>
      </div>

      {[game.away, game.home].map((team, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontWeight: team?.winner ? 700 : 400,
            color: team?.winner ? "#e6edf3" : "#c9d1d9",
          }}
        >
          {team?.logo && (
            <img src={team.logo} alt="" width={22} height={22} style={{ objectFit: "contain" }} />
          )}
          <span style={{ flex: 1 }}>
            {team?.name || "?"}
            {team?.record && (
              <span style={{ color: "#8b95a1", fontWeight: 400, marginLeft: 8, fontSize: 12 }}>
                ({team.record})
              </span>
            )}
          </span>
          {hasLines && (
            <span style={{ display: "flex", gap: 6, fontSize: 11, color: "#8b95a1", fontVariantNumeric: "tabular-nums" }}>
              {(i === 0 ? game.away_linescores : game.home_linescores).map((v, j) => (
                <span key={j} style={{ minWidth: 14, textAlign: "center" }}>{v}</span>
              ))}
            </span>
          )}
          <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 18, minWidth: 24, textAlign: "right" }}>
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

      <div style={{ fontSize: 11, color: "#566270", textAlign: "right" }}>Ver estadisticas →</div>
    </div>
  );
}

function StatRow({ stat }) {
  // stat: {name, away, home}
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "70px 1fr 70px",
        alignItems: "center",
        gap: 10,
        padding: "6px 0",
        borderBottom: "1px solid #1c232c",
        fontSize: 13,
      }}
    >
      <span style={{ color: "#e6edf3", fontWeight: 600, textAlign: "left" }}>{stat.away}</span>
      <span style={{ color: "#8b95a1", textAlign: "center" }}>{stat.name}</span>
      <span style={{ color: "#e6edf3", fontWeight: 600, textAlign: "right" }}>{stat.home}</span>
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
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [sport, eventId]);

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

  const away = detail.teams?.find((t) => t.homeAway !== "home") || detail.teams?.[0];
  const home = detail.teams?.find((t) => t.homeAway === "home") || detail.teams?.[1];

  // Combinar estadisticas de ambos equipos por nombre de metrica
  const statsByName = {};
  for (const s of away?.statistics || []) statsByName[s.name] = { name: s.name, away: s.label, home: "" };
  for (const s of home?.statistics || []) {
    if (statsByName[s.name]) statsByName[s.name].home = s.label;
    else statsByName[s.name] = { name: s.name, away: "", home: s.label };
  }
  const statList = Object.values(statsByName);

  const linesLen = Math.max(away?.linescores?.length || 0, home?.linescores?.length || 0);

  return (
    <div className="tool-panel">
      <button onClick={onBack} style={backBtnStyle}>← Volver a partidos</button>

      {/* Marcador grande */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          margin: "20px 0",
          flexWrap: "wrap",
        }}
      >
        {[away, home].map((t, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            {t?.logo && <img src={t.logo} alt="" width={56} height={56} style={{ objectFit: "contain" }} />}
            <span style={{ fontWeight: t?.winner ? 700 : 400, color: t?.winner ? "#22c55e" : "#c9d1d9" }}>
              {t?.name}
            </span>
            <span style={{ fontSize: 40, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {t?.score ?? "-"}
            </span>
          </div>
        ))}
      </div>

      <p style={{ textAlign: "center", color: detail.state === "in" ? "#22c55e" : "#8b95a1", marginTop: -8 }}>
        {detail.state === "in" ? `🔴 ${detail.clock || detail.status}` : detail.status}
      </p>

      {/* Linescores: innings / cuartos / mitades */}
      {linesLen > 0 && (
        <div style={{ overflowX: "auto", margin: "16px 0" }}>
          <table style={{ margin: "0 auto", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "#8b95a1" }}>
                <th style={{ padding: "4px 10px" }}></th>
                {Array.from({ length: linesLen }, (_, i) => (
                  <th key={i} style={{ padding: "4px 10px" }}>{i + 1}</th>
                ))}
                <th style={{ padding: "4px 10px", color: "#e6edf3" }}>T</th>
              </tr>
            </thead>
            <tbody>
              {[away, home].map((t, i) => (
                <tr key={i}>
                  <td style={{ padding: "4px 10px", color: "#c9d1d9", whiteSpace: "nowrap" }}>{t?.abbr || t?.name}</td>
                  {(t?.linescores || []).map((v, j) => (
                    <td key={j} style={{ padding: "4px 10px", textAlign: "center", color: "#c9d1d9" }}>{v}</td>
                  ))}
                  <td style={{ padding: "4px 10px", textAlign: "center", fontWeight: 700, color: "#e6edf3" }}>
                    {t?.score ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Estadisticas comparadas */}
      {statList.length > 0 && (
        <>
          <h3 style={{ color: "#c9d1d9", margin: "24px 0 8px" }}>📊 Estadisticas</h3>
          <div style={{ maxWidth: 520, margin: "0 auto" }}>
            {statList.map((s, i) => (
              <StatRow key={i} stat={s} />
            ))}
          </div>
        </>
      )}

      {statList.length === 0 && linesLen === 0 && (
        <p style={{ color: "#8b95a1", textAlign: "center" }}>
          Las estadisticas detalladas estan disponibles cuando el partido comience.
        </p>
      )}
    </div>
  );
}

const backBtnStyle = {
  background: "transparent",
  border: "1px solid #232a33",
  borderRadius: 8,
  color: "#c9d1d9",
  padding: "6px 12px",
  cursor: "pointer",
};

function Stats() {
  const [sport, setSport] = useState("soccer");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [selected, setSelected] = useState(null); // {id, sport}

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

        {/* Tabs por deporte */}
        <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
          {SPORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSport(s.key)}
              style={{
                padding: "8px 14px",
                borderRadius: 10,
                border: `1px solid ${sport === s.key ? "#22c55e" : "#232a33"}`,
                background: sport === s.key ? "rgba(34,197,94,.12)" : "#11161d",
                color: sport === s.key ? "#22c55e" : "#c9d1d9",
                cursor: "pointer",
                fontWeight: sport === s.key ? 700 : 400,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {loading && !data && <p style={{ color: "#8b95a1" }}>Cargando partidos...</p>}
        {error && <p style={{ color: "#f87171" }}>Error: {error}</p>}

        {!loading && !error && games.length === 0 && (
          <p style={{ color: "#8b95a1", marginTop: 20 }}>
            No hay partidos programados para hoy en este deporte.
          </p>
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