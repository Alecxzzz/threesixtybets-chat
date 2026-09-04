import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  adminListChannels,
  adminCreateChannel,
  adminUpdateChannel,
  adminDeleteChannel,
  adminChannelTest,
} from "../services/api";
import { resolveStreamUrl, needsProxy } from "../utils/stream";

const sectionH3 = {
  color: "#e6edf3",
  margin: "0 0 12px",
  paddingBottom: 8,
  borderBottom: "1px solid #232a33",
  fontSize: 18,
};

function AdminChannels({ session }) {
  const [channels, setChannels] = useState([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", stream: "", type: "m3u8", ads: false, useProxy: false });
  const [preview, setPreview] = useState(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [tests, setTests] = useState({});

  async function loadChannels() {
    try {
      const data = await adminListChannels(session);
      setChannels(data.channels || []);
    } catch (err) {
      setError(err.message || "No se pudieron cargar los canales.");
    }
  }

  useEffect(() => {
    loadChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  function destroyHls() {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }

  useEffect(() => {
    if (!preview?.channel || preview.channel.type !== "m3u8" || !videoRef.current) return;
    const video = videoRef.current;
    destroyHls();
    const channel = preview.channel;
    const viaProxy = preview.forceProxy === true;
    const alreadyProxied = viaProxy || needsProxy(channel);
    const streamUrl = resolveStreamUrl(channel, viaProxy);
    if (!Hls.isSupported()) {
      video.src = streamUrl;
      return;
    }
    const hls = new Hls({ manifestLoadingMaxRetry: 2, fragLoadingMaxRetry: 3 });
    hlsRef.current = hls;
    hls.loadSource(streamUrl);
    hls.attachMedia(video);
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {});
      setPreview((p) => (p ? { ...p, playing: true, playerError: "" } : p));
    });
    hls.on(Hls.Events.ERROR, (event, data) => {
      if (!data.fatal) return;
      // Reintento automatico via proxy si fallo la red (CORS / mixed content)
      const isNetwork = data.type === Hls.ErrorTypes.NETWORK_ERROR;
      if (isNetwork && !alreadyProxied) {
        console.log("[Preview] fallo de red, reintentando via proxy:", data.details);
        setPreview((p) => (p ? { ...p, forceProxy: true, playerError: "" } : p));
        return;
      }
      setPreview((p) => (p ? { ...p, playing: false, playerError: data.details } : p));
    });
    return () => destroyHls();
  }, [preview?.channel, preview?.forceProxy]);

  async function handlePreview(e) {
    e.preventDefault();
    const stream = form.stream.trim();
    if (!stream.startsWith("http")) {
      setError("Ingresa una URL valida (http/https).");
      return;
    }
    setError("");
    setSaved("");
    setPreview({ loading: true, channel: null, result: null });
    const channel = {
      name: form.name.trim() || "Vista previa",
      stream,
      type: form.type,
      ads: form.ads,
      useProxy: form.useProxy,
    };
    try {
      const result = await adminChannelTest(session, stream);
      setPreview({ loading: false, channel, result });
    } catch (err) {
      setPreview({ loading: false, channel, result: { ok: false, error: err.message } });
    }
  }

  async function handleAdd() {
    setSaving(true);
    setError("");
    setSaved("");
    try {
      await adminCreateChannel(session, {
        name: form.name.trim(),
        stream: form.stream.trim(),
        type: form.type,
        ads: form.ads,
        useProxy: form.useProxy,
      });
      setSaved(`Canal "${form.name.trim()}" agregado y ACTIVO.`);
      setForm({ name: "", stream: "", type: "m3u8", ads: false, useProxy: false });
      setPreview(null);
      await loadChannels();
    } catch (err) {
      setError(err.message || "No se pudo agregar el canal.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleChannel(ch) {
    const nuevo = ch.status === "ACTIVO" ? "CAIDO" : "ACTIVO";
    try {
      await adminUpdateChannel(session, ch.id, { status: nuevo });
      await loadChannels();
    } catch (err) {
      setError(err.message || "No se pudo cambiar el estado del canal.");
    }
  }

  async function deleteChannel(ch) {
    if (!window.confirm(`¿Borrar el canal "${ch.name}"?`)) return;
    try {
      await adminDeleteChannel(session, ch.id);
      await loadChannels();
    } catch (err) {
      setError(err.message || "No se pudo borrar el canal.");
    }
  }

  async function testChannel(ch) {
    setTests((prev) => ({ ...prev, [ch.id]: { loading: true } }));
    try {
      const res = await adminChannelTest(session, ch.stream);
      setTests((prev) => ({ ...prev, [ch.id]: res }));
    } catch (err) {
      setTests((prev) => ({ ...prev, [ch.id]: { ok: false, error: err.message } }));
    }
  }

  const styles = {
    label: { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: "#8b95a1" },
    input: { background: "#0d1117", border: "1px solid #232a33", borderRadius: 8, color: "#e6edf3", padding: "8px 10px", fontSize: 13 },
    row: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 },
    check: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#8b95a1" },
    btn: { background: "#202633", color: "#e6edf3", border: "1px solid #303847", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontWeight: 700 },
    card: { background: "#11161d", border: "1px solid #232a33", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 },
    previewBox: { background: "#0d1117", border: "1px solid #232a33", borderRadius: 10, padding: 12, marginBottom: 14 },
  };

  const p = preview;

  return (
    <div>
      <h3 style={{ ...sectionH3, marginTop: 28 }}>📺 Agregar / gestionar canales</h3>

      <form onSubmit={handlePreview}>
        <div style={styles.row}>
          <label style={{ ...styles.label, flex: "1 1 200px" }}>
            Nombre del canal
            <input
              style={styles.input}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej: ESPN 2"
              required
            />
          </label>
          <label style={{ ...styles.label, flex: "2 1 300px" }}>
            URL del stream (.m3u8 o iframe)
            <input
              style={styles.input}
              value={form.stream}
              onChange={(e) => setForm((f) => ({ ...f, stream: e.target.value }))}
              placeholder="http://.../index.m3u8"
              required
            />
          </label>
          <label style={styles.label}>
            Tipo
            <select
              style={styles.input}
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="m3u8">m3u8 (HLS)</option>
              <option value="iframe">iframe</option>
            </select>
          </label>
        </div>
        <div style={{ ...styles.row, alignItems: "center" }}>
          <label style={styles.check}>
            <input
              type="checkbox"
              checked={form.ads}
              onChange={(e) => setForm((f) => ({ ...f, ads: e.target.checked }))}
            />
            Con anuncios
          </label>
          <label style={styles.check}>
            <input
              type="checkbox"
              checked={form.useProxy}
              onChange={(e) => setForm((f) => ({ ...f, useProxy: e.target.checked }))}
            />
            Usar proxy
          </label>
          <button type="submit" style={styles.btn} disabled={p?.loading}>
            {p?.loading ? "Probando..." : "▶ Vista previa"}
          </button>
          <button
            type="button"
            style={{ ...styles.btn, background: "#1f4738", color: "#4ade80", borderColor: "#34745c" }}
            onClick={handleAdd}
            disabled={saving || !form.name.trim() || !form.stream.trim()}
          >
            {saving ? "Guardando..." : "➕ Agregar canal"}
          </button>
        </div>
      </form>

      {error && <p className="auth-error">{error}</p>}
      {saved && <p style={{ color: "#4ade80", fontSize: 13 }}>{saved}</p>}

      {p && (
        <div style={styles.previewBox}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
            <strong style={{ color: "#e6edf3", fontSize: 13 }}>Vista previa: {p.channel?.name}</strong>
            {p.loading && <span style={{ fontSize: 12, color: "#8b95a1" }}>⏳ Probando el stream...</span>}
            {p.result && p.result.ok && (
              <span style={{ fontSize: 12, color: "#4ade80", fontWeight: 700 }}>
                🟢 El servidor responde OK ({p.result.status}, HLS: {p.result.is_hls ? "sí" : "no"})
              </span>
            )}
            {p.result && !p.result.ok && (
              <span style={{ fontSize: 12, color: "#fca5a5", fontWeight: 700 }}>
                🔴 El stream NO responde bien{p.result.status ? ` (${p.result.status})` : ""}
              </span>
            )}
          </div>

          {p.channel && p.channel.type === "iframe" ? (
            <iframe
              src={p.channel.stream}
              width="100%"
              height="280"
              allowFullScreen
              allow="autoplay; fullscreen; encrypted-media"
              frameBorder="0"
              title="Vista previa"
            />
          ) : p.channel ? (
            <video
              ref={videoRef}
              controls
              autoPlay
              muted
              playsInline
              style={{ width: "100%", maxHeight: 280, background: "#000", borderRadius: 8 }}
            />
          ) : null}

          {p.playing && (
            <div style={{ fontSize: 12, color: "#4ade80", marginTop: 6 }}>
              ✅ El video carga correctamente en el reproductor.
              {p.forceProxy && (
                <span style={{ color: "#fbbf24" }}>
                  {" "}
                  (funciona vía proxy: marca "Usar proxy" antes de agregar el canal)
                </span>
              )}
            </div>
          )}
          {p.playerError && (
            <div style={{ fontSize: 12, color: "#fca5a5", marginTop: 6 }}>
              ⚠️ Error del reproductor: {p.playerError}
              {p.forceProxy && (
                <div style={{ color: "#8b95a1" }}>
                  Falló incluso vía proxy. Prueba con otra URL o verifica que el servidor del stream esté activo.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
        <strong style={{ color: "#e6edf3", fontSize: 14 }}>
          Canales guardados ({channels.length})
        </strong>
        <button type="button" style={styles.btn} onClick={loadChannels}>
          🔄 Recargar
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 10,
        }}
      >
        {channels.map((ch) => {
          const t = tests[ch.id];
          const activo = ch.status === "ACTIVO";
          return (
            <div key={ch.id} style={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ color: "#e6edf3", fontSize: 13 }}>{ch.name}</strong>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: activo ? "#1f4738" : "#3b1d1d",
                    color: activo ? "#4ade80" : "#fca5a5",
                  }}
                >
                  {activo ? "🟢 ACTIVO" : "🔴 APAGADO"}
                </span>
              </div>
              <div style={{ fontSize: 10, color: "#555f6b", wordBreak: "break-all", maxHeight: 30, overflow: "hidden" }}>
                {ch.stream}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => toggleChannel(ch)}
                  style={{
                    ...styles.btn,
                    padding: "4px 10px",
                    fontSize: 12,
                    background: activo ? "#3b1d1d" : "#1f4738",
                    color: activo ? "#fca5a5" : "#4ade80",
                    borderColor: activo ? "#7f1d1d" : "#34745c",
                  }}
                >
                  {activo ? "⏹ Apagar" : "▶ Encender"}
                </button>
                <button
                  type="button"
                  onClick={() => testChannel(ch)}
                  style={{ ...styles.btn, padding: "4px 10px", fontSize: 12 }}
                >
                  🧪 Probar
                </button>
                <button
                  type="button"
                  onClick={() => deleteChannel(ch)}
                  style={{ ...styles.btn, padding: "4px 10px", fontSize: 12, background: "#3b1d1d", color: "#fca5a5", borderColor: "#7f1d1d" }}
                >
                  🗑 Borrar
                </button>
              </div>
              {t?.loading && <span style={{ fontSize: 11, color: "#8b95a1" }}>⏳ Probando…</span>}
              {t && !t.loading && t.ok && (
                <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 700 }}>🟢 OK ({t.status})</span>
              )}
              {t && !t.loading && !t.ok && (
                <span style={{ fontSize: 11, color: "#fca5a5", fontWeight: 700 }}>
                  🔴 CAÍDO{t.status ? ` (${t.status})` : ""}
                </span>
              )}
            </div>
          );
        })}
        {channels.length === 0 && (
          <div style={{ ...styles.card, color: "#8b95a1", fontSize: 13 }}>
            Aun no hay canales guardados. Agrega el primero con el formulario de arriba.
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminChannels;

