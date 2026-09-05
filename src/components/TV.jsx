import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { channels as staticChannels } from "../data/channels";
import { resolveStreamUrl, needsProxy, transcoderUrl } from "../utils/stream";
import { fetchChannels, getStoredSession } from "../services/api";

function TV() {
  const [channels, setChannels] = useState(staticChannels);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [playerError, setPlayerError] = useState("");
  const [viaProxy, setViaProxy] = useState(false); // reintento automático
  const [viaTranscoder, setViaTranscoder] = useState(false); // fallback universal
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  // Carga los canales desde la BD (solo los ACTIVOS) y los combina con los
  // estaticos de channels.js. Los estaticos tienen prioridad: si un canal
  // existe en ambos, se usa EXACTAMENTE la URL de channels.js.
  useEffect(() => {
    let active = true;
    fetchChannels(getStoredSession())
      .then((data) => {
        if (active && data?.channels?.length) {
          const staticNames = new Set(
            staticChannels.map((c) => (c.name || "").trim().toLowerCase())
          );
          const deBD = data.channels.filter(
            (c) => !staticNames.has((c.name || "").trim().toLowerCase())
          );
          setChannels(
            [...staticChannels, ...deBD].sort((a, b) =>
              a.name.localeCompare(b.name)
            )
          );
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Limpia la instancia HLS anterior antes de crear una nueva
  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!currentChannel || !videoRef.current) return;
    if (currentChannel.type === "iframe") return;

    const video = videoRef.current;
    const rawUrl = (currentChannel?.stream || "").trim();
    const streamUrl = viaTranscoder
      ? transcoderUrl(rawUrl, currentChannel.referer)
      : resolveStreamUrl(currentChannel, viaProxy);
    const alreadyProxied = viaTranscoder || viaProxy || needsProxy(currentChannel);
    let hls;
    let cancelled = false;
    let mediaRecoveryAttempts = 0;
    let networkRecoveryAttempts = 0;

    setLoading(true);
    console.log("[TV] cargando:", streamUrl, alreadyProxied ? "(proxy)" : "(directo)");

    video.pause();
    video.removeAttribute("src");
    video.load();

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        // Reintentos más tolerantes: muchos servidores IPTV cortan segmentos
        manifestLoadingMaxRetry: 6,
        manifestLoadingMaxRetryTimeout: 10000,
        levelLoadingMaxRetry: 6,
        levelLoadingMaxRetryTimeout: 10000,
        fragLoadingMaxRetry: 8,
        fragLoadingMaxRetryTimeout: 10000,
        // Buffer más grande para estabilidad en streams inestables
        // Buffer más pequeño = menos bufferAppendError en móviles
        maxBufferLength: 20,
        maxMaxBufferLength: 40,
        maxBufferSize: 25 * 1000 * 1000,
        // Flush del buffer viejo: evita que se llene y dé appendError
        backBufferLength: 15,
        // Backoff exponencial para reintentos
        fragLoadingRetryDelay: 500,
        levelLoadingRetryDelay: 500,
        manifestLoadingRetryDelay: 500,
        // Tolerancia a saltos de buffer (evita congelamiento en ESPN)
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
        // Mas reintentos internos antes de declarar bufferAppendError fatal
        appendErrorMaxRetry: 6,
        // Ignora discontinuidades menores del servidor (muy comunes en IPTV)
        nudgeMaxRetry: 10,
        // Ajuste de ancho de banda: empezar con nivel más bajo para carga rápida
        startLevel: -1, // auto: hls.js elige el mejor nivel inicial
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setPlayerError("");
        setLoading(false);
        video.play().catch((err) => {
          console.log("Autoplay bloqueado:", err);
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.log("HLS ERROR:", data.type, data.details, "fatal:", data.fatal, data);

        if (!data.fatal) return; // los no fatales los recupera hls.js solo

        // 1) Si aún no pasamos por el proxy y falla la red (CORS / mixed content /
        //    bloqueo del servidor) -> reintentar automáticamente vía proxy.
        const isNetworkError = data.type === Hls.ErrorTypes.NETWORK_ERROR;
        if (isNetworkError && !alreadyProxied && networkRecoveryAttempts < 1) {
          networkRecoveryAttempts++;
          setPlayerError("Bloqueado por el servidor (CORS). Reintentando vía proxy...");
          destroyHls();
          if (!cancelled) setViaProxy(true);
          return;
        }

        // 1b) Fallo incluso via proxy (o ya estabamos proxied) ->
        //     activar el transcodificador universal (H.264/AAC)
        if (isNetworkError && alreadyProxied && !viaTranscoder) {
          setPlayerError("Activando transcodificador compatible...");
          destroyHls();
          if (!cancelled) setViaTranscoder(true);
          return;
        }

        // 2) Errores de media: intentar recuperar antes de rendirse
        //    ESPN 1/3/4 tienen problemas de codificación intermitentes.
        //    BUFFER_APPEND_ERROR (buffer corrupto) también es MEDIA_ERROR.
        //    Estrategia: recoverMediaError -> swapAudioCodec -> recoverMediaError -> reload
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveryAttempts < 6) {
          mediaRecoveryAttempts++;
          // Si el buffer sigue rompiendose tras varios intentos, escalar
          // al transcodificador (repara codecs y timeline de raiz).
          if (mediaRecoveryAttempts >= 4 && !viaTranscoder) {
            setPlayerError("Activando transcodificador compatible...");
            destroyHls();
            if (!cancelled) setViaTranscoder(true);
            return;
          }
          const isBufferError = data.details === Hls.ErrorDetails.BUFFER_APPEND_ERROR;
          const prefix = isBufferError ? "Buffer corrupto" : "Problema de codificación";
          const msgs = [
            `${prefix}, recuperando (intento 1)...`,
            `Reiniciando decodificador (intento 2)...`,
            `${prefix}, recuperando (intento 3)...`,
            `Reiniciando decodificador (intento 4)...`,
            `${prefix}, recuperando (intento 5)...`,
            `Reiniciando (intento 6)...`,
          ];
          setPlayerError(msgs[mediaRecoveryAttempts - 1]);
          try {
            if (isBufferError) {
              // bufferAppendError casi siempre es un gap/overlap en el
              // timeline: saltar al final de lo que ya esta bufferizado
              // desbloquea el append sin recargar el stream.
              const b = video.buffered;
              if (b.length > 0) {
                const end = b.end(b.length - 1);
                if (end - video.currentTime > 0.2) {
                  video.currentTime = end - 0.25;
                }
              }
            }
            if (mediaRecoveryAttempts % 2 === 0) {
              // Intentos pares: intercambiar codec de audio (común en ESPN)
              const tracks = hls.audioTracks;
              if (tracks && tracks.length > 1) {
                hls.audioTrack = (hls.audioTrack + 1) % tracks.length;
              }
            }
            hls.recoverMediaError();
            return;
          } catch {
            /* cae al siguiente intento o reinicio */
          }
          // Si falló recoverMediaError, intentar startLoad
          if (mediaRecoveryAttempts >= 5) {
            // Reinicio completo del reproductor para el MISMO canal
            setPlayerError("Reiniciando el canal...");
            destroyHls();
            if (!cancelled) setReloadEpoch((e) => e + 1);
          }
          return;
        }

        // 3) Mensajes específicos
        if (data.details === Hls.ErrorDetails.BUFFER_INCOMPATIBLE_CODECS_ERROR) {
          setPlayerError(
            "Este canal usa un códec que tu navegador no soporta (ej. HEVC/H.265). Prueba en otro navegador o dispositivo."
          );
        } else if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR) {
          setPlayerError(
            alreadyProxied
              ? "El servidor del canal no responde el m3u8 (caído, geobloqueado o cambió la URL)."
              : "No se pudo cargar el m3u8."
          );
        } else if (data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR) {
          setPlayerError("El m3u8 no es válido (¿el servidor devolvió HTML de error?).");
        } else if (data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR) {
          setPlayerError("No se pudo cargar un segmento .ts. El servidor puede estar saturado.");
        } else if (data.details === Hls.ErrorDetails.KEY_LOAD_ERROR) {
          setPlayerError("No se pudo cargar la llave del stream.");
        } else {
          setPlayerError(`Error fatal al reproducir el canal (${data.details}).`);
        }

        setLoading(false);
        destroyHls();
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari / iOS: HLS nativo (no aplica CORS del mismo modo)
      video.src = streamUrl;
      video.play().catch(console.error);
      setLoading(false);
    } else {
      setPlayerError("Tu navegador no soporta HLS.");
      setLoading(false);
    }

    return () => {
      cancelled = true;
      destroyHls();
    };
  }, [currentChannel, viaProxy, viaTranscoder, destroyHls]);

  // Determinar el sandbox para iframes: bloquear popups pero permitir autoplay
  const getIframeSandbox = (channel) => {
    if (channel.ads) {
      // Canales con anuncios: bloquear popups, navegación, etc.
      // Pero permitir scripts y autoplay para que el reproductor funcione
      return "allow-scripts allow-same-origin allow-presentation";
    }
    // Canales sin anuncios: permitir más cosas pero seguir bloqueando popups
    return "allow-scripts allow-same-origin allow-presentation allow-popups";
  };

  return (
    <section className="tv-page">
      <div className="tv-layout">
        {currentChannel && (
          <div className="tv-player-box">
            <div className="tv-title">
              Reproduciendo: <span>{currentChannel.name}</span>
              {loading && <span className="loading-indicator"> ⏳ Cargando...</span>}
            </div>

            <div className="tv-player">
              {currentChannel.type === "iframe" ? (
                <iframe
                  src={currentChannel.stream}
                  width="100%"
                  height="500"
                  allowFullScreen
                  allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                  sandbox={getIframeSandbox(currentChannel)}
                  referrerPolicy="no-referrer"
                  frameBorder="0"
                  title={currentChannel.name}
                />
              ) : (
                <video
                  ref={videoRef}
                  controls
                  autoPlay
                  playsInline
                  style={{ width: "100%", height: "100%" }}
                />
              )}
            </div>

            {playerError && (
              <p style={{ color: "red", marginTop: "10px" }}>{playerError}</p>
            )}
          </div>
        )}

        <div className="channels-box">
          <h2>Canales disponibles</h2>

          <div className="channel-list">
            {channels.map((channel) => (
              <button
                key={channel.id}
                className={`channel-card ${
                  currentChannel?.id === channel.id ? "selected" : ""
                }`}
                onClick={() => {
                  setPlayerError("");
                  setLoading(true);
                  setViaProxy(needsProxy(channel));
                  setViaTranscoder(false);
                  setCurrentChannel(channel);
                }}
              >
                <span>{channel.name}</span>

                <div>
                  <b className="active">● {channel.status}</b>
                  <b className="ads">
                    {channel.ads ? "CON ANUNCIOS" : "SIN ANUNCIOS"}
                  </b>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default TV;