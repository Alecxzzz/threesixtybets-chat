/**
 * Plugin de Vite: proxy de HLS (m3u8 + segmentos .ts/.aac/.key)
 *
 * ¿Por qué es necesario?
 * - Cuando abres el .m3u8 directamente en el navegador, éste usa su reproductor
 *   nativo y NO aplica CORS (es una navegación, no una petición de JS).
 * - hls.js descarga el manifiesto y los segmentos con fetch/XHR, así que el
 *   servidor DEBE responder con "Access-Control-Allow-Origin". Casi ningún
 *   servidor IPTV lo hace => hls.js lanza manifestLoadError (fatal).
 * - Además, si tu web está en https:// no puedes cargar un stream http://
 *   (mixed content: el navegador lo bloquea).
 *
 * Este proxy resuelve ambos problemas: el navegador habla con tu propio origen
 * (mismo protocolo, con CORS abierto) y Node es quien va a buscar el stream.
 *
 * Uso:  /hls-proxy?url=<url absoluta encodeURIComponent>[&referer=<url>]
 */

import { Readable } from "node:stream";

export const PROXY_PATH = "/hls-proxy";

/**
 * Caché temporal de segmentos .ts para streams con tokens efímeros.
 * Cuando el proxy resuelve una media playlist, descarga los segmentos
 * inmediatamente y los guarda aquí. Cuando hls.js los pide, se sirven
 * desde el caché en lugar de ir al servidor (donde el token ya expiró).
 * Los segmentos expiran del caché después de 30 segundos.
 */
const segmentCache = new Map(); // key: tsUrl -> { buffer, timestamp, contentType }
const SEGMENT_CACHE_TTL = 30000; // 30 segundos

function cleanSegmentCache() {
  const now = Date.now();
  for (const [key, entry] of segmentCache) {
    if (now - entry.timestamp > SEGMENT_CACHE_TTL) {
      segmentCache.delete(key);
    }
  }
}

/**
 * Extrae todas las URLs de segmentos de una media playlist y las descarga
 * inmediatamente, guardándolas en el caché. Esto es necesario porque algunos
 * servidores IPTV (como Astra) generan tokens efímeros que expiran en segundos.
 */
async function preloadSegments(manifestText, baseUrl, headers, signal) {
  const lines = manifestText.split("\n");
  const tsUrls = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    try {
      const absUrl = new URL(trimmed, baseUrl).href;
      if (absUrl.endsWith(".ts") || absUrl.endsWith(".aac") || absUrl.endsWith(".m4s")) {
        tsUrls.push(absUrl);
      }
    } catch {
      /* URL inválida, ignorar */
    }
  }

  // Descargar todos los segmentos en paralelo
  const promises = tsUrls.map(async (url) => {
    if (segmentCache.has(url)) return; // ya está en caché
    try {
      const resp = await fetch(url, {
        headers,
        redirect: "follow",
        signal,
      });
      if (resp.ok) {
        const buffer = Buffer.from(await resp.arrayBuffer());
        const contentType = resp.headers.get("content-type") || "video/mp2t";
        segmentCache.set(url, { buffer, timestamp: Date.now(), contentType });
      }
    } catch {
      /* Si falla, hls.js intentará descargarlo directamente */
    }
  });

  await Promise.all(promises);
  cleanSegmentCache();
}

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "content-encoding",
  "content-length",
]);

function buildProxyUrl(absoluteUrl, referer) {
  let out = `${PROXY_PATH}?url=${encodeURIComponent(absoluteUrl)}`;
  if (referer) out += `&referer=${encodeURIComponent(referer)}`;
  return out;
}

function isManifest(url, contentType = "") {
  const clean = url.split("?")[0].toLowerCase();
  return (
    clean.endsWith(".m3u8") ||
    clean.endsWith(".m3u") ||
    contentType.includes("mpegurl") ||
    contentType.includes("vnd.apple.mpegurl")
  );
}

/**
 * Reescribe todas las URLs internas del manifiesto para que también pasen
 * por el proxy (si no, hls.js pediría los .ts directo al servidor y volvería
 * a fallar por CORS / mixed content).
 */
function rewriteManifest(text, baseUrl, referer) {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith("#")) {
        // #EXT-X-KEY:URI="...", #EXT-X-MAP:URI="...", #EXT-X-MEDIA:...URI="..."
        return line.replace(/URI="([^"]+)"/g, (_m, uri) => {
          try {
            return `URI="${buildProxyUrl(new URL(uri, baseUrl).href, referer)}"`;
          } catch {
            return _m;
          }
        });
      }

      try {
        return buildProxyUrl(new URL(trimmed, baseUrl).href, referer);
      } catch {
        return line;
      }
    })
    .join("\n");
}

/**
 * Detecta si un manifiesto es un master playlist (contiene #EXT-X-STREAM-INF).
 * Los master playlists apuntan a sub-playlists; los media playlists contienen
 * segmentos .ts directamente.
 */
function isMasterPlaylist(text) {
  return text.includes("#EXT-X-STREAM-INF");
}

/**
 * Extrae la URL de la primera variante de un master playlist.
 * Devuelve null si no hay variantes.
 */
function extractFirstVariantUrl(text, baseUrl) {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("#EXT-X-STREAM-INF")) {
      // La siguiente línea no vacía y sin # es la URL de la variante
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j].trim();
        if (next && !next.startsWith("#")) {
          try {
            return new URL(next, baseUrl).href;
          } catch {
            return null;
          }
        }
      }
    }
  }
  return null;
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Expose-Headers", "*");
}

async function handleRequest(req, res) {
  const parsed = new URL(req.url, "http://internal");
  const target = parsed.searchParams.get("url");
  const referer = parsed.searchParams.get("referer") || "";

  setCors(res);

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  if (!target || !/^https?:\/\//i.test(target)) {
    res.statusCode = 400;
    return res.end("Parametro ?url= invalido o ausente");
  }

  const headers = {
    "User-Agent":
      req.headers["user-agent"] ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    Accept: "*/*",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
  };

  // Algunos servidores exigen Referer/Origin del sitio original
  if (referer) {
    headers.Referer = referer;
    try {
      headers.Origin = new URL(referer).origin;
    } catch {
      /* referer no valido, se ignora */
    }
  }

  // Necesario para que el <video> pueda hacer seek en segmentos
  if (req.headers.range) headers.Range = req.headers.range;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  req.on("close", () => controller.abort());

  try {
    // --- Segmentos .ts: servir desde caché si existe ---
    cleanSegmentCache();
    if (segmentCache.has(target)) {
      const cached = segmentCache.get(target);
      res.setHeader("Content-Type", cached.contentType || "video/mp2t");
      res.setHeader("Cache-Control", "no-store");
      setCors(res);
      return res.end(cached.buffer);
    }

    const upstream = await fetch(target, {
      method: req.method === "HEAD" ? "HEAD" : "GET",
      headers,
      redirect: "follow",
      signal: controller.signal,
    });

    const contentType = upstream.headers.get("content-type") || "";
    // upstream.url refleja la URL final tras redirecciones => base correcta
    const finalUrl = upstream.url || target;

    res.statusCode = upstream.status;

    if (!upstream.ok) {
      const body = await upstream.text().catch(() => "");
      console.warn(`[hls-proxy] ${upstream.status} ${target}`);
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      return res.end(body.slice(0, 500) || `Upstream ${upstream.status}`);
    }

    if (isManifest(finalUrl, contentType)) {
      const text = await upstream.text();

      // Si es un master playlist, resolver la sub-playlist inmediatamente.
      // Algunos servidores IPTV (como Astra) generan tokens de sesión efímeros
      // en la URL de la sub-playlist que expiran en segundos. Si hls.js la pide
      // después, el token ya no es válido (404). Resolviéndola aquí garantizamos
      // que se pide en el mismo instante.
      if (isMasterPlaylist(text)) {
        const variantUrl = extractFirstVariantUrl(text, finalUrl);
        if (variantUrl) {
          const subRes = await fetch(variantUrl, {
            headers,
            redirect: "follow",
            signal: controller.signal,
          });
          if (subRes.ok) {
            const subText = await subRes.text();
            const subFinalUrl = subRes.url || variantUrl;

            // Precargar segmentos inmediatamente (tokens efímeros)
            await preloadSegments(subText, subFinalUrl, headers, controller.signal);

            const rewritten = rewriteManifest(subText, subFinalUrl, referer);
            res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
            res.setHeader("Cache-Control", "no-store");
            return res.end(rewritten);
          }
          // Si la sub-playlist falla, caer al comportamiento normal
          console.warn(`[hls-proxy] sub-playlist ${subRes.status} ${variantUrl}`);
        }
      }

      // Si es media playlist, precargar segmentos antes de servir
      if (!isMasterPlaylist(text)) {
        await preloadSegments(text, finalUrl, headers, controller.signal);
      }

      const rewritten = rewriteManifest(text, finalUrl, referer);
      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      res.setHeader("Cache-Control", "no-store");
      return res.end(rewritten);
    }

    // Segmentos / llaves: se hace passthrough en streaming
    upstream.headers.forEach((value, key) => {
      if (!HOP_BY_HOP.has(key.toLowerCase())) res.setHeader(key, value);
    });
    if (!upstream.headers.get("content-type")) {
      res.setHeader("Content-Type", "video/mp2t");
    }
    setCors(res);

    if (!upstream.body || req.method === "HEAD") return res.end();

    Readable.fromWeb(upstream.body)
      .on("error", () => res.destroy())
      .pipe(res);
  } catch (err) {
    if (controller.signal.aborted && res.writableEnded) return;
    console.error("[hls-proxy] error:", err?.message || err);
    if (!res.headersSent) res.statusCode = 502;
    res.end("Error en el proxy: " + (err?.message || "desconocido"));
  } finally {
    clearTimeout(timeout);
  }
}

function middleware(req, res, next) {
  if (!req.url || !req.url.startsWith(PROXY_PATH)) return next();
  handleRequest(req, res);
}

export default function hlsProxy() {
  return {
    name: "hls-proxy",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}