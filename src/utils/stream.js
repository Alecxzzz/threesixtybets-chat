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

/**
 * Errores de hls.js que significan "el navegador no sabe decodificar este
 * códec". El proxy NO ayuda aquí: reenvía los mismos bytes y el perfil sigue
 * siendo HEVC/H.265 (hvc1/hev1) o AC-3/E-AC-3, que Chrome y Firefox no pueden
 * meter en un SourceBuffer (MSE). VLC sí los reproduce porque trae sus propios
 * decodificadores. La única salida es transcodificar o cambiar de variante.
 */
export const CODEC_ERROR_DETAILS = new Set([
  "bufferAddCodecError",
  "bufferIncompatibleCodecsError",
  "fragParsingError",
]);

/** ¿El detalle de error de hls.js es un problema de códec no soportado? */
export function esErrorDeCodec(details) {
  return CODEC_ERROR_DETAILS.has(String(details || ""));
}

/** ¿Esta disponible Media Source Extensions (base de hls.js)? */
export function mseDisponible() {
  return typeof window !== "undefined" && typeof window.MediaSource !== "undefined";
}

/**
 * ¿El navegador soporta este códec? Pregunta a MSE, que es quien decide de
 * verdad si hls.js puede crear el SourceBuffer.
 * @param {string} codec  ej. "avc1.64001f", "hvc1.1.6.L93.B0", "mp4a.40.2"
 * @param {"video"|"audio"} kind
 */
export function codecSoportado(codec, kind = "video") {
  if (!codec) return true; // sin dato no se descarta la variante
  if (!mseDisponible()) return false;
  const mime = kind === "audio" ? "audio/mp4" : "video/mp4";
  try {
    return window.MediaSource.isTypeSupported(`${mime}; codecs="${codec}"`);
  } catch {
    return false;
  }
}

/**
 * ¿hls.js podrá reproducir este nivel? Comprueba vídeo y audio declarados en
 * el master playlist. Si el master no declara CODECS se asume que sí (el probe
 * del primer fragmento lo confirmará).
 * @param {{videoCodec?: string, audioCodec?: string}} level
 */
export function nivelSoportado(level) {
  if (!level) return false;
  const video = level.videoCodec || "";
  const audio = level.audioCodec || "";
  if (video && !codecSoportado(video, "video")) return false;
  if (audio && !codecSoportado(audio, "audio")) return false;
  return true;
}

/**
 * Índice del primer nivel (de mayor a menor calidad) que el navegador puede
 * decodificar. -1 si ninguno sirve => hay que transcodificar.
 * @param {Array<{videoCodec?: string, audioCodec?: string}>} levels
 */
export function primerNivelSoportado(levels) {
  if (!Array.isArray(levels) || levels.length === 0) return -1;
  for (let i = 0; i < levels.length; i++) {
    if (nivelSoportado(levels[i])) return i;
  }
  return -1;
}

/**
 * Traduce el detalle de error de hls.js a un mensaje entendible. Se usa en el
 * panel de administración y en el reproductor de TV.
 * @param {string} details
 */
export function describirErrorPlayer(details) {
  switch (String(details || "")) {
    case "bufferAddCodecError":
    case "bufferIncompatibleCodecsError":
      return "El canal usa un códec que el navegador no soporta (H.265/HEVC o audio AC-3). VLC lo abre porque incluye sus propios decodificadores.";
    case "manifestLoadError":
    case "manifestLoadTimeOut":
      return "El servidor del canal no entrega el m3u8 (caído, geobloqueado o cambió la URL).";
    case "manifestParsingError":
    case "manifestIncompatibleCodecsError":
      return "El m3u8 no es válido (¿el servidor devolvió una página HTML de error?).";
    case "fragLoadError":
    case "fragLoadTimeOut":
      return "No se pudo descargar un segmento .ts (servidor saturado o token vencido).";
    case "levelLoadError":
      return "No se pudo cargar la lista de calidades del canal.";
    case "keyLoadError":
      return "No se pudo cargar la llave de cifrado del stream.";
    case "fragParsingError":
      return "Los segmentos llegaron dañados o con un códec no soportado.";
    case "mediaError":
      return "El navegador rechazó el audio/vídeo de este canal.";
    default:
      return details ? `No se pudo reproducir el canal (${details}).` : "No se pudo reproducir el canal.";
  }
}

