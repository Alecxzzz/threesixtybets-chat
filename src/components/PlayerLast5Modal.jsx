import { useEffect, useState } from "react";
import { fetchPlayerLast5 } from "../services/api";
import Modal from "./Modal";

export default function PlayerLast5Modal({ player, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await fetchPlayerLast5(
          player.sport,
          player.id,
          player.season
        );
        if (!cancelled) {
          if (result?.error) {
            setError(true);
          } else {
            setData(result);
          }
        }
      } catch (e) {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [player]);

  const closeOnEsc = (e) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div
        style={{
          background: "#0d1117",
          borderRadius: 12,
          padding: 20,
          maxWidth: 520,
          maxHeight: "85vh",
          overflowY: "auto",
          position: "relative",
          outline: "none",
        }}
        tabIndex={-1}
        onKeyDown={closeOnEsc}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          {player.headshot && (
            <img
              src={player.headshot}
              alt={player.name}
              width={48}
              height={48}
              style={{ borderRadius: "50%", objectFit: "cover" }}
            />
          )}
          <div>
            <h3 style={{ margin: 0, color: "#e6edf3", fontSize: 18 }}>
              Últimas 5 actuaciones
            </h3>
            <p style={{ margin: 0, color: "#8b95a1", fontSize: 13 }}>
              {player.name}
            </p>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#8b95a1" }}>
            <div className="spinner" style={{
              border: "3px solid #232a33",
              borderTop: "3px solid #60a5fa",
              borderRadius: "50%",
              width: 32,
              height: 32,
              margin: "0 auto 12px",
              animation: "spin 1s linear infinite"
            }}></div>
            Cargando últimas actuaciones...
          </div>
        )}

        {error && !loading && (
          <div style={{
            padding: "20px",
            textAlign: "center",
            color: "#f85149",
            fontSize: 13
          }}>
            No se pudieron cargar las estadísticas del jugador.
          </div>
        )}

        {data && !loading && !error && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ color: "#8b95a1" }}>
                  <th style={{ padding: "6px 8px", textAlign: "left", borderBottom: "1px solid #232a33" }}>Fecha</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", borderBottom: "1px solid #232a33" }}>Rival</th>
                  <th style={{ padding: "6px 8px", textAlign: "left", borderBottom: "1px solid #232a33" }}>Stats</th>
                </tr>
              </thead>
              <tbody>
                {data.last_5_games?.map((g, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #161b22" }}>
                    <td style={{ padding: "6px 8px", color: "#e6edf3" }}>
                      {new Date(g.date).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "short"
                      })}
                    </td>
                    <td style={{ padding: "6px 8px", color: "#60a5fa" }}>{g.opponent}</td>
                    <td style={{ padding: "6px 8px", color: "#8b95a1" }}>
                      {Object.entries(g.stats || {})
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            width: "100%",
            padding: "8px",
            background: "#238636",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 13,
            cursor: "pointer",
            transition: "background .2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "#2da44e"}
          onMouseLeave={(e) => e.currentTarget.style.background = "#238636"}
        >
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
