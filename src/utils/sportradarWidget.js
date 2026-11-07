/**
 * Helper de integracion de widgets SIR de Sportradar (Engagement Tools).
 *
 * El loader oficial vive en:
 *   https://widgets.sir.sportradar.com/{clientId}/widgetloader
 *
 * `betradar` es el clientId PUBLICO que usa Sportradar en su demo
 * (widgets.sir.sportradar.com/betradar/en/live-match-tracker). NO es una
 * licencia nuestra: sirve para probar la integracion, pero en produccion hace
 * falta el clientId propio que da Sportradar al contratar Engagement Tools.
 */

export const CLIENT_DEMO = "betradar";

export function loaderUrl(clientId) {
  const limpio = String(clientId || "").trim() || CLIENT_DEMO;
  return `https://widgets.sir.sportradar.com/${limpio}/widgetloader`;
}

/**
 * Instala el stub global SIR y el script widgetloader (patron oficial de
 * Sportradar: las llamadas a SIR() se encolan hasta que carga el loader).
 * Si ya hay un SIR cargado, no hace nada.
 *
 * `alCambiarEstado` recibe: "cargando" | "cargado" | "error", para poder
 * distinguir un script bloqueado de un widget que no pinta por licencia.
 */
export function montarLoader(url, alCambiarEstado) {
  if (typeof window === "undefined") return null;

  const avisar = (estado) => {
    if (typeof alCambiarEstado === "function") alCambiarEstado(estado);
  };

  if (window.SIR) {
    avisar("cargado");
    return null;
  }

  const doc = document;

  const stub = function stub() {
    stub.q = stub.q || [];
    stub.q.push(arguments);
  };
  stub.l = 1 * new Date();
  stub.o = { language: "es" };
  window.SIR = stub;

  const script = doc.createElement("script");
  script.async = true;
  script.src = url;
  script.setAttribute("n", "SIR");
  script.dataset.srLoader = url;
  script.addEventListener("load", () => avisar(window.SIR && !window.SIR.q ? "cargado" : "cargado"));
  script.addEventListener("error", () => avisar("error"));

  const primero = doc.getElementsByTagName("script")[0];
  if (primero?.parentNode) primero.parentNode.insertBefore(script, primero);
  else doc.head.appendChild(script);

  avisar("cargando");
  return script;
}

/**
 * Quita el loader y el stub instalados, para poder montar otro clientId.
 */
export function reiniciarLoader() {
  if (typeof window === "undefined") return;
  document.querySelectorAll("script[data-sr-loader]").forEach((s) => s.remove());
  try {
    delete window.SIR;
  } catch {
    window.SIR = undefined;
  }
}

/** Pinta un widget en el selector indicado. Devuelve false si SIR no esta. */
export function agregarWidget(selector, widget, opciones = {}) {
  if (typeof window === "undefined" || !window.SIR) return false;

  const { matchId, layout, collapseTo, tabsPosition } = opciones;
  const props = {
    matchId: /^\d+$/.test(String(matchId)) ? Number(matchId) : matchId,
  };
  if (layout) props.layout = layout;
  if (collapseTo) props.collapseTo = collapseTo;
  if (tabsPosition) props.tabsPosition = tabsPosition;

  window.SIR("addWidget", selector, widget || "match.lmtPlus", props);
  return true;
}
