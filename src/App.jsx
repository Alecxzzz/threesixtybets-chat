import { useEffect, useState } from "react";
import "./styles/globals.css";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Chat from "./components/Chat";
import TV from "./components/TV";
import Auth from "./components/Auth";
import Credits from "./components/Credits";
import Stats from "./components/Stats";
import AdminKeys from "./components/AdminKeys";
import Transactions from "./components/Transactions";
import Modal from "./components/Modal";
import { clearSession, getStoredSession, signOut as signOutRequest, refreshSession } from "./services/api";

const PLANS = [
  { price: "", days: "15 dias" },
  { price: "", days: "30 dias" },
  { price: "", days: "45 dias" },
];
const PAYMENT_METHODS = [
  { icon: "/payments/usdt.png", name: "USDT BEP20", value: "0xc80245be011abd92d58404943f9f34b769177a79" },
  { icon: "/payments/btc.png", name: "BTC BEP20", value: "0xc80245be011abd92d58404943f9f34b769177a79" },
  { icon: "/payments/ltc.png", name: "LTC BEP20", value: "0xc80245be011abd92d58404943f9f34b769177a79" },
  { icon: "/payments/binance.png", name: "BINANCE ID", value: "555983259 - A HollyWoodAlecxz" },
];

function hasAccessExpired(user) {
  if (!user?.access_expires_at) return true;
  const d = new Date(user.access_expires_at);
  if (d.getFullYear() >= 9999) return false;
  return d.getTime() < Date.now();
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [page, setPage] = useState("chat");
  const [session, setSession] = useState(getStoredSession);
  const [premiumBlocked, setPremiumBlocked] = useState(false);

  function handleAuth(nextSession) {
    setSession(nextSession);
    setPage("chat");
  }

  function handleSessionRefresh(updated) {
    setSession(updated);
  }

  // Resultado del pago al volver de Pagadito (?payment=success|rejected|...).
  // Global: el modal aparece en cualquier seccion, incluido el chat principal.
  const [paymentModal, setPaymentModal] = useState({
    open: false,
    variant: "success",
    title: "",
    message: "",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    if (!payment) return;

    const messages = {
      success: {
        variant: "success",
        title: "¡Pago acreditado!",
        message:
          "Tu pago fue aprobado y los dias PREMIUM ya fueron acreditados a tu cuenta. ¡Gracias por tu compra!",
      },
      pending: {
        variant: "premium",
        title: "Pago pendiente",
        message:
          "Tu pago quedo pendiente de confirmacion. Los dias se acreditaran automaticamente cuando Pagadito confirme la transaccion.",
      },
      canceled: {
        variant: "error",
        title: "Pago cancelado",
        message: "Cancelaste el pago en Pagadito. No se cobro nada.",
      },
      rejected: {
        variant: "error",
        title: "Pago rechazado",
        message:
          "Pagadito rechazo el pago. Verifica los datos de tu tarjeta e intenta de nuevo.",
      },
      expired: {
        variant: "error",
        title: "Pago expirado",
        message: "La transaccion expiro antes de completarse. Intenta de nuevo.",
      },
      not_found: {
        variant: "error",
        title: "Pago no encontrado",
        message:
          "No pudimos identificar tu transaccion. Si ya pagaste, contacta a soporte con el numero de aprobacion de Pagadito.",
      },
      error: {
        variant: "error",
        title: "Error verificando el pago",
        message:
          "Hubo un problema confirmando tu pago con Pagadito. Si ya pagaste, contacta a soporte con el numero de aprobacion.",
      },
    };

    const info = messages[payment] || messages.error;
    setPaymentModal({ open: true, ...info });

    // Limpiar la URL para que el mensaje no reaparezca al recargar.
    params.delete("payment");
    params.delete("ern");
    const rest = params.toString();
    window.history.replaceState(
      {},
      "",
      window.location.pathname + (rest ? `?${rest}` : "")
    );

    // Si el pago fue aprobado, refrescar el estado premium de la sesion.
    if (payment === "success") {
      (async () => {
        try {
          const stored = getStoredSession();
          if (stored) {
            const updated = await refreshSession(stored);
            if (updated) setSession(updated);
          }
        } catch {
          // Si falla la recarga, el modal ya informa el exito del pago.
        }
      })();
    }
  }, []);

  useEffect(() => {
    if (session && hasAccessExpired(session.user)) {
      setPage("credits");
    }
  }, []);

  useEffect(() => {
    function expireSession() {
      setSession(null);
      setSidebarOpen(false);
      setPage("chat");
    }
    window.addEventListener("threesixtybets:session-expired", expireSession);
    return () => window.removeEventListener("threesixtybets:session-expired", expireSession);
  }, []);

  async function signOut() {
    await signOutRequest(session);
    clearSession();
    setSession(null);
    setSidebarOpen(false);
    setPage("chat");
  }

  function guardPage(p) {
    const restricted = ["chat", "tv", "stats"];
    if (restricted.includes(p) && hasAccessExpired(session.user)) {
      setPremiumBlocked(true);
      return;
    }
    setSidebarOpen(false);
    setPage(p);
  }

  if (!session) {
    return <Auth onAuth={handleAuth} />;
  }

  return (
    <div className="app">
      <Sidebar
        open={sidebarOpen}
        close={() => setSidebarOpen(false)}
        page={page}
        setPage={guardPage}
        user={session.user}
      />
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}
      <main className="main">
        <Header openSidebar={() => setSidebarOpen(true)} user={session.user} onSignOut={signOut} />
        {page === "chat" && !hasAccessExpired(session.user) && <Chat session={session} />}
        {page === "tv" && !hasAccessExpired(session.user) && <TV />}
        {page === "credits" && <Credits session={session} onSessionRefresh={handleSessionRefresh} />}
        {page === "stats" && !hasAccessExpired(session.user) && <Stats />}
        {page === "admin" && session.user.role === "admin" && <AdminKeys session={session} />}
        {page === "transactions" && <Transactions session={session} />}
      </main>

      <Modal
        open={paymentModal.open}
        variant={paymentModal.variant}
        title={paymentModal.title}
        message={paymentModal.message}
        acceptLabel="Aceptar"
        onClose={() => setPaymentModal((m) => ({ ...m, open: false }))}
      />

      <Modal
        open={premiumBlocked}
        variant="premium"
        title="🔒 Accede a Premium"
        message="Tu periodo de acceso ha terminado. Para seguir usando los modelos de IA, ver estadisticas y la TV, canjea un codigo o compra un plan:"
        acceptLabel="Entendido"
        onClose={() => { setPremiumBlocked(false); setPage("credits"); }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {PLANS.map((plan) => (
            <div key={plan.price} style={{ flex: "1 1 100px", background: "#1c1510", border: "1px solid #78550f", borderRadius: 10, padding: "12px", textAlign: "center" }}>
              <div style={{ color: "#fbbf24", fontWeight: 800, fontSize: 20 }}>{plan.price}</div>
              <div style={{ color: "#cbd5e1", fontSize: 13 }}>{plan.days}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {PAYMENT_METHODS.map((m) => (
            <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 10, background: "#1c1510", border: "1px solid #3a2f10", borderRadius: 8, padding: "8px 10px" }}>
              <img src={m.icon} alt="" width={28} height={28} style={{ objectFit: "contain" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#e6edf3", fontSize: 12, fontWeight: 700 }}>{m.name}</div>
                <div style={{ color: "#8b95a1", fontSize: 11, overflowWrap: "anywhere" }}>{m.value}</div>
              </div>
            </div>
          ))}
        </div>
        <p style={{ margin: 0, color: "#8b95a1", fontSize: 12, textAlign: "center" }}>
          Ya tienes un codigo? Ve a "Compra y canjeo" y ponlo para acreditar tus dias al instante.
        </p>
      </Modal>
    </div>
  );
}

export default App;
