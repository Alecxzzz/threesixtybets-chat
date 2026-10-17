import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { resolveStreamUrl, needsProxy, transcoderUrl, channelSources, channelSourcesDetailed } from "../utils/stream";

export default function StreamSlot({ channel, slotId = "1", muted: initialMuted = true }) {
  const [loading, setLoading] = useState(false);
  const [playerError, setPlayerError] = useState("");
  const [viaProxy, setViaProxy] = useState(false);
  const [viaTranscoder, setViaTranscoder] = useState(false);
  const [srcIdx, setSrcIdx] = useState(0);
  const [reloadEpoch, setReloadEpoch] = useState(0);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [isPip, setIsPip] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const playerBoxRef = useRef(null);
  const reloadAttemptsRef = useRef(3);

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!channel) {
      destroyHls();
      setLoading(false);
      setPlayerError("");
      return;
    }

    let cancelled = false;
    const video = videoRef.current;
    if (!video) return;

    let streamUrl;
    if (viaTranscoder) {
      streamUrl = transcoderUrl(channel.stream, channel.referer);
    } else {
      streamUrl = resolveStreamUrl(channel, viaProxy);
    }

    destroyHls();
    setLoading(true);
    setPlayerError("");

    if (channel.type === "iframe") {
      setLoading(false);
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      let networkRecoveryAttempts = 0;
      let mediaRecoveryAttempts = 0;
      const alreadyProxied = viaProxy;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!cancelled) {
          setLoading(false);
          video.play().catch((err) => {
            console.log("[SV-" + slotId + "] Autoplay bloqueado:", err);
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.log("[SV-" + slotId + "] HLS ERROR:", data.type, data.details, "fatal:", data.fatal, data);
        if (!data.fatal) return;

        const isNetworkError = data.type === Hls.ErrorTypes.NETWORK_ERROR;

        if (isNetworkError && !alreadyProxied && networkRecoveryAttempts < 1) {
          networkRecoveryAttempts++;
          setPlayerError("Bloqueado por el servidor (CORS). Reintentando vía proxy... [" + data.details + "]");
          destroyHls();
          if (!cancelled) setViaProxy(true);
          return;
        }
        if (isNetworkError && alreadyProxied && !viaTranscoder) {
          setPlayerError("Activando transcodificador compatible...");
          destroyHls();
          if (!cancelled) setViaTranscoder(true);
          return;
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveryAttempts < 6) {
          mediaRecoveryAttempts++;
          if (mediaRecoveryAttempts >= 4 && !viaTranscoder) {
            setPlayerError("Activando transcodificador compatible...");
            destroyHls();
            if (!cancelled) setViaTranscoder(true);
            return;
          }
          const isBufferError = data.details === Hls.ErrorDetails.BUFFER_APPEND_ERROR;
          const msgs = [
            "Problema técnico.",
            "Problema técnico.",
            "Problema técnico.",
            "Problema técnico.",
            "Problema técnico.",
            "Problema técnico."
          ];
          setPlayerError(msgs[mediaRecoveryAttempts - 1]);
          try {
            if (isBufferError) {
              const b = video.buffered;
              if (b.length > 0) {
                const end = b.end(b.length - 1);
                if (end - video.currentTime > 0.2) {
                  video.currentTime = end - 0.25;
                }
              }
            }
            if (mediaRecoveryAttempts % 2 === 0) {
              const tracks = hls.audioTracks;
              if (tracks && tracks.length > 1) {
                hls.audioTrack = (hls.audioTrack + 1) % tracks.length;
              }
            }
            hls.recoverMediaError();
            return;
          } catch { /* cae al siguiente intento o reinicio */ }
        }

        if (reloadAttemptsRef.current < 5) {
          reloadAttemptsRef.current++;
          const espera = Math.min(2000 * reloadAttemptsRef.current, 8000);
          setPlayerError("Conexión perdida. (" + data.details + ")");
          setTimeout(() => {
            if (!cancelled) {
              destroyHls();
              setReloadEpoch((e) => e + 1);
            }
          }, espera);
          return;
        }

        const totalFuentes = channelSources(channel).length;
        if (srcIdx < totalFuentes - 1) {
          setPlayerError("Fuente " + (srcIdx + 1) + " agotada. Probando fuente alternativa " + (srcIdx + 2) + " de " + totalFuentes + "...");
          destroyHls();
          if (!cancelled) {
            reloadAttemptsRef.current = 0;
            setViaProxy(false);
            setViaTranscoder(false);
            setSrcIdx((i) => i + 1);
          }
          return;
        }

        if (data.details === Hls.ErrorDetails.BUFFER_INCOMPATIBLE_CODECS_ERROR) {
          setPlayerError("Este canal usa un códec que tu navegador no soporta (ej. HEVC/H.265). Prueba en otro navegador o dispositivo.");
        } else if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR) {
          setPlayerError(alreadyProxied ? "El servidor del canal no responde el m3u8 (caído, geobloqueado o cambió la URL)." : "No se pudo cargar el m3u8.");
        } else if (data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR) {
          setPlayerError("El m3u8 no es válido (¿el servidor devolvió HTML de error?).");
        } else if (data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR) {
          setPlayerError("No se pudo cargar un segmento .ts. El servidor puede estar saturado.");
        } else if (data.details === Hls.ErrorDetails.KEY_LOAD_ERROR) {
          setPlayerError("No se pudo cargar la llave del stream.");
        } else {
          setPlayerError("Error fatal al reproducir el canal (" + data.details + ").");
        }

        setLoading(false);
        destroyHls();
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      video.play().catch(console.error);
      setLoading(false);
    } else {
      setPlayerError("Tu navegador no soporta HLS.");
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [channel, slotId, reloadEpoch, viaProxy, viaTranscoder, srcIdx]);

  useEffect(() => {
    if (!channel) return;
    const video = videoRef.current;
    if (!video) return;
    let lastTime = video.currentTime;
    let staleCount = 0;
    const id = setInterval(() => {
      if (!video.paused && !video.ended) {
        const now = video.currentTime;
        if (now === lastTime) {
          staleCount++;
          if (staleCount >= 3) {
            staleCount = 0;
            console.log("[SV-" + slotId + "] Watchdog: stream congelado, reconectando...");
            setPlayerError("El stream se congeló.");
            setReloadEpoch((e) => e + 1);
            return;
          }
        } else {
          staleCount = 0;
        }
        lastTime = now;
      }
    }, 5000);
    return () => clearInterval(id);
  }, [channel, slotId, reloadEpoch]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted, channel]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    const onPipChange = () => setIsPip(Boolean(document.pictureInPictureElement));
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("enterpictureinpicture", onPipChange);
    document.addEventListener("leavepictureinpicture", onPipChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("enterpictureinpicture", onPipChange);
      document.removeEventListener("leavepictureinpicture", onPipChange);
    };
  }, []);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
    if (!video.muted) video.play().catch(() => {});
  };

  const togglePip = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (video.requestPictureInPicture) {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.log("PiP no disponible:", err);
    }
  };

  const toggleFullscreen = async () => {
    const box = playerBoxRef.current;
    if (!box) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (box.requestFullscreen) {
        await box.requestFullscreen();
      }
    } catch (err) {
      console.log("Fullscreen no disponible:", err);
    }
  };

  const reloadChannel = () => {
    setPlayerError("");
    setLoading(true);
    reloadAttemptsRef.current = 0;
    setViaProxy(needsProxy(channel));
    setViaTranscoder(false);
    setSrcIdx(0);
    setReloadEpoch((e) => e + 1);
  };

  const getIframeSandbox = (ch) => {
    if (ch.ads) {
      return "allow-scripts allow-same-origin allow-presentation";
    }
    return "allow-scripts allow-same-origin allow-presentation allow-popups";
  };

  const sources = channel ? channelSourcesDetailed(channel) : [];

  return (
    <div className="tv-player-box">
      {channel ? (
        <>
          <div className="tv-title">
            Stream {slotId}: <span>{channel.name}</span>
            {loading && <span className="loading-indicator"> ⏳ Cargando...</span>}
          </div>

          <div className="tv-player">
            {channel.type === "iframe" ? (
              <iframe
                src={channel.stream}
                width="100%"
                height="500"
                allowFullScreen
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                sandbox={getIframeSandbox(channel)}
                referrerPolicy="no-referrer"
                frameBorder="0"
                title={channel.name}
              />
            ) : (
              <div className={"tv-player-shell " + (isFullscreen ? "is-fullscreen" : "")} ref={playerBoxRef}>
                <video ref={videoRef} autoPlay playsInline muted={isMuted} style={{ width: "100%", height: "100%" }} />
                {loading && (
                  <div className="tv-loading-overlay" aria-live="polite">
                    <div className="tv-spinner" />
                    <span className="tv-loading-text">Cargando…</span>
                  </div>
                )}
                <div className="tv-controls-bar">
                  <div className="tv-controls-left">
                    <button
                      type="button"
                      className="tv-ctrl-btn"
                      onClick={toggleMute}
                      aria-label={isMuted ? "Activar sonido" : "Silenciar"}
                      title={isMuted ? "Activar sonido" : "Silenciar"}
                    >
                      {isMuted ? (
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4 9.91 6.09 12 8.18V4z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05A4.47 4.47 0 0 0 16.5 12zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                        </svg>
                      )}
                    </button>
                    <span className="tv-live-badge">LIVE</span>
                  </div>
                  <div className="tv-controls-right">
                    <button type="button" className="tv-ctrl-btn" onClick={togglePip} aria-label="Picture in Picture" title="Picture in Picture">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z" />
                      </svg>
                    </button>
                    <button type="button" className="tv-ctrl-btn" onClick={toggleFullscreen} aria-label="Pantalla completa" title="Pantalla completa">
                      {isFullscreen ? (
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                          <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {playerError && (
            <div className="tv-error-row">
              <p className="tv-error-text">{playerError}</p>
              <button type="button" className="tv-reload-btn" onClick={reloadChannel} title="Recargar el canal">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 8 8h-2a6 6 0 1 1-6-6c1.66 0 3.14 .69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                </svg>
                Recargar canal
              </button>
            </div>
          )}

          {sources.length > 1 && (
            <div className="tv-sources">
              <h3>Opciones del canal</h3>
              <p className="tv-sources-hint">
                Si una fuente no carga, toca otra. Se prueba sola si falla.
              </p>
              <div className="tv-sources-list">
                {sources.map((src, i) => (
                  <button
                    key={channel.id || channel.name + "-src-" + i}
                    type="button"
                    className={"tv-source-btn " + (srcIdx === i ? "active" : "")}
                    onClick={() => {
                      if (i === srcIdx) return;
                      setPlayerError("");
                      setLoading(true);
                      setViaProxy(false);
                      setViaTranscoder(false);
                      setSrcIdx(i);
                    }}
                  >
                    Opción {i + 1}
                    {src.label && <span className="tv-source-label"> {src.label}</span>}
                    {srcIdx === i && <span className="tv-source-live">● En uso</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="tv-empty-slot">
          <p>Sin canal asignado. Selecciona un canal de la lista.</p>
        </div>
      )}
    </div>
  );
}