import { useState } from "react";
import { saveSession, signIn, signUp } from "../services/api";

function Auth({ onAuth }) {
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState({
    username: "",
    password: "",
    redeemCode: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isSignUp = mode === "signup";

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError("");
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setError("");
  }

  async function submit(e) {
    e.preventDefault();

    const username = form.username.trim();
    const password = form.password;
    const redeemCode = form.redeemCode.trim().toUpperCase();

    if (!username || !password || (isSignUp && !redeemCode)) {
      setError("Completa todos los campos.");
      return;
    }

    if (password.length < 6) {
      setError("La contrasena debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        const session = await signUp({ name: username, password, redeemCode });
        saveSession(session);
        onAuth(session);
        return;
      }

      const session = await signIn({ username, password });
      saveSession(session);
      onAuth(session);
    } catch (err) {
      setError(err.message || "No se pudo completar la autenticacion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-copy">
          <img className="auth-logo" src="/logo.png" alt="3SIXTYBETS AI" />
          <p className="auth-kicker">3SIXTYBETS AI</p>
          <h1>{isSignUp ? "Crea tu cuenta" : "Bienvenido de vuelta"}</h1>
          <p>
            Accede al chat de inteligencia deportiva y guarda tu historial de
            picks con tu usuario y una key activa.
          </p>
        </div>

        <form className="auth-form" onSubmit={submit}>
          <div className="auth-tabs" aria-label="Authentication mode">
            <button
              type="button"
              className={!isSignUp ? "active" : ""}
              onClick={() => switchMode("signin")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={isSignUp ? "active" : ""}
              onClick={() => switchMode("signup")}
            >
              Sign up
            </button>
          </div>

          <label>
            Usuario
            <input
              value={form.username}
              onChange={(e) => updateField("username", e.target.value)}
              autoComplete="username"
              placeholder="Usuario"
            />
          </label>

          <label>
            Contrasena
            <input
              type="password"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              placeholder="Minimo 6 caracteres"
            />
          </label>

          {isSignUp && (
            <label>
              Codigo de canjeo
              <input
                value={form.redeemCode}
                onChange={(e) => updateField("redeemCode", e.target.value)}
                autoComplete="off"
                placeholder="SIXTYBETS-XXXX-XXXX"
              />
            </label>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Procesando..." : isSignUp ? "Crear cuenta" : "Entrar"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default Auth;
