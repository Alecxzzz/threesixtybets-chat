/**
 * Plantilla NBA con los PROMEDIOS DE TEMPORADA de cada jugador.
 * Ocupa la pestaña Alineación (que en baloncesto salía vacía).
 *
 * Arriba: duelo de líderes por categoría (estilo SofaScore "Top players").
 * Abajo: la plantilla completa de cada equipo, ordenable por columna.
 */
import { useState } from "react";

const n1 = (v) => (v == null ? "-" : Number(v).toFixed(1));
const entero = (v) => (v == null ? "-" : String(Math.round(Number(v))));

const CATEGORIAS = [
  { clave: "pts", label: "Puntos", sufijo: "" },
  { clave: "reb", label: "Rebotes", sufijo: "" },
  { clave: "ast", label: "Asistencias", sufijo: "" },
  { clave: "stl", label: "Robos", sufijo: "" },
  { clave: "blk", label: "Tapones", sufijo: "" },
  { clave: "fg_pct", label: "% tiros de campo", sufijo: "%" },
  { clave: "fg3_pct", label: "% triples", sufijo: "%" },
];

const COLUMNAS = [
  { clave: "partidos", label: "PJ" },
  { clave: "min", label: "MIN" },
  { clave: "pts", label: "PTS" },
  { clave: "reb", label: "REB" },
  { clave: "ast", label: "AST" },
  { clave: "stl", label: "ROB" },
  { clave: "blk", label: "TAP" },
  { clave: "ts", label: "TS%" },
  { clave: "fg_pct", label: "TC%" },
  { clave: "fg3_pct", label: "3P%" },
];

function Lider({ jugador, clave, sufijo, alReves }) {
  if (!jugador) return <div className={alReves ? "pl-lider pl-der" : "pl-lider"} />;
  return (
    <div className={alReves ? "pl-lider pl-der" : "pl-lider"}>
      <span className="pl-lider-foto">
        {jugador.foto ? <img src={jugador.foto} alt="" loading="lazy" /> : null}
      </span>
      <span className="pl-lider-datos">
        <strong>
          {n1(jugador[clave])}
          {sufijo}
        </strong>
        <em>{jugador.corto}</em>
      </span>
    </div>
  );
}

export default function NbaPlantilla({ equipos = [] }) {
  const casa = equipos.find((t) => t.homeAway === "home") || equipos[0] || {};
  const fuera = equipos.find((t) => t.homeAway !== "home") || equipos[1] || {};
  const plantillaCasa = casa.promedios || [];
  const plantillaFuera = fuera.promedios || [];
  const [orden, setOrden] = useState({ clave: "pts", asc: false });

  if (!plantillaCasa.length && !plantillaFuera.length) return null;

  const ordenar = (clave) => setOrden((o) => ({ clave, asc: o.clave === clave ? !o.asc : false }));

  const lider = (lista, clave) => {
    const validos = [...lista].filter((j) => j[clave] != null && (j.partidos || 0) >= 5);
    validos.sort((a, b) => (b[clave] || 0) - (a[clave] || 0));
    return validos[0];
  };

  const tabla = (equipo, lista) => {
    const filas = [...lista].sort((a, b) => {
      const na = typeof a[orden.clave] === "number" ? a[orden.clave] : -999;
      const nb = typeof b[orden.clave] === "number" ? b[orden.clave] : -999;
      return orden.asc ? na - nb : nb - na;
    });

    return (
      <div className="pl-equipo">
        <div className="pl-equipo-cab">
          {equipo.logo ? <img src={equipo.logo} alt="" width={20} height={20} /> : null}
          <span>{equipo.short_name || equipo.name}</span>
          <em className="pl-equipo-meta">
            {lista.length} jug · top-5 {n1(lista.slice(0, 5).reduce((s, j) => s + (j.pts || 0), 0))} pts
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
                    {j.foto ? <img src={j.foto} alt="" loading="lazy" /> : <span className="nba-sin-foto" />}
                    <span className="nba-td-nombre">
                      {j.posicion ? <i className="pl-pos">{j.posicion}</i> : null}
                      {j.corto}
                    </span>
                  </td>
                  {COLUMNAS.map((c) => (
                    <td key={c.clave} className={c.clave === "ts" ? "nba-ts" : ""}>
                      {c.clave === "partidos" ? entero(j[c.clave]) : n1(j[c.clave])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="pl-panel">
      <p className="pl-intro">
        Promedios de la temporada por jugador (fuente: ESPN). Toca una columna para ordenar.
      </p>

      <div className="pl-top">
        <h5 className="pl-top-titulo">Duelo de líderes</h5>
        {CATEGORIAS.map(({ clave, label, sufijo }) => {
          const lc = lider(plantillaCasa, clave);
          const lf = lider(plantillaFuera, clave);
          if (!lc && !lf) return null;
          return (
            <div key={clave} className="pl-duelo">
              <Lider jugador={lc} clave={clave} sufijo={sufijo} />
              <span className="pl-duelo-label">{label}</span>
              <Lider jugador={lf} clave={clave} sufijo={sufijo} alReves />
            </div>
          );
        })}
      </div>

      {plantillaCasa.length ? tabla(casa, plantillaCasa) : null}
      {plantillaFuera.length ? tabla(fuera, plantillaFuera) : null}
    </div>
  );
}
