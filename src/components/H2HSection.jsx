import { useState } from "react";

/* Sección "Historial y últimos partidos": dos tarjetas por equipo (Local /
   Todos / Visitante) y debajo los enfrentamientos directos, con el diseño de
   la referencia (filas fecha · rival · marcador · G/P/E). */

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function partesFecha(dateStr) {
  if (!dateStr) return { dia: "", mes: "", anio: "" };
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return { dia: "", mes: "", anio: "" };
  return { dia: d.getDate(), mes: MESES[d.getMonth()], anio: d.getFullYear() };
}

const COLOR_RESULTADO = { G: "#16a34a", P: "#dc2626", E: "#6b7280" };

/* ¿El equipo jugó de local en este partido? */
function deLocal(game, team) {
  const nombre = (team?.name || "").toLowerCase();
  if (!nombre) return true;
  const local = (game?.home?.name || "").toLowerCase();
  const visitante = (game?.away?.name || "").toLowerCase();
  if (visitante === nombre && local !== nombre) return false;
  return true;
}

function leerPartido(game, team) {
  const local = deLocal(game, team);
  const mio = local ? game?.home : game?.away;
  const rival = local ? game?.away : game?.home;
  const gf = Number(mio?.score);
  const gc = Number(rival?.score);
  const valido = Number.isFinite(gf) && Number.isFinite(gc);
  return {
    local,
    rival,
    gf: valido ? gf : mio?.score,
    gc: valido ? gc : rival?.score,
    resultado: valido ? (gf > gc ? "G" : gf < gc ? "P" : "E") : null,
  };
}

function EtiquetaResultado({ resultado }) {
  if (!resultado) return null;
  return (
    <span
      title={resultado === "G" ? "Ganado" : resultado === "P" ? "Perdido" : "Empatado"}
      style={{
        width: 22, height: 22, borderRadius: 4, flexShrink: 0,
        display: "grid", placeItems: "center",
        background: COLOR_RESULTADO[resultado], color: "#fff",
        fontSize: 11, fontWeight: 800,
      }}
    >
      {resultado}
    </span>
  );
}

function FilaPartido({ game, team }) {
  const { local, rival, gf, gc, resultado } = leerPartido(game, team);
  const { dia, mes } = partesFecha(game?.date);
  return (
    <div className="h2h-fila" style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "11px 16px", borderTop: "1px solid #1e2227", fontSize: 13,
    }}>
      <span style={{
        width: 54, flexShrink: 0, textAlign: "center",
        color: "#8b95a1", fontSize: 11.5, lineHeight: 1.3,
      }}>
        {dia} de {mes}
      </span>
      <span style={{ color: "#6b7280", fontSize: 11.5, flexShrink: 0, width: 16 }}>
        {local ? "vs" : "en"}
      </span>
      <span style={{
        flex: 1, minWidth: 0, color: "#e6edf3", fontWeight: 600,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {rival?.name || "?"}
      </span>
      <span style={{
        color: "#eef2f7", fontWeight: 800, letterSpacing: 0.3,
        flexShrink: 0, fontVariantNumeric: "tabular-nums",
      }}>
        {gf ?? "-"}-{gc ?? "-"}
      </span>
      <EtiquetaResultado resultado={resultado} />
    </div>
  );
}

function TarjetaEquipo({ team, juegos, label }) {
  const [vista, setVista] = useState("todos");
  const filtrados = (juegos || []).filter((g) => {
    if (vista === "todos") return true;
    const local = deLocal(g, team);
    return vista === "local" ? local : !local;
  });

  return (
    <div style={{
      background: "#141618", border: "1px solid #262a2e", borderRadius: 12,
      overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 0,
    }}>
      <h4 style={{
        margin: 0, padding: "15px 16px 12px",
        color: "#eef2f7", fontSize: 15, fontWeight: 800,
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
      }}>
        {label} {team?.name || ""}
      </h4>

      <div style={{
        display: "flex", gap: 4, margin: "0 16px 10px",
        background: "#0f1113", borderRadius: 999, padding: 3,
      }}>
        {[
          { key: "local", label: "Local" },
          { key: "todos", label: "Todos" },
          { key: "visitante", label: "Visitante" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setVista(t.key)}
            style={{
              flex: 1, padding: "7px 8px", borderRadius: 999, border: "none",
              cursor: "pointer", fontSize: 12.5, fontWeight: 700,
              background: vista === t.key ? "#3b82f6" : "transparent",
              color: vista === t.key ? "#fff" : "#9aa3ad",
              transition: "background .15s, color .15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="h2h-scroll" style={{ maxHeight: 470, overflowY: "auto" }}>
        {filtrados.length > 0 ? (
          filtrados.map((g, i) => <FilaPartido key={g.id || i} game={g} team={team} />)
        ) : (
          <div style={{ padding: "18px 16px", color: "#8b95a1", fontSize: 12, textAlign: "center" }}>
            Sin partidos en esta vista
          </div>
        )}
      </div>
    </div>
  );
}

function FilaH2H({ game }) {
  const { dia, mes, anio } = partesFecha(game?.date);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 16px", borderTop: "1px solid #1e2227",
    }}>
      <span style={{
        width: 52, flexShrink: 0, textAlign: "center",
        color: "#8b95a1", fontSize: 11.5, lineHeight: 1.3,
      }}>
        {dia} de {mes}
        <br />
        {anio}
      </span>
      <span style={{
        flex: 1, minWidth: 0, fontSize: 13.5, color: "#e6edf3", fontWeight: 700,
        display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
      }}>
        {game?.home?.name || "?"}
        <span style={{ color: "#8b95a1", fontWeight: 500 }}>vs</span>
        {game?.away?.name || "?"}
      </span>
      <span style={{
        color: "#eef2f7", fontWeight: 800, fontSize: 14, flexShrink: 0,
        fontVariantNumeric: "tabular-nums",
      }}>
        {game?.home?.score ?? "-"}-{game?.away?.score ?? "-"}
      </span>
    </div>
  );
}

export default function H2HSection({ home, away, h2h, theme, favs, onToggleFav }) {
  return (
    <div className="sd-card" data-tab="h2h">
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        marginBottom: 10, flexWrap: "wrap",
      }}>
        <h3 style={{
          color: "#eef2f7", margin: 0, fontSize: 14, fontWeight: 800,
          letterSpacing: 0.2, display: "flex", alignItems: "center", gap: 8,
        }}>
          ⚔️ Historial y últimos partidos
        </h3>
        {[home, away].filter(Boolean).map((t) => (
          <button
            key={t.id || t.name}
            onClick={() => onToggleFav?.(t)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 10px", borderRadius: 999,
              border: `1px solid ${favs?.[`equipo:${t.id}`] ? theme.accent : "#232a33"}`,
              background: favs?.[`equipo:${t.id}`] ? `${theme.accent}18` : "#0d1117",
              color: favs?.[`equipo:${t.id}`] ? theme.accent : "#8b95a1",
              cursor: "pointer", fontSize: 12,
            }}
            title={favs?.[`equipo:${t.id}`] ? "Quitar de favoritos" : "Seguir equipo"}
          >
            <span style={{ filter: favs?.[`equipo:${t.id}`] ? "none" : "grayscale(1)" }}>⭐</span>
            {t.short_name || t.name}
          </button>
        ))}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: 12,
      }}>
        <TarjetaEquipo team={home} juegos={home?.recent_games} label="Últimos partidos de" />
        <TarjetaEquipo team={away} juegos={away?.recent_games} label="Últimos partidos de" />
      </div>

      <div style={{
        background: "#141618", border: "1px solid #262a2e", borderRadius: 12,
        overflow: "hidden", marginTop: 12,
      }}>
        <h4 style={{
          margin: 0, padding: "15px 16px 12px",
          color: "#eef2f7", fontSize: 15, fontWeight: 800,
        }}>
          Enfrentamientos directos
        </h4>
        <div className="h2h-scroll" style={{ maxHeight: 470, overflowY: "auto" }}>
          {(h2h || []).length > 0 ? (
            h2h.map((g, i) => <FilaH2H key={g.id || i} game={g} />)
          ) : (
            <div style={{ padding: "18px 16px", color: "#8b95a1", fontSize: 12, textAlign: "center" }}>
              No hay datos H2H disponibles
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
