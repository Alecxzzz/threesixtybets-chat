import { useEffect, useState, useRef } from "react";

function cleanText(text) {
  if (typeof text !== "string") return text == null ? "" : String(text);
  // Quitar asteriscos y numerales de markdown
  return text.replace(/\*/g, "").replace(/^#{1,6}\s/gm, "");
}

function TypewriterBubble({ text }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const cleaned = cleanText(text);

  useEffect(() => {
    if (!cleaned) {
      setDone(true);
      return;
    }
    setDisplayed("");
    setDone(false);
    indexRef.current = 0;

    // En Android, si el usuario cambia de pestaña o bloquea el telefono,
    // los timers se congelan y el tablero queda a medias. Con requestAnimationFrame
    // + Date.now() el mensaje se completa SIEMPRE al volver a primer plano.
    let cancelado = false;
    const duracion = Math.min(6000, cleaned.length * 8);
    const inicio = performance.now();

    function paso(ahora) {
      if (cancelado) return;
      const frac = Math.min(1, (ahora - inicio) / duracion);
      const hasta = Math.ceil(cleaned.length * frac);
      setDisplayed(cleaned.slice(0, hasta));
      if (frac >= 1) {
        setDone(true);
        return;
      }
      requestAnimationFrame(paso);
    }
    requestAnimationFrame(paso);

    return () => {
      cancelado = true;
    };
  }, [cleaned]);

  return (
    <span style={{ whiteSpace: "pre-wrap" }}>
      {displayed}
      {!done && <span style={{ opacity: 0.6, animation: "blink 0.8s infinite" }}>▋</span>}
      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </span>
  );
}

function Message({ role, text, animate }) {
  const cleaned = cleanText(text);

  // Solo animar mensajes de la IA cuando se indica (mensaje nuevo)
  if (role === "ai" && animate) {
    return (
      <div className={`message ${role}`}>
        <div className="bubble">
          <TypewriterBubble text={text} />
        </div>
      </div>
    );
  }

  return (
    <div className={`message ${role}`}>
      <div className="bubble" style={{ whiteSpace: "pre-wrap" }}>{cleaned}</div>
    </div>
  );
}

export default Message;