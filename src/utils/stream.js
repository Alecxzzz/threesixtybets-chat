/**
 * Utilidades para resolver la URL final que se le pasa a hls.js.
 *
 * En dev/preview el proxy lo sirve el plugin de Vite (vite-plugins/hls-proxy.js).
 * En producción define VITE_HLS_PROXY con la URL de tu proxy desplegado, por ej:
 *   VITE_HLS_PROXY=https://mi-backend.onrender.com/hls-proxy
 */
export const PROXY_BASE = import.meta.env.VITE_HLS_PROXY || "/hls-proxy";

/** Devuelve la URL del stream pasada por el proxy. */
export function toProxyUrl(rawUrl, referer) {
  let url = `${PROXY_BASE}?url=${encodeURIComponent(rawUrl)}`;
  if (referer) url += `&referer=${encodeURIComponent(referer)}`;
  return url;
}

/** URL base del backend (para el transcodificador /live). */
export const API_BASE = (
  import.meta.env.VITE_API_URL ||
  "https://site--threesixtybetssz--qytms2wflqbs.code.run"
).replace(/\/$/, "");

/**
 * URL del transcodificador universal (H.264/AAC via FFmpeg en el backend).
 * Tercer fallback del reproductor: reproduce en cualquier navegador.
 */
export function transcoderUrl(rawUrl, referer) {
  let url = `${API_BASE}/live/index.m3u8?url=${encodeURIComponent(rawUrl)}`;
  if (referer) url += `&referer=${encodeURIComponent(referer)}`;
  return url;
}

/**
 * Decide si un canal necesita proxy obligatoriamente:
 * - Si la página está en https y el stream en http -> mixed content (bloqueado).
 * - Si el canal está marcado con proxy: true (servidor sin CORS o con geobloqueo).
 */
export function needsProxy(channel) {
  const raw = (channel?.stream || "").trim();
  if (!raw) return false;
  if (channel.proxy === true || channel.useProxy === true) return true;

  const pageIsHttps =
    typeof window !== "undefined" && window.location.protocol === "https:";
  return pageIsHttps && raw.startsWith("http://");
}

/**
 * URL lista para reproducir.
 * @param {object} channel
 * @param {boolean} forceProxy  se usa para el reintento automático tras un error fatal
 */
export function resolveStreamUrl(channel, forceProxy = false) {
  const raw = (channel?.stream || "").trim(); // trim: hay URLs con espacios en channels.js
  if (!raw) return "";
  if (channel.type === "iframe") return raw;

  if (forceProxy || needsProxy(channel)) {
    return toProxyUrl(raw, channel.referer);
  }
  return raw;
}

/**
 * Todas las fuentes de un canal EN ORDEN, con su etiqueta opcional: la
 * principal (stream) y luego las alternativas (alternatives).
 * Cada elemento es { url, label }. `label` solo aparece cuando la fuente se
 * declaró con etiqueta, ej. una alternativa { url, label: "(INGLES)" }, para
 * mostrarla junto al botón de opción del reproductor.
 * Las alternativas aceptan string (URL pelada) u objeto { url, label }.
 * @param {object} channel
 * @returns {{ url: string, label?: string }[]} en orden de preferencia.
 */
export function channelSourcesDetailed(channel) {
  const out = [];
  const main = (channel?.stream || "").trim();
  if (main) out.push({ url: main, label: channel?.streamLabel || undefined });
  const alts = Array.isArray(channel?.alternatives) ? channel.alternatives : [];
  for (const alt of alts) {
    if (typeof alt === "string") {
      const url = alt.trim();
      if (url) out.push({ url, label: undefined });
    } else if (alt && typeof alt === "object" && alt.url) {
      const url = String(alt.url).trim();
      if (url) out.push({ url, label: alt.label || undefined });
    }
  }
  return out;
}

/**
 * Compatibilidad: solo las URLs de las fuentes, en orden de preferencia.
 * @param {object} channel
 * @returns {string[]} URLs no vacías.
 */
export function channelSources(channel) {
  return channelSourcesDetailed(channel).map((s) => s.url);
}

