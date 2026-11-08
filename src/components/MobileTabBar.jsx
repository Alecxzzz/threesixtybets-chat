/**
 * Barra de navegacion inferior (solo movil, <=768px).
 *
 * Da acceso directo a las 4 secciones principales sin abrir el menu lateral,
 * como en una app nativa. "Mas" abre el drawer con el resto (Props, historial,
 * compra, admin...). En escritorio no se muestra: se queda el menu lateral.
 */

const TABS = [
  { key: "dashboard", label: "Inicio" },
  { key: "chat", label: "Chat" },
  { key: "tv", label: "TV" },
  { key: "stats", label: "Stats" },
];

function Icono({ tipo }) {
  const base = {
    width: 21,
    height: 21,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
  };

  if (tipo === "dashboard") {
    return (
      <svg {...base}>
        <path d="M4 10.6 12 4l8 6.6V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />
      </svg>
    );
  }

  if (tipo === "chat") {
    return (
      <svg {...base}>
        <path d="M20.5 11.8a7.8 7.8 0 0 1-8 7.7 8.6 8.6 0 0 1-3.2-.6L4 21l1.2-4a7.6 7.6 0 0 1-1.2-4.2 7.8 7.8 0 0 1 8-7.6 7.8 7.8 0 0 1 8.5 6.6Z" />
        <path d="M8.6 11.5h6.8" />
        <path d="M8.6 8.7h4" />
      </svg>
    );
  }

  if (tipo === "tv") {
    return (
      <svg {...base}>
        <rect x="2.6" y="4.8" width="18.8" height="12.6" rx="2.2" />
        <path d="M8.4 20.8h7.2" />
        <path d="M12 17.4v3.4" />
      </svg>
    );
  }

  if (tipo === "stats") {
    return (
      <svg {...base}>
        <path d="M4 19.4V5" />
        <path d="M4 19.4h16" />
        <path d="M7.5 19.4v-4.6" />
        <path d="M12 19.4v-7.6" />
        <path d="M16.5 19.4V8" />
      </svg>
    );
  }

  return (
    <svg {...base}>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function MobileTabBar({ page, setPage, openMenu }) {
  return (
    <nav className="tabbar" aria-label="Navegación principal">
      {TABS.map((t) => {
        const activo = page === t.key;
        return (
          <button
            key={t.key}
            type="button"
            className={activo ? "selected" : ""}
            onClick={() => setPage(t.key)}
            aria-current={activo ? "page" : undefined}
          >
            <Icono tipo={t.key} />
            <span>{t.label}</span>
          </button>
        );
      })}
      <button type="button" onClick={openMenu} aria-label="Más secciones">
        <Icono tipo="menu" />
        <span>Más</span>
      </button>
    </nav>
  );
}
