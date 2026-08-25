import { useEffect, useState } from "react";
import Message from "./Message";
import Input from "./Input";
import {
  AuthExpiredError,
  loadChatMessages,
  saveChatMessage,
  sendChatMessage,
} from "../services/api";

const WELCOME_MESSAGE = {
  role: "ai",
  text: "Bienvenido. Escribe un partido o una pregunta deportiva. Tus busquedas visibles se guardan por 24 horas.",
};
const MODELS = [
  { id: "you", name: "Demian tipster" },
  { id: "groq", name: "365AI Tipster" },
];

function Chat({ session }) {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [value, setValue] = useState("");
  const [model, setModel] = useState("you");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      try {
        const savedMessages = await loadChatMessages(session);
        if (!active) return;

        setMessages(savedMessages.length ? savedMessages : [WELCOME_MESSAGE]);
      } catch (error) {
        if (!active) return;

        if (error instanceof AuthExpiredError) return;

        setMessages([
          WELCOME_MESSAGE,
          {
            role: "ai",
            text: "No pude cargar tu historial: " + error.message,
          },
        ]);
      } finally {
        if (active) setHistoryLoading(false);
      }
    }

    loadHistory();

    return () => {
      active = false;
    };
  }, [session]);

  async function appendAndSave(message) {
    setMessages((prev) => [...prev, message]);

    try {
      await saveChatMessage(session, message);
    } catch (error) {
      if (error instanceof AuthExpiredError) return;

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "No pude guardar este mensaje en tu cuenta: " + error.message,
        },
      ]);
    }
  }

  async function send() {
    if (!value.trim() || loading) return;

    const userMessage = { role: "user", text: value.trim() };
    setValue("");
    setLoading(true);
    await appendAndSave(userMessage);

    try {
      const text = await sendChatMessage({
        mensaje: userMessage.text,
        modelo: model,
      });
      const aiMessage = {
        role: "ai",
        text,
      };

      await appendAndSave(aiMessage);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text:
            error.message === "Failed to fetch"
              ? "No pude conectar con el backend. Revisa que el backend este desplegado y que la URL de la API este bien configurada."
              : "Error real: " + error.message,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="chat">
      <div className="messages">
        {historyLoading && (
          <div className="thinking-card">
            <div className="thinking-title">Cargando historial</div>
            <div className="thinking-text">
              Recuperando las busquedas visibles de las ultimas 24 horas
              <span className="dots">...</span>
            </div>
            <div className="shimmer-line"></div>
            <div className="shimmer-line short"></div>
          </div>
        )}

        {messages.map((m, i) => (
          <Message
            key={m.id || i}
            role={m.role}
            text={m.text}
            animate={i === messages.length - 1 && m.role === "ai" && !loading}
          />
        ))}

        {loading && (
          <div className="thinking-card">
            <div className="thinking-title">Analizando partido</div>
            <div className="thinking-text">
              Consultando datos web y preparando el analisis
              <span className="dots">...</span>
            </div>
            <div className="shimmer-line"></div>
            <div className="shimmer-line short"></div>
          </div>
        )}
      </div>

      <div className="composer">
        <Input
          value={value}
          setValue={setValue}
          onSend={send}
          loading={loading}
        />

        <div className="chat-toolbar">
          <label>
            Modelo
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={loading}
            >
              {MODELS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}

export default Chat;
