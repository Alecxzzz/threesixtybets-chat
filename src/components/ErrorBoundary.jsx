import { Component } from "react";

const RELOAD_FLAG = "eb_auto_reload_at";
const RELOAD_COOLDOWN_MS = 30000;

/**
 * Red de seguridad de la app: sin esto, CUALQUIER error de render desmonta
 * toda la app de React y el usuario se queda solo con el fondo (pantalla
 * "vacía" típica en Android tras un rato usando el chat). Con el boundary,
 * el error se captura y se muestra un panel de recuperacion con boton
 * "Recargar" (y auto-recarga una vez si el crash no es persistente).
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, reloading: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Log util si conectan el telefono a devtools.
    console.error("[3SIXTYBETS] Error en la interfaz:", error, info?.componentStack);
    try {
      const last = Number(sessionStorage.getItem(RELOAD_FLAG) || 0);
      if (Date.now() - last > RELOAD_COOLDOWN_MS) {
        sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
        this.setState({ reloading: true });
        setTimeout(() => window.location.reload(), 700);
      }
    } catch {
      // storage bloqueado: se muestra el fallback manual
    }
  }

  render() {
    const { error, reloading } = this.state;
    if (!error) return this.props.children;

    if (reloading) {
      return (
        <div style={shell}>
          <div style={{ fontSize: 44 }}>⚙️</div>
          <h2 style={{ margin: 0, color: "#ececec" }}>Recuperando la app...</h2>
          <p style={{ margin: 0, color: "#8b95a1" }}>Un momento, se está recargando la pantalla.</p>
        </div>
      );
    }

    return (
      <div style={shell}>
        <div style={{ fontSize: 44 }}>🔧</div>
        <h2 style={{ margin: 0, color: "#ececec" }}>Algo salió mal en la pantalla</h2>
        <p style={{ margin: 0, color: "#8b95a1", maxWidth: 420 }}>
          La app se detuvo por un error inesperado. Toca el botón para
          recuperarla: tu sesión y tus datos se conservan.
        </p>
        <button type="button" onClick={() => window.location.reload()} style={btn}>
          🔄 Recargar ahora
        </button>
        <details style={{ color: "#5c6670", fontSize: 11, maxWidth: 460 }}>
          <summary style={{ cursor: "pointer" }}>Detalles técnicos</summary>
          <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {String(error?.message || error)}
          </pre>
        </details>
      </div>
    );
  }
}

const shell = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 14,
  textAlign: "center",
  padding: 24,
  background: "#0b0f14",
};

const btn = {
  marginTop: 6,
  padding: "12px 22px",
  border: "1px solid #4ade80",
  borderRadius: 10,
  background: "rgba(74, 222, 128, 0.12)",
  color: "#4ade80",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};
