import { useState } from "react";

function formatExpiry(value) {
  if (!value) return "Sin fecha";

  return new Intl.DateTimeFormat("es", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function daysLeft(value) {
  if (!value) return "Sin datos";

  const diff = new Date(value).getTime() - Date.now();
  return `${Math.max(Math.ceil(diff / 86400000), 0)} dias`;
}

function Header({ openSidebar, user, onSignOut }) {
  const [accountOpen, setAccountOpen] = useState(false);
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
        <button className="sign-out-btn" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </header>
  );
}

export default Header;
