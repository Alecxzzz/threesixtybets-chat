import { useEffect, useState } from "react";
import { getStoredSession, fetchTracker } from "../services/api";

/**
 * Tracker del partido: widget `live_action` de Opta, embebido.
 *
 * El backend devuelve la URL publica que FotMob publica en
 * `matchDetails -> content.superlive.superLiveUrl`. Esa pagina monta el tracker
 * animado (pelota, direccion de juego, ultimas acciones) y responde sin
 * `X-Frame-Options` ni CSP, asi que se puede incrustar tal cual.
 *
 * No se replica nada: si el partido no trae widget, se explica el motivo que
 * manda el backend (`sin_cobertura`, `sin_datos`...).
 */
export default function TrackerPartido({ eventId, league = null }) {
  // `null` = cargando. Se resuelve de forma perezosa para no escribir estado
  // dentro del efecto (regla react-hooks/set-state-in-effect).
  const [datos, setDatos] = useState(() => {
    if (!getStoredSession() || !eventId) {
      return { ok: false, detalle: "Inicia sesión para ver el tracker." };
    }
    return null;
  });

  useEffect(() => {
    if (datos) return undefined;
    let cancelado = false;

    fetchTracker(getStoredSession(), "soccer", eventId, league)
      .then((r) => {
        if (!cancelado) setDatos(r);
      })
      .catch(() => {
        if (!cancelado) setDatos({ ok: false, detalle: "No se pudo cargar el tracker." });
      });

    return () => {
      cancelado = true;
    };
  }, [datos, eventId, league]);

  if (!datos) {
    return (
      <div className="alz-cargando">
        <span className="alz-spinner" aria-hidden="true" />
        Cargando tracker…
      </div>
    );
  }

  if (!datos.ok || !datos.url) {
    return (
      <p className="trk-vacio">
        {datos.detalle || "La fuente no publica el tracker de este partido."}
      </p>
    );
  }

  return (
    <div className="alz-tracker-caja">
      <iframe
        src={datos.url}
        title="Tracker del partido"
        className="alz-tracker"
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer"
      />
      <p className="alz-tracker-nota">
        {datos.en_vivo ? "En directo" : datos.terminado ? "Partido terminado" : "Sin empezar"}
        {" · "}Datos de Opta. Si el widget no arranca, pulsa su botón de reproducir.
      </p>
    </div>
  );
}
