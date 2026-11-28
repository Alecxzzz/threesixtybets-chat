/**
 * Props - 3SIXTYBETS
 * Props de jugador: cada prop que publica el bookmaker con la racha real del
 * jugador en sus ultimos 5 partidos.
 *
 * Layout: el shell es body{overflow:hidden} + .main{overflow:hidden}, asi que
 * ESTA pagina es su propio contenedor con scroll (igual que .messages).
 *
 * Organizacion:
 *   - Agrupado por PARTIDO (liga + equipos + hora) para no perder el contexto.
 *   - Vista de tarjetas o TABLA (escritorio).
 *   - Filtros por tipo de prop (tiros, asistencias, Pts+Reb...). Goles fuera.
 *   - Paginacion por partidos ("Cargar mas").
 */

import { useEffect, useMemo, useState } from "react";
import { fetchProps, fetchPropsTrack } from "../services/api";
import "./Props.css";

const DEPORTES = [
  { key: "soccer", label: "Futbol", icon: "⚽" },
  { key: "nba", label: "NBA", icon: "🏀" },
  { key: "nfl", label: "NFL", icon: "🏈" },
];

const ORDENES = [
  { key: "edge", label: "Mas edge" },
  { key: "ajustado", label: "Edge ajustado" },
  { key: "pct", label: "Mas cumplimiento" },
  { key: "cuota", label: "Cuota mas baja" },
];

// Etiqueta legible de cada tipo de prop (clave canonica del backend).
const ETIQUETAS_PROP = {
  // futbol
  goles: "Goles",
  asistencias: "Asistencias",
  remates: "Tiros",
  remates_puerta: "Tiros a puerta",
  faltas: "Faltas",
  offsides: "Offsides",
  // nba
  puntos: "Puntos",
  rebotes: "Rebotes",
  triples: "Triples",
  robos: "Robos",
  tapones: "Tapones",
  puntos_rebotes: "Pts + Reb",
  puntos_asistencias: "Pts + Ast",
  rebotes_asistencias: "Reb + Ast",
  puntos_rebotes_asistencias: "Pts + Reb + Ast",
  dobles_dobles: "Dobles-dobles",
  triples_dobles: "Triples-dobles",
  // nfl
  yardas_pase: "Yardas de pase",
  td_pase: "TD de pase",
  yardas_recepcion: "Yardas de recepcion",
  recepciones: "Recepciones",
  yardas_carrera: "Yardas de carrera",
  td_carrera: "TD de carrera",
  intercepciones: "Intercepciones",
  sacks: "Sacks",
};

const ORDEN_PROPS = Object.keys(ETIQUETAS_PROP);

const GRUPOS_POR_PAGINA = 4;

function etiquetaProp(prop, propRaw) {
  return ETIQUETAS_PROP[prop] || propRaw || prop || "—";
}

function iniciales(nombre) {
  const partes = String(nombre || "?").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function fmtEvento(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  try {
    return d.toLocaleString([], {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function fmtDia(fecha) {
  const txt = String(fecha || "").slice(5);
  return txt ? txt.replace("-", "/") : "";
}

function Barras({ valores, linea, lado, detalle }) {
  if (!valores || !valores.length) {
    return <div className="props-barras props-barras--vacio">sin historico</div>;
  }
  const max = Math.max(linea || 0, ...valores, 1);
  // Altura real de la linea dentro del grafico (para pintarla de referencia).
  const ref = linea > 0 ? Math.min(100, Math.max(0, (Number(linea) / max) * 100)) : null;
  return (
    <div className="props-barras" aria-label={`Ultimos ${valores.length} partidos`}>
      {valores.map((valor, i) => {
        const cumple = lado === "under" ? valor <= linea : valor >= linea;
        const alto = Math.max(14, Math.round((valor / max) * 100));
        const d = (detalle && detalle[i]) || {};
        const rival = d.rival ? (d.casa === false ? `@ ${d.rival}` : `vs ${d.rival}`) : "";
        const titulo = [rival, d.fecha, `${valor}`].filter(Boolean).join(" · ");
        return (
          <div className="props-barra-col" key={i}>
            <div className="props-barra-wrap">
              {ref != null && (
                <span
                  className="props-ref"
                  style={{ bottom: `${ref}%` }}
                  aria-hidden="true"
                />
              )}
              <div
                className={`props-barra ${cumple ? "ok" : "no"}`}
                style={{ height: `${alto}%`, animationDelay: `${120 + i * 70}ms` }}
                title={titulo}
              />
            </div>
            <span className="props-barra-val">{valor}</span>
            <span className="props-barra-fecha">{fmtDia(d.fecha)}</span>
          </div>
        );
      })}
    </div>
  );
}

function Comparativa({ pct, implicita }) {
  const real = Math.max(0, Math.min(100, pct || 0));
  const paga = Math.max(0, Math.min(100, implicita || 0));
  const gana = real > paga + 0.5;
  return (
    <div className="props-cmp">
      <div className="props-cmp-row">
        <span>real</span>
        <div className="props-cmp-track">
          <div
            className={`props-cmp-fill real ${gana ? "bien" : "mal"}`}
            style={{ width: `${real}%`, animationDelay: "180ms" }}
          />
        </div>
        <b>{pct != null ? `${pct}%` : "-"}</b>
      </div>
      <div className="props-cmp-row">
        <span>paga</span>
        <div className="props-cmp-track">
          <div
            className="props-cmp-fill paga"
            style={{ width: `${paga}%`, animationDelay: "260ms" }}
          />
        </div>
        <b>{implicita != null ? `${implicita}%` : "-"}</b>
      </div>
    </div>
  );
}

function Tarjeta({ p, indice }) {
  const [sinFoto, setSinFoto] = useState(!p.foto);
  const valores = Array.isArray(p.valores) ? p.valores.map(Number) : [];
  const media = valores.length
    ? valores.reduce((a, b) => a + b, 0) / valores.length
    : null;
  const maximo = valores.length ? Math.max(...valores) : null;
  const positivo = p.edge != null && p.edge > 0;

  return (
    <article className="props-card" style={{ "--i": Math.min(indice, 16) }}>
      <header className="props-card-top">
        <div className="props-avatar">
          {sinFoto ? (
            p.equipo_logo ? (
              <img
                className="props-avatar-escudo"
                src={p.equipo_logo}
                alt={p.equipo || ""}
                loading="lazy"
              />
            ) : (
              <span>{iniciales(p.jugador)}</span>
            )
          ) : (
            <img
              src={p.foto}
              alt={p.jugador}
              loading="lazy"
              onError={() => setSinFoto(true)}
            />
          )}
        </div>

        <div className="props-id">
          <h3 title={p.jugador}>{p.jugador}</h3>
          <small>{p.equipo || "—"}</small>
        </div>

        <div className="props-cuota">
          <strong>
            {p.cuota != null && !isNaN(Number(p.cuota))
              ? Number(p.cuota).toFixed(2)
              : "-"}
          </strong>
          <em>{p.implicita ?? "-"}%</em>
          {p.cuota_justa != null && (
            <span className="props-justa" title="Cuota que deberia pagar segun su historico">
              justa{" "}
              {isNaN(Number(p.cuota_justa))
                ? p.cuota_justa
                : Number(p.cuota_justa).toFixed(2)}
            </span>
          )}
        </div>
      </header>

      <div className="props-prop">
        <span className="props-prop-name">{p.prop_raw || p.prop}</span>
        <span className={`props-lado ${p.lado === "under" ? "under" : "over"}`}>
          {p.lado === "under" ? "MENOS" : "MAS"} {p.linea}
        </span>
        {(p.estado === "ACIERTO" || p.estado === "FALLO") && (
          <span className={`props-veredicto ${p.estado === "ACIERTO" ? "ok" : "no"}`}>
            {p.estado === "ACIERTO" ? "✓" : "✗"}
            {p.valor_real != null ? ` ${p.valor_real}` : ""}
          </span>
        )}
      </div>

      <Barras
        valores={p.valores}
        linea={p.linea}
        lado={p.lado}
        detalle={p.detalle}
      />

      <div className="props-media">
        <span>
          media <b>{media != null ? media.toFixed(1) : "-"}</b>{" "}
          <em>{String(p.prop_raw || p.prop).toLowerCase()}</em>
        </span>
        <span>
          max <b>{maximo != null ? maximo : "-"}</b>
        </span>
      </div>

      <Comparativa pct={p.pct} implicita={p.implicita} />

      <footer className="props-foot">
        <span className="props-racha">
          <b>{p.cumple ?? 0}</b>/{p.n_partidos ?? 0}
          {p.pct != null ? ` · ${p.pct}%` : ""}
        </span>
        <span className="props-edges">
          {p.edge != null && (
            <span className={`props-edge ${positivo ? "pos" : "neg"}`}>
              {positivo ? "▲" : "▼"} {p.edge > 0 ? "+" : ""}
              {p.edge}%
            </span>
          )}
          {p.edge_ajustado != null && (
            <span
              className={`props-edge suave ${p.edge_ajustado > 0 ? "pos" : "neg"}`}
              title="Edge con el limite inferior del intervalo (version honesta)"
            >
              adj {p.edge_ajustado > 0 ? "+" : ""}
              {p.edge_ajustado}%
            </span>
          )}
        </span>
      </footer>
    </article>
  );
}

function Esqueleto() {
  return (
    <div className="props-grid" aria-hidden="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <div className="props-card props-skeleton" key={i}>
          <div className="sk-row">
            <div className="sk-avatar" />
            <div className="sk-col">
              <div className="sk-line w70" />
              <div className="sk-line w40" />
            </div>
          </div>
          <div className="sk-line w55" />
          <div className="sk-bars">
            <span /><span /><span /><span /><span />
          </div>
        </div>
      ))}
    </div>
  );
}

function EquipoCabecera({ nombre, escudo }) {
  return (
    <span className="props-grupo-equipo">
      {escudo ? (
        <img className="props-grupo-escudo" src={escudo} alt="" loading="lazy" />
      ) : null}
      <span>{nombre || "—"}</span>
    </span>
  );
}

function GrupoCabecera({ grupo }) {
  const hora = fmtEvento(grupo.fecha);
  const conEquipos = Boolean(grupo.local || grupo.visita);
  return (
    <div className="props-grupo-head" title={grupo.liga || undefined}>
      <div className="props-grupo-info">
        {conEquipos ? (
          <div className="props-grupo-partido">
            <EquipoCabecera nombre={grupo.local} escudo={grupo.local_escudo} />
            <span className="props-grupo-vs">vs</span>
            <EquipoCabecera nombre={grupo.visita} escudo={grupo.visita_escudo} />
          </div>
        ) : (
          <strong>{grupo.evento || "Partido"}</strong>
        )}
      </div>
      <div className="props-grupo-meta">
        {hora && <span>{hora}</span>}
        <span>{grupo.props.length} props</span>
      </div>
    </div>
  );
}

const COLUMNAS_TABLA = [
  { key: "jugador", label: "Jugador" },
  { key: "prop", label: "Prop" },
  { key: null, label: "Linea" },
  { key: "cuota", label: "Cuota" },
  { key: "pct", label: "Racha" },
  { key: "edge_ajustado", label: "Adj" },
  { key: "edge", label: "Edge" },
];

function TablaProps({ grupo, tOrden, onOrdenar }) {
  return (
    <div className="props-tabla-wrap">
      <table className="props-tabla">
        <thead>
          <tr>
            {COLUMNAS_TABLA.map((col) => (
              <th
                key={col.label}
                className={col.key ? "ordenable" : ""}
                onClick={col.key ? () => onOrdenar(col.key) : undefined}
                title={col.key ? "Ordenar por esta columna" : undefined}
              >
                {col.label}
                {col.key && tOrden.clave === col.key ? (
                  <span className="props-th-flecha">{tOrden.dir === -1 ? "↓" : "↑"}</span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grupo.props.map((p) => (
            <tr key={p.id || `${p.jugador}-${p.prop}-${p.linea}-${p.lado}`}>
              <td>
                <span className="props-tabla-jugador">
                  <span className="props-avatar props-avatar--mini">
                    {p.foto ? (
                      <img src={p.foto} alt="" loading="lazy" />
                    ) : p.equipo_logo ? (
                      <img
                        className="props-avatar-escudo"
                        src={p.equipo_logo}
                        alt={p.equipo || ""}
                        loading="lazy"
                      />
                    ) : (
                      <span>{iniciales(p.jugador)}</span>
                    )}
                  </span>
                  <span>
                    <b>{p.jugador}</b>
                    <small>{p.equipo || "—"}</small>
                  </span>
                </span>
              </td>
              <td className="props-tabla-prop">{p.prop_raw || p.prop}</td>
              <td>
                <span className={`props-lado ${p.lado === "under" ? "under" : "over"}`}>
                  {p.lado === "under" ? "MENOS" : "MAS"} {p.linea}
                </span>
              </td>
              <td className="num">
                {p.cuota != null && !isNaN(Number(p.cuota)) ? Number(p.cuota).toFixed(2) : "-"}
              </td>
              <td className="num">
                <b>{p.cumple ?? 0}/{p.n_partidos ?? 0}</b>
                {p.pct != null ? <small>{p.pct}%</small> : null}
              </td>
              <td className="num">
                {p.edge_ajustado != null ? (
                  <span className={`props-edge ${p.edge_ajustado > 0 ? "pos" : "neg"}`}>
                    {p.edge_ajustado > 0 ? "+" : ""}
                    {p.edge_ajustado}%
                  </span>
                ) : "-"}
              </td>
              <td className="num">
                {p.edge != null ? (
                  <span className={`props-edge suave ${p.edge > 0 ? "pos" : "neg"}`}>
                    {p.edge > 0 ? "+" : ""}
                    {p.edge}%
                  </span>
                ) : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Props({ session }) {
  const [sport, setSport] = useState("soccer");
  const [estado, setEstado] = useState("cargando");
  const [props, setProps] = useState([]);
  const [meta, setMeta] = useState({ pct_minima: 60, descartadas: 0, origen: "" });
  const [error, setError] = useState("");
  const [actualizado, setActualizado] = useState(null);
  const [intento, setIntento] = useState(0);
  const [orden, setOrden] = useState("edge");
  const [soloMas, setSoloMas] = useState(false);
  const [q, setQ] = useState("");
  const [record, setRecord] = useState(null);
  const [vista, setVista] = useState("tarjetas");
  const [tipos, setTipos] = useState([]);
  const [soloAdj, setSoloAdj] = useState(false);
  const [ligaFiltro, setLigaFiltro] = useState("");
  const [pagina, setPagina] = useState(1);
  const [tOrden, setTOrden] = useState({ clave: "edge_ajustado", dir: -1 });

  useEffect(() => {
    let vivo = true;
    fetchPropsTrack(session, 7)
      .then((d) => { if (vivo) setRecord(d?.total || null); })
      .catch(() => { if (vivo) setRecord(null); });
    return () => { vivo = false; };
  }, [session, intento]);

  useEffect(() => {
    let vivo = true;
    setEstado("cargando");
    setError("");

    fetchProps(session, sport)
      .then((data) => {
        if (!vivo) return;
        // Goles fuera: era lo unico que aparecia (lineas 0.5) y tapaba al
        // resto de mercados. El chip desaparece solo al no haber props.
        setProps((data?.props || []).filter((p) => p.prop !== "goles"));
        setMeta({
          pct_minima: data?.pct_minima ?? 60,
          descartadas: data?.descartadas_por_pct ?? 0,
          origen: data?.origen || "",
        });
        setActualizado(new Date());
        setEstado("ok");
      })
      .catch((err) => {
        if (!vivo) return;
        setError(err?.message || "No se pudieron cargar los props.");
        setEstado("error");
      });

    return () => {
      vivo = false;
    };
  }, [sport, session, intento]);

  // Tipos de prop presentes AHORA (para no ofrecer filtros vacios) y ligas.
  const tiposDisponibles = useMemo(() => {
    const presentes = new Set(props.map((p) => p.prop).filter(Boolean));
    const ordenados = ORDEN_PROPS.filter((k) => presentes.has(k));
    const extra = [...presentes].filter((k) => !ORDEN_PROPS.includes(k));
    return [...ordenados, ...extra];
  }, [props]);

  const ligasDisponibles = useMemo(() => {
    return [...new Set(props.map((p) => p.liga).filter(Boolean))]
      .sort((a, b) => String(a).localeCompare(String(b)));
  }, [props]);

  useEffect(() => {
    setPagina(1);
  }, [sport, q, orden, soloMas, soloAdj, ligaFiltro, tipos.join(",")]);

  useEffect(() => {
    // Si el deporte cambia, no arrastrar filtros del anterior.
    setTipos([]);
    setLigaFiltro("");
  }, [sport]);

  const listaFiltrada = useMemo(() => {
    let lista = props;
    if (soloMas) lista = lista.filter((p) => p.lado !== "under");
    if (soloAdj) {
      lista = lista.filter((p) => p.edge_ajustado != null && p.edge_ajustado > 0);
    }
    if (tipos.length) lista = lista.filter((p) => tipos.includes(p.prop));
    if (ligaFiltro) lista = lista.filter((p) => p.liga === ligaFiltro);
    const texto = q.trim().toLowerCase();
    if (texto) {
      lista = lista.filter((p) =>
        String(p.jugador || "").toLowerCase().includes(texto)
      );
    }
    return lista;
  }, [props, soloMas, soloAdj, tipos, ligaFiltro, q]);

  function compararTabla(a, b) {
    const k = tOrden.clave;
    const valor = (p) => {
      if (k === "jugador") return String(p.jugador || "");
      if (k === "prop") return String(p.prop_raw || p.prop || "");
      if (k === "cuota") return p.cuota ?? 99;
      if (k === "pct") return p.pct ?? -999;
      if (k === "edge_ajustado") return p.edge_ajustado ?? -999;
      return p.edge ?? -999;
    };
    const va = valor(a);
    const vb = valor(b);
    if (typeof va === "string" || typeof vb === "string") {
      return String(va).localeCompare(String(vb)) * tOrden.dir;
    }
    return (va - vb) * tOrden.dir;
  }

  const grupos = useMemo(() => {
    const mapa = new Map();
    listaFiltrada.forEach((p) => {
      const key = p.evento_id || p.evento || `${p.jugador}-${p.prop}`;
      if (!mapa.has(key)) {
        mapa.set(key, {
          key,
          evento: p.evento,
          liga: p.liga,
          fecha: p.fecha_evento,
          local: p.local,
          local_escudo: p.local_escudo,
          visita: p.visita,
          visita_escudo: p.visita_escudo,
          props: [],
        });
      }
      mapa.get(key).props.push(p);
    });

    const claveOrden = {
      edge: (p) => -(p.edge ?? -999),
      ajustado: (p) => -(p.edge_ajustado ?? -999),
      pct: (p) => -(p.pct ?? 0),
      cuota: (p) => p.cuota ?? 99,
    }[orden];

    const arr = [...mapa.values()];
    arr.forEach((g) => {
      g.props.sort(vista === "tabla" ? compararTabla : (a, b) => claveOrden(a) - claveOrden(b));
    });
    // Partidos mas proximos primero.
    arr.sort((a, b) => {
      const fa = String(a.fecha || "");
      const fb = String(b.fecha || "");
      return fa.localeCompare(fb) || String(a.evento || "").localeCompare(String(b.evento || ""));
    });
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listaFiltrada, orden, vista, tOrden.clave, tOrden.dir]);

  const gruposVisibles = useMemo(
    () => grupos.slice(0, pagina * GRUPOS_POR_PAGINA),
    [grupos, pagina]
  );
  const hayMas = gruposVisibles.length < grupos.length;

  const conValor = props.filter((p) => p.edge_ajustado != null && p.edge_ajustado > 0).length;

  function toggleTipo(tipo) {
    setTipos((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo]
    );
  }

  function ordenarTabla(clave) {
    setTOrden((prev) =>
      prev.clave === clave ? { clave, dir: prev.dir * -1 } : { clave, dir: -1 }
    );
  }

  return (
    <div className="props-page">
      <div className="props-head">
        <div>
          <h1>
            Props de jugador
            {meta.pct_minima > 0 && (
              <span className="props-badge">+{meta.pct_minima}%</span>
            )}
          </h1>
          <p>
            {meta.pct_minima > 0 ? (
              <>
                Solo props que el jugador cumplio al menos el {meta.pct_minima}%
                de sus ultimos 5 partidos, frente a la cuota que paga el
                bookmaker.
              </>
            ) : (
              <>
                Props del dia frente a la cuota que paga el bookmaker: la racha
                del jugador contra la probabilidad implicita.
              </>
            )}
            {meta.descartadas > 0
              ? ` ${meta.descartadas} descartadas por debajo del minimo.`
              : ""}
          </p>
        </div>

        {estado === "ok" && props.length > 0 && (
          <div className="props-resumen">
            <div>
              <strong>{props.length}</strong>
              <small>props</small>
            </div>
            <div>
              <strong className="verde">{conValor}</strong>
              <small>con valor</small>
            </div>
            {actualizado && (
              <div>
                <strong>
                  {actualizado.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>
                <small>actualizado</small>
              </div>
            )}
          </div>
        )}
      </div>

      {record && record.resueltos > 0 && (
        <div className="props-record">
          <span className="props-record-title">Ultimos 7 dias</span>
          <span><b>{record.efectividad}%</b> acierto</span>
          <span>{record.aciertos}/{record.resueltos} props</span>
          <span className={record.roi >= 0 ? "verde" : "rojo"}>
            ROI {record.roi > 0 ? "+" : ""}
            {record.roi}%
          </span>
        </div>
      )}

      <div className="props-tabs" role="tablist">
        {DEPORTES.map((d) => (
          <button
            key={d.key}
            type="button"
            role="tab"
            aria-selected={sport === d.key}
            className={`props-tab ${sport === d.key ? "on" : ""}`}
            onClick={() => sport !== d.key && setSport(d.key)}
          >
            <span aria-hidden="true">{d.icon}</span> {d.label}
          </button>
        ))}
      </div>

      {estado === "ok" && props.length > 0 && (
        <div className="props-toolbar">
          <div className="props-toolbar-fila">
            <input
              className="props-search"
              type="search"
              placeholder="Buscar jugador..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Buscar jugador"
            />
            <select
              className="props-sort"
              value={orden}
              onChange={(e) => setOrden(e.target.value)}
              aria-label="Ordenar"
            >
              {ORDENES.map((o) => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
            <div className="props-vista" role="group" aria-label="Vista">
              <button
                type="button"
                className={`props-vista-btn ${vista === "tarjetas" ? "on" : ""}`}
                onClick={() => setVista("tarjetas")}
              >
                Tarjetas
              </button>
              <button
                type="button"
                className={`props-vista-btn ${vista === "tabla" ? "on" : ""}`}
                onClick={() => setVista("tabla")}
              >
                Tabla
              </button>
            </div>
          </div>

          <div className="props-toolbar-fila props-toolbar-filtros">
            <div className="props-tipos" aria-label="Filtrar por tipo de prop">
              <button
                type="button"
                className={`props-tipo ${!tipos.length ? "on" : ""}`}
                onClick={() => setTipos([])}
              >
                Todos
              </button>
              {tiposDisponibles.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`props-tipo ${tipos.includes(t) ? "on" : ""}`}
                  onClick={() => toggleTipo(t)}
                  aria-pressed={tipos.includes(t)}
                >
                  {etiquetaProp(t)}
                </button>
              ))}
            </div>

            <div className="props-toolbar-extra">
              {ligasDisponibles.length > 1 && (
                <select
                  className="props-sort props-liga"
                  value={ligaFiltro}
                  onChange={(e) => setLigaFiltro(e.target.value)}
                  aria-label="Filtrar por liga"
                >
                  <option value="">Todas las ligas</option>
                  {ligasDisponibles.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              )}
              <button
                type="button"
                className={`props-chip ${soloMas ? "on" : ""}`}
                onClick={() => setSoloMas((v) => !v)}
              >
                Solo MAS
              </button>
              <button
                type="button"
                className={`props-chip ${soloAdj ? "on" : ""}`}
                onClick={() => setSoloAdj((v) => !v)}
                title="Solo props con edge ajustado positivo (limite inferior de Wilson)"
              >
                Solo adj &gt; 0
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="props-body">
        {estado === "cargando" && <Esqueleto />}

        {estado === "error" && (
          <div className="props-empty">
            <h2>No se pudieron cargar los props</h2>
            <p>{error}</p>
            <button type="button" onClick={() => setIntento((n) => n + 1)}>
              Reintentar
            </button>
          </div>
        )}

        {estado === "ok" && props.length === 0 && (
          <div className="props-empty">
            <h2>Ninguna prop supera el {meta.pct_minima}%</h2>
            <p>
              Ahora mismo el bookmaker no publica props que el jugador haya
              cumplido al menos el {meta.pct_minima}% de sus ultimos 5
              partidos. Se recalcula solo cada 90 minutos.
            </p>
          </div>
        )}

        {estado === "ok" && props.length > 0 && listaFiltrada.length === 0 && (
          <div className="props-empty">
            <h2>Sin resultados</h2>
            <p>Ajusta la busqueda o quita los filtros activos.</p>
            <button
              type="button"
              onClick={() => {
                setQ("");
                setTipos([]);
                setSoloMas(false);
                setSoloAdj(false);
                setLigaFiltro("");
              }}
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {estado === "ok" && gruposVisibles.map((grupo) => (
          <section className="props-grupo" key={grupo.key}>
            <GrupoCabecera grupo={grupo} />
            {vista === "tarjetas" ? (
              <div className="props-grid">
                {grupo.props.map((p, i) => (
                  <Tarjeta
                    key={p.id || `${p.jugador}-${p.prop}-${p.linea}-${p.lado}`}
                    p={p}
                    indice={i}
                  />
                ))}
              </div>
            ) : (
              <TablaProps
                grupo={grupo}
                tOrden={tOrden}
                onOrdenar={ordenarTabla}
              />
            )}
          </section>
        ))}

        {estado === "ok" && hayMas && (
          <div className="props-mas-wrap">
            <button
              type="button"
              className="props-mas"
              onClick={() => setPagina((n) => n + 1)}
            >
              Cargar mas partidos ({grupos.length - gruposVisibles.length} restantes)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
