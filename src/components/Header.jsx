import { useState } from "react";
import { API_BASE } from "../utils/stream";
import { getStoredSession } from "../services/api";

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
          <div className="perfil-modal">
            <div className="perfil-head">
              <b>Mi perfil</b>
              <button className="perfil-close" onClick={() => setPerfilOpen(false)}>
                &times;
              </button>
            </div>
            <iframe
              title="Mi perfil"
              src={`${API_BASE}/perfil?token=${encodeURIComponent(getStoredSession()?.access_token || "")}`}
            />
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
