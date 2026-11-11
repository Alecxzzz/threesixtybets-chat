import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import ESPNGratis from "./pages/ESPNGratis.jsx";
import Legal from "./pages/Legal.jsx";
import NotFound from "./pages/NotFound.jsx";
import { registrarVista } from "./utils/telemetria";

// Conteo de visitas propio (sin cookies ni terceros). Se hace antes de montar
// para que cuente también las páginas que fallan al renderizar.
registrarVista();

// Rutas publicas que NO pasan por el App ni por la pantalla de Auth:
//   /espn-gratis  -> reproductor ESPN Deportes gratis (2 horas)
//   /privacidad   -> Politica de Privacidad
//   /terminos     -> Terminos y Condiciones
// Las legales deben poder leerse sin cuenta (antes de registrarse o pagar).
const ruta = window.location.pathname.toLowerCase();
const esLegal = ruta.includes("privacidad") || ruta.includes("terminos")
  || ruta.includes("terms") || ruta.includes("privacy");

// 404 REAL para lo que claramente no es una ruta de la app: rutas con
// extension (.php, .env, .zip...) o las tipicas que escanean los bots. Antes
// el rewrite de Vercel mandaba TODO a index.html y esas URLs devolvian la app.
const PARECE_ARCHIVO = /\.[a-z0-9]{2,5}$/i.test(ruta);
const ES_BOT = /(wp-|wordpress|\/\.env|\/\.git|phpmyadmin|xmlrpc|cgi-bin|admin\.php|vendor\/)/.test(ruta);

if (PARECE_ARCHIVO || ES_BOT) {
  createRoot(document.getElementById("root")).render(
    <ErrorBoundary>
      <NotFound />
    </ErrorBoundary>
  );
} else if (ruta.includes("espn-gratis")) {
  createRoot(document.getElementById("root")).render(
    <ErrorBoundary>
      <ESPNGratis />
    </ErrorBoundary>
  );
} else if (esLegal) {
  createRoot(document.getElementById("root")).render(
    <ErrorBoundary>
      <Legal tipo={ruta.includes("privacidad") || ruta.includes("privacy")
        ? "privacidad"
        : "terminos"} />
    </ErrorBoundary>
  );
} else {
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
}

