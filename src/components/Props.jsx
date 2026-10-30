/**
 * Props - 3SIXTYBETS
 * Props de jugador: para cada prop que publica el bookmaker, en cuantos de
 * sus ultimos N partidos el jugador cumplio la linea, con cuota y edge.
 *
 * Layout: el shell de la app es body{overflow:hidden} + .main{overflow:hidden},
 * asi que ESTA pagina es su propio contenedor con scroll (igual que .messages
 * del chat). Sin eso el contenido se recortaba y no se podia recorrer bien.
 *
 * Los datos los prepara el backend (props_scheduler, cada 90 min): la pagina
 * solo lee.
 */

import { useEffect, useState } from "react";
import { fetchProps } from "../services/api";
import "./Props.css";

const DEPORTES = [
  { key: "soccer", label: "Futbol", icon: "⚽" },
  { key: "nba", label: "NBA", icon: "🏀" },
  { key: "nfl", label: "NFL", icon: "🏈" },
];

function iniciales(nombre) {
  const partes = String(nombre || "?").trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function Barras({ valores, linea, lado }) {
  if (!valores || !valores.length) {
    return <div className="props-barras props-barras--vacio">sin historico</div>;
  }
  const max = Math.max(linea || 0, ...valores, 1);
  return (
    <div className="props-barras" aria-label={`Ultimos ${valores.length} partidos`}>
      {valores.map((valor, i) => {
        const cumple = lado === "under" ? valor <= linea : valor >= linea;
        const alto = Math.max(20, Math.round((valor / max) * 100));
        return (
          <div
            key={i}
            className={`props-barra ${cumple ? "ok" : "no"}`}
            style={{ height: `${alto}%`, animationDelay: `${120 + i * 70}ms` }}
            title={`Partido ${i + 1}: ${valor}`}
          >
            <span>{valor}</span>
          </div>
        );
      })}
    </div>
  );
}

function Tarjeta({ p, indice }) {
  const [sinFoto, setSinFoto] = useState(!p.foto);
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
        </div>
      </header>

      <div className="props-prop">
        <span className="props-prop-name">{p.prop_raw || p.prop}</span>
        <span className={`props-lado ${p.lado === "under" ? "under" : "over"}`}>
          {p.lado === "under" ? "MENOS" : "MAS"} {p.linea}
        </span>
      </div>

      <Barras valores={p.valores} linea={p.linea} lado={p.lado} />

      <footer className="props-foot">
        <span className="props-racha">
          <b>{p.cumple ?? 0}</b>/{p.n_partidos ?? 0}
          {p.pct != null ? ` · ${p.pct}%` : ""}
        </span>
        {p.edge != null ? (
          <span className={`props-edge ${positivo ? "pos" : "neg"}`}>
            {positivo ? "▲" : "▼"} {p.edge > 0 ? "+" : ""}
            {p.edge}%
          </span>
        ) : (
          <span className="props-edge neutro">sin edge</span>
        )}
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
  const [error, setError] = useState("");
  const [actualizado, setActualizado] = useState(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    let vivo = true;
    setEstado("cargando");
    setError("");

    fetchProps(session, sport)
      .then((data) => {
        if (!vivo) return;
        setProps(data?.props || []);
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

  const conEdge = props.filter((p) => p.edge != null && p.edge > 0).length;

  return (
    <div className="props-page">
      <div className="props-head">
        <div>
          <h1>
            Props de jugador <span className="props-badge">LIVE</span>
          </h1>
          <p>
            En cuantos de sus ultimos 5 partidos el jugador cumplio la linea,
            frente a la cuota que paga el bookmaker.
          </p>
        </div>

        {estado === "ok" && props.length > 0 && (
          <div className="props-resumen">
            <div>
              <strong>{props.length}</strong>
              <small>props</small>
            </div>
            <div>
              <strong className="verde">{conEdge}</strong>
              <small>con valor</small>
            </div>
            {actualizado && (
              <div>
                <strong>{actualizado.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</strong>
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
            <h2>Sin props ahora mismo</h2>
            <p>
              El bookmaker no publica props de jugador en este deporte en este
              momento. Se actualiza solo cada 90 minutos.
            </p>
          </div>
        )}

        {estado === "ok" && props.length > 0 && (
          <div className="props-grid">
            {props.map((p, i) => (
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

