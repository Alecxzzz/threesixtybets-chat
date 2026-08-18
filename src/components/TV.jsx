import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { channels } from "../data/channels";
import { resolveStreamUrl, needsProxy } from "../utils/stream";

function TV() {
  const [currentChannel, setCurrentChannel] = useState(null);
  const [playerError, setPlayerError] = useState("");
  const [viaProxy, setViaProxy] = useState(false); // reintento automático
  const videoRef = useRef(null);

  useEffect(() => {
    if (!currentChannel || !videoRef.current) return;
    if (currentChannel.type === "iframe") return;

    const video = videoRef.current;
    const streamUrl = resolveStreamUrl(currentChannel, viaProxy);
    const alreadyProxied = viaProxy || needsProxy(currentChannel);
    let hls;
    let cancelled = false;

    console.log("[TV] cargando:", streamUrl, alreadyProxied ? "(proxy)" : "(directo)");

    video.pause();
    video.removeAttribute("src");
    video.load();

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        // reintentos más tolerantes: muchos servidores IPTV cortan segmentos
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
        fragLoadingMaxRetry: 6,
        fragLoadingMaxRetryTimeout: 8000,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setPlayerError("");
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
        if (isNetworkError && !alreadyProxied) {
          setPlayerError("Bloqueado por el servidor (CORS). Reintentando vía proxy...");
          hls.destroy();
          if (!cancelled) setViaProxy(true);
          return;
        }

        // 2) Errores de media: intentar recuperar antes de rendirse
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          setPlayerError("Problema de decodificación, recuperando...");
          try {
            hls.recoverMediaError();
            return;
          } catch {
            /* cae al mensaje final */
          }
        }

        // 3) Mensajes específicos
        if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR) {
          setPlayerError(
            alreadyProxied
              ? "El servidor del canal no responde el m3u8 (caído, geobloqueado o cambió la URL)."
              : "No se pudo cargar el m3u8."
          );
        } else if (data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR) {
          setPlayerError("El m3u8 no es válido (¿el servidor devolvió HTML de error?).");
        } else if (data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR) {
          setPlayerError("No se pudo cargar un segmento .ts.");
        } else if (data.details === Hls.ErrorDetails.KEY_LOAD_ERROR) {
          setPlayerError("No se pudo cargar la llave del stream.");
        } else {
          setPlayerError(`Error fatal al reproducir el canal (${data.details}).`);
        }

        hls.destroy();
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari / iOS: HLS nativo (no aplica CORS del mismo modo)
      video.src = streamUrl;
      video.play().catch(console.error);
    } else {
      setPlayerError("Tu navegador no soporta HLS.");
    }

    return () => {
      cancelled = true;
      if (hls) hls.destroy();
    };
  }, [currentChannel, viaProxy]);

  return (
    <section className="tv-page">
      <div className="tv-layout">
        {currentChannel && (
          <div className="tv-player-box">
            <div className="tv-title">
              Reproduciendo: <span>{currentChannel.name}</span>
            </div>

            <div className="tv-player">
              {currentChannel.type === "iframe" ? (
                <iframe
                  src={currentChannel.stream}
                  width="100%"
                  height="500"
                  allowFullScreen
                  allow="autoplay; fullscreen"
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
                  setViaProxy(needsProxy(channel));
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
