import { useEffect, useState, useRef } from "react";

function cleanText(text) {
  if (!text) return "";
  // Quitar asteriscos y numerales de markdown
  return text.replace(/\*/g, "").replace(/^#{1,6}\s/gm, "");
}

function TypewriterBubble({ text }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const cleaned = cleanText(text);

  useEffect(() => {
    if (!cleaned) return;
    setDisplayed("");
    setDone(false);
    indexRef.current = 0;

    const interval = setInterval(() => {
      if (indexRef.current < cleaned.length) {
        // Escribir de a varios caracteres por tick para textos largos
        const chunk = Math.max(1, Math.floor(cleaned.length / 200));
        const next = indexRef.current + chunk;
        setDisplayed(cleaned.slice(0, next));
        indexRef.current = next;
      } else {
        setDone(true);
        clearInterval(interval);
      }
    }, 15);

    return () => clearInterval(interval);
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