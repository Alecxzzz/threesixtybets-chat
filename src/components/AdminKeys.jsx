import { useEffect, useState, useCallback } from "react";
import {
  createAdminKeys,
  loadAdminKeys,
  adminDeleteKey,
  adminChannelTest,
} from "../services/api";
import { channels } from "../data/channels";
import AdminChannels from "./AdminChannels";

function AdminKeys({ session }) {
  const [form, setForm] = useState({
    durationDays: "7",
    quantity: "1",
    expiresInDays: "",
  });
  const [keys, setKeys] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Test de canales: { [nombre]: {ok, status, is_hls, loading} }
  const [tests, setTests] = useState({});
  const [testingAll, setTestingAll] = useState(false);

  async function refreshKeys() {
    const data = await loadAdminKeys(session);
    setKeys(data.keys || []);
  }

  useEffect(() => {
    let active = true;

    async function loadKeys() {
      try {
        const data = await loadAdminKeys(session);
        if (active) setKeys(data.keys || []);
      } catch (err) {
        if (active) setError(err.message);
      }
    }

    loadKeys();

    return () => {
      active = false;
    };
  }, [session]);

  const refreshKeysCb = useCallback(refreshKeys, [session]);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await createAdminKeys(session, {
        duration_days: Number(form.durationDays),
        quantity: Number(form.quantity),
        expires_in_days: form.expiresInDays
          ? Number(form.expiresInDays)
          : null,
      });
      await refreshKeys();
    } catch (err) {
      setError(err.message || "No se pudieron crear las keys.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(code) {
    if (!window.confirm(`¿Borrar la key ${code}?`)) return;
    try {
      await adminDeleteKey(session, code);
      await refreshKeysCb();
    } catch (err) {
      setError(err.message || "No se pudo borrar la key.");
    }
  }

  async function testChannel(channel) {
    setTests((prev) => ({
      ...prev,
      [channel.name]: { loading: true },
    }));
    try {
      const res = await adminChannelTest(session, channel.stream);
      setTests((prev) => ({ ...prev, [channel.name]: res }));
    } catch (err) {
      setTests((prev) => ({
        ...prev,
        [channel.name]: { ok: false, error: err.message },
      }));
    }
  }

  async function testAll() {
    setTestingAll(true);
    for (const ch of channels) {
      // eslint-disable-next-line no-await-in-loop
      await testChannel(ch);
    }
    setTestingAll(false);
  }

  return (
    <section className="tool-page">
      <div className="tool-panel" style={{ width: "100%", maxWidth: "none" }}>
        <h2 style={{ margin: "0 0 16px", fontSize: 26 }}>🛠️ PANEL ADMIN</h2>

        <h3 style={sectionH3}>🔑 Gestión de keys</h3>
        <form className="admin-form" onSubmit={submit}>
          <label>
            Dias de acceso
            <input
              type="number"
              min="1"
              value={form.durationDays}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, durationDays: e.target.value }))
              }
            />
          </label>

          <label>
            Cantidad
            <input
              type="number"
              min="1"
              max="100"
              value={form.quantity}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, quantity: e.target.value }))
              }
            />
          </label>

          <label>
            Expira en dias
            <input
              type="number"
              min="1"
              value={form.expiresInDays}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, expiresInDays: e.target.value }))
              }
              placeholder="Opcional"
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Creando..." : "Crear keys"}
          </button>
        </form>

        {error && <p className="auth-error">{error}</p>}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 10,
            marginTop: 16,
          }}
        >
          {keys.map((key) => (
            <div
              key={key.code}
              style={{
                background: "#11161d",
                border: "1px solid #232a33",
                borderRadius: 10,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ color: "#e6edf3", fontFamily: "monospace" }}>
                  {key.code}
                </strong>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 999,
                    background:
                      key.status === "available"
                        ? "#1f4738"
                        : key.status === "claimed"
                        ? "#312e81"
                        : "#3b1d1d",
                    color:
                      key.status === "available"
                        ? "#4ade80"
                        : key.status === "claimed"
                        ? "#a78bfa"
                        : "#fca5a5",
                  }}
                >
                  {key.status === "available"
                    ? "LIBRE"
                    : key.status === "claimed"
                    ? "RECLAMADA"
                    : "EXPIRADA"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#8b95a1" }}>
                {key.duration_days} dias · creada{" "}
                {key.created_at
                  ? new Date(key.created_at).toLocaleDateString("es")
                  : "-"}
              </div>
              {key.status === "claimed" && (
                <div style={{ fontSize: 12, color: "#a78bfa" }}>
                  👤 Reclamada por{" "}
                  <strong>
                    {key.claimed_by_username || key.claimed_by || "?"}
                  </strong>
                </div>
              )}
              {key.status === "available" && (
                <button
                  onClick={() => handleDelete(key.code)}
                  style={{
                    alignSelf: "flex-start",
                    background: "#3b1d1d",
                    color: "#fca5a5",
                    border: "1px solid #7f1d1d",
                    borderRadius: 8,
                    padding: "4px 10px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  🗑 Borrar
                </button>
              )}
            </div>
          ))}
        </div>

        {/* ===================== GESTION DE CANALES ===================== */}
        <AdminChannels session={session} />

        {/* ===================== TEST DE CANALES ===================== */}
        <h3 style={{ ...sectionH3, marginTop: 28 }}>📺 Test de canales</h3>
        <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <button
            onClick={testAll}
            disabled={testingAll}
            style={{
              background: "#1f4738",
              color: "#4ade80",
              border: "1px solid #34745c",
              borderRadius: 8,
              padding: "8px 16px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {testingAll ? "Probando todos..." : `▶ Probar los ${channels.length} canales`}
          </button>
          <span style={{ color: "#8b95a1", fontSize: 13, alignSelf: "center" }}>
            Verifica desde el servidor si cada m3u8 responde.
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 10,
          }}
        >
          {channels.map((ch) => {
            const t = tests[ch.name];
            return (
              <div
                key={ch.id}
                style={{
                  background: "#11161d",
                  border: "1px solid #232a33",
                  borderRadius: 10,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ color: "#e6edf3", fontSize: 13 }}>{ch.name}</strong>
                  {t?.loading && (
                    <span style={{ fontSize: 11, color: "#8b95a1" }}>⏳ Probando…</span>
                  )}
                  {!t && (
                    <span style={{ fontSize: 11, color: "#555f6b" }}>sin probar</span>
                  )}
                  {t && !t.loading && t.ok && (
                    <span style={{ fontSize: 11, color: "#4ade80", fontWeight: 700 }}>
                      🟢 OK ({t.status})
                    </span>
                  )}
                  {t && !t.loading && !t.ok && (
                    <span style={{ fontSize: 11, color: "#fca5a5", fontWeight: 700 }}>
                      🔴 CAÍDO{t.status ? ` (${t.status})` : ""}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#555f6b",
                    wordBreak: "break-all",
                    maxHeight: 30,
                    overflow: "hidden",
                  }}
                >
                  {ch.stream}
                </div>
                <button
                  onClick={() => testChannel(ch)}
                  style={{
                    alignSelf: "flex-start",
                    background: "#202633",
                    color: "#60a5fa",
                    border: "1px solid #303847",
                    borderRadius: 8,
                    padding: "4px 10px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  🧪 Probar
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

const sectionH3 = {
  color: "#e6edf3",
  margin: "0 0 12px",
  paddingBottom: 8,
  borderBottom: "1px solid #232a33",
  fontSize: 18,
};

export default AdminKeys;
