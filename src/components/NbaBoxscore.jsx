/**
 * BOXSCORE EN VIVO de un partido NBA.
 *
 * ESPN publica la caja de jugadores (`players_box` del detalle) en cuanto el
 * partido arranca, y la ficha vuelve a pedir el detalle cada minuto
 * (REFRESH_MS en Stats.jsx): esto es la estadistica INDIVIDUAL DEL PARTIDO en
 * vivo, no los promedios de temporada (eso es NbaPlantilla).
 *
 * Una tabla por equipo (local primero) con la fila de TOTALES al pie. Cada
 * columna ordena al tocarla; las de tiro muestran "5-9" y ordenan por aciertos.
 */
import { useState } from "react";

const n1 = (v) => (v == null ? "-" : Number(v).toFixed(1));
const entero = (v) => (v == null ? "-" : String(Math.round(Number(v))));

const COLUMNAS = [
  { clave: "min", label: "MIN", orden: (j) => j.min, texto: (j) => entero(j.min) },
  { clave: "pts", label: "PTS", orden: (j) => j.pts, texto: (j) => entero(j.pts) },
  { clave: "reb", label: "REB", orden: (j) => j.reb, texto: (j) => entero(j.reb) },
  { clave: "ast", label: "AST", orden: (j) => j.ast, texto: (j) => entero(j.ast) },
  { clave: "stl", label: "ROB", orden: (j) => j.stl, texto: (j) => entero(j.stl) },
  { clave: "blk", label: "TAP", orden: (j) => j.blk, texto: (j) => entero(j.blk) },
  { clave: "to", label: "PER", orden: (j) => j.to, texto: (j) => entero(j.to) },
  {
    clave: "tc",
    label: "TC",
    orden: (j) => (j.fga ? (j.fgm || 0) / j.fga : -1),
    texto: (j) => `${entero(j.fgm)}-${entero(j.fga)}`,
  },
  {
    clave: "t3",
    label: "3P",
    orden: (j) => (j.fg3a ? (j.fg3m || 0) / j.fg3a : -1),
    texto: (j) => `${entero(j.fg3m)}-${entero(j.fg3a)}`,
  },
  {
    clave: "tl",
    label: "TL",
    orden: (j) => (j.fta ? (j.ftm || 0) / j.fta : -1),
    texto: (j) => `${entero(j.ftm)}-${entero(j.fta)}`,
  },
  { clave: "plus", label: "+/-", orden: (j) => j.plus, texto: (j) => entero(j.plus) },
  { clave: "ts", label: "TS%", orden: (j) => j.ts, texto: (j) => n1(j.ts), destacada: true },
];

const suma = (lista, clave) => lista.reduce((s, j) => s + (Number(j[clave]) || 0), 0);

/** Totales del equipo: los mismos numeros que se pintan en las filas. */
function totales(lista) {
  const fga = suma(lista, "fga");
  const fta = suma(lista, "fta");
  const pts = suma(lista, "pts");
  return {
    pts,
    reb: suma(lista, "reb"),
    ast: suma(lista, "ast"),
    stl: suma(lista, "stl"),
    blk: suma(lista, "blk"),
    to: suma(lista, "to"),
    fgm: suma(lista, "fgm"),
    fga,
    fg3m: suma(lista, "fg3m"),
    fg3a: suma(lista, "fg3a"),
    ftm: suma(lista, "ftm"),
    fta,
    plus: suma(lista, "plus"),
    ts: fga || fta ? Math.round((pts / (2 * (fga + 0.44 * fta))) * 1000) / 10 : null,
  };
}

/** Une bloques del mismo equipo (ESPN a veces parte la caja en grupos). */
function porEquipo(playersBox) {
  const mapa = new Map();
  for (const bloque of playersBox || []) {
    const clave = String(bloque.equipo_id || bloque.equipo || "");
    const previo = mapa.get(clave);
    if (previo) {
      const vistos = new Set(previo.jugadores.map((j) => j.id || j.nombre));
      for (const j of bloque.jugadores || []) {
        if (!vistos.has(j.id || j.nombre)) previo.jugadores.push(j);
      }
    } else {
      mapa.set(clave, {
        equipo: bloque.equipo || "",
        equipo_id: clave,
        jugadores: [...(bloque.jugadores || [])],
      });
    }
  }
  return [...mapa.values()];
}



function TablaEquipo({ bloque, equipo, orden, ordenar }) {
  const lista = bloque.jugadores || [];
  const columna = COLUMNAS.find((c) => c.clave === orden.clave) || COLUMNAS[1];
  const filas = [...lista].sort((a, b) => {
    const na = columna.orden(a);
    const nb = columna.orden(b);
    const va = typeof na === "number" ? na : -999;
    const vb = typeof nb === "number" ? nb : -999;
    return orden.asc ? va - vb : vb - va;
  });
  const total = totales(lista);

  return (
    <div className="pl-equipo bs-equipo">
      <div className="pl-equipo-cab">
        {equipo?.logo ? <img src={equipo.logo} alt="" width={20} height={20} /> : null}
        <span>{equipo?.short_name || equipo?.name || bloque.equipo}</span>
        <em className="pl-equipo-meta">
          {equipo?.score == null ? "" : `${equipo.score} pts · `}
          {lista.length} jug
        </em>
      </div>
      <div className="nba-tabla-wrap">
        <table className="nba-tabla pl-tabla">
          <thead>
            <tr>
              <th className="nba-th-jug">Jugador</th>
              {COLUMNAS.map((c) => (
                <th
                  key={c.clave}
                  className={orden.clave === c.clave ? "activa" : ""}
                  onClick={() => ordenar(c.clave)}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((j) => (
              <tr key={j.id || j.nombre}>
                <td className="nba-td-jug">
                  {j.foto ? (
                    <img src={j.foto} alt="" loading="lazy" />
                  ) : (
                    <span className="nba-sin-foto" />
                  )}
                  <span className="nba-td-nombre">
                    {j.titular ? (
                      <b className="nba-titular" title="Titular">
                        •
                      </b>
                    ) : null}
                    {j.corto || j.nombre}
                  </span>
                </td>
                {COLUMNAS.map((c) => (
                  <td key={c.clave} className={c.destacada ? "nba-ts" : ""}>
                    {c.texto(j)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bs-totales">
              <td className="nba-td-jug">TOTALES</td>
              <td>-</td>
              <td>{entero(total.pts)}</td>
              <td>{entero(total.reb)}</td>
              <td>{entero(total.ast)}</td>
              <td>{entero(total.stl)}</td>
              <td>{entero(total.blk)}</td>
              <td>{entero(total.to)}</td>
              <td>
                {entero(total.fgm)}-{entero(total.fga)}
              </td>
              <td>
                {entero(total.fg3m)}-{entero(total.fg3a)}
              </td>
              <td>
                {entero(total.ftm)}-{entero(total.fta)}
              </td>
              <td>{entero(total.plus)}</td>
              <td className="nba-ts">{n1(total.ts)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function NbaBoxscore({
  playersBox = [],
  equipos = [],
  estado = "",
  status = "",
  clock = "",
}) {
  const [orden, setOrden] = useState({ clave: "pts", asc: false });
  const bloques = porEquipo(playersBox);
  if (!bloques.length) return null;

  const ordenar = (clave) => setOrden((o) => ({ clave, asc: o.clave === clave ? !o.asc : false }));
  const equipoDe = (bloque) =>
    equipos.find((t) => String(t.id) === String(bloque.equipo_id)) || {};

  // El local primero; si ESPN no marca homeAway se respeta el orden recibido.
  const ordenados = [...bloques].sort((a, b) => {
    const peso = (bloque) => (equipoDe(bloque).homeAway === "home" ? 0 : 1);
    return peso(a) - peso(b);
  });

  const reloj = [status, clock].filter(Boolean).join(" · ");

  return (
    <div className="pl-panel bs-panel">
      <div className="bs-barra">
        {estado === "in" ? (
          <span className="bs-live">
            <i /> EN VIVO{reloj ? ` · ${reloj}` : ""}
          </span>
        ) : (
          <span className="bs-final">{estado === "post" ? "FINAL" : "BOXSCORE"}</span>
        )}
        <p className="pl-intro">Estadística individual del partido (se actualiza sola).</p>
      </div>

      {ordenados.map((bloque) => (
        <TablaEquipo
          key={bloque.equipo_id || bloque.equipo}
          bloque={bloque}
          equipo={equipoDe(bloque)}
          orden={orden}
          ordenar={ordenar}
        />
      ))}
    </div>
  );
}

