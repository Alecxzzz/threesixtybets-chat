/**
 * Logos de canales.
 *
 * Mapa nombre-de-canal (tal como aparece en channels.js, sin importar
 * mayusculas) -> URL del logo. Si un canal no esta aqui, el componente
 * <ChannelLogo /> muestra un badge con sus iniciales y un color derivado del
 * nombre, para que la lista nunca se vea rota ni con imagenes 404.
 *
 * Para agregar un logo: anade una linea  "NOMBRE": "https://.../logo.png",
 * (la clave se compara en mayusculas, asi que no importa como la escribas).
 */

const ESPN_WORDMARK =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/960px-ESPN_wordmark.svg.png";
const ESPN3_LOGO =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/ESPN3_Logo.png/960px-ESPN3_Logo.png";
const ESPN4_LOGO =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/ESPN_4_logo.svg/960px-ESPN_4_logo.svg.png";

export const CHANNEL_LOGOS = {
  "ESPN 1": ESPN_WORDMARK,
  "ESPN 2": ESPN_WORDMARK,
  "ESPN 3": ESPN3_LOGO,
  "ESPN 4": ESPN4_LOGO,
  "ESPN 4 HD": ESPN4_LOGO,
  "ESPN 5": ESPN_WORDMARK,
  "ESPN 6": ESPN_WORDMARK,
  ESPN7: ESPN_WORDMARK,
  "ESPN USA": ESPN_WORDMARK,
  "ESPN HD": ESPN_WORDMARK,
  "ESPN COLOMBIA": ESPN_WORDMARK,
  "ESPN DEPORTES": ESPN_WORDMARK,
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
