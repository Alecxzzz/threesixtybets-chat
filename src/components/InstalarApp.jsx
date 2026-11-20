/**
 * Aviso unico de "usar la web como app" (PWA).
 *
 * Se muestra UNA sola vez por dispositivo, al entrar con la sesion iniciada.
 * Si el navegador ofrece el instalador nativo (beforeinstallprompt, Chrome /
 * Edge en Android y escritorio) el boton lanza ese dialogo; si no lo ofrece
 * (iPhone/iPad, Firefox...) se muestran los pasos manuales. Se recuerda la
 * respuesta en localStorage y no vuelve a aparecer.
 */
import { useEffect, useRef, useState } from "react";

const CLAVE = "app_install_prompt_v1";

function yaInstalada() {
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    // Safari en iOS no soporta display-mode: usa navigator.standalone.
    return window.navigator.standalone === true;
  } catch {
    return false;
  }
}

function pasosInstalacion() {
  const ua = navigator.userAgent || "";
  const ios =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1);
  if (ios) {
    return 'En Safari toca el boton Compartir y elige "Anadir a pantalla de inicio".';
  }
  if (/Android/i.test(ua)) {
    return 'Abre el menu del navegador (los tres puntos) y elige "Instalar aplicacion" o "Anadir a pantalla de inicio".';
  }
  return 'Usa el icono de instalar de la barra de direcciones o el menu del navegador > "Instalar 3SIXTYBETS AI".';
}

function InstalarApp() {
  // Se decide al montar: si ya respondio antes o ya esta instalada, no sale.
  const [abierto, setAbierto] = useState(() => {
    try {
      if (localStorage.getItem(CLAVE) === "1") return false;
    } catch {
      // Sin localStorage el aviso igual sale (una vez por carga es aceptable).
    }
    return !yaInstalada();
  });
  const [pasos, setPasos] = useState("");
  const promptRef = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;

    function guardarEvento(e) {
      e.preventDefault();
      promptRef.current = e;
    }
    window.addEventListener("beforeinstallprompt", guardarEvento);
    return () => window.removeEventListener("beforeinstallprompt", guardarEvento);
  }, [abierto]);

  function cerrar() {
    try {
      localStorage.setItem(CLAVE, "1");
    } catch {
      // Si el navegador bloquea el guardado, se volvera a mostrar otra vez.
    }
    setAbierto(false);
  }

  async function instalar() {
    const evento = promptRef.current;
    if (!evento) {
      setPasos(pasosInstalacion());
      return;
    }
    promptRef.current = null;
    try {
      evento.prompt();
      await evento.userChoice;
    } catch {
      setPasos(pasosInstalacion());
      return;
    }
    cerrar();
  }

  if (!abierto) return null;

  return (
    <div
      onClick={cerrar}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2100,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="instalar-app-titulo"
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#151922",
          border: "1px solid #34745c",
          borderRadius: "18px",
          padding: "26px 22px",
          boxShadow: "0 24px 70px rgba(0,0,0,0.5), 0 0 30px #4ade8022",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          maxHeight: "85vh",
          overflowY: "auto",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img
            src="/logo.png"
            alt=""
            width={44}
            height={44}
            style={{ objectFit: "contain", borderRadius: 10, flexShrink: 0 }}
          />
          <h2
            id="instalar-app-titulo"
            style={{ margin: 0, color: "#4ade80", fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}
          >
            Usa 3SIXTYBETS como app
          </h2>
        </div>

        <p style={{ margin: 0, color: "#cbd5e1", fontSize: 15, lineHeight: 1.5 }}>
          Instalala en tu telefono o PC para abrirla con su icono, a pantalla
          completa y sin la barra del navegador. Es la misma web, sin descargar
          nada de las tiendas.
        </p>

        {pasos && (
          <p
            style={{
              margin: 0,
              padding: "10px 12px",
              background: "#1f4738",
              border: "1px solid #34745c",
              borderRadius: 10,
              color: "#d7f5e4",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {pasos}
          </p>
        )}

        <button
          type="button"
          onClick={instalar}
          style={{
            marginTop: 4,
            padding: "13px",
            border: "none",
            borderRadius: "12px",
            background: "#4ade80",
            color: "#07110b",
            fontWeight: 800,
            fontSize: 16,
            cursor: "pointer",
            width: "100%",
          }}
        >
          Instalar ahora
        </button>

        <button
          type="button"
          onClick={cerrar}
          style={{
            padding: "10px",
            border: "none",
            borderRadius: "12px",
            background: "transparent",
            color: "#8b95a1",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            width: "100%",
          }}
        >
          Ahora no, seguir en el navegador
        </button>
      </div>
    </div>
  );
}

export default InstalarApp;
