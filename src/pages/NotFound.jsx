/**
 * Página 404 real.
 *
 * Vercel reescribe todo a index.html (necesario para la SPA), así que antes una
 * URL rota devolvía la app como si existiera. Aquí se muestra un 404 de verdad
 * con navegación útil, y se marca `noindex` para que Google no la guarde.
 */
import { useEffect } from "react";

const DARK = {
  minHeight: "100vh",
  background: "#0b0f14",
  color: "#e6edf3",
  fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px 16px",
  boxSizing: "border-box",
  textAlign: "center",
};

const LINK = { color: "#4ade80", fontWeight: 700, textDecoration: "underline" };

export default function NotFound() {
  useEffect(() => {
    // Nada de esta página debe indexarse.
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  return (
    <div style={DARK}>
      <div style={{ maxWidth: 520 }}>
        <div style={{ fontSize: 64, lineHeight: 1 }}>🔍</div>
        <h1 style={{ margin: "14px 0 6px", fontSize: 24 }}>Página no encontrada</h1>
        <p style={{ margin: "0 0 18px", color: "#8b95a1", fontSize: 14, lineHeight: 1.6 }}>
          La dirección <code style={{ color: "#c9d1d9" }}>{typeof window !== "undefined" ? window.location.pathname : ""}</code>{" "}
          no existe o cambió de sitio.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/" style={LINK}>Ir al inicio</a>
          <a href="/espn-gratis" style={LINK}>Partido gratis</a>
          <a href="/terminos" style={LINK}>Términos</a>
          <a href="/privacidad" style={LINK}>Privacidad</a>
        </div>
      </div>
    </div>
  );
}
