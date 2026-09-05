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
