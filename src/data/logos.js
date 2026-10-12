/**
 * Logos de canales.
 *
 * Mapa nombre-de-canal (tal como aparece en channels.js, sin importar
 * mayusculas) -> URL del logo. Si un canal no esta aqui, el componente
 * <ChannelLogo /> muestra un badge con sus iniciales y un color derivado del
 * nombre, para que la lista nunca se vea rota ni con imagenes 404.
 *
 * Fuentes:
 *  - ESPN: logos oficiales (Wikimedia) que indico el usuario.
 *  - Resto: repo comunitario estandar IPTV "tv-logo/tv-logos" servido por
 *    jsDelivr (los nombres de archivo estan verificados contra la API de
 *    GitHub del repo, por eso no dan 404).
 */

// CDN del repo comunitario de logos (sube por tag @main para evitar cache viejo).
const TL = (file) =>
  `https://cdn.jsdelivr.net/gh/tv-logo/tv-logos@main/countries/${file}`;

// --- ESPN (logos oficiales que pidio el usuario) ---
const ESPN_WORDMARK =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/960px-ESPN_wordmark.svg.png";
const ESPN3_LOGO =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/ESPN3_Logo.png/960px-ESPN3_Logo.png";
const ESPN4_LOGO =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/ESPN_4_logo.svg/960px-ESPN_4_logo.svg.png";

export const CHANNEL_LOGOS = {
  // ---- ESPN ----
  "ESPN 1": ESPN_WORDMARK,
  "ESPN 2": ESPN_WORDMARK,
  "ESPN 3": ESPN3_LOGO,
  "ESPN 4": ESPN4_LOGO,
  "ESPN 5": ESPN_WORDMARK,
  "ESPN 6": ESPN_WORDMARK,
  ESPN7: ESPN_WORDMARK,
  "ESPN USA": ESPN_WORDMARK,
  "ESPN HD": ESPN_WORDMARK,
  "ESPN COLOMBIA": ESPN_WORDMARK,
  "ESPN DEPORTES": ESPN_WORDMARK,

  // ---- beIN Sports ----
  "BEIN 1": TL("united-states/bein-sports-us.png"),
  "BEIN SPORTS EXTRA Ñ (español)": TL(
    "united-states/bein-sports-espanol-us.png"
  ),
  "BEIN SPORTS XTRA (ingles)": TL("united-states/bein-sports-xtra-us.png"),

  // ---- Fox Sports ----
  "FOX SPORTS": TL("united-states/fox-sports-us.png"),
  "FOX SPORTS 2": TL("united-states/fox-sports-2-us.png"),
  "FOX DEPORTES (ESPAÑOL)": TL("united-states/fox-sports-deportes-us.png"),

  // ---- Eurosport ----
  "EUROSPORT 2": TL("spain/eurosport-2-es.png"),

  // ---- NBC / NFL / NHL / Tennis / Telemundo / TUDN ----
  "NBC SPORTS": TL("united-states/nbc-sports-us.png"),
  "NFL CHANNEL": TL("united-states/nfl-network-us.png"),
  "NHL NETWORK": TL("united-states/nhl-network-us.png"),
  "TENNIS CHANNEL": TL("united-states/tennis-channel-us.png"),
  "TELEMUNDO DEPORTES": TL("united-states/telemundo-deportes-us.png"),
  TUDN: TL("united-states/tudn-us.png"),
  "TUDN MX": TL("mexico/tudn-mx.png"),

  // ---- Sky Sports (Reino Unido) ----
  "SKY SPORTS": TL("united-kingdom/sky-sports-main-event-uk.png"),
  "SKY SPORTS NFL": TL("united-kingdom/sky-sports-nfl-uk.png"),
  "SKY SPORTS PREMIER LEAGUE": TL(
    "united-kingdom/sky-sports-premier-league-uk.png"
  ),

  // ---- Star Sports ----
  "STAR SPORTS 1": TL("india/star-sports-1-in.png"),

  // ---- Movistar / LaLiga (España) ----
  "MOVISTAR DEPORTES": TL("spain/deportes-por-movistar-plus-es.png"),
  "MOVISTAR LIGA DE DEPORTES": TL("spain/deportes-2-por-movistar-plus-es.png"),
  "LALIGA TV": TL("spain/dazn-laliga-es.png"),
};

/**
 * Devuelve la URL del logo de un canal, o null si no tiene.
 * @param {string} name nombre del canal
 * @returns {string|null}
 */
export function logoFor(name) {
  if (!name) return null;
  const key = String(name).trim().toUpperCase();
  return CHANNEL_LOGOS[key] || null;
}

