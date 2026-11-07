import { useEffect, useRef, useState } from "react";
import { getStoredSession, fetchRadarWidget } from "../services/api";
import { agregarWidget, montarLoader } from "../utils/sportradarWidget";
import RadarPartido from "./RadarPartido";

/**
 * Radar del partido: usa el widget oficial de Sportradar (Live Match Tracker,
 * match.lmtPlus) cuando hay licencia y, si no, cae al mapa de tiros propio.
 *
 * El LMT es un widget licenciado (Engagement Tools). Se carga desde
 *   https://widgets.sir.sportradar.com/{clientId}/widgetloader
 * y necesita clientId propio + matchId de Sportradar (sr:match:XXXXXXXX).
 * El backend (/stats/widget) lee SPORTRADAR_WIDGET_CLIENT_ID y
 * SPORTRADAR_WIDGET_MATCHES y responde si esta disponible; mientras no lo
 * este, se pinta <RadarPartido/> (mapa de tiros/xG de FotMob).
 *
 * Integracion segun la doc oficial de Engagement Tools: stub global SIR ->
 * SIR('addWidget', '#selector', 'match.lmtPlus', { matchId, layout }).
 */

const ESPERA_WIDGET_MS = 9000;

const caja = {
  border: "1px solid #303847",
  borderRadius: 14,
  background: "#171c26",
  padding: 14,
  marginBottom: 14,
};

const titulo = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  color: "#8b93a7",
  marginBottom: 10,
};

/**
 * Instala el stub global SIR y el script widgetloader de Sportradar (mismo
 * patron que documenta Sportradar: las llamadas se encolan hasta que carga).
 */

export default function RadarLmt({ sport = "soccer", eventId }) {
  const [config, setConfig] = useState(null);
  const [falloEn, setFalloEn] = useState(null);
  const contenedor = useRef(null);

  // 1) Preguntar al backend si este partido puede usar el widget licenciado.
  useEffect(() => {
    if (sport !== "soccer" || !eventId) return undefined;
    const sesion = getStoredSession();
    if (!sesion) return undefined;

    let cancelado = false;
    (async () => {
      try {
        const r = await fetchRadarWidget(sesion, sport, eventId);
        if (!cancelado) setConfig(r || { disponible: false, motivo: "error" });
      } catch {
        if (!cancelado) setConfig({ disponible: false, motivo: "error" });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [sport, eventId]);

  const disponible = Boolean(config?.disponible && config?.loader && config?.match_id);
  const idContenedor = disponible
    ? `sr-lmt-${String(config.match_id).replace(/[^a-zA-Z0-9]/g, "")}`
    : null;
  // El fallo se guarda por partido: asi no hace falta resetear estado dentro
  // del efecto y un partido sin widget no "contamina" al siguiente.
  const fallo = Boolean(idContenedor) && falloEn === idContenedor;

  // 2) Cargar el loader y pedir el widget. Si no pinta nada en unos segundos
  //    (clientId sin entitlement, script bloqueado...), se cae al radar propio.
  useEffect(() => {
    if (!disponible || !idContenedor || falloEn === idContenedor) return undefined;

    let vivo = true;
    let espera = null;
    montarLoader(config.loader);

    const montar = window.setTimeout(() => {
      if (!vivo) return;
      try {
        agregarWidget(`#${idContenedor}`, "match.lmtPlus", {
          matchId: config.match_id,
          layout: config.layout,
        });
      } catch {
        setFalloEn(idContenedor);
        return;
      }

      espera = window.setTimeout(() => {
        if (!vivo) return;
        const nodo = contenedor.current || document.getElementById(idContenedor);
        if (!nodo || nodo.childElementCount === 0) setFalloEn(idContenedor);
      }, ESPERA_WIDGET_MS);
    }, 50);

    return () => {
      vivo = false;
      window.clearTimeout(montar);
      if (espera) window.clearTimeout(espera);
    };
  }, [disponible, idContenedor, config, falloEn]);

  if (sport !== "soccer") return null;
  // Consultando la config del widget: es una llamada corta, sin spinner propio
  // para no duplicar el "Cargando radar" del mapa de tiros.
  if (!config) return null;
  if (!disponible || fallo) return <RadarPartido sport={sport} eventId={eventId} />;

  return (
    <div style={caja}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ ...titulo, marginBottom: 0 }}>Radar del partido</span>
        <span style={{ fontSize: 10, color: "#6b7280" }}>Sportradar · LMT</span>
      </div>

      <div
        key={idContenedor}
        ref={contenedor}
        id={idContenedor}
        style={{ maxWidth: 560, margin: "0 auto", minHeight: 320 }}
      />
    </div>
  );
}
