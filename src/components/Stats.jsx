import { useEffect, useState, useCallback } from "react";
import { getStoredSession, fetchSportGames } from "../services/api";

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

function GameCard({ game }) {
  const live = game.state === "in";
  const finished = game.state === "post";

  return (
    <div
      style={{
        background: "#11161d",
        border: `1px solid ${live ? "#22c55e" : "#232a33"}`,
        borderRadius: 12,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
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
        <span>
          {live && "🔴 "}
          {live ? game.clock || "EN VIVO" : finished ? "Final" : formatTime(game.date)}
        </span>
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
          <span style={{ fontVariantNumeric: "tabular-nums", fontSize: 18 }}>
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
    </div>
  );
}

function Stats() {
  const [sport, setSport] = useState("soccer");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

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
    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {live.map((g) => <GameCard key={g.id} game={g} />)}
            </div>
          </>
        )}

        {upcoming.length > 0 && (
          <>
            <h3 style={{ color: "#c9d1d9", margin: "24px 0 12px" }}>📅 Proximos ({upcoming.length})</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {upcoming.map((g) => <GameCard key={g.id} game={g} />)}
            </div>
          </>
        )}

        {finished.length > 0 && (
          <>
            <h3 style={{ color: "#8b95a1", margin: "24px 0 12px" }}>✅ Finalizados ({finished.length})</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
              {finished.slice(0, 12).map((g) => <GameCard key={g.id} game={g} />)}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default Stats;