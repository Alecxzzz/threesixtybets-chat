/**
 * Props - 3SIXTYBETS
 * Props de jugador: solo las que el jugador cumplio al menos el 60% de sus
 * ultimos partidos (lo filtra el backend con PROPS_PCT_MINIMA).
 *
 * Layout: el shell es body{overflow:hidden} + .main{overflow:hidden}, asi que
 * ESTA pagina es su propio contenedor con scroll (igual que .messages).
 */

import { useEffect, useMemo, useState } from "react";
import { fetchProps } from "../services/api";
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

function iniciales(nombre) {
  const partes = String(nombre || "?").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function Barras({ valores, linea, lado, detalle }) {
  if (!valores || !valores.length) {
    return <div className="props-barras props-barras--vacio">sin historico</div>;
  }
  const max = Math.max(linea || 0, ...valores, 1);
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
              <div
                className={`props-barra ${cumple ? "ok" : "no"}`}
                style={{ height: `${alto}%`, animationDelay: `${120 + i * 70}ms` }}
                title={titulo}
              />
            </div>
            <span className="props-barra-val">{valor}</span>
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
            <span>{iniciales(p.jugador)}</span>
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
          <strong>{p.cuota ?? "-"}</strong>
          <em>{p.implicita ?? "-"}%</em>
          {p.cuota_justa != null && (
            <span className="props-justa" title="Cuota que deberia pagar segun su historico">
              justa {p.cuota_justa}
            </span>
          )}
        </div>
      </header>

      <div className="props-prop">
        <span className="props-prop-name">{p.prop_raw || p.prop}</span>
        <span className={`props-lado ${p.lado === "under" ? "under" : "over"}`}>
          {p.lado === "under" ? "MENOS" : "MAS"} {p.linea}
        </span>
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

  useEffect(() => {
    let vivo = true;
    setEstado("cargando");
    setError("");

    fetchProps(session, sport)
      .then((data) => {
        if (!vivo) return;
        setProps(data?.props || []);
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

  const visibles = useMemo(() => {
    let lista = props;
    if (soloMas) lista = lista.filter((p) => p.lado !== "under");
    const texto = q.trim().toLowerCase();
    if (texto) {
      lista = lista.filter((p) =>
        String(p.jugador || "").toLowerCase().includes(texto));
    }
    const clave = {
      edge: (p) => -(p.edge ?? -999),
      ajustado: (p) => -(p.edge_ajustado ?? -999),
      pct: (p) => -(p.pct ?? 0),
      cuota: (p) => p.cuota ?? 99,
    }[orden];
    return [...lista].sort((a, b) => clave(a) - clave(b));
  }, [props, soloMas, q, orden]);

  const conValor = props.filter((p) => p.edge != null && p.edge > 0).length;


  return (
    <div className="props-page">
      <div className="props-head">
        <div>
          <h1>
            Props de jugador <span className="props-badge">+{meta.pct_minima}%</span>
          </h1>
          <p>
            Solo props que el jugador cumplio al menos el {meta.pct_minima}% de
            sus ultimos 5 partidos, frente a la cuota que paga el bookmaker.
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
          <input
            className="props-search"
            type="search"
            placeholder="Buscar jugador..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar jugador"
          />
          <div className="props-chips">
            <button
              type="button"
              className={`props-chip ${!soloMas ? "on" : ""}`}
              onClick={() => setSoloMas(false)}
            >
              Todas
            </button>
            <button
              type="button"
              className={`props-chip ${soloMas ? "on" : ""}`}
              onClick={() => setSoloMas(true)}
            >
              Solo MAS
            </button>
          </div>
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

        {estado === "ok" && props.length > 0 && visibles.length === 0 && (
          <div className="props-empty">
            <h2>Sin resultados</h2>
            <p>Ajusta la busqueda o quita el filtro de Solo MAS.</p>
          </div>
        )}

        {estado === "ok" && visibles.length > 0 && (
          <div className="props-grid">
            {visibles.map((p, i) => (
              <Tarjeta
                key={p.id || `${p.jugador}-${p.prop}-${p.linea}-${p.lado}`}
                p={p}
                indice={i}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

