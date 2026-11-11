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

    if (!username || !password) {
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
            Crea tu cuenta GRATIS y desbloquea el acceso completo a los picks
            de IA, estadisticas y la TV cuando quieras.
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
              Codigo de canjeo (opcional)
              <input
                value={form.redeemCode}
                onChange={(e) => updateField("redeemCode", e.target.value)}
                autoComplete="off"
                placeholder="SIXTYBETS-XXXX-XXXX"
              />
              <span className="auth-hint">
                Sin codigo entras GRATIS con picks limitados. Con codigo, tu
                membresia se activa de una.
              </span>
            </label>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Procesando..." : isSignUp ? "Crear cuenta" : "Entrar"}
          </button>

          {/* Al registrarte aceptas las condiciones: los enlaces deben estar
              SIEMPRE visibles antes de crear la cuenta. */}
          <p className="auth-legal" style={{ marginTop: 12, fontSize: 11.5, color: "#8b95a1", textAlign: "center", lineHeight: 1.5 }}>
            Al continuar aceptas los{" "}
            <a href="/terminos" style={{ color: "#4ade80" }}>Términos y Condiciones</a>{" "}
            y la{" "}
            <a href="/privacidad" style={{ color: "#4ade80" }}>Política de Privacidad</a>.
            Solo para mayores de 18 años.
          </p>
        </form>
      </section>
    </main>
  );
}

export default Auth;
