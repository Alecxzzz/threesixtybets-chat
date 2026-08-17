import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { channels } from "../data/channels";

function TV() {
  const [currentChannel, setCurrentChannel] = useState(null);
  const [playerError, setPlayerError] = useState("");
  const videoRef = useRef(null);

  useEffect(() => {
    if (!currentChannel || !videoRef.current) return;
    if (currentChannel.type === "iframe") return;

    const video = videoRef.current;
    const streamUrl = currentChannel.stream;
    let hls;

    video.pause();
    video.removeAttribute("src");
    video.load();

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        debug: true,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch((err) => {
          console.log("Autoplay bloqueado:", err);
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.log("HLS ERROR:", data);

        if (data.details === "manifestLoadError") {
          setPlayerError("No se pudo cargar el m3u8.");
        }

        if (data.details === "fragLoadError") {
          setPlayerError("No se pudo cargar un segmento .ts.");
        }

        if (data.details === "keyLoadError") {
          setPlayerError("No se pudo cargar la llave del stream.");
        }

        if (data.fatal) {
          setPlayerError("Error fatal al reproducir el canal.");
          hls.destroy();
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      video.play().catch(console.error);
    } else {
      setPlayerError("Tu navegador no soporta HLS.");
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [currentChannel]);

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
              <p style={{ color: "red", marginTop: "10px" }}>
                {playerError}
              </p>
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
