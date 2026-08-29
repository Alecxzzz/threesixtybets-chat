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
  return {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  };
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

export async function sendChatMessage({ mensaje, modelo }) {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mensaje, buscar: true, modelo }),
  });

  return readText(res);
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

export async function fetchSportGames(session, sport, league) {
  const params = new URLSearchParams({ sport });
  if (league) params.set("league", league);
  const res = await fetch(`${API_URL}/stats/live?${params}`, {
    headers: authHeaders(session),
  });

  return readJson(res);
}

export async function fetchGameDetail(session, sport, eventId) {
  const params = new URLSearchParams({ sport, event_id: eventId });
  const res = await fetch(`${API_URL}/stats/game?${params}`, {
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
 * PANEL ADMIN: borra una key no reclamada.
 */
export async function adminDeleteKey(session, code) {
  const res = await fetch(`${API_URL}/admin/keys/${encodeURIComponent(code)}`, {
    method: "DELETE",
    headers: authHeaders(session),
  });
  return readJson(res);
}

