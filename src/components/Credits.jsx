import { useState } from "react";
import { redeemCode, refreshSession } from "../services/api";
import Modal from "./Modal";

const PLANS = [
  { price: "$5", days: "15 dias", label: "PREMIUM" },
  { price: "$10", days: "30 dias", label: "premium" },
  { price: "$15", days: "45 dias", label: "premium" },
];

const PAYMENT_METHODS = [
  {
    icon: "/payments/usdt.png",
    name: "USDT RED BEP20",
    value: "0xc80245be011abd92d58404943f9f34b769177a79",
  },
  {
    icon: "/payments/btc.png",
    name: "BTC RED BEP20",
    value: "0xc80245be011abd92d58404943f9f34b769177a79",
  },
  {
    icon: "/payments/ltc.png",
    name: "LTC RED BEP20",
    value: "0xc80245be011abd92d58404943f9f34b769177a79",
  },
  {
    icon: "/payments/binance.png",
    name: "BINANCE ID",
    value: "555983259 - A HollyWoodAlecxz",
  },
];

function Credits({ session, onSessionRefresh }) {
  const [copied, setCopied] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  // Estado del modal de notificacion
  const [modal, setModal] = useState({
    open: false,
    variant: "success",
    title: "",
    message: "",
  });

  async function copyValue(value, name) {
    await navigator.clipboard.writeText(value);
    setCopied(name);
    window.setTimeout(() => setCopied(""), 1800);
  }

  async function redeem(event) {
    event.preventDefault();

    if (!code.trim()) {
      setModal({
        open: true,
        variant: "error",
        title: "Falta el codigo",
        message: "Escribe tu codigo de canjeo para continuar.",
      });
      return;
    }

    setLoading(true);
    try {
      const result = await redeemCode(session, code.trim().toUpperCase());
      setCode("");

      // Recargar la sesion para que los dias se actualicen al instante
      // (sin necesidad de que el usuario actualice la pagina).
      try {
        const updated = await refreshSession(session);
        if (onSessionRefresh) onSessionRefresh(updated);
      } catch {
        // Si falla la recarga, no importa: el canje ya se hizo.
      }

      setModal({
        open: true,
        variant: "success",
        title: "✅ Codigo canjeado",
        message: `Se acreditaron ${result.days_added} dias a tu cuenta. Ya puedes usar todos los modelos, estadisticas y TV.`,
      });
    } catch (error) {
      let msg = error.message || "No se pudo canjear el codigo.";

      // "Failed to fetch" = el backend no respondio (CORS, caido, o sin internet)
      if (msg === "Failed to fetch") {
        msg =
          "No se pudo conectar con el servidor. Esto puede ser por:\n" +
          "• El servidor esta reiniciandose (espera 30s e intenta de nuevo)\n" +
          "• Problema de conexion a internet\n" +
          "• Bloqueo del navegador (CORS)";
      }

      setModal({
        open: true,
        variant: "error",
        title: "No se pudo canjear",
        message: msg,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="tool-page">
      <div className="tool-panel payments-panel">
        <h2>Compra y canjeo de creditos</h2>

        <div className="plans-grid">
          {PLANS.map((plan) => (
            <div className="plan-card" key={plan.price}>
              <strong>{plan.price}</strong>
              <span>
                {plan.days} de {plan.label}
              </span>
            </div>
          ))}
        </div>

        <h3 className="section-title">Cripto monedas</h3>
        <div className="payment-list">
          {PAYMENT_METHODS.map((method) => (
            <div className="payment-row" key={method.name}>
              <div className="payment-icon">
                <img src={method.icon} alt="" />
              </div>
              <div className="payment-copy">
                <strong>{method.name}</strong>
                <span>{method.value}</span>
              </div>
              <button
                type="button"
                onClick={() => copyValue(method.value, method.name)}
              >
                {copied === method.name ? "Copiado" : "Copiar"}
              </button>
            </div>
          ))}
        </div>

        <p className="payment-note">
          Proximamente mas metodos de pagos de tarjeta o criptomoneda.
        </p>

        <form className="redeem-panel" onSubmit={redeem}>
          <label>
            Canjear codigo
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="SIXTYBETS-XXXX-XXXX"
              autoComplete="off"
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? "Canjeando..." : "Canjear"}
          </button>
        </form>
      </div>

      <Modal
        open={modal.open}
        variant={modal.variant}
        title={modal.title}
        message={modal.message}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
      />
    </section>
  );
}

export default Credits;

