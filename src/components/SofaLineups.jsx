import { useEffect, useState } from "react";
import { getStoredSession, fetchSofascore } from "../services/api";
import Alineacion from "./Alineacion";

/**
 * Alineaciones del partido con el embed OFICIAL de SofaScore
 * (widgets.sofascore.com/en/embed/lineups?id=...).
 *
 * Ojo: el embed necesita el id de SofaScore del partido y ese id NO se puede
 * resolver solo, porque SofaScore bloquea las peticiones de servidor (403) y su
 * API no manda CORS. Por eso el backend lo lee de SOFASCORE_IDS (env), y si no
 * hay mapeo se pinta nuestra alineacion propia (campo con los 22 jugadores).
 *
 * Para probar cualquier partido sin esperar al mapeo: ?sofa=16363918 en la URL.
 */
export default function SofaLineups({ eventId, lineups = [], equipos = [] }) {
  const [sofaId, setSofaId] = useState(null);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    let cancelado = false;

    async function iniciar() {
      // Override manual por URL (util para probar el embed de un partido)
      try {
        const manual = new URLSearchParams(window.location.search).get("sofa");
        if (manual && /^\d+$/.test(manual)) {
          if (!cancelado) {
            setSofaId(Number(manual));
            setListo(true);
          }
          return;
        }
      } catch {
        /* sin URLSearchParams: seguimos por el backend */
      }

      const sesion = getStoredSession();
      if (!sesion || !eventId) {
        if (!cancelado) setListo(true);
        return;
      }

      try {
        const r = await fetchSofascore(sesion, eventId);
        if (!cancelado) setSofaId(r?.id || null);
      } catch {
        /* sin embed disponible: se usa el campo propio */
      } finally {
        if (!cancelado) setListo(true);
      }
    }

    iniciar();

    return () => {
      cancelado = true;
    };
  }, [eventId]);

  if (!listo) {
    return <div style={{ fontSize: 12, color: "#8b95a1" }}>Cargando alineación…</div>;
  }

  if (sofaId) {
    return (
      <iframe
        title="Alineaciones del partido"
        src={`https://widgets.sofascore.com/en/embed/lineups?id=${sofaId}&widgetTheme=dark`}
        className="sofa-embed"
        frameBorder="0"
        scrolling="no"
        loading="lazy"
      />
    );
  }

  return <Alineacion lineups={lineups} equipos={equipos} />;
}
