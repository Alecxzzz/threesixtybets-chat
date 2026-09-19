import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

// Ultima red de seguridad: si un error escapa del boundary (callback async,
// handler fuera de React), lo registramos. Los errores de render los captura
// ErrorBoundary y muestran el panel de recuperacion en vez de la pantalla
// vacia que se veia en Android.
window.addEventListener("unhandledrejection", (e) => {
  console.error("[3SIXTYBETS] Promesa sin manejar:", e?.reason);
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
