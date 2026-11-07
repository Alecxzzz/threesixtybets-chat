import { useEffect, useRef, useState } from "react";
import {
  CLIENT_DEMO,
  agregarWidget,
  loaderUrl,
  montarLoader,
  reiniciarLoader,
} from "../utils/sportradarWidget";

/**
 * Probador del Live Match Tracker (match.lmtPlus) de Sportradar.
 *
 * Sirve para comprobar si el widget se renderiza dentro de nuestra web usando
 * el clientId publico de la demo de Sportradar (`betradar`). Ese clientId NO es
 * una licencia nuestra: si pinta, es que la integracion funciona y solo faltaria
 * contratar Engagement Tools para tener el clientId propio (se cambia en
 * SPORTRADAR_WIDGET_CLIENT_ID y listo, sin tocar codigo).
 *
 * OJO: el iframe de la demo (widgets.sir.sportradar.com/betradar/en/live-match-tracker)
 * NO se puede embeber porque su Content-Security-Policy solo permite
 * frame-ancestors de dominios de Sportradar/Betradar. La integracion por script
 * (SIR) si es posible desde cualquier dominio, y es la que se prueba aqui.
 */

const MATCH_INICIAL = "76142720";
const ESPERA_MS = 9000;

const caja = {
  border: "1px solid #303847",
  borderRadius: 14,
  background: "#171c26",
  padding: 14,
  marginBottom: 14,
};

const campo = {
  background: "#0f1117",
  border: "1px solid #303847",
  borderRadius: 8,
  color: "#e5e7eb",
  padding: "7px 10px",
  fontSize: 13,
  width: 140,
};

const boton = {
  background: "#22c55e",
  color: "#08130b",
  border: "1px solid #22c55e",
  borderRadius: 8,
  padding: "7px 12px",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
};

export default function WidgetLmtPrueba() {
  const [matchId, setMatchId] = useState(MATCH_INICIAL);
  const [clientId, setClientId] = useState(() => {
    try {
      return localStorage.getItem("lmt_client_id") || CLIENT_DEMO;
    } catch {
      return CLIENT_DEMO;
    }
  });
  const [estado, setEstado] = useState("");
  const [pintado, setPintado] = useState(false);
  const [estadoLoader, setEstadoLoader] = useState("");
  const [copiado, setCopiado] = useState(false);
  const contenedorRef = useRef(null);
  const esperaRef = useRef(0);
  const estadoLoaderRef = useRef("");
  const idCaja = "sr-lmt-prueba";

  const registrarLoader = (valor) => {
    estadoLoaderRef.current = valor;
    setEstadoLoader(valor);
  };

  useEffect(() => () => window.clearTimeout(esperaRef.current), []);

  /** Monta (o remonta) el loader del clientId indicado y espera a que cargue. */
  function cargarLoader(cliente) {
    return new Promise((resolve) => {
      reiniciarLoader();
      const script = montarLoader(loaderUrl(cliente), registrarLoader);
      if (!script) {
        resolve(true);
        return;
      }
      let listo = false;
      const terminar = (ok) => {
        if (listo) return;
        listo = true;
        resolve(ok);
      };
      script.addEventListener("load", () => terminar(true));
      script.addEventListener("error", () => terminar(false));
      window.setTimeout(() => terminar(Boolean(window.SIR)), 8000);
    });
  }

  async function probar() {
    const caja0 = contenedorRef.current;
    if (!caja0) return;

    const cliente = String(clientId).trim() || CLIENT_DEMO;
    try {
      localStorage.setItem("lmt_client_id", cliente);
    } catch {
      /* sin localStorage (modo privado) da igual */
    }

    caja0.innerHTML = "";
    setPintado(false);
    setCopiado(false);
    setEstado("Cargando el loader de Sportradar…");

    const cargado = await cargarLoader(cliente);
    if (!cargado) {
      setEstado("El loader no cargó: clientId inexistente, red o bloqueo del navegador.");
      return;
    }

    setEstado("Pidiendo el widget a Sportradar…");
    const enviado = agregarWidget(`#${idCaja}`, "match.lmtPlus", {
      matchId: String(matchId).trim(),
      layout: "single",
    });
    if (!enviado) {
      setEstado("Sportradar no expuso SIR tras cargar el loader.");
      return;
    }

    window.clearTimeout(esperaRef.current);
    esperaRef.current = window.setTimeout(() => {
      const nodo = document.getElementById(idCaja);
      const hay = Boolean(nodo && nodo.childElementCount > 0);
      setPintado(hay);

      if (hay) {
        setEstado(`Sportradar pintó el widget con el clientId «${cliente}». ¡Funciona!`);
        return;
      }
      const loader = estadoLoaderRef.current;
      if (loader === "error") {
        setEstado("El navegador no pudo cargar el script de Sportradar (red o bloqueo del cliente).");
      } else if (loader !== "cargado") {
        setEstado("El loader de Sportradar no respondió a tiempo.");
      } else {
        setEstado(
          `El loader cargó, pero no pintó el widget: el clientId «${cliente}» no autoriza ` +
            window.location.hostname + " o el matchId no existe."
        );
      }
    }, ESPERA_MS);
  }

  function diagnostico() {
    const nodo = document.getElementById(idCaja);
    const cliente = String(clientId).trim() || CLIENT_DEMO;
    const lineas = [
      "Radar 3SIXTYBETS · diagnostico widget LMT de Sportradar",
      `dominio: ${typeof window !== "undefined" ? window.location.hostname : "-"}`,
      `clientId usado: ${cliente}${cliente === CLIENT_DEMO ? " (demo publica)" : ""}`,
      `loader: ${loaderUrl(cliente)}`,
      `matchId probado: ${matchId}`,
      `estado del loader: ${estadoLoader || "desconocido"}`,
      `widget pintado: ${nodo && nodo.childElementCount > 0 ? "si" : "no"}`,
      `resultado: ${estado || "-"}`,
      `navegador: ${typeof navigator !== "undefined" ? navigator.userAgent : "-"}`,
    ];
    return lineas.join("\n");
  }

  async function copiarDiagnostico() {
    const texto = diagnostico();
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div style={caja}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: "#8b93a7" }}>
          Probador · Live Match Tracker
        </span>
        <span style={{ fontSize: 10, color: "#fbbf24", fontWeight: 800 }}>
          {String(clientId).trim() === CLIENT_DEMO ? "CLIENT DEMO" : "CLIENT PROPIO"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: "#6b7280", minWidth: 52 }}>clientId</span>
        <input
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          aria-label="clientId de Engagement Tools"
          placeholder="clientId"
          style={{ ...campo, width: 170 }}
        />
        <span style={{ fontSize: 10, color: "#6b7280", minWidth: 52 }}>matchId</span>
        <input
          value={matchId}
          onChange={(e) => setMatchId(e.target.value)}
          inputMode="numeric"
          aria-label="matchId de Sportradar"
          style={campo}
        />
        <button type="button" onClick={probar} style={boton}>
          Cargar widget
        </button>
      </div>

      <div style={{ marginBottom: 10, minHeight: 16 }}>
        {estado ? (
          <span style={{ fontSize: 11, color: pintado ? "#22c55e" : "#8b93a7" }}>{estado}</span>
        ) : (
          <span style={{ fontSize: 10, color: "#4b5563" }}>
            Pega aquí tu clientId cuando Sportradar te lo entregue (se guarda en este navegador).
          </span>
        )}
      </div>

      <div ref={contenedorRef} style={{ maxWidth: 560, margin: "0 auto", minHeight: 120 }}>
        <div id={idCaja} />
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
        <button
          type="button"
          onClick={copiarDiagnostico}
          style={{
            background: "#1f2633",
            color: "#e5e7eb",
            border: "1px solid #303847",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {copiado ? "✓ Copiado" : "Copiar diagnóstico"}
        </button>
        <span style={{ fontSize: 10, color: "#6b7280" }}>
          Loader: {estadoLoader || "sin cargar"}
          {estado ? ` · ${pintado ? "OK" : "sin widget"}` : ""}
        </span>
      </div>

      <div style={{ fontSize: 10, color: "#4b5563", marginTop: 10, lineHeight: 1.5 }}>
        Usa el clientId público de la demo de Sportradar (<code>betradar</code>). No es
        una licencia nuestra: si pinta algo, la integración es válida y solo faltaría
        contratar Engagement Tools para tener el clientId propio. El iframe de su demo
        no se puede embeber (su CSP solo admite dominios de Sportradar).
      </div>
    </div>
  );
}
