/**
 * Props - 3SIXTYBETS
 * Props de jugador: solo las que el jugador cumplio al menos el 60% de sus
 * ultimos partidos (lo filtra el backend con PROPS_PCT_MINIMA).
 *
 * Layout: el shell es body{overflow:hidden} + .main{overflow:hidden}, asi que
 * ESTA pagina es su propio contenedor con scroll (igual que .messages).
 */

import { useEffect, useMemo, useState } from "react";
import { fetchProps, fetchPropsTrack } from "../services/api";
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "./ui/pagination";
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


/* Tabla (escritorio): misma informacion que la tarjeta pero escaneable en
   columnas. En movil se sigue usando la tarjeta: una tabla de 5 columnas en
   390px obligaria a scroll horizontal, que es justo lo que se elimino. */
function TablaProps({ filas }) {
  return (
    <div className="props-tabla">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Jugador</TableHead>
            <TableHead>Prop</TableHead>
            <TableHead className="text-right">Racha</TableHead>
            <TableHead className="text-right">Cuota</TableHead>
            <TableHead className="text-right">Edge</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((p) => {
            const positivo = p.edge != null && p.edge > 0;
            return (
              <TableRow
                key={p.id || `${p.jugador}-${p.prop}-${p.linea}-${p.lado}`}
              >
                <TableCell>
                  <div className="props-tabla-jugador">
                    <span className="props-avatar props-avatar--sm">
                      {iniciales(p.jugador)}
                    </span>
                    <span className="props-tabla-id">
                      <b>{p.jugador}</b>
                      <small>{p.equipo || "—"}</small>
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="props-tabla-prop">
                    <span>{p.prop_raw || p.prop}</span>
                    <Badge variant="neutral">
                      {p.lado === "under" ? "MENOS" : "MÁS"} {p.linea}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <b>
                    {p.cumple ?? 0}/{p.n_partidos ?? 0}
                  </b>
                  <small>{p.pct != null ? ` · ${p.pct}%` : ""}</small>
                </TableCell>
                <TableCell className="text-right">
                  <b>
                    {p.cuota != null && !isNaN(Number(p.cuota))
                      ? Number(p.cuota).toFixed(2)
                      : "-"}
                  </b>
                  <small>{p.implicita ?? "-"}%</small>
                </TableCell>
                <TableCell className="text-right">
                  {p.edge != null ? (
                    <Badge variant={positivo ? "success" : "destructive"}>
                      {positivo ? "+" : ""}
                      {p.edge}%
                    </Badge>
                  ) : (
                    <span className="props-tabla-dash">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
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
  // Paginacion: la API puede devolver 100+ props; en un solo grid no hay
  // forma de recorrerlos.
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 12;

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

  // Cualquier cambio de filtro/orden vuelve a la primera pagina. Se hace en
  // los handlers (no en un useEffect) para no disparar renders en cascada.
  const totalPaginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const paginadas = visibles.slice(
    (paginaActual - 1) * POR_PAGINA,
    paginaActual * POR_PAGINA
  );


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
            onClick={() => {
              if (sport !== d.key) setSport(d.key);
              setPagina(1);
            }}
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
            onChange={(e) => {
              setQ(e.target.value);
              setPagina(1);
            }}
            aria-label="Buscar jugador"
          />
          <div className="props-chips">
            <button
              type="button"
              className={`props-chip ${!soloMas ? "on" : ""}`}
              onClick={() => {
                setSoloMas(false);
                setPagina(1);
              }}
            >
              Todas
            </button>
            <button
              type="button"
              className={`props-chip ${soloMas ? "on" : ""}`}
              onClick={() => {
                setSoloMas(true);
                setPagina(1);
              }}
            >
              Solo MAS
            </button>
          </div>
          <select
            className="props-sort"
            value={orden}
            onChange={(e) => {
              setOrden(e.target.value);
              setPagina(1);
            }}
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
          <>
            {/* Escritorio: tabla paginada */}
            <div className="props-solo-desktop">
              <TablaProps filas={paginadas} />
            </div>

            {/* Movil: tarjeta (una tabla de 5 columnas en 390px no cabe) */}
            <div className="props-solo-movil">
              <div className="props-grid">
                {paginadas.map((p, i) => (
                  <Tarjeta
                    key={p.id || `${p.jugador}-${p.prop}-${p.linea}-${p.lado}`}
                    p={p}
                    indice={i}
                  />
                ))}
              </div>
            </div>

            {totalPaginas > 1 && (
              <Pagination className="props-paginacion">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      size="default"
                      aria-label="Pagina anterior"
                      aria-disabled={paginaActual === 1}
                      className={
                        paginaActual === 1 ? "pointer-events-none opacity-40" : ""
                      }
                      onClick={(e) => {
                        e.preventDefault();
                        setPagina((n) => Math.max(1, n - 1));
                      }}
                    >
                      ‹ Anterior
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <span className="props-paginacion-info">
                      Pagina {paginaActual} de {totalPaginas} ·{" "}
                      {visibles.length} props
                    </span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink
                      href="#"
                      size="default"
                      aria-label="Pagina siguiente"
                      aria-disabled={paginaActual === totalPaginas}
                      onClick={(e) => {
                        e.preventDefault();
                        setPagina((n) => Math.min(totalPaginas, n + 1));
                      }}
                    >
                      Siguiente ›
                    </PaginationLink>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </>
        )}
      </div>
    </div>
  );
}

