import { useEffect, useRef, useState } from "react";
import { CLIENT_DEMO, agregarWidget, loaderUrl, montarLoader } from "../utils/sportradarWidget";

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
  const [estado, setEstado] = useState("");
  const [pintado, setPintado] = useState(false);
  const contenedorRef = useRef(null);
  const esperaRef = useRef(0);
  const idCaja = "sr-lmt-prueba";

  useEffect(() => {
    montarLoader(loaderUrl(CLIENT_DEMO));
    return () => window.clearTimeout(esperaRef.current);
  }, []);

  function probar() {
    const caja0 = contenedorRef.current;
    if (!caja0) return;

    caja0.innerHTML = "";
    setPintado(false);
    setEstado("Pidiendo el widget a Sportradar…");

    const enviado = agregarWidget(`#${idCaja}`, "match.lmtPlus", {
      matchId: String(matchId).trim(),
      layout: "single",
    });
    if (!enviado) {
      setEstado("El loader de Sportradar no cargó (bloqueado por el navegador o sin red).");
      return;
    }

    window.clearTimeout(esperaRef.current);
    esperaRef.current = window.setTimeout(() => {
      const nodo = document.getElementById(idCaja);
      const hay = Boolean(nodo && nodo.childElementCount > 0);
      setPintado(hay);
      setEstado(
        hay
          ? "Sportradar pintó el widget. La integración funciona desde tu dominio."
          : "Sportradar no pintó nada: el clientId de demo no acepta este dominio (o el matchId no existe)."
      );
    }, ESPERA_MS);
  }

  return (
    <div style={caja}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase", color: "#8b93a7" }}>
          Probador · Live Match Tracker
        </span>
        <span style={{ fontSize: 10, color: "#fbbf24", fontWeight: 800 }}>CLIENT DEMO</span>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
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
        {estado ? (
          <span style={{ fontSize: 11, color: pintado ? "#22c55e" : "#8b93a7" }}>{estado}</span>
        ) : null}
      </div>

      <div ref={contenedorRef} style={{ maxWidth: 560, margin: "0 auto", minHeight: 120 }}>
        <div id={idCaja} />
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
