import { useEffect, useState } from "react";
import { API_BASE } from "../utils/stream";
import { getStoredSession } from "../services/api";

const WHATSAPP = "50588287489";

function formatExpiry(value) {
  if (!value) return "Sin fecha";

  // Fecha de expiracion en el anio 9999 = acceso ilimitado
  if (new Date(value).getFullYear() >= 9999) return "Ilimitado";

  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function daysLeft(value) {
  if (!value) return "Sin datos";

  // Fecha de expiracion en el anio 9999 = acceso ilimitado
  if (new Date(value).getFullYear() >= 9999) return "Ilimitado";

  const diff = new Date(value).getTime() - Date.now();
  return `${Math.max(Math.ceil(diff / 86400000), 0)} dias`;
}

function Header({ openSidebar, user, onSignOut }) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const [soporteOpen, setSoporteOpen] = useState(false);
  const displayName = user.name || user.username;

  return (
    <header className="header">
      <button className="menu-btn" onClick={openSidebar} aria-label="Abrir menu">
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div className="header-title">
        <h1>3SIXTYBETS AI</h1>
        <p>Sports Betting Intelligence</p>
      </div>

      <div className="header-actions">
        <span className="status">Online</span>
        <div className="account-menu">
          <button
            className="user-pill"
            onClick={() => setAccountOpen((open) => !open)}
            type="button"
          >
            {displayName}
          </button>
          {accountOpen && (
            <div className="account-popover">
              <strong>{displayName}</strong>
              <span>Restante: {daysLeft(user.access_expires_at)}</span>
              <span>Expira: {formatExpiry(user.access_expires_at)}</span>
            </div>
          )}
        </div>
        <button className="sign-out-btn perfil-btn" onClick={() => setSoporteOpen(true)}>
          Soporte
        </button>
        <button className="sign-out-btn perfil-btn" onClick={() => setPerfilOpen(true)}>
          Mi perfil
        </button>
        <button className="sign-out-btn" onClick={onSignOut}>
          Sign out
        </button>
      </div>

      {perfilOpen && (
        <div
          className="perfil-overlay"
          onClick={(e) => e.target === e.currentTarget && setPerfilOpen(false)}
        >
          <PerfilPanel onClose={() => setPerfilOpen(false)} />
        </div>
      )}

      {soporteOpen && (
        <div
          className="perfil-overlay"
          onClick={(e) => e.target === e.currentTarget && setSoporteOpen(false)}
        >
          <SoportePanel onClose={() => setSoporteOpen(false)} />
        </div>
      )}
    </header>
  );
}

async function apiAuth(path, opts = {}) {
  const s = getStoredSession();
  const r = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${s?.access_token || ""}`,
      ...(opts.headers || {}),
    },
  });
  return { ok: r.ok, data: await r.json().catch(() => ({})) };
}

function PerfilPanel({ onClose }) {
  const [info, setInfo] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([apiAuth("/auth/me"), apiAuth("/transactions")])
      .then(([me, tx]) => {
        setInfo(me.ok ? me.data : null);
        setPagos(tx.data.transactions || []);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const exp = info?.access_expires_at ? new Date(info.access_expires_at) : null;
  const ilimitado = exp && exp.getFullYear() >= 9999;
  const dias = exp && !ilimitado ? Math.max(Math.ceil((exp - new Date()) / 86400000), 0) : 0;

  return (
    <div className="perfil-modal">
      <div className="perfil-head">
        <b>Mi perfil</b>
        <button className="perfil-close" onClick={onClose}>&times;</button>
      </div>
      <div className="perfil-body">
        {cargando && <p className="soporte-muted">Cargando tu informacion...</p>}
        {!cargando && !info && <p className="soporte-muted">No pude cargar tu perfil, cierra y abre de nuevo.</p>}
        {!cargando && info && (
          <>
            <div className="soporte-row"><span className="k">Usuario</span><span className="v">{info.username}</span></div>
            <div className="soporte-row"><span className="k">Rol</span><span className="v">{info.role === "admin" ? "Administrador" : "Usuario"}</span></div>
            <div className="soporte-row">
              <span className="k">Plan</span>
              <span className="v">
                {ilimitado ? <span className="pill-hi">ILIMITADO</span>
                  : dias > 0 ? <span className="pill-mid">{dias} dias restantes</span>
                  : <span className="pill-lo">EXPIRADO</span>}
              </span>
            </div>
            <div className="soporte-row">
              <span className="k">Acceso vence</span>
              <span className="v">{ilimitado ? "Nunca expira" : exp ? exp.toLocaleDateString("es-NI") : "Sin fecha"}</span>
            </div>
            <h3>Historial de pagos</h3>
            {pagos.length ? (
              <table className="soporte-tabla">
                <thead><tr><th>Fecha</th><th>Plan</th><th>Monto</th><th>Estado</th></tr></thead>
                <tbody>
                  {pagos.map((t, i) => (
                    <tr key={i}>
                      <td>{(t.fecha || "").slice(0, 10)}</td>
                      <td>{t.plan || ""}</td>
                      <td>{t.monto ?? ""} {t.moneda || ""}</td>
                      <td>{t.estado || ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="soporte-muted">Sin pagos registrados todavia.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function SoportePanel({ onClose }) {
  const [mensajes, setMensajes] = useState([
    {
      rol: "ia",
      texto: "Hola! Soy el asistente de 3SIXTYBETS 😊 Cuentame, ¿en que te puedo ayudar hoy?",
    },
  ]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    const msg = texto.trim();
    if (!msg || enviando) return;
    setMensajes((m) => [...m, { rol: "yo", texto: msg }]);
    setTexto("");
    setEnviando(true);
    try {
      const r = await apiAuth("/support/chat", {
        method: "POST",
        body: JSON.stringify({ mensaje: msg }),
      });
      const resp = r.ok && r.data.respuesta
        ? r.data.respuesta
        : "Lo siento, tuve un problema tecnico 🙏 Intenta de nuevo o escribenos al WhatsApp.";
      setMensajes((m) => [...m, { rol: "ia", texto: resp }]);
    } catch {
      setMensajes((m) => [...m, { rol: "ia", texto: `No pude responder ahora 😅 Escribenos al WhatsApp ${WHATSAPP} y te ayudamos.` }]);
    } finally {
      setEnviando(false);
      setTimeout(() => {
        const box = document.getElementById("soporte-mensajes");
        if (box) box.scrollTop = box.scrollHeight;
      }, 40);
    }
  }

  return (
    <div className="perfil-modal soporte-modal">
      <div className="perfil-head">
        <b>Soporte 3SIXTYBETS</b>
        <button className="perfil-close" onClick={onClose}>&times;</button>
      </div>
      <div className="soporte-mensajes" id="soporte-mensajes">
        {mensajes.map((m, i) => (
          <div key={i} className={`soporte-burbuja ${m.rol === "yo" ? "yo" : "ia"}`}>
            {m.texto}
          </div>
        ))}
        {enviando && <div className="soporte-burbuja ia">Escribiendo...</div>}
      </div>
      <div className="soporte-wa">
        ¿Sigue el problema?{" "}
        <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer">
          Escríbenos al WhatsApp {WHATSAPP}
        </a>
      </div>
      <div className="soporte-input">
        <input
          placeholder="Escribe tu problema o pregunta..."
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviar()}
        />
        <button onClick={enviar} disabled={enviando}>Enviar</button>
      </div>
    </div>
  );
}

export default Header;
