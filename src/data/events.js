/**
 * Partidos del día (eventos temporales) generados por el scraper.
 *
 * El scraper (fuente tipo la18hd.su) debe regenerar este archivo en cada
 * corrida con la misma estructura que produce links_scraper.txt:
 *
 *   key  -> "[Futbol] Real Madrid vs Barcelona | ES (PLIBRE)"
 *   source -> https://.../index.m3u8
 *   refer  -> https://la18hd.su/ver.php?...   (referer para el proxy)
 *
 * IMPORTANTE: los links vencen en ~5h; el scraper debe sobreescribir
 * este archivo en cada corrida para que solo queden los de hoy.
 */
export const events = [
  // Ejemplo de formato (el scraper lo reemplaza diariamente):
  // {
  //   id: "plibre-1",
  //   sport: "Futbol",
  //   name: "Real Madrid vs Barcelona",
  //   stream: "https://.../index.m3u8",
  //   referer: "https://la18hd.su/ver.php?stream=...",
  //   type: "m3u8",
  // },
];
