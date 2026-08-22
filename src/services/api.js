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

export async function redeemCode(session, redeemCode) {
  const res = await fetch(`${API_URL}/redeem`, {
    method: "POST",
    headers: authHeaders(session),
    body: JSON.stringify({ redeem_code: redeemCode }),
  });

  return readJson(res);
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

export async function fetchSportGames(session, sport) {
  const res = await fetch(`${API_URL}/stats/live?sport=${encodeURIComponent(sport)}`, {
    headers: authHeaders(session),
  });

  return readJson(res);
}
