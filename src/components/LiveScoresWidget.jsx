import { useEffect, useState } from "react";
import "./LiveScoresWidget.css";

const API = import.meta.env.VITE_API_URL || "https://threesixtybets-ai-hosting.up.railway.app";

export default function LiveScoresWidget() {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = async () => {
    try {
      const res = await fetch(`${API}/api/scores/live`);
      const data = await res.json();
      setScores(data.scores || []);
    } catch {
      setScores([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 60000);
    return () => clearInterval(id);
  }, []);

  if (loading) return null;
  if (!scores.length) return null;

  return (
    <section className="live-scores">
      <div className="live-scores-header">
        <span className="live-dot"></span>
        <h3>Marcadores en vivo</h3>
      </div>
      <div className="live-scores-list">
        {scores.map((s, i) => (
          <div key={s.id || i} className="live-score-item">
            <div className="live-score-teams">
              <div className="live-score-team">
                <span>{s.home || "-"}</span>
                <strong>{s.homeScore ?? "-"}</strong>
              </div>
              <div className="live-score-team">
                <span>{s.away || "-"}</span>
                <strong>{s.awayScore ?? "-"}</strong>
              </div>
            </div>
            <div className="live-score-meta">
              <span className="live-score-sport">{(s.sport || "").toUpperCase()}</span>
              {s.clock && <span>{s.clock}</span>}
              {s.state === "pre" && <span>Próximo</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
