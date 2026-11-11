/**
 * Analítica propia y reporte de errores del navegador.
 *
 * No se usa ningún servicio externo (ni cookies, ni Google, ni píxeles): el
 * navegador avisa al backend de que se abrió una ruta y, si algo revienta, se
 * manda el mensaje al log del servidor. Eso es coherente con la Política de
 * Privacidad, que dice que solo se guarda el conteo por página y día.
 */
const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://xn--sixtyserver--b61q52a.up.railway.app"
).replace(/\/$/, "");

/** Suma una visita a la ruta actual. Silencioso: nunca rompe la página. */
export function registrarVista() {
  try {
    const path = window.location.pathname + window.location.search;
    // keepalive: sobrevive si el usuario cierra la pestaña enseguida.
    fetch(`${API_URL}/analytics/pv`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* la analítica nunca debe romper la app */
  }
}

/** Manda un error del navegador al backend (se ve en los logs). */
export function reportarError(error, extra = "") {
  try {
    fetch(`${API_URL}/errors/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: String(error?.message || error || "error desconocido"),
        stack: String(error?.stack || extra || "").slice(0, 400),
        path: window.location.pathname,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* idem */
  }
}
