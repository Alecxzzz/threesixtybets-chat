const API_URL =
  (
    import.meta.env.VITE_API_URL ||
    "https://site--threesixtybetssz--qytms2wflqbs.code.run"
  ).replace(/\/$/, "");
const SESSION_KEY = "threesixtybets_session";

export class AuthExpiredError extends Error {
  constructor(message = "Tu sesion expiro. Vuelve a iniciar sesion.") {
    super(message);
    this.name = "AuthExpiredError";
  }
}

function handleExpiredSession() {
  clearSession();
  window.dispatchEvent(new Event("threesixtybets:session-expired"));
}

async function readJson(res, { authRequired = true } = {}) {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    if (res.status === 401 && authRequired) {
      handleExpiredSession();
      throw new AuthExpiredError();
    }

    throw new Error(data?.detail || data?.message || "Request failed");
  }

  return data;
}

async function readText(res) {
  const text = await res.text();

  if (!res.ok) {
    if (res.status === 401) {
      handleExpiredSession();
      throw new AuthExpiredError();
    }

    throw new Error(text || "Request failed");
  }

  return text;
}

function authHeaders(session) {
  const headers = { "Content-Type": "application/json" };
  // Invitados (sin cuenta): sin Authorization, el backend los trata como guest.
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  return headers;
}

export function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export async function signUp({ name, username, password, redeemCode }) {
  const res = await fetch(`${API_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: username || name,
      password,
      redeem_code: redeemCode,
    }),
  });

  return readJson(res, { authRequired: false });
}

export async function signIn({ username, password }) {
  const res = await fetch(`${API_URL}/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  return readJson(res, { authRequired: false });
}

export async function signOut(session) {
  if (!session?.access_token) return;

  await fetch(`${API_URL}/auth/signout`, {
    method: "POST",
    headers: authHeaders(session),
  });
}

export async function loadChatMessages(session) {
  const res = await fetch(`${API_URL}/messages`, {
    headers: authHeaders(session),
  });

  return readJson(res);
}

export async function saveChatMessage(session, message) {
  const res = await fetch(`${API_URL}/messages`, {
    method: "POST",
    headers: authHeaders(session),
    body: JSON.stringify({
      role: message.role,
      text: message.text,
    }),
  });

  return readJson(res);
}

// ---- Token de conversacion de chat (anti-abuso de la IA) ----
// /chat exige un token temporal emitido por /chat/iniciar. Se cachea aqui y
// expira por inactividad (30 min, renovado en cada mensaje del lado backend).
let _convToken = null;

async function obtenerConvToken(session) {
  if (_convToken) return _convToken;
  const res = await fetch(`${API_URL}/chat/iniciar`, {
    method: "POST",
    headers: session ? authHeaders(session) : { "Content-Type": "application/json" },
  });
  const data = await readJson(res);
  _convToken = data?.conv_token || null;
  if (!_convToken) throw new Error("No se pudo iniciar la conversacion");
  return _convToken;
}

// ---- Catálogo de canales cdnlivetv (dinámico) ----
// El backend consulta https://api.cdnlivetv.tv/api/v1/channels/ y devuelve el
// catálogo con el estado online/offline en vivo. Evita mantener una lista fija
// en channels.js que se queda obsoleta (el proveedor capea canales de forma
// dinámica).
export async function fetchCdnChannels() {
  const res = await fetch(`${API_URL}/tv/canales-cdn`);
  return readJson(res);
}

// Agenda de HOY con el canal de cada partido (backend cruza ESPN + cdnlivetv).
// Reemplaza a la lista de canales: el usuario ve QUE se juega y pulsa para ver.
export async function fetchAgenda(sport) {
  const q = sport ? `?sport=${encodeURIComponent(sport)}` : "";
  const res = await fetch(`${API_URL}/tv/agenda${q}`);
  return readJson(res);
}

export async function sendChatMessage({ mensaje, modelo }, session) {
  const convToken = await obtenerConvToken(session);
  const intento = () =>
    fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: session
        ? { ...authHeaders(session), "X-Chat-Token": convToken }
        : { "Content-Type": "application/json", "X-Chat-Token": convToken },
      body: JSON.stringify({ mensaje, buscar: true, modelo }),
    });

  let res = await intento();
  if (res.status === 403) {
    // Token expirado/invalido (p. ej. la app estuvo en segundo plano):
    // pedir uno nuevo y reintentar una sola vez.
    _convToken = null;
    const nuevo = await obtenerConvToken(session);
    res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: session
        ? { ...authHeaders(session), "X-Chat-Token": nuevo }
        : { "Content-Type": "application/json", "X-Chat-Token": nuevo },
      body: JSON.stringify({ mensaje, buscar: true, modelo }),
    });
  }

  return readText(res);
}

// ============================================================
// MOTOR DE BUSQUEDA: datos reales para el chat IA
// ============================================================
// El microservicio de datos (prop_cache_service) expone /data/contexto-ia.
// Se configura con VITE_DATA_API_URL; si no, usa la misma API principal.
const DATA_API_URL = (
  import.meta.env.VITE_DATA_API_URL || API_URL
).replace(/\/$/, "");

const SPORTS_KEYWORDS = [
  { sport: "nba", words: ["nba", "basket", "baloncesto", "lakers", "celtics", "warriors"] },
  { sport: "nfl", words: ["nfl", "futbol americano", "touchdown", "chiefs", "eagles", "cowboys"] },
  { sport: "tennis", words: ["tenis", "tennis", "atp", "wta", "alcaraz", "sinner", "djokovic"] },
];

// Detecta un partido "X vs Y" en el mensaje del usuario.
export function detectarPartido(texto) {
  const t = (texto || "").trim();
  if (!t) return null;

  const re = /([a-záéíóúñü0-9.'\- ]{2,45}?)\s+(?:vs\.?|v\.?|contra|@)\s+([a-záéíóúñü0-9.'\- ]{2,45})/i;
  const m = t.match(re);
  if (!m) return null;

  const limpiar = (s) =>
    s
      .replace(/^(analiza|analizame|analiza el|partido|pick|picks|de|del|el|la|los|las|dame|ver|sobre|que|como|va|juega|juegan)\s+/gi, "")
      .replace(/\s+(hoy|manana|mañana|ayer|ahora|por favor|please)$/gi, "")
      .trim();

  const home = limpiar(m[1]);
  const away = limpiar(m[2]);
  if (!home || !away || home.length < 2 || away.length < 2) return null;

  // Deporte
  let sport = "soccer";
  const lower = t.toLowerCase();
  for (const s of SPORTS_KEYWORDS) {
    if (s.words.some((w) => lower.includes(w))) { sport = s.sport; break; }
  }

  // Fecha (opcional)
  let fecha = null;
  const fIso = t.match(/(20\d{2})-(\d{2})-(\d{2})/);
  const fDmy = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}))?\b/);
  const hoy = new Date();
  if (fIso) {
    fecha = fIso[1] + fIso[2] + fIso[3];
  } else if (fDmy) {
    const anio = fDmy[3] || hoy.getFullYear();
    fecha = String(anio) + String(fDmy[2]).padStart(2, "0") + String(fDmy[1]).padStart(2, "0");
  } else {
    const d = new Date(hoy);
    if (/\bayer\b/i.test(t)) d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    fecha = `${y}${mm}${dd}`;
  }

  return { sport, home, away, fecha };
}

// Pide al motor de busqueda los datos completos del partido.
export async function fetchContextoPartido({ sport, home, away, fecha, league }) {
  const res = await fetch(`${DATA_API_URL}/data/contexto-ia`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sport,
      home_name: home,
      away_name: away,
      event_date: fecha || null,
      league: league || null,
    }),
  });
  if (!res.ok) throw new Error("servicio de datos no disponible");
  return res.json();
}

/**
 * Enriquece el mensaje del usuario con DATOS REALES del partido (si detecta uno).
 * Si algo falla, devuelve el mensaje original sin romper el chat.
 */
export async function enriquecerConDatos(mensaje) {
  try {
    const partido = detectarPartido(mensaje);
    if (!partido) return { mensaje, datos: null };

    const data = await fetchContextoPartido(partido);
    if (!data?.found || !data?.contexto) return { mensaje, datos: null };

    const enriquecido =
      "[DATOS REALES DEL PARTIDO — usa SOLO esta informacion para tu analisis]\n" +
      data.contexto +
      "\n[FIN DE LOS DATOS REALES]\n\n" +
      "PREGUNTA DEL USUARIO: " +
      mensaje;

    return { mensaje: enriquecido, datos: partido };
  } catch {
    return { mensaje, datos: null };
  }
}

/**
 * ADMIN: resuelve los picks PENDIENTE de ai_picks con el MOTOR DE DATOS
 * REALES (ESPN: marcador, corners, tarjetas, faltas, tiros...).
 */
export async function resolvePicks(session, { limite = 60, soloHoy = false, anular = false } = {}) {
  const params = new URLSearchParams({
    limite: String(limite),
    solo_hoy: String(!!soloHoy),
    anular_no_resolubles: String(!!anular),
  });
  const res = await fetch(`${DATA_API_URL}/resolve/picks?${params}`, {
    method: "POST",
    headers: authHeaders(session),
  });
  return readJson(res);
}

export async function createPagaditoPayment(session, planCode) {
  const res = await fetch(`${API_URL}/pagadito/create-payment`, {
    method: "POST",
    headers: authHeaders(session),
    body: JSON.stringify({ plan_code: planCode }),
  });

  return readJson(res);
}

export async function redeemCode(session, code) {
  const attempt = async () => {
    const res = await fetch(`${API_URL}/redeem`, {
      method: "POST",
      headers: authHeaders(session),
      body: JSON.stringify({ redeem_code: code }),
    });

    return readJson(res);
  };

  // Retry automatico: el backend (hosting gratuito) puede estar dormido o
  // reiniciandose. Hacer hasta 3 intentos con delay creciente evita el
  // "Failed to fetch" que ve el usuario cuando el servidor aun no responde.
  let lastError;
  for (let i = 0; i < 3; i++) {
    try {
      return await attempt();
    } catch (err) {
      lastError = err;
      // 401 (token expirado) o 400 (codigo invalido) no se reintentan.
      if (err instanceof AuthExpiredError) throw err;
      if (err.message && err.message.includes("Request failed") && !err.message.includes("Failed to fetch")) throw err;
      if (i < 2) {
        await new Promise((r) => setTimeout(r, 2000 + i * 1000));
      }
    }
  }
  throw lastError;
}

export async function createAdminKeys(session, payload) {
  const res = await fetch(`${API_URL}/admin/keys`, {
    method: "POST",
    headers: authHeaders(session),
    body: JSON.stringify(payload),
  });

  return readJson(res);
}

export async function loadAdminKeys(session) {
  const res = await fetch(`${API_URL}/admin/keys`, {
    headers: authHeaders(session),
  });

  return readJson(res);
}

export async function fetchStatsSummary(session) {
  const res = await fetch(`${API_URL}/stats/summary`, {
    headers: authHeaders(session),
  });

  return readJson(res);
}

export async function fetchLeagues(session) {
  const res = await fetch(`${API_URL}/stats/leagues`, {
    headers: authHeaders(session),
  });

  return readJson(res);
}

/**
 * Recarga los datos del usuario desde el backend (/auth/me) y actualiza
 * la sesion guardada en localStorage. Devuelve la sesion actualizada.
 * Se usa despues de canjear un codigo para que los dias se reflejen al instante.
 */
export async function refreshSession(session) {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: authHeaders(session),
  });
  const user = await readJson(res);
  const updated = { ...session, user };
  saveSession(updated);
  return updated;
}

export async function fetchSportGames(session, sport, league, dia = null) {
  const params = new URLSearchParams({ sport });
  if (league) params.set("league", league);
  if (dia !== null && dia !== undefined && dia !== "") params.set("dia", String(dia));
  const res = await fetch(`${API_URL}/stats/live?${params}`, {
    headers: authHeaders(session),
  });

  return readJson(res);
}

/* ---- Favoritos (equipos / ligas) ---- */

export async function fetchFavoritos(session) {
  const res = await fetch(`${API_URL}/favoritos`, {
    headers: authHeaders(session),
  });

  return readJson(res);
}

export async function addFavorito(session, fav) {
  const res = await fetch(`${API_URL}/favoritos`, {
    method: "POST",
    headers: authHeaders(session),
    body: JSON.stringify(fav),
  });

  return readJson(res);
}

export async function removeFavorito(session, tipo, refId) {
  const res = await fetch(
    `${API_URL}/favoritos/${encodeURIComponent(tipo)}/${encodeURIComponent(refId)}`,
    { method: "DELETE", headers: authHeaders(session) },
  );

  return readJson(res);
}

/**
 * Stream SSE de marcadores (/stats/stream). RETIRADO: el proxy de produccion
 * (Northflank) bufferiza la respuesta y los eventos nunca llegan al cliente.
 * Se conserva el nombre como no-op para no romper imports previos.
 */
export function openStatsStream(_session, _sport, _league, _onData, _onError) {
  return null;
}

export async function fetchGameDetail(session, sport, eventId) {
  const params = new URLSearchParams({ sport, event_id: eventId });
  const res = await fetch(`${API_URL}/stats/game?${params}`, {
    headers: authHeaders(session),
  });

  return readJson(res);
}

/**
 * Tabla de posiciones de una liga de futbol (grupos por zona + forma last 5).
 */
export async function fetchStandings(session, league) {
  const res = await fetch(`${API_URL}/api/standings/${encodeURIComponent(league)}`, {
    headers: authHeaders(session),
  });

  return readJson(res);
}

export async function fetchAiAnalysis(session, sport, eventId) {
  const params = new URLSearchParams({ sport, event_id: eventId });
  const res = await fetch(`${API_URL}/stats/ai-analysis?${params}`, {
    headers: authHeaders(session),
  });

  return readJson(res);
}

export async function fetchTransactions(session) {
  const res = await fetch(`${API_URL}/transactions`, {
    headers: authHeaders(session),
  });

  return readJson(res);
}

export function transactionInvoiceUrl(ern, session) {
  const token = session?.access_token || "";
  return `${API_URL}/transactions/${encodeURIComponent(ern)}/invoice?token=${encodeURIComponent(token)}`;
}

/**
 * Obtiene las últimas 5 actuaciones de un jugador.
 * @param {string} sport - "mlb" | "football"
 * @param {string|number} playerId - ID del jugador.
 * @param {number} season - Temporada (ej. 2024).
 * @param {object} session - Sesión de usuario (para auth).
 * @returns {Promise<object>} - { player_name, sport, last_5_games: [...] }
 */
export async function fetchPlayerLast5(sport, playerId, season, session = null, opts = {}) {
  const params = new URLSearchParams({ season: String(season) });
  if (opts.league) params.set("league", opts.league);
  if (opts.teamIds && opts.teamIds.length) params.set("team_ids", opts.teamIds.join(","));
  const res = await fetch(
    `${API_URL}/api/player/${sport}/${playerId}/last5?${params}`,
    {
      method: "GET",
      headers: authHeaders(session),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "Error desconocido");
    console.error("fetchPlayerLast5 error:", errText);
    return { error: true, message: errText || "Error al cargar estadísticas" };
  }

  return readJson(res);
}

/**
 * Lista de jugadores clickeables de un partido (boxscore/lineup).
 */
export async function fetchGamePlayers(session, sport, gameId, season = 2024) {
  const params = new URLSearchParams({ season: String(season) });
  const res = await fetch(
    `${API_URL}/api/game/${sport}/${gameId}/players?${params}`,
    { headers: authHeaders(session) }
  );
  return readJson(res);
}

/**
 * PANEL ADMIN: prueba un m3u8/canal desde el servidor.
 */
export async function adminChannelTest(session, url) {
  const params = new URLSearchParams({ url });
  const res = await fetch(`${API_URL}/admin/channel-test?${params}`, {
    headers: authHeaders(session),
  });
  return readJson(res);
}

/**
 * Canales activos para la pagina de TV (usuarios autenticados).
 */
export async function fetchChannels(session) {
  const res = await fetch(`${API_URL}/channels`, {
    headers: authHeaders(session),
  });
  return readJson(res);
}

/**
 * Partidos del dia con links vigentes (< 6h), desde la BD.
 */
export async function fetchEvents(session) {
  const res = await fetch(`${API_URL}/events`, {
    headers: authHeaders(session),
  });
  return readJson(res);
}

/**
 * Token FRESCO de un partido: el backend pide la pagina del evento en el
 * momento del clic y extrae el playbackURL vigente.
 */
export async function eventResolve(session, pageUrl) {
  const params = new URLSearchParams({ url: pageUrl });
  const res = await fetch(`${API_URL}/event-resolve?${params}`, {
    headers: authHeaders(session),
  });
  return readJson(res);
}

/**
 * PANEL ADMIN: lista todos los canales (activos y apagados).
 */
export async function adminListChannels(session) {
  const res = await fetch(`${API_URL}/admin/channels`, {
    headers: authHeaders(session),
  });
  return readJson(res);
}

/**
 * PANEL ADMIN: agrega un canal nuevo.
 */
export async function adminCreateChannel(session, channel) {
  const res = await fetch(`${API_URL}/admin/channels`, {
    method: "POST",
    headers: authHeaders(session),
    body: JSON.stringify(channel),
  });
  return readJson(res);
}

/**
 * PANEL ADMIN: edita un canal (incluye encender/apagar con status).
 */
export async function adminUpdateChannel(session, channelId, fields) {
  const res = await fetch(`${API_URL}/admin/channels/${encodeURIComponent(channelId)}`, {
    method: "PUT",
    headers: authHeaders(session),
    body: JSON.stringify(fields),
  });
  return readJson(res);
}

/**
 * PANEL ADMIN: borra un canal.
 */
export async function adminDeleteChannel(session, channelId) {
  const res = await fetch(`${API_URL}/admin/channels/${encodeURIComponent(channelId)}`, {
    method: "DELETE",
    headers: authHeaders(session),
  });
  return readJson(res);
}

/**
 * Dashboard: bienvenida + stats + picks del dia / acertados.
 */
export async function fetchDashboard(session) {
  const res = await fetch(`${API_URL}/dashboard`, {
    headers: authHeaders(session),
  });
  return readJson(res);
}

/**
 * ADMIN: resuelve los picks pendientes cuyos partidos ya terminaron
 * (marcador final via ESPN -> FotMob -> odds-api).
 */
export async function resolveDashboard(session) {
  const res = await fetch(`${API_URL}/dashboard/resolve`, {
    method: "POST",
    headers: authHeaders(session),
  });
  return readJson(res);
}

/**
 * ADMIN: re-verifica TODOS los picks de hoy contra marcadores y stats
 * reales; con corregir=true guarda las correcciones en la BD.
 */
export async function revisarDashboard(session, corregir = false) {
  const params = new URLSearchParams({ corregir: String(!!corregir) });
  const res = await fetch(`${API_URL}/dashboard/revisar?${params}`, {
    headers: authHeaders(session),
  });
  return readJson(res);
}

/**
 * ADMIN: genera picks del dia (motor ESPN/FotMob con aprendizaje por
 * liga: prioriza las ligas de mejor ROI). forzar=true regenera aunque
 * ya existan picks vigentes.
 */
export async function generateDashboard(session, maxPartidos = 8, forzar = false) {
  const params = new URLSearchParams({
    max_partidos: String(maxPartidos),
    forzar: String(!!forzar),
  });
  const res = await fetch(`${API_URL}/dashboard/generate?${params}`, {
    method: "POST",
    headers: authHeaders(session),
  });
  return readJson(res);
}

/**
 * PANEL ADMIN: borra una key no reclamada.
 */
export async function adminDeleteKey(session, code) {
  const res = await fetch(`${API_URL}/admin/keys/${encodeURIComponent(code)}`, {
    method: "DELETE",
    headers: authHeaders(session),
  });
  return readJson(res);
}

