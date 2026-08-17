import { useEffect, useState } from "react";
import { createAdminKeys, loadAdminKeys } from "../services/api";

function AdminKeys({ session }) {
  const [form, setForm] = useState({
    durationDays: "7",
    quantity: "1",
    expiresInDays: "",
  });
  const [keys, setKeys] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  return (
    <section className="tool-page">
      <div className="tool-panel">
        <h2>Admin keys</h2>
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

        <div className="keys-list">
          {keys.map((key) => (
            <div className="key-row" key={key.code}>
              <strong>{key.code}</strong>
              <span>{key.duration_days} dias</span>
              <span>{key.status}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default AdminKeys;
