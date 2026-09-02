function MenuIcon({ type }) {
  const common = {
    width: "22",
    height: "22",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  if (type === "tv") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="12" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
        <path d="m10 9 4 2-4 2V9Z" />
      </svg>
    );
  }

  if (type === "credits") {
    return (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
        <path d="M16 15h2" />
      </svg>
    );
  }

  if (type === "stats") {
    return (
      <svg {...common}>
        <path d="M4 19V5" />
        <path d="M4 19h16" />
        <rect x="7" y="11" width="3" height="5" rx="1" />
        <rect x="12" y="8" width="3" height="8" rx="1" />
        <rect x="17" y="4" width="3" height="12" rx="1" />
      </svg>
    );
  }

  if (type === "transactions") {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18" />
        <path d="M7 14h4" />
        <path d="M7 17h7" />
        <path d="m14 15 2 2 4-4" />
      </svg>
    );
  }

  if (type === "admin") {
    return (
      <svg {...common}>
        <circle cx="8" cy="8" r="4" />
        <path d="m11 11 9 9" />
        <path d="m16 16 2-2" />
        <path d="m18 18 2-2" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
    </svg>
  );
}

function Sidebar({ open, close, page, setPage, user }) {
  const items = [
    { page: "chat", label: "Chat AI", icon: "chat" },
    { page: "tv", label: "TV", icon: "tv" },
    { page: "credits", label: "Compra y canjeo", icon: "credits" },
    { page: "stats", label: "Estadisticas", icon: "stats" },
    { page: "transactions", label: "Historial de transacciones", icon: "transactions" },
  ];

  if (user?.role === "admin") {
    items.push({ page: "admin", label: "Admin keys", icon: "admin" });
  }

  function goTo(p) {
    setPage(p);
    close();
  }

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="sidebar-top">
        <div className="brand">
          <img src="/logo.png" alt="" />
          <span>3SIXTYBETS AI</span>
        </div>
        <button className="close-sidebar" onClick={close}>
          x
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Menu principal">
        {items.map((item) => (
          <button
            key={item.page}
            className={`new-chat ${page === item.page ? "selected-menu" : ""}`}
            onClick={() => goTo(item.page)}
          >
            <span className="menu-icon">
              <MenuIcon type={item.icon} />
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="history-note">
        Las busquedas del chat se muestran durante 24 horas.
      </div>
    </aside>
  );
}

export default Sidebar;
